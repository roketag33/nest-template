import { Request } from 'express';
import { User } from '@prisma/client';

export interface RequestWithUser extends Request {
    user: Omit<User, 'password'> & {
        id: number;
        email: string;
        name?: string;
        emailVerified?: boolean;
        twoFactorEnabled?: boolean;
        createdAt?: Date;
        updatedAt?: Date;
    };
}