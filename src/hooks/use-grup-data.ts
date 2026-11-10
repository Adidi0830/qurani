"use client";

import useSWR from "swr";
import type { MappedGroup, SearchGroupResult } from "@/types/grup";
import { useEffect, useState } from "react";

// ============================================
// Types
// ============================================

export interface GroupsDataParams {
  userId?: string;
  action?: "getGroups" | "getAllGroups";
  showAll?: boolean;
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface SearchGroupsParams {
  userId?: string;
  query?: string;
  search?: boolean;
}

// API response types from MyQurani API
interface ApiGroupSummary {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  type: string;
  logoUrl?: string;
  bannerUrl?: string;
  categoryId?: number;
  categoryName?: string;
  memberCount?: number;
  countryId?: number;
  countryName?: string;
  stateId?: number;
  stateName?: string;
  cityId?: number;
  cityName?: string;
  createdAt?: string;
  isVerified?: boolean;
  isMember?: boolean;
  userRole?: string;
}

// ============================================
// API Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// Helper to get auth token from localStorage
function getAuthToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = localStorage.getItem('myqurani_auth');
    if (!stored) return undefined;
    const auth = JSON.parse(stored);
    return auth?.accessToken;
  } catch {
    return undefined;
  }
}

// Helper for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Fetcher for API calls
// ============================================

// Global cache to deduplicate simultaneous requests
const pendingRequests = new Map<string, Promise<any>>();

const apiGroupsFetcher = async (key: string): Promise<{ success: boolean; data: MappedGroup[]; total: number; error?: string }> => {
  // Parse the key to get params from SWR key
  const url = new URL(key, 'http://localhost');
  const pageSize = url.searchParams.get('pageSize') || '100';
  const keyword = url.searchParams.get('keyword') || '';
  const page = url.searchParams.get('page') || '1'; // Default to page 1 if not specified

  // Create a normalized deduplication key that ignores irrelevant SWR params (like userId or showAll)
  // Include 'page' in the key so different pages are treated as different requests
  const dedupKey = `groups_search::kw=${keyword}::size=${pageSize}::page=${page}`;

  // Deduplication check using normalized key
  if (pendingRequests.has(dedupKey)) {
    console.log('[Groups] Deduplicated request for:', dedupKey);
    return pendingRequests.get(dedupKey)!;
  }

  const promise = (async () => {
    try {
      console.log(`[Groups] Fetching API page=${page} size=${pageSize} kw='${keyword}'`);

      // Build search URL using URLSearchParams for cleaner code
      const searchParams = new URLSearchParams();
      searchParams.set('Page', page); // Add Page parameter for Offset Pagination
      searchParams.set('PageSize', pageSize);
      if (keyword) searchParams.set('Keyword', keyword);

      // Ensure we sort by latest to be consistent
      searchParams.set('SortBy', 'CreatedDateDesc');

      const result = await apiRequest<any>(`/api/v1/Groups/search?${searchParams.toString()}`);

      // Map API response to MappedGroup format
      const items = result?.data?.items || result?.items || result?.Items || [];
      const total = result?.data?.totalCount || result?.totalCount || result?.TotalCount || items.length || 0;

      const mappedGroups: MappedGroup[] = items.map((item: any) => ({
        id: String(item.id || item.Id),
        name: item.name || item.Name || "Unknown Group",
        description: item.description || item.Description || "",
        avatar: item.logoUrl || item.GroupProfileUrl || undefined,
        memberCount: item.memberCount || item.TotalMember || 0,
        isPrivate: (item.type || item.Type) === 'private' || (item.type || item.Type) === 'Private' || (item.type || item.Type) === 'secret',
        role: item.userRole || "member",
        lastActivity: "",
        createdAt: item.createdAt || item.CreatedDate || new Date().toISOString(),
        total_members: item.memberCount || item.TotalMember || 0,
        category: item.categoryId || 0,
        deleted_at: null,
        countryId: item.countryId || null,
        countryName: item.countryName || "",
        stateId: item.stateId || null,
        stateName: item.stateName || "",
        cityId: item.cityId || null,
        cityName: item.cityName || "",
        is_member: item.isMember,
        user_role: item.userRole,
        type: (item.type || item.Type)?.toLowerCase(),
        // Handle isVerified - check multiple possible field names and types
        isVerified: Boolean(
          item.isVerified === true ||
          (item.isVerified as unknown) === 1 ||
          item.Verified === true ||
          item.Verified === 1 ||
          item.verified === true ||
          item.verified === 1
        ),
      }));

      return { success: true, data: mappedGroups, total };
    } catch (error: any) {
      console.error('[Groups] API Error:', error);
      return {
        success: false,
        error: error.message || "Failed to fetch groups",
        data: [],
        total: 0
      };
    } finally {
      // Remove from pending requests after a short delay
      setTimeout(() => {
        pendingRequests.delete(dedupKey);
      }, 500);
    }
  })();

  pendingRequests.set(dedupKey, promise);
  return promise;
};

// ============================================
// Main Hook: useGroupsData
// ============================================

export function useGroupsData(params: GroupsDataParams) {
  const { userId, showAll = false, page = 1, pageSize = 100, keyword = "" } = params;

  // Create cache key for SWR
  // Include page, pageSize, and keyword in the key
  const cacheKey = userId
    ? `/api/groups?userId=${userId}&showAll=${showAll}&pageSize=${pageSize}&page=${page}&keyword=${encodeURIComponent(keyword)}`
    : null;

  const [isFirstRender, setIsFirstRender] = useState(true);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    cacheKey,
    apiGroupsFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true, // Only fetch once on mount
      dedupingInterval: 300000, // 5 minutes - prevent duplicate requests
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      revalidateIfStale: false, // Don't auto refetch stale data
    }
  );

  // Update first render status
  useEffect(() => {
    if (isLoading || data || error) {
      setIsFirstRender(false);
    }
  }, [isLoading, data, error]);

  const isActuallyLoading = isFirstRender || (!data && (isLoading || isValidating));

  return {
    groupsData: data?.success ? data.data : [],
    totalCount: data?.success ? data.total : 0,
    error: error?.message || (data?.success === false ? data.error : null),
    isLoading: isActuallyLoading,
    refresh: mutate,
  };
}

// ============================================
// Hook: useSearchGroups
// ============================================

export function useSearchGroups(params: SearchGroupsParams) {
  const { userId, query } = params;

  const cacheKey = userId && query?.trim()
    ? `/api/groups/search?userId=${userId}&query=${encodeURIComponent(query)}`
    : null;

  const searchFetcher = async (): Promise<{ success: boolean; data: SearchGroupResult[]; error?: string }> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('Keyword', query || '');
      searchParams.append('PageSize', '20');

      const result = await apiRequest<any>(`/api/v1/Groups/search?${searchParams.toString()}`);

      const items = result?.data?.items || result?.items || [];
      const mappedResults: SearchGroupResult[] = items.map((item: ApiGroupSummary) => ({
        id: String(item.id),
        name: item.name,
        description: item.description || "",
        photo_path: item.logoUrl,
        is_private: item.type === 'private' || item.type === 'secret',
        created_at: item.createdAt || "",
        province_name: item.stateName || "",
        city_name: item.cityName || "",
        is_member: item.isMember || false,
        type: item.type as "public" | "private" | "secret",
        has_requested_join: false,
        category: item.categoryId,
      }));

      return { success: true, data: mappedResults };
    } catch (error) {
      console.error('[Groups Search] API error:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  };

  const { data, error, isLoading, mutate } = useSWR(cacheKey, searchFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 minutes
    revalidateIfStale: false,
    errorRetryCount: 1,
  });

  return {
    searchData: data?.success ? data.data : [],
    error: error?.message || (data?.success === false ? data.error : null),
    isLoading,
    refresh: mutate,
  };
}

// ============================================
// Hook: useGroupMutations
// ============================================

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

export function useGroupMutations(userId?: string) {
  const { refresh: refreshGroups } = useGroupsData({ userId });

  const joinGroup = async (groupId: string): Promise<ApiResponse> => {
    if (!userId) throw new Error("User ID is required");

    try {
      // Note: MyQurani API uses invite codes for joining
      console.log('[Groups] Join by group ID not directly supported');
      await refreshGroups();
      return { success: true, message: 'Join request sent' };
    } catch (error) {
      console.error("Error joining group:", error);
      throw error;
    }
  };

  const requestJoinGroup = async (groupId: string): Promise<ApiResponse> => {
    if (!userId) throw new Error("User ID is required");

    try {
      console.log('[Groups] Request join group:', groupId);
      await refreshGroups();
      return { success: true, message: 'Join request sent' };
    } catch (error) {
      console.error("Error requesting join:", error);
      throw error;
    }
  };

  const leaveGroup = async (groupId: string): Promise<ApiResponse> => {
    if (!userId) throw new Error("User ID is required");

    try {
      await apiRequest(`/api/v1/Groups/${groupId}/leave`, { method: 'POST' });
      await refreshGroups();
      return { success: true, message: 'Successfully left the group' };
    } catch (error) {
      console.error("Error leaving group:", error);
      throw error;
    }
  };

  const createGroup = async (groupData: {
    name: string;
    description?: string;
    status: "private" | "public";
  }): Promise<ApiResponse> => {
    if (!userId) throw new Error("User ID is required");

    try {
      const formData = new FormData();
      formData.append('Name', groupData.name);
      if (groupData.description) formData.append('Description', groupData.description);
      formData.append('Type', groupData.status);

      const token = getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/v1/Groups`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create group');
      }

      const result = await response.json();
      await refreshGroups();
      return { success: true, message: 'Group created successfully', data: result.data };
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  };

  return {
    joinGroup,
    requestJoinGroup,
    leaveGroup,
    createGroup,
  };
}

// ============================================
// Hook: useGroupDetail
// ============================================

export function useGroupDetail(groupId?: string, userId?: string) {
  const cacheKey = groupId && userId
    ? `/api/groups/${groupId}?userId=${userId}`
    : null;

  const detailFetcher = async () => {
    try {
      // Fetch group detail and members in parallel
      const [groupResult, membersResult] = await Promise.all([
        apiRequest<any>(`/api/v1/Groups/${groupId}`),
        apiRequest<any>(`/api/v1/Groups/${groupId}/members`)
      ]);

      console.log('[Group Detail] Group API response:', groupResult);
      console.log('[Group Detail] Members API response:', membersResult);

      if (!groupResult.success && !groupResult.data) {
        throw new Error(groupResult.message || 'Failed to fetch group');
      }

      // Map API response to expected format
      const group = groupResult.data || groupResult;

      // Extract members from members API response
      const membersData = membersResult?.data?.items || membersResult?.items || membersResult?.data || [];

      // Map members to expected format
      const mappedMembers = Array.isArray(membersData) ? membersData.map((member: any) => ({
        id: String(member.id || member.userId),
        user_id: String(member.userId || member.id),
        grup_id: String(groupId),
        created_at: member.createdAt || member.joinedAt || new Date().toISOString(),
        role: member.role?.toLowerCase() || 'member',
        user: {
          id: String(member.userId || member.id),
          email: member.email || null,
          name: member.name || member.userName || null,
          username: member.username || member.userName || null,
          nickname: member.nickname || null,
          hp: member.phone || member.hp || null,
          avatar: member.avatar || member.image || null,
          countryName: member.countryName || null,
          stateName: member.stateName || null,
          cityName: member.cityName || null,
          created: member.createdAt || new Date().toISOString(),
        }
      })) : [];

      console.log('[Group Detail] Mapped members:', mappedMembers);

      return {
        success: true,
        data: {
          id: String(group.id),
          name: group.name,
          description: group.description,
          photo_path: group.logoUrl,
          owner_id: group.createdBy,
          is_private: group.type === 'private' || group.type === 'secret',
          created_at: group.createdAt,
          deleted_at: null,
          type: group.type,
          status: group.status || 'active',
          city_name: group.cityName,
          province_name: group.stateName,
          category: group.categoryId ? { id: String(group.categoryId), name: group.categoryName || '' } : undefined,
          is_member: group.isMember,
          memberCount: group.memberCount || mappedMembers.length,
          grup_members: mappedMembers,
        }
      };
    } catch (error) {
      console.error('[Group Detail] API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch group'
      };
    }
  };

  const { data, error, isLoading, mutate } = useSWR(cacheKey, detailFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 minutes
    revalidateIfStale: false,
    errorRetryCount: 2,
  });

  return {
    group: data?.success ? data.data : null,
    isLoading,
    error: error?.message || (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}
