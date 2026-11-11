// hooks/useUserProfile.ts
"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { UserProfile } from "@/types/database.types";
import { getSimUser } from "@/data/sim-dummy-users";

function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const img = url.trim();
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  const API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';
  const normalizedPath = img.replace(/\\/g, '/');
  return `${API_BASE}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
}

function formatApiUserData(data: any): UserProfile {
  const avatarUrl = normalizeAvatarUrl(data.avatar || data.avatarUrl || data.image || data.profilePhotoUrl);
  return {
    id: String(data.id || data.userId || ''),
    username: data.username || '',
    name: data.name || data.fullName || '',
    full_name: data.fullName || data.name || '',
    nickname: data.nickname || '',
    email: data.email || '',
    avatar: avatarUrl,
    avatar_url: avatarUrl,
    hp: data.address || data.phone || data.hp || '',
    phone: data.phone || data.hp || '',
    gender: data.gender ?? data.sex ?? null,
    dob: data.dateOfBirth || data.birthDate || data.dob || null,
    job: data.job || '',
    timezone: data.timezone || '',
    bio: data.bio || '',
    cityId: data.cityId || null,
    cityName: data.cityName || data.city || '',
    stateId: data.stateId || null,
    stateName: data.stateName || data.state || '',
    countryId: data.countryId || null,
    countryName: data.countryName || data.country || '',
    role: data.role || (data.roles && data.roles[0]) || 'member',
    isVerify: data.isVerified ?? true,
    isBlocked: false,
    created_at: data.createdAt || new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString(),
  } as any;
}

const fetcher = async (url: string): Promise<UserProfile> => {
  let token = '';
  let refreshToken = '';

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('myqurani_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.accessToken || '';
        refreshToken = parsed.refreshToken || '';
      }
    } catch {}
  }

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (refreshToken) headers['x-refresh-token'] = refreshToken;

  try {
    const res = await fetch(url, { headers });

    if (res.ok) {
      const json = await res.json();
      if (json?.profile) {
        // If /api/me refreshed the token, update localStorage
        if (json.accessToken && typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem('myqurani_auth');
            if (stored) {
              const parsed = JSON.parse(stored);
              parsed.accessToken = json.accessToken;
              localStorage.setItem('myqurani_auth', JSON.stringify(parsed));
            }
          } catch {}
        }
        return json.profile;
      }
    }
  } catch (fetchErr) {
    console.warn('[useUserProfile] /api/me fetch error, attempting direct API fallback:', fetchErr);
  }

  // ── Direct client fallback to MyQurani API if Next.js proxy route fails ──
  if (token) {
    try {
      const { usersApi } = await import('@/lib/api');
      const result = await usersApi.getMe(token);
      const data = result?.data || result;
      if (data && (data.username || data.name || data.fullName)) {
        return formatApiUserData(data);
      }
    } catch (apiErr) {
      console.warn('[useUserProfile] Direct usersApi.getMe fallback failed:', apiErr);
    }
  }

  throw new Error(`Failed to fetch profile`);
};

export function useUserProfile(userId: string | undefined | null) {
  // ── Mock fallback & bypass untuk sim user (berdasarkan ID dummy) ─────────
  const mockProfile = useMemo(() => {
    const simUser = userId ? getSimUser(userId) : undefined;
    if (!simUser) return undefined;
    return {
        id: simUser.id,
        name: simUser.name,
        username: simUser.username,
        email: simUser.email,
        hp: simUser.hp,
        phone: simUser.hp,
        gender: simUser.gender,
        dob: simUser.dob,
        job: simUser.job,
        timezone: simUser.timezone,
        bio: simUser.bio,
        cityName: simUser.cityName,
        stateName: simUser.stateName,
        countryName: simUser.countryName,
        role: simUser.role,
        isVerify: simUser.isVerify,
        isBlocked: simUser.isBlocked,
        created_at: simUser.created_at,
        createdAt: simUser.created_at,
        avatar: simUser.avatar,
        avatar_url: simUser.avatar,
        _isMock: true,
    };
  }, [userId]);

  // Jika ini user simulasi (dummy), JANGAN panggil API (endpoint = null)
  const endpoint = mockProfile 
    ? null 
    : (userId && userId !== "0" && userId !== "me"
        ? `/api/profile?userId=${userId}`
        : `/api/me`);

  const { data, error, isLoading, mutate } = useSWR(
    endpoint,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes cache
      errorRetryCount: 2,
    }
  );

  return {
    profile: mockProfile ?? data,
    loading: isLoading && !mockProfile,
    error: mockProfile ? undefined : error,
    refresh: mutate,
    isMock: !!mockProfile,
  };
}
