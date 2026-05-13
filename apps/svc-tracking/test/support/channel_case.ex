defmodule LmgTrackingWeb.ChannelCase do
  @moduledoc """
  Test case template for Phoenix Channel tests.

  Provides helpers for:
  - Creating authenticated socket connections
  - Joining channels with specific roles
  - Generating test JWT tokens
  - Asserting channel events
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      import Phoenix.ChannelTest
      import LmgTrackingWeb.ChannelCase

      @endpoint LmgTrackingWeb.Endpoint
    end
  end

  setup _tags do
    {:ok, %{}}
  end

  @doc """
  Generate a test JWT token with the given claims.

  Uses the test secret configured in config/test.exs for HS256 signing.
  """
  def generate_test_token(claims \\ %{}) do
    secret = "test_jwt_secret_for_signing_tokens_in_tests"
    signer = Joken.Signer.create("HS256", secret)

    default_claims = %{
      "sub" => "test-user-#{:rand.uniform(100_000)}",
      "email" => "test@lastmilegig.aagais.co.za",
      "role" => "DRIVER",
      "exp" => DateTime.utc_now() |> DateTime.add(3600) |> DateTime.to_unix(),
      "iat" => DateTime.utc_now() |> DateTime.to_unix(),
      "iss" => "https://test.lastmilegig.aagais.co.za",
      "aud" => "lmg-tracking-service-test"
    }

    merged_claims = Map.merge(default_claims, claims)
    {:ok, token, _claims} = Joken.encode_and_sign(merged_claims, signer)
    token
  end

  @doc """
  Create an authenticated socket connection with the given role.
  """
  def authenticated_socket(role \\ "DRIVER", extra_claims \\ %{}) do
    token = generate_test_token(Map.put(extra_claims, "role", role))
    connect(LmgTrackingWeb.TrackingSocket, %{"token" => token})
  end

  @doc """
  Generate a random driver ID (UUID v4 format).
  """
  def random_driver_id do
    UUID.uuid4()
  rescue
    _ -> "driver-#{:rand.uniform(100_000)}"
  end

  @doc """
  Generate a random order ID (UUID v4 format).
  """
  def random_order_id do
    UUID.uuid4()
  rescue
    _ -> "order-#{:rand.uniform(100_000)}"
  end

  @doc """
  Generate a test GPS location in the KZN-North zone.
  """
  def kzn_north_location do
    %{
      "lat" => -29.75 + :rand.uniform() * 0.1,
      "lng" => 31.0 + :rand.uniform() * 0.05,
      "speed" => :rand.uniform(60),
      "heading" => :rand.uniform(360),
      "accuracy" => 5.0 + :rand.uniform() * 10
    }
  end
end
