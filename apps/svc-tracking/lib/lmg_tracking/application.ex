defmodule LmgTracking.Application do
  @moduledoc """
  OTP Application for the Lastmile Gig Real-Time Tracking Service.

  Supervises:
  - Phoenix Endpoint (WebSocket connections)
  - Phoenix PubSub (inter-node message passing)
  - Redis connection pool (location state storage)
  - Presence tracker (driver online status)
  - Telemetry supervisor (metrics collection)
  - Cluster supervisor (BEAM node clustering via libcluster)

  Scale target: 10,000+ concurrent WebSocket connections per node.
  BEAM VM handles this with <2MB RAM per 10k connections.
  """

  use Application
  require Logger

  @impl true
  def start(_type, _args) do
    # Configure OpenTelemetry Phoenix instrumentation
    OpentelemetryPhoenix.setup(adapter: :bandit)

    children = [
      # Telemetry supervisor - must start before endpoint
      LmgTrackingWeb.Telemetry,

      # PubSub for distributed channel messaging
      {Phoenix.PubSub, name: LmgTracking.PubSub},

      # Redis connection pool for location state
      {LmgTracking.Redis.Pool, redis_config()},

      # Presence tracker for driver online/offline status
      LmgTracking.Presence,

      # Prometheus metrics collector
      LmgTracking.Metrics.PrometheusCollector,

      # Phoenix endpoint (WebSocket + HTTP)
      LmgTrackingWeb.Endpoint,

      # Cluster supervisor (libcluster for BEAM node discovery)
      cluster_supervisor()
    ]
    |> Enum.reject(&is_nil/1)

    opts = [strategy: :one_for_one, name: LmgTracking.Supervisor]

    Logger.info("Starting LmgTracking Application on port #{tracking_port()}")
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    LmgTrackingWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp redis_config do
    Application.get_env(:lmg_tracking, :redis, [])
  end

  defp tracking_port do
    case Application.get_env(:lmg_tracking, LmgTrackingWeb.Endpoint) do
      nil -> 7000
      config -> get_in(config, [:http, :port]) || 7000
    end
  end

  defp cluster_supervisor do
    topologies = Application.get_env(:libcluster, :topologies, [])

    case topologies do
      [] -> nil
      _ -> {Cluster.Supervisor, [topologies, [name: LmgTracking.ClusterSupervisor]]}
    end
  end
end
