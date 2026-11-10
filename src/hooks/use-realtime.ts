"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { notificationsApi } from '@/lib/api'

interface UseRealtimeProps {
  userId?: string
  onDataChange: () => void
  enabled?: boolean
  tables?: string[]
}

/**
 * Polling-based replacement for Supabase Realtime.
 * Supabase WebSocket telah dihapus - kini menggunakan interval polling
 * ke endpoint API Qurani untuk mendeteksi perubahan data.
 */
export function useRealtime({ userId, onDataChange, enabled = true }: UseRealtimeProps) {
  const [isConnected, setIsConnected] = useState(false)
  const lastCountRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkForUpdates = useCallback(async () => {
    if (!userId || !enabled) return

    try {
      const response = await notificationsApi.getUnreadCount()
      const count = response?.data ?? response ?? 0
      const currentCount = typeof count === 'number' ? count : (count?.data ?? 0)

      // Jika jumlah unread berubah → trigger onDataChange
      if (lastCountRef.current !== null && lastCountRef.current !== currentCount) {
        console.log('[useRealtime] Notification count changed, triggering refresh')
        onDataChange()
      }

      lastCountRef.current = currentCount
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    }
  }, [userId, enabled, onDataChange])

  useEffect(() => {
    if (!userId || !enabled) {
      setIsConnected(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Run immediately on mount
    checkForUpdates()

    // Poll every 30 seconds
    intervalRef.current = setInterval(checkForUpdates, 30_000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsConnected(false)
    }
  }, [userId, enabled, checkForUpdates])

  return {
    channel: null,
    isConnected,
  }
}
