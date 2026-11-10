/**
 * User/Profile API Service for MyQurani API
 * 
 * This module handles all user profile-related API calls to api.myqurani.com
 * Endpoint base: /api/v1/users
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// ============================================
// Types
// ============================================

export interface UserProfileDto {
    id: number;
    username: string;
    name: string;
    fullName?: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    cityId?: number;
    cityName?: string;
    stateId?: number;
    stateName?: string;
    countryId?: number;
    countryName?: string;
    gender?: string;
    birthDate?: string;
    isVerified?: boolean;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    roles?: string[];
}

export interface UpdateProfileRequest {
    name?: string;
    username?: string;
    phone?: string;
    bio?: string;
    cityId?: number;
    gender?: string;
    birthDate?: string;
}

export interface UpdateAvatarRequest {
    avatar: File;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

// ============================================
// Helper Functions
// ============================================

async function getAuthToken(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        return cookieStore.get('myqurani_access_token')?.value || null;
    } catch {
        return null;
    }
}

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    const token = await getAuthToken();

    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        const responseText = await response.text();
        console.log(`[UserAPI] ${endpoint} status:`, response.status);

        if (!responseText || responseText.trim() === '') {
            return { success: false, error: 'Empty response from server' };
        }

        let rawResult: any;
        try {
            rawResult = JSON.parse(responseText);
        } catch {
            console.error('[UserAPI] JSON parse error');
            return { success: false, error: 'Invalid response format' };
        }

        if (!response.ok) {
            console.error('[UserAPI] Error:', rawResult);
            return {
                success: false,
                error: rawResult.message || `Request failed with status ${response.status}`,
            };
        }

        // Handle different response structures
        if (rawResult.success !== undefined) {
            return { success: rawResult.success, data: rawResult.data, error: rawResult.message };
        }

        return { success: true, data: rawResult };
    } catch (error) {
        console.error('[UserAPI] Request error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Request failed',
        };
    }
}

// ============================================
// User/Profile Endpoints
// ============================================

/**
 * Get current user profile (me)
 */
export async function fetchCurrentUser(): Promise<{
    success: boolean;
    data?: UserProfileDto;
    error?: string;
}> {
    console.log('[UserAPI] Fetching current user...');
    const result = await apiRequest<UserProfileDto>('/api/v1/users/me');

    if (result.success && result.data) {
        console.log('[UserAPI] Current user:', result.data.username);
    }

    return {
        success: result.success,
        data: result.data,
        error: result.error,
    };
}

/**
 * Get user profile by ID
 */
export async function fetchUserById(userId: number): Promise<{
    success: boolean;
    data?: UserProfileDto;
    error?: string;
}> {
    const result = await apiRequest<UserProfileDto>(`/api/v1/users/${userId}`);

    return {
        success: result.success,
        data: result.data,
        error: result.error,
    };
}

/**
 * Update current user profile
 */
export async function updateProfile(request: UpdateProfileRequest): Promise<{
    success: boolean;
    data?: UserProfileDto;
    error?: string;
}> {
    const result = await apiRequest<UserProfileDto>('/api/v1/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    return {
        success: result.success,
        data: result.data,
        error: result.error,
    };
}

/**
 * Upload avatar
 */
export async function uploadAvatar(avatarFile: File): Promise<{
    success: boolean;
    data?: { avatarUrl: string };
    error?: string;
}> {
    const token = await getAuthToken();

    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.message || 'Upload failed' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
        };
    }
}

/**
 * Delete avatar
 */
export async function deleteAvatar(): Promise<{
    success: boolean;
    error?: string;
}> {
    const result = await apiRequest('/api/v1/users/me/avatar', {
        method: 'DELETE',
    });

    return { success: result.success, error: result.error };
}

/**
 * Search users
 */
export async function searchUsers(keyword: string, page: number = 1, pageSize: number = 10): Promise<{
    success: boolean;
    data?: UserProfileDto[];
    totalCount?: number;
    error?: string;
}> {
    const params = new URLSearchParams();
    params.append('keyword', keyword);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const result = await apiRequest<any>(`/api/v1/users/search?${params.toString()}`);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    let users: UserProfileDto[] = [];
    let totalCount = 0;

    if (result.data && Array.isArray(result.data)) {
        users = result.data;
        totalCount = users.length;
    } else if (result.data?.data && Array.isArray(result.data.data)) {
        users = result.data.data;
        totalCount = result.data.totalCount || users.length;
    }

    return {
        success: true,
        data: users,
        totalCount,
    };
}
