-- Migration 001: Create Custom Enum Types
-- Lastmile Gig - Supabase PostgreSQL
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- User roles
CREATE TYPE user_role AS ENUM (
  'customer', 'driver', 'partner_staff', 'partner_admin',
  'ops_staff', 'ops_senior', 'fleet_manager', 'finance',
  'esg_officer', 'admin', 'super_admin', 'investor', 'developer'
);

-- Driver status
CREATE TYPE driver_status AS ENUM (
  'active', 'idle', 'offline', 'suspended', 'onboarding'
);

-- Vehicle type
CREATE TYPE vehicle_type AS ENUM (
  'scooter', 'bicycle', 'car', 'van'
);

-- Vehicle status
CREATE TYPE vehicle_status AS ENUM (
  'available', 'rented', 'maintenance', 'retired'
);

-- Order status
CREATE TYPE order_status AS ENUM (
  'placed', 'confirmed', 'dispatched', 'picked_up',
  'in_transit', 'delivered', 'cancelled', 'refunded'
);

-- Partner type
CREATE TYPE partner_type AS ENUM (
  'restaurant', 'cafe', 'fastfood', 'finedining', 'hotel',
  'ghost_kitchen', 'bakery', 'corporate', 'enterprise'
);

-- Partner status
CREATE TYPE partner_status AS ENUM (
  'pending', 'active', 'suspended', 'closed'
);

-- Payment gateway
CREATE TYPE payment_gateway AS ENUM (
  'paystack', 'stripe', 'flutterwave', 'peach', 'ozow', 'snapscan', 'polygon'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending', 'completed', 'failed', 'refunded'
);

-- Payout type
CREATE TYPE payout_type AS ENUM (
  'customer_charge', 'driver_payout', 'partner_settlement'
);

-- Insurance tier
CREATE TYPE insurance_tier AS ENUM (
  'basic', 'standard', 'premium'
);
