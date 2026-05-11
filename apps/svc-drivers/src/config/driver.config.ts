/**
 * Driver Service Configuration
 *
 * Centralized configuration for Supabase, MongoDB, Redis, Kafka,
 * and third-party integrations (Paystack, Rekognition).
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @module config/driver.config
 */

import { registerAs } from '@nestjs/config';

export interface DriverServiceConfig {
  port: number;
  environment: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  mongodb: {
    uri: string;
    database: string;
  };
  redis: {
    url: string;
    token: string;
    keyPrefix: string;
  };
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  paystack: {
    secretKey: string;
    publicKey: string;
    baseUrl: string;
  };
  rekognition: {
    region: string;
    collectionId: string;
    minSimilarity: number;
    livenessThreshold: number;
  };
  vault: {
    url: string;
    biometricPath: string;
  };
  sagemaker: {
    driverScoreEndpoint: string;
    region: string;
  };
}

export const driverConfig = registerAs('driver', (): DriverServiceConfig => {
  const environment = process.env['LMG_ENVIRONMENT'] ?? 'development';

  return {
    port: parseInt(process.env['LMG_PORT_DRIVER_SERVICE'] ?? '3002', 10),
    environment,
    supabase: {
      url: process.env['LMG_SUPABASE_URL'] ?? 'http://localhost:54321',
      anonKey: process.env['LMG_SUPABASE_ANON_KEY'] ?? '',
      serviceRoleKey: process.env['LMG_SUPABASE_SERVICE_ROLE_KEY'] ?? '',
    },
    mongodb: {
      uri: process.env['LMG_MONGODB_URI'] ?? 'mongodb://localhost:27017/lastmile-gig',
      database: 'lastmile-gig',
    },
    redis: {
      url: process.env['LMG_UPSTASH_REDIS_URL'] ?? 'redis://localhost:6379',
      token: process.env['LMG_UPSTASH_REDIS_TOKEN'] ?? '',
      keyPrefix: 'lmg:drivers:',
    },
    kafka: {
      brokers: (process.env['LMG_KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
      clientId: 'svc-drivers',
      groupId: 'svc-drivers-group',
    },
    paystack: {
      secretKey: process.env['LMG_PAYSTACK_SECRET_KEY'] ?? '',
      publicKey: process.env['LMG_PAYSTACK_PUBLIC_KEY'] ?? '',
      baseUrl: 'https://api.paystack.co',
    },
    rekognition: {
      region: process.env['LMG_AWS_REGION'] ?? 'af-south-1',
      collectionId: 'lmg-drivers-faces',
      minSimilarity: 95.0,
      livenessThreshold: 0.95,
    },
    vault: {
      url: process.env['LMG_VAULT_URL'] ?? 'http://localhost:8200',
      biometricPath: 'biometric',
    },
    sagemaker: {
      driverScoreEndpoint: process.env['LMG_SAGEMAKER_ENDPOINT_DRIVER_SCORE'] ?? '',
      region: process.env['LMG_AWS_REGION'] ?? 'af-south-1',
    },
  };
});

/**
 * Redis key namespaces for driver operations.
 */
export const DRIVER_REDIS_KEYS = {
  /** Driver availability: lmg:drivers:available:{zone} */
  available: (zone: string): string => `lmg:drivers:available:${zone}`,
  /** Driver location: lmg:drivers:location:{driverId} */
  location: (driverId: string): string => `lmg:drivers:location:${driverId}`,
  /** Driver session: lmg:drivers:session:{driverId} */
  session: (driverId: string): string => `lmg:drivers:session:${driverId}`,
  /** Driver stats cache: lmg:drivers:stats:{driverId} */
  stats: (driverId: string): string => `lmg:drivers:stats:${driverId}`,
  /** Zone driver count: lmg:drivers:zone-count:{zone} */
  zoneCount: (zone: string): string => `lmg:drivers:zone-count:${zone}`,
} as const;

/**
 * Kafka topic names for driver events.
 */
export const DRIVER_KAFKA_TOPICS = {
  DRIVER_REGISTERED: 'lmg.drivers.registered',
  DRIVER_STATUS_CHANGED: 'lmg.drivers.status',
  DRIVER_LOCATION_UPDATED: 'lmg.drivers.location',
  DRIVER_ONBOARDED: 'lmg.drivers.onboarded',
  DRIVER_SUSPENDED: 'lmg.drivers.suspended',
  DRIVER_PERFORMANCE_SCORED: 'lmg.drivers.performance',
} as const;
