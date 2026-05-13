defmodule SvcTrackingWeb.Router do
  @moduledoc """
  HTTP router for the Real-Time Tracking Service.

  Provides health check and readiness endpoints for Kubernetes probes.
  All real-time communication happens via WebSocket channels.
  """
  use Plug.Router

  plug :match
  plug :dispatch

  get "/health" do
    response = Jason.encode!(%{
      status: "healthy",
      service: "svc-tracking",
      version: "0.1.0",
      beam_node: node(),
      connected_nodes: Node.list() |> length()
    })

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, response)
  end

  get "/ready" do
    response = Jason.encode!(%{status: "ready"})

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, response)
  end

  get "/metrics" do
    # Prometheus metrics endpoint placeholder
    conn
    |> put_resp_content_type("text/plain")
    |> send_resp(200, "# Tracking service metrics\n")
  end

  match _ do
    send_resp(conn, 404, Jason.encode!(%{error: "Not found"}))
  end
end
