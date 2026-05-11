// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - Auth Module
// Phase: P061-P062 | JWT middleware + API key guard registration
// -------------------------------------------------------------------

import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtValidationMiddleware } from './jwt-validation.middleware';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(JwtValidationMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'ready', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
        { path: 'v1/auth/login', method: RequestMethod.POST },
        { path: 'v1/auth/register', method: RequestMethod.POST },
        { path: 'v1/auth/refresh', method: RequestMethod.POST },
        { path: 'v1/webhooks/(.*)', method: RequestMethod.POST },
        { path: 'docs/(.*)', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
