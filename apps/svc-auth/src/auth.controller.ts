/**
 * Auth Controller
 *
 * Handles authentication endpoints: login, register, refresh, logout,
 * API key management, and biometric verification.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.2
 */

import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }): Promise<{ token: string }> {
    this.logger.log('Login attempt');
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; role: string },
  ): Promise<{ userId: string }> {
    this.logger.log('Registration attempt');
    return this.authService.register(body.email, body.password, body.role);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }): Promise<{ token: string }> {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: { token: string }): Promise<{ success: boolean }> {
    return this.authService.logout(body.token);
  }

  @Get('me')
  async getProfile(): Promise<{ message: string }> {
    return { message: 'Profile endpoint - requires JWT middleware (Phase E)' };
  }
}
