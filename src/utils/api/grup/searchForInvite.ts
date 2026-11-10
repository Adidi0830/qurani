"use server";

import { createClient } from "../../supabase/server";

// Specialized cache untuk dialog invite search
const inviteSearchCache = new Map<
  string,
  {
    data: InviteUser[];
    timestamp: number;
    groupId: string;
  }
>();

const INVITE_CACHE_DURATION = 60000; // 1 menit

export interface InviteUser {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
}

function getInviteCacheKey(searchQuery: string, groupId: string): string {
  return `invite-${groupId}-${searchQuery.toLowerCase().trim()}`;
}

function getCachedInviteData(key: string): InviteUser[] | null {
  const cached = inviteSearchCache.get(key);
  if (cached && Date.now() - cached.timestamp < INVITE_CACHE_DURATION) {
    return cached.data;
  }
  inviteSearchCache.delete(key);
  return null;
}

function setCachedInviteData(key: string, data: InviteUser[], groupId: string) {
  inviteSearchCache.set(key, { data, timestamp: Date.now(), groupId });
}

function clearInviteCache(groupId: string) {
  // Clear cache entries for this group when membership changes
  for (const [key, value] of inviteSearchCache) {
    if (value.groupId === groupId) {
      inviteSearchCache.delete(key);
    }
  }
}

/**
 * Search users for group invitation - Optimized for dialog use case
 * @param searchQuery - Search term (name or username)
 * @param groupId - Group ID to exclude existing members
 * @param currentUserId - Current user ID to exclude from results
 * @param limit - Maximum results (default 2 for dialog)
 */
export async function searchUsersForInvite(
  searchQuery: string,
  groupId: string,
  currentUserId: string,
  limit: number = 2
): Promise<{ users: InviteUser[]; hasMore: boolean }> {
  try {
    // Input validation
    if (
      !searchQuery ||
      typeof searchQuery !== "string" ||
      searchQuery.trim().length < 2
    ) {
      return { users: [], hasMore: false };
    }

    if (!groupId || typeof groupId !== "string") {
      throw new Error("Invalid groupId provided");
    }

    if (!currentUserId || typeof currentUserId !== "string") {
      throw new Error("Invalid currentUserId provided");
    }

    // Sanitize limit
    const safeLimit = Math.min(Math.max(parseInt(String(limit)) || 2, 1), 10);

    // Check cache first
    const cacheKey = getInviteCacheKey(searchQuery, groupId);
    const cachedData = getCachedInviteData(cacheKey);
    if (cachedData) {
      return { users: cachedData, hasMore: false };
    }

    const supabase = await createClient();
    const searchTerm = searchQuery.trim();

    // Step 1: Get existing group member IDs safely
    const { data: existingMembers, error: membersError } = await supabase
      .from("grup_members")
      .select("user_id")
      .eq("grup_id", groupId);

    if (membersError) throw membersError;

    // Step 2: Extract user IDs to exclude
    const excludeUserIds = [
      currentUserId,
      ...(existingMembers || []).map((member) => member.user_id),
    ].filter((id) => id && typeof id === "string"); // Ensure valid UUIDs only

    // Step 3: Search users with safe filtering
    let query = supabase.from("user_profiles").select(`
        id,
        name,
        username,
        avatar
      `);

    // Step 4: Filter only users with username (not null)
    query = query.not("username", "is", null);

    // Step 5: Add search filter (most selective)
    if (searchTerm && searchTerm.length >= 2) {
      query = query.or(
        `name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`
      );
    }

    // Step 6: Exclude current user
    query = query.neq("id", currentUserId);

    // Step 7: Exclude existing members (safe way)
    if (excludeUserIds.length > 1) {
      // More than just currentUserId
      const memberIds = excludeUserIds.filter((id) => id !== currentUserId);
      for (const memberId of memberIds) {
        query = query.neq("id", memberId);
      }
    }

    // Step 8: Apply ordering and limit
    const { data, error } = await query.order("name").limit(safeLimit);

    if (error) throw error;

    // Transform data
    const users: InviteUser[] = (data || []).map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      username: user.username,
      avatar: user.avatar,
    }));

    // Cache the result
    setCachedInviteData(cacheKey, users, groupId);

    return {
      users,
      hasMore: false, // For dialog, we don't need pagination
    };
  } catch (error) {
    console.error("Error searching users for invite:", error);
    throw error;
  }
}

/**
 * Clear invite search cache for a specific group
 * Call this when group membership changes
 */
export async function clearInviteSearchCache(groupId: string) {
  clearInviteCache(groupId);
}

/**
 * Get user by username for manual invite
 * @param username - Username to search for
 * @param groupId - Group ID to check if user is already member
 * @param currentUserId - Current user ID to exclude
 */
export async function getUserByUsername(
  username: string,
  groupId: string,
  currentUserId: string
): Promise<InviteUser | null> {
  try {
    // Input validation
    if (!username || typeof username !== "string" || !username.trim()) {
      return null;
    }

    if (!groupId || typeof groupId !== "string") {
      throw new Error("Invalid groupId provided");
    }

    if (!currentUserId || typeof currentUserId !== "string") {
      throw new Error("Invalid currentUserId provided");
    }

    // Sanitize username (basic validation)
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return null;
    }

    // Pastikan ada @ prefix untuk database
    const dbUsername = cleanUsername.startsWith("@")
      ? cleanUsername
      : `@${cleanUsername}`;

    const supabase = await createClient();

    // First check if user exists and get their info
    const { data: userData, error: userError } = await supabase
      .from("user_profiles")
      .select(
        `
        id,
        name,
        username,
        avatar
      `
      )
      .eq("username", dbUsername)
      .neq("id", currentUserId)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        // No user found
        return null;
      }
      throw userError;
    }

    // Then check if user is already a member (safe way)
    const { data: memberCheck, error: memberError } = await supabase
      .from("grup_members")
      .select("user_id")
      .eq("grup_id", groupId)
      .eq("user_id", userData.id)
      .single();

    if (memberError && memberError.code !== "PGRST116") {
      throw memberError;
    }

    // If user is already a member, return null
    if (memberCheck) {
      return null;
    }

    return {
      id: userData.id,
      name: userData.name || "Unknown",
      username: userData.username,
      avatar: userData.avatar,
    };
  } catch (error) {
    console.error("Error getting user by username:", error);
    return null;
  }
}
