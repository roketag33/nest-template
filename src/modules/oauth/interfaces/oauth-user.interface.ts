// src/modules/oauth/interfaces/oauth-user.interface.ts
import {OAuthProvider} from "@/modules/oauth/interfaces/oauth-provider.enum";

export interface OAuthUserDetails {
    email: string;
    firstName: string;
    lastName: string;
    provider: OAuthProvider;
    providerId: string;
    avatar?: string;
}

