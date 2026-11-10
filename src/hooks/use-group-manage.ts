"use client";

import useSWR from "swr";
import type { GroupDetail } from "@/types/grup";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

// Mutation helper for POST requests
const postFetcher = async (url: string, data: Record<string, unknown>) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to process request");
  return res.json();
};

export interface GroupSettings {
  id: number;
  key: string;
  value: string;
  color: string | null;
  status: number;
}

export interface GroupMemberWithUser {
  id: string;
  role: "owner" | "admin" | "member";
  user_id: string;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar: string | null;
    profile_user: string | null;
  };
}

export interface SettingsMutationData {
  layoutType?: string;
  fontType?: string;
  fontSize?: number;
  pageMode?: string;
  labels?: Array<{
    id: number;
    value: string;
    color: string;
    status: number;
  }>;
}

/**
 * Hook untuk fetching group detail dengan SWR caching
 */
export function useGroupManage(groupId?: string, userId?: string) {
  const url =
    groupId && userId
      ? `/api/grup?userId=${encodeURIComponent(
          userId
        )}&action=getGroupDetail&groupId=${encodeURIComponent(groupId)}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000 * 5, // 1 minute cache for group detail
    errorRetryCount: 2,
    onError: (error) => {
      console.error("Error fetching group detail:", error);
    },
  });

  return {
    group: data?.success ? (data.data as GroupDetail) : null,
    isLoading,
    error: error?.message || (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}

/**
 * Hook untuk fetching group settings dengan SWR cachingg
 */
export function useGroupSettings(groupId?: string, userId?: string) {
  const url =
    groupId && userId
      ? `/api/grup?userId=${encodeURIComponent(
          userId
        )}&action=getGroupSettings&groupId=${encodeURIComponent(groupId)}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds cache for settings
    errorRetryCount: 2,
    onError: (error) => {
      console.error("Error fetching group settings:", error);
    },
  });

  return {
    settings: data?.success ? (data.data as GroupSettings[]) : [],
    isLoading,
    error: error?.message || (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}

/**
 * Hook untuk group settings mutations
 */
export function useGroupSettingsMutations(groupId?: string, userId?: string) {
  const { refresh: refreshSettings } = useGroupSettings(groupId, userId);

  const updateSettings = async (
    settingsData: SettingsMutationData
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!groupId) throw new Error("Group ID is required");
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "updateGroupSettings",
        userId,
        groupId,
        ...settingsData,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update settings");
      }

      // Refresh settings data after successful update
      await refreshSettings();

      return result;
    } catch (error) {
      console.error("Error updating group settings:", error);
      throw error;
    }
  };

  const resetSettings = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    if (!groupId) throw new Error("Group ID is required");
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "resetGroupSettings",
        userId,
        groupId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to reset settings");
      }

      // Refresh settings data after successful reset
      await refreshSettings();

      return result;
    } catch (error) {
      console.error("Error resetting group settings:", error);
      throw error;
    }
  };

  const updateLabel = async (labelData: {
    id: number;
    value: string;
    color: string;
    status: number;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!groupId) throw new Error("Group ID is required");
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "updateErrorLabel",
        userId,
        groupId,
        ...labelData,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update label");
      }

      // Refresh settings data after successful update
      await refreshSettings();

      return result;
    } catch (error) {
      console.error("Error updating error label:", error);
      throw error;
    }
  };

  return {
    updateSettings,
    resetSettings,
    updateLabel,
  };
}
