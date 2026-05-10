/**
 * Proxy Module
 *
 * Routes incoming requests to downstream microservices.
 * This module will be expanded with actual service routing in Phase E.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.1
 */

import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';

@Module({
  controllers: [ProxyController],
})
export class ProxyModule {}
