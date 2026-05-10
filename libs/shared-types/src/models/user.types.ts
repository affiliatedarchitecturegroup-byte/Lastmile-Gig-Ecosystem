/**
 * User type definitions.
 * Maps to the `users` table in Supabase PostgreSQL.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 */

import { UserRole } from '../enums';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  auth0Id: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  popiaConsent: boolean;
  popiaConsentAt: string | null;
}

export interface CreateUserDto {
  email: string;
  phone?: string;
  role: UserRole;
  auth0Id?: string;
  popiaConsent: boolean;
}

export interface UpdateUserDto {
  email?: string;
  phone?: string;
  role?: UserRole;
}

export interface UserProfile extends User {
  displayName: string;
  avatarUrl: string | null;
}
