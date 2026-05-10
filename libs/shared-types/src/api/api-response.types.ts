/**
 * Standardized API response types following JSON:API and RFC 7807 patterns.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 5
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: ApiListMeta;
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiListMeta extends ApiMeta {
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * RFC 7807 Problem Details for error responses.
 */
export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  responseTime: number;
  message?: string;
}
