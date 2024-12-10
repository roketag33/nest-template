import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from "@/prisma/prisma.service";
import { TwoFactorService } from "@/modules/auth/two-factor/two-factor.service";
import {Prisma, User } from '@prisma/client';
import {OAuthUser} from "@/modules/oauth/interfaces/oauth.interface";

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private prisma: PrismaService,
        private twoFactorService: TwoFactorService,
    ) {}

    async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.password) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        const { password: _, ...result } = user;
        return result;
    }

    async login(user: Omit<User, 'password'>) {
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.twoFactorEnabled) {
            const payload = {
                sub: user.id,
                email: user.email,
                require2FA: true
            };
            return {
                access_token: this.jwtService.sign(payload, { expiresIn: '5m' }),
                require2FA: true,
            };
        }

        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }

    async verify2FA(userId: number, token: string) {
        const isValid = await this.twoFactorService.verifyToken(userId, token);

        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA token');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                emailVerified: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }

}