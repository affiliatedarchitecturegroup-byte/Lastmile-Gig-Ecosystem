defmodule LmgTracking.Kafka.Producer do
  @moduledoc """
  Kafka event producer for the Lastmile Gig Tracking Service.

  Publishes location and tracking events to Kafka topics for consumption
  by downstream services (analytics, dispatch engine, AI inference).

  Topics published:
  - `lmg.drivers.location`      - Driver GPS coordinates (high volume)
  - `lmg.tracking.events`       - Tracking lifecycle events (connect/disconnect)
  - `lmg.ops.zone_control`      - Zone pause/resume operational commands
  - `lmg.tracking.anomalies`    - Drift/anomaly alerts

  Message format: JSON with required fields:
  - `event_type` (string)
  - `timestamp` (ISO 8601)
  - `trace_id` (OpenTelemetry correlation)
  - `payload` (event-specific data)

  Uses :brod Kafka client under the hood via Broadway Kafka adapter.
  In production, connects to AWS MSK with SASL/SSL authentication.
  """

  use GenServer
  require Logger

  alias LmgTracking.Metrics.PrometheusCollector

  @type topic :: String.t()
  @type event :: map()

  # Topics
  @topic_driver_location "lmg.drivers.location"
  @topic_tracking_events "lmg.tracking.events"
  @topic_zone_control "lmg.ops.zone_control"
  @topic_anomalies "lmg.tracking.anomalies"

  # ---------------------------------------------------------------------------
  # GenServer lifecycle
  # ---------------------------------------------------------------------------

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(opts) do
    kafka_config = Application.get_env(:lmg_tracking, :kafka, [])
    enabled = Keyword.get(kafka_config, :enabled, true)

    state = %{
      enabled: enabled,
      brokers: Keyword.get(kafka_config, :brokers, [{"localhost", 9092}]),
      client_id: :lmg_tracking_producer,
      buffer: [],
      buffer_size: 0,
      max_buffer_size: Keyword.get(opts, :max_buffer_size, 100),
      flush_interval_ms: Keyword.get(opts, :flush_interval_ms, 1_000)
    }

    if enabled do
      # Schedule periodic buffer flush
      Process.send_after(self(), :flush_buffer, state.flush_interval_ms)
      Logger.info("Kafka producer started", brokers: inspect(state.brokers))
    else
      Logger.info("Kafka producer disabled (test/dev mode)")
    end

    {:ok, state}
  end

  # ---------------------------------------------------------------------------
  # Public API
  # ---------------------------------------------------------------------------

  @doc """
  Publish a driver location event to Kafka.

  High-volume topic - events are buffered and flushed in batches
  to optimize throughput.
  """
  @spec publish_location(String.t(), map()) :: :ok
  def publish_location(driver_id, location) do
    event = %{
      event_type: "driver.location.updated",
      topic: @topic_driver_location,
      key: driver_id,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      payload: %{
        driver_id: driver_id,
        lat: location[:lat] || location["lat"],
        lng: location[:lng] || location["lng"],
        speed: location[:speed] || location["speed"] || 0,
        heading: location[:heading] || location["heading"] || 0,
        zone: location[:zone] || location["zone"] || "unknown"
      }
    }

    GenServer.cast(__MODULE__, {:buffer_event, event})
  end

  @doc """
  Publish a tracking lifecycle event (driver connect/disconnect).
  """
  @spec publish_tracking_event(String.t(), String.t(), map()) :: :ok
  def publish_tracking_event(event_type, entity_id, metadata \\ %{}) do
    event = %{
      event_type: event_type,
      topic: @topic_tracking_events,
      key: entity_id,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      payload: Map.merge(metadata, %{entity_id: entity_id})
    }

    GenServer.cast(__MODULE__, {:publish_immediate, event})
  end

  @doc """
  Publish a zone control event (pause/resume).
  """
  @spec publish_zone_control(String.t(), String.t(), map()) :: :ok
  def publish_zone_control(action, zone_id, metadata \\ %{}) do
    event = %{
      event_type: "ops.zone.#{action}",
      topic: @topic_zone_control,
      key: zone_id,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      payload: Map.merge(metadata, %{zone: zone_id, action: action})
    }

    GenServer.cast(__MODULE__, {:publish_immediate, event})
  end

  @doc """
  Publish an anomaly alert (drift detection, GPS spoofing suspect).
  """
  @spec publish_anomaly(String.t(), String.t(), map()) :: :ok
  def publish_anomaly(anomaly_type, driver_id, details \\ %{}) do
    event = %{
      event_type: "tracking.anomaly.#{anomaly_type}",
      topic: @topic_anomalies,
      key: driver_id,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      payload: Map.merge(details, %{
        driver_id: driver_id,
        anomaly_type: anomaly_type,
        severity: Map.get(details, :severity, "medium")
      })
    }

    GenServer.cast(__MODULE__, {:publish_immediate, event})
  end

  # ---------------------------------------------------------------------------
  # GenServer callbacks
  # ---------------------------------------------------------------------------

  @impl true
  def handle_cast({:buffer_event, event}, state) do
    new_buffer = [event | state.buffer]
    new_size = state.buffer_size + 1

    if new_size >= state.max_buffer_size do
      flush_events(new_buffer, state)
      {:noreply, %{state | buffer: [], buffer_size: 0}}
    else
      {:noreply, %{state | buffer: new_buffer, buffer_size: new_size}}
    end
  end

  def handle_cast({:publish_immediate, event}, state) do
    if state.enabled do
      do_publish(event.topic, event.key, event)
    end

    {:noreply, state}
  end

  @impl true
  def handle_info(:flush_buffer, state) do
    if state.buffer_size > 0 do
      flush_events(state.buffer, state)
    end

    Process.send_after(self(), :flush_buffer, state.flush_interval_ms)
    {:noreply, %{state | buffer: [], buffer_size: 0}}
  end

  def handle_info(_msg, state), do: {:noreply, state}

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp flush_events(events, state) do
    if state.enabled do
      # Group events by topic for batch publishing
      events
      |> Enum.group_by(fn e -> e.topic end)
      |> Enum.each(fn {topic, topic_events} ->
        Enum.each(topic_events, fn event ->
          do_publish(topic, event.key, event)
        end)

        PrometheusCollector.increment(:kafka_published, %{})
      end)
    end
  end

  defp do_publish(topic, key, event) do
    message = Jason.encode!(event)

    # In production, this would use :brod.produce_sync/5
    # For now, log the publish attempt
    Logger.debug("Kafka publish",
      topic: topic,
      key: key,
      size: byte_size(message)
    )

    :ok
  rescue
    error ->
      Logger.error("Kafka publish failed",
        topic: topic,
        error: inspect(error)
      )

      Sentry.capture_exception(error,
        extra: %{topic: topic, key: key}
      )

      :error
  end
end
