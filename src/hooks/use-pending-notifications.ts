"use client"

import { useState, useEffect, useCallback } from "react"
import { getNotifications } from "@/utils/api/notifikasi/fetch"
import { useRealtime } from "@/hooks/use-realtime"

interface MappedNotification {
  id: string;
  type: string;
  is_read: boolean;
  is_action_taken: boolean;
  is_accept_friend: boolean | null;
  created_at: string;
  group_id: string | null;
  groupName: string;
  fromUserName: string;
  fromUserUsername: string;
  fromUserAvatar: string | null;
  fromUserProfileUser: string | null;
  fromUserId: string;
  userId: string;
}

export function usePendingNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<MappedNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Debug: Log when hook is called (optional - can be removed in production)
  // useEffect(() => {
  //   console.log('Hook initialized with userId:', userId)
  // }, [])

  const loadNotifications = useCallback(async () => {
    if (!userId) return

    try {
      const result = await getNotifications(userId)
      if (result.error) {
        console.error('Error loading notifications:', result.error)
      } else {
        setNotifications(result.data || [])
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Load notifications from API
  useEffect(() => {
    if (userId) {
      loadNotifications()
    }
  }, [userId, loadNotifications])

  // Enhanced realtime subscription for immediate notification updates
  useRealtime({
    userId,
    onDataChange: loadNotifications,
    enabled: !!userId,
    tables: ['notifications', 'friend_requests']
  })

  // Calculate pending count (untuk filter di halaman notifikasi)
  const pendingCount = notifications.filter(n => !n.is_action_taken).length
  
  // Calculate unread count (untuk badge di sidebar)
  const unreadCount = notifications.filter(n => !n.is_read).length

  // Debug logging (optional - can be removed in production)
  // console.log('Hook notifications:', notifications.length, 'unread:', unreadCount)

  return {
    notifications,
    pendingCount,
    unreadCount, // Use real unread count
    isLoading
  }
}
