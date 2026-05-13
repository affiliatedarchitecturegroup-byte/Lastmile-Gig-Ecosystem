defmodule LmgTracking.Presence do
  @moduledoc """
  Phoenix Presence tracker for the Lastmile Gig Tracking Service.

  Tracks real-time presence of:
  - Drivers (online/offline status, current zone, shift state)
  - Customers (subscribed to order tracking)
  - Ops staff (monitoring Command Centre)

  Uses Phoenix.Presence backed by Phoenix.PubSub for distributed
  presence tracking across BEAM cluster nodes. Each node maintains
  its own CRDT-based presence state that is automatically merged
  across the cluster.

  Zone-based aggregation:
  - Drivers are grouped by zone (KZN-North, KZN-South, Gauteng, WC, etc.)
  - Zone counts are emitted as Prometheus metrics
  - Command Centre receives real-time zone presence updates
  """

  use Phoenix.Presence,
    otp_app: :lmg_tracking,
    pubsub_server: LmgTracking.PubSub

  require Logger

  @type zone_id :: String.t()
  @type driver_meta :: %{
          driver_id: String.t(),
          zone: zone_id(),
          status: String.t(),
          vehicle_type: String.t(),
          shift_started_at: String.t(),
          last_location: map() | nil
        }

  # ---------------------------------------------------------------------------
  # Driver presence helpers
  # ---------------------------------------------------------------------------

  @doc """
  Track a driver joining the tracking system.

  Called when a driver starts their shift and connects to the driver channel.
  """
  @spec track_driver(Phoenix.Socket.t(), String.t(), driver_meta()) ::
          {:ok, String.t()} | {:error, term()}
  def track_driver(socket, driver_id, meta) do
    track(socket, driver_id, %{
      type: :driver,
      driver_id: driver_id,
      zone: Map.get(meta, :zone, "unassigned"),
      status: Map.get(meta, :status, "active"),
      vehicle_type: Map.get(meta, :vehicle_type, "scooter"),
      shift_started_at: DateTime.utc_now() |> DateTime.to_iso8601(),
      last_location: nil,
      online_at: DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end

  @doc """
  Update a driver's presence metadata (e.g., new location, zone change).
  """
  @spec update_driver(Phoenix.Socket.t(), String.t(), map()) ::
          {:ok, String.t()} | {:error, term()}
  def update_driver(socket, driver_id, updates) do
    update(socket, driver_id, fn existing_meta ->
      Map.merge(existing_meta, updates)
    end)
  end

  @doc """
  Get all currently tracked drivers, optionally filtered by zone.
  """
  @spec list_drivers(String.t(), zone_id() | nil) :: list(map())
  def list_drivers(topic, zone \\ nil) do
    presences = list(topic)

    presences
    |> Enum.flat_map(fn {_key, %{metas: metas}} -> metas end)
    |> Enum.filter(fn meta -> meta[:type] == :driver end)
    |> maybe_filter_zone(zone)
  end

  @doc """
  Count active drivers by zone.

  Returns a map like:
  ```elixir
  %{"KZN-North" => 12, "KZN-South" => 8, "Gauteng" => 25}
  ```
  """
  @spec count_drivers_by_zone(String.t()) :: %{zone_id() => non_neg_integer()}
  def count_drivers_by_zone(topic) do
    list(topic)
    |> Enum.flat_map(fn {_key, %{metas: metas}} -> metas end)
    |> Enum.filter(fn meta -> meta[:type] == :driver end)
    |> Enum.group_by(fn meta -> meta[:zone] || "unassigned" end)
    |> Map.new(fn {zone, drivers} -> {zone, length(drivers)} end)
  end

  # ---------------------------------------------------------------------------
  # Customer presence helpers
  # ---------------------------------------------------------------------------

  @doc "Track a customer subscribing to order tracking"
  @spec track_customer(Phoenix.Socket.t(), String.t(), String.t()) ::
          {:ok, String.t()} | {:error, term()}
  def track_customer(socket, user_id, order_id) do
    track(socket, user_id, %{
      type: :customer,
      order_id: order_id,
      subscribed_at: DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end

  # ---------------------------------------------------------------------------
  # Ops presence helpers
  # ---------------------------------------------------------------------------

  @doc "Track an ops user monitoring the Command Centre"
  @spec track_ops_user(Phoenix.Socket.t(), String.t(), String.t()) ::
          {:ok, String.t()} | {:error, term()}
  def track_ops_user(socket, user_id, role) do
    track(socket, user_id, %{
      type: :ops,
      role: role,
      monitoring_since: DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp maybe_filter_zone(drivers, nil), do: drivers

  defp maybe_filter_zone(drivers, zone) do
    Enum.filter(drivers, fn meta -> meta[:zone] == zone end)
  end
end
