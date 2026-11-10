// hooks/useUserProfile.ts
"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { UserProfile } from "@/types/database.types";
import { getSimUser } from "@/data/sim-dummy-users";

const fetcher = async (url: string): Promise<UserProfile> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
  const { profile } = await res.json();
  return profile;
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
  // Ini mencegah API /api/profile mengembalikan fallback user login (Fatkul) 
  // saat API Qurani asli merespon 404.
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
