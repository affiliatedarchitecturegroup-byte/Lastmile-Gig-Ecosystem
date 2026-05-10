/**
 * Core enumerations used across the Lastmile Gig platform.
 * These map directly to PostgreSQL enum types in the Supabase schema.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 */

// --- User & Identity ---

export enum UserRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  PARTNER_STAFF = 'partner_staff',
  PARTNER_ADMIN = 'partner_admin',
  OPS_STAFF = 'ops_staff',
  OPS_SENIOR = 'ops_senior',
  FLEET_MANAGER = 'fleet_manager',
  FINANCE = 'finance',
  ESG_OFFICER = 'esg_officer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  INVESTOR = 'investor',
  DEVELOPER = 'developer',
}

// --- Driver ---

export enum DriverStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  OFFLINE = 'offline',
  SUSPENDED = 'suspended',
  ONBOARDING = 'onboarding',
}

export enum DriverTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  ELITE = 'elite',
}

// --- Vehicle ---

export enum VehicleType {
  SCOOTER = 'scooter',
  BICYCLE = 'bicycle',
  CAR = 'car',
  VAN = 'van',
}

export enum VehicleStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

// --- Order ---

export enum OrderStatus {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  DISPATCHED = 'dispatched',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// --- Partner ---

export enum PartnerType {
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  FAST_FOOD = 'fastfood',
  FINE_DINING = 'finedining',
  HOTEL = 'hotel',
  GHOST_KITCHEN = 'ghost_kitchen',
  BAKERY = 'bakery',
  CORPORATE = 'corporate',
  ENTERPRISE = 'enterprise',
}

export enum PartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

// --- Payment ---

export enum PaymentGateway {
  PAYSTACK = 'paystack',
  STRIPE = 'stripe',
  FLUTTERWAVE = 'flutterwave',
  PEACH = 'peach',
  OZOW = 'ozow',
  SNAPSCAN = 'snapscan',
  POLYGON_CDK = 'polygon',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PayoutType {
  CUSTOMER_CHARGE = 'customer_charge',
  DRIVER_PAYOUT = 'driver_payout',
  PARTNER_SETTLEMENT = 'partner_settlement',
}

export enum PaymentMethod {
  CARD = 'card',
  EFT = 'eft',
  MOBILE_MONEY = 'mobile_money',
  QR_CODE = 'qr_code',
  CRYPTO = 'crypto',
}

// --- Delivery Zone ---

export enum DeliveryZone {
  KZN_NORTH = 'KZN-North',
  KZN_SOUTH = 'KZN-South',
  KZN_CBD = 'KZN-CBD',
  GAUTENG_NORTH = 'Gauteng-North',
  GAUTENG_SOUTH = 'Gauteng-South',
  WESTERN_CAPE = 'Western-Cape',
}

// --- Insurance ---

export enum InsuranceTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

// --- Notification ---

export enum NotificationType {
  ORDER_PLACED = 'order_placed',
  ORDER_DISPATCHED = 'order_dispatched',
  DRIVER_ASSIGNED = 'driver_assigned',
  DELIVERY_CONFIRMED = 'delivery_confirmed',
  PAYOUT_PROCESSED = 'payout_processed',
  MAINTENANCE_ALERT = 'maintenance_alert',
  ESG_REPORT_READY = 'esg_report_ready',
  FRAUD_ALERT = 'fraud_alert',
  SLA_BREACH = 'sla_breach',
}

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
}

// --- AI Agent ---

export enum AgentConfidenceAction {
  AUTO_EXECUTE = 'auto_execute',
  HITL_REVIEW = 'hitl_review',
  ESCALATE = 'escalate',
}

export enum AgentRunStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  HITL_PENDING = 'hitl_pending',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
