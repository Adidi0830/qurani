/**
 * MyQurani API Client (Client-Side)
 * 
 * API Source: MyQurani API (https://api.myqurani.com)
 * Auth Method: Bearer Token (stored in localStorage)
 * 
 * Available API Objects:
 * ----------------------
 * - authApi      : Authentication (login, register, logout, refresh)
 * - profileApi   : User profile management
 * - ticketsApi   : Support tickets (CRUD + replies)
 * - setoranApi   : Setoran/Recitation management
 * - groupsApi    : Group management (CRUD, members, verify, settings)
 * 
 * Usage Example:
 * --------------
 * import { groupsApi, ticketsApi } from '@/lib/api';
 * 
 * // Search groups
 * const groups = await groupsApi.search({ Keyword: 'qurani' });
 * 
 * // Create ticket
 * const ticket = await ticketsApi.create({ subject: '...' });
 */

const API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// Storage key
const AUTH_STORAGE_KEY = 'myqurani_auth';

// Types
export interface AuthData {
    userId: string | number;
    email: string;
    username: string;
    name?: string;
    image?: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    roles: string[];
    bio?: string;
    address?: string;
    cityId?: number | string;
    cityName?: string;
    city?: string;
    stateId?: number | string;
    state?: string;
    countryId?: number | string;
    country?: string;
    countryName?: string;
    gender?: number | string;
    sex?: number | string;
    dob?: string;
    dateOfBirth?: string;
    job?: string;
    language?: string;
    timezone?: string | number;
    dateFormat?: string;
    timeFormat?: string;
    visibility?: number | string;
}

interface ApiOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    token?: string;
    signal?: AbortSignal;
}

// ============================================
// Storage Helpers
// ============================================

export function getStoredAuth(): AuthData | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as AuthData;
    } catch {
        return null;
    }
}

export function setStoredAuth(auth: AuthData): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));

    // Also set cookies for middleware (non-httpOnly for fallback)
    const expires = new Date(auth.expiresAt).toUTCString();
    document.cookie = `myqurani_access_token=${auth.accessToken}; expires=${expires}; path=/; SameSite=Lax`;
    document.cookie = `myqurani_refresh_token=${auth.refreshToken}; path=/; SameSite=Lax`;
    document.cookie = `myqurani_user=${encodeURIComponent(JSON.stringify({
        id: auth.userId,
        email: auth.email,
        username: auth.username,
        name: auth.name,
        image: auth.image,
        roles: auth.roles,
        bio: auth.bio,
        address: auth.address,
        cityId: auth.cityId,
        cityName: auth.cityName || auth.city,
        stateId: auth.stateId,
        countryId: auth.countryId,
        countryName: auth.countryName || auth.country,
        gender: auth.gender || auth.sex,
        dob: auth.dob || auth.dateOfBirth,
        job: auth.job,
        language: auth.language,
        timezone: auth.timezone,
        dateFormat: auth.dateFormat,
    }))}; expires=${expires}; path=/; SameSite=Lax`;

    // Dispatch auth change event
    window.dispatchEvent(new Event('auth-change'));
}

export function clearStoredAuth(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('myqurani_user_profile'); // Clear cached profile

    // Clear cookies
    document.cookie = 'myqurani_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'myqurani_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'myqurani_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    window.dispatchEvent(new Event('auth-change'));
}

export function getAuthToken(): string | undefined {
    return getStoredAuth()?.accessToken;
}

// ============================================
// Token Refresh
// ============================================

async function tryRefreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
        const stored = getStoredAuth();
        if (!stored?.refreshToken) {
            console.log('[API] No refresh token available');
            return false;
        }

        console.log('[API] Attempting to refresh token...');

        const response = await fetch(`${API_BASE}/api/v1/Auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: stored.refreshToken }),
        });

        if (!response.ok) {
            console.error('[API] Token refresh failed:', response.status);
            clearStoredAuth();
            return false;
        }

        const result = await response.json();
        const data = result.data || result;

        if (!data.accessToken) {
            console.error('[API] No access token in refresh response');
            clearStoredAuth();
            return false;
        }

        const newAuth: AuthData = {
            userId: data.userId || stored.userId,
            email: data.email || stored.email,
            username: data.username || stored.username,
            name: data.name || stored.name,
            image: data.image || stored.image,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || stored.refreshToken,
            expiresAt: data.accessTokenExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            roles: data.roles || stored.roles || [],
        };

        setStoredAuth(newAuth);
        console.log('[API] Token refreshed successfully!');
        return true;
    } catch (e) {
        console.error('[API] Token refresh error:', e);
        clearStoredAuth();
        return false;
    }
}

// ============================================
// API Request Function
// ============================================

export async function apiRequest<T>(
    endpoint: string,
    options: ApiOptions = {},
    isRetry: boolean = false
): Promise<T> {
    const { method = 'GET', body, headers = {}, token } = options;

    // Proactively check token expiry (refresh if expires in less than 5 minutes)
    if (typeof window !== 'undefined' && !isRetry && !token) {
        const stored = getStoredAuth();
        if (stored?.expiresAt) {
            const expiresAt = new Date(stored.expiresAt).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;

            if (expiresAt - now < fiveMinutes) {
                console.log('[API] Token expiring soon, proactively refreshing...');
                await tryRefreshToken();
            }
        }
    }

    // Get token from options or storage
    const authToken = token || getAuthToken();

    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers,
        },
        signal: options.signal,
    };

    if (authToken) {
        config.headers = { ...config.headers, Authorization: `Bearer ${authToken}` };
    }

    if (body) {
        config.body = JSON.stringify(body);
        console.log(`[API] Request body:`, config.body);
    }

    console.log(`[API] ${method} ${endpoint}`);

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
        // Handle 401 Unauthorized - try to refresh token first
        if (response.status === 401 && typeof window !== 'undefined' && !isRetry) {
            console.log('[API] Got 401, attempting token refresh...');

            const refreshed = await tryRefreshToken();
            if (refreshed) {
                // Retry the request with new token
                const newToken = getAuthToken();
                if (newToken) {
                    console.log('[API] Retrying request with new token...');
                    return apiRequest<T>(endpoint, { ...options, token: newToken }, true);
                }
            }

            // Refresh failed, redirect to login
            console.log('[API] Refresh failed, redirecting to login...');
            window.location.href = '/login';
            throw new Error('Session expired. Redirecting to login...');
        }

        const errorText = await response.text();
        let errorMessage = `API Error: ${response.status}`;

        try {
            const errorJson = JSON.parse(errorText);
            // Suppress console.error here to avoid triggering Next.js Error Overlay for expected fallbacks (e.g. 404s).
            // The error is thrown and handled by the caller anyway.
            
            // Handle .NET ProblemDetails format (errors object with field names)
            if (errorJson.errors) {
                const errorParts: string[] = [];
                Object.entries(errorJson.errors).forEach(([field, msgs]) => {
                    if (Array.isArray(msgs)) {
                        errorParts.push(`${field}: ${(msgs as string[]).join(', ')}`);
                    }
                });
                errorMessage = errorParts.length > 0
                    ? errorParts.join(' | ')
                    : (errorJson.title || errorJson.message || errorJson.error || errorMessage);
            } else {
                errorMessage = errorJson.message || errorJson.error || errorJson.title || errorMessage;
            }
        } catch {
            errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);

    }

    const responseText = await response.text();
    if (!responseText) {
        return {} as T;
    }

    return JSON.parse(responseText);
}

// ============================================
// Auth API
// ============================================

export const authApi = {
    async login(emailOrUsername: string, password: string): Promise<AuthData> {
        const response = await fetch(`${API_BASE}/api/v1/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrUsername, password }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Login failed' }));
            throw new Error(error.message || error.error || 'Login failed');
        }

        const result = await response.json();
        const data = result.data || result;

        const auth: AuthData = {
            userId: data.userId,
            email: data.email,
            username: data.username,
            name: data.name,
            image: data.image,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.accessTokenExpiresAt,
            roles: data.roles || [],
        };

        setStoredAuth(auth);
        return auth;
    },

    async register(data: {
        email: string;
        password: string;
        username: string;
        name: string;
        countryId?: number;
        stateId?: number;
        cityId?: number;
        timezone?: string;
    }): Promise<AuthData> {
        const response = await fetch(`${API_BASE}/api/v1/Auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: data.email,
                password: data.password,
                username: data.username,
                name: data.name,
                countryId: data.countryId || 0,
                stateId: data.stateId || 0,
                cityId: data.cityId || 0,
                timezone: data.timezone || 0,
            }),
        });

        const responseText = await response.text().catch(() => '');
        let responseData: any = {};

        if (responseText) {
            try {
                const parsed = JSON.parse(responseText);
                responseData = parsed.data || parsed;
            } catch {
                // Server returned non-JSON (e.g. plain text "true" or HTML error)
                console.warn('[authApi.register] Non-JSON response:', responseText.substring(0, 200));
                // If not OK, throw a readable error
                if (!response.ok) {
                    throw new Error(responseText.substring(0, 200) || `Registration failed (${response.status})`);
                }
                // If OK but non-JSON, treat as success with no token (user needs to login)
                return {
                    userId: '',
                    email: data.email,
                    username: data.username,
                    name: data.name,
                    accessToken: '',
                    refreshToken: '',
                    expiresAt: '',
                    roles: [],
                };
            }
        }

        if (!response.ok) {
            // Extract error message from parsed JSON
            const errorMsg = responseData.message
                || responseData.error
                || responseData.title
                || `Registration failed (${response.status})`;
            throw new Error(errorMsg);
        }

        // If API returns tokens, auto-login
        if (responseData.accessToken) {
            const auth: AuthData = {
                userId: responseData.userId,
                email: responseData.email || data.email,
                username: responseData.username || data.username,
                name: responseData.name || data.name,
                image: responseData.image,
                accessToken: responseData.accessToken,
                refreshToken: responseData.refreshToken,
                expiresAt: responseData.accessTokenExpiresAt,
                roles: responseData.roles || [],
            };
            setStoredAuth(auth);
            return auth;
        }

        // Registration succeeded but no token returned (manual login required)
        return {
            userId: responseData.userId || responseData.id || '',
            email: data.email,
            username: data.username,
            name: data.name,
            accessToken: '',
            refreshToken: '',
            expiresAt: '',
            roles: [],
        };
    },

    async logout(): Promise<void> {
        const auth = getStoredAuth();
        if (auth) {
            try {
                await fetch(`${API_BASE}/api/v1/Auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${auth.accessToken}`,
                    },
                    body: JSON.stringify({ refreshToken: auth.refreshToken }),
                });
            } catch {
                // Ignore logout API errors
            }
        }
        clearStoredAuth();
    },
};

// ============================================
// User API (Extended)
// ============================================

export interface UserSearchParams {
    keyword?: string;
    role?: string;
    isBlocked?: boolean;
    countryId?: number;
    stateId?: number;
    cityId?: number;
    page?: number;
    pageSize?: number;
}

export interface UserData {
    id: number | string;
    username: string;
    name: string;
    email: string;
    image?: string;
    avatar?: string;
    role?: string;
    roles?: string[];
    isBlocked?: boolean;
    countryId?: number;
    countryName?: string;
    stateId?: number;
    stateName?: string;
    cityId?: number;
    cityName?: string;
    timezone?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const usersApi = {
    // Get current user profile
    getMe: (token?: string) =>
        apiRequest<any>('/api/v1/Users/me', { token }),

    // Update current user profile
    updateMe: (data: any, token?: string) =>
        apiRequest<any>('/api/v1/Users/me', { method: 'PUT', body: data, token }),

    // Update user by ID (Admin)
    updateById: (userId: number | string, data: any, token?: string) =>
        apiRequest<any>(`/api/v1/Users/${userId}`, { method: 'PUT', body: data, token }),

    // Get user by ID
    getById: (userId: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Users/${userId}`, { token }),

    // Search users with offset pagination (Admin)
    // Note: API uses PascalCase for query params (Keyword, Page, PageSize)
    search: (params: UserSearchParams = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.keyword) searchParams.append('Keyword', params.keyword);
        if (params.role) searchParams.append('Role', params.role);
        if (typeof params.isBlocked === 'boolean') searchParams.append('IsBlocked', String(params.isBlocked));
        if (params.countryId) searchParams.append('CountryId', params.countryId.toString());
        if (params.stateId) searchParams.append('StateId', params.stateId.toString());
        if (params.cityId) searchParams.append('CityId', params.cityId.toString());
        if (params.page) searchParams.append('Page', params.page.toString());
        if (params.pageSize) searchParams.append('PageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Users/search${query ? `?${query}` : ''}`, { token, signal });
    },

    // Search users with cursor pagination
    searchCursor: (params: UserSearchParams & { cursor?: number } = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params.keyword) searchParams.append('Keyword', params.keyword);
        if (params.role) searchParams.append('Role', params.role);
        if (typeof params.isBlocked === 'boolean') searchParams.append('IsBlocked', String(params.isBlocked));
        if (params.countryId) searchParams.append('CountryId', params.countryId.toString());
        if (params.stateId) searchParams.append('StateId', params.stateId.toString());
        if (params.cityId) searchParams.append('CityId', params.cityId.toString());
        if (params.cursor) searchParams.append('Cursor', params.cursor.toString());
        if (params.pageSize) searchParams.append('PageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Users/searchCursor${query ? `?${query}` : ''}`, { token });
    },

    // Upload profile image
    uploadImage: async (file: File, token?: string) => {
        const formData = new FormData();
        formData.append('file', file);

        const auth = getStoredAuth();
        const useToken = token || auth?.accessToken;

        const response = await fetch(`${API_BASE}/api/v1/Users/me/image`, {
            method: 'POST',
            headers: {
                ...(useToken ? { 'Authorization': `Bearer ${useToken}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Upload failed: ${response.status}`);
        }

        return response.json();
    },

    // Get online status for multiple users
    getOnlineStatus: (userIds: (number | string)[], token?: string) =>
        apiRequest<any>('/api/v1/Users/online-status', {
            method: 'POST',
            body: { userIds },
            token
        }),
};

// Legacy alias for backward compatibility
export const userApi = usersApi;

// ============================================
// Tickets API (for Admin)
// ============================================

export const ticketsApi = {
    // Get all tickets (may require admin role)
    getTickets: (params: {
        page?: number;
        pageSize?: number;
        status?: number;
        priority?: number;
        keyword?: string;
    } = {}, token?: string, options: { signal?: AbortSignal } = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        if (params.status) searchParams.append('status', params.status.toString());
        if (params.priority) searchParams.append('priority', params.priority.toString());
        if (params.keyword) searchParams.append('keyword', params.keyword);
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/tickets${query ? `?${query}` : ''}`, { token, signal: options.signal });
    },

    // Get tickets for current user (for non-admin users)
    getMyTickets: (params: {
        page?: number;
        pageSize?: number;
        status?: number;
        priority?: number;
    } = {}, token?: string, options: { signal?: AbortSignal } = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        if (params.status) searchParams.append('status', params.status.toString());
        if (params.priority) searchParams.append('priority', params.priority.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/tickets/my${query ? `?${query}` : ''}`, { token, signal: options.signal });
    },

    getTicketById: (id: number | string, token?: string, options: { signal?: AbortSignal } = {}) =>
        apiRequest<any>(`/api/v1/tickets/${id}`, { token, signal: options.signal }),

    // Get ticket detail for current user's own ticket
    getMyTicketById: (id: number | string, token?: string, options: { signal?: AbortSignal } = {}) =>
        apiRequest<any>(`/api/v1/tickets/my/${id}`, { token, signal: options.signal }),

    createTicket: (data: any, token?: string) =>
        apiRequest<any>('/api/v1/tickets', { method: 'POST', body: data, token }),

    replyTicket: (id: number | string, data: { name?: string; message: string }, token?: string) =>
        apiRequest<any>(`/api/v1/tickets/${id}/reply`, {
            method: 'POST',
            body: { message: data.message },  // API only accepts 'message' field
            token
        }),

    closeTicket: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/tickets/${id}/close`, { method: 'PUT', token }),

    assignTicket: (id: number | string, userId: string | number, token?: string) =>
        apiRequest<any>(`/api/v1/tickets/${id}/assign`, {
            method: 'PUT',
            body: { assigneeId: userId },
            token
        }),

    uploadAttachment: async (id: number | string, file: File, token?: string) => {
        const authToken = token || getStoredAuth()?.accessToken;
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE}/api/v1/tickets/${id}/attachments`, {
            method: 'POST',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            body: formData,
        });
        
        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'Upload failed');
        }
        return response.json();
    },
};

// ============================================
// Setoran API
// ============================================

export const setoranApi = {
    // New endpoints from API docs (api.myqurani.com/openapi/qurani.json)
    getSessions: (params: {
        page?: number;
        pageSize?: number;
    } = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/setoran/sessions${query ? `?${query}` : ''}`, { token });
    },

    getSessionById: (id: string, token?: string) =>
        apiRequest<any>(`/api/v1/setoran/sessions/${id}`, { token }),

    getStats: (token?: string) =>
        apiRequest<any>('/api/v1/setoran/stats', { token }),

    // Legacy endpoints (may still work)
    getReceived: (params: {
        page?: number;
        pageSize?: number;
    } = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('Page', params.page.toString());
        if (params.pageSize) searchParams.append('PageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/qurani/setoran/received${query ? `?${query}` : ''}`, { token });
    },

    getMy: (params: {
        page?: number;
        pageSize?: number;
    } = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('Page', params.page.toString());
        if (params.pageSize) searchParams.append('PageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/qurani/setoran/my${query ? `?${query}` : ''}`, { token });
    },

    verify: (data: { id: string; isApproved: boolean; notes?: string }, token?: string) =>
        apiRequest<any>('/api/v1/qurani/setoran/verify', { method: 'PUT', body: data, token }),
};

// ============================================
// Groups API (from api.myqurani.com/openapi/sosmed.json)
// ============================================

export interface GroupSearchParams {
    Keyword?: string;
    Type?: 'public' | 'private' | 'secret';
    CategoryId?: number | string;
    CountryId?: number | string;
    CountryCode?: string;
    StateId?: number | string;
    CityId?: number | string;
    CreatedBy?: string;
    IsActive?: boolean;
    IsVerified?: number;
    Page?: number;
    PageSize?: number;
    Cursor?: number;  // For cursor pagination
}

export interface CreateGroupData {
    Name: string;
    Slug?: string;
    Description?: string;
    Type?: 'public' | 'private' | 'secret';
    CategoryId?: number;
    Category?: string;
    Email?: string;
    Phone?: string;
    Website?: string;
    SocialLinks?: string;
    CountryId?: number;
    CountryCode?: string;
    Country?: string;
    StateId?: number;
    State?: string;
    CityId?: number;
    City?: string;
    Address?: string;
    PostalCode?: string;
    Latitude?: number;
    Longitude?: number;
    Timezone?: string;
    Language?: string;
    Rules?: string;
    PostPermission?: 'anyone' | 'admins' | 'approved';
    RequireApproval?: number;
}

export interface UpdateGroupData {
    Name?: string;
    Description?: string;
    Type?: 'public' | 'private' | 'secret';
    CategoryId?: number;
    Email?: string;
    Phone?: string;
    Website?: string;
    SocialLinks?: string;
    CountryId?: number;
    StateId?: number;
    CityId?: number;
    Address?: string;
    PostalCode?: string;
    Rules?: string;
    PostPermission?: 'anyone' | 'admins' | 'approved';
    RequireApproval?: number;
}

export const groupsApi = {
    // Search groups with offset pagination
    search: (params: GroupSearchParams = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Groups/search${query ? `?${query}` : ''}`, { token });
    },

    // Search groups with cursor pagination
    searchCursor: (params: GroupSearchParams = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Groups/searchCursor${query ? `?${query}` : ''}`, { token });
    },

    // Get group details by ID
    getById: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}`, { token }),

    // Create a new group
    create: async (data: CreateGroupData, imageFile?: File, token?: string) => {
        // Groups API uses form-data for creation (supports image upload)
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });
        if (imageFile) {
            formData.append('ImageFile', imageFile);
        }

        const auth = getStoredAuth();
        const useToken = token || auth?.accessToken;

        const response = await fetch(`${API_BASE}/api/v1/Groups`, {
            method: 'POST',
            headers: {
                ...(useToken ? { 'Authorization': `Bearer ${useToken}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API Error: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    },

    // Update group
    update: (id: number | string, data: UpdateGroupData, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}`, {
            method: 'PUT',
            body: data,
            token
        }),

    // Delete group (Admin only)
    delete: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}`, {
            method: 'DELETE',
            token
        }),

    // Join group by invite code
    join: (inviteCode: string, token?: string) =>
        apiRequest<any>('/api/v1/Groups/join', {
            method: 'POST',
            body: { InviteCode: inviteCode },
            token
        }),

    // Leave group
    leave: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}/leave`, {
            method: 'POST',
            token
        }),

    // Get group members
    getMembers: (id: number | string, params: { page?: number; pageSize?: number } = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Groups/${id}/members${query ? `?${query}` : ''}`, { token });
    },

    // Add member to group (Owner/Admin only)
    addMember: (groupId: number | string, userId: number | string, role?: string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${groupId}/members`, {
            method: 'POST',
            body: { UserId: userId, Role: role },
            token
        }),

    // Upload group logo
    uploadLogo: async (id: number | string, file: File, token?: string) => {
        const formData = new FormData();
        formData.append('file', file);

        const auth = getStoredAuth();
        const useToken = token || auth?.accessToken;

        const response = await fetch(`${API_BASE}/api/v1/Groups/${id}/logo`, {
            method: 'POST',
            headers: {
                ...(useToken ? { 'Authorization': `Bearer ${useToken}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Upload failed: ${response.status}`);
        }

        return response.json();
    },

    // Upload group banner
    uploadBanner: async (id: number | string, file: File, token?: string) => {
        const formData = new FormData();
        formData.append('file', file);

        const auth = getStoredAuth();
        const useToken = token || auth?.accessToken;

        const response = await fetch(`${API_BASE}/api/v1/Groups/${id}/banner`, {
            method: 'POST',
            headers: {
                ...(useToken ? { 'Authorization': `Bearer ${useToken}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Upload failed: ${response.status}`);
        }

        return response.json();
    },

    // Get invite code for group
    getInviteCode: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}/invite`, { token }),

    // Regenerate invite code
    regenerateInviteCode: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}/regenerate-invite`, {
            method: 'POST',
            token
        }),

    // Verify group (Admin only)
    // Verified: 1 = verified, 0 = unverified
    verify: async (id: number | string, verified: number = 1, token?: string) => {
        console.log('[Groups API] Verify request:', { id, verified, body: { Verified: verified } });
        return apiRequest<any>(`/api/v1/Groups/${id}/verify`, {
            method: 'POST',
            body: { Verified: verified },
            token
        });
    },

    // Update group status (Admin only)
    updateStatus: (id: number | string, status: 'active' | 'inactive' | 'suspended', token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}/status`, {
            method: 'POST',
            body: { status },
            token
        }),

    // Update member role (Admin only)
    updateMemberRole: (groupId: number | string, memberId: number | string, role: string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${groupId}/members/${memberId}`, {
            method: 'PUT',
            body: { role },
            token
        }),

    // Remove member from group (Admin only)
    removeMember: (groupId: number | string, memberId: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${groupId}/members/${memberId}`, {
            method: 'DELETE',
            token
        }),

    // Get join requests for group
    getJoinRequests: (id: number | string, params: { page?: number; pageSize?: number } = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Groups/${id}/join-requests${query ? `?${query}` : ''}`, { token });
    },

    // Approve/Reject join request
    handleJoinRequest: (groupId: number | string, requestId: number | string, action: 'approve' | 'reject', token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${groupId}/join-requests/${requestId}`, {
            method: 'POST',
            body: { action },
            token
        }),

    // Get group settings
    getSettings: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}/settings`, { token }),

    // Update group settings
    updateSettings: (id: number | string, settings: Record<string, any>, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/${id}/settings`, {
            method: 'PUT',
            body: settings,
            token
        }),

    // Alias for removeMember to match component usage
    deleteMember: (groupId: string | number, memberId: string | number, token?: string) =>
        apiRequest<{ success: boolean; data: boolean; message: string | null }>(
            `/api/v1/Groups/${groupId}/members/${memberId}`,
            { method: 'DELETE', token }
        ),

    /**
     * Remove multiple members from a group
     * Calls deleteMember for each member ID
     */
    deleteMembers: async (
        groupId: string | number,
        memberIds: (string | number)[],
        token?: string
    ): Promise<{ successCount: number; failCount: number; errors: string[] }> => {
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (const memberId of memberIds) {
            try {
                await groupsApi.deleteMember(groupId, memberId, token);
                successCount++;
            } catch (error) {
                failCount++;
                errors.push(`Failed to remove member ${memberId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        return { successCount, failCount, errors };
    },

    // Get group by invite code
    getByInviteCode: (inviteCode: string, token?: string) =>
        apiRequest<any>(`/api/v1/Groups/invite/${inviteCode}`, { token }),

    // Group Categories
    getCategories: (params: { page?: number; pageSize?: number } = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/GroupCategories${query ? `?${query}` : ''}`, { token });
    },
};

// ============================================
// Roles API (from /openapi/system.json)
// ============================================

export interface RoleData {
    id: number | string;
    name: string;
    description?: string;
}

export const rolesApi = {
    // Get all available roles
    getAll: (token?: string) =>
        apiRequest<any>('/api/v1/Roles', { token }),

    // Get roles for a specific user
    getUserRoles: (userId: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Roles/user/${userId}`, { token }),

    // Get roles for current user
    getMyRoles: (token?: string) =>
        apiRequest<any>('/api/v1/Roles/me', { token }),

    // Assign a role to a user (Admin only)
    assign: (userId: number | string, roleName: string, token?: string) =>
        apiRequest<any>('/api/v1/Roles/assign', {
            method: 'POST',
            body: { userId, roleName },
            token
        }),

    // Remove a role from a user (Admin only)
    remove: (userId: number | string, roleName: string, token?: string) =>
        apiRequest<any>('/api/v1/Roles/remove', {
            method: 'POST',
            body: { userId, roleName },
            token
        }),
};

// ============================================
// Permissions API (/api/v1/permissions)
// ============================================

export interface PermissionData {
    id: number;
    name: string;
    displayName?: string | null;
    description?: string | null;
    category: string;
}

export const permissionsApi = {
    // GET /api/v1/permissions — Ambil semua permissions
    getAll: (token?: string) =>
        apiRequest<any>('/api/v1/permissions', { token }),

    // POST /api/v1/permissions — Buat permission baru (Admin only)
    create: (data: { name: string; displayName?: string | null; description?: string | null; category?: string | null }, token?: string) =>
        apiRequest<any>('/api/v1/permissions', {
            method: 'POST',
            body: data,
            token,
        }),

    // GET /api/v1/permissions/by-category — Permission dikelompokkan per kategori
    getByCategory: (token?: string) =>
        apiRequest<any>('/api/v1/permissions/by-category', { token }),

    // GET /api/v1/permissions/categories — Daftar semua kategori
    getCategories: (token?: string) =>
        apiRequest<any>('/api/v1/permissions/categories', { token }),

    // GET /api/v1/permissions/check/{permissionName} — Cek apakah user punya permission
    check: (permissionName: string, token?: string) =>
        apiRequest<any>(`/api/v1/permissions/check/${permissionName}`, { token }),

    // GET /api/v1/permissions/me — Permission milik user saat ini
    getMine: (token?: string) =>
        apiRequest<any>('/api/v1/permissions/me', { token }),

    // GET /api/v1/permissions/role/{roleId} — Permission untuk role tertentu
    getForRole: (roleId: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/permissions/role/${roleId}`, { token }),

    // POST /api/v1/permissions/role/{roleId} — Assign permission ke role
    assignToRole: (roleId: number | string, permissionId: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/permissions/role/${roleId}`, {
            method: 'POST',
            body: { permissionId },
            token,
        }),

    // DELETE /api/v1/permissions/role/{roleId} — Hapus permission dari role
    removeFromRole: (roleId: number | string, permissionId: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/permissions/role/${roleId}`, {
            method: 'DELETE',
            body: { permissionId },
            token,
        }),
};

// ============================================
// Notifications API (from Swagger screenshots)
// ============================================

export const notificationsApi = {
    // GET /api/v1/Notifications/searchCursor
    getWithCursor: async (params: { cursor?: string, pageSize?: number, type?: string, category?: string, isRead?: boolean } = {}, token?: string) => {
        const queryParams = new URLSearchParams();
        if (params.cursor) queryParams.append('Cursor', params.cursor);
        if (params.pageSize) queryParams.append('PageSize', params.pageSize.toString());
        if (params.type) queryParams.append('Type', params.type);
        if (params.category) queryParams.append('Category', params.category);
        if (params.isRead !== undefined) queryParams.append('IsRead', String(params.isRead));
        const qs = queryParams.toString();
        try {
            return await apiRequest<any>(`/api/v1/Notifications/searchCursor${qs ? `?${qs}` : ''}`, { token });
        } catch (error) {
            return { data: [] }; // Silent fallback to avoid breaking UI/console
        }
    },

    // GET /api/v1/Notifications/{id}
    getById: (id: string | number, token?: string) =>
        apiRequest<any>(`/api/v1/Notifications/${id}`, { token }),

    // GET /api/v1/Notifications/unread-count
    getUnreadCount: async (token?: string) => {
        try {
            return await apiRequest<any>('/api/v1/Notifications/unread-count', { token });
        } catch {
            return { data: 0 };
        }
    },

    // POST /api/v1/Notifications/{id}/read
    markAsRead: (id: string | number, token?: string) =>
        apiRequest<any>(`/api/v1/Notifications/${id}/read`, { method: 'POST', token }),

    // POST /api/v1/Notifications/read-all
    markAllAsRead: (token?: string) =>
        apiRequest<any>('/api/v1/Notifications/read-all', { method: 'POST', token }),

    // DELETE /api/v1/Notifications/{id}
    delete: (id: string | number, token?: string) =>
        apiRequest<any>(`/api/v1/Notifications/${id}`, { method: 'DELETE', token }),

    // DELETE /api/v1/Notifications (Clear all or delete multiple)
    deleteMultiple: (ids?: (string | number)[], token?: string) => {
        return apiRequest<any>('/api/v1/Notifications', { 
            method: 'DELETE', 
            body: ids ? { notificationIds: ids } : undefined,
            token 
        })
    },

    // DELETE /api/v1/Notifications/clear-all
    // Menghapus SEMUA notifikasi milik user yang sedang login
    clearAll: (token?: string) =>
        apiRequest<any>('/api/v1/Notifications/clear-all', { method: 'DELETE', token }),

    // POST /api/v1/Notifications/send (Admin only)
    // Mengirim notifikasi ke user tertentu atau secara broadcast
    send: (payload: {
        userIds?: number[] | null;
        targetFilter?: {
            platform?: string | null;
            countryCode?: string | null;
            locale?: string | null;
            minAppVersion?: string | null;
            topic?: string | null;
        } | null;
        title: string;
        message: string;
        type?: string;
        priority?: string;
        category?: string;
        imageUrl?: string | null;
        actionUrl?: string | null;
        actionData?: string | null;
        actionButtons?: {
            id: string;
            title: string;
            url?: string | null;
            action?: string | null;
        }[];
        channels?: string[];
        scheduledAt?: string | null;
        expiresAt?: string | null;
    }, token?: string) =>
        apiRequest<any>('/api/v1/Notifications/send', {
            method: 'POST',
            body: payload,
            token,
        }),

    // POST /api/v1/Notifications/test-push (Admin only)
    testPush: (token?: string) =>
        apiRequest<any>('/api/v1/Notifications/test-push', { method: 'POST', token }),

    // GET /api/v1/Notifications/preferences
    getPreferences: (token?: string) =>
        apiRequest<any>('/api/v1/Notifications/preferences', { token }),
};


// ============================================
// Masterdata API (from /openapi/masterdata.json)
// ============================================

export interface CountryData {
    id: number;
    name: string;
    iso3?: string | null;
    iso2?: string | null;
    numericCode?: string | null;
    phoneCode?: string | null;
    capital?: string | null;
    currency?: string | null;
    currencyName?: string | null;
    currencySymbol?: string | null;
    tld?: string | null;
    native?: string | null;
    population?: number | null;
    gdp?: number | null;
    region?: string | null;
    regionId?: number | null;
    subregion?: string | null;
    subregionId?: number | null;
    nationality?: string | null;
    timezones?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    emoji?: string | null;
    emojiU?: string | null;
    flag?: number;
    statesCount?: number;
    citiesCount?: number;
}

// Country list item (simplified version for list views)
export interface CountryListItem {
    id: number;
    name: string;
    iso2?: string | null;
    iso3?: string | null;
    phoneCode?: string | null;
    emoji?: string | null;
}

// Request body for creating/updating country
export interface CountryRequest {
    name: string;
    iso3?: string | null;
    iso2?: string | null;
    numericCode?: string | null;
    phoneCode?: string | null;
    capital?: string | null;
    currency?: string | null;
    currencyName?: string | null;
    currencySymbol?: string | null;
    tld?: string | null;
    native?: string | null;
    population?: number | null;
    gdp?: number | null;
    region?: string | null;
    regionId?: number | null;
    subregion?: string | null;
    subregionId?: number | null;
    nationality?: string | null;
    timezones?: string | null;
    translations?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    emoji?: string | null;
    emojiU?: string | null;
    flag?: number;
    wikiDataId?: string | null;
}

// API Response wrappers
export interface CountryApiResponse {
    success: boolean;
    message?: string;
    data: CountryData;
}

export interface CountriesApiResponse {
    success: boolean;
    message?: string;
    data: CountryData[];
}

export interface StateData {
    id: number;
    name: string;
    countryId: number;
    country?: string;
    countryCode?: string;
    fipsCode?: string | null;
    iso2?: string | null;
    iso3166_2?: string | null;
    type?: string | null;
    level?: number | null;
    parentId?: number | null;
    native?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
    population?: string | null;
    flag?: number;
    citiesCount?: number;
}

export interface StateRequest {
    name: string;
    countryId: number;
    country: string;
    countryCode: string;
    fipsCode?: string | null;
    iso2?: string | null;
    iso3166_2?: string | null;
    type?: string | null;
    level?: number | null;
    parentId?: number | null;
    native?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
    translations?: string | null;
    flag?: number;
    wikiDataId?: string | null;
    population?: string | null;
}

export interface StateApiResponse {
    success: boolean;
    message?: string;
    data: StateData;
}

export interface StatesApiResponse {
    success: boolean;
    message?: string;
    data: StateData[];
}

export interface CityData {
    id: number;
    name: string;
    stateId: number;
    state?: string;
    stateCode?: string;
    countryId: number;
    country?: string;
    countryCode?: string;
    type?: string;
    level?: number;
    parentId?: number;
    latitude?: number;
    longitude?: number;
    native?: string;
    population?: number;
    timezone?: string;
    flag?: number;
}

export interface CityRequest {
    name: string;
    stateId: number;
    state: string;
    stateCode: string;
    countryId: number;
    country: string;
    countryCode: string;
    type?: string | null;
    level?: number | null;
    parentId?: number | null;
    latitude?: number | null;   // Match StateRequest pattern (number, not string)
    longitude?: number | null;  // Match StateRequest pattern (number, not string)
    native?: string | null;
    population?: number | null;
    timezone?: string | null;
    translations?: string | null;
    flag?: number;
    wikiDataId?: string | null;
}

export interface CityApiResponse {
    success: boolean;
    message?: string;
    data: CityData;
}

export interface CitiesApiResponse {
    success: boolean;
    message?: string;
    data: CityData[];
}

export interface CurrencyData {
    id: number;
    name: string;
    code: string;
    majorSymbol?: string;
    decimalPlaces?: number;
    nativeName?: string;
    symbol?: string; // keeping for backward compatibility if any
    symbolNative?: string; // keeping for backward compatibility if any
    decimalDigits?: number; // keeping for backward compatibility if any
    rounding?: number;
    namePlural?: string;
    type?: string;
    countriesCount?: number;
}

export interface CurrencyRequest {
    name: string;
    code: string;
    symbol?: string | null;
    symbolNative?: string | null;
    decimalDigits?: number | null;
    rounding?: number | null;
    namePlural?: string | null;
    type?: string | null;
}

export interface CurrencyApiResponse {
    success: boolean;
    message?: string;
    data: CurrencyData;
}

export interface CurrenciesApiResponse {
    success: boolean;
    message?: string;
    data: CurrencyData[];
}

export interface LanguageData {
    id: string;                    // e.g. "en", "ar"
    iso639_2?: string | null;
    iso639_3?: string | null;
    name: string;
    nativeName?: string | null;
    script?: string | null;
    scriptCode?: string | null;
    direction: string;             // "ltr" | "rtl"
    family?: string | null;
    speakers?: string | number | null;     // API accepts and returns as string e.g. "1000000"
    primaryCountry?: string | null;
    countries?: string | null;
    isActive?: number;
    isDefault?: number;
    flagEmoji?: string | null;
    displayOrder?: number;
}

export interface LanguagesApiResponse {
    success: boolean;
    message?: string;
    data: LanguageData[];
}

export interface LanguageApiResponse {
    success: boolean;
    message?: string;
    data: LanguageData;
}

export interface LanguageRequest {
    id: string;                         // required: language code e.g. "en"
    name: string;                       // required: e.g. "English"
    iso639_2?: string | null;
    iso639_3?: string | null;
    nativeName?: string | null;
    script?: string | null;
    scriptCode?: string | null;
    direction: string;                  // required: "LTR" | "RTL" (uppercase)
    family?: string | null;
    speakers?: string | number | null;     // send as string e.g. "1000000" — API accepts string
    primaryCountry?: string | null;
    countries?: string | null;
    pluralRules?: string | null;
    dateFormat?: string | null;
    timeFormat?: string | null;
    numberFormat?: string | null;
    isActive?: number | null;           // 1 = active, 0 = inactive
    isFullyTranslated?: number | null;  // 0 or 1
    translationPercent?: number | null; // 0-100
    isDefault?: number | null;          // 0 or 1
    displayOrder?: number | null;       // sort order
    FlagEmoji?: string | null;          // Note: API uses capital F
    flagEmoji?: string | null;          // alias (camelCase)
    notes?: string | null;
}

export interface TimezoneData {
    id: number;
    code: string;
    name: string;
    abbreviation?: string | null;
    abbreviationDst?: string | null;
    utcOffset: number;
    utcOffsetStr: string;
    dstOffset: number;
    observesDst: number;
    currentlyInDst: number;
    dstStart?: string | null;
    dstEnd?: string | null;
    countryCode?: string | null;
    countries?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    linkedTimezone?: string | null;
    isActive: number;
    displayOrder: number;
    notes?: string | null;
}

export interface TimezoneRequest {
    code: string;
    name: string;
    abbreviation?: string | null;
    abbreviationDst?: string | null;
    utcOffset: number;
    utcOffsetStr: string;
    dstOffset: number;
    observesDst: number;
    currentlyInDst: number;
    dstStart?: string | null;
    dstEnd?: string | null;
    countryCode?: string | null;
    countries?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    linkedTimezone?: string | null;
    isActive: number;
    displayOrder: number;
    notes?: string | null;
}

export interface TimezoneApiResponse {
    success: boolean;
    message?: string;
    data: TimezoneData;
}

export interface TimezonesApiResponse {
    success: boolean;
    message?: string;
    data: TimezoneData[];
}

export const masterdataApi = {
    // ========== Countries ==========
    countries: {
        // Get all countries (cached for 24 hours, now includes region and states/cities counts via Supabase)
        getAll: async (token?: string, signal?: AbortSignal): Promise<CountriesApiResponse> => {
            try {
                const res = await fetch('/api/masterdata/countries', {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal
                });
                if (!res.ok) throw new Error("Failed to fetch from Next.js proxy");
                return await res.json();
            } catch (error) {
                console.error("Error fetching all countries:", error);
                return { success: false, data: [] };
            }
        },

        // Get country by ID
        getById: (id: number | string, token?: string, signal?: AbortSignal) =>
            apiRequest<CountryApiResponse>(`/api/v1/Countries/${id}`, { token, signal }),

        // Create a new country (Admin only)
        create: (data: CountryRequest, token?: string) =>
            apiRequest<CountryApiResponse>('/api/v1/Countries', {
                method: 'POST',
                body: data,
                token
            }),

        // Update a country (Admin only)
        update: (id: number | string, data: CountryRequest, token?: string) =>
            apiRequest<CountryApiResponse>(`/api/v1/Countries/${id}`, {
                method: 'PUT',
                body: data,
                token
            }),

        // Delete a country (Admin only)
        delete: (id: number | string, token?: string) =>
            apiRequest<{ success: boolean; message: string }>(`/api/v1/Countries/${id}`, {
                method: 'DELETE',
                token
            }),

        // Get country by ISO2 code
        getByIso2: (iso2: string, token?: string, signal?: AbortSignal) =>
            apiRequest<CountryApiResponse>(`/api/v1/Countries/iso2/${iso2}`, { token, signal }),

        // Get country by ISO3 code
        getByIso3: (iso3: string, token?: string, signal?: AbortSignal) =>
            apiRequest<CountryApiResponse>(`/api/v1/Countries/iso3/${iso3}`, { token, signal }),

        // Search countries by name
        search: (query: string, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (query) searchParams.append('q', query);
            const queryString = searchParams.toString();
            return apiRequest<CountriesApiResponse>(
                `/api/v1/Countries/search${queryString ? `?${queryString}` : ''}`,
                { token, signal }
            );
        },

        // Get countries by region name
        getByRegion: (region: string, token?: string, signal?: AbortSignal) =>
            apiRequest<CountriesApiResponse>(`/api/v1/Countries/region/${encodeURIComponent(region)}`, { token, signal }),

        // Get countries by region ID
        getByRegionId: (regionId: number, token?: string, signal?: AbortSignal) =>
            apiRequest<CountriesApiResponse>(`/api/v1/Countries/region-id/${regionId}`, { token, signal }),

        // Get countries by subregion ID
        getBySubregionId: (subregionId: number, token?: string, signal?: AbortSignal) =>
            apiRequest<CountriesApiResponse>(`/api/v1/Countries/subregion-id/${subregionId}`, { token, signal }),

        // Get countries by phone code
        getByPhoneCode: (phoneCode: string, token?: string, signal?: AbortSignal) =>
            apiRequest<CountriesApiResponse>(`/api/v1/Countries/phonecode/${encodeURIComponent(phoneCode)}`, { token, signal }),

        // Get closest country to coordinates
        getClosest: (lat: number, lng: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            searchParams.append('lat', lat.toString());
            searchParams.append('lng', lng.toString());
            return apiRequest<CountryApiResponse>(
                `/api/v1/Countries/closest?${searchParams.toString()}`,
                { token, signal }
            );
        },

        // Get nearby countries
        getNearby: (params: { lat: number; lng: number; radius?: number; limit?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            searchParams.append('lat', params.lat.toString());
            searchParams.append('lng', params.lng.toString());
            if (params.radius) searchParams.append('radius', params.radius.toString());
            if (params.limit) searchParams.append('limit', params.limit.toString());
            return apiRequest<CountriesApiResponse>(
                `/api/v1/Countries/nearby?${searchParams.toString()}`,
                { token, signal }
            );
        },

        // Get countries that use a specific currency code (e.g. "IDR", "USD")
        // Uses the Next.js API Route /api/masterdata/countries as an aggregator.
        // Client sends 1 request → server fetches all country details in parallel + caches 24h.
        getByCurrencyCode: async (currencyCode: string): Promise<CountryData[]> => {
            const code = currencyCode.trim().toUpperCase();

            // 1 request to our Next.js aggregator route (which handles all 254 fetches server-side)
            const res = await fetch(`/api/masterdata/countries?currency=${encodeURIComponent(code)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (!res.ok) return [];

            const json = await res.json();
            if (!json?.success || !Array.isArray(json.data)) return [];

            return json.data as CountryData[];
        },
    },

    // ========== Timezones ==========
    timezones: {
        getAll: (token?: string, signal?: AbortSignal) =>
            apiRequest<TimezonesApiResponse>('/api/v1/Timezones', { token, signal }),
        
        getById: (id: number | string, token?: string, signal?: AbortSignal) =>
            apiRequest<TimezoneApiResponse>(`/api/v1/Timezones/${id}`, { token, signal }),

        create: (data: TimezoneRequest, token?: string) =>
            apiRequest<TimezoneApiResponse>('/api/v1/Timezones', {
                method: 'POST',
                body: data,
                token
            }),

        update: (id: number | string, data: TimezoneRequest, token?: string) =>
            apiRequest<TimezoneApiResponse>(`/api/v1/Timezones/${id}`, {
                method: 'PUT',
                body: data,
                token
            }),

        delete: (id: number | string, token?: string) =>
            apiRequest<{ success: boolean; message: string }>(`/api/v1/Timezones/${id}`, {
                method: 'DELETE',
                token
            }),

        getByCode: (code: string, token?: string, signal?: AbortSignal) =>
            apiRequest<TimezoneApiResponse>(`/api/v1/Timezones/code/${code}`, { token, signal }),
    },

    // ========== States/Provinces ==========
    states: {
        // Get all states (paginated, default limit 100)
        getAll: (params?: { page?: number; pageSize?: number; countryId?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
            if (params?.countryId) searchParams.append('countryId', params.countryId.toString());
            const queryString = searchParams.toString();
            return apiRequest<StatesApiResponse>(
                `/api/v1/States${queryString ? `?${queryString}` : ''}`,
                { token, signal }
            );
        },

        // Get state by ID (cached)
        getById: (id: number, token?: string, signal?: AbortSignal) =>
            apiRequest<StateApiResponse>(`/api/v1/States/${id}`, { token, signal }),

        // Create a new state (Admin only)
        create: (data: StateRequest, token?: string) =>
            apiRequest<StateApiResponse>('/api/v1/States', {
                method: 'POST',
                body: data,
                token
            }),

        // Update a state (Admin only)
        update: (id: number, data: StateRequest, token?: string) =>
            apiRequest<StateApiResponse>(`/api/v1/States/${id}`, {
                method: 'PUT',
                body: data,
                token
            }),

        // Delete a state (Admin only)
        delete: (id: number, token?: string) =>
            apiRequest<{ success: boolean; message?: string }>(`/api/v1/States/${id}`, {
                method: 'DELETE',
                token
            }),

        // Get states by country ID (cached for 12 hours)
        getByCountryId: (countryId: number, token?: string, signal?: AbortSignal) =>
            apiRequest<StatesApiResponse>(`/api/v1/States/country/${countryId}`, { token, signal }),

        // Get states by country code (ISO2)
        getByCountryCode: (countryCode: string, token?: string, signal?: AbortSignal) =>
            apiRequest<StatesApiResponse>(`/api/v1/States/country-code/${countryCode}`, { token, signal }),

        // Search states by name
        search: (q: string, countryId?: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (q) searchParams.append('q', q);
            if (countryId) searchParams.append('countryId', countryId.toString());
            return apiRequest<StatesApiResponse>(
                `/api/v1/States/search?${searchParams.toString()}`,
                { token, signal }
            );
        },

        // Get child states by parent ID
        getByParentId: (parentId: number, token?: string, signal?: AbortSignal) =>
            apiRequest<StatesApiResponse>(`/api/v1/States/parent/${parentId}`, { token, signal }),
    },

    // ========== Cities ==========
    cities: {
        // Get city by ID (cached)
        getById: (id: number, token?: string, signal?: AbortSignal) =>
            apiRequest<CityApiResponse>(`/api/v1/Cities/${id}`, { token, signal }),

        // Create a new city (Admin only)
        create: (data: CityRequest, token?: string) =>
            apiRequest<CityApiResponse>('/api/v1/Cities', {
                method: 'POST',
                body: data,
                token
            }),

        // Update a city (Admin only)
        update: (id: number, data: CityRequest, token?: string) =>
            apiRequest<CityApiResponse>(`/api/v1/Cities/${id}`, {
                method: 'PUT',
                body: data,
                token
            }),

        // Delete a city (Admin only)
        delete: (id: number, token?: string) =>
            apiRequest<{ success: boolean; message: string }>(`/api/v1/Cities/${id}`, {
                method: 'DELETE',
                token
            }),

        // Get cities by state ID (cached for 6 hours, paginated)
        getByState: (stateId: number, page?: number, pageSize?: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (page) searchParams.append('page', page.toString());
            if (pageSize) searchParams.append('pageSize', pageSize.toString());
            const queryString = searchParams.toString();
            return apiRequest<CitiesApiResponse>(
                `/api/v1/Cities/state/${stateId}${queryString ? `?${queryString}` : ''}`,
                { token, signal }
            );
        },

        // Get cities by country ID (cached for 6 hours, paginated)
        getByCountry: (countryId: number, page?: number, pageSize?: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (page) searchParams.append('page', page.toString());
            if (pageSize) searchParams.append('pageSize', pageSize.toString());
            const queryString = searchParams.toString();
            return apiRequest<CitiesApiResponse>(
                `/api/v1/Cities/country/${countryId}${queryString ? `?${queryString}` : ''}`,
                { token, signal }
            );
        },

        // Get cities by country code ISO2 (paginated, default limit 100)
        getByCountryCode: (countryCode: string, page?: number, pageSize?: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (page) searchParams.append('page', page.toString());
            if (pageSize) searchParams.append('pageSize', pageSize.toString());
            const queryString = searchParams.toString();
            return apiRequest<CitiesApiResponse>(
                `/api/v1/Cities/country-code/${countryCode}${queryString ? `?${queryString}` : ''}`,
                { token, signal }
            );
        },

        // Search cities by name
        search: (q?: string, stateId?: number, countryId?: number, limit?: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (q) searchParams.append('q', q);
            if (stateId) searchParams.append('stateId', stateId.toString());
            if (countryId) searchParams.append('countryId', countryId.toString());
            if (limit) searchParams.append('limit', limit.toString());
            return apiRequest<CitiesApiResponse>(`/api/v1/Cities/search?${searchParams.toString()}`, { token, signal });
        },

        // Get nearby cities (cached for 30 minutes)
        getNearby: (lat: number, lng: number, radius?: number, limit?: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            searchParams.append('lat', lat.toString());
            searchParams.append('lng', lng.toString());
            if (radius) searchParams.append('radius', radius.toString());
            if (limit) searchParams.append('limit', limit.toString());
            return apiRequest<CitiesApiResponse>(`/api/v1/Cities/nearby?${searchParams.toString()}`, { token, signal });
        },

        // Get child cities by parent ID
        getByParent: (parentId: number, token?: string, signal?: AbortSignal) =>
            apiRequest<CitiesApiResponse>(`/api/v1/Cities/parent/${parentId}`, { token, signal }),

        // Get the closest city to given coordinates
        getClosest: (lat: number, lng: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            searchParams.append('lat', lat.toString());
            searchParams.append('lng', lng.toString());
            return apiRequest<CityApiResponse>(`/api/v1/Cities/closest?${searchParams.toString()}`, { token, signal });
        },

        // Search cities by coordinates with distance info
        searchByCoordinates: (lat: number, lng: number, radius?: number, limit?: number, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            searchParams.append('lat', lat.toString());
            searchParams.append('lng', lng.toString());
            if (radius) searchParams.append('radius', radius.toString());
            if (limit) searchParams.append('limit', limit.toString());
            return apiRequest<CitiesApiResponse>(`/api/v1/Cities/search-by-coordinates?${searchParams.toString()}`, { token, signal });
        },
    },


    // ========== Locales ==========
    locales: {
        // Get all locales (cached for 24 hours)
        getAll: (token?: string, signal?: AbortSignal) =>
            apiRequest<any>('/api/v1/Locales', { token, signal }),
        
        // Get active locales only
        getActive: (token?: string, signal?: AbortSignal) =>
            apiRequest<any>('/api/v1/Locales/active', { token, signal }),

        // Get locale by ID
        getById: (id: string, token?: string, signal?: AbortSignal) =>
            apiRequest<any>(`/api/v1/Locales/${id}`, { token, signal }),

        // Search locales by name with offset pagination
        search: (params: { q?: string; page?: number; pageSize?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (params.q) searchParams.append('q', params.q);
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
            const qs = searchParams.toString();
            return apiRequest<any>(
                `/api/v1/Locales/search${qs ? `?${qs}` : ''}`,
                { token, signal }
            );
        },

        // Search locales with cursor pagination
        searchCursor: (params: { q?: string; cursor?: string; pageSize?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (params.q) searchParams.append('q', params.q);
            if (params.cursor) searchParams.append('cursor', params.cursor);
            if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
            const qs = searchParams.toString();
            return apiRequest<any>(
                `/api/v1/Locales/search/cursor${qs ? `?${qs}` : ''}`,
                { token, signal }
            );
        },

        // Create a new locale (Admin only)
        create: (data: any, token?: string) =>
            apiRequest<any>('/api/v1/Locales', {
                method: 'POST',
                body: data,
                token
            }),

        // Update a locale (Admin only)
        update: (id: string, data: any, token?: string) =>
            apiRequest<any>(`/api/v1/Locales/${id}`, {
                method: 'PUT',
                body: data,
                token
            }),

        // Delete a locale (Admin only)
        delete: (id: string, token?: string) =>
            apiRequest<any>(`/api/v1/Locales/${id}`, {
                method: 'DELETE',
                token
            }),
    },

    // ========== Languages ==========
    languages: {
        // Get all languages (cached for 24 hours)
        getAll: (token?: string, signal?: AbortSignal) =>
            apiRequest<LanguagesApiResponse>('/api/v1/Languages', { token, signal }),

        // Get active languages only (cached)
        getActive: (token?: string, signal?: AbortSignal) =>
            apiRequest<LanguagesApiResponse>('/api/v1/Languages/active', { token, signal }),

        // Get language by ID
        getById: (id: string, token?: string, signal?: AbortSignal) =>
            apiRequest<LanguageApiResponse>(`/api/v1/Languages/${id}`, { token, signal }),

        // Search languages by name with offset pagination
        search: (params: { q?: string; page?: number; pageSize?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (params.q) searchParams.append('q', params.q);
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
            const qs = searchParams.toString();
            return apiRequest<LanguagesApiResponse>(
                `/api/v1/Languages/search${qs ? `?${qs}` : ''}`,
                { token, signal }
            );
        },
        // Create a new language (Admin only)
        create: (data: LanguageRequest, token?: string) =>
            apiRequest<LanguageApiResponse>('/api/v1/Languages', {
                method: 'POST',
                body: data,
                token
            }),

        // Update a language (Admin only)
        update: (id: string, data: LanguageRequest, token?: string) =>
            apiRequest<LanguageApiResponse>(`/api/v1/Languages/${id}`, {
                method: 'PUT',
                body: data,
                token
            }),

        // Delete a language (Admin only)
        delete: (id: string, token?: string) =>
            apiRequest<{ success: boolean; message: string }>(`/api/v1/Languages/${id}`, {
                method: 'DELETE',
                token
            }),
    },

    // ========== Currencies ==========
    currencies: {
        // Get all currencies (paginated)
        getAll: (params?: { page?: number; pageSize?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
            const queryString = searchParams.toString();
            return apiRequest<CurrenciesApiResponse>(
                `/api/v1/Currencies${queryString ? `?${queryString}` : ''}`,
                { token, signal }
            );
        },

        // Get active currencies only
        getActive: (token?: string, signal?: AbortSignal) =>
            apiRequest<CurrenciesApiResponse>('/api/v1/Currencies/active', { token, signal }),

        // Get currency by ID
        getById: (id: number | string, token?: string, signal?: AbortSignal) =>
            apiRequest<CurrencyApiResponse>(`/api/v1/Currencies/${id}`, { token, signal }),

        // Get currency by code (e.g., USD, EUR, IDR)
        getByCode: (code: string, token?: string, signal?: AbortSignal) =>
            apiRequest<CurrencyApiResponse>(`/api/v1/Currencies/code/${code}`, { token, signal }),

        // Get currency by type
        getByType: (type: string, token?: string, signal?: AbortSignal) =>
            apiRequest<CurrenciesApiResponse>(`/api/v1/Currencies/type/${type}`, { token, signal }),

        // Search currencies by name or code
        search: (query: string, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (query) searchParams.append('q', query);
            const queryString = searchParams.toString();
            return apiRequest<CurrenciesApiResponse>(
                `/api/v1/Currencies/search${queryString ? `?${queryString}` : ''}`,
                { token, signal }
            );
        },

        // Search currencies with cursor-based pagination
        searchWithCursor: (params: { cursor?: string; limit?: number; query?: string }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            if (params.cursor) searchParams.append('cursor', params.cursor);
            if (params.limit) searchParams.append('limit', params.limit.toString());
            if (params.query) searchParams.append('q', params.query);
            return apiRequest<CurrenciesApiResponse>(
                `/api/v1/Currencies/search/cursor?${searchParams.toString()}`,
                { token, signal }
            );
        },

        // Create a new currency (Admin only)
        create: (data: CurrencyRequest, token?: string) =>
            apiRequest<CurrencyApiResponse>('/api/v1/Currencies', {
                method: 'POST',
                body: data,
                token
            }),

        // Update a currency (Admin only)
        update: (id: number | string, data: CurrencyRequest, token?: string) =>
            apiRequest<CurrencyApiResponse>(`/api/v1/Currencies/${id}`, {
                method: 'PUT',
                body: data,
                token
            }),

        // Delete a currency (Admin only)
        delete: (id: number | string, token?: string) =>
            apiRequest<{ success: boolean; message: string }>(`/api/v1/Currencies/${id}`, {
                method: 'DELETE',
                token
            }),
    },

    // ========== Search ==========
    search: {
        // Search states by name
        states: (params: { keyword: string; page?: number; pageSize?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            searchParams.append('keyword', params.keyword);
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
            return apiRequest<StatesApiResponse>(
                `/api/v1/Search/states?${searchParams.toString()}`,
                { token, signal }
            );
        },

        // Search cities by name
        cities: (params: { keyword: string; page?: number; pageSize?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            searchParams.append('keyword', params.keyword);
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
            return apiRequest<CitiesApiResponse>(
                `/api/v1/Search/cities?${searchParams.toString()}`,
                { token, signal }
            );
        },

        // Search countries by name
        countries: (params: { keyword: string; page?: number; pageSize?: number }, token?: string, signal?: AbortSignal) => {
            const searchParams = new URLSearchParams();
            searchParams.append('keyword', params.keyword);
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
            return apiRequest<CountriesApiResponse>(
                `/api/v1/Search/countries?${searchParams.toString()}`,
                { token, signal }
            );
        },
    },
};

// ============================================
// Payments API
// ============================================

export interface PaymentSearchParams {
    UserId?: number | string;
    TrainerId?: number | string;
    BookingId?: number | string;
    Status?: string;
    PaymentMethod?: string;
    FromDate?: string;
    ToDate?: string;
    MinAmount?: number | string;
    MaxAmount?: number | string;
    RefundRequested?: number | string;
    IsPaidOut?: number | string;
    Page?: number | string;
    PageSize?: number | string;
}

export const paymentsApi = {
    // Search payments
    search: (params: PaymentSearchParams = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Payments${query ? `?${query}` : ''}`, { token, signal });
    },

    // Export payments to CSV
    exportCSV: (params: PaymentSearchParams = {}, token?: string) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        const authToken = token || getAuthToken();
        const url = `${API_BASE}/api/v1/Payments/export${query ? `?${query}` : ''}`;
        
        return fetch(url, {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
    },

    // Get payment stats
    getStats: (params: { fromDate?: string; toDate?: string } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.fromDate) searchParams.append('fromDate', params.fromDate);
        if (params.toDate) searchParams.append('toDate', params.toDate);
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Payments/stats${query ? `?${query}` : ''}`, { token, signal });
    },

    // Get revenue analytics
    getRevenueAnalytics: (params: { fromDate?: string; toDate?: string } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.fromDate) searchParams.append('fromDate', params.fromDate);
        if (params.toDate) searchParams.append('toDate', params.toDate);
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Payments/revenue-analytics${query ? `?${query}` : ''}`, { token, signal });
    },

    // Get pending refunds
    getPendingRefunds: (params: { page?: number; pageSize?: number } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Payments/pending-refunds${query ? `?${query}` : ''}`, { token, signal });
    },

    // Process refund
    processRefund: (id: number | string, data: { approved: number; notes?: string; amount?: number }, token?: string) =>
        apiRequest<any>(`/api/v1/Payments/${id}/process-refund`, {
            method: 'POST',
            body: data,
            token
        }),

    // Get pending payouts
    getPendingPayouts: (params: { page?: number; pageSize?: number } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Payments/pending-payouts${query ? `?${query}` : ''}`, { token, signal });
    },

    // Mark payment as paid out
    markPayout: (id: number | string, data: { payoutReference: string; notes?: string }, token?: string) =>
        apiRequest<any>(`/api/v1/Payments/${id}/mark-payout`, {
            method: 'POST',
            body: data,
            token
        }),

    // Update payment status
    updateStatus: (id: number | string, data: { status: string; failureReason?: string }, token?: string) =>
        apiRequest<any>(`/api/v1/Payments/${id}/status`, {
            method: 'PUT',
            body: data,
            token
        }),

    // Bulk mark payouts
    bulkPayout: (data: { paymentIds: Array<number | string>; payoutReference: string; notes?: string }, token?: string) =>
        apiRequest<any>(`/api/v1/Payments/bulk-payout`, {
            method: 'POST',
            body: data,
            token
        }),

    // Get all disputes (Admin)
    getDisputes: (params: { page?: number | string; pageSize?: number | string; status?: string; type?: string; priority?: string } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Payments/disputes${query ? `?${query}` : ''}`, { token, signal });
    },

    // Respond to dispute (Admin)
    respondDispute: (id: number | string, data: { response: string; merchantEvidence?: string }, token?: string) =>
        apiRequest<any>(`/api/v1/Payments/disputes/${id}/respond`, {
            method: 'POST',
            body: data,
            token
        }),

    // Resolve dispute (Admin)
    resolveDispute: (id: number | string, data: { resolution: string; resolutionNotes?: string; refundAmount?: number; autoProcessRefund?: number | boolean }, token?: string) =>
        apiRequest<any>(`/api/v1/Payments/disputes/${id}/resolve`, {
            method: 'POST',
            body: data,
            token
        }),

    // Send invoice to user (Admin) - Gambar 1
    sendInvoice: (id: number | string, data: { email?: string | null; includeReceipt?: number }, token?: string) =>
        apiRequest<any>(`/api/v1/Payments/${id}/send-invoice`, {
            method: 'POST',
            body: data,
            token
        }),
        
};

// ============================================
// Wallet Admin API
// ============================================

export const walletApi = {
    // Get pending topup requests (Admin)
    getPendingTopups: (params: { page?: number; pageSize?: number } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Wallet/admin/topups/pending${query ? `?${query}` : ''}`, { token, signal });
    },

    // Get pending withdraw requests (Admin)
    getPendingWithdraws: (params: { page?: number; pageSize?: number } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Wallet/admin/withdraws/pending${query ? `?${query}` : ''}`, { token, signal });
    },

    // Approve withdraw request (Admin)
    approveWithdraw: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Wallet/admin/withdraws/${id}/approve`, { method: 'POST', token }),

    // Reject withdraw request (Admin)
    rejectWithdraw: (id: number | string, reason: string, token?: string) =>
        apiRequest<any>(`/api/v1/Wallet/admin/withdraws/${id}/reject`, {
            method: 'POST',
            body: { reason },
            token
        }),

    // Process/Complete withdraw request (Admin)
    completeWithdraw: (id: number | string, externalTransactionId: string | null, gatewayReference: string | null, token?: string) =>
        apiRequest<any>(`/api/v1/Wallet/admin/withdraws/${id}/complete`, {
            method: 'POST',
            body: { externalTransactionId, gatewayReference },
            token
        }),

    // Confirm topup request (Admin)
    confirmTopup: (id: number | string, externalReference: string | null, token?: string) =>
        apiRequest<any>(`/api/v1/Wallet/admin/topups/${id}/confirm`, {
            method: 'POST',
            body: { externalReference },
            token
        }),

    // Reject topup request (Admin)
    rejectTopup: (id: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Wallet/admin/topups/${id}/reject`, { method: 'POST', token }),

    // Get wallet statistics overview (Admin)
    getStatisticsOverview: (token?: string, signal?: AbortSignal) =>
        apiRequest<any>(`/api/v1/Wallet/admin/stats`, { token, signal }),

    // Get wallet by user ID (Admin)
    getWalletByUserId: (userId: number | string, token?: string, signal?: AbortSignal) =>
        apiRequest<any>(`/api/v1/Wallet/admin/user/${userId}`, { token, signal }),

    // Suspend wallet (Admin)
    suspendWallet: (walletId: number | string, reason: string, token?: string) =>
        apiRequest<any>(`/api/v1/Wallet/admin/${walletId}/suspend`, { method: 'POST', body: { reason }, token }),

    // Activate wallet (Admin)
    activateWallet: (walletId: number | string, token?: string) =>
        apiRequest<any>(`/api/v1/Wallet/admin/${walletId}/activate`, { method: 'POST', token }),

    // Update wallet limits (Admin)
    updateWalletLimits: (walletId: number | string, data: any, token?: string) =>
        apiRequest<any>(`/api/v1/Wallet/admin/${walletId}/limits`, { method: 'PUT', body: data, token }),

    // ── User-level / General Wallet Endpoints ─────────────────────────────────
    // NOTE: These endpoints (/api/v1/Wallet/transactions, /topups, /withdraws)
    // are user-level endpoints. When called with an admin token, they may return
    // data specific to the admin's own wallet. Admin-specific versions with full
    // user data access have been requested from the API team.

    // Get transaction history (user-scoped, will return transactions for token owner)
    getTransactions: (params: { type?: number; page?: number; pageSize?: number } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.type !== undefined) searchParams.append('type', params.type.toString());
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Wallet/transactions${query ? `?${query}` : ''}`, { token, signal });
    },

    // Get transaction by ID (user-scoped)
    getTransactionById: (id: number | string, token?: string, signal?: AbortSignal) =>
        apiRequest<any>(`/api/v1/Wallet/transactions/${id}`, { token, signal }),

    // Get topup history (user-scoped, will return topups for token owner only)
    getTopupHistory: (params: { page?: number; pageSize?: number } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Wallet/topups${query ? `?${query}` : ''}`, { token, signal });
    },

    // Get withdraw history (user-scoped, will return withdrawals for token owner only)
    getWithdrawHistory: (params: { page?: number; pageSize?: number } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Wallet/withdraws${query ? `?${query}` : ''}`, { token, signal });
    },

};

// ============================================
// Audit API
// ============================================

export const auditApi = {
    // Get audit logs for a specific user
    getUserLogs: (userId: number | string, token?: string, signal?: AbortSignal) =>
        apiRequest<any>(`/api/v1/audit-logs/user/${userId}`, { token, signal }),
};

// ============================================
// Bookings API
// ============================================

export interface BookingSearchParams {
    UserId?: number | string;
    TrainerId?: number | string;
    PackageId?: number | string;
    Status?: string;
    FromDate?: string;
    ToDate?: string;
    Page?: number | string;
    PageSize?: number | string;
}

export const bookingsApi = {
    // Get booking stats
    stats: (params: { FromDate?: string; ToDate?: string } = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        if (params.FromDate) searchParams.append('FromDate', params.FromDate);
        if (params.ToDate) searchParams.append('ToDate', params.ToDate);
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Bookings/stats${query ? `?${query}` : ''}`, { token, signal });
    },

    // Search bookings
    search: (params: BookingSearchParams = {}, token?: string, signal?: AbortSignal) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        return apiRequest<any>(`/api/v1/Bookings${query ? `?${query}` : ''}`, { token, signal });
    }
};

export { API_BASE };