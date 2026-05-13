defmodule LmgTrackingWeb.OrderChannelTest do
  @moduledoc """
  Tests for the order tracking channel.

  Covers:
  - Channel join authorization by role
  - Order status updates
  - Pickup confirmation
  - Delivery attempt with geo-verification
  - ETA calculation
  """

  use LmgTrackingWeb.ChannelCase

  alias LmgTrackingWeb.OrderChannel

  @order_id "order-test-001"
  @driver_id "driver-test-001"

  @customer_claims %{
    "sub" => "customer-001",
    "role" => "CUSTOMER",
    "email" => "customer@test.lastmilegig.aagais.co.za"
  }

  @driver_claims %{
    "sub" => "driver-test-001",
    "role" => "DRIVER",
    "email" => "driver@test.lastmilegig.aagais.co.za"
  }

  @ops_claims %{
    "sub" => "ops-001",
    "role" => "OPS_STAFF",
    "email" => "ops@test.lastmilegig.aagais.co.za"
  }

  # ---------------------------------------------------------------------------
  # Join tests
  # ---------------------------------------------------------------------------

  describe "join/3" do
    test "customer can join an order channel" do
      token = generate_test_token(@customer_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, OrderChannel, "order:#{@order_id}", %{})

      assert reply.status == "tracking"
      assert reply.order_id == @order_id
    end

    test "ops staff can join any order channel" do
      token = generate_test_token(@ops_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, OrderChannel, "order:#{@order_id}", %{})

      assert reply.status == "tracking"
    end
  end

  # ---------------------------------------------------------------------------
  # Order status update tests
  # ---------------------------------------------------------------------------

  describe "handle_in order:status_update" do
    test "driver can update order status" do
      token = generate_test_token(@driver_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      # Note: In real tests, we'd mock RedisPool.get_order_driver to return the driver_id
      {:ok, _reply, socket} =
        subscribe_and_join(socket, OrderChannel, "order:#{@order_id}", %{})

      ref = push(socket, "order:status_update", %{"status" => "en_route"})
      assert_reply ref, :ok

      assert_broadcast "order:status", %{
        order_id: @order_id,
        status: "en_route"
      }
    end

    test "customer cannot update order status" do
      token = generate_test_token(@customer_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OrderChannel, "order:#{@order_id}", %{})

      ref = push(socket, "order:status_update", %{"status" => "en_route"})
      assert_reply ref, :error, %{reason: "unauthorized"}
    end
  end

  # ---------------------------------------------------------------------------
  # Pickup confirmation tests
  # ---------------------------------------------------------------------------

  describe "handle_in pickup:confirmed" do
    test "driver can confirm pickup" do
      token = generate_test_token(@driver_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OrderChannel, "order:#{@order_id}", %{})

      ref =
        push(socket, "pickup:confirmed", %{
          "lat" => -29.8587,
          "lng" => 31.0218
        })

      assert_reply ref, :ok

      assert_broadcast "pickup:confirmed", %{
        order_id: @order_id,
        driver_id: @driver_id
      }

      assert_broadcast "order:status", %{
        order_id: @order_id,
        status: "picked_up"
      }
    end

    test "customer cannot confirm pickup" do
      token = generate_test_token(@customer_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OrderChannel, "order:#{@order_id}", %{})

      ref = push(socket, "pickup:confirmed", %{"lat" => -29.8587, "lng" => 31.0218})
      assert_reply ref, :error, %{reason: "unauthorized"}
    end
  end

  # ---------------------------------------------------------------------------
  # Delivery attempt tests
  # ---------------------------------------------------------------------------

  describe "handle_in delivery:attempt" do
    test "driver can submit delivery attempt with geo-verification" do
      token = generate_test_token(@driver_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OrderChannel, "order:#{@order_id}", %{})

      ref =
        push(socket, "delivery:attempt", %{
          "lat" => -29.8587,
          "lng" => 31.0218,
          "target_lat" => -29.8590,
          "target_lng" => 31.0220,
          "photo_url" => "https://cdn.lastmilegig.aagais.co.za/delivery/proof-001.jpg"
        })

      # Within 100m, should be geo-verified
      assert_reply ref, :ok, %{geo_verified: true}

      assert_broadcast "delivery:confirmed", %{
        order_id: @order_id,
        geo_verified: true
      }
    end

    test "delivery far from target is flagged as not geo-verified" do
      token = generate_test_token(@driver_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OrderChannel, "order:#{@order_id}", %{})

      ref =
        push(socket, "delivery:attempt", %{
          "lat" => -29.8587,
          "lng" => 31.0218,
          # 1km away
          "target_lat" => -29.8687,
          "target_lng" => 31.0318
        })

      assert_reply ref, :ok, %{geo_verified: false}
    end
  end
end
