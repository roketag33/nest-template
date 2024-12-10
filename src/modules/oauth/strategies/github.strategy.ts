import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../oauth.service';
import { OAuthAdapterFactory } from '../adapters/provider.adapter';
import {OAuthProvider} from "@/modules/oauth/interfaces/oauth-provider.enum";

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    private adapter = OAuthAdapterFactory.createAdapter(OAuthProvider.GITHUB);

    constructor(
        configService: ConfigService,
        private oauthService: OAuthService,
    ) {
        super({
            clientID: configService.get<string>('GITHUB_CLIENT_ID'),
            clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
            callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
            scope: ['user:email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: any
    ) {
        try {
            const userData = this.adapter.adapt(profile);
            const user = await this.oauthService.handleOAuthLogin(userData);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }
}