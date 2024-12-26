import { Request } from 'express';
import { User } from '@prisma/client';
import { OAuthResponse } from '@/modules/oauth/interfaces/oauth-response.interface';

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

export interface RequestWithOAuthUser extends Request {
  user: OAuthResponse;
}
