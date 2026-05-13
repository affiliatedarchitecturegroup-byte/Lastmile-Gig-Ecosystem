defmodule SvcTracking.Broadway.LocationConsumer do
  @moduledoc """
  Broadway Kafka consumer for driver location events.

  Consumes from the lmg.drivers.location Kafka topic and broadcasts
  location updates to the appropriate Phoenix Channels.

  This enables the tracking service to receive location data from
  other services (not just direct WebSocket pushes) and forward
  them to connected clients.

  See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
  """
  use Broadway

  require Logger

  @topic "lmg.drivers.location"

  def start_link(_opts) do
    brokers = System.get_env("LMG_KAFKA_BROKERS") || "localhost:9092"

    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {
          BroadwayKafka.Producer,
          [
            hosts: parse_brokers(brokers),
            group_id: "svc-tracking-location",
            topics: [@topic],
            offset_commit_on_ack: true
          ]
        },
        concurrency: 3
      ],
      processors: [
        default: [concurrency: 10]
      ],
      batchers: [
        default: [
          batch_size: 50,
          batch_timeout: 500,
          concurrency: 3
        ]
      ]
    )
  end

  @impl true
  def handle_message(_processor, message, _context) do
    case Jason.decode(message.data) do
      {:ok, event} ->
        process_location_event(event)
        message

      {:error, reason} ->
        Logger.warning("Failed to decode location event: #{inspect(reason)}")
        Broadway.Message.failed(message, "decode_error")
    end
  end

  @impl true
  def handle_batch(_batcher, messages, _batch_info, _context) do
    Logger.debug("Processed batch of #{length(messages)} location events")
    messages
  end

  @impl true
  def handle_failed(messages, _context) do
    Enum.each(messages, fn message ->
      Logger.error("Failed to process location event: #{inspect(message.status)}")
    end)

    messages
  end

  # Process a single driver location event from Kafka.
  defp process_location_event(%{"payload" => payload}) do
    driver_id = payload["driverId"]
    location = %{
      driver_id: driver_id,
      latitude: payload["latitude"],
      longitude: payload["longitude"],
      speed_kmh: payload["speedKmh"] || 0,
      heading: payload["heading"] || 0,
      timestamp: payload["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # Broadcast to driver channel
    SvcTrackingWeb.Endpoint.broadcast("driver:#{driver_id}", "location:updated", location)

    # Broadcast to ops global channel
    SvcTrackingWeb.Endpoint.broadcast("ops:global", "driver:location", location)

    # Cache in Redis
    cache_location(driver_id, location)
  end

  defp process_location_event(event) do
    Logger.warning("Unexpected location event format: #{inspect(Map.keys(event))}")
  end

  defp cache_location(driver_id, location) do
    key = "lmg:tracking:driver:#{driver_id}"
    value = Jason.encode!(location)

    case Redix.command(:tracking_redis, ["SETEX", key, 300, value]) do
      {:ok, _} -> :ok
      {:error, reason} ->
        Logger.warning("Redis cache failed for driver #{driver_id}: #{inspect(reason)}")
    end
  end

  defp parse_brokers(brokers_string) do
    brokers_string
    |> String.split(",")
    |> Enum.map(fn broker ->
      case String.split(String.trim(broker), ":") do
        [host, port] -> {String.to_atom(host), String.to_integer(port)}
        [host] -> {String.to_atom(host), 9092}
      end
    end)
  end
end
