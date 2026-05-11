// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - RBAC Roles Guard
// Phase: P061 | @Roles() decorator + RolesGuard
// -------------------------------------------------------------------

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './jwt-validation.middleware';

/** Metadata key for roles */
export const ROLES_KEY = 'roles';

/** Metadata key for permissions */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to restrict access to specific roles.
 * Usage: @Roles('ADMIN', 'OPS_SENIOR')
 */
export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to restrict access to specific permissions.
 * Usage: @Permissions('read:orders', 'write:orders')
 */
export const Permissions = (...permissions: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Guard that checks if the authenticated user has the required roles.
 * Applied globally or per-controller/handler.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions are required, allow access
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new ForbiddenException('Authentication required');
    }

    const userRoles = request.roles || [];
    const userPermissions = request.permissions || [];

    // Check roles (user must have at least one required role)
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRole) {
        throw new ForbiddenException(
          `Insufficient role. Required: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Check permissions (user must have ALL required permissions)
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );
      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
