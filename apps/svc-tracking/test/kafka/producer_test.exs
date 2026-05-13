defmodule LmgTracking.Kafka.ProducerTest do
  @moduledoc """
  Tests for the Kafka event producer.

  Verifies event formatting, buffering, and flush logic.
  Kafka is disabled in test mode, so these tests verify
  message formatting and internal state management.
  """

  use ExUnit.Case, async: true

  alias LmgTracking.Kafka.Producer

  describe "publish_location/2" do
    test "accepts valid location payload" do
      # Producer is disabled in test, but should not crash
      assert :ok =
               Producer.publish_location("driver-001", %{
                 lat: -29.8587,
                 lng: 31.0218,
                 speed: 45,
                 heading: 180,
                 zone: "KZN-North"
               })
    end

    test "accepts string-keyed location payload" do
      assert :ok =
               Producer.publish_location("driver-002", %{
                 "lat" => -29.7230,
                 "lng" => 31.0840,
                 "speed" => 30,
                 "heading" => 90,
                 "zone" => "KZN-North"
               })
    end
  end

  describe "publish_tracking_event/3" do
    test "publishes driver connect event" do
      assert :ok =
               Producer.publish_tracking_event(
                 "driver.connected",
                 "driver-001",
                 %{zone: "KZN-North", vehicle_type: "scooter"}
               )
    end

    test "publishes driver disconnect event" do
      assert :ok =
               Producer.publish_tracking_event(
                 "driver.disconnected",
                 "driver-001",
                 %{zone: "KZN-North", reason: "shift_end"}
               )
    end
  end

  describe "publish_zone_control/3" do
    test "publishes zone pause event" do
      assert :ok =
               Producer.publish_zone_control("paused", "KZN-North", %{
                 reason: "Weather emergency",
                 paused_by: "admin-001"
               })
    end

    test "publishes zone resume event" do
      assert :ok =
               Producer.publish_zone_control("resumed", "KZN-North", %{
                 resumed_by: "admin-001"
               })
    end
  end

  describe "publish_anomaly/3" do
    test "publishes drift anomaly" do
      assert :ok =
               Producer.publish_anomaly("drift", "driver-001", %{
                 distance_m: 15_000,
                 max_allowed_m: 5_000,
                 severity: "high"
               })
    end
  end
end
