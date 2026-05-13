defmodule SvcTrackingWeb.OpsChannel do
  @moduledoc """
  Phoenix Channel for the Command Centre operations dashboard.

  Topic: "ops:global"

  Ops staff and Command Centre subscribe to receive:
  - All driver location updates across all zones
  - Dispatch events (new orders, assignments, failures)
  - System alerts and incidents
  - Real-time KPI metrics

  Access restricted to ops_staff, ops_senior, admin, and super_admin roles.

  See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.6
  """
  use Phoenix.Channel

  require Logger

  @authorised_roles ~w(ops_staff ops_senior admin super_admin fleet_manager)

  @impl true
  def join("ops:global", _params, socket) do
    role = socket.assigns[:role] || "unknown"

    if role in @authorised_roles do
      Logger.info("Ops user #{socket.assigns[:user_id]} joined global ops channel (role: #{role})")
      send(self(), :after_join)
      {:ok, %{status: "connected", role: role}, socket}
    else
      Logger.warning("Unauthorised ops channel join attempt by #{socket.assigns[:user_id]} (role: #{role})")
      {:error, %{reason: "insufficient_permissions"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    # Send current system snapshot
    push(socket, "ops:snapshot", %{
      active_drivers: get_active_driver_count(),
      pending_orders: 0,
      active_deliveries: 0,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("ops:request_snapshot", _payload, socket) do
    snapshot = %{
      active_drivers: get_active_driver_count(),
      pending_orders: 0,
      active_deliveries: 0,
      zones: get_zone_summary(),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    }

    {:reply, {:ok, snapshot}, socket}
  end

  @impl true
  def handle_in("ops:broadcast_alert", %{"message" => message, "severity" => severity}, socket) do
    alert = %{
      message: message,
      severity: severity,
      source: socket.assigns[:user_id],
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    }

    broadcast!(socket, "ops:alert", alert)
    Logger.info("Ops alert broadcast: #{severity} - #{message}")

    {:reply, :ok, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    Logger.info("Ops user #{socket.assigns[:user_id]} left global ops channel")
    :ok
  end

  defp get_active_driver_count do
    zones = ["KZN-North", "KZN-South", "KZN-CBD", "Gauteng-North", "Gauteng-South", "Western-Cape"]

    Enum.reduce(zones, 0, fn zone, acc ->
      key = "lmg:dispatch:pool:#{zone}"
      case Redix.command(:tracking_redis, ["ZCARD", key]) do
        {:ok, count} -> acc + count
        {:error, _} -> acc
      end
    end)
  end

  defp get_zone_summary do
    zones = ["KZN-North", "KZN-South", "KZN-CBD", "Gauteng-North", "Gauteng-South", "Western-Cape"]

    Enum.map(zones, fn zone ->
      key = "lmg:dispatch:pool:#{zone}"
      count = case Redix.command(:tracking_redis, ["ZCARD", key]) do
        {:ok, c} -> c
        {:error, _} -> 0
      end

      %{zone: zone, active_drivers: count}
    end)
  end
end
