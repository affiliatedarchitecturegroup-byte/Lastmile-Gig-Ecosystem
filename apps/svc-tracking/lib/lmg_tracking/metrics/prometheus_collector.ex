defmodule LmgTracking.Metrics.PrometheusCollector do
  @moduledoc """
  Prometheus metrics collector for the Lastmile Gig Tracking Service.

  Exposes metrics at `/metrics` endpoint for Prometheus scraping.

  Metrics collected:
  - `lmg_tracking_websocket_connections_total` (gauge) - Active WebSocket connections
  - `lmg_tracking_location_updates_total` (counter) - Total location updates received
  - `lmg_tracking_location_update_duration_ms` (histogram) - Location update processing time
  - `lmg_tracking_channel_joins_total` (counter) - Channel join events by type
  - `lmg_tracking_channel_messages_total` (counter) - Channel messages by type
  - `lmg_tracking_active_drivers_total` (gauge) - Active drivers by zone
  - `lmg_tracking_kafka_events_published_total` (counter) - Kafka events published
  - `lmg_tracking_presence_changes_total` (counter) - Presence changes (join/leave)
  - `lmg_tracking_redis_operations_total` (counter) - Redis operations by command
  - `lmg_tracking_redis_operation_duration_ms` (histogram) - Redis operation duration

  All metrics use the `lmg_tracking_` prefix per platform naming conventions.
  """

  use GenServer
  require Logger

  @metrics_state %{
    websocket_connections: 0,
    location_updates_total: 0,
    channel_joins: %{},
    channel_messages: %{},
    active_drivers_by_zone: %{},
    kafka_events_published: 0,
    presence_changes: %{join: 0, leave: 0},
    redis_operations: 0
  }

  # ---------------------------------------------------------------------------
  # GenServer lifecycle
  # ---------------------------------------------------------------------------

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, @metrics_state, name: __MODULE__)
  end

  @impl true
  def init(state) do
    # Attach telemetry handlers for automatic metric collection
    attach_telemetry_handlers()
    {:ok, state}
  end

  # ---------------------------------------------------------------------------
  # Public API
  # ---------------------------------------------------------------------------

  @doc "Export all metrics in Prometheus text exposition format"
  @spec export() :: String.t()
  def export do
    GenServer.call(__MODULE__, :export)
  end

  @doc "Increment a counter metric"
  @spec increment(atom(), map()) :: :ok
  def increment(metric, labels \\ %{}) do
    GenServer.cast(__MODULE__, {:increment, metric, labels})
  end

  @doc "Set a gauge metric value"
  @spec set_gauge(atom(), number(), map()) :: :ok
  def set_gauge(metric, value, labels \\ %{}) do
    GenServer.cast(__MODULE__, {:set_gauge, metric, value, labels})
  end

  # ---------------------------------------------------------------------------
  # GenServer callbacks
  # ---------------------------------------------------------------------------

  @impl true
  def handle_call(:export, _from, state) do
    output = format_prometheus(state)
    {:reply, output, state}
  end

  @impl true
  def handle_cast({:increment, :location_updates, _labels}, state) do
    {:noreply, %{state | location_updates_total: state.location_updates_total + 1}}
  end

  def handle_cast({:increment, :channel_join, %{channel: channel}}, state) do
    joins = Map.update(state.channel_joins, channel, 1, &(&1 + 1))
    {:noreply, %{state | channel_joins: joins}}
  end

  def handle_cast({:increment, :channel_message, %{channel: channel}}, state) do
    messages = Map.update(state.channel_messages, channel, 1, &(&1 + 1))
    {:noreply, %{state | channel_messages: messages}}
  end

  def handle_cast({:increment, :kafka_published, _labels}, state) do
    {:noreply, %{state | kafka_events_published: state.kafka_events_published + 1}}
  end

  def handle_cast({:increment, :presence_change, %{type: type}}, state) do
    changes = Map.update(state.presence_changes, type, 1, &(&1 + 1))
    {:noreply, %{state | presence_changes: changes}}
  end

  def handle_cast({:increment, :redis_operation, _labels}, state) do
    {:noreply, %{state | redis_operations: state.redis_operations + 1}}
  end

  def handle_cast({:set_gauge, :websocket_connections, value, _labels}, state) do
    {:noreply, %{state | websocket_connections: value}}
  end

  def handle_cast({:set_gauge, :active_drivers, value, %{zone: zone}}, state) do
    drivers = Map.put(state.active_drivers_by_zone, zone, value)
    {:noreply, %{state | active_drivers_by_zone: drivers}}
  end

  def handle_cast(_msg, state) do
    {:noreply, state}
  end

  # ---------------------------------------------------------------------------
  # Telemetry handlers
  # ---------------------------------------------------------------------------

  defp attach_telemetry_handlers do
    :telemetry.attach_many(
      "lmg-tracking-metrics",
      [
        [:phoenix, :channel_joined],
        [:phoenix, :channel_handled_in],
        [:lmg, :tracking, :location_update],
        [:lmg, :tracking, :active_connections],
        [:lmg, :tracking, :active_drivers],
        [:lmg, :tracking, :presence_change]
      ],
      &handle_telemetry_event/4,
      nil
    )
  end

  defp handle_telemetry_event([:phoenix, :channel_joined], _measurements, metadata, _config) do
    increment(:channel_join, %{channel: metadata[:channel] || "unknown"})
  end

  defp handle_telemetry_event([:phoenix, :channel_handled_in], _measurements, metadata, _config) do
    increment(:channel_message, %{channel: metadata[:channel] || "unknown"})
  end

  defp handle_telemetry_event([:lmg, :tracking, :location_update], _measurements, _metadata, _config) do
    increment(:location_updates, %{})
  end

  defp handle_telemetry_event([:lmg, :tracking, :active_connections], measurements, _metadata, _config) do
    set_gauge(:websocket_connections, measurements[:count] || 0)
  end

  defp handle_telemetry_event([:lmg, :tracking, :active_drivers], measurements, metadata, _config) do
    set_gauge(:active_drivers, measurements[:count] || 0, %{zone: metadata[:zone] || "all"})
  end

  defp handle_telemetry_event([:lmg, :tracking, :presence_change], _measurements, metadata, _config) do
    increment(:presence_change, %{type: metadata[:type] || :unknown})
  end

  defp handle_telemetry_event(_event, _measurements, _metadata, _config), do: :ok

  # ---------------------------------------------------------------------------
  # Prometheus text format
  # ---------------------------------------------------------------------------

  defp format_prometheus(state) do
    [
      "# HELP lmg_tracking_websocket_connections_total Current active WebSocket connections",
      "# TYPE lmg_tracking_websocket_connections_total gauge",
      "lmg_tracking_websocket_connections_total #{state.websocket_connections}",
      "",
      "# HELP lmg_tracking_location_updates_total Total location updates received",
      "# TYPE lmg_tracking_location_updates_total counter",
      "lmg_tracking_location_updates_total #{state.location_updates_total}",
      "",
      "# HELP lmg_tracking_kafka_events_published_total Total Kafka events published",
      "# TYPE lmg_tracking_kafka_events_published_total counter",
      "lmg_tracking_kafka_events_published_total #{state.kafka_events_published}",
      "",
      format_channel_joins(state.channel_joins),
      format_channel_messages(state.channel_messages),
      format_active_drivers(state.active_drivers_by_zone),
      format_presence_changes(state.presence_changes),
      "",
      "# HELP lmg_tracking_redis_operations_total Total Redis operations",
      "# TYPE lmg_tracking_redis_operations_total counter",
      "lmg_tracking_redis_operations_total #{state.redis_operations}",
      ""
    ]
    |> Enum.join("\n")
  end

  defp format_channel_joins(joins) do
    lines =
      Enum.map(joins, fn {channel, count} ->
        "lmg_tracking_channel_joins_total{channel=\"#{channel}\"} #{count}"
      end)

    [
      "# HELP lmg_tracking_channel_joins_total Channel join events by type",
      "# TYPE lmg_tracking_channel_joins_total counter"
      | lines
    ]
    |> Enum.join("\n")
  end

  defp format_channel_messages(messages) do
    lines =
      Enum.map(messages, fn {channel, count} ->
        "lmg_tracking_channel_messages_total{channel=\"#{channel}\"} #{count}"
      end)

    [
      "# HELP lmg_tracking_channel_messages_total Channel messages by type",
      "# TYPE lmg_tracking_channel_messages_total counter"
      | lines
    ]
    |> Enum.join("\n")
  end

  defp format_active_drivers(drivers_by_zone) do
    lines =
      Enum.map(drivers_by_zone, fn {zone, count} ->
        "lmg_tracking_active_drivers_total{zone=\"#{zone}\"} #{count}"
      end)

    [
      "# HELP lmg_tracking_active_drivers_total Active drivers by zone",
      "# TYPE lmg_tracking_active_drivers_total gauge"
      | lines
    ]
    |> Enum.join("\n")
  end

  defp format_presence_changes(changes) do
    lines =
      Enum.map(changes, fn {type, count} ->
        "lmg_tracking_presence_changes_total{type=\"#{type}\"} #{count}"
      end)

    [
      "# HELP lmg_tracking_presence_changes_total Presence changes (join/leave)",
      "# TYPE lmg_tracking_presence_changes_total counter"
      | lines
    ]
    |> Enum.join("\n")
  end
end
