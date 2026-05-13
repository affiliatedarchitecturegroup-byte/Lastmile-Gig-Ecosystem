defmodule LmgTrackingWeb.OpsChannelTest do
  @moduledoc """
  Tests for the Command Centre operations channel.

  Covers:
  - Channel join authorization (ops, admin, unauthorized)
  - Zone summary requests
  - Zone pause/resume (admin only)
  - Driver history requests
  """

  use LmgTrackingWeb.ChannelCase

  alias LmgTrackingWeb.OpsChannel

  @ops_claims %{
    "sub" => "ops-user-001",
    "role" => "OPS_STAFF",
    "email" => "ops@test.lastmilegig.aagais.co.za"
  }

  @admin_claims %{
    "sub" => "admin-001",
    "role" => "ADMIN",
    "email" => "admin@test.lastmilegig.aagais.co.za"
  }

  @driver_claims %{
    "sub" => "driver-001",
    "role" => "DRIVER",
    "email" => "driver@test.lastmilegig.aagais.co.za"
  }

  @customer_claims %{
    "sub" => "customer-001",
    "role" => "CUSTOMER",
    "email" => "customer@test.lastmilegig.aagais.co.za"
  }

  # ---------------------------------------------------------------------------
  # Join tests
  # ---------------------------------------------------------------------------

  describe "join/3" do
    test "OPS_STAFF can join ops:global channel" do
      token = generate_test_token(@ops_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, OpsChannel, "ops:global", %{})

      assert reply.status == "monitoring"
      assert reply.role == "OPS_STAFF"
    end

    test "ADMIN can join ops:global channel" do
      token = generate_test_token(@admin_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, OpsChannel, "ops:global", %{})

      assert reply.status == "monitoring"
      assert reply.role == "ADMIN"
    end

    test "DRIVER cannot join ops channel" do
      token = generate_test_token(@driver_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(socket, OpsChannel, "ops:global", %{})
    end

    test "CUSTOMER cannot join ops channel" do
      token = generate_test_token(@customer_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(socket, OpsChannel, "ops:global", %{})
    end
  end

  # ---------------------------------------------------------------------------
  # Zone control tests
  # ---------------------------------------------------------------------------

  describe "zone:pause (admin only)" do
    test "ADMIN can pause a zone" do
      token = generate_test_token(@admin_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OpsChannel, "ops:global", %{})

      ref =
        push(socket, "zone:pause", %{
          "zone" => "KZN-North",
          "reason" => "Weather emergency"
        })

      assert_reply ref, :ok
      assert_broadcast "zone:paused", %{zone: "KZN-North", reason: "Weather emergency"}
    end

    test "OPS_STAFF cannot pause a zone" do
      token = generate_test_token(@ops_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OpsChannel, "ops:global", %{})

      ref =
        push(socket, "zone:pause", %{
          "zone" => "KZN-North",
          "reason" => "Test"
        })

      assert_reply ref, :error, %{reason: "admin_required"}
    end
  end

  describe "zone:resume (admin only)" do
    test "ADMIN can resume a zone" do
      token = generate_test_token(@admin_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OpsChannel, "ops:global", %{})

      ref = push(socket, "zone:resume", %{"zone" => "KZN-North"})
      assert_reply ref, :ok
      assert_broadcast "zone:resumed", %{zone: "KZN-North"}
    end
  end

  # ---------------------------------------------------------------------------
  # Data request tests
  # ---------------------------------------------------------------------------

  describe "zone:request_summary" do
    test "ops user can request zone summary" do
      token = generate_test_token(@ops_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OpsChannel, "ops:global", %{})

      ref = push(socket, "zone:request_summary", %{})
      assert_reply ref, :ok
    end
  end

  describe "drivers:request_all" do
    test "ops user can request all active drivers" do
      token = generate_test_token(@ops_claims)
      {:ok, socket} = connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, OpsChannel, "ops:global", %{})

      ref = push(socket, "drivers:request_all", %{})
      assert_reply ref, :ok
    end
  end
end
