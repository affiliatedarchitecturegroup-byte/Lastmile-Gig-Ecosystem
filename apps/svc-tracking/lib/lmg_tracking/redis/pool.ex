defmodule LmgTracking.Redis.Pool do
  @moduledoc """
  Redis connection pool for the Lastmile Gig Tracking Service.

  Manages a pool of Redix connections to Upstash Redis for:
  - Driver location state (ephemeral, TTL-based)
  - Dispatch lock management
  - Active delivery tracking state
  - Rate limiting counters

  Key namespace conventions (per DEVELOPMENT_DIRECTIVES.md):
  - `lmg:tracking:driver:{driver_id}:location`  - Current GPS coordinates
  - `lmg:tracking:driver:{driver_id}:meta`       - Driver metadata (zone, status)
  - `lmg:tracking:order:{order_id}:driver`        - Assigned driver for order
  - `lmg:tracking:zone:{zone_id}:drivers`         - Set of active drivers per zone
  - `lmg:tracking:dispatch:lock:{order_id}`       - Dispatch lock (prevents double-dispatch)
  """

  use Supervisor
  require Logger

  @pool_size_default 10
  @redis_prefix "lmg:tracking"

  def start_link(config) do
    Supervisor.start_link(__MODULE__, config, name: __MODULE__)
  end

  @impl true
  def init(config) do
    pool_size = Keyword.get(config, :pool_size, @pool_size_default)

    children =
      for i <- 0..(pool_size - 1) do
        connection_opts = build_connection_opts(config)
        Supervisor.child_spec({Redix, {connection_opts, [name: :"redis_#{i}"]}}, id: :"redis_#{i}")
      end

    Logger.info("Starting Redis pool with #{pool_size} connections")
    Supervisor.init(children, strategy: :one_for_one)
  end

  # ---------------------------------------------------------------------------
  # Public API
  # ---------------------------------------------------------------------------

  @doc "Ping Redis to verify connectivity"
  @spec ping() :: {:ok, String.t()} | {:error, term()}
  def ping do
    command(["PING"])
  end

  @doc "Execute a Redis command on a random pool connection"
  @spec command(list(String.t())) :: {:ok, term()} | {:error, term()}
  def command(args) do
    pool_size = Application.get_env(:lmg_tracking, :redis)[:pool_size] || @pool_size_default
    index = :rand.uniform(pool_size) - 1
    Redix.command(:"redis_#{index}", args)
  end

  @doc "Execute a Redis pipeline (multiple commands)"
  @spec pipeline(list(list(String.t()))) :: {:ok, list(term())} | {:error, term()}
  def pipeline(commands) do
    pool_size = Application.get_env(:lmg_tracking, :redis)[:pool_size] || @pool_size_default
    index = :rand.uniform(pool_size) - 1
    Redix.pipeline(:"redis_#{index}", commands)
  end

  # ---------------------------------------------------------------------------
  # Location-specific operations
  # ---------------------------------------------------------------------------

  @doc """
  Store a driver's current location in Redis with TTL.
  Location expires after `location_ttl_seconds` (default 60s) if not refreshed.
  """
  @spec set_driver_location(String.t(), float(), float(), map()) :: :ok | {:error, term()}
  def set_driver_location(driver_id, latitude, longitude, metadata \\ %{}) do
    key = "#{@redis_prefix}:driver:#{driver_id}:location"
    ttl = tracking_config(:location_ttl_seconds)

    value = Jason.encode!(%{
      lat: latitude,
      lng: longitude,
      ts: DateTime.utc_now() |> DateTime.to_unix(:millisecond),
      zone: Map.get(metadata, :zone, "unknown"),
      speed: Map.get(metadata, :speed, 0),
      heading: Map.get(metadata, :heading, 0)
    })

    case command(["SETEX", key, to_string(ttl), value]) do
      {:ok, _} -> :ok
      error -> error
    end
  end

  @doc "Get a driver's current location from Redis"
  @spec get_driver_location(String.t()) :: {:ok, map()} | {:ok, nil} | {:error, term()}
  def get_driver_location(driver_id) do
    key = "#{@redis_prefix}:driver:#{driver_id}:location"

    case command(["GET", key]) do
      {:ok, nil} -> {:ok, nil}
      {:ok, value} -> {:ok, Jason.decode!(value)}
      error -> error
    end
  end

  @doc "Add a driver to the active drivers set for a zone"
  @spec add_driver_to_zone(String.t(), String.t()) :: :ok | {:error, term()}
  def add_driver_to_zone(zone_id, driver_id) do
    key = "#{@redis_prefix}:zone:#{zone_id}:drivers"

    case command(["SADD", key, driver_id]) do
      {:ok, _} -> :ok
      error -> error
    end
  end

  @doc "Remove a driver from a zone's active set"
  @spec remove_driver_from_zone(String.t(), String.t()) :: :ok | {:error, term()}
  def remove_driver_from_zone(zone_id, driver_id) do
    key = "#{@redis_prefix}:zone:#{zone_id}:drivers"

    case command(["SREM", key, driver_id]) do
      {:ok, _} -> :ok
      error -> error
    end
  end

  @doc "Get all active drivers in a zone"
  @spec get_zone_drivers(String.t()) :: {:ok, list(String.t())} | {:error, term()}
  def get_zone_drivers(zone_id) do
    key = "#{@redis_prefix}:zone:#{zone_id}:drivers"
    command(["SMEMBERS", key])
  end

  @doc "Map an order to its assigned driver"
  @spec set_order_driver(String.t(), String.t()) :: :ok | {:error, term()}
  def set_order_driver(order_id, driver_id) do
    key = "#{@redis_prefix}:order:#{order_id}:driver"
    # Order-driver mapping expires after 4 hours
    case command(["SETEX", key, "14400", driver_id]) do
      {:ok, _} -> :ok
      error -> error
    end
  end

  @doc "Get the driver assigned to an order"
  @spec get_order_driver(String.t()) :: {:ok, String.t() | nil} | {:error, term()}
  def get_order_driver(order_id) do
    key = "#{@redis_prefix}:order:#{order_id}:driver"
    command(["GET", key])
  end

  @doc "Remove a driver's location and zone membership (on shift end)"
  @spec clear_driver_tracking(String.t(), String.t()) :: :ok
  def clear_driver_tracking(driver_id, zone_id) do
    location_key = "#{@redis_prefix}:driver:#{driver_id}:location"
    meta_key = "#{@redis_prefix}:driver:#{driver_id}:meta"

    pipeline([
      ["DEL", location_key],
      ["DEL", meta_key],
      ["SREM", "#{@redis_prefix}:zone:#{zone_id}:drivers", driver_id]
    ])

    :ok
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp build_connection_opts(config) do
    case Keyword.get(config, :url) do
      nil ->
        host = Keyword.get(config, :host, "localhost")
        port = Keyword.get(config, :port, 6379)
        database = Keyword.get(config, :database, 0)
        "redis://#{host}:#{port}/#{database}"

      url ->
        url
    end
  end

  defp tracking_config(key) do
    config = Application.get_env(:lmg_tracking, :tracking, [])
    Keyword.get(config, key)
  end
end
