"use client";

import useSWR from "swr";
import { groupsApi } from "@/lib/api";

// Type untuk join request dengan user data
export interface RequestJoin {
  id: string;
  grup_id: string;
  user_id: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
  } | null;
}

interface RequestJoinResponse {
  success: boolean;
  data?: RequestJoin[];
  error?: string;
}

// Fetcher function untuk SWR
const fetchRequestJoinGrup = async (
  groupId: string
): Promise<RequestJoinResponse> => {
  if (!groupId) {
    return {
      success: false,
      error: "Group ID is required",
    };
  }

  try {
    const response = await groupsApi.getJoinRequests(groupId);
    const data = response?.data || response || [];

    // Ensure it's an array
    const rawData = Array.isArray(data) ? data : (data?.data || data?.items || []);

    const mappedData: RequestJoin[] = rawData.map((item: any) => ({
      id: item.id?.toString() || "",
      grup_id: item.groupId?.toString() || item.grup_id || groupId,
      user_id: item.userId?.toString() || item.user_id || "",
      status: item.status || "request",
      created_at: item.createdAt || item.created_at || new Date().toISOString(),
      user: {
        id: item.user?.id?.toString() || item.userId?.toString() || "",
        username: item.user?.username || null,
        name: item.user?.name || null,
        avatar: item.user?.avatar || null,
      },
    }));

    return {
      success: true,
      data: mappedData,
    };
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch join requests",
    };
  }
};

interface UseRequestJoinGrupParams {
  groupId: string | null;
  enabled?: boolean;
}

export function useRequestJoinGrup({
  groupId,
  enabled = true,
}: UseRequestJoinGrupParams) {
  const shouldFetch = groupId && enabled;
  const key = shouldFetch ? `request-join-${groupId}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    shouldFetch ? () => fetchRequestJoinGrup(groupId) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds cache
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  return {
    requests: data?.success ? data.data || [] : [],
    error: error?.message || (data?.success === false ? data.error : null),
    isLoading,
    refresh: mutate,
  };
}
