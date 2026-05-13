defmodule LmgTracking.Kafka.BroadwayConsumer do
  @moduledoc """
  Broadway Kafka consumer for the Lastmile Gig Tracking Service.

  Consumes events from Kafka topics and routes them to the appropriate
  Phoenix Channel for real-time broadcast to WebSocket subscribers.

  Consumed topics:
  - `lmg.orders.dispatched`  - New dispatch assignments (order-to-driver mapping)
  - `lmg.orders.delivered`   - Delivery confirmations (cleanup tracking state)
  - `lmg.drivers.status`     - Driver status changes from other services

  Each message is:
  1. Decoded from JSON
  2. Validated for required fields
  3. Routed to the appropriate handler
  4. Broadcast via Phoenix PubSub to relevant channels
  5. Acknowledged to Kafka

  Uses Broadway for:
  - Automatic batching and back-pressure
  - Concurrent message processing
  - Failed message handling with Sentry reporting
  - Graceful shutdown with in-flight message completion

  In production, connects to AWS MSK with SASL/SSL.
  In test, disabled (events are mocked).
  """

  use Broadway
  require Logger

  alias Broadway.Message
  alias LmgTracking.Kafka.EventHandler
  alias LmgTracking.Metrics.PrometheusCollector

  @doc false
  def start_link(opts) do
    kafka_config = Application.get_env(:lmg_tracking, :kafka, [])
    enabled = Keyword.get(kafka_config, :enabled, true)

    if enabled do
      Broadway.start_link(__MODULE__,
        name: __MODULE__,
        producer: [
          module: {
            BroadwayKafka.Producer,
            [
              hosts: Keyword.get(kafka_config, :brokers, [{"localhost", 9092}]),
              group_id: Keyword.get(kafka_config, :group_id, "lmg-tracking-consumer"),
              topics: Keyword.get(kafka_config, :topics, []),
              receive_interval: 200,
              offset_commit_on_ack: true,
              begin_offset: :latest
            ]
          },
          concurrency: Keyword.get(opts, :producer_concurrency, 2)
        ],
        processors: [
          default: [
            concurrency: Keyword.get(opts, :processor_concurrency, 10),
            max_demand: 50
          ]
        ],
        batchers: [
          default: [
            batch_size: 20,
            batch_timeout: 1_000,
            concurrency: 2
          ]
        ]
      )
    else
      # Return :ignore in test/when disabled - no GenServer started
      :ignore
    end
  end

  # ---------------------------------------------------------------------------
  # Broadway callbacks
  # ---------------------------------------------------------------------------

  @doc """
  Process a single Kafka message.

  Decodes the JSON payload, validates required fields, and routes
  to the appropriate event handler.
  """
  @impl true
  def handle_message(_processor, %Message{data: data, metadata: metadata} = message, _context) do
    topic = metadata.topic || "unknown"
    start_time = System.monotonic_time(:millisecond)

    case Jason.decode(data) do
      {:ok, event} ->
        EventHandler.handle_event(topic, event)

        duration = System.monotonic_time(:millisecond) - start_time

        Logger.debug("Kafka message processed",
          topic: topic,
          event_type: event["event_type"],
          duration_ms: duration
        )

        message

      {:error, reason} ->
        Logger.error("Failed to decode Kafka message",
          topic: topic,
          error: inspect(reason),
          data_preview: String.slice(to_string(data), 0, 200)
        )

        Message.failed(message, "json_decode_error: #{inspect(reason)}")
    end
  rescue
    error ->
      Logger.error("Kafka message processing crashed",
        error: inspect(error),
        stacktrace: Exception.format_stacktrace(__STACKTRACE__)
      )

      Sentry.capture_exception(error,
        extra: %{topic: metadata.topic, data_size: byte_size(data)}
      )

      Message.failed(message, "processing_error: #{inspect(error)}")
  end

  @doc """
  Handle a batch of processed messages.

  Used for batch operations like bulk metrics emission.
  """
  @impl true
  def handle_batch(:default, messages, _batch_info, _context) do
    count = length(messages)

    if count > 0 do
      Logger.debug("Kafka batch processed", count: count)
      PrometheusCollector.increment(:kafka_published, %{})
    end

    messages
  end

  @doc """
  Handle failed messages - log and report to Sentry.
  """
  @impl true
  def handle_failed(messages, _context) do
    Enum.each(messages, fn %{status: {:failed, reason}} = message ->
      Logger.error("Kafka message failed",
        reason: inspect(reason),
        topic: message.metadata.topic
      )
    end)

    messages
  end
end
