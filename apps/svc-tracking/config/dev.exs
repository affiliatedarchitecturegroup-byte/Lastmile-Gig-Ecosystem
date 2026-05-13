import Config

# -----------------------------------------------------------------------
# Development-specific configuration for LmgTracking
# -----------------------------------------------------------------------

config :lmg_tracking, LmgTrackingWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 7000],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "dev_only_secret_key_base_that_must_be_at_least_64_bytes_long_for_phoenix_security",
  watchers: []

# -----------------------------------------------------------------------
# Logger - more verbose in development
# -----------------------------------------------------------------------
config :logger, :console, format: "[$level] $message\n"
config :logger, level: :debug

# -----------------------------------------------------------------------
# Phoenix development settings
# -----------------------------------------------------------------------
config :phoenix, :stacktrace_depth, 20
config :phoenix, :plug_init_mode, :runtime

# -----------------------------------------------------------------------
# Redis - local development
# -----------------------------------------------------------------------
config :lmg_tracking, :redis,
  host: "localhost",
  port: 6379,
  database: 1,
  pool_size: 5

# -----------------------------------------------------------------------
# Kafka - local development
# -----------------------------------------------------------------------
config :lmg_tracking, :kafka,
  brokers: [{"localhost", 9092}],
  group_id: "lmg-tracking-consumer-dev",
  topics: [
    "lmg.orders.dispatched",
    "lmg.orders.delivered",
    "lmg.drivers.status"
  ]

# -----------------------------------------------------------------------
# Clustering disabled in dev
# -----------------------------------------------------------------------
config :libcluster,
  topologies: []

# -----------------------------------------------------------------------
# OpenTelemetry - console exporter for dev
# -----------------------------------------------------------------------
config :opentelemetry,
  traces_exporter: {:otel_exporter_stdout, []}
