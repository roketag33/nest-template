import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '@prisma/client';

@Injectable()
export class MailService {
    constructor(private mailerService: MailerService) {}

    async sendWelcome(user: User, token: string) {
        const url = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

        await this.mailerService.sendMail({
            to: user.email,
            subject: 'Welcome to Nice App! Confirm your Email',
            template: './welcome',
            context: {
                name: user.name,
                url,
            },
        });
    }

    async sendPasswordReset(user: User, token: string) {
        const url = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

        await this.mailerService.sendMail({
            to: user.email,
            subject: 'Reset your password',
            template: './reset-password',
            context: {
                name: user.name,
                url,
            },
        });
    }

    async sendPasswordChanged(user: User) {
        await this.mailerService.sendMail({
            to: user.email,
            subject: 'Your password has been changed',
            template: './password-changed',
            context: {
                name: user.name,
            },
        });
    }
}