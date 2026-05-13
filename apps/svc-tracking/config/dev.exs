# Development configuration for the Real-Time Tracking Service.
import Config

config :svc_tracking, SvcTrackingWeb.Endpoint,
  http: [port: 7000],
  debug_errors: true,
  code_reloader: false,
  check_origin: false

config :logger, level: :debug
