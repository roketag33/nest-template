import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as qrcode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Configurer authenticator
    authenticator.options = {
      step: 30,
      window: 1,
    };
  }

  async generateSecret(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Générer un secret
    const secret = authenticator.generateSecret();

    // Créer l'URL pour le QR code
    const appName = this.configService.get('APP_NAME', 'NestJS Template');
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    // Générer le QR code
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Stocker temporairement le secret (non activé)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });

    return {
      secret,
      qrCodeDataUrl,
    };
  }

  async verifyToken(userId: number, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA not setup');
    }

    return authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });
  }

  async enable(userId: number, token: string): Promise<boolean> {
    const isValid = await this.verifyToken(userId, token);

    if (isValid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
        },
      });
      return true;
    }

    return false;
  }

  async disable(userId: number, token: string): Promise<boolean> {
    const isValid = await this.verifyToken(userId, token);

    if (isValid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });
      return true;
    }

    return false;
  }
}
