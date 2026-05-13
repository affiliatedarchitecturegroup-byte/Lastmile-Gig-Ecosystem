defmodule LmgTrackingWeb.DriverChannel do
  @moduledoc """
  Phoenix Channel for driver real-time location tracking.

  Topic: "driver:{driver_id}"

  This channel handles:
  - Driver GPS location pushes (every 5 seconds from mobile app)
  - Location storage in Redis (ephemeral, TTL-based)
  - Location broadcast to order tracking subscribers
  - Presence tracking (online/offline status per zone)
  - Drift anomaly detection (GPS spoofing prevention)
  - Zone-based driver pool management

  Authorization:
  - Only DRIVER role can join their own driver channel
  - OPS_STAFF, OPS_SENIOR, ADMIN can join any driver channel (read-only)

  Events:
  - "location:update" (in)  - Driver pushes GPS coordinates
  - "location:new" (out)    - Broadcast to order channel subscribers
  - "status:update" (in)    - Driver updates availability status
  - "shift:end" (in)        - Driver ends their shift

  Performance target: Process 10,000+ location updates/second across cluster.
  """

  use Phoenix.Channel
  require Logger

  alias LmgTracking.Presence
  alias LmgTracking.Redis.Pool, as: RedisPool
  alias LmgTracking.Location.GeoUtils
  alias LmgTracking.Metrics.PrometheusCollector

  @location_update_event "location:update"
  @location_broadcast_event "location:new"
  @status_update_event "status:update"
  @shift_end_event "shift:end"

  # ---------------------------------------------------------------------------
  # Channel lifecycle
  # ---------------------------------------------------------------------------

  @doc """
  Handle channel join for "driver:{driver_id}".

  Validates:
  1. User has DRIVER, OPS_STAFF, OPS_SENIOR, or ADMIN role
  2. Drivers can only join their own channel
  3. Ops/admin can join any driver channel (monitoring)
  """
  @impl true
  def join("driver:" <> driver_id, payload, socket) do
    user_role = socket.assigns[:role]
    user_id = socket.assigns[:user_id]

    cond do
      # Drivers can only join their own channel
      user_role == "DRIVER" and user_id == driver_id ->
        send(self(), {:after_join, payload})

        socket =
          socket
          |> assign(:driver_id, driver_id)
          |> assign(:zone, Map.get(payload, "zone", "unassigned"))
          |> assign(:vehicle_type, Map.get(payload, "vehicle_type", "scooter"))

        PrometheusCollector.increment(:channel_join, %{channel: "driver"})
        {:ok, %{status: "joined", driver_id: driver_id}, socket}

      # Ops and admin can monitor any driver (read-only)
      user_role in ["OPS_STAFF", "OPS_SENIOR", "ADMIN", "SUPER_ADMIN"] ->
        socket = assign(socket, :driver_id, driver_id)
        socket = assign(socket, :read_only, true)
        PrometheusCollector.increment(:channel_join, %{channel: "driver_monitor"})
        {:ok, %{status: "monitoring", driver_id: driver_id}, socket}

      # Unauthorized
      true ->
        Logger.warning("Unauthorized driver channel join attempt",
          user_id: user_id,
          role: user_role,
          target_driver: driver_id
        )

        {:error, %{reason: "unauthorized"}}
    end
  end

  @doc """
  Post-join setup: track presence and register in zone.
  """
  def handle_info({:after_join, payload}, socket) do
    driver_id = socket.assigns.driver_id
    zone = socket.assigns.zone
    vehicle_type = socket.assigns.vehicle_type

    # Track driver presence
    Presence.track_driver(socket, driver_id, %{
      zone: zone,
      vehicle_type: vehicle_type,
      status: "active"
    })

    # Add driver to zone set in Redis
    RedisPool.add_driver_to_zone(zone, driver_id)

    # Push current presence state to the joining driver
    push(socket, "presence_state", Presence.list(socket))

    Logger.info("Driver joined tracking",
      driver_id: driver_id,
      zone: zone,
      vehicle_type: vehicle_type
    )

    {:noreply, socket}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  # ---------------------------------------------------------------------------
  # Incoming events
  # ---------------------------------------------------------------------------

  @doc """
  Handle GPS location update from driver mobile app.

  Expected payload:
  ```json
  {
    "lat": -29.8587,
    "lng": 31.0218,
    "speed": 45,
    "heading": 180,
    "accuracy": 8.5,
    "timestamp": 1716652800000
  }
  ```

  Processing:
  1. Validate coordinate format
  2. Detect drift anomalies (GPS spoofing)
  3. Store location in Redis (with TTL)
  4. Determine zone from coordinates
  5. Broadcast to order tracking subscribers
  6. Emit telemetry metrics
  """
  @impl true
  def handle_in(@location_update_event, payload, socket) do
    if socket.assigns[:read_only] do
      {:reply, {:error, %{reason: "read_only"}}, socket}
    else
      process_location_update(payload, socket)
    end
  end

  @doc """
  Handle driver status update (active/idle/offline).
  """
  def handle_in(@status_update_event, %{"status" => new_status}, socket) do
    if socket.assigns[:read_only] do
      {:reply, {:error, %{reason: "read_only"}}, socket}
    else
      driver_id = socket.assigns.driver_id

      # Update presence metadata
      Presence.update_driver(socket, driver_id, %{status: new_status})

      Logger.info("Driver status updated",
        driver_id: driver_id,
        status: new_status
      )

      broadcast!(socket, "status:changed", %{
        driver_id: driver_id,
        status: new_status,
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
      })

      {:reply, :ok, socket}
    end
  end

  @doc """
  Handle shift end - clean up tracking state.
  """
  def handle_in(@shift_end_event, _payload, socket) do
    if socket.assigns[:read_only] do
      {:reply, {:error, %{reason: "read_only"}}, socket}
    else
      driver_id = socket.assigns.driver_id
      zone = socket.assigns.zone

      # Clear Redis tracking data
      RedisPool.clear_driver_tracking(driver_id, zone)

      Logger.info("Driver shift ended",
        driver_id: driver_id,
        zone: zone
      )

      broadcast!(socket, "shift:ended", %{
        driver_id: driver_id,
        ended_at: DateTime.utc_now() |> DateTime.to_iso8601()
      })

      {:reply, :ok, socket}
    end
  end

  def handle_in(_event, _payload, socket) do
    {:reply, {:error, %{reason: "unknown_event"}}, socket}
  end

  # ---------------------------------------------------------------------------
  # Channel termination
  # ---------------------------------------------------------------------------

  @impl true
  def terminate(reason, socket) do
    driver_id = socket.assigns[:driver_id]
    zone = socket.assigns[:zone]

    unless socket.assigns[:read_only] do
      # Clean up on disconnect (driver went offline)
      if driver_id && zone do
        RedisPool.remove_driver_from_zone(zone, driver_id)

        PrometheusCollector.increment(:presence_change, %{type: :leave})

        Logger.info("Driver disconnected from tracking",
          driver_id: driver_id,
          zone: zone,
          reason: inspect(reason)
        )
      end
    end

    :ok
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp process_location_update(payload, socket) do
    start_time = System.monotonic_time(:millisecond)
    driver_id = socket.assigns.driver_id

    with {:ok, lat, lng} <- validate_coordinates(payload),
         {:ok, _distance} <- check_drift(socket, lat, lng),
         zone <- GeoUtils.determine_zone({lat, lng}),
         :ok <- store_location(driver_id, lat, lng, payload, zone),
         socket <- maybe_update_zone(socket, zone) do
      # Broadcast location to order tracking channels
      location_event = %{
        driver_id: driver_id,
        lat: lat,
        lng: lng,
        speed: Map.get(payload, "speed", 0),
        heading: Map.get(payload, "heading", 0),
        zone: zone,
        timestamp: Map.get(payload, "timestamp", DateTime.utc_now() |> DateTime.to_unix(:millisecond))
      }

      broadcast!(socket, @location_broadcast_event, location_event)

      # Also broadcast to the ops:global channel for Command Centre
      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "ops:global",
        {:driver_location, location_event}
      )

      # Update presence with latest location
      Presence.update_driver(socket, driver_id, %{
        last_location: %{lat: lat, lng: lng},
        zone: zone
      })

      # Emit telemetry
      duration = System.monotonic_time(:millisecond) - start_time

      :telemetry.execute(
        [:lmg, :tracking, :location_update],
        %{duration: duration},
        %{zone: zone, driver_id: driver_id}
      )

      PrometheusCollector.increment(:location_updates, %{})

      {:reply, :ok, socket}
    else
      {:error, reason} ->
        Logger.warning("Location update rejected",
          driver_id: driver_id,
          reason: inspect(reason)
        )

        {:reply, {:error, %{reason: to_string(reason)}}, socket}
    end
  end

  defp validate_coordinates(%{"lat" => lat, "lng" => lng})
       when is_number(lat) and is_number(lng) do
    cond do
      lat < -90 or lat > 90 ->
        {:error, :invalid_latitude}

      lng < -180 or lng > 180 ->
        {:error, :invalid_longitude}

      true ->
        {:ok, lat / 1, lng / 1}
    end
  end

  defp validate_coordinates(_), do: {:error, :missing_coordinates}

  defp check_drift(socket, lat, lng) do
    driver_id = socket.assigns.driver_id
    max_drift = Application.get_env(:lmg_tracking, :tracking)[:max_drift_meters] || 5_000

    case RedisPool.get_driver_location(driver_id) do
      {:ok, nil} ->
        # First location update, no drift check needed
        {:ok, 0}

      {:ok, prev} ->
        prev_lat = prev["lat"]
        prev_lng = prev["lng"]

        case GeoUtils.detect_drift({prev_lat, prev_lng}, {lat, lng}, max_drift) do
          {:ok, distance} ->
            {:ok, distance}

          {:drift, distance} ->
            Logger.warning("Drift anomaly detected",
              driver_id: driver_id,
              distance_m: Float.round(distance, 1),
              max_allowed_m: max_drift
            )

            # Still allow the update but flag it
            {:ok, distance}
        end

      {:error, _} ->
        {:ok, 0}
    end
  end

  defp store_location(driver_id, lat, lng, payload, zone) do
    metadata = %{
      zone: zone,
      speed: Map.get(payload, "speed", 0),
      heading: Map.get(payload, "heading", 0)
    }

    RedisPool.set_driver_location(driver_id, lat, lng, metadata)
  end

  defp maybe_update_zone(socket, new_zone) do
    old_zone = socket.assigns.zone

    if old_zone != new_zone do
      driver_id = socket.assigns.driver_id

      # Move driver between zone sets
      RedisPool.remove_driver_from_zone(old_zone, driver_id)
      RedisPool.add_driver_to_zone(new_zone, driver_id)

      Logger.info("Driver zone changed",
        driver_id: driver_id,
        from_zone: old_zone,
        to_zone: new_zone
      )

      assign(socket, :zone, new_zone)
    else
      socket
    end
  end
end
