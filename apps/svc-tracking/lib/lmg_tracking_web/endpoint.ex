defmodule LmgTrackingWeb.Endpoint do
  @moduledoc """
  Phoenix Endpoint for the Lastmile Gig Real-Time Tracking Service.

  Handles WebSocket connections for:
  - Driver location broadcasting (5-second intervals)
  - Customer order tracking (live driver position on map)
  - Command Centre operations (global real-time view)

  Transport: WebSocket via Phoenix Channels
  Target: 10,000+ concurrent connections per node
  """

  use Phoenix.Endpoint, otp_app: :lmg_tracking

  # ---------------------------------------------------------------------------
  # WebSocket transport for tracking channels
  # ---------------------------------------------------------------------------
  socket "/tracking", LmgTrackingWeb.TrackingSocket,
    websocket: [
      timeout: 120_000,
      compress: true,
      max_frame_size: 8_192,
      connect_info: [:peer_data, :x_headers]
    ],
    longpoll: false

  # ---------------------------------------------------------------------------
  # Plug pipeline
  # ---------------------------------------------------------------------------

  # Request ID for tracing
  plug Plug.RequestId

  # Telemetry for request metrics
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  # Parse JSON body
  plug Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Phoenix.json_library()

  # Health and metrics endpoints
  plug LmgTrackingWeb.Router
end
