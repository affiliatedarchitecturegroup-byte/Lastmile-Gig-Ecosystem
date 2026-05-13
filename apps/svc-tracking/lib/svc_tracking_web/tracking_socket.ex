defmodule SvcTrackingWeb.TrackingSocket do
  @moduledoc """
  Phoenix Socket for real-time tracking WebSocket connections.

  Channel architecture:
  - "driver:{driver_id}"  - Driver pushes GPS coords every 5 seconds
  - "order:{order_id}"    - Customer subscribes for live delivery tracking
  - "ops:global"          - Command Centre subscribes for all activity

  Authentication is performed on socket connect using JWT tokens.

  See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
  """
  use Phoenix.Socket

  channel "driver:*", SvcTrackingWeb.DriverChannel
  channel "order:*", SvcTrackingWeb.OrderChannel
  channel "ops:*", SvcTrackingWeb.OpsChannel

  @impl true
  def connect(params, socket, _connect_info) do
    # JWT token validation for authenticated connections
    case authenticate(params) do
      {:ok, user_id, role} ->
        socket =
          socket
          |> assign(:user_id, user_id)
          |> assign(:role, role)
          |> assign(:connected_at, DateTime.utc_now())

        {:ok, socket}

      {:error, reason} ->
        # In development, allow unauthenticated connections for testing
        if Application.get_env(:svc_tracking, :env) == :dev do
          {:ok, assign(socket, :user_id, "dev-user")}
        else
          {:error, %{reason: reason}}
        end
    end
  end

  @impl true
  def id(socket), do: "tracking_socket:#{socket.assigns.user_id}"

  # Authenticate the WebSocket connection using a JWT token.
  # In production, this validates against Auth0/Cognito.
  defp authenticate(%{"token" => token}) when is_binary(token) and byte_size(token) > 0 do
    # Phase E Auth Service integration: validate JWT with Auth0
    # For now, extract user_id from a placeholder token format
    case String.split(token, ":") do
      [user_id, role] -> {:ok, user_id, role}
      [user_id] -> {:ok, user_id, "customer"}
      _ -> {:error, "invalid_token_format"}
    end
  end

  defp authenticate(_params), do: {:error, "missing_token"}
end
