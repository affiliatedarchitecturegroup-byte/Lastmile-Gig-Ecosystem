defmodule LmgTracking.Auth.ChannelAuthTest do
  @moduledoc """
  Tests for channel authorization helper.
  """

  use ExUnit.Case, async: true

  alias LmgTracking.Auth.ChannelAuth

  # ---------------------------------------------------------------------------
  # Driver channel permissions
  # ---------------------------------------------------------------------------

  describe "driver channel permissions" do
    test "DRIVER can join driver channel" do
      assert ChannelAuth.can?("DRIVER", :driver, :join)
    end

    test "DRIVER can push to driver channel" do
      assert ChannelAuth.can?("DRIVER", :driver, :push)
    end

    test "OPS_STAFF can join driver channel" do
      assert ChannelAuth.can?("OPS_STAFF", :driver, :join)
    end

    test "OPS_STAFF can monitor driver channel" do
      assert ChannelAuth.can?("OPS_STAFF", :driver, :monitor)
    end

    test "CUSTOMER cannot join driver channel" do
      refute ChannelAuth.can?("CUSTOMER", :driver, :join)
    end

    test "CUSTOMER cannot push to driver channel" do
      refute ChannelAuth.can?("CUSTOMER", :driver, :push)
    end
  end

  # ---------------------------------------------------------------------------
  # Order channel permissions
  # ---------------------------------------------------------------------------

  describe "order channel permissions" do
    test "CUSTOMER can join order channel" do
      assert ChannelAuth.can?("CUSTOMER", :order, :join)
    end

    test "DRIVER can join order channel" do
      assert ChannelAuth.can?("DRIVER", :order, :join)
    end

    test "PARTNER_STAFF can join order channel" do
      assert ChannelAuth.can?("PARTNER_STAFF", :order, :join)
    end

    test "ADMIN can join order channel" do
      assert ChannelAuth.can?("ADMIN", :order, :join)
    end
  end

  # ---------------------------------------------------------------------------
  # Ops channel permissions
  # ---------------------------------------------------------------------------

  describe "ops channel permissions" do
    test "OPS_STAFF can join ops channel" do
      assert ChannelAuth.can?("OPS_STAFF", :ops, :join)
    end

    test "ADMIN can join ops channel" do
      assert ChannelAuth.can?("ADMIN", :ops, :join)
    end

    test "DRIVER cannot join ops channel" do
      refute ChannelAuth.can?("DRIVER", :ops, :join)
    end

    test "CUSTOMER cannot join ops channel" do
      refute ChannelAuth.can?("CUSTOMER", :ops, :join)
    end

    test "only ADMIN has admin permission on ops" do
      assert ChannelAuth.can?("ADMIN", :ops, :admin)
      assert ChannelAuth.can?("SUPER_ADMIN", :ops, :admin)
      refute ChannelAuth.can?("OPS_STAFF", :ops, :admin)
    end
  end

  # ---------------------------------------------------------------------------
  # Role hierarchy tests
  # ---------------------------------------------------------------------------

  describe "permission_level/1" do
    test "SUPER_ADMIN has highest level" do
      assert ChannelAuth.permission_level("SUPER_ADMIN") == 100
    end

    test "CUSTOMER has low level" do
      assert ChannelAuth.permission_level("CUSTOMER") == 5
    end

    test "unknown role has zero level" do
      assert ChannelAuth.permission_level("UNKNOWN") == 0
    end
  end

  describe "has_at_least?/2" do
    test "ADMIN has at least OPS_STAFF level" do
      assert ChannelAuth.has_at_least?("ADMIN", "OPS_STAFF")
    end

    test "CUSTOMER does not have OPS_STAFF level" do
      refute ChannelAuth.has_at_least?("CUSTOMER", "OPS_STAFF")
    end

    test "same role has at least itself" do
      assert ChannelAuth.has_at_least?("DRIVER", "DRIVER")
    end
  end

  describe "role type checks" do
    test "admin? returns true for admin roles" do
      assert ChannelAuth.admin?("SUPER_ADMIN")
      assert ChannelAuth.admin?("ADMIN")
      refute ChannelAuth.admin?("OPS_STAFF")
    end

    test "ops? includes admin and ops roles" do
      assert ChannelAuth.ops?("ADMIN")
      assert ChannelAuth.ops?("OPS_STAFF")
      assert ChannelAuth.ops?("OPS_SENIOR")
      refute ChannelAuth.ops?("DRIVER")
    end

    test "partner? returns true for partner roles" do
      assert ChannelAuth.partner?("PARTNER_ADMIN")
      assert ChannelAuth.partner?("PARTNER_STAFF")
      refute ChannelAuth.partner?("CUSTOMER")
    end
  end
end
