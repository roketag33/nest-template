import {
    Controller, Post, UseGuards, Request, Body
} from '@nestjs/common';
import {
    ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
    ApiBody, ApiOkResponse, ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Public()
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @ApiOperation({
        summary: 'User login',
        description: 'Login with email and password to receive a JWT token'
    })
    @ApiBody({ type: LoginDto })
    @ApiOkResponse({
        description: 'User successfully logged in',
        type: TokenResponseDto
    })
    @ApiUnauthorizedResponse({
        description: 'Invalid credentials'
    })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }
}