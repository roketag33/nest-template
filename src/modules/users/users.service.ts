import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private cacheService: CacheService,
        private mailService: MailService,
    ) {}

    async create(createUserDto: CreateUserDto) {
        // Vérifier si l'email existe déjà
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        try {
            // Créer l'utilisateur
            const user = await this.prisma.user.create({
                data: {
                    ...createUserDto,
                    password: hashedPassword,
                    emailVerified: false,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                },
            });

            // Générer un token de vérification
            const verificationToken = crypto.randomBytes(32).toString('hex');

            // Sauvegarder le token dans le cache
            await this.cacheService.set(
                `email-verification:${verificationToken}`,
                user.id,
                60 * 60 * 24, // 24 heures
            );

            // Envoyer l'email de vérification
            await this.mailService.sendWelcome(user as any, verificationToken);

            // Invalider le cache des utilisateurs
            await this.cacheService.del('users:all');

            return user;
        } catch (error) {
            throw new Error('Error creating user');
        }
    }

    async findAll() {
        const cacheKey = 'users:all';

        return this.cacheService.getOrSet(
            cacheKey,
            async () => {
                const users = await this.prisma.user.findMany({
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        emailVerified: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });

                return users;
            },
            60 * 5, // Cache pour 5 minutes
        );
    }

    async findOne(id: number) {
        const cacheKey = `user:${id}`;

        return this.cacheService.getOrSet(
            cacheKey,
            async () => {
                const user = await this.prisma.user.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        emailVerified: true,
                        createdAt: true,
                    },
                });

                if (!user) {
                    throw new NotFoundException(`User with ID ${id} not found`);
                }

                return user;
            },
            60 * 5, // Cache pour 5 minutes
        );
    }

    async findByEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new NotFoundException(`User with email ${email} not found`);
        }

        return user;
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        // Vérifier si l'utilisateur existe
        const existingUser = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Si l'email est mis à jour, vérifier qu'il n'existe pas déjà
        if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
            const emailExists = await this.prisma.user.findUnique({
                where: { email: updateUserDto.email },
            });

            if (emailExists) {
                throw new ConflictException('Email already exists');
            }
        }

        // Si le mot de passe est mis à jour, le hasher
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        try {
            const updatedUser = await this.prisma.user.update({
                where: { id },
                data: updateUserDto,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    emailVerified: true,
                    createdAt: true,
                },
            });

            // Invalider les caches
            await Promise.all([
                this.cacheService.del('users:all'),
                this.cacheService.del(`user:${id}`),
            ]);

            return updatedUser;
        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundException(`User with ID ${id} not found`);
            }
            throw error;
        }
    }

    async remove(id: number) {
        try {
            // Vérifier si l'utilisateur existe
            const user = await this.prisma.user.findUnique({
                where: { id },
            });

            if (!user) {
                throw new NotFoundException(`User with ID ${id} not found`);
            }

            // Supprimer l'utilisateur
            await this.prisma.user.delete({
                where: { id },
            });

            // Invalider les caches
            await Promise.all([
                this.cacheService.del('users:all'),
                this.cacheService.del(`user:${id}`),
            ]);

            return { message: 'User deleted successfully' };
        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundException(`User with ID ${id} not found`);
            }
            throw error;
        }
    }

    async verifyEmail(token: string) {
        // Récupérer l'ID de l'utilisateur depuis le cache
        const userId = await this.cacheService.get<number>(`email-verification:${token}`);

        if (!userId) {
            throw new UnauthorizedException('Invalid or expired verification token');
        }

        // Mettre à jour l'utilisateur
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { emailVerified: true },
            select: {
                id: true,
                email: true,
                name: true,
                emailVerified: true,
                createdAt: true,
            },
        });

        // Supprimer le token du cache
        await this.cacheService.del(`email-verification:${token}`);

        return user;
    }

    async forgotPassword(email: string) {
        const user = await this.findByEmail(email);

        // Générer un token de réinitialisation
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Sauvegarder le token dans le cache
        await this.cacheService.set(
            `password-reset:${resetToken}`,
            user.id,
            60 * 60, // 1 heure
        );

        // Envoyer l'email de réinitialisation
        await this.mailService.sendPasswordReset(user, resetToken);

        return { message: 'Password reset email sent' };
    }

    async resetPassword(token: string, newPassword: string) {
        // Récupérer l'ID de l'utilisateur depuis le cache
        const userId = await this.cacheService.get<number>(`password-reset:${token}`);

        if (!userId) {
            throw new UnauthorizedException('Invalid or expired reset token');
        }

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour l'utilisateur
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
            select: {
                id: true,
                email: true,
                name: true,
                emailVerified: true,
                createdAt: true,
            },
        });

        // Supprimer le token du cache
        await this.cacheService.del(`password-reset:${token}`);

        // Envoyer l'email de confirmation
        await this.mailService.sendPasswordChanged(user as any);

        return { message: 'Password reset successful' };
    }

    async changePassword(id: number, oldPassword: string, newPassword: string) {
        // Trouver l'utilisateur
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Vérifier l'ancien mot de passe
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Hasher et mettre à jour le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
            select: {
                id: true,
                email: true,
                name: true,
                emailVerified: true,
                createdAt: true,
            },
        });

        // Envoyer l'email de confirmation
        await this.mailService.sendPasswordChanged(updatedUser as any);

        return { message: 'Password changed successfully' };
    }

    async validateUser(email: string, password: string) {
        const user = await this.findByEmail(email);

        if (user && await bcrypt.compare(password, user.password)) {
            const { password, ...result } = user;
            return result;
        }

        return null;
    }
}