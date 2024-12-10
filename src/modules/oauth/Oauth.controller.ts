import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { RequestWithOAuthUser } from "@/modules/auth/interfaces/request-with-user.interface";
import type { Response as ExpressResponse } from 'express';

@ApiTags('oauth')
@Controller('oauth')
export class OauthController {
    constructor(
        private oauthService: OAuthService,
        private configService: ConfigService,
    ) {}

    @Get('google')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: 'Google OAuth2 Login' })
    async googleAuth() {}

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleCallback(
        @Req() req: RequestWithOAuthUser,
        @Res() res: ExpressResponse
    ) {
        return this.handleOAuthCallback(req, res, 'google');
    }

    @Get('github')
    @UseGuards(AuthGuard('github'))
    @ApiOperation({ summary: 'GitHub OAuth2 Login' })
    async githubAuth() {}

    @Get('github/callback')
    @UseGuards(AuthGuard('github'))
    async githubCallback(
        @Req() req: RequestWithOAuthUser,
        @Res() res: ExpressResponse
    ) {
        return this.handleOAuthCallback(req, res, 'github');
    }

    @Get('facebook')
    @UseGuards(AuthGuard('facebook'))
    @ApiOperation({ summary: 'Facebook OAuth2 Login' })
    async facebookAuth() {}

    @Get('facebook/callback')
    @UseGuards(AuthGuard('facebook'))
    async facebookCallback(
        @Req() req: RequestWithOAuthUser,
        @Res() res: ExpressResponse
    ) {
        return this.handleOAuthCallback(req, res, 'facebook');
    }

    @Get('apple')
    @UseGuards(AuthGuard('apple'))
    @ApiOperation({ summary: 'Apple OAuth Login' })
    async appleAuth() {}

    @Get('apple/callback')
    @UseGuards(AuthGuard('apple'))
    async appleCallback(
        @Req() req: RequestWithOAuthUser,
        @Res() res: ExpressResponse
    ) {
        return this.handleOAuthCallback(req, res, 'apple');
    }

    private async handleOAuthCallback(
        req: RequestWithOAuthUser,
        res: ExpressResponse,
        provider: string
    ) {
        const { access_token, user } = req.user;
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');

        if (!frontendUrl) {
            throw new Error('FRONTEND_URL is not configured');
        }

        const callbackUrl = new URL('/auth/callback', frontendUrl);
        callbackUrl.searchParams.append('token', access_token);
        callbackUrl.searchParams.append('user', JSON.stringify(user));
        callbackUrl.searchParams.append('provider', provider);

        return res.redirect(302, callbackUrl.toString());
    }
}