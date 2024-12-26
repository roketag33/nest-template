import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../oauth.service';
import { OAuthAdapterFactory } from '../adapters/provider.adapter';
import { OAuthProvider } from '@/modules/oauth/interfaces/oauth-provider.enum';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private adapter = OAuthAdapterFactory.createAdapter(OAuthProvider.FACEBOOK);

  constructor(
    configService: ConfigService,
    private oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get<string>('FACEBOOK_CLIENT_ID'),
      clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET'),
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile, done: any) {
    try {
      const userData = this.adapter.adapt(profile);
      const user = await this.oauthService.handleOAuthLogin(userData);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
