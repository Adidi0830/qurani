/**
 * Authentication API Services
 * 
 * Handles login, logout, token refresh, and user profile operations
 * using the MyQurani API endpoints.
 */

import { apiClient, setTokens, clearTokens, getRefreshToken } from './client';
import type {
    ApiResponse,
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    UserInfo
} from './types';

// ============================================
// API Endpoints
// ============================================
const AUTH_ENDPOINTS = {
    LOGIN: '/api/v1/Auth/login',
    LOGOUT: '/api/v1/Auth/logout',
    REFRESH_TOKEN: '/api/v1/Auth/refresh-token',
    FORGOT_PASSWORD: '/api/v1/Auth/forgot-password',
    RESET_PASSWORD: '/api/v1/Auth/reset-password',
    VERIFY_2FA: '/api/v1/Auth/verify-2fa',
} as const;

// ============================================
// Login
// ============================================
export async function loginWithApi(credentials: LoginRequest): Promise<{
    success: boolean;
    data?: AuthResponse;
    error?: string;
}> {
    try {
        const response = await apiClient.post<ApiResponse<AuthResponse>>(
            AUTH_ENDPOINTS.LOGIN,
            credentials,
            false // Don't include auth header for login
        );

        if (response.success && response.data) {
            // Store tokens
            setTokens(response.data.accessToken, response.data.refreshToken);

            return {
                success: true,
                data: response.data,
            };
        }

        return {
            success: false,
            error: response.message || 'Login failed',
        };
    } catch (error) {
        console.error('[Auth] Login error:', error);

        if (error instanceof Error) {
            // Handle specific error messages
            if (error.message.includes('Invalid')) {
                return {
                    success: false,
                    error: 'Invalid email or password',
                };
            }
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
}

// ============================================
// Logout
// ============================================
export async function logoutWithApi(): Promise<{ success: boolean; error?: string }> {
    try {
        const refreshToken = getRefreshToken();

        if (refreshToken) {
            const request: LogoutRequest = { refreshToken };
            await apiClient.post<ApiResponse<unknown>>(
                AUTH_ENDPOINTS.LOGOUT,
                request,
                true
            );
        }

        // Clear tokens regardless of API response
        clearTokens();

        return { success: true };
    } catch (error) {
        console.error('[Auth] Logout error:', error);

        // Clear tokens even if API call fails
        clearTokens();

        return { success: true }; // Consider logout successful even if API fails
    }
}

// ============================================
// Refresh Token
// ============================================
export async function refreshAccessToken(): Promise<{
    success: boolean;
    data?: AuthResponse;
    error?: string;
}> {
    try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
            return {
                success: false,
                error: 'No refresh token available',
            };
        }

        const request: RefreshTokenRequest = { refreshToken };
        const response = await apiClient.post<ApiResponse<AuthResponse>>(
            AUTH_ENDPOINTS.REFRESH_TOKEN,
            request,
            false // Don't include current access token
        );

        if (response.success && response.data) {
            // Update stored tokens
            setTokens(response.data.accessToken, response.data.refreshToken);

            return {
                success: true,
                data: response.data,
            };
        }

        return {
            success: false,
            error: response.message || 'Token refresh failed',
        };
    } catch (error) {
        console.error('[Auth] Token refresh error:', error);

        // Clear tokens on refresh failure
        clearTokens();

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Token refresh failed',
        };
    }
}

// ============================================
// Get Current User (from token)
// ============================================
export function getCurrentUserFromToken(): UserInfo | null {
    if (typeof window === 'undefined') return null;

    const accessToken = localStorage.getItem('myqurani_access_token');
    if (!accessToken) return null;

    try {
        // JWT tokens have 3 parts separated by dots
        const parts = accessToken.split('.');
        if (parts.length !== 3) return null;

        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));

        return {
            id: payload.sub || payload.id,
            email: payload.email,
            name: payload.name,
            username: payload.username,
            role: payload.role,
        };
    } catch (error) {
        console.error('[Auth] Failed to decode token:', error);
        return null;
    }
}

// ============================================
// Check if user is authenticated
// ============================================
export function isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;

    const accessToken = localStorage.getItem('myqurani_access_token');
    if (!accessToken) return false;

    try {
        // Check if token is expired
        const parts = accessToken.split('.');
        if (parts.length !== 3) return false;

        const payload = JSON.parse(atob(parts[1]));
        const exp = payload.exp;

        if (!exp) return true; // No expiry, assume valid

        // Check if expired (with 60 second buffer)
        return Date.now() < (exp * 1000) - 60000;
    } catch {
        return false;
    }
}
