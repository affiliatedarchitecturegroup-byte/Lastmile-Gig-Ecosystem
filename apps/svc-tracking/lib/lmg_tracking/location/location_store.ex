defmodule LmgTracking.Location.LocationStore do
  @moduledoc """
  High-level location storage and retrieval for the tracking service.

  Wraps Redis operations with business logic for:
  - Storing and retrieving driver locations
  - Maintaining location history (last N updates)
  - Zone-based driver discovery
  - Batch location queries for Command Centre
  - Location analytics (speed, direction, activity)

  All location data is ephemeral (Redis with TTL). Persistent location
  history is written to Kafka for downstream analytics processing.

  Key patterns (per DEVELOPMENT_DIRECTIVES.md Section 10):
  - `lmg:tracking:driver:{id}:location` - Current GPS (TTL: 60s)
  - `lmg:tracking:driver:{id}:history` - Last 10 positions (list, TTL: 5min)
  - `lmg:tracking:zone:{zone}:drivers` - Active drivers in zone (set)
  - `lmg:tracking:order:{id}:driver` - Order-to-driver mapping (TTL: 4h)
  """

  require Logger

  alias LmgTracking.Redis.Pool, as: RedisPool
  alias LmgTracking.Location.GeoUtils

  @history_key_prefix "lmg:tracking:driver"
  @history_max_entries 10
  @history_ttl_seconds 300

  @type location :: %{
          lat: float(),
          lng: float(),
          speed: number(),
          heading: number(),
          zone: String.t(),
          timestamp: non_neg_integer()
        }

  @type driver_summary :: %{
          driver_id: String.t(),
          location: location() | nil,
          zone: String.t(),
          status: String.t(),
          speed: number()
        }

  # ---------------------------------------------------------------------------
  # Single driver operations
  # ---------------------------------------------------------------------------

  @doc """
  Store a driver's location update and add to history.
  """
  @spec store_location(String.t(), float(), float(), map()) :: :ok | {:error, term()}
  def store_location(driver_id, lat, lng, metadata \\ %{}) do
    zone = GeoUtils.determine_zone({lat, lng})

    # Store current location
    RedisPool.set_driver_location(driver_id, lat, lng, Map.put(metadata, :zone, zone))

    # Append to history list
    history_entry =
      Jason.encode!(%{
        lat: lat,
        lng: lng,
        speed: Map.get(metadata, :speed, 0),
        heading: Map.get(metadata, :heading, 0),
        zone: zone,
        ts: DateTime.utc_now() |> DateTime.to_unix(:millisecond)
      })

    history_key = "#{@history_key_prefix}:#{driver_id}:history"

    RedisPool.pipeline([
      ["LPUSH", history_key, history_entry],
      ["LTRIM", history_key, "0", to_string(@history_max_entries - 1)],
      ["EXPIRE", history_key, to_string(@history_ttl_seconds)]
    ])

    :ok
  end

  @doc """
  Get a driver's current location.
  """
  @spec get_current_location(String.t()) :: {:ok, location() | nil} | {:error, term()}
  def get_current_location(driver_id) do
    RedisPool.get_driver_location(driver_id)
  end

  @doc """
  Get a driver's recent location history (last N positions).
  """
  @spec get_location_history(String.t(), pos_integer()) :: {:ok, list(location())} | {:error, term()}
  def get_location_history(driver_id, count \\ @history_max_entries) do
    history_key = "#{@history_key_prefix}:#{driver_id}:history"

    case RedisPool.command(["LRANGE", history_key, "0", to_string(count - 1)]) do
      {:ok, entries} when is_list(entries) ->
        locations =
          entries
          |> Enum.map(&Jason.decode!/1)
          |> Enum.map(fn entry ->
            %{
              lat: entry["lat"],
              lng: entry["lng"],
              speed: entry["speed"],
              heading: entry["heading"],
              zone: entry["zone"],
              timestamp: entry["ts"]
            }
          end)

        {:ok, locations}

      {:ok, _} ->
        {:ok, []}

      error ->
        error
    end
  end

  # ---------------------------------------------------------------------------
  # Zone-based queries
  # ---------------------------------------------------------------------------

  @doc """
  Get all active drivers in a specific zone with their locations.
  """
  @spec get_zone_drivers_with_locations(String.t()) :: {:ok, list(driver_summary())} | {:error, term()}
  def get_zone_drivers_with_locations(zone_id) do
    case RedisPool.get_zone_drivers(zone_id) do
      {:ok, driver_ids} when is_list(driver_ids) ->
        summaries =
          driver_ids
          |> Enum.map(fn driver_id ->
            location =
              case RedisPool.get_driver_location(driver_id) do
                {:ok, loc} -> loc
                _ -> nil
              end

            %{
              driver_id: driver_id,
              location: location,
              zone: zone_id,
              status: "active",
              speed: (location && location["speed"]) || 0
            }
          end)
          |> Enum.filter(fn summary -> summary.location != nil end)

        {:ok, summaries}

      {:ok, _} ->
        {:ok, []}

      error ->
        error
    end
  end

  @doc """
  Get all active drivers across all zones.

  Used by the Command Centre for the global operations view.
  """
  @spec get_all_active_drivers() :: {:ok, list(driver_summary())} | {:error, term()}
  def get_all_active_drivers do
    zones = ["KZN-North", "KZN-South", "Gauteng", "WC", "EC", "Other"]

    results =
      zones
      |> Enum.map(fn zone ->
        case get_zone_drivers_with_locations(zone) do
          {:ok, drivers} -> drivers
          _ -> []
        end
      end)
      |> List.flatten()

    {:ok, results}
  end

  @doc """
  Get driver count by zone for dashboard metrics.
  """
  @spec get_zone_counts() :: {:ok, map()} | {:error, term()}
  def get_zone_counts do
    zones = ["KZN-North", "KZN-South", "Gauteng", "WC", "EC", "Other"]

    counts =
      zones
      |> Enum.map(fn zone ->
        count =
          case RedisPool.get_zone_drivers(zone) do
            {:ok, drivers} when is_list(drivers) -> length(drivers)
            _ -> 0
          end

        {zone, count}
      end)
      |> Map.new()

    {:ok, counts}
  end

  # ---------------------------------------------------------------------------
  # Order-driver mapping
  # ---------------------------------------------------------------------------

  @doc "Assign a driver to an order for tracking"
  @spec assign_driver_to_order(String.t(), String.t()) :: :ok | {:error, term()}
  def assign_driver_to_order(order_id, driver_id) do
    RedisPool.set_order_driver(order_id, driver_id)
  end

  @doc "Get the driver assigned to an order"
  @spec get_assigned_driver(String.t()) :: {:ok, String.t() | nil} | {:error, term()}
  def get_assigned_driver(order_id) do
    RedisPool.get_order_driver(order_id)
  end

  # ---------------------------------------------------------------------------
  # Analytics helpers
  # ---------------------------------------------------------------------------

  @doc """
  Calculate a driver's average speed over their recent history.
  """
  @spec average_speed(String.t()) :: {:ok, float()} | {:error, term()}
  def average_speed(driver_id) do
    case get_location_history(driver_id) do
      {:ok, []} ->
        {:ok, 0.0}

      {:ok, history} ->
        speeds = Enum.map(history, fn loc -> loc.speed || 0 end)
        avg = Enum.sum(speeds) / max(length(speeds), 1)
        {:ok, Float.round(avg, 1)}

      error ->
        error
    end
  end

  @doc """
  Calculate total distance traveled by a driver in their recent history.
  """
  @spec distance_traveled(String.t()) :: {:ok, float()} | {:error, term()}
  def distance_traveled(driver_id) do
    case get_location_history(driver_id) do
      {:ok, history} when length(history) >= 2 ->
        distance =
          history
          |> Enum.chunk_every(2, 1, :discard)
          |> Enum.map(fn [a, b] ->
            GeoUtils.haversine_distance({a.lat, a.lng}, {b.lat, b.lng})
          end)
          |> Enum.sum()

        {:ok, Float.round(distance, 1)}

      {:ok, _} ->
        {:ok, 0.0}

      error ->
        error
    end
  end
end
