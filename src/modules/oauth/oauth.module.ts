import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { PrismaModule } from '@/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { OauthController } from '@/modules/oauth/Oauth.controller';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRATION', '1d'),
        },
      }),
    }),
  ],
  controllers: [OauthController],
  providers: [OAuthService, GoogleStrategy, GithubStrategy, AppleStrategy, FacebookStrategy],
  exports: [OAuthService],
})
export class OAuthModule {}
