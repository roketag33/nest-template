export interface OAuthResponse {
    access_token: string;
    user: {
        id: number;
        email: string;
        name?: string;
    };
}