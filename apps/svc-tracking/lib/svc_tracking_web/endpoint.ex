defmodule SvcTrackingWeb.Endpoint do
  @moduledoc """
  Phoenix Endpoint for the Real-Time Tracking Service.

  Handles HTTP and WebSocket connections.
  WebSocket transport at /socket/websocket for channel connections.

  See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
  """
  use Phoenix.Endpoint, otp_app: :svc_tracking

  # WebSocket transport for Phoenix Channels
  socket "/socket", SvcTrackingWeb.TrackingSocket,
    websocket: [
      timeout: 45_000,
      compress: true,
      max_frame_size: 8_192
    ],
    longpoll: false

  # Health check endpoint
  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason

  plug CORSPlug,
    origin: [
      "https://lastmilegig.aagais.co.za",
      "https://ops.lastmilegig.aagais.co.za",
      "https://command.lastmilegig.aagais.co.za"
    ]

  plug SvcTrackingWeb.Router
end
