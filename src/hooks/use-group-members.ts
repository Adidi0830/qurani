"use client";

import useSWR from "swr";

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

export interface GroupMemberWithUser {
  id: string;
  role: "owner" | "admin" | "member";
  user_id: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    nickname: string | null;
    avatar: string | null;
    countryName: string | null;
    stateName: string | null;
    cityName: string | null;
  };
}

/**
 * Hook untuk fetching group members dengan SWR caching
 */
export function useGroupMembers(groupId?: string, userId?: string) {
  const url =
    groupId && userId
      ? `/api/grup?userId=${encodeURIComponent(
          userId
        )}&action=getGroupMembers&groupId=${encodeURIComponent(groupId)}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds cache for members
    errorRetryCount: 2,
    onError: (error) => {
      console.error("Error fetching group members:", error);
    },
  });

  return {
    members: data?.success ? (data.data as GroupMemberWithUser[]) : [],
    isLoading,
    error: error?.message || (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}

/**
 * Hook untuk group member mutations
 */
export function useGroupMemberMutations(groupId?: string, userId?: string) {
  const { refresh: refreshMembers } = useGroupMembers(groupId, userId);

  const promoteMember = async (
    memberId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!groupId) throw new Error("Group ID is required");
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "promoteMember",
        userId,
        groupId,
        memberId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to promote member");
      }

      // Refresh members data after successful promotion
      await refreshMembers();

      return result;
    } catch (error) {
      console.error("Error promoting member:", error);
      throw error;
    }
  };

  const demoteMember = async (
    memberId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!groupId) throw new Error("Group ID is required");
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "demoteMember",
        userId,
        groupId,
        memberId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to demote member");
      }

      // Refresh members data after successful demotion
      await refreshMembers();

      return result;
    } catch (error) {
      console.error("Error demoting member:", error);
      throw error;
    }
  };

  const removeMember = async (
    memberId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!groupId) throw new Error("Group ID is required");
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "removeMember",
        userId,
        groupId,
        memberId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to remove member");
      }

      // Refresh members data after successful removal
      await refreshMembers();

      return result;
    } catch (error) {
      console.error("Error removing member:", error);
      throw error;
    }
  };

  const inviteMember = async (
    username: string,
    inviterId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!groupId) throw new Error("Group ID is required");
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "inviteMember",
        userId,
        groupId,
        username,
        inviterId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to invite member");
      }

      // Refresh members data after successful invitation
      await refreshMembers();

      return result;
    } catch (error) {
      console.error("Error inviting member:", error);
      throw error;
    }
  };

  return {
    promoteMember,
    demoteMember,
    removeMember,
    inviteMember,
  };
}
