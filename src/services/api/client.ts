/**
 * MyQurani API Client
 * 
 * Centralized HTTP client for communicating with api.myqurani.com
 * Handles token management, request/response interceptors, and error handling.
 */

import { ApiError, type ApiResponse } from './types';

// ============================================
// Configuration
// ============================================
const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// Token storage keys
export const TOKEN_KEYS = {
    ACCESS_TOKEN: 'myqurani_access_token',
    REFRESH_TOKEN: 'myqurani_refresh_token',
} as const;

// ============================================
// Token Management (Client-side only)
// ============================================
export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
}

export function setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
}

export function clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
}

// ============================================
// API Client Class
// ============================================
class MyQuraniApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Build headers for API requests
     */
    private getHeaders(includeAuth: boolean = true): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        if (includeAuth) {
            const token = getAccessToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    /**
     * Handle API response and errors
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get('content-type');

        // Parse response body
        let data: unknown;
        if (contentType?.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Handle non-OK responses
        if (!response.ok) {
            const errorData = data as { message?: string; errors?: Record<string, string[]> };
            throw new ApiError(
                errorData?.message || `HTTP Error ${response.status}`,
                response.status,
                errorData?.errors
            );
        }

        return data as T;
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(includeAuth),
        });

        return this.handleResponse<T>(response);
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, body?: unknown, includeAuth: boolean = true): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(includeAuth),
            body: body ? JSON.stringify(body) : undefined,
        });

        return this.handleResponse<T>(response);
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, body?: unknown, includeAuth: boolean = true): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(includeAuth),
            body: body ? JSON.stringify(body) : undefined,
        });

        return this.handleResponse<T>(response);
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(includeAuth),
        });

        return this.handleResponse<T>(response);
    }

    /**
     * POST with FormData (for file uploads)
     */
    async postFormData<T>(endpoint: string, formData: FormData, includeAuth: boolean = true): Promise<T> {
        const headers: HeadersInit = {
            'Accept': 'application/json',
        };

        if (includeAuth) {
            const token = getAccessToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        });

        return this.handleResponse<T>(response);
    }
}

// Export singleton instance
export const apiClient = new MyQuraniApiClient();

// Export class for testing/custom instances
export { MyQuraniApiClient };
