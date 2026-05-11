/**
 * RBAC Roles Guard - Role-Based Access Control
 *
 * Enforces role-based access using the @Roles() decorator.
 * Extracts the user role from the JWT payload (req.user.role)
 * and checks against the required roles for the endpoint.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2.3
 * @module guards/roles.guard
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { ValidatedUser } from '../strategies/jwt.strategy';

/**
 * Metadata key for role requirements.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict endpoint access to specific roles.
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * @Get('admin/users')
 * listUsers() { ... }
 * ```
 */
export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Role hierarchy for permission inheritance.
 * Higher roles include all permissions of lower roles.
 */
const ROLE_HIERARCHY: Record<string, string[]> = {
  super_admin: [
    'admin', 'ops_senior', 'ops_staff', 'fleet_manager', 'finance',
    'esg_officer', 'partner_admin', 'partner_staff', 'investor',
    'developer', 'driver', 'customer',
  ],
  admin: [
    'ops_senior', 'ops_staff', 'fleet_manager', 'finance',
    'esg_officer', 'partner_admin', 'partner_staff', 'investor',
    'developer', 'driver', 'customer',
  ],
  ops_senior: ['ops_staff', 'fleet_manager'],
  ops_staff: [],
  fleet_manager: [],
  finance: [],
  esg_officer: [],
  partner_admin: ['partner_staff'],
  partner_staff: [],
  investor: [],
  developer: [],
  driver: [],
  customer: [],
};

/**
 * Checks if a user role satisfies the required role.
 * Accounts for role hierarchy (e.g., admin satisfies ops_staff).
 */
export function roleHasPermission(userRole: string, requiredRole: string): boolean {
  if (userRole === requiredRole) return true;
  const inheritedRoles = ROLE_HIERARCHY[userRole];
  if (!inheritedRoles) return false;
  return inheritedRoles.includes(requiredRole);
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow access (auth guard handles authentication)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: ValidatedUser }>();
    const user = request.user;

    if (!user) {
      this.logger.warn('RolesGuard: No user on request - authentication may have failed');
      throw new ForbiddenException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/forbidden',
        title: 'Access Denied',
        status: 403,
        detail: 'You do not have permission to access this resource.',
      });
    }

    const hasRole = requiredRoles.some((role) => roleHasPermission(user.role, role));

    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.userId} with role ${user.role}. ` +
        `Required: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/insufficient-role',
        title: 'Insufficient Role',
        status: 403,
        detail: `This action requires one of the following roles: ${requiredRoles.join(', ')}.`,
      });
    }

    return true;
  }
}

/**
 * Metadata key for permission requirements (fine-grained).
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to restrict endpoint access to specific permissions.
 *
 * @example
 * ```typescript
 * @Permissions('read:drivers', 'write:drivers')
 * @Patch('drivers/:id')
 * updateDriver() { ... }
 * ```
 */
export const Permissions = (...permissions: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Permissions guard for fine-grained access control.
 * Uses Auth0 RBAC permissions from the JWT.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: ValidatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const hasPermission = requiredPermissions.every(
      (permission) => user.permissions.includes(permission),
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied for user ${user.userId}. ` +
        `Required: ${requiredPermissions.join(', ')}. ` +
        `Has: ${user.permissions.join(', ')}`,
      );
      throw new ForbiddenException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/insufficient-permissions',
        title: 'Insufficient Permissions',
        status: 403,
        detail: 'You do not have the required permissions for this action.',
      });
    }

    return true;
  }
}
