import Config

# -----------------------------------------------------------------------
# Runtime configuration - loaded at boot time from environment variables
# All secrets and environment-specific values are configured here.
# Uses LMG_ prefix as per DEVELOPMENT_DIRECTIVES.md
# -----------------------------------------------------------------------

if config_env() == :prod do
  secret_key_base =
    System.get_env("LMG_TRACKING_SECRET_KEY_BASE") ||
      raise """
      Environment variable LMG_TRACKING_SECRET_KEY_BASE is missing.
      Generate one with: mix phx.gen.secret
      """

  host =
    System.get_env("LMG_TRACKING_HOST") || "ws.lastmilegig.aagais.co.za"

  port = String.to_integer(System.get_env("LMG_TRACKING_PORT") || "7000")

  config :lmg_tracking, LmgTrackingWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      ip: {0, 0, 0, 0},
      port: port,
      transport_options: [
        socket_opts: [:inet6],
        max_connections: 50_000
      ]
    ],
    secret_key_base: secret_key_base,
    check_origin: [
      "https://lastmilegig.aagais.co.za",
      "https://ops.lastmilegig.aagais.co.za",
      "https://command.lastmilegig.aagais.co.za",
      "https://admin.lastmilegig.aagais.co.za"
    ]

  # ---------------------------------------------------------------------------
  # Redis configuration (Upstash Redis in production)
  # ---------------------------------------------------------------------------
  redis_url =
    System.get_env("LMG_UPSTASH_REDIS_URL") ||
      raise "Environment variable LMG_UPSTASH_REDIS_URL is missing."

  config :lmg_tracking, :redis,
    url: redis_url,
    pool_size: String.to_integer(System.get_env("LMG_REDIS_POOL_SIZE") || "20"),
    ssl: true

  # ---------------------------------------------------------------------------
  # Kafka configuration (AWS MSK in production)
  # ---------------------------------------------------------------------------
  kafka_brokers =
    (System.get_env("LMG_KAFKA_BROKERS") || "localhost:9092")
    |> String.split(",")
    |> Enum.map(fn broker ->
      [host, port] = String.split(broker, ":")
      {host, String.to_integer(port)}
    end)

  config :lmg_tracking, :kafka,
    brokers: kafka_brokers,
    group_id: "lmg-tracking-consumer-prod",
    topics: [
      "lmg.orders.dispatched",
      "lmg.orders.delivered",
      "lmg.drivers.status"
    ],
    security_protocol: :sasl_ssl,
    sasl_mechanism: :scram_sha_512

  # ---------------------------------------------------------------------------
  # JWT configuration (Auth0 in production)
  # ---------------------------------------------------------------------------
  auth0_domain =
    System.get_env("LMG_AUTH0_DOMAIN") ||
      raise "Environment variable LMG_AUTH0_DOMAIN is missing."

  config :lmg_tracking, :jwt,
    issuer: "https://#{auth0_domain}/",
    audience: System.get_env("LMG_AUTH0_AUDIENCE") || "lmg-tracking-service",
    jwks_url: "https://#{auth0_domain}/.well-known/jwks.json"

  # ---------------------------------------------------------------------------
  # Sentry DSN
  # ---------------------------------------------------------------------------
  config :sentry,
    dsn: System.get_env("LMG_SENTRY_DSN_TRACKING")

  # ---------------------------------------------------------------------------
  # OpenTelemetry OTLP endpoint
  # ---------------------------------------------------------------------------
  config :opentelemetry_exporter,
    otlp_protocol: :grpc,
    otlp_endpoint: System.get_env("LMG_OTEL_COLLECTOR_ENDPOINT") || "http://otel-collector:4317"
end

# ---------------------------------------------------------------------------
# Tracking configuration (all environments)
# ---------------------------------------------------------------------------
config :lmg_tracking, :tracking,
  location_update_interval_ms:
    String.to_integer(System.get_env("LMG_LOCATION_UPDATE_INTERVAL_MS") || "5000"),
  location_ttl_seconds:
    String.to_integer(System.get_env("LMG_LOCATION_TTL_SECONDS") || "60"),
  max_drift_meters:
    String.to_integer(System.get_env("LMG_MAX_DRIFT_METERS") || "5000"),
  presence_heartbeat_ms:
    String.to_integer(System.get_env("LMG_PRESENCE_HEARTBEAT_MS") || "30000")
