import { useState, useEffect } from "react";
import { useDebounce } from "./use-debounce";
import {
  searchUsersForInvite,
  InviteUser,
} from "@/utils/api/grup/searchForInvite";
import { useAuth } from "./use-auth";

interface UseInviteSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
  limit?: number;
}

interface UseInviteSearchReturn {
  users: InviteUser[];
  isLoading: boolean;
  error: string | null;
  hasResults: boolean;
}

/**
 * Hook for searching users in invite dialog
 * Optimized for dialog use case with minimal data and fast response
 */
export function useInviteSearch(
  searchQuery: string,
  groupId: string,
  options: UseInviteSearchOptions = {}
): UseInviteSearchReturn {
  const { enabled = true, debounceMs = 300, limit = 2 } = options;
  const { userId } = useAuth();

  const [users, setUsers] = useState<InviteUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  useEffect(() => {
    // Reset state when conditions are not met
    if (!enabled || !userId || !groupId || debouncedQuery.length < 2) {
      setUsers([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const performSearch = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await searchUsersForInvite(
          debouncedQuery,
          groupId,
          userId,
          limit
        );

        setUsers(result.users);
      } catch (err) {
        console.error("Error in invite search:", err);
        setError("Failed to search users. Please try again.");
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, groupId, userId, enabled, limit]);

  return {
    users,
    isLoading,
    error,
    hasResults: users.length > 0,
  };
}
