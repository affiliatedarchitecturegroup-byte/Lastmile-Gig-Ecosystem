defmodule SvcTrackingWeb.OrderChannelTest do
  @moduledoc """
  Unit tests for the OrderChannel.

  Tests customer order tracking subscription behaviour.

  Coverage target: 80%+
  """
  use ExUnit.Case, async: true

  alias SvcTrackingWeb.OrderChannel

  @order_id "550e8400-e29b-41d4-a716-446655440000"

  describe "join/3" do
    test "allows any authenticated user to join order channel" do
      socket = %{assigns: %{user_id: "customer-001", role: "customer"}}
      assert {:ok, _reply, _socket} = OrderChannel.join("order:#{@order_id}", %{}, socket)
    end

    test "returns connected status with order_id" do
      socket = %{assigns: %{user_id: "customer-001", role: "customer"}}
      {:ok, reply, _socket} = OrderChannel.join("order:#{@order_id}", %{}, socket)
      assert reply.status == "connected"
      assert reply.order_id == @order_id
    end
  end

  describe "handle_in ping" do
    test "responds with pong timestamp" do
      socket = %{assigns: %{order_id: @order_id}}
      {:reply, {:ok, response}, _socket} = OrderChannel.handle_in("ping", %{}, socket)
      assert Map.has_key?(response, :pong)
    end
  end
end
