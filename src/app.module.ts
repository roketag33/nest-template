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
import {RedisCacheModule} from "@/modules/cache/cache.module";
import {OAuthModule} from "@/modules/oauth/oauth.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggingModule,
    ThrottlerConfigModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    RedisCacheModule,
    OAuthModule
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