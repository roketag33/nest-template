// src/modules/oauth/constants/oauth.constants.ts
export const OAUTH_SCOPES = {
    GOOGLE: ['email', 'profile'],
    GITHUB: ['user:email'],
    FACEBOOK: ['email', 'public_profile'],
    APPLE: ['name', 'email'],
} as const;