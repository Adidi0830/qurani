"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { notificationsApi } from "@/lib/api";

export function useNotificationCount() {
  const { userId } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotificationCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const response = await notificationsApi.getUnreadCount();
      const count = response?.data ?? response ?? 0;
      const num = typeof count === 'number' ? count : (count?.data ?? 0);
      setUnreadCount(num);
    } catch (error) {
      console.error("Error loading notification count:", error);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load on mount + when user changes
  useEffect(() => {
    if (userId) {
      loadNotificationCount();
    } else {
      setUnreadCount(0);
    }
  }, [userId, loadNotificationCount]);

  // Poll every 60 seconds for fresh count
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(loadNotificationCount, 60_000);
    return () => clearInterval(interval);
  }, [userId, loadNotificationCount]);

  return {
    unreadCount,
    isLoading,
    refreshCount: loadNotificationCount,
  };
}
