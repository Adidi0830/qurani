/**
 * Token Refresh Helper for Server-Side
 * 
 * This module provides auto token refresh functionality for server actions.
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

interface RefreshResult {
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
}

// Track if refresh is in progress to prevent multiple simultaneous refreshes
let refreshPromise: Promise<RefreshResult> | null = null;

/**
 * Attempt to refresh the access token using the refresh token
 * This calls the MyQurani API directly from server-side
 */
export async function refreshTokenServerSide(): Promise<RefreshResult> {
    // If refresh is already in progress, wait for it
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = doRefresh();
    const result = await refreshPromise;
    refreshPromise = null;
    return result;
}

async function doRefresh(): Promise<RefreshResult> {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get('myqurani_refresh_token')?.value;

        if (!refreshToken) {
            console.log('[TokenRefresh] No refresh token available');
            return { success: false, error: 'No refresh token' };
        }

        console.log('[TokenRefresh] Attempting to refresh token...');

        const response = await fetch(`${API_BASE_URL}/api/v1/Auth/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[TokenRefresh] Refresh failed:', response.status, errorText);
            return { success: false, error: 'Token refresh failed' };
        }

        const responseText = await response.text();
        if (!responseText) {
            console.error('[TokenRefresh] Empty response');
            return { success: false, error: 'Empty response' };
        }

        const result = JSON.parse(responseText);
        const data = result.data || result;

        if (!data.accessToken) {
            console.error('[TokenRefresh] No access token in response');
            return { success: false, error: 'Invalid response' };
        }

        console.log('[TokenRefresh] Token refreshed successfully');

        // Note: We cannot set cookies directly in server actions during fetch
        // The new tokens need to be returned and handled by the caller
        return {
            success: true,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || refreshToken,
        };
    } catch (error) {
        console.error('[TokenRefresh] Error:', error);
        return { success: false, error: 'Refresh error' };
    }
}

/**
 * Get auth token from cookies
 */
async function getAuthToken(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        return cookieStore.get('myqurani_access_token')?.value || null;
    } catch {
        return null;
    }
}

/**
 * Make an authenticated API request with auto token refresh
 * If request fails with 401, attempts to refresh token and retry
 */
export async function fetchWithAutoRefresh(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    let accessToken = await getAuthToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    // First attempt
    let response = await fetch(url, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers,
        },
    });

    // If 401, try to refresh token and retry
    if (response.status === 401) {
        console.log('[FetchWithRefresh] Got 401, attempting token refresh...');

        const refreshResult = await refreshTokenServerSide();

        if (refreshResult.success && refreshResult.accessToken) {
            console.log('[FetchWithRefresh] Token refreshed, retrying request...');

            // Retry with new token
            response = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${refreshResult.accessToken}`,
                    ...options.headers,
                },
            });

            console.log('[FetchWithRefresh] Retry response status:', response.status);
        } else {
            console.error('[FetchWithRefresh] Token refresh failed');
        }
    }

    return response;
}

/**
 * Simple authenticated fetch without auto-refresh
 * Use this when you want to handle 401 manually
 */
export async function authenticatedFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const accessToken = await getAuthToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    return fetch(url, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers,
        },
    });
}
