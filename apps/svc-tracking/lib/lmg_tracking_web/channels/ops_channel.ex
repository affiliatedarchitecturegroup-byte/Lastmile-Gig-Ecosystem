defmodule LmgTrackingWeb.OpsChannel do
  @moduledoc """
  Phoenix Channel for the Command Centre operations view.

  Topic: "ops:global"

  This channel provides a unified real-time feed for the Command Centre,
  aggregating events from all driver and order channels into a single
  stream for operational monitoring.

  Authorization:
  - Only OPS_STAFF, OPS_SENIOR, ADMIN, SUPER_ADMIN roles can join
  - Admin roles can send operational commands (force-reassign, pause zone)

  Outgoing events (broadcast to Command Centre):
  - "driver:location_batch"  - Batched driver locations (every 5s)
  - "driver:online"          - Driver came online
  - "driver:offline"         - Driver went offline
  - "order:status_change"    - Order status changed
  - "zone:summary"           - Zone-level metrics summary
  - "alert:anomaly"          - Drift/fraud anomaly detected
  - "dispatch:event"         - Dispatch decision made
  - "presence:diff"          - Presence state changes

  Incoming events (from Command Centre):
  - "zone:request_summary"   - Request zone metrics on demand
  - "driver:request_history" - Request driver location history
  - "zone:pause"             - Pause dispatch in a zone (admin only)
  - "zone:resume"            - Resume dispatch in a zone (admin only)

  Scale: Single ops:global topic supports 100+ concurrent ops users.
  """

  use Phoenix.Channel
  require Logger

  alias LmgTracking.Presence
  alias LmgTracking.Location.LocationStore
  alias LmgTracking.Auth.ChannelAuth
  alias LmgTracking.Metrics.PrometheusCollector

  @zone_summary_interval_ms 10_000

  # ---------------------------------------------------------------------------
  # Channel lifecycle
  # ---------------------------------------------------------------------------

  @impl true
  def join("ops:" <> _scope, _payload, socket) do
    user_role = socket.assigns[:role]

    if ChannelAuth.can?(user_role, :ops, :join) do
      send(self(), :after_join)
      send(self(), :send_zone_summary)

      socket =
        socket
        |> assign(:ops_user, true)
        |> assign(:is_admin, ChannelAuth.admin?(user_role))

      PrometheusCollector.increment(:channel_join, %{channel: "ops"})

      Logger.info("Ops user joined Command Centre",
        user_id: socket.assigns.user_id,
        role: user_role
      )

      {:ok, %{status: "monitoring", role: user_role}, socket}
    else
      Logger.warning("Unauthorized ops channel join",
        user_id: socket.assigns.user_id,
        role: user_role
      )

      {:error, %{reason: "unauthorized"}}
    end
  end

  # ---------------------------------------------------------------------------
  # Post-join: send initial state
  # ---------------------------------------------------------------------------

  def handle_info(:after_join, socket) do
    user_id = socket.assigns.user_id
    role = socket.assigns.role

    # Track ops user presence
    Presence.track_ops_user(socket, user_id, role)

    # Send current presence state
    push(socket, "presence_state", Presence.list(socket))

    # Send initial zone summary
    send_zone_summary(socket)

    {:noreply, socket}
  end

  # Periodic zone summary broadcast
  def handle_info(:send_zone_summary, socket) do
    send_zone_summary(socket)

    # Schedule next summary
    Process.send_after(self(), :send_zone_summary, @zone_summary_interval_ms)

    {:noreply, socket}
  end

  # Handle driver location events from PubSub
  def handle_info({:driver_location, location_event}, socket) do
    push(socket, "driver:location_update", location_event)
    {:noreply, socket}
  end

  # Handle order status events from PubSub
  def handle_info({:order_status, status_event}, socket) do
    push(socket, "order:status_change", status_event)
    {:noreply, socket}
  end

  # Handle dispatch events from PubSub
  def handle_info({:dispatch_event, event}, socket) do
    push(socket, "dispatch:event", event)
    {:noreply, socket}
  end

  # Handle anomaly alerts from PubSub
  def handle_info({:anomaly_alert, alert}, socket) do
    push(socket, "alert:anomaly", alert)
    {:noreply, socket}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  # ---------------------------------------------------------------------------
  # Incoming events from Command Centre
  # ---------------------------------------------------------------------------

  @doc """
  Handle zone summary request - returns real-time metrics for all zones.
  """
  @impl true
  def handle_in("zone:request_summary", _payload, socket) do
    send_zone_summary(socket)
    {:reply, :ok, socket}
  end

  @doc """
  Handle request for all active drivers - returns full driver list with locations.
  """
  def handle_in("drivers:request_all", _payload, socket) do
    case LocationStore.get_all_active_drivers() do
      {:ok, drivers} ->
        push(socket, "drivers:all", %{
          drivers: drivers,
          count: length(drivers),
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
        })

        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  @doc """
  Handle request for a specific driver's location history.
  """
  def handle_in("driver:request_history", %{"driver_id" => driver_id}, socket) do
    case LocationStore.get_location_history(driver_id) do
      {:ok, history} ->
        push(socket, "driver:history", %{
          driver_id: driver_id,
          history: history,
          count: length(history)
        })

        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  @doc """
  Handle zone pause request (admin only).
  Pauses dispatch in a specific zone for incident management.
  """
  def handle_in("zone:pause", %{"zone" => zone, "reason" => reason}, socket) do
    if socket.assigns.is_admin do
      event = %{
        action: "zone_paused",
        zone: zone,
        reason: reason,
        paused_by: socket.assigns.user_id,
        paused_at: DateTime.utc_now() |> DateTime.to_iso8601()
      }

      # Broadcast to all ops users
      broadcast!(socket, "zone:paused", event)

      # Publish to Kafka for dispatch engine consumption
      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "kafka:publish",
        {:publish, "lmg.ops.zone_control", event}
      )

      Logger.info("Zone paused",
        zone: zone,
        reason: reason,
        paused_by: socket.assigns.user_id
      )

      {:reply, :ok, socket}
    else
      {:reply, {:error, %{reason: "admin_required"}}, socket}
    end
  end

  @doc """
  Handle zone resume request (admin only).
  """
  def handle_in("zone:resume", %{"zone" => zone}, socket) do
    if socket.assigns.is_admin do
      event = %{
        action: "zone_resumed",
        zone: zone,
        resumed_by: socket.assigns.user_id,
        resumed_at: DateTime.utc_now() |> DateTime.to_iso8601()
      }

      broadcast!(socket, "zone:resumed", event)

      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "kafka:publish",
        {:publish, "lmg.ops.zone_control", event}
      )

      Logger.info("Zone resumed",
        zone: zone,
        resumed_by: socket.assigns.user_id
      )

      {:reply, :ok, socket}
    else
      {:reply, {:error, %{reason: "admin_required"}}, socket}
    end
  end

  @doc """
  Handle request for zone-specific drivers.
  """
  def handle_in("zone:request_drivers", %{"zone" => zone}, socket) do
    case LocationStore.get_zone_drivers_with_locations(zone) do
      {:ok, drivers} ->
        push(socket, "zone:drivers", %{
          zone: zone,
          drivers: drivers,
          count: length(drivers),
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
        })

        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  def handle_in(_event, _payload, socket) do
    {:reply, {:error, %{reason: "unknown_event"}}, socket}
  end

  # ---------------------------------------------------------------------------
  # Termination
  # ---------------------------------------------------------------------------

  @impl true
  def terminate(_reason, socket) do
    Logger.info("Ops user left Command Centre",
      user_id: socket.assigns[:user_id]
    )

    :ok
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp send_zone_summary(socket) do
    case LocationStore.get_zone_counts() do
      {:ok, counts} ->
        total = counts |> Map.values() |> Enum.sum()

        summary = %{
          zones: counts,
          total_active_drivers: total,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
        }

        push(socket, "zone:summary", summary)

      {:error, _reason} ->
        :ok
    end
  end
end
