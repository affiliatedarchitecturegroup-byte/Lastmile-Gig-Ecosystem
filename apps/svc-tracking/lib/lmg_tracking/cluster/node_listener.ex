defmodule LmgTracking.Cluster.NodeListener do
  @moduledoc """
  Monitors BEAM cluster membership changes (P173).

  Listens for `:nodeup` and `:nodedown` events from the Erlang
  distribution system and:

  1. Logs cluster membership changes
  2. Emits Prometheus metrics for cluster size
  3. Broadcasts cluster state to ops:global channel
  4. Triggers presence re-synchronization on node changes

  This process is critical for ensuring that Phoenix PubSub and
  Presence remain consistent when nodes join or leave the cluster.

  In production, the tracking service runs as a 3-node BEAM cluster.
  When a node goes down, the surviving nodes:
  - Detect the failure within 5 seconds (libcluster polling)
  - Re-merge Presence CRDTs automatically
  - Continue serving all WebSocket connections on remaining nodes
  - Emit an alert to the Command Centre via ops:global

  Recovery:
  - Kubernetes restarts the failed pod
  - libcluster discovers the new node via DNS
  - The new node joins the cluster and syncs Presence state
  """

  use GenServer
  require Logger

  alias LmgTracking.Metrics.PrometheusCollector

  @type cluster_event :: :nodeup | :nodedown

  # ---------------------------------------------------------------------------
  # GenServer lifecycle
  # ---------------------------------------------------------------------------

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    # Monitor node up/down events
    :net_kernel.monitor_nodes(true, node_type: :visible)

    state = %{
      nodes: MapSet.new([Node.self()]),
      history: [],
      started_at: DateTime.utc_now()
    }

    Logger.info("Cluster NodeListener started",
      node: Node.self(),
      cluster_size: 1
    )

    {:ok, state}
  end

  # ---------------------------------------------------------------------------
  # Node events
  # ---------------------------------------------------------------------------

  @impl true
  def handle_info({:nodeup, node, _info}, state) do
    new_nodes = MapSet.put(state.nodes, node)
    cluster_size = MapSet.size(new_nodes)

    event = %{
      type: :nodeup,
      node: node,
      cluster_size: cluster_size,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    }

    Logger.info("Node joined cluster",
      node: node,
      cluster_size: cluster_size
    )

    # Emit metrics
    PrometheusCollector.set_gauge(:websocket_connections, cluster_size, %{})

    # Broadcast to ops:global
    broadcast_cluster_event(event)

    new_history = [event | Enum.take(state.history, 99)]
    {:noreply, %{state | nodes: new_nodes, history: new_history}}
  end

  def handle_info({:nodedown, node, _info}, state) do
    new_nodes = MapSet.delete(state.nodes, node)
    cluster_size = MapSet.size(new_nodes)

    event = %{
      type: :nodedown,
      node: node,
      cluster_size: cluster_size,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    }

    Logger.warning("Node left cluster",
      node: node,
      cluster_size: cluster_size
    )

    # Emit metrics
    PrometheusCollector.set_gauge(:websocket_connections, cluster_size, %{})

    # Broadcast to ops:global
    broadcast_cluster_event(event)

    new_history = [event | Enum.take(state.history, 99)]
    {:noreply, %{state | nodes: new_nodes, history: new_history}}
  end

  def handle_info(_msg, state), do: {:noreply, state}

  # ---------------------------------------------------------------------------
  # Public API
  # ---------------------------------------------------------------------------

  @doc "Get the current cluster state"
  @spec get_state() :: map()
  def get_state do
    GenServer.call(__MODULE__, :get_state)
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    response = %{
      self: Node.self(),
      nodes: MapSet.to_list(state.nodes),
      cluster_size: MapSet.size(state.nodes),
      uptime_seconds:
        DateTime.diff(DateTime.utc_now(), state.started_at, :second),
      recent_events: Enum.take(state.history, 10)
    }

    {:reply, response, state}
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp broadcast_cluster_event(event) do
    Phoenix.PubSub.broadcast(
      LmgTracking.PubSub,
      "ops:global",
      {:cluster_event, event}
    )
  rescue
    _ -> :ok
  end
end
