defmodule LmgTracking.Auth.ChannelAuth do
  @moduledoc """
  Channel authorization helpers for the Lastmile Gig Tracking Service.

  Provides role-based access control (RBAC) for Phoenix Channel operations.
  Maps roles from the RBAC hierarchy defined in SECURITY.md to channel
  permissions.

  Role hierarchy (highest to lowest):
  - SUPER_ADMIN: Full platform + infrastructure access
  - ADMIN: Full platform access
  - OPS_SENIOR: All ops + HITL approval gates
  - OPS_STAFF: View all orders, manage dispatch
  - FLEET_MANAGER: Fleet assignment, maintenance
  - FINANCE: Payment records (read-only tracking)
  - PARTNER_ADMIN: Partner staff + analytics
  - PARTNER_STAFF: Manage menu, view orders
  - DRIVER: Accept orders, view earnings, tracking
  - CUSTOMER: Place orders, view own tracking
  """

  @type role :: String.t()
  @type channel_type :: :driver | :order | :ops
  @type permission :: :join | :push | :monitor | :admin

  @admin_roles ["SUPER_ADMIN", "ADMIN"]
  @ops_roles ["OPS_SENIOR", "OPS_STAFF"]
  @partner_roles ["PARTNER_ADMIN", "PARTNER_STAFF"]

  # ---------------------------------------------------------------------------
  # Channel permission checks
  # ---------------------------------------------------------------------------

  @doc """
  Check if a role has permission to perform an action on a channel type.

  ## Examples

      iex> ChannelAuth.can?("DRIVER", :driver, :push)
      true

      iex> ChannelAuth.can?("CUSTOMER", :driver, :push)
      false

      iex> ChannelAuth.can?("OPS_STAFF", :ops, :join)
      true
  """
  @spec can?(role(), channel_type(), permission()) :: boolean()
  def can?(role, :driver, :join) do
    role in ["DRIVER" | @admin_roles ++ @ops_roles]
  end

  def can?(role, :driver, :push) do
    role == "DRIVER"
  end

  def can?(role, :driver, :monitor) do
    role in @admin_roles ++ @ops_roles
  end

  def can?(role, :order, :join) do
    role in ["CUSTOMER", "DRIVER" | @admin_roles ++ @ops_roles ++ @partner_roles]
  end

  def can?(role, :order, :push) do
    role in ["DRIVER" | @admin_roles ++ @ops_roles]
  end

  def can?(role, :ops, :join) do
    role in @admin_roles ++ @ops_roles
  end

  def can?(role, :ops, :push) do
    role in @admin_roles ++ @ops_roles
  end

  def can?(role, :ops, :admin) do
    role in @admin_roles
  end

  def can?(_role, _channel, _permission), do: false

  # ---------------------------------------------------------------------------
  # Role hierarchy helpers
  # ---------------------------------------------------------------------------

  @doc "Check if a role is an admin role"
  @spec admin?(role()) :: boolean()
  def admin?(role), do: role in @admin_roles

  @doc "Check if a role is an ops role (includes admin)"
  @spec ops?(role()) :: boolean()
  def ops?(role), do: role in @admin_roles ++ @ops_roles

  @doc "Check if a role is a partner role"
  @spec partner?(role()) :: boolean()
  def partner?(role), do: role in @partner_roles

  @doc """
  Get the effective permission level for a role (numeric, higher = more access).
  Useful for comparison operations.
  """
  @spec permission_level(role()) :: non_neg_integer()
  def permission_level("SUPER_ADMIN"), do: 100
  def permission_level("ADMIN"), do: 90
  def permission_level("OPS_SENIOR"), do: 80
  def permission_level("OPS_STAFF"), do: 70
  def permission_level("FLEET_MANAGER"), do: 60
  def permission_level("FINANCE"), do: 50
  def permission_level("ESG_OFFICER"), do: 45
  def permission_level("PARTNER_ADMIN"), do: 40
  def permission_level("PARTNER_STAFF"), do: 30
  def permission_level("INVESTOR"), do: 20
  def permission_level("DEVELOPER"), do: 15
  def permission_level("DRIVER"), do: 10
  def permission_level("CUSTOMER"), do: 5
  def permission_level(_), do: 0

  @doc """
  Check if role_a has equal or higher permissions than role_b.
  """
  @spec has_at_least?(role(), role()) :: boolean()
  def has_at_least?(role_a, role_b) do
    permission_level(role_a) >= permission_level(role_b)
  end
end
