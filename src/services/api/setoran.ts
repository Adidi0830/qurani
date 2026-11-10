/**
 * Setoran (Recitation) API Service for MyQurani API
 * 
 * This module handles all setoran/recitation-related API calls to api.myqurani.com
 * Endpoint base: /api/v1/qurani/setoran
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// ============================================
// Types
// ============================================

export interface SetoranListDto {
    id: string;
    userId: number;
    userName: string | null;
    sessionType: number;
    sessionTypeName: string;
    surahNumber: number;
    surahName: string | null;
    surahNameAr: string | null;
    startAyat: number;
    endAyat: number;
    overallScore: number;
    tajwidScore: number;
    totalWords: number;
    correctWords: number;
    incorrectWords: number;
    status: number;
    statusName: string;
    filename: string | null;
    startedAt: string | null;
    completedAt: string | null;
    durationSeconds: number;
    createdAt: string;
}

export interface SetoranDetailDto extends SetoranListDto {
    referenceText: string | null;
    detectedText: string | null;
    results: string | null;
    results2: string | null;
    processingTimeMs: number;
    groupId: number | null;
    groupName: string | null;
}

export interface SetoranStatsDto {
    totalSessions: number;
    completedSessions: number;
    abandonedSessions: number;
    avgOverallScore: number;
    avgTajwidScore: number;
    totalWords: number;
    correctWords: number;
    accuracyRate: number;
    totalDurationSeconds: number;
}

export interface CreateSetoranRequest {
    surahNumber: number;
    startAyat: number;
    endAyat: number;
    groupId?: number;
    scoringConfigId?: number;
}

export interface SetoranAudioDto {
    id: number;
    setoranId: string;
    audioUrl: string;
    duration: number;
    createdAt: string;
}

export interface VerifySetoranRequest {
    status: number;
    notes?: string;
}

export interface HafalanProgressDto {
    totalSurahMemorized: number;
    totalJuzMemorized: number;
    totalPagesMemorized: number;
    lastActivityDate: string | null;
    streakDays: number;
}

export interface StreakInfoDto {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
}

export interface LeaderboardEntryDto {
    rank: number;
    userId: number;
    userName: string;
    score: number;
    totalSessions: number;
}

export interface TeacherDashboardDto {
    totalStudents: number;
    activeStudents: number;
    pendingVerifications: number;
    todaysSessions: number;
    weeklyProgress: number;
}

export interface RecapCityDto {
    cityId: number;
    cityName: string;
    totalSessions: number;
    totalUsers: number;
    avgScore: number;
}

export interface SetoranCertificateDto {
    id: number;
    type: string;
    title: string;
    issuedAt: string;
    downloadUrl: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

export interface PagedResponse<T> {
    data: T[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
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

        const rawResult = await response.json();
        console.log(`[SetoranAPI] ${endpoint}:`, JSON.stringify(rawResult).substring(0, 300));

        if (!response.ok) {
            console.error('[SetoranAPI] Error:', rawResult);
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
        console.error('[SetoranAPI] Request error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Request failed',
        };
    }
}

// ============================================
// Setoran Core Endpoints
// ============================================

/**
 * Submit new setoran
 */
export async function createSetoran(request: CreateSetoranRequest): Promise<{
    success: boolean;
    data?: SetoranDetailDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<SetoranDetailDto>>('/api/v1/qurani/setoran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    return {
        success: result.success,
        data: result.data?.data,
        error: result.error,
    };
}

/**
 * Get my setoran (as depositor)
 */
export async function fetchMySetoran(
    page: number = 1,
    pageSize: number = 20
): Promise<{ success: boolean; data?: SetoranListDto[]; totalCount?: number; error?: string }> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const result = await apiRequest<ApiResponse<SetoranListDto[]>>(
        `/api/v1/qurani/setoran/my?${params.toString()}`
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    // Handle different response structures
    let setoranData: SetoranListDto[] = [];
    if (Array.isArray(result.data)) {
        setoranData = result.data;
    } else if (result.data && Array.isArray((result.data as any).data)) {
        setoranData = (result.data as any).data;
    }

    return {
        success: true,
        data: setoranData,
        totalCount: (result.data as any)?.totalCount || setoranData.length,
    };
}

/**
 * Get received setoran (as teacher/examiner)
 */
export async function fetchReceivedSetoran(
    page: number = 1,
    pageSize: number = 20
): Promise<{ success: boolean; data?: SetoranListDto[]; totalCount?: number; error?: string }> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const result = await apiRequest<ApiResponse<SetoranListDto[]>>(
        `/api/v1/qurani/setoran/received?${params.toString()}`
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    let setoranData: SetoranListDto[] = [];
    if (Array.isArray(result.data)) {
        setoranData = result.data;
    } else if (result.data && Array.isArray((result.data as any).data)) {
        setoranData = (result.data as any).data;
    }

    return {
        success: true,
        data: setoranData,
        totalCount: (result.data as any)?.totalCount || setoranData.length,
    };
}

/**
 * Get setoran by group
 */
export async function fetchSetoranByGroup(
    groupId: number,
    page: number = 1,
    pageSize: number = 20
): Promise<{ success: boolean; data?: SetoranListDto[]; totalCount?: number; error?: string }> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const result = await apiRequest<ApiResponse<SetoranListDto[]>>(
        `/api/v1/qurani/setoran/group/${groupId}?${params.toString()}`
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    let setoranData: SetoranListDto[] = [];
    if (Array.isArray(result.data)) {
        setoranData = result.data;
    } else if (result.data && Array.isArray((result.data as any).data)) {
        setoranData = (result.data as any).data;
    }

    return {
        success: true,
        data: setoranData,
        totalCount: (result.data as any)?.totalCount || setoranData.length,
    };
}

/**
 * Get setoran detail by ID
 */
export async function fetchSetoranById(id: string): Promise<{
    success: boolean;
    data?: SetoranDetailDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<SetoranDetailDto>>(`/api/v1/qurani/setoran/${id}`);

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}

/**
 * Search setoran with filters
 */
export async function searchSetoran(filters?: {
    keyword?: string;
    surahNumber?: number;
    sessionType?: number;
    status?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}): Promise<{ success: boolean; data?: SetoranListDto[]; totalCount?: number; error?: string }> {
    const params = new URLSearchParams();

    if (filters?.keyword) params.append('keyword', filters.keyword);
    if (filters?.surahNumber) params.append('surahNumber', String(filters.surahNumber));
    if (filters?.sessionType) params.append('sessionType', String(filters.sessionType));
    if (filters?.status) params.append('status', String(filters.status));
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    params.append('page', String(filters?.page || 1));
    params.append('pageSize', String(filters?.pageSize || 20));

    const result = await apiRequest<ApiResponse<SetoranListDto[]>>(
        `/api/v1/qurani/setoran/search?${params.toString()}`
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    let setoranData: SetoranListDto[] = [];
    if (Array.isArray(result.data)) {
        setoranData = result.data;
    } else if (result.data && Array.isArray((result.data as any).data)) {
        setoranData = (result.data as any).data;
    }

    return {
        success: true,
        data: setoranData,
        totalCount: (result.data as any)?.totalCount || setoranData.length,
    };
}

/**
 * Verify setoran (by teacher/parent)
 */
export async function verifySetoran(
    id: string,
    request: VerifySetoranRequest
): Promise<{ success: boolean; error?: string }> {
    const result = await apiRequest(`/api/v1/qurani/setoran/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    return { success: result.success, error: result.error };
}

// ============================================
// Audio Endpoints
// ============================================

/**
 * Upload audio for setoran
 */
export async function uploadSetoranAudio(
    setoranId: string,
    audioFile: File,
    duration: number
): Promise<{ success: boolean; data?: SetoranAudioDto; error?: string }> {
    const token = await getAuthToken();

    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    const formData = new FormData();
    formData.append('Audio', audioFile);
    formData.append('Duration', String(duration));

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/qurani/setoran/${setoranId}/audio`, {
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
 * Get audio for setoran
 */
export async function getSetoranAudio(setoranId: string): Promise<{
    success: boolean;
    data?: SetoranAudioDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<SetoranAudioDto>>(
        `/api/v1/qurani/setoran/${setoranId}/audio`
    );

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}

/**
 * Delete audio for setoran
 */
export async function deleteSetoranAudio(setoranId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const result = await apiRequest(`/api/v1/qurani/setoran/${setoranId}/audio`, {
        method: 'DELETE',
    });

    return { success: result.success, error: result.error };
}

// ============================================
// Progress & Analytics Endpoints
// ============================================

/**
 * Get hafalan progress
 */
export async function fetchHafalanProgress(): Promise<{
    success: boolean;
    data?: HafalanProgressDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<HafalanProgressDto>>(
        '/api/v1/qurani/hafalan/progress'
    );

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}

/**
 * Get streak info
 */
export async function fetchStreakInfo(): Promise<{
    success: boolean;
    data?: StreakInfoDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<StreakInfoDto>>('/api/v1/qurani/streak');

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}

/**
 * Get group leaderboard
 */
export async function fetchGroupLeaderboard(groupId: number): Promise<{
    success: boolean;
    data?: LeaderboardEntryDto[];
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<LeaderboardEntryDto[]>>(
        `/api/v1/qurani/leaderboard/group/${groupId}`
    );

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}

/**
 * Get teacher dashboard
 */
export async function fetchTeacherDashboard(): Promise<{
    success: boolean;
    data?: TeacherDashboardDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<TeacherDashboardDto>>(
        '/api/v1/qurani/teacher/dashboard'
    );

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}

/**
 * Get recap by city
 */
export async function fetchRecapByCity(filters?: {
    countryId?: number;
    year?: number;
    month?: number;
}): Promise<{
    success: boolean;
    data?: RecapCityDto[];
    error?: string;
}> {
    const params = new URLSearchParams();
    if (filters?.countryId) params.append('countryId', String(filters.countryId));
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));

    const result = await apiRequest<ApiResponse<RecapCityDto[]>>(
        `/api/v1/qurani/recap/city${params.toString() ? `?${params.toString()}` : ''}`
    );

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}

/**
 * Get certificates
 */
export async function fetchCertificates(): Promise<{
    success: boolean;
    data?: SetoranCertificateDto[];
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<SetoranCertificateDto[]>>('/api/v1/qurani/certificates');

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}

/**
 * Get setoran stats
 */
export async function fetchSetoranStats(): Promise<{
    success: boolean;
    data?: SetoranStatsDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<SetoranStatsDto>>('/api/v1/qurani/setoran/stats');

    return {
        success: result.success,
        data: result.data?.data || (result.data as any),
        error: result.error,
    };
}
