import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../oauth.service';
import { OAuthAdapterFactory } from '../adapters/provider.adapter';
import { OAuthProvider } from '@/modules/oauth/interfaces/oauth-provider.enum';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private adapter = OAuthAdapterFactory.createAdapter(OAuthProvider.GOOGLE);

  constructor(
    configService: ConfigService,
    private oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile, done: any) {
    try {
      // Utilisation de l'adaptateur pour normaliser les données
      const userData = this.adapter.adapt(profile);

      // Le service OAuth gérera la validation et la sauvegarde
      const user = await this.oauthService.handleOAuthLogin(userData);

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
