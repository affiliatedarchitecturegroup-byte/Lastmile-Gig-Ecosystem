import Config

# -----------------------------------------------------------------------
# Production-specific configuration for LmgTracking
# Note: Runtime configuration is in config/runtime.exs
# -----------------------------------------------------------------------

config :lmg_tracking, LmgTrackingWeb.Endpoint,
  # Production binding on all interfaces
  http: [ip: {0, 0, 0, 0}, port: 7000],
  # In production, use env var for secret_key_base (set in runtime.exs)
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true

# -----------------------------------------------------------------------
# Logger - JSON structured logging in production
# -----------------------------------------------------------------------
config :logger, level: :info

config :logger, :console,
  format: {LmgTracking.Logger.JsonFormatter, :format},
  metadata: [:request_id, :trace_id, :span_id, :driver_id, :order_id, :channel]

# -----------------------------------------------------------------------
# Sentry - production DSN set in runtime.exs
# -----------------------------------------------------------------------
config :sentry,
  included_environments: [:prod],
  environment_name: :prod

# -----------------------------------------------------------------------
# OpenTelemetry - OTLP gRPC exporter in production
# -----------------------------------------------------------------------
config :opentelemetry,
  span_processor: :batch,
  traces_exporter: :otlp

# -----------------------------------------------------------------------
# Clustering - Kubernetes DNS strategy in production
# -----------------------------------------------------------------------
config :libcluster,
  topologies: [
    k8s_dns: [
      strategy: Cluster.Strategy.Kubernetes.DNS,
      config: [
        service: "svc-tracking-headless",
        application_name: "lmg_tracking",
        namespace: "lmg-realtime",
        polling_interval: 5_000
      ]
    ]
  ]
