import {
    Controller,
    Post,
    Body,
    UseGuards,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TwoFactorService } from './two-factor.service';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@ApiTags('2fa')
@Controller('2fa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TwoFactorController {
    constructor(private twoFactorService: TwoFactorService) {}

    @Post('generate')
    @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
    async generate(@Req() req: RequestWithUser) {
        return this.twoFactorService.generateSecret(req.user.id);
    }

    @Post('verify')
    @ApiOperation({ summary: 'Verify 2FA token' })
    async verify(
        @Req() req: RequestWithUser,
        @Body('token') token: string,
    ) {
        const isValid = await this.twoFactorService.verifyToken(req.user.id, token);
        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA token');
        }
        return { message: 'Token is valid' };
    }

    @Post('enable')
    @ApiOperation({ summary: 'Enable 2FA' })
    async enable(
        @Req() req: RequestWithUser,
        @Body('token') token: string,
    ) {
        const isEnabled = await this.twoFactorService.enable(req.user.id, token);
        if (!isEnabled) {
            throw new UnauthorizedException('Invalid 2FA token');
        }
        return { message: '2FA enabled successfully' };
    }

    @Post('disable')
    @ApiOperation({ summary: 'Disable 2FA' })
    async disable(
        @Req() req: RequestWithUser,
        @Body('token') token: string,
    ) {
        const isDisabled = await this.twoFactorService.disable(req.user.id, token);
        if (!isDisabled) {
            throw new UnauthorizedException('Invalid 2FA token');
        }
        return { message: '2FA disabled successfully' };
    }
}