/**
 * @lastmile-gig/shared-types
 *
 * Canonical TypeScript type definitions shared across all services
 * in the Lastmile Gig monorepo. These types are the single source
 * of truth for data structures used across frontend and backend.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md
 * @see docs/specs/04_BACKEND_MICROSERVICES.md
 */

export * from './enums';
export * from './models/user.types';
export * from './models/driver.types';
export * from './models/partner.types';
export * from './models/order.types';
export * from './models/vehicle.types';
export * from './models/payment.types';
export * from './models/sla.types';
export * from './api/api-response.types';
export * from './api/pagination.types';
export * from './kafka/kafka-events.types';
export * from './models/tracking.types';
