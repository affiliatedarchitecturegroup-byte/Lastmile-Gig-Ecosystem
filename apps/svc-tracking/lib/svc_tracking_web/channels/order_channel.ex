defmodule SvcTrackingWeb.OrderChannel do
  @moduledoc """
  Phoenix Channel for customer order tracking.

  Topic: "order:{order_id}"

  Customers subscribe to this channel to receive:
  - Live driver location updates (from DriverChannel cross-broadcast)
  - Order status change notifications
  - ETA updates

  See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
  """
  use Phoenix.Channel

  require Logger

  @impl true
  def join("order:" <> order_id, _params, socket) do
    socket = assign(socket, :order_id, order_id)
    Logger.info("Client joined order tracking channel: #{order_id}")

    # Send current order status (would query from Redis/DB in production)
    send(self(), :after_join)

    {:ok, %{status: "connected", order_id: order_id}, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    order_id = socket.assigns.order_id

    # Fetch current order status from Redis cache
    case get_order_status(order_id) do
      {:ok, status} ->
        push(socket, "order:status", status)

      {:error, _reason} ->
        push(socket, "order:status", %{
          order_id: order_id,
          status: "unknown",
          message: "Order status will be updated shortly"
        })
    end

    {:noreply, socket}
  end

  @impl true
  def handle_in("ping", _payload, socket) do
    {:reply, {:ok, %{pong: DateTime.utc_now() |> DateTime.to_iso8601()}}, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    order_id = socket.assigns[:order_id]
    if order_id, do: Logger.info("Client left order tracking channel: #{order_id}")
    :ok
  end

  defp get_order_status(order_id) do
    key = "lmg:tracking:order:#{order_id}"

    case Redix.command(:tracking_redis, ["GET", key]) do
      {:ok, nil} -> {:error, :not_found}
      {:ok, data} -> {:ok, Jason.decode!(data)}
      {:error, reason} -> {:error, reason}
    end
  end
end
