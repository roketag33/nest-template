import { User } from '@prisma/client';

export interface RequestWithUser extends Request {
    user: {
        id: number;
        email: string;
        name?: string;
    };
}