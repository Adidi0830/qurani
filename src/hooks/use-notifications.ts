"use client";

import { useState, useEffect, useCallback } from "react";
import { notificationsApi } from "@/lib/api";
import { toast } from "sonner";

/**
 * Notifications Hook using API Qurani
 * Supports Load More (Cursor Pagination)
 */
export function useNotifications(userId?: string) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasNext, setHasNext] = useState(false);
    
    // Initial fetch function
    const fetchNotifications = useCallback(async (isLoadMore = false) => {
        // If not loading more, we reset state
        if (!isLoadMore) {
            setLoading(true);
            setError(null);
        } else if (!nextCursor) {
            return; // Nothing to load
        } else {
            setLoading(true);
        }

        try {
            const params = {
                pageSize: 10,
                ...(isLoadMore && nextCursor ? { cursor: nextCursor } : {})
            };

            const response = await notificationsApi.getWithCursor(params);
            
            // Handle different possible response structures
            const data = response?.data || response;
            const fetchedList = Array.isArray(data) ? data : (data?.data || []);
            
            if (isLoadMore) {
                setNotifications(prev => {
                    // Prevent duplicates just in case
                    const existingIds = new Set(prev.map(n => n.id));
                    const newItems = fetchedList.filter((n: any) => !existingIds.has(n.id));
                    return [...prev, ...newItems];
                });
            } else {
                setNotifications(fetchedList);
            }

            // Handle pagination cursor from API
            if (response?.pagination) {
                setNextCursor(response.pagination.nextCursor || null);
                setHasNext(response.pagination.hasNext || false);
            } else if (data?.pagination) {
                setNextCursor(data.pagination.nextCursor || null);
                setHasNext(data.pagination.hasNext || false);
            } else {
                // Fallback if no pagination object
                setHasNext(fetchedList.length === 10);
                // If API doesn't return nextCursor, we can't reliably load more using cursor unless it's numeric offset, 
                // but we follow standard cursor behavior here.
            }

        } catch (err: any) {
            console.error("Failed to fetch notifications:", err);
            setError(err.message || "Failed to load notifications");
            if (!isLoadMore) {
                toast.error("Gagal memuat notifikasi");
            }
        } finally {
            setLoading(false);
        }
    }, [nextCursor]);

    // Initial load when hook mounts (if user is present)
    // We only auto-fetch if we have a userId, ensuring they are logged in
    useEffect(() => {
        if (userId) {
            fetchNotifications(false);
        } else {
            setNotifications([]);
            setHasNext(false);
        }
    }, [userId, fetchNotifications]);

    const loadMore = useCallback(() => {
        if (!loading && hasNext) {
            fetchNotifications(true);
        }
    }, [loading, hasNext, fetchNotifications]);

    return {
        notifications,
        loading,
        error,
        refresh: () => fetchNotifications(false),
        loadMore,
        hasNext
    };
}

/**
 * Hook khusus untuk mengambil jumlah notifikasi yang belum dibaca (Unread Count)
 * Digunakan oleh Sidebar dan Navbar untuk performa yang lebih ringan
 */
export function useUnreadCount(userId?: string) {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await notificationsApi.getUnreadCount();
            const count = response?.data || response || 0;
            setUnreadCount(typeof count === 'number' ? count : (count.data || 0));
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
        }
    }, [userId]);

    useEffect(() => {
        fetchUnreadCount();
        
        // Optional: Polling setiap 1 menit jika tidak ada WebSockets
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    return {
        unreadCount,
        refreshUnread: fetchUnreadCount
    };
}
