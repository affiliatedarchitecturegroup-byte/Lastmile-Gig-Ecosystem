defmodule SvcTracking.MixProject do
  @moduledoc """
  Mix project configuration for the Real-Time Tracking Service.

  Elixir + Phoenix service providing WebSocket channels for:
  - Driver location broadcasting (5-second intervals)
  - Customer order tracking (live driver pin)
  - Ops global feed (Command Centre all-activity view)

  See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
  """
  use Mix.Project

  def project do
    [
      app: :svc_tracking,
      version: "0.1.0",
      elixir: "~> 1.16",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  def application do
    [
      mod: {SvcTracking.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      {:phoenix, "~> 1.7.12"},
      {:phoenix_pubsub, "~> 2.1"},
      {:jason, "~> 1.4"},
      {:plug_cowboy, "~> 2.7"},
      {:broadway, "~> 1.0"},
      {:broadway_kafka, "~> 0.4"},
      {:redix, "~> 1.4"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:open_telemetry_api, "~> 1.2"},
      {:libcluster, "~> 3.3"},
      {:cors_plug, "~> 3.0"},
      {:ex_unit, "~> 1.16", only: :test}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get"],
      test: ["test"]
    ]
  end
end
