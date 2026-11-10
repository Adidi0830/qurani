"use client";

import { useCallback, useEffect } from "react";
// import { createClient } from '@/utils/supabase/client'

interface FriendStatusSyncProps {
  userId?: string;
  onStatusChange?: (friendId: string, status: string) => void;
  enabled?: boolean;
}

export function useFriendStatusSync({
  userId,
  onStatusChange,
  enabled = true,
}: FriendStatusSyncProps) {
  const broadcastStatusChange = useCallback(
    (friendId: string, status: string) => {
      if (!userId) return;

      // Broadcast to other tabs/windows
      window.dispatchEvent(
        new CustomEvent("friendStatusChanged", {
          detail: { friendId, status, userId },
        })
      );
    },
    [userId]
  );

  useEffect(() => {
    if (!enabled || !userId || !onStatusChange) return;

    const handleStatusChange = (event: CustomEvent) => {
      const { friendId, status, userId: eventUserId } = event.detail;

      // Only handle events for the current user
      if (eventUserId === userId) {
        onStatusChange(friendId, status);
      }
    };

    window.addEventListener(
      "friendStatusChanged",
      handleStatusChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "friendStatusChanged",
        handleStatusChange as EventListener
      );
    };
  }, [userId, onStatusChange, enabled]);

  return {
    broadcastStatusChange,
  };
}
