import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OAuthUserData, OAuthDataValidator } from './adapters/provider.adapter';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  /**
   * Gère le processus de connexion OAuth de bout en bout.
   * Cette méthode est le point d'entrée principal pour tous les providers OAuth.
   */
  async handleOAuthLogin(userData: OAuthUserData) {
    // Validation des données reçues
    OAuthDataValidator.validate(userData);
    const cleanData = OAuthDataValidator.sanitize(userData);

    // Recherche d'un utilisateur existant par provider ID
    const user = await this.findUserByProvider(cleanData.provider, cleanData.providerId);

    if (user) {
      // Mise à jour des informations si l'utilisateur existe déjà
      return this.updateExistingUser(user.id, cleanData);
    }

    // Vérification si l'email existe déjà avec un autre provider
    const existingUserWithEmail = await this.prisma.user.findUnique({
      where: { email: cleanData.email },
    });

    if (existingUserWithEmail) {
      // L'utilisateur existe déjà avec un autre provider
      return this.handleExistingEmailUser(existingUserWithEmail, cleanData);
    }

    // Création d'un nouvel utilisateur
    return this.createNewOAuthUser(cleanData);
  }

  /**
   * Recherche un utilisateur par ses informations provider
   */
  private async findUserByProvider(provider: string, providerId: string) {
    return this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });
  }

  /**
   * Met à jour les informations d'un utilisateur existant
   */
  private async updateExistingUser(userId: number, userData: OAuthUserData) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        avatar: userData.avatar,
        lastLoginAt: new Date(),
      },
    });

    return this.generateAuthResponse(updatedUser);
  }

  /**
   * Gère le cas où l'email existe déjà mais avec un provider différent
   */
  private async handleExistingEmailUser(existingUser: any, userData: OAuthUserData) {
    // Si l'utilisateur a un mot de passe, c'est un compte local
    if (existingUser.password) {
      throw new ConflictException(
        'Un compte existe déjà avec cet email. Veuillez vous connecter avec votre mot de passe ou utiliser la réinitialisation de mot de passe.',
      );
    }

    // Si l'utilisateur utilise un autre provider OAuth
    throw new ConflictException(
      `Cet email est déjà associé à un compte ${existingUser.provider}. Veuillez utiliser ce service pour vous connecter.`,
    );
  }

  /**
   * Crée un nouvel utilisateur OAuth
   */
  private async createNewOAuthUser(userData: OAuthUserData) {
    const newUser = await this.prisma.user.create({
      data: {
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        provider: userData.provider,
        providerId: userData.providerId,
        avatar: userData.avatar,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    // Envoi d'un email de bienvenue
    await this.mailService.sendWelcomeOAuth({
      email: newUser.email,
      name: newUser.name,
      provider: userData.provider,
    });

    return this.generateAuthResponse(newUser);
  }

  /**
   * Génère la réponse d'authentification standard
   */
  private generateAuthResponse(user: any) {
    // Création du JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    };
  }
}
