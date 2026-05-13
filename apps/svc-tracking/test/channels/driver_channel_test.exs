defmodule LmgTrackingWeb.DriverChannelTest do
  @moduledoc """
  Tests for the driver location tracking channel.

  Covers:
  - Channel join authorization (driver, ops, unauthorized)
  - Location update processing and broadcasting
  - Status updates
  - Shift end cleanup
  - Coordinate validation
  """

  use LmgTrackingWeb.ChannelCase

  alias LmgTrackingWeb.DriverChannel

  @driver_id "driver-test-001"
  @driver_token_claims %{
    "sub" => "driver-test-001",
    "role" => "DRIVER",
    "email" => "driver@test.lastmilegig.aagais.co.za"
  }

  @ops_token_claims %{
    "sub" => "ops-user-001",
    "role" => "OPS_STAFF",
    "email" => "ops@test.lastmilegig.aagais.co.za"
  }

  @customer_token_claims %{
    "sub" => "customer-001",
    "role" => "CUSTOMER",
    "email" => "customer@test.lastmilegig.aagais.co.za"
  }

  # ---------------------------------------------------------------------------
  # Join tests
  # ---------------------------------------------------------------------------

  describe "join/3" do
    test "driver can join their own channel" do
      token = generate_test_token(@driver_token_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, DriverChannel, "driver:#{@driver_id}", %{
                 "zone" => "KZN-North",
                 "vehicle_type" => "scooter"
               })

      assert reply.status == "joined"
      assert reply.driver_id == @driver_id
    end

    test "driver cannot join another driver's channel" do
      token = generate_test_token(@driver_token_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(socket, DriverChannel, "driver:other-driver-id", %{})
    end

    test "ops staff can join any driver channel for monitoring" do
      token = generate_test_token(@ops_token_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, DriverChannel, "driver:#{@driver_id}", %{})

      assert reply.status == "monitoring"
    end

    test "customer cannot join driver channel" do
      token = generate_test_token(@customer_token_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(socket, DriverChannel, "driver:#{@driver_id}", %{})
    end
  end

  # ---------------------------------------------------------------------------
  # Location update tests
  # ---------------------------------------------------------------------------

  describe "handle_in location:update" do
    setup do
      token = generate_test_token(@driver_token_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, DriverChannel, "driver:#{@driver_id}", %{
          "zone" => "KZN-North",
          "vehicle_type" => "scooter"
        })

      %{socket: socket}
    end

    test "valid location update is accepted and broadcast", %{socket: socket} do
      location = %{
        "lat" => -29.8587,
        "lng" => 31.0218,
        "speed" => 45,
        "heading" => 180,
        "accuracy" => 8.5
      }

      ref = push(socket, "location:update", location)
      assert_reply ref, :ok

      # Verify broadcast
      assert_broadcast "location:new", %{
        driver_id: @driver_id,
        lat: -29.8587,
        lng: 31.0218
      }
    end

    test "missing coordinates are rejected", %{socket: socket} do
      ref = push(socket, "location:update", %{"speed" => 45})
      assert_reply ref, :error, %{reason: "missing_coordinates"}
    end

    test "invalid latitude is rejected", %{socket: socket} do
      location = %{"lat" => 91.0, "lng" => 31.0}
      ref = push(socket, "location:update", location)
      assert_reply ref, :error, %{reason: "invalid_latitude"}
    end

    test "invalid longitude is rejected", %{socket: socket} do
      location = %{"lat" => -29.0, "lng" => 181.0}
      ref = push(socket, "location:update", location)
      assert_reply ref, :error, %{reason: "invalid_longitude"}
    end
  end

  # ---------------------------------------------------------------------------
  # Status update tests
  # ---------------------------------------------------------------------------

  describe "handle_in status:update" do
    setup do
      token = generate_test_token(@driver_token_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, DriverChannel, "driver:#{@driver_id}", %{
          "zone" => "KZN-North"
        })

      %{socket: socket}
    end

    test "driver can update their status", %{socket: socket} do
      ref = push(socket, "status:update", %{"status" => "idle"})
      assert_reply ref, :ok

      assert_broadcast "status:changed", %{
        driver_id: @driver_id,
        status: "idle"
      }
    end
  end

  # ---------------------------------------------------------------------------
  # Shift end tests
  # ---------------------------------------------------------------------------

  describe "handle_in shift:end" do
    setup do
      token = generate_test_token(@driver_token_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, DriverChannel, "driver:#{@driver_id}", %{
          "zone" => "KZN-North"
        })

      %{socket: socket}
    end

    test "driver can end their shift", %{socket: socket} do
      ref = push(socket, "shift:end", %{})
      assert_reply ref, :ok

      assert_broadcast "shift:ended", %{driver_id: @driver_id}
    end
  end

  # ---------------------------------------------------------------------------
  # Read-only monitoring tests
  # ---------------------------------------------------------------------------

  describe "ops monitoring (read-only)" do
    setup do
      token = generate_test_token(@ops_token_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, DriverChannel, "driver:#{@driver_id}", %{})

      %{socket: socket}
    end

    test "ops cannot push location updates", %{socket: socket} do
      location = %{"lat" => -29.8587, "lng" => 31.0218}
      ref = push(socket, "location:update", location)
      assert_reply ref, :error, %{reason: "read_only"}
    end

    test "ops cannot update status", %{socket: socket} do
      ref = push(socket, "status:update", %{"status" => "idle"})
      assert_reply ref, :error, %{reason: "read_only"}
    end
  end
end
