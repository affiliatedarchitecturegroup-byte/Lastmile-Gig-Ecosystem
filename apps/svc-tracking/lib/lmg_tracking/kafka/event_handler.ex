defmodule LmgTracking.Kafka.EventHandler do
  @moduledoc """
  Event routing and handling for Kafka messages consumed by the tracking service.

  Routes events from Kafka topics to the appropriate Phoenix Channel
  broadcasts and Redis state updates.

  Event flow:
  ```
  Kafka Topic → Broadway Consumer → EventHandler → Phoenix PubSub → Channels
  ```

  Handled events:
  - `lmg.orders.dispatched` → Map order-to-driver in Redis, notify order channel
  - `lmg.orders.delivered`  → Clear tracking state, notify order channel
  - `lmg.drivers.status`    → Update driver presence and zone membership
  """

  require Logger

  alias LmgTracking.Redis.Pool, as: RedisPool
  alias LmgTracking.Location.LocationStore

  # ---------------------------------------------------------------------------
  # Event routing
  # ---------------------------------------------------------------------------

  @doc """
  Route a Kafka event to the appropriate handler based on topic.
  """
  @spec handle_event(String.t(), map()) :: :ok
  def handle_event("lmg.orders.dispatched", event) do
    handle_order_dispatched(event)
  end

  def handle_event("lmg.orders.delivered", event) do
    handle_order_delivered(event)
  end

  def handle_event("lmg.drivers.status", event) do
    handle_driver_status_change(event)
  end

  def handle_event(topic, event) do
    Logger.warning("Unhandled Kafka topic",
      topic: topic,
      event_type: event["event_type"]
    )

    :ok
  end

  # ---------------------------------------------------------------------------
  # Event handlers
  # ---------------------------------------------------------------------------

  @doc """
  Handle order.dispatched event.

  When the dispatch engine assigns a driver to an order:
  1. Store order-to-driver mapping in Redis
  2. Broadcast to the order channel so the customer can track
  3. Broadcast to ops:global for Command Centre visibility
  """
  defp handle_order_dispatched(event) do
    payload = event["payload"] || event

    order_id = payload["order_id"]
    driver_id = payload["driver_id"]
    eta_minutes = payload["eta_minutes"]

    if order_id && driver_id do
      # Store order-driver mapping in Redis
      LocationStore.assign_driver_to_order(order_id, driver_id)

      # Get current driver location for immediate push
      driver_location =
        case RedisPool.get_driver_location(driver_id) do
          {:ok, loc} when not is_nil(loc) -> loc
          _ -> nil
        end

      # Broadcast to order channel
      dispatch_event = %{
        order_id: order_id,
        driver_id: driver_id,
        status: "dispatched",
        eta_minutes: eta_minutes,
        driver_location: driver_location,
        dispatched_at: event["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
      }

      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "order:#{order_id}",
        {:order_dispatched, dispatch_event}
      )

      # Also broadcast to ops:global
      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "ops:global",
        {:dispatch_event, dispatch_event}
      )

      Logger.info("Order dispatched - tracking active",
        order_id: order_id,
        driver_id: driver_id
      )
    else
      Logger.warning("Invalid order.dispatched event - missing order_id or driver_id",
        event: inspect(event)
      )
    end

    :ok
  end

  @doc """
  Handle order.delivered event.

  When a delivery is confirmed:
  1. Broadcast delivery confirmation to order channel
  2. Clean up order-to-driver mapping in Redis
  3. Notify ops:global for dashboard update
  """
  defp handle_order_delivered(event) do
    payload = event["payload"] || event

    order_id = payload["order_id"]
    driver_id = payload["driver_id"]

    if order_id do
      delivery_event = %{
        order_id: order_id,
        driver_id: driver_id,
        status: "delivered",
        delivered_at: event["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
        geo_verified: payload["geo_verified"],
        blockchain_tx: payload["blockchain_tx"]
      }

      # Broadcast to order channel
      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "order:#{order_id}",
        {:order_delivered, delivery_event}
      )

      # Broadcast to ops:global
      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "ops:global",
        {:order_status, delivery_event}
      )

      Logger.info("Order delivered - tracking complete",
        order_id: order_id,
        driver_id: driver_id,
        geo_verified: payload["geo_verified"]
      )
    end

    :ok
  end

  @doc """
  Handle driver.status.changed event.

  When a driver's status changes from another service:
  1. Update presence in the tracking system
  2. Add/remove from zone sets
  3. Broadcast to ops:global
  """
  defp handle_driver_status_change(event) do
    payload = event["payload"] || event

    driver_id = payload["driver_id"]
    new_status = payload["status"]
    zone = payload["zone"]

    if driver_id && new_status do
      case new_status do
        "offline" ->
          # Remove from zone tracking
          if zone do
            RedisPool.remove_driver_from_zone(zone, driver_id)
          end

          Logger.info("Driver went offline (via Kafka)",
            driver_id: driver_id,
            zone: zone
          )

        "active" ->
          # Add to zone tracking
          if zone do
            RedisPool.add_driver_to_zone(zone, driver_id)
          end

          Logger.info("Driver went active (via Kafka)",
            driver_id: driver_id,
            zone: zone
          )

        _ ->
          Logger.debug("Driver status changed",
            driver_id: driver_id,
            status: new_status
          )
      end

      # Broadcast to ops:global
      Phoenix.PubSub.broadcast(
        LmgTracking.PubSub,
        "ops:global",
        {:driver_status, %{
          driver_id: driver_id,
          status: new_status,
          zone: zone,
          timestamp: event["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
        }}
      )
    end

    :ok
  end
end
