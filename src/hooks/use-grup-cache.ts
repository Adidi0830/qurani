"use client";

/**
 * ============================================
 * useGrupCache Hook (DEPRECATED - DISABLED)
 * ============================================
 * Status: DISABLED - Was using Supabase fetchGroups
 * 
 * This hook has been disabled to eliminate duplicate/Supabase API calls.
 * Components should use `useGroupsData` hook instead which connects 
 * to MyQurani online API.
 * 
 * NOTE: This hook is not used by any components currently.
 * Keeping the interface for backwards compatibility if needed.
 * ============================================
 */

import { MappedGroup } from "@/types/grup";

interface UseGrupCacheReturn {
  groups: MappedGroup[];
  isLoading: boolean;
  error: string | null;
  isFromCache: boolean;
  lastUpdated: Date | null;
  remainingTTL: number;
  refreshGroups: () => Promise<void>;
  clearCache: () => void;
  isBackgroundRefreshing: boolean;
}

// DISABLED: This hook no longer makes any API calls
// Use useGroupsData from use-grup-data.ts instead
export function useGrupCache(_userId: string | undefined): UseGrupCacheReturn {
  // Return empty state immediately - no API calls
  return {
    groups: [],
    isLoading: false,
    error: null,
    isFromCache: false,
    lastUpdated: null,
    remainingTTL: 0,
    refreshGroups: async () => {
      console.warn('[useGrupCache] DEPRECATED: This hook is disabled. Use useGroupsData instead.');
    },
    clearCache: () => {
      console.warn('[useGrupCache] DEPRECATED: This hook is disabled. Use useGroupsData instead.');
    },
    isBackgroundRefreshing: false,
  };
}
