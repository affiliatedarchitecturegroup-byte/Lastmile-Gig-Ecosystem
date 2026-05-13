defmodule SvcTracking.Application do
  @moduledoc """
  OTP Application module for the Real-Time Tracking Service.

  Starts the Phoenix endpoint, PubSub, Redix connection pool,
  Broadway Kafka consumers, and libcluster for BEAM clustering.

  Scale target: 10,000 concurrent WebSocket connections per node.
  BEAM VM handles this with <2MB RAM per 10k connections.

  See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
  """
  use Application

  @impl true
  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies, [])

    children = [
      # Cluster supervisor for multi-node BEAM clustering
      {Cluster.Supervisor, [topologies, [name: SvcTracking.ClusterSupervisor]]},

      # PubSub for channel message broadcasting
      {Phoenix.PubSub, name: SvcTracking.PubSub},

      # Redis connection pool for ephemeral location state
      {Redix, {redis_url(), [name: :tracking_redis]}},

      # Broadway Kafka consumer for location events
      {SvcTracking.Broadway.LocationConsumer, []},

      # Telemetry supervisor
      SvcTracking.Telemetry,

      # Phoenix HTTP/WebSocket endpoint (must be last)
      SvcTrackingWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: SvcTracking.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    SvcTrackingWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp redis_url do
    System.get_env("LMG_UPSTASH_REDIS_URL") || "redis://localhost:6379"
  end
end
