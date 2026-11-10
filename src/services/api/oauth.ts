/**
 * OAuth Services for MyQurani API
 * 
 * Handles Google OAuth flow using the external API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// OAuth Endpoints
const OAUTH_ENDPOINTS = {
    GOOGLE_URL: '/api/v1/OAuth/google/url',
    GOOGLE_CALLBACK: '/api/v1/OAuth/google/callback',
} as const;

interface OAuthUrlResponse {
    success: boolean;
    data?: {
        url: string;
        state: string;
    };
    message?: string;
}

interface OAuthCallbackResponse {
    success: boolean;
    data?: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        tokenType: string;
        user?: {
            id: number;
            email: string;
            name?: string;
            username?: string;
            role?: string;
        };
    };
    message?: string;
}

/**
 * Get Google OAuth URL from MyQurani API
 * This returns a URL that the user should be redirected to
 */
export async function getGoogleOAuthUrl(redirectUri: string): Promise<{
    success: boolean;
    url?: string;
    state?: string;
    error?: string;
}> {
    try {
        console.log('[OAuth] Getting Google OAuth URL');
        console.log('[OAuth] Redirect URI:', redirectUri);

        const response = await fetch(
            `${API_BASE_URL}${OAUTH_ENDPOINTS.GOOGLE_URL}?redirectUri=${encodeURIComponent(redirectUri)}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        const data: OAuthUrlResponse = await response.json();

        if (!response.ok || !data.success || !data.data) {
            console.error('[OAuth] Failed to get OAuth URL:', data);
            return {
                success: false,
                error: data.message || 'Failed to get Google OAuth URL',
            };
        }

        console.log('[OAuth] Got OAuth URL successfully');
        return {
            success: true,
            url: data.data.url,
            state: data.data.state,
        };
    } catch (error) {
        console.error('[OAuth] Error getting OAuth URL:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get OAuth URL',
        };
    }
}

/**
 * Handle Google OAuth callback
 * Exchange the authorization code for tokens
 */
export async function handleGoogleCallback(
    code: string,
    state: string
): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    user?: {
        id: number;
        email: string;
        name?: string;
        role?: string;
    };
    error?: string;
}> {
    try {
        console.log('[OAuth] Handling Google callback');

        const response = await fetch(`${API_BASE_URL}${OAUTH_ENDPOINTS.GOOGLE_CALLBACK}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                code,
                state,
            }),
        });

        const data: OAuthCallbackResponse = await response.json();

        if (!response.ok || !data.success || !data.data) {
            console.error('[OAuth] Callback failed:', data);
            return {
                success: false,
                error: data.message || 'OAuth callback failed',
            };
        }

        console.log('[OAuth] Callback successful');
        return {
            success: true,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            user: data.data.user ? {
                id: data.data.user.id,
                email: data.data.user.email,
                name: data.data.user.name,
                role: data.data.user.role,
            } : undefined,
        };
    } catch (error) {
        console.error('[OAuth] Callback error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'OAuth callback failed',
        };
    }
}
