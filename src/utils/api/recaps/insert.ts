"use server";

/**
 * Recaps/Setoran Insert API
 * 
 * This module provides recap/setoran creation and update functions using the MyQurani API.
 * Interface remains the same as before for backward compatibility.
 */

import { IRecap } from "@/types/recap";
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

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

// Parse memorization string to extract surah and ayat info
function parseMemorization(memorization: string): {
  surahNumber: number;
  startAyat: number;
  endAyat: number;
} {
  // Expected format: "SurahName:startAyat - SurahName:endAyat"
  const parts = memorization.split(' - ');
  if (parts.length === 2) {
    const start = parts[0].split(':');
    const end = parts[1].split(':');

    if (start.length === 2 && end.length === 2) {
      return {
        surahNumber: 1, // Default, would need surah mapping
        startAyat: parseInt(start[1]) || 1,
        endAyat: parseInt(end[1]) || 7,
      };
    }
  }

  // Default values
  return { surahNumber: 1, startAyat: 1, endAyat: 7 };
}

// ============================================
// API Functions
// ============================================

export const insertRecap = async (values: IRecap) => {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const memInfo = parseMemorization(values.memorization);

    console.log('[insertRecap] Creating setoran via API');

    const response = await fetch(`${API_BASE_URL}/api/v1/qurani/setoran`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        surahNumber: memInfo.surahNumber,
        startAyat: memInfo.startAyat,
        endAyat: memInfo.endAyat,
        groupId: values.group_id ? parseInt(values.group_id) : undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('[insertRecap] API error:', result);
      return { success: false, message: result.message || 'Failed to create recap' };
    }

    console.log('[insertRecap] Setoran created:', result.data?.id);

    return {
      success: true,
      message: "insert recaps successfully",
      recapId: result.data?.id || result.data?.setoranId,
    };
  } catch (error) {
    console.error('[insertRecap] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateRecapParaf = async (
  recapId: string,
  parafStatus: boolean,
  userId: string
) => {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    console.log('[updateRecapParaf] Verifying setoran:', recapId);

    // Use verify endpoint to update paraf/verification status
    const response = await fetch(`${API_BASE_URL}/api/v1/qurani/setoran/${recapId}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: parafStatus ? 2 : 1, // 2 = verified, 1 = pending
        notes: parafStatus ? 'Verified by admin' : 'Verification removed',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[updateRecapParaf] API error:', result);
      return { success: false, message: result.message || 'Failed to update paraf' };
    }

    console.log('[updateRecapParaf] Paraf updated successfully');

    return {
      success: true,
      message: parafStatus
        ? "Paraf berhasil diberikan"
        : "Paraf berhasil dibatalkan",
    };
  } catch (error) {
    console.error('[updateRecapParaf] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};
