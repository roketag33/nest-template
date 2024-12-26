import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ThrottlerConfigModule } from './modules/throttler/throttler.module';
import { LoggingModule } from './modules/logging/logging.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { SecurityHeadersInterceptor } from './common/interceptors/security.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RedisCacheModule } from '@/modules/cache/cache.module';
import { OAuthModule } from '@/modules/oauth/oauth.module';
import { MonitoringModule } from '@/modules/monitoring/monitoring.module';
import { FileModule } from '@/modules/files/file.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebhookModule } from '@/modules/webhooks/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggingModule,
    ThrottlerConfigModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    RedisCacheModule,
    OAuthModule,
    MonitoringModule,
    FileModule,
    EventEmitterModule.forRoot(),
    WebhookModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}