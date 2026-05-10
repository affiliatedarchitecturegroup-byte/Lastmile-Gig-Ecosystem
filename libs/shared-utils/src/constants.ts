/**
 * Platform-wide constants for the Lastmile Gig ecosystem.
 */

// --- Platform ---

export const PLATFORM_NAME = 'Lastmile Gig';
export const PLATFORM_DOMAIN = 'lastmilegig.aagais.co.za';
export const PLATFORM_CURRENCY = 'ZAR';
export const PLATFORM_TIMEZONE = 'Africa/Johannesburg';
export const PLATFORM_LOCALE = 'en-ZA';

// --- Commission ---

export const DRIVER_COMMISSION_RATE = 0.15; // 15% platform fee
export const MINIMUM_DELIVERY_FEE_ZAR = 15;

// --- Dispatch ---

export const DISPATCH_TIMEOUT_MS = 800; // SLA: < 800ms dispatch decision
export const DISPATCH_MAX_CANDIDATES = 10;
export const DISPATCH_CONFIDENCE_AUTO = 0.90;
export const DISPATCH_CONFIDENCE_HITL = 0.70;
export const DELIVERY_VERIFICATION_RADIUS_M = 100; // 100m GPS radius

// --- Driver ---

export const DRIVER_LOCATION_INTERVAL_MS = 5000; // 5 second GPS push
export const DRIVER_PAYOUT_HOLD_MINUTES = 10;
export const DRIVER_SCORE_TIER_BRONZE = 0;
export const DRIVER_SCORE_TIER_SILVER = 60;
export const DRIVER_SCORE_TIER_GOLD = 75;
export const DRIVER_SCORE_TIER_ELITE = 90;

// --- Biometric ---

export const BIOMETRIC_SIMILARITY_THRESHOLD = 0.95; // 95% minimum
export const BIOMETRIC_LIVENESS_THRESHOLD = 0.95;

// --- Rate Limiting ---

export const RATE_LIMIT_GENERAL = 2000; // per 5 min per IP
export const RATE_LIMIT_PAYMENT = 100; // per 5 min per IP
export const RATE_LIMIT_API_BASIC = 1000; // per hour per API key
export const RATE_LIMIT_API_PRO = 10000; // per hour per API key

// --- Cache TTL (seconds) ---

export const CACHE_TTL_MENU = 60;
export const CACHE_TTL_DRIVER_POOL = 10;
export const CACHE_TTL_DEMAND_FORECAST = 1800; // 30 min
export const CACHE_TTL_SESSION = 86400; // 24h

// --- Pagination ---

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// --- Carbon ---

export const EMISSION_FACTORS = {
  SCOOTER_ICE: 0.065,    // kg CO2/km
  SCOOTER_EV: 0.012,     // kg CO2/km (SA grid mix)
  BICYCLE: 0.0,
  CAR_PETROL: 0.171,
  VAN_DIESEL: 0.210,
} as const;

// --- Telemetry ---

export const TELEMETRY_HOT_RETENTION_DAYS = 90;
export const TELEMETRY_COLD_RETENTION_YEARS = 7;
