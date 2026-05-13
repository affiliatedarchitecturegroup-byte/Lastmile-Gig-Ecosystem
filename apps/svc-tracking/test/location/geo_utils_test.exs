defmodule LmgTracking.Location.GeoUtilsTest do
  @moduledoc """
  Tests for geographic utility functions.

  Uses known South African coordinates for realistic test scenarios.
  """

  use ExUnit.Case, async: true

  alias LmgTracking.Location.GeoUtils

  # Known SA locations
  @durban_city_hall {-29.8587, 31.0218}
  @umhlanga {-29.7230, 31.0840}
  @ballito {-29.5390, 31.2130}
  @johannesburg {-26.2041, 28.0473}
  @cape_town {-33.9249, 18.4241}

  # ---------------------------------------------------------------------------
  # Haversine distance tests
  # ---------------------------------------------------------------------------

  describe "haversine_distance/2" do
    test "distance between same point is zero" do
      assert GeoUtils.haversine_distance(@durban_city_hall, @durban_city_hall) == 0.0
    end

    test "Durban to Umhlanga is approximately 16km" do
      distance = GeoUtils.haversine_distance(@durban_city_hall, @umhlanga)
      # Should be approximately 16,000 meters (16km)
      assert distance > 14_000
      assert distance < 18_000
    end

    test "Durban to Johannesburg is approximately 570km" do
      distance = GeoUtils.haversine_distance(@durban_city_hall, @johannesburg)
      assert distance > 550_000
      assert distance < 590_000
    end

    test "Durban to Cape Town is approximately 1,250km" do
      distance = GeoUtils.haversine_distance(@durban_city_hall, @cape_town)
      assert distance > 1_200_000
      assert distance < 1_300_000
    end

    test "short distance (50m)" do
      # Two points roughly 50m apart
      point_a = {-29.8587, 31.0218}
      point_b = {-29.85825, 31.0218}
      distance = GeoUtils.haversine_distance(point_a, point_b)
      assert distance > 40
      assert distance < 60
    end
  end

  # ---------------------------------------------------------------------------
  # Bearing tests
  # ---------------------------------------------------------------------------

  describe "bearing/2" do
    test "bearing north" do
      south = {-30.0, 31.0}
      north = {-29.0, 31.0}
      bearing = GeoUtils.bearing(south, north)
      # Should be approximately 0 degrees (north)
      assert bearing < 5 or bearing > 355
    end

    test "bearing east" do
      west = {-29.0, 30.0}
      east = {-29.0, 31.0}
      bearing = GeoUtils.bearing(west, east)
      # Should be approximately 90 degrees (east)
      assert bearing > 85 and bearing < 95
    end

    test "bearing south" do
      north = {-29.0, 31.0}
      south = {-30.0, 31.0}
      bearing = GeoUtils.bearing(north, south)
      # Should be approximately 180 degrees (south)
      assert bearing > 175 and bearing < 185
    end
  end

  # ---------------------------------------------------------------------------
  # Speed estimation tests
  # ---------------------------------------------------------------------------

  describe "estimate_speed/4" do
    test "calculates speed correctly" do
      # Two points ~1km apart, 60 seconds apart = ~60 km/h
      point_a = {-29.8587, 31.0218}
      point_b = {-29.8497, 31.0218}
      ts_a = 1_000_000
      ts_b = 1_060_000

      speed = GeoUtils.estimate_speed(point_a, point_b, ts_a, ts_b)
      assert speed > 50.0
      assert speed < 70.0
    end

    test "returns 0 for zero time difference" do
      assert GeoUtils.estimate_speed({0, 0}, {1, 1}, 1000, 1000) == 0.0
    end
  end

  # ---------------------------------------------------------------------------
  # Geofence tests
  # ---------------------------------------------------------------------------

  describe "within_geofence?/3" do
    test "point inside geofence" do
      center = @durban_city_hall
      nearby = {-29.8590, 31.0220}
      assert GeoUtils.within_geofence?(nearby, center, 100.0) == true
    end

    test "point outside geofence" do
      center = @durban_city_hall
      far_away = @umhlanga
      assert GeoUtils.within_geofence?(far_away, center, 100.0) == false
    end

    test "point exactly at center" do
      assert GeoUtils.within_geofence?(@durban_city_hall, @durban_city_hall, 1.0) == true
    end
  end

  # ---------------------------------------------------------------------------
  # Drift detection tests
  # ---------------------------------------------------------------------------

  describe "detect_drift/3" do
    test "normal movement is ok" do
      prev = {-29.8587, 31.0218}
      new = {-29.8590, 31.0220}
      assert {:ok, _distance} = GeoUtils.detect_drift(prev, new, 5_000)
    end

    test "large jump is flagged as drift" do
      prev = @durban_city_hall
      new = @johannesburg
      assert {:drift, _distance} = GeoUtils.detect_drift(prev, new, 5_000)
    end
  end

  # ---------------------------------------------------------------------------
  # Zone determination tests
  # ---------------------------------------------------------------------------

  describe "determine_zone/1" do
    test "Umhlanga is KZN-North" do
      assert GeoUtils.determine_zone(@umhlanga) == "KZN-North"
    end

    test "Johannesburg is Gauteng" do
      assert GeoUtils.determine_zone(@johannesburg) == "Gauteng"
    end

    test "Cape Town is WC" do
      assert GeoUtils.determine_zone(@cape_town) == "WC"
    end

    test "unknown location returns Other" do
      assert GeoUtils.determine_zone({0.0, 0.0}) == "Other"
    end
  end
end
