/**
 * Auth0 Service - External Identity Provider Integration
 *
 * Manages Auth0 Management API operations: user creation, password reset,
 * role assignment, and token exchange. Uses the Auth0 Node.js SDK.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2.1
 * @module services/auth0.service
 */

import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthConfiguration } from '../config/auth.config';

/**
 * Auth0 user profile from the Management API.
 */
export interface Auth0UserProfile {
  user_id: string;
  email: string;
  email_verified: boolean;
  name: string | null;
  picture: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  logins_count: number;
}

/**
 * Auth0 token exchange response.
 */
export interface Auth0TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Auth0 user creation parameters.
 */
export interface Auth0CreateUserParams {
  email: string;
  password: string;
  connection: string;
  email_verified: boolean;
  app_metadata: {
    role: string;
    lmg_user_id: string;
  };
  user_metadata: {
    display_name?: string;
    phone?: string;
  };
}

@Injectable()
export class Auth0Service {
  private readonly logger = new Logger(Auth0Service.name);
  private readonly config: AuthConfiguration;

  constructor(private readonly configService: ConfigService) {
    const authConfig = this.configService.get<AuthConfiguration>('auth');
    if (!authConfig) {
      throw new Error('Auth configuration not loaded');
    }
    this.config = authConfig;
  }

  /**
   * Creates a user in Auth0 via the Management API.
   * Sets custom app_metadata with Lastmile Gig role and user ID.
   *
   * @param email - User email address
   * @param password - User password (Auth0 stores the hash)
   * @param role - Lastmile Gig role
   * @param lmgUserId - Internal Lastmile Gig user ID
   * @param displayName - Optional display name
   * @param phone - Optional phone number
   * @returns Auth0 user ID (sub claim)
   */
  async createUser(
    email: string,
    password: string,
    role: string,
    lmgUserId: string,
    displayName?: string,
    phone?: string,
  ): Promise<string> {
    this.logger.log(`Creating Auth0 user for role: ${role}`);

    try {
      // In production, this calls the Auth0 Management API:
      // POST https://{domain}/api/v2/users
      const auth0User: Auth0CreateUserParams = {
        email,
        password,
        connection: 'Username-Password-Authentication',
        email_verified: false,
        app_metadata: {
          role,
          lmg_user_id: lmgUserId,
        },
        user_metadata: {
          display_name: displayName,
          phone,
        },
      };

      // Development: simulate Auth0 user creation
      if (this.config.environment === 'development') {
        const mockAuth0Id = `auth0|dev-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        this.logger.debug(`Dev mode: created mock Auth0 user ${mockAuth0Id}`);
        return mockAuth0Id;
      }

      // Production: call Auth0 Management API
      const response = await this.callManagementApi<{ user_id: string }>(
        'POST',
        '/api/v2/users',
        auth0User,
      );

      return response.user_id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create Auth0 user: ${message}`);
      throw new InternalServerErrorException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/auth0-error',
        title: 'Auth0 User Creation Failed',
        status: 500,
        detail: 'Failed to create identity provider account. Please try again.',
      });
    }
  }

  /**
   * Authenticates a user via Auth0 Resource Owner Password Grant.
   * Returns Auth0 tokens (access_token + refresh_token).
   *
   * @param email - User email
   * @param password - User password
   * @returns Auth0 token response
   */
  async authenticateUser(email: string, password: string): Promise<Auth0TokenResponse> {
    this.logger.log('Authenticating user via Auth0');

    try {
      if (this.config.environment === 'development') {
        return {
          access_token: `dev-access-token-${Date.now()}`,
          refresh_token: `dev-refresh-token-${Date.now()}`,
          id_token: `dev-id-token-${Date.now()}`,
          token_type: 'Bearer',
          expires_in: 900,
          scope: 'openid profile email',
        };
      }

      // Production: call Auth0 /oauth/token
      return await this.callManagementApi<Auth0TokenResponse>(
        'POST',
        '/oauth/token',
        {
          grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
          username: email,
          password,
          client_id: this.config.auth0.clientId,
          client_secret: this.config.auth0.clientSecret,
          audience: this.config.auth0.audience,
          realm: 'Username-Password-Authentication',
          scope: 'openid profile email offline_access',
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      this.logger.warn(`Auth0 authentication failed: ${message}`);
      throw new BadRequestException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/authentication-failed',
        title: 'Authentication Failed',
        status: 400,
        detail: 'Invalid email or password.',
      });
    }
  }

  /**
   * Exchanges a refresh token for a new access token via Auth0.
   */
  async refreshAccessToken(refreshToken: string): Promise<Auth0TokenResponse> {
    this.logger.log('Refreshing Auth0 access token');

    try {
      if (this.config.environment === 'development') {
        return {
          access_token: `dev-access-token-refreshed-${Date.now()}`,
          refresh_token: `dev-refresh-token-refreshed-${Date.now()}`,
          token_type: 'Bearer',
          expires_in: 900,
          scope: 'openid profile email',
        };
      }

      return await this.callManagementApi<Auth0TokenResponse>(
        'POST',
        '/oauth/token',
        {
          grant_type: 'refresh_token',
          client_id: this.config.auth0.clientId,
          client_secret: this.config.auth0.clientSecret,
          refresh_token: refreshToken,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      this.logger.warn(`Auth0 token refresh failed: ${message}`);
      throw new BadRequestException('Token refresh failed');
    }
  }

  /**
   * Initiates a password reset email via Auth0.
   */
  async requestPasswordReset(email: string): Promise<void> {
    this.logger.log('Initiating Auth0 password reset');

    if (this.config.environment === 'development') {
      this.logger.debug('Dev mode: password reset email simulated');
      return;
    }

    await this.callManagementApi(
      'POST',
      '/dbconnections/change_password',
      {
        client_id: this.config.auth0.clientId,
        email,
        connection: 'Username-Password-Authentication',
      },
    );
  }

  /**
   * Assigns a role to a user in Auth0.
   */
  async assignRole(auth0UserId: string, roleId: string): Promise<void> {
    this.logger.log(`Assigning role ${roleId} to Auth0 user`);

    if (this.config.environment === 'development') {
      this.logger.debug('Dev mode: role assignment simulated');
      return;
    }

    await this.callManagementApi(
      'POST',
      `/api/v2/users/${auth0UserId}/roles`,
      { roles: [roleId] },
    );
  }

  /**
   * Deletes a user from Auth0 (for POPIA data erasure).
   */
  async deleteUser(auth0UserId: string): Promise<void> {
    this.logger.log('Deleting Auth0 user for POPIA compliance');

    if (this.config.environment === 'development') {
      this.logger.debug('Dev mode: Auth0 user deletion simulated');
      return;
    }

    await this.callManagementApi('DELETE', `/api/v2/users/${auth0UserId}`);
  }

  /**
   * Gets the Auth0 user profile.
   */
  async getUserProfile(auth0UserId: string): Promise<Auth0UserProfile | null> {
    if (this.config.environment === 'development') {
      return {
        user_id: auth0UserId,
        email: 'dev@lastmilegig.aagais.co.za',
        email_verified: true,
        name: 'Dev User',
        picture: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        logins_count: 1,
      };
    }

    return this.callManagementApi<Auth0UserProfile>(
      'GET',
      `/api/v2/users/${auth0UserId}`,
    );
  }

  // --- Private: Auth0 Management API HTTP client ---

  /**
   * Makes an HTTP request to the Auth0 Management API.
   * In production, this uses a cached management token.
   */
  private async callManagementApi<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const baseUrl = `https://${this.config.auth0.domain}`;
    const url = `${baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Get management API token (cached)
    if (path.startsWith('/api/v2/')) {
      const mgmtToken = await this.getManagementToken();
      headers['Authorization'] = `Bearer ${mgmtToken}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Auth0 API error (${response.status}): ${errorBody}`);
    }

    if (response.status === 204 || method === 'DELETE') {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Gets a management API token via client credentials grant.
   * Token is cached until expiry.
   */
  private managementToken: string | null = null;
  private managementTokenExpiry = 0;

  private async getManagementToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.managementToken && this.managementTokenExpiry > now + 300) {
      return this.managementToken;
    }

    const baseUrl = `https://${this.config.auth0.domain}`;
    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.config.auth0.clientId,
        client_secret: this.config.auth0.clientSecret,
        audience: `${baseUrl}/api/v2/`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to obtain Auth0 management token');
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.managementToken = data.access_token;
    this.managementTokenExpiry = now + data.expires_in;

    return this.managementToken;
  }
}
