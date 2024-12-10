// src/modules/oauth/adapters/provider.adapter.ts

import { Profile as GoogleProfile } from 'passport-google-oauth20';
import { Profile as GithubProfile } from 'passport-github2';
import { Profile as FacebookProfile } from 'passport-facebook';
import { OAuthProvider } from '../interfaces/oauth-provider.enum';

// Interface de base pour les données utilisateur normalisées
export interface OAuthUserData {
    email: string;
    firstName: string;
    lastName: string;
    providerId: string;
    provider: OAuthProvider;
    avatar?: string;
    rawProfile?: any; // Stockage optionnel du profil brut
}

// Interface de base pour tous les adaptateurs
export interface OAuthAdapter {
    adapt(profile: any): OAuthUserData;
}

// Adaptateur pour Google
export class GoogleAdapter implements OAuthAdapter {
    adapt(profile: GoogleProfile): OAuthUserData {
        if (!profile.emails || profile.emails.length === 0) {
            throw new Error('Email not provided by Google');
        }

        return {
            email: profile.emails[0].value,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            providerId: profile.id,
            provider: OAuthProvider.GOOGLE,
            avatar: profile.photos?.[0]?.value,
            rawProfile: profile,
        };
    }
}

// Adaptateur pour GitHub
export class GithubAdapter implements OAuthAdapter {
    adapt(profile: GithubProfile): OAuthUserData {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
        // GitHub fournit souvent le nom complet dans displayName
        const [firstName, ...lastNameParts] = (profile.displayName || profile.username || '').split(' ');

        return {
            email,
            firstName: firstName || '',
            lastName: lastNameParts.join(' ') || '',
            providerId: profile.id,
            provider: OAuthProvider.GITHUB,
            avatar: profile.photos?.[0]?.value,
            rawProfile: profile,
        };
    }
}

// Adaptateur pour Facebook
export class FacebookAdapter implements OAuthAdapter {
    adapt(profile: FacebookProfile): OAuthUserData {
        return {
            email: profile.emails?.[0]?.value || `${profile.id}@facebook.com`,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            providerId: profile.id,
            provider: OAuthProvider.FACEBOOK,
            avatar: profile.photos?.[0]?.value,
            rawProfile: profile,
        };
    }
}

// Adaptateur pour Apple
export class AppleAdapter implements OAuthAdapter {
    adapt(profile: any): OAuthUserData {
        // Apple envoie les données différemment lors de la première connexion
        const email = profile.email || `${profile.sub}@apple.com`;
        const { firstName, lastName } = profile.name || {};

        return {
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            providerId: profile.sub, // Apple utilise 'sub' comme ID unique
            provider: OAuthProvider.APPLE,
            rawProfile: profile,
        };
    }
}

// Factory pour créer l'adaptateur approprié
export class OAuthAdapterFactory {
    static createAdapter(provider: OAuthProvider): OAuthAdapter {
        switch (provider) {
            case OAuthProvider.GOOGLE:
                return new GoogleAdapter();
            case OAuthProvider.GITHUB:
                return new GithubAdapter();
            case OAuthProvider.FACEBOOK:
                return new FacebookAdapter();
            case OAuthProvider.APPLE:
                return new AppleAdapter();
            default:
                throw new Error(`Unsupported OAuth provider: ${provider}`);
        }
    }
}

// Utilitaire pour valider et nettoyer les données utilisateur
export class OAuthDataValidator {
    static validate(userData: OAuthUserData): void {
        if (!userData.email) {
            throw new Error('Email is required');
        }
        if (!userData.providerId) {
            throw new Error('Provider ID is required');
        }
    }

    static sanitize(userData: OAuthUserData): OAuthUserData {
        return {
            ...userData,
            email: userData.email.toLowerCase(),
            firstName: userData.firstName.trim(),
            lastName: userData.lastName.trim(),
        };
    }
}