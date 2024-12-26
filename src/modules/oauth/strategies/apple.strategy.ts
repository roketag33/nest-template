import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../oauth.service';
import { OAuthAdapterFactory } from '../adapters/provider.adapter';
import { OAuthProvider } from '@/modules/oauth/interfaces/oauth-provider.enum';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private adapter = OAuthAdapterFactory.createAdapter(OAuthProvider.APPLE);

  constructor(
    configService: ConfigService,
    private oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      keyFile: configService.get<string>('APPLE_PRIVATE_KEY_PATH'),
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL'),
      scope: ['name', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    try {
      const userData = this.adapter.adapt(profile);
      const user = await this.oauthService.handleOAuthLogin(userData);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
