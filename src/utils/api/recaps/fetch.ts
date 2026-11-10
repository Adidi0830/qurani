"use server";

/**
 * Recaps/Setoran Fetch API
 * 
 * This module provides recap/setoran fetching functions using the MyQurani API.
 * Interface remains the same as before for backward compatibility.
 */

import { IRecap, MonthRecap } from "@/types/recap";
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// ============================================
// API Types from MyQurani
// ============================================

interface ApiSetoranListDto {
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
  groupId?: number;
  groupName?: string;
}

interface ApiSetoranDetailDto extends ApiSetoranListDto {
  referenceText: string | null;
  detectedText: string | null;
  results: string | null;
  results2: string | null;
  processingTimeMs: number;
}

// ============================================
// Helper Functions
// ============================================

async function getAuthToken(): Promise<string | null> {
  try {
    // Server-side: try cookies first
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('myqurani_access_token')?.value;
    if (cookieToken) {
      console.log('[getAuthToken] Got token from cookie');
      return cookieToken;
    }

    // If no cookie token, return null (client should pass token)
    console.log('[getAuthToken] No token in cookie');
    return null;
  } catch (e) {
    console.log('[getAuthToken] Cookie access failed (probably client-side):', e);
    return null;
  }
}

// Helper to get token from localStorage on client-side
function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('myqurani_auth');
    if (!stored) return null;
    const auth = JSON.parse(stored);
    return auth?.accessToken || null;
  } catch {
    return null;
  }
}

// Convert API setoran to IRecap format
function convertSetoranToRecap(setoran: ApiSetoranListDto): IRecap {
  // Determine session type for display
  const sessionTypeMap: Record<number, string> = {
    1: 'Tahsin',
    2: 'Tahfidz',
    3: 'Murojaah',
  };

  const recitationType = sessionTypeMap[setoran.sessionType] || setoran.sessionTypeName || 'Tahsin';

  // Build memorization string: "Surah:startAyat - Surah:endAyat"
  const memorization = setoran.surahName
    ? `${setoran.surahName}:${setoran.startAyat} - ${setoran.surahName}:${setoran.endAyat}`
    : `Surah ${setoran.surahNumber}:${setoran.startAyat} - Surah ${setoran.surahNumber}:${setoran.endAyat}`;

  // Determine conclusion based on score
  let conclusion = 'pass';
  if (setoran.overallScore >= 95) conclusion = 'excellent';
  else if (setoran.overallScore >= 85) conclusion = 'very_good';
  else if (setoran.overallScore >= 75) conclusion = 'good';
  else if (setoran.overallScore >= 60) conclusion = 'pass';
  else if (setoran.overallScore >= 40) conclusion = 'weak';
  else conclusion = 'not_pass';

  return {
    id: setoran.id,
    type: setoran.groupId ? 'group' : 'friend',
    reciter_id: String(setoran.userId),
    recitation_type: recitationType,
    memorization_type: 'surah',
    memorization: memorization,
    conclusion: conclusion,
    notes: '',
    mistakes: [],
    group_id: setoran.groupId ? String(setoran.groupId) : null,
    examiner_id: '', // Will be populated from detail if needed
    created_at: setoran.createdAt,
    paraf: setoran.status === 2, // Assuming status 2 = verified
    is_praquran: false,
    reciter: {
      id: String(setoran.userId),
      name: setoran.userName || 'Unknown User',
      full_name: setoran.userName || 'Unknown User',
      email: '',
      avatar_url: null,
      username: setoran.userName || 'user',
    } as any,
    examiner: {
      id: '',
      name: 'Examiner',
      full_name: 'Examiner',
      email: '',
      avatar_url: null,
      username: 'examiner',
    } as any,
    group: setoran.groupId ? {
      id: String(setoran.groupId),
      name: setoran.groupName || 'Group',
    } as any : undefined,
  };
}

// ============================================
// API Functions
// ============================================

export const getAllMonthRecap = async (): Promise<{
  success: boolean;
  message: string;
  data?: MonthRecap[];
}> => {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Fetch setoran to get unique months
    const response = await fetch(`${API_BASE_URL}/api/v1/qurani/setoran/my?page=1&pageSize=100`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const rawResult = await response.json();
    console.log('[getAllMonthRecap] Response:', JSON.stringify(rawResult).substring(0, 200));

    if (!response.ok) {
      return { success: false, message: rawResult.message || 'Failed to fetch recaps' };
    }

    // Parse data
    let setoranData: ApiSetoranListDto[] = [];
    if (rawResult.data && Array.isArray(rawResult.data)) {
      setoranData = rawResult.data;
    } else if (rawResult.data?.data && Array.isArray(rawResult.data.data)) {
      setoranData = rawResult.data.data;
    } else if (Array.isArray(rawResult)) {
      setoranData = rawResult;
    }

    // Extract unique months
    const uniqueMonthsMap = new Map();
    setoranData.forEach((setoran) => {
      const date = new Date(setoran.createdAt);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();

      const formattedDate = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(date);

      const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

      if (!uniqueMonthsMap.has(key)) {
        uniqueMonthsMap.set(key, {
          value: key,
          label: formattedDate,
        });
      }
    });

    const uniqueMonths = Array.from(uniqueMonthsMap.values());

    return {
      success: true,
      message: "Recap fetched successfully",
      data: uniqueMonths,
    };
  } catch (error) {
    console.error('[getAllMonthRecap] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getRecapsByExaminerId = async (
  examinerId: string,
  limit?: number,
  offset?: number
) => {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, message: 'Not authenticated', data: [] as IRecap[], count: 0 };
  }

  try {
    const page = offset !== undefined && limit !== undefined
      ? Math.floor(offset / limit) + 1
      : 1;
    const pageSize = limit || 10;

    const response = await fetch(
      `${API_BASE_URL}/api/v1/qurani/setoran/received?page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const rawResult = await response.json();
    console.log('[getRecapsByExaminerId] Response:', JSON.stringify(rawResult).substring(0, 200));

    if (!response.ok) {
      return { success: false, message: rawResult.message || 'Failed to fetch', data: [] as IRecap[], count: 0 };
    }

    let setoranData: ApiSetoranListDto[] = [];
    let totalCount = 0;

    if (rawResult.data && Array.isArray(rawResult.data)) {
      setoranData = rawResult.data;
      totalCount = rawResult.totalCount || setoranData.length;
    } else if (rawResult.data?.data && Array.isArray(rawResult.data.data)) {
      setoranData = rawResult.data.data;
      totalCount = rawResult.data.totalCount || setoranData.length;
    }

    return {
      success: true,
      message: "get recaps by Examiner id successfully",
      data: setoranData.map(convertSetoranToRecap),
      count: totalCount,
    };
  } catch (error) {
    console.error('[getRecapsByExaminerId] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error', data: [] as IRecap[], count: 0 };
  }
};

export const getRecapsByReciterId = async (
  reciterId: string,
  limit?: number,
  offset?: number
) => {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, message: 'Not authenticated', data: [] as IRecap[], count: 0 };
  }

  try {
    const page = offset !== undefined && limit !== undefined
      ? Math.floor(offset / limit) + 1
      : 1;
    const pageSize = limit || 10;

    const response = await fetch(
      `${API_BASE_URL}/api/v1/qurani/setoran/my?page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const rawResult = await response.json();
    console.log('[getRecapsByReciterId] Response:', JSON.stringify(rawResult).substring(0, 200));

    if (!response.ok) {
      return { success: false, message: rawResult.message || 'Failed to fetch', data: [] as IRecap[], count: 0 };
    }

    let setoranData: ApiSetoranListDto[] = [];
    let totalCount = 0;

    if (rawResult.data && Array.isArray(rawResult.data)) {
      setoranData = rawResult.data;
      totalCount = rawResult.totalCount || setoranData.length;
    } else if (rawResult.data?.data && Array.isArray(rawResult.data.data)) {
      setoranData = rawResult.data.data;
      totalCount = rawResult.data.totalCount || setoranData.length;
    }

    return {
      success: true,
      message: "get recaps by reciter id successfully",
      data: setoranData.map(convertSetoranToRecap),
      count: totalCount,
    };
  } catch (error) {
    console.error('[getRecapsByReciterId] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error', data: [] as IRecap[], count: 0 };
  }
};

export const getRecapById = async (id: string) => {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/qurani/setoran/${id}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const rawResult = await response.json();
    console.log('[getRecapById] Response:', JSON.stringify(rawResult).substring(0, 200));

    if (!response.ok) {
      return { success: false, message: rawResult.message || 'Failed to fetch' };
    }

    let setoranData: ApiSetoranDetailDto | null = null;
    if (rawResult.data) {
      setoranData = rawResult.data;
    } else if (rawResult.success && rawResult.data) {
      setoranData = rawResult.data;
    } else {
      setoranData = rawResult;
    }

    if (!setoranData) {
      return { success: false, message: 'No data found' };
    }

    return {
      success: true,
      message: "get recap by id successfully",
      data: convertSetoranToRecap(setoranData),
    };
  } catch (error) {
    console.error('[getRecapById] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getRecapAll = async (
  user_id: string,
  limit?: number,
  offset?: number
) => {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, message: 'Not authenticated', data: [] as IRecap[], count: 0 };
  }

  try {
    const page = offset !== undefined && limit !== undefined
      ? Math.floor(offset / limit) + 1
      : 1;
    const pageSize = limit || 10;

    // Fetch both my setoran and received setoran
    const [myResult, receivedResult] = await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/qurani/setoran/my?page=${page}&pageSize=${pageSize}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      }),
      fetch(`${API_BASE_URL}/api/v1/qurani/setoran/received?page=${page}&pageSize=${pageSize}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      }),
    ]);

    const myData = await myResult.json();
    const receivedData = await receivedResult.json();

    let allSetoran: ApiSetoranListDto[] = [];
    let totalCount = 0;

    // Parse my setoran
    if (myData.data && Array.isArray(myData.data)) {
      allSetoran = [...allSetoran, ...myData.data];
      totalCount += myData.totalCount || myData.data.length;
    } else if (myData.data?.data && Array.isArray(myData.data.data)) {
      allSetoran = [...allSetoran, ...myData.data.data];
      totalCount += myData.data.totalCount || myData.data.data.length;
    }

    // Parse received setoran
    if (receivedData.data && Array.isArray(receivedData.data)) {
      allSetoran = [...allSetoran, ...receivedData.data];
      totalCount += receivedData.totalCount || receivedData.data.length;
    } else if (receivedData.data?.data && Array.isArray(receivedData.data.data)) {
      allSetoran = [...allSetoran, ...receivedData.data.data];
      totalCount += receivedData.data.totalCount || receivedData.data.data.length;
    }

    // Remove duplicates by ID
    const uniqueSetoran = allSetoran.filter((setoran, index, self) =>
      index === self.findIndex(s => s.id === setoran.id)
    );

    // Sort by created date
    uniqueSetoran.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('[getRecapAll] Total unique setoran:', uniqueSetoran.length);

    return {
      success: true,
      message: "get recap All successfully",
      data: uniqueSetoran.map(convertSetoranToRecap),
      count: totalCount,
    };
  } catch (error) {
    console.error('[getRecapAll] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error', data: [] as IRecap[], count: 0 };
  }
};

// Admin function to get ALL recaps without user filtering
export const getRecapAllAdmin = async (
  limit?: number,
  offset?: number,
  clientToken?: string // Token passed from client-side
) => {
  // Try server cookie first, fallback to client-provided token
  let token = await getAuthToken();
  if (!token && clientToken) {
    token = clientToken;
    console.log('[getRecapAllAdmin] Using client-provided token');
  }

  if (!token) {
    console.log('[getRecapAllAdmin] No auth token available');
    return { success: false, message: 'Not authenticated', data: [] as IRecap[], count: 0 };
  }

  try {
    const page = offset !== undefined && limit !== undefined
      ? Math.floor(offset / limit) + 1
      : 1;
    const pageSize = limit || 10;

    console.log('[getRecapAllAdmin] Fetching page', page, 'pageSize', pageSize);

    // Try /api/v1/setoran/all first (admin endpoint)
    let allSetoranUrl = `${API_BASE_URL}/api/v1/setoran/all?page=${page}&pageSize=${pageSize}`;
    console.log('[getRecapAllAdmin] Trying admin endpoint:', allSetoranUrl);

    let response = await fetch(allSetoranUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    let responseText = await response.text();
    console.log('[getRecapAllAdmin] Admin response status:', response.status);
    console.log('[getRecapAllAdmin] Admin response text:', responseText?.substring(0, 300) || '(empty)');

    // If 403 Forbidden, try sessions endpoint
    if (response.status === 403 || response.status === 404) {
      console.log('[getRecapAllAdmin] Admin endpoint failed, falling back to sessions endpoint');

      const sessionsUrl = `${API_BASE_URL}/api/v1/setoran/sessions?page=${page}&pageSize=${pageSize}`;
      console.log('[getRecapAllAdmin] Trying sessions endpoint:', sessionsUrl);

      response = await fetch(sessionsUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      responseText = await response.text();
      console.log('[getRecapAllAdmin] Sessions response status:', response.status);
      console.log('[getRecapAllAdmin] Sessions response text:', responseText?.substring(0, 300) || '(empty)');
    }

    // If still failing, try cursor endpoint
    if (!response.ok || !responseText || responseText.trim() === '') {
      console.log('[getRecapAllAdmin] Trying cursor endpoint as fallback');

      const cursorUrl = `${API_BASE_URL}/api/v1/setoran/cursor?pageSize=${pageSize}`;
      console.log('[getRecapAllAdmin] Trying cursor endpoint:', cursorUrl);

      response = await fetch(cursorUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      responseText = await response.text();
      console.log('[getRecapAllAdmin] Cursor response status:', response.status);
      console.log('[getRecapAllAdmin] Cursor response text:', responseText?.substring(0, 300) || '(empty)');
    }

    if (response.status === 401) {
      console.log('[getRecapAllAdmin] Unauthorized - token may be expired');
      return { success: false, message: 'Unauthorized', data: [] as IRecap[], count: 0 };
    }

    if (!responseText || responseText.trim() === '') {
      console.log('[getRecapAllAdmin] All endpoints returned empty response');
      return { success: true, message: 'No data available', data: [] as IRecap[], count: 0 };
    }

    let rawResult: any;
    try {
      rawResult = JSON.parse(responseText);
      console.log('[getRecapAllAdmin] Parsed response structure:', Object.keys(rawResult));
    } catch (parseError) {
      console.error('[getRecapAllAdmin] JSON parse error:', parseError);
      console.log('[getRecapAllAdmin] Raw text:', responseText.substring(0, 200));
      return { success: true, message: 'Invalid response format', data: [] as IRecap[], count: 0 };
    }

    if (!response.ok) {
      const errorMsg = rawResult.message || rawResult.error || `API Error: ${response.status}`;
      console.error('[getRecapAllAdmin] API error:', errorMsg);
      return { success: false, message: errorMsg, data: [] as IRecap[], count: 0 };
    }

    // Parse response - handle various formats
    let setoranData: ApiSetoranListDto[] = [];
    let totalCount = 0;

    // Format 1: { data: [...], totalCount: N }
    if (rawResult.data && Array.isArray(rawResult.data)) {
      setoranData = rawResult.data;
      totalCount = rawResult.totalCount || rawResult.total || setoranData.length;
    }
    // Format 2: { data: { data: [...], totalCount: N } }
    else if (rawResult.data?.data && Array.isArray(rawResult.data.data)) {
      setoranData = rawResult.data.data;
      totalCount = rawResult.data.totalCount || rawResult.data.total || setoranData.length;
    }
    // Format 3: { data: { items: [...], totalCount: N } } (from API docs)
    else if (rawResult.data?.items && Array.isArray(rawResult.data.items)) {
      setoranData = rawResult.data.items;
      totalCount = rawResult.data.totalCount || rawResult.data.total || setoranData.length;
    }
    // Format 4: { items: [...], totalCount: N }
    else if (rawResult.items && Array.isArray(rawResult.items)) {
      setoranData = rawResult.items;
      totalCount = rawResult.totalCount || rawResult.total || setoranData.length;
    }
    // Format 4: Direct array
    else if (Array.isArray(rawResult)) {
      setoranData = rawResult;
      totalCount = rawResult.length;
    }

    console.log('[getRecapAllAdmin] Parsed:', setoranData.length, 'setoran, total:', totalCount);

    return {
      success: true,
      message: "get all recaps for admin successfully",
      data: setoranData.map(convertSetoranToRecap),
      count: totalCount,
    };
  } catch (error) {
    console.error('[getRecapAllAdmin] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error', data: [] as IRecap[], count: 0 };
  }
};
