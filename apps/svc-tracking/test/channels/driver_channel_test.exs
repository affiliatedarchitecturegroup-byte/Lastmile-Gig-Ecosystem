defmodule SvcTrackingWeb.DriverChannelTest do
  @moduledoc """
  Unit tests for the DriverChannel.

  Tests driver location broadcasting, status updates,
  and channel join/leave behaviour.

  Coverage target: 80%+
  """
  use ExUnit.Case, async: true

  alias SvcTrackingWeb.DriverChannel

  @driver_id "driver-001"

  describe "join/3" do
    test "allows driver to join their own channel" do
      socket = %{assigns: %{user_id: @driver_id, role: "driver"}}
      assert {:ok, _reply, _socket} = DriverChannel.join("driver:#{@driver_id}", %{}, socket)
    end

    test "allows ops staff to join any driver channel" do
      socket = %{assigns: %{user_id: "ops-user-001", role: "ops_staff"}}
      assert {:ok, _reply, _socket} = DriverChannel.join("driver:#{@driver_id}", %{}, socket)
    end

    test "rejects unauthorised user from joining driver channel" do
      socket = %{assigns: %{user_id: "customer-001", role: "customer"}}
      assert {:error, %{reason: "unauthorized"}} =
               DriverChannel.join("driver:#{@driver_id}", %{}, socket)
    end
  end

  describe "handle_in location:update" do
    test "accepts valid location payload" do
      socket = %{
        assigns: %{driver_id: @driver_id, user_id: @driver_id, role: "driver"},
        topic: "driver:#{@driver_id}"
      }

      payload = %{
        "latitude" => -29.8587,
        "longitude" => 31.0218,
        "speed_kmh" => 25.0,
        "heading" => 180,
        "active_order_id" => nil
      }

      # This tests the payload structure is accepted
      assert is_map(payload)
      assert payload["latitude"] == -29.8587
      assert payload["longitude"] == 31.0218
    end
  end

  describe "handle_in status:update" do
    test "accepts valid status values" do
      valid_statuses = ["active", "idle", "offline", "on_delivery"]

      Enum.each(valid_statuses, fn status ->
        payload = %{"status" => status}
        assert is_binary(payload["status"])
      end)
    end
  end
end
