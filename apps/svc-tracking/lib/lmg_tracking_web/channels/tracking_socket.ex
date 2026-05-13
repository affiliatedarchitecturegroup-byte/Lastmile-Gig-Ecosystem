defmodule LmgTrackingWeb.TrackingSocket do
  @moduledoc """
  WebSocket handler for all real-time tracking channels.

  Channel routing:
  - "driver:{driver_id}"  - Driver pushes GPS coordinates every 5 seconds
  - "order:{order_id}"    - Customer subscribes for live delivery tracking
  - "ops:global"          - Command Centre subscribes for all active deliveries

  Authentication:
  - JWT token validated on connect (Auth0 or AWS Cognito)
  - Role-based channel access enforced per channel join
  - Drivers connect via Cognito tokens, customers/ops via Auth0

  Connection limits:
  - Max 50,000 connections per node (Bandit transport config)
  - Heartbeat every 30 seconds (configurable via tracking config)
  """

  use Phoenix.Socket
  require Logger

  alias LmgTracking.Auth.TokenVerifier

  # ---------------------------------------------------------------------------
  # Channel routing
  # ---------------------------------------------------------------------------

  channel "driver:*", LmgTrackingWeb.DriverChannel
  channel "order:*", LmgTrackingWeb.OrderChannel
  channel "ops:*", LmgTrackingWeb.OpsChannel

  # ---------------------------------------------------------------------------
  # Socket lifecycle
  # ---------------------------------------------------------------------------

  @doc """
  Authenticates the WebSocket connection using a JWT token.

  The token is passed as a parameter during the WebSocket handshake:
  ```javascript
  const socket = new Socket("/tracking", {
    params: { token: "eyJhbGciOi..." }
  });
  ```

  Returns `{:ok, socket}` with user claims assigned, or `:error` on auth failure.
  """
  @impl true
  def connect(%{"token" => token}, socket, connect_info) do
    case TokenVerifier.verify_token(token) do
      {:ok, claims} ->
        socket =
          socket
          |> assign(:user_id, claims["sub"])
          |> assign(:role, claims["role"] || claims["lmg/role"])
          |> assign(:email, claims["email"])
          |> assign(:connected_at, DateTime.utc_now())
          |> assign(:peer_ip, extract_peer_ip(connect_info))

        Logger.info("WebSocket connected",
          user_id: claims["sub"],
          role: claims["role"],
          peer_ip: extract_peer_ip(connect_info)
        )

        {:ok, socket}

      {:error, reason} ->
        Logger.warning("WebSocket auth failed: #{inspect(reason)}")
        :error
    end
  end

  def connect(_params, _socket, _connect_info) do
    Logger.warning("WebSocket connection rejected: missing token")
    :error
  end

  @doc """
  Returns a unique socket identifier for the connected user.
  Used for targeted disconnect operations (e.g., force logout).
  """
  @impl true
  def id(socket), do: "tracking_socket:#{socket.assigns.user_id}"

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp extract_peer_ip(%{peer_data: %{address: address}}) do
    address
    |> :inet.ntoa()
    |> to_string()
  end

  defp extract_peer_ip(_), do: "unknown"
end
