defmodule LmgTracking.Location.GeoUtils do
  @moduledoc """
  Geographic utility functions for the Lastmile Gig Tracking Service.

  Provides:
  - Haversine distance calculation between GPS coordinates
  - Bearing calculation between two points
  - Speed estimation from sequential location updates
  - Geo-fence containment checks
  - Drift anomaly detection (sudden large movements)

  All calculations use the WGS84 Earth radius (6,371 km).
  Coordinates use decimal degrees (latitude, longitude).
  """

  @earth_radius_km 6_371.0
  @earth_radius_m 6_371_000.0
  @pi :math.pi()

  @type coordinate :: {float(), float()}

  # ---------------------------------------------------------------------------
  # Distance calculations
  # ---------------------------------------------------------------------------

  @doc """
  Calculate the distance between two GPS coordinates using the Haversine formula.

  Returns distance in meters.

  ## Examples

      iex> LmgTracking.Location.GeoUtils.haversine_distance(
      ...>   {-29.8587, 31.0218},  # Durban
      ...>   {-29.8400, 31.0300}   # Nearby point
      ...> )
      2_187.42  # approximately

  """
  @spec haversine_distance(coordinate(), coordinate()) :: float()
  def haversine_distance({lat1, lng1}, {lat2, lng2}) do
    d_lat = deg_to_rad(lat2 - lat1)
    d_lng = deg_to_rad(lng2 - lng1)

    a =
      :math.sin(d_lat / 2) * :math.sin(d_lat / 2) +
        :math.cos(deg_to_rad(lat1)) * :math.cos(deg_to_rad(lat2)) *
          :math.sin(d_lng / 2) * :math.sin(d_lng / 2)

    c = 2 * :math.atan2(:math.sqrt(a), :math.sqrt(1 - a))

    @earth_radius_m * c
  end

  @doc """
  Calculate the bearing (direction) from point A to point B.

  Returns bearing in degrees (0-360, where 0 = North, 90 = East).
  """
  @spec bearing(coordinate(), coordinate()) :: float()
  def bearing({lat1, lng1}, {lat2, lng2}) do
    d_lng = deg_to_rad(lng2 - lng1)
    lat1_rad = deg_to_rad(lat1)
    lat2_rad = deg_to_rad(lat2)

    y = :math.sin(d_lng) * :math.cos(lat2_rad)

    x =
      :math.cos(lat1_rad) * :math.sin(lat2_rad) -
        :math.sin(lat1_rad) * :math.cos(lat2_rad) * :math.cos(d_lng)

    bearing_rad = :math.atan2(y, x)
    bearing_deg = rad_to_deg(bearing_rad)

    # Normalize to 0-360
    rem_float(bearing_deg + 360, 360)
  end

  @doc """
  Estimate speed between two location updates.

  Returns speed in km/h.
  """
  @spec estimate_speed(coordinate(), coordinate(), non_neg_integer(), non_neg_integer()) :: float()
  def estimate_speed(coord1, coord2, timestamp1_ms, timestamp2_ms) do
    distance_m = haversine_distance(coord1, coord2)
    time_diff_s = abs(timestamp2_ms - timestamp1_ms) / 1_000

    if time_diff_s > 0 do
      # Convert m/s to km/h
      distance_m / time_diff_s * 3.6
    else
      0.0
    end
  end

  @doc """
  Check if a coordinate is within a circular geo-fence.

  Returns `true` if the point is within `radius_m` meters of the center.
  """
  @spec within_geofence?(coordinate(), coordinate(), float()) :: boolean()
  def within_geofence?(point, center, radius_m) do
    haversine_distance(point, center) <= radius_m
  end

  @doc """
  Detect if a location update represents an anomalous drift.

  A drift is considered anomalous if the distance between two consecutive
  updates exceeds the configured `max_drift_meters` threshold. This can
  indicate GPS spoofing, device malfunction, or fraudulent location data.

  Returns `{:ok, distance_m}` if normal, `{:drift, distance_m}` if anomalous.
  """
  @spec detect_drift(coordinate(), coordinate(), float()) ::
          {:ok, float()} | {:drift, float()}
  def detect_drift(prev_coord, new_coord, max_drift_m) do
    distance = haversine_distance(prev_coord, new_coord)

    if distance > max_drift_m do
      {:drift, distance}
    else
      {:ok, distance}
    end
  end

  @doc """
  Determine which delivery zone a coordinate falls into.

  Zone definitions for South African regions:
  - KZN-North: Durban north, Umhlanga, Ballito corridor
  - KZN-South: Durban south, Amanzimtoti, Scottburgh
  - Gauteng: Johannesburg, Pretoria, Ekurhuleni metro
  - WC: Cape Town metro area
  - EC: Port Elizabeth, East London

  Returns zone identifier string.
  """
  @spec determine_zone(coordinate()) :: String.t()
  def determine_zone({lat, lng}) do
    cond do
      # KZN-North: roughly Durban north to Ballito
      lat >= -29.90 and lat <= -29.40 and lng >= 30.80 and lng <= 31.20 ->
        "KZN-North"

      # KZN-South: roughly Durban south to Scottburgh
      lat >= -30.30 and lat < -29.90 and lng >= 30.60 and lng <= 31.10 ->
        "KZN-South"

      # Gauteng: Johannesburg/Pretoria metro
      lat >= -26.50 and lat <= -25.50 and lng >= 27.80 and lng <= 28.60 ->
        "Gauteng"

      # Western Cape: Cape Town metro
      lat >= -34.20 and lat <= -33.70 and lng >= 18.30 and lng <= 19.00 ->
        "WC"

      # Eastern Cape: PE / East London
      lat >= -34.00 and lat <= -32.50 and lng >= 25.50 and lng <= 28.00 ->
        "EC"

      true ->
        "Other"
    end
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp deg_to_rad(deg), do: deg * @pi / 180.0
  defp rad_to_deg(rad), do: rad * 180.0 / @pi

  defp rem_float(a, b) when b != 0 do
    a - Float.floor(a / b) * b
  end
end
