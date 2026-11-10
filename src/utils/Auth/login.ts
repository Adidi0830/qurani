/*
 * This is the new login implementation that uses the external API
 * at api.myqurani.com instead of Supabase Auth.
 * 
 * The old Supabase-based login is preserved in login.ts for reference/rollback.
 */

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';
const AUTH_ENDPOINT = '/api/v1/Auth/login';

// Cookie configuration for storing tokens
const TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
};

interface LoginApiResponse {
    success: boolean;
    message?: string;
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
}

export interface LoginResult {
    success: boolean;
    error?: string;
    user?: {
        id: number;
        email: string;
        name?: string;
        role?: string;
    };
}

/**
 * Login using MyQurani API
 * 
 * @param formData - Form data containing username/email and password
 * @returns Login result with success status and user data or error
 */
export async function loginMyQurani(formData: FormData): Promise<LoginResult> {
    const usernameOrEmail = formData.get("username") as string;
    const password = formData.get("password") as string;

    // Validate input
    if (!usernameOrEmail || !password) {
        return {
            success: false,
            error: "Username and password are required",
        };
    }

    try {
        console.log('[Auth] Login request via MyQurani API');
        console.log('[Auth] Endpoint:', `${API_BASE_URL}${AUTH_ENDPOINT}`);

        const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                emailOrUsername: usernameOrEmail,
                password: password,
            }),
        });

        const data: LoginApiResponse = await response.json();

        // Handle API errors
        if (!response.ok) {
            console.error('[LoginMyQurani] API Error:', data);

            if (response.status === 400 || response.status === 401) {
                return {
                    success: false,
                    error: "Invalid username or password",
                };
            }

            return {
                success: false,
                error: data.message || "Login failed. Please try again.",
            };
        }

        // Check response success
        if (!data.success || !data.data) {
            return {
                success: false,
                error: data.message || "Login failed",
            };
        }

        const authData = data.data;
        const user = authData.user;

        // Re-enable role validation after testing
        // Validate user role - only admin, billing, support allowed
        // const allowedRoles = ['admin', 'billing', 'support'];
        // const userRole = user?.role?.toLowerCase() || 'member';
        // if (!allowedRoles.includes(userRole)) {
        //     console.warn('[LoginMyQurani] Access denied for role:', userRole);
        //     return {
        //         success: false,
        //         error: "Access denied: You don't have permission to access this application",
        //     };
        // }
        console.log('[Auth] Role validation temporarily disabled for testing');

        // Store tokens in HTTP-only cookies (secure for SSR/middleware)
        const cookieStore = await cookies();

        cookieStore.set('myqurani_access_token', authData.accessToken, TOKEN_COOKIE_OPTIONS);
        cookieStore.set('myqurani_refresh_token', authData.refreshToken, {
            ...TOKEN_COOKIE_OPTIONS,
            maxAge: 60 * 60 * 24 * 30, // 30 days for refresh token
        });

        // Store user info in a separate cookie (non-httpOnly so client can read)
        // Always set this cookie for client-side auth detection
        const userInfo = {
            id: user?.id || 0,
            email: user?.email || usernameOrEmail,
            name: user?.name || usernameOrEmail,
            role: user?.role || 'member',
        };

        cookieStore.set('myqurani_user', JSON.stringify(userInfo), {
            ...TOKEN_COOKIE_OPTIONS,
            httpOnly: false, // Allow client-side access
        });

        console.log('[Auth] User cookie set:', userInfo.email);

        // Revalidate dashboard cache
        revalidatePath("/dashboard", "layout");

        return {
            success: true,
            user: user ? {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            } : undefined,
        };

    } catch (error) {
        console.error('[LoginMyQurani] Unexpected error:', error);

        return {
            success: false,
            error: "An unexpected error occurred. Please try again.",
        };
    }
}

/**
 * Logout and clear all auth cookies
 */
export async function logoutMyQurani(): Promise<{ success: boolean }> {
    try {
        const cookieStore = await cookies();

        // Clear all auth cookies
        cookieStore.delete('myqurani_access_token');
        cookieStore.delete('myqurani_refresh_token');
        cookieStore.delete('myqurani_user');

        revalidatePath("/", "layout");

        return { success: true };
    } catch (error) {
        console.error('[LogoutMyQurani] Error:', error);
        return { success: true }; // Return success anyway to ensure user can logout
    }
}

/**
 * Get current user from cookies (server-side)
 */
export async function getCurrentUserFromCookies(): Promise<{
    id: number;
    email: string;
    name?: string;
    role?: string;
} | null> {
    try {
        const cookieStore = await cookies();
        const userCookie = cookieStore.get('myqurani_user');

        if (!userCookie?.value) return null;

        return JSON.parse(userCookie.value);
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated (server-side)
 */
export async function isAuthenticatedServer(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('myqurani_access_token');

        return !!accessToken?.value;
    } catch {
        return false;
    }
}
