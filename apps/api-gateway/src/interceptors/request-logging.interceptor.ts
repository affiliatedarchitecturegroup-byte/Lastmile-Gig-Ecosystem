/**
 * Request Logging Interceptor - OTel-Correlated Structured Logging
 *
 * Logs all incoming requests with trace_id correlation, duration,
 * status code, and sanitized metadata. No PII in logs.
 *
 * @see docs/specs/09_OBSERVABILITY.md
 * @module interceptors/request-logging.interceptor
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'crypto';

/**
 * Request metadata for structured logging.
 */
interface RequestLogEntry {
  requestId: string;
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userAgent: string;
  userId: string | undefined;
  userRole: string | undefined;
  contentLength: number | undefined;
  ip: string;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTPAccess');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      ip: string;
      headers: Record<string, string | string[] | undefined>;
      user?: { userId: string; role: string };
    }>();
    const response = context.switchToHttp().getResponse<{
      statusCode: number;
      setHeader: (name: string, value: string) => void;
    }>();

    const startTime = Date.now();
    const requestId = (request.headers['x-request-id'] as string) ?? randomUUID();
    const traceId = (request.headers['x-trace-id'] as string) ?? randomUUID().replace(/-/g, '');

    // Set request ID and trace ID on response headers
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Trace-Id', traceId);

    // Attach to request for downstream use
    (request as Record<string, unknown>)['requestId'] = requestId;
    (request as Record<string, unknown>)['traceId'] = traceId;

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const logEntry: RequestLogEntry = {
            requestId,
            traceId,
            method: request.method,
            path: this.sanitizePath(request.url),
            statusCode: response.statusCode,
            durationMs,
            userAgent: this.truncateUserAgent(request.headers['user-agent'] as string),
            userId: request.user?.userId,
            userRole: request.user?.role,
            contentLength: request.headers['content-length']
              ? parseInt(request.headers['content-length'] as string, 10)
              : undefined,
            ip: this.maskIp(request.ip),
          };

          if (durationMs > 5000) {
            this.logger.warn({ ...logEntry, slow: true }, 'Slow request detected');
          } else {
            this.logger.log(logEntry);
          }
        },
        error: (error: Error) => {
          const durationMs = Date.now() - startTime;
          this.logger.error({
            requestId,
            traceId,
            method: request.method,
            path: this.sanitizePath(request.url),
            durationMs,
            error: error.message,
            ip: this.maskIp(request.ip),
          });
        },
      }),
    );
  }

  /**
   * Removes query parameters from path to prevent PII leakage.
   */
  private sanitizePath(url: string): string {
    const queryIndex = url.indexOf('?');
    return queryIndex >= 0 ? url.substring(0, queryIndex) : url;
  }

  /**
   * Masks IP address for privacy.
   */
  private maskIp(ip: string): string {
    if (!ip) return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`;
    }
    return 'masked';
  }

  /**
   * Truncates User-Agent for logging.
   */
  private truncateUserAgent(userAgent: string | undefined): string {
    if (!userAgent) return 'unknown';
    return userAgent.length > 150 ? userAgent.substring(0, 150) + '...' : userAgent;
  }
}
