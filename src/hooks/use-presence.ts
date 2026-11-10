"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import type { UserPresence } from '@/types/presence'

interface UsePresenceOptions {
  channelName: string;
  currentUserId: string;
  username: string;
  enabled?: boolean;
}

/**
 * Simple Presence Hook - Track Online/Offline Status Only
 * 
 * @example
 * ```tsx
 * const { onlineUsers, isOnline } = usePresence({
 *   channelName: 'friends-presence',
 *   currentUserId: user.id,
 *   username: user.full_name
 * })
 * 
 * // Check if friend is online
 * {isOnline(friend.id) && <span>🟢 Online</span>}
 * ```
 */
export function usePresence({
  channelName,
  currentUserId,
  username,
  enabled = true
}: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Check if user is online - memoized for performance
  const isOnline = useCallback((userId: string): boolean => {
    return onlineUsers.has(userId)
  }, [onlineUsers])

  // Setup presence channel
  useEffect(() => {
    if (!enabled || !currentUserId || !username) {
      setIsConnected(false)
      return
    }

    const supabase = createClient()
    
    // Create presence channel
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    // Listen to presence sync
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        
        // Extract online user IDs (exclude self)
        const userIds = new Set<string>()
        Object.keys(state).forEach(userId => {
          if (userId !== currentUserId) {
            userIds.add(userId)
          }
        })
        
        setOnlineUsers(userIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          
          // Track my presence (minimal data)
          await channel.track({
            user_id: currentUserId,
            username: username,
            online_at: new Date().toISOString(),
          } as UserPresence)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
      setOnlineUsers(new Set())
    }
  }, [channelName, currentUserId, username, enabled])

  return {
    onlineUsers,
    onlineCount: onlineUsers.size,
    isOnline,
    isConnected
  }
}
