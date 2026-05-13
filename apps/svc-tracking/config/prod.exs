# Production configuration for the Real-Time Tracking Service.
import Config

config :svc_tracking, SvcTrackingWeb.Endpoint,
  http: [port: 7000],
  url: [host: "ws.lastmilegig.aagais.co.za", port: 443, scheme: "https"],
  check_origin: [
    "https://lastmilegig.aagais.co.za",
    "https://ops.lastmilegig.aagais.co.za",
    "https://command.lastmilegig.aagais.co.za"
  ],
  server: true

config :logger, level: :info
