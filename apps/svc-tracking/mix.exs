defmodule LmgTracking.MixProject do
  use Mix.Project

  @version "0.1.0"
  @description "Lastmile Gig Real-Time Tracking Service - Phoenix Channels WebSocket"

  def project do
    [
      app: :lmg_tracking,
      version: @version,
      elixir: "~> 1.16",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      description: @description,
      test_coverage: [tool: ExCoveralls],
      preferred_cli_env: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.html": :test
      ],
      dialyzer: [
        plt_file: {:no_warn, "priv/plts/dialyzer.plt"},
        plt_add_apps: [:mix, :ex_unit]
      ]
    ]
  end

  def application do
    [
      mod: {LmgTracking.Application, []},
      extra_applications: [:logger, :runtime_tools, :os_mon]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      # Phoenix framework
      {:phoenix, "~> 1.7.14"},
      {:phoenix_live_dashboard, "~> 0.8.4"},
      {:phoenix_pubsub, "~> 2.1"},

      # WebSocket
      {:websock_adapter, "~> 0.5"},

      # JSON
      {:jason, "~> 1.4"},

      # HTTP server
      {:bandit, "~> 1.5"},

      # Kafka (Broadway + BroadwayKafka)
      {:broadway, "~> 1.1"},
      {:broadway_kafka, "~> 0.4"},

      # Redis (for location state + dispatch locks)
      {:redix, "~> 1.5"},

      # JWT verification
      {:joken, "~> 2.6"},
      {:jose, "~> 1.11"},

      # Clustering
      {:libcluster, "~> 3.3"},

      # Telemetry & Observability
      {:telemetry, "~> 1.3"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.1"},
      {:opentelemetry, "~> 1.4"},
      {:opentelemetry_api, "~> 1.3"},
      {:opentelemetry_exporter, "~> 1.7"},
      {:opentelemetry_phoenix, "~> 1.2"},
      {:prometheus_ex, "~> 3.1"},
      {:prometheus_plugs, "~> 1.1"},

      # Health checks
      {:plug_cowboy, "~> 2.7"},

      # Sentry error tracking
      {:sentry, "~> 10.7"},
      {:hackney, "~> 1.20"},

      # Presence tracking
      {:phoenix_html, "~> 4.1"},

      # Environment config
      {:dotenv, "~> 3.1", only: [:dev, :test]},

      # Testing
      {:excoveralls, "~> 0.18", only: :test},
      {:mox, "~> 1.1", only: :test},
      {:ex_machina, "~> 2.8", only: :test},

      # Code quality
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:dialyxir, "~> 1.4", only: [:dev, :test], runtime: false}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get"],
      test: ["test"],
      lint: ["credo --strict"],
      "quality.ci": ["format --check-formatted", "credo --strict", "dialyzer"]
    ]
  end
end
