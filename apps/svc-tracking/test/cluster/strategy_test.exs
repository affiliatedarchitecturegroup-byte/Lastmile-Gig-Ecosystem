defmodule LmgTracking.Cluster.StrategyTest do
  @moduledoc """
  Tests for cluster topology strategy configuration (P173).
  """

  use ExUnit.Case, async: true

  alias LmgTracking.Cluster.Strategy

  describe "build_topology/1" do
    test "dev returns empty topology by default" do
      assert Strategy.build_topology(:dev) == []
    end

    test "prod returns Kubernetes DNS strategy" do
      topology = Strategy.build_topology(:prod)
      assert Keyword.has_key?(topology, :k8s_dns)

      config = topology[:k8s_dns][:config]
      assert config[:application_name] == "lmg_tracking"
    end

    test "unknown env returns empty topology" do
      assert Strategy.build_topology(:unknown) == []
    end
  end

  describe "cluster_nodes/0" do
    test "includes self node" do
      nodes = Strategy.cluster_nodes()
      assert Node.self() in nodes
    end
  end

  describe "cluster_size/0" do
    test "returns at least 1 (self)" do
      assert Strategy.cluster_size() >= 1
    end
  end

  describe "cluster_healthy?/1" do
    test "healthy with min 1 node" do
      assert Strategy.cluster_healthy?(1)
    end

    test "not healthy if requiring more nodes than available" do
      refute Strategy.cluster_healthy?(100)
    end
  end
end
