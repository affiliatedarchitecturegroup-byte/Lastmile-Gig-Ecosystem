# General configuration for LmgTracking
# This file is loaded before any dependency and before any environment-specific config.
import Config

# -----------------------------------------------------------------------
# Phoenix endpoint configuration
# -----------------------------------------------------------------------
config :lmg_tracking, LmgTrackingWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: LmgTrackingWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: LmgTracking.PubSub,
  live_view: [signing_salt: "lmg_tracking_salt"]

# -----------------------------------------------------------------------
# JSON library
# -----------------------------------------------------------------------
config :phoenix, :json_library, Jason

# -----------------------------------------------------------------------
# Logger configuration - structured JSON logging
# -----------------------------------------------------------------------
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :trace_id, :span_id, :driver_id, :order_id]

# -----------------------------------------------------------------------
# OpenTelemetry configuration
# -----------------------------------------------------------------------
config :opentelemetry,
  resource: [
    service: [
      name: "lmg-tracking-service",
      namespace: "lastmile-gig"
    ]
  ],
  span_processor: :batch,
  traces_exporter: :otlp

config :opentelemetry_exporter,
  otlp_protocol: :grpc,
  otlp_endpoint: "http://localhost:4317"

# -----------------------------------------------------------------------
# Sentry error tracking
# -----------------------------------------------------------------------
config :sentry,
  environment_name: Mix.env(),
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()]

# -----------------------------------------------------------------------
# Redis configuration (Redix)
# -----------------------------------------------------------------------
config :lmg_tracking, :redis,
  host: "localhost",
  port: 6379,
  database: 0,
  pool_size: 10

# -----------------------------------------------------------------------
# Kafka configuration
# -----------------------------------------------------------------------
config :lmg_tracking, :kafka,
  brokers: [{"localhost", 9092}],
  group_id: "lmg-tracking-consumer",
  topics: [
    "lmg.orders.dispatched",
    "lmg.orders.delivered",
    "lmg.drivers.status"
  ]

# -----------------------------------------------------------------------
# JWT configuration
# -----------------------------------------------------------------------
config :lmg_tracking, :jwt,
  issuer: "https://lastmilegig.aagais.co.za",
  audience: "lmg-tracking-service"

# -----------------------------------------------------------------------
# Tracking configuration
# -----------------------------------------------------------------------
config :lmg_tracking, :tracking,
  # Driver location update interval in milliseconds
  location_update_interval_ms: 5_000,
  # Location TTL in Redis (seconds) - stale locations expire
  location_ttl_seconds: 60,
  # Maximum distance drift before flagging anomaly (meters)
  max_drift_meters: 5_000,
  # Presence heartbeat interval (milliseconds)
  presence_heartbeat_ms: 30_000

# -----------------------------------------------------------------------
# Clustering
# -----------------------------------------------------------------------
config :libcluster,
  topologies: []

# Import environment specific config
import_config "#{config_env()}.exs"
