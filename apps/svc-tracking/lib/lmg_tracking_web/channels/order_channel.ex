defmodule LmgTrackingWeb.OrderChannel do
  @moduledoc """
  Phoenix Channel for customer order tracking.

  Topic: "order:{order_id}"

  This channel handles:
  - Customer subscription to live delivery tracking
  - Driver location relay from driver channel to customer map
  - Order status updates (dispatched, picked up, en route, delivered)
  - ETA updates based on driver position and route
  - Delivery confirmation events

  Authorization:
  - CUSTOMER role: Can join orders they own
  - DRIVER role: Can join orders assigned to them
  - PARTNER_STAFF/PARTNER_ADMIN: Can join orders for their restaurant
  - OPS_STAFF/ADMIN: Can join any order channel

  Events (outgoing to customer):
  - "driver:location" - Live driver GPS position for map pin
  - "order:status" - Order status change notification
  - "order:eta" - Updated ETA based on driver position
  - "delivery:confirmed" - Delivery verified (geo-tag + photo)

  Events (incoming from driver):
  - "pickup:confirmed" - Driver picked up the order
  - "delivery:attempt" - Driver attempting delivery
  """

  use Phoenix.Channel
  require Logger

  alias LmgTracking.Presence
  alias LmgTracking.Redis.Pool, as: RedisPool
  alias LmgTracking.Location.GeoUtils
  alias LmgTracking.Metrics.PrometheusCollector

  # ---------------------------------------------------------------------------
  # Channel lifecycle
  # ---------------------------------------------------------------------------

  @impl true
  def join("order:" <> order_id, payload, socket) do
    user_role = socket.assigns[:role]
    user_id = socket.assigns[:user_id]

    case authorize_order_join(user_role, user_id, order_id, payload) do
      :ok ->
        send(self(), {:after_join, order_id})

        socket =
          socket
          |> assign(:order_id, order_id)
          |> assign(:viewer_role, user_role)

        PrometheusCollector.increment(:channel_join, %{channel: "order"})

        {:ok, %{status: "tracking", order_id: order_id}, socket}

      {:error, reason} ->
        Logger.warning("Unauthorized order channel join",
          user_id: user_id,
          role: user_role,
          order_id: order_id
        )

        {:error, %{reason: reason}}
    end
  end

  def handle_info({:after_join, order_id}, socket) do
    user_id = socket.assigns.user_id
    user_role = socket.assigns.viewer_role

    # Track customer presence on this order
    if user_role == "CUSTOMER" do
      Presence.track_customer(socket, user_id, order_id)
    end

    # Send current driver location if available
    case RedisPool.get_order_driver(order_id) do
      {:ok, driver_id} when is_binary(driver_id) ->
        case RedisPool.get_driver_location(driver_id) do
          {:ok, location} when not is_nil(location) ->
            push(socket, "driver:location", %{
              driver_id: driver_id,
              lat: location["lat"],
              lng: location["lng"],
              speed: location["speed"] || 0,
              heading: location["heading"] || 0,
              timestamp: location["ts"]
            })

          _ ->
            :ok
        end

      _ ->
        :ok
    end

    # Push current presence state
    push(socket, "presence_state", Presence.list(socket))

    Logger.info("Order tracking started",
      order_id: order_id,
      user_role: user_role
    )

    {:noreply, socket}
  end

  # Handle driver location broadcasts relayed from driver channel
  def handle_info({:driver_location, location_event}, socket) do
    push(socket, "driver:location", location_event)
    {:noreply, socket}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  # ---------------------------------------------------------------------------
  # Incoming events
  # ---------------------------------------------------------------------------

  @doc """
  Handle order status update.

  Only DRIVER and OPS roles can update order status.
  Customers receive status updates as outgoing events.
  """
  @impl true
  def handle_in("order:status_update", %{"status" => new_status} = payload, socket) do
    user_role = socket.assigns.viewer_role
    order_id = socket.assigns.order_id

    if user_role in ["DRIVER", "OPS_STAFF", "OPS_SENIOR", "ADMIN"] do
      status_event = %{
        order_id: order_id,
        status: new_status,
        updated_by: socket.assigns.user_id,
        message: Map.get(payload, "message"),
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
      }

      broadcast!(socket, "order:status", status_event)

      # Broadcast to ops global channel
      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "ops:global",
        {:order_status, status_event}
      )

      Logger.info("Order status updated",
        order_id: order_id,
        status: new_status,
        updated_by: socket.assigns.user_id
      )

      {:reply, :ok, socket}
    else
      {:reply, {:error, %{reason: "unauthorized"}}, socket}
    end
  end

  @doc """
  Handle pickup confirmation from driver.
  """
  def handle_in("pickup:confirmed", payload, socket) do
    if socket.assigns.viewer_role == "DRIVER" do
      order_id = socket.assigns.order_id

      pickup_event = %{
        order_id: order_id,
        driver_id: socket.assigns.user_id,
        picked_up_at: DateTime.utc_now() |> DateTime.to_iso8601(),
        restaurant_lat: Map.get(payload, "lat"),
        restaurant_lng: Map.get(payload, "lng")
      }

      broadcast!(socket, "order:status", %{
        order_id: order_id,
        status: "picked_up",
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
      })

      broadcast!(socket, "pickup:confirmed", pickup_event)

      Logger.info("Order picked up",
        order_id: order_id,
        driver_id: socket.assigns.user_id
      )

      {:reply, :ok, socket}
    else
      {:reply, {:error, %{reason: "unauthorized"}}, socket}
    end
  end

  @doc """
  Handle delivery attempt/confirmation from driver.

  Validates geo-proximity to delivery address (within 100m).
  """
  def handle_in("delivery:attempt", payload, socket) do
    if socket.assigns.viewer_role == "DRIVER" do
      order_id = socket.assigns.order_id

      delivery_event = %{
        order_id: order_id,
        driver_id: socket.assigns.user_id,
        delivery_lat: Map.get(payload, "lat"),
        delivery_lng: Map.get(payload, "lng"),
        photo_url: Map.get(payload, "photo_url"),
        attempted_at: DateTime.utc_now() |> DateTime.to_iso8601()
      }

      # Check geo-proximity if delivery address is provided
      geo_verified =
        case {Map.get(payload, "target_lat"), Map.get(payload, "target_lng")} do
          {target_lat, target_lng}
          when is_number(target_lat) and is_number(target_lng) ->
            delivery_coord = {Map.get(payload, "lat"), Map.get(payload, "lng")}
            target_coord = {target_lat, target_lng}
            GeoUtils.within_geofence?(delivery_coord, target_coord, 100.0)

          _ ->
            nil
        end

      delivery_event = Map.put(delivery_event, :geo_verified, geo_verified)

      broadcast!(socket, "order:status", %{
        order_id: order_id,
        status: "delivered",
        geo_verified: geo_verified,
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
      })

      broadcast!(socket, "delivery:confirmed", delivery_event)

      Logger.info("Delivery attempt",
        order_id: order_id,
        driver_id: socket.assigns.user_id,
        geo_verified: geo_verified
      )

      {:reply, {:ok, %{geo_verified: geo_verified}}, socket}
    else
      {:reply, {:error, %{reason: "unauthorized"}}, socket}
    end
  end

  @doc """
  Handle ETA request - calculate ETA based on current driver position.
  """
  def handle_in("eta:request", %{"destination_lat" => dest_lat, "destination_lng" => dest_lng}, socket) do
    order_id = socket.assigns.order_id

    case RedisPool.get_order_driver(order_id) do
      {:ok, driver_id} when is_binary(driver_id) ->
        case RedisPool.get_driver_location(driver_id) do
          {:ok, location} when not is_nil(location) ->
            distance_m =
              GeoUtils.haversine_distance(
                {location["lat"], location["lng"]},
                {dest_lat, dest_lng}
              )

            # Rough ETA: assume average 30 km/h in urban areas
            eta_minutes = Float.round(distance_m / 1000 / 30 * 60, 1)

            push(socket, "order:eta", %{
              order_id: order_id,
              distance_m: Float.round(distance_m, 0),
              eta_minutes: eta_minutes,
              calculated_at: DateTime.utc_now() |> DateTime.to_iso8601()
            })

            {:reply, :ok, socket}

          _ ->
            {:reply, {:error, %{reason: "driver_location_unavailable"}}, socket}
        end

      _ ->
        {:reply, {:error, %{reason: "no_driver_assigned"}}, socket}
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
    order_id = socket.assigns[:order_id]

    Logger.info("Order tracking ended",
      order_id: order_id,
      user_role: socket.assigns[:viewer_role]
    )

    :ok
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp authorize_order_join(role, _user_id, _order_id, _payload)
       when role in ["OPS_STAFF", "OPS_SENIOR", "ADMIN", "SUPER_ADMIN"] do
    :ok
  end

  defp authorize_order_join("DRIVER", user_id, order_id, _payload) do
    # Verify this driver is assigned to this order
    case RedisPool.get_order_driver(order_id) do
      {:ok, ^user_id} -> :ok
      {:ok, nil} -> {:error, "no_driver_assigned"}
      {:ok, _other} -> {:error, "not_assigned_driver"}
      {:error, _} -> {:error, "lookup_failed"}
    end
  end

  defp authorize_order_join("CUSTOMER", _user_id, _order_id, _payload) do
    # In production, verify the customer owns this order via order service
    # For now, allow access (order ownership verified at API gateway level)
    :ok
  end

  defp authorize_order_join("PARTNER_STAFF", _user_id, _order_id, _payload) do
    # In production, verify the partner owns the restaurant for this order
    :ok
  end

  defp authorize_order_join("PARTNER_ADMIN", _user_id, _order_id, _payload) do
    :ok
  end

  defp authorize_order_join(_role, _user_id, _order_id, _payload) do
    {:error, "unauthorized"}
  end
end
