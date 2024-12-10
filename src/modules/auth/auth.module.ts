import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import {ConfigModule, ConfigService} from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { TwoFactorController } from "./two-factor/two-factor.controller";
import { PrismaModule } from "@/prisma/prisma.module";
import { TwoFactorService } from './two-factor/two-factor.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION', '1d') },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, TwoFactorService],
  controllers: [AuthController, TwoFactorController],
  exports: [AuthService],
})
export class AuthModule {}