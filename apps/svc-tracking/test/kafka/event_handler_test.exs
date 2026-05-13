defmodule LmgTracking.Kafka.EventHandlerTest do
  @moduledoc """
  Tests for Kafka event handler routing and processing.
  """

  use ExUnit.Case, async: true

  alias LmgTracking.Kafka.EventHandler

  describe "handle_event/2 routing" do
    test "routes lmg.orders.dispatched to dispatch handler" do
      event = %{
        "event_type" => "order.dispatched",
        "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601(),
        "payload" => %{
          "order_id" => "order-001",
          "driver_id" => "driver-001",
          "eta_minutes" => 15
        }
      }

      # Should not raise - tests routing works
      assert :ok = EventHandler.handle_event("lmg.orders.dispatched", event)
    end

    test "routes lmg.orders.delivered to delivery handler" do
      event = %{
        "event_type" => "order.delivered",
        "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601(),
        "payload" => %{
          "order_id" => "order-002",
          "driver_id" => "driver-001",
          "geo_verified" => true
        }
      }

      assert :ok = EventHandler.handle_event("lmg.orders.delivered", event)
    end

    test "routes lmg.drivers.status to status handler" do
      event = %{
        "event_type" => "driver.status.changed",
        "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601(),
        "payload" => %{
          "driver_id" => "driver-001",
          "status" => "active",
          "zone" => "KZN-North"
        }
      }

      assert :ok = EventHandler.handle_event("lmg.drivers.status", event)
    end

    test "handles unknown topics gracefully" do
      event = %{"event_type" => "unknown", "payload" => %{}}
      assert :ok = EventHandler.handle_event("lmg.unknown.topic", event)
    end

    test "handles events with missing payload gracefully" do
      event = %{"event_type" => "order.dispatched"}
      assert :ok = EventHandler.handle_event("lmg.orders.dispatched", event)
    end
  end
end
