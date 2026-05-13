defmodule LmgTracking.Auth.TokenVerifier do
  @moduledoc """
  JWT token verification for the Lastmile Gig Tracking Service.

  Validates JWT tokens from two identity providers:
  - **Auth0**: Customer, partner, admin, investor authentication
  - **AWS Cognito**: Driver mobile app, M2M service auth

  Tokens are validated against the configured issuer and audience.
  In production, JWKS (JSON Web Key Sets) are fetched from the
  identity provider and cached for efficient verification.

  Security requirements (per SECURITY.md):
  - Every WebSocket connection requires valid JWT
  - Token expiration is strictly enforced
  - Role claims are extracted for channel authorization
  - No PII is logged from token claims
  """

  require Logger

  @type claims :: %{String.t() => term()}
  @type verify_result :: {:ok, claims()} | {:error, atom() | String.t()}

  @doc """
  Verify a JWT token and return the decoded claims.

  In production, this validates against the Auth0/Cognito JWKS endpoint.
  In test/dev, it uses a symmetric secret for convenience.

  ## Returns

  - `{:ok, claims}` - Token is valid, returns decoded claims map
  - `{:error, :expired}` - Token has expired
  - `{:error, :invalid_signature}` - Token signature doesn't match
  - `{:error, :invalid_issuer}` - Token issuer doesn't match config
  - `{:error, :invalid_audience}` - Token audience doesn't match config
  - `{:error, reason}` - Other verification failure
  """
  @spec verify_token(String.t()) :: verify_result()
  def verify_token(token) when is_binary(token) do
    jwt_config = Application.get_env(:lmg_tracking, :jwt, [])

    case Mix.env() do
      :test -> verify_test_token(token, jwt_config)
      :dev -> verify_dev_token(token, jwt_config)
      :prod -> verify_prod_token(token, jwt_config)
    end
  rescue
    error ->
      Logger.error("Token verification crashed: #{inspect(error)}")
      {:error, :verification_failed}
  end

  def verify_token(_), do: {:error, :invalid_token_format}

  # ---------------------------------------------------------------------------
  # Production verification (JWKS-based)
  # ---------------------------------------------------------------------------

  defp verify_prod_token(token, config) do
    issuer = Keyword.get(config, :issuer)
    audience = Keyword.get(config, :audience)

    # Decode header to get key ID (kid)
    with {:ok, header} <- decode_header(token),
         {:ok, jwk} <- fetch_jwk(header["kid"], config),
         {:ok, claims} <- verify_with_jwk(token, jwk),
         :ok <- validate_issuer(claims, issuer),
         :ok <- validate_audience(claims, audience),
         :ok <- validate_expiration(claims) do
      {:ok, normalize_claims(claims)}
    end
  end

  # ---------------------------------------------------------------------------
  # Development verification (relaxed)
  # ---------------------------------------------------------------------------

  defp verify_dev_token(token, config) do
    # In dev, accept tokens signed with the dev secret
    # Also accept Auth0 tokens if JWKS is configured
    case Keyword.get(config, :jwks_url) do
      nil -> verify_with_secret(token, "dev_secret_key_for_local_development")
      _url -> verify_prod_token(token, config)
    end
  end

  # ---------------------------------------------------------------------------
  # Test verification (symmetric secret)
  # ---------------------------------------------------------------------------

  defp verify_test_token(token, config) do
    secret = Keyword.get(config, :test_secret, "test_jwt_secret_for_signing_tokens_in_tests")
    verify_with_secret(token, secret)
  end

  # ---------------------------------------------------------------------------
  # Shared verification helpers
  # ---------------------------------------------------------------------------

  defp verify_with_secret(token, secret) do
    signer = Joken.Signer.create("HS256", secret)

    case Joken.verify(token, signer) do
      {:ok, claims} ->
        with :ok <- validate_expiration(claims) do
          {:ok, normalize_claims(claims)}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp verify_with_jwk(token, jwk) do
    signer = Joken.Signer.create("RS256", %{"pem" => jwk_to_pem(jwk)})

    case Joken.verify(token, signer) do
      {:ok, claims} -> {:ok, claims}
      {:error, reason} -> {:error, reason}
    end
  end

  defp decode_header(token) do
    case String.split(token, ".") do
      [header_b64 | _] ->
        case Base.url_decode64(header_b64, padding: false) do
          {:ok, header_json} -> {:ok, Jason.decode!(header_json)}
          :error -> {:error, :invalid_header_encoding}
        end

      _ ->
        {:error, :malformed_token}
    end
  end

  defp fetch_jwk(kid, config) do
    jwks_url = Keyword.get(config, :jwks_url)

    case get_cached_jwks(jwks_url) do
      {:ok, keys} ->
        case Enum.find(keys, fn k -> k["kid"] == kid end) do
          nil -> {:error, :key_not_found}
          key -> {:ok, key}
        end

      error ->
        error
    end
  end

  defp get_cached_jwks(url) do
    # In a full implementation, this would use :persistent_term or ETS
    # for JWKS caching with periodic refresh. Placeholder for now.
    case :httpc.request(:get, {String.to_charlist(url), []}, [], []) do
      {:ok, {{_, 200, _}, _, body}} ->
        %{"keys" => keys} = Jason.decode!(to_string(body))
        {:ok, keys}

      _ ->
        {:error, :jwks_fetch_failed}
    end
  rescue
    _ -> {:error, :jwks_fetch_failed}
  end

  defp jwk_to_pem(jwk) do
    # Convert JWK to PEM format using JOSE library
    {_, pem} = JOSE.JWK.from_map(jwk) |> JOSE.JWK.to_pem()
    pem
  end

  defp validate_issuer(claims, expected_issuer) do
    case claims["iss"] do
      ^expected_issuer -> :ok
      _ -> {:error, :invalid_issuer}
    end
  end

  defp validate_audience(claims, expected_audience) do
    aud = claims["aud"]

    cond do
      is_binary(aud) and aud == expected_audience -> :ok
      is_list(aud) and expected_audience in aud -> :ok
      true -> {:error, :invalid_audience}
    end
  end

  defp validate_expiration(claims) do
    case claims["exp"] do
      nil ->
        {:error, :missing_expiration}

      exp when is_number(exp) ->
        now = DateTime.utc_now() |> DateTime.to_unix()
        if exp > now, do: :ok, else: {:error, :expired}

      _ ->
        {:error, :invalid_expiration}
    end
  end

  defp normalize_claims(claims) do
    %{
      "sub" => claims["sub"],
      "email" => claims["email"],
      "role" => claims["role"] || claims["lmg/role"] || extract_role_from_permissions(claims),
      "exp" => claims["exp"],
      "iat" => claims["iat"],
      "iss" => claims["iss"],
      "aud" => claims["aud"],
      "permissions" => claims["permissions"] || [],
      "metadata" => claims["lmg/metadata"] || %{}
    }
  end

  defp extract_role_from_permissions(claims) do
    permissions = claims["permissions"] || []

    cond do
      "admin:all" in permissions -> "ADMIN"
      "ops:dispatch" in permissions -> "OPS_STAFF"
      "driver:deliver" in permissions -> "DRIVER"
      "customer:order" in permissions -> "CUSTOMER"
      true -> "UNKNOWN"
    end
  end
end
