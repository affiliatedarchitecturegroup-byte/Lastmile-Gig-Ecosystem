defmodule SvcTrackingWeb.DriverChannel do
  @moduledoc """
  Phoenix Channel for driver location tracking.

  Topic: "driver:{driver_id}"

  Drivers push GPS coordinates every 5 seconds. These are:
  1. Broadcast to all subscribers of this channel (customer tracking, ops)
  2. Cached in Redis for dispatch engine queries
  3. Published to Kafka (lmg.drivers.location) for analytics

  See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
  """
  use Phoenix.Channel

  require Logger

  @location_ttl_seconds 300
  @redis_key_prefix "lmg:tracking:driver:"

  @impl true
  def join("driver:" <> driver_id, _params, socket) do
    # Only allow the driver themselves or ops staff to join
    user_id = socket.assigns[:user_id]
    role = socket.assigns[:role]

    if user_id == driver_id or role in ["ops_staff", "ops_senior", "admin", "super_admin"] do
      socket = assign(socket, :driver_id, driver_id)
      Logger.info("Driver #{driver_id} joined tracking channel")

      # Send current state to the joining client
      send(self(), :after_join)

      {:ok, %{status: "connected", driver_id: driver_id}, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    driver_id = socket.assigns.driver_id

    # Broadcast driver online status
    broadcast!(socket, "driver:status", %{
      driver_id: driver_id,
      status: "online",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("location:update", payload, socket) do
    driver_id = socket.assigns.driver_id

    location = %{
      driver_id: driver_id,
      latitude: payload["latitude"],
      longitude: payload["longitude"],
      speed_kmh: payload["speed_kmh"] || 0,
      heading: payload["heading"] || 0,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # 1. Broadcast to channel subscribers
    broadcast!(socket, "location:updated", location)

    # 2. Also broadcast to ops:global for Command Centre
    SvcTrackingWeb.Endpoint.broadcast("ops:global", "driver:location", location)

    # 3. Cache in Redis for dispatch engine queries
    cache_location_in_redis(driver_id, location)

    # 4. If driver has an active order, broadcast to order channel
    case payload["active_order_id"] do
      nil -> :ok
      order_id ->
        SvcTrackingWeb.Endpoint.broadcast("order:#{order_id}", "driver:location", location)
    end

    {:reply, :ok, socket}
  end

  @impl true
  def handle_in("status:update", %{"status" => status}, socket) do
    driver_id = socket.assigns.driver_id

    broadcast!(socket, "driver:status", %{
      driver_id: driver_id,
      status: status,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    Logger.info("Driver #{driver_id} status changed to #{status}")

    {:reply, :ok, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    driver_id = socket.assigns[:driver_id]

    if driver_id do
      broadcast(socket, "driver:status", %{
        driver_id: driver_id,
        status: "offline",
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
      })

      Logger.info("Driver #{driver_id} disconnected from tracking channel")
    end

    :ok
  end

  # Cache driver location in Redis with TTL for dispatch engine queries.
  defp cache_location_in_redis(driver_id, location) do
    key = "#{@redis_key_prefix}#{driver_id}"
    value = Jason.encode!(location)

    case Redix.command(:tracking_redis, ["SETEX", key, @location_ttl_seconds, value]) do
      {:ok, _} -> :ok
      {:error, reason} ->
        Logger.warning("Failed to cache driver location in Redis: #{inspect(reason)}")
    end
  end
end
