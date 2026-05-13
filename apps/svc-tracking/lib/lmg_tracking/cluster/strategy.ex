defmodule LmgTracking.Cluster.Strategy do
  @moduledoc """
  BEAM cluster configuration for the Lastmile Gig Tracking Service (P173).

  Supports multiple clustering strategies based on deployment environment:

  - **Development**: No clustering (single node)
  - **Docker Compose**: Erlang epmd-based discovery
  - **Kubernetes (Production)**: Kubernetes DNS-based discovery via libcluster

  In production (EKS), the tracking service runs as a 3-node BEAM cluster
  with a headless Kubernetes Service for DNS-based node discovery. This
  enables Phoenix PubSub to distribute channel messages across all nodes,
  ensuring that a customer connected to Node A can receive driver location
  updates from a driver connected to Node B.

  Cluster topology configuration is set in:
  - `config/prod.exs` (static topology definition)
  - `config/runtime.exs` (dynamic values from env vars)

  Node naming convention:
  - `lmg_tracking@{pod-ip}` (Kubernetes)
  - `lmg_tracking@{hostname}` (Docker Compose)

  Health monitoring:
  - libcluster emits `:nodeup` / `:nodedown` events
  - Custom NodeListener process monitors cluster membership
  - Prometheus metrics for cluster size and node events
  """

  require Logger

  @doc """
  Build the libcluster topology configuration for the current environment.

  Returns a keyword list suitable for passing to Cluster.Supervisor.
  """
  @spec build_topology(atom()) :: keyword()
  def build_topology(:prod) do
    namespace = System.get_env("LMG_K8S_NAMESPACE") || "lmg-realtime"
    service_name = System.get_env("LMG_K8S_SERVICE") || "svc-tracking-headless"
    app_name = System.get_env("LMG_APP_NAME") || "lmg_tracking"
    polling_interval = String.to_integer(System.get_env("LMG_CLUSTER_POLL_MS") || "5000")

    [
      k8s_dns: [
        strategy: Cluster.Strategy.Kubernetes.DNS,
        config: [
          service: service_name,
          application_name: app_name,
          namespace: namespace,
          polling_interval: polling_interval
        ]
      ]
    ]
  end

  def build_topology(:staging) do
    # Staging uses the same Kubernetes DNS strategy
    build_topology(:prod)
  end

  def build_topology(:dev) do
    # In development with Docker Compose, use epmd strategy
    case System.get_env("LMG_CLUSTER_NODES") do
      nil ->
        []

      nodes_str ->
        nodes =
          nodes_str
          |> String.split(",")
          |> Enum.map(&String.trim/1)
          |> Enum.map(&String.to_atom/1)

        [
          epmd: [
            strategy: Cluster.Strategy.Epmd,
            config: [hosts: nodes]
          ]
        ]
    end
  end

  def build_topology(_env), do: []

  @doc """
  Get the current cluster nodes (including self).
  """
  @spec cluster_nodes() :: list(node())
  def cluster_nodes do
    [Node.self() | Node.list()]
  end

  @doc """
  Get the cluster size.
  """
  @spec cluster_size() :: pos_integer()
  def cluster_size do
    length(cluster_nodes())
  end

  @doc """
  Check if the cluster is healthy (minimum expected nodes).
  """
  @spec cluster_healthy?(pos_integer()) :: boolean()
  def cluster_healthy?(min_nodes \\ 1) do
    cluster_size() >= min_nodes
  end
end
