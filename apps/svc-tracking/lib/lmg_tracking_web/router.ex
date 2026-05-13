defmodule LmgTrackingWeb.Router do
  @moduledoc """
  HTTP Router for the Lastmile Gig Tracking Service.

  The tracking service is primarily WebSocket-based, but exposes
  a small HTTP surface for:
  - Health checks (Kubernetes liveness/readiness probes)
  - Prometheus metrics scraping
  - Service metadata

  All business logic flows through Phoenix Channels, not HTTP.
  """

  use Plug.Router

  plug :match
  plug :dispatch

  # ---------------------------------------------------------------------------
  # Health check endpoints (Kubernetes probes)
  # ---------------------------------------------------------------------------

  @doc """
  Liveness probe - returns 200 if the BEAM VM is running.
  Used by Kubernetes to detect if the pod is alive.
  """
  get "/health" do
    response = Jason.encode!(%{
      status: "ok",
      service: "lmg-tracking-service",
      version: "0.1.0",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, response)
  end

  @doc """
  Readiness probe - returns 200 if the service can accept connections.
  Checks PubSub and Redis connectivity.
  """
  get "/ready" do
    checks = %{
      pubsub: check_pubsub(),
      redis: check_redis()
    }

    all_ok = Enum.all?(checks, fn {_k, v} -> v == :ok end)
    status_code = if all_ok, do: 200, else: 503

    response = Jason.encode!(%{
      status: if(all_ok, do: "ready", else: "not_ready"),
      checks: Map.new(checks, fn {k, v} -> {k, to_string(v)} end),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status_code, response)
  end

  @doc """
  Metrics endpoint for Prometheus scraping.
  """
  get "/metrics" do
    metrics = LmgTracking.Metrics.PrometheusCollector.export()

    conn
    |> put_resp_content_type("text/plain")
    |> send_resp(200, metrics)
  end

  @doc """
  Service metadata endpoint.
  """
  get "/info" do
    response = Jason.encode!(%{
      service: "lmg-tracking-service",
      version: "0.1.0",
      language: "Elixir #{System.version()}",
      framework: "Phoenix #{Application.spec(:phoenix, :vsn)}",
      otp_release: :erlang.system_info(:otp_release) |> to_string(),
      node: Node.self() |> to_string(),
      uptime_seconds: :erlang.statistics(:wall_clock) |> elem(0) |> div(1000)
    })

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, response)
  end

  # Catch-all for unmatched routes
  match _ do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(404, Jason.encode!(%{error: "not_found"}))
  end

  # ---------------------------------------------------------------------------
  # Private health check helpers
  # ---------------------------------------------------------------------------

  defp check_pubsub do
    case Process.whereis(LmgTracking.PubSub) do
      nil -> :error
      _pid -> :ok
    end
  end

  defp check_redis do
    case LmgTracking.Redis.Pool.ping() do
      {:ok, "PONG"} -> :ok
      _ -> :error
    end
  rescue
    _ -> :error
  end
end
