# Test configuration for the Real-Time Tracking Service.
import Config

config :svc_tracking, SvcTrackingWeb.Endpoint,
  http: [port: 7001],
  server: false

config :logger, level: :warning
