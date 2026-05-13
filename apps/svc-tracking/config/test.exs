import Config

# -----------------------------------------------------------------------
# Test-specific configuration for LmgTracking
# -----------------------------------------------------------------------

config :lmg_tracking, LmgTrackingWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 7001],
  secret_key_base: "test_only_secret_key_base_that_must_be_at_least_64_bytes_long_for_phoenix_testing",
  server: false

# -----------------------------------------------------------------------
# Logger - only warnings and above in test
# -----------------------------------------------------------------------
config :logger, level: :warning

# -----------------------------------------------------------------------
# Redis - test database
# -----------------------------------------------------------------------
config :lmg_tracking, :redis,
  host: "localhost",
  port: 6379,
  database: 15,
  pool_size: 2

# -----------------------------------------------------------------------
# Kafka - disabled in test (mocked)
# -----------------------------------------------------------------------
config :lmg_tracking, :kafka,
  brokers: [{"localhost", 9092}],
  group_id: "lmg-tracking-consumer-test",
  topics: [],
  enabled: false

# -----------------------------------------------------------------------
# JWT - test configuration
# -----------------------------------------------------------------------
config :lmg_tracking, :jwt,
  issuer: "https://test.lastmilegig.aagais.co.za",
  audience: "lmg-tracking-service-test",
  test_secret: "test_jwt_secret_for_signing_tokens_in_tests"

# -----------------------------------------------------------------------
# Tracking - faster intervals for tests
# -----------------------------------------------------------------------
config :lmg_tracking, :tracking,
  location_update_interval_ms: 100,
  location_ttl_seconds: 5,
  max_drift_meters: 5_000,
  presence_heartbeat_ms: 1_000

# -----------------------------------------------------------------------
# OpenTelemetry - disabled in test
# -----------------------------------------------------------------------
config :opentelemetry,
  traces_exporter: :none

# -----------------------------------------------------------------------
# Clustering disabled in test
# -----------------------------------------------------------------------
config :libcluster,
  topologies: []
