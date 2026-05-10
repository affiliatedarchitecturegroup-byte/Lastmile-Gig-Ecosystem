/**
 * Proxy Controller
 *
 * Routes external API requests to internal microservices.
 * Routing table defined in 04_BACKEND_MICROSERVICES.md Section 2.1.
 *
 * Placeholder implementation - will be expanded in Phase E (P101-P110).
 */

import { Controller, Get } from '@nestjs/common';

@Controller()
export class ProxyController {
  @Get('services')
  getServiceRegistry(): Record<string, string> {
    return {
      auth: '/auth/*',
      drivers: '/drivers/*',
      orders: '/orders/*',
      fleet: '/fleet/*',
      restaurants: '/restaurants/*',
      logistics: '/logistics/*',
      payments: '/payments/*',
      analytics: '/analytics/*',
      tracking: 'ws://tracking/*',
    };
  }
}
