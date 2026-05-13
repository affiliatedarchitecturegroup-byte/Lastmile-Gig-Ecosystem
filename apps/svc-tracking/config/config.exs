# General configuration for the Real-Time Tracking Service.
#
# See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
import Config

config :svc_tracking, SvcTrackingWeb.Endpoint,
  url: [host: "localhost"],
  http: [port: 7000],
  secret_key_base: System.get_env("LMG_SECRET_KEY_BASE") ||
    "placeholder-secret-key-base-that-must-be-replaced-in-production-with-a-real-secret",
  pubsub_server: SvcTracking.PubSub,
  server: true

config :svc_tracking,
  env: config_env()

# JSON library
config :phoenix, :json_library, Jason

# Clustering configuration for multi-node BEAM
config :libcluster,
  topologies: [
    k8s: [
      strategy: Cluster.Strategy.Kubernetes.DNS,
      config: [
        service: "svc-tracking-headless",
        application_name: "svc_tracking",
        namespace: "lmg-core"
      ]
    ]
  ]

# Logger configuration
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :trace_id]

# Import environment specific config
import_config "#{config_env()}.exs"
