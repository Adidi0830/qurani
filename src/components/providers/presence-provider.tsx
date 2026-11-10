"use client"

import { createContext, useContext, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePresence } from '@/hooks/use-presence'
import type { UsePresenceReturn } from '@/types/presence'

// Context untuk share presence state ke semua components
const PresenceContext = createContext<UsePresenceReturn | null>(null)

/**
 * Hook untuk akses presence state dari mana saja
 * 
 * @example
 * ```tsx
 * const { isOnline, onlineCount } = useGlobalPresence()
 * 
 * if (isOnline(friendId)) {
 *   return <OnlineBadge />
 * }
 * ```
 */
export function useGlobalPresence() {
  const context = useContext(PresenceContext)
  if (!context) {
    // Fallback jika dipanggil diluar provider
    return {
      onlineUsers: new Set<string>(),
      onlineCount: 0,
      isOnline: () => false,
      updatePresence: async () => {},
      isConnected: false
    }
  }
  return context
}

/**
 * Global Presence Provider
 * 
 * Component ini akan tracking presence user di SEMUA halaman
 * Tidak ada UI, hanya menjalankan presence tracking di background
 * 
 * Usage: Wrap di root layout (sudah di layout.tsx)
 * 
 * @example
 * ```tsx
 * // Di component manapun:
 * import { useGlobalPresence } from '@/components/providers/presence-provider'
 * 
 * function MyComponent() {
 *   const { isOnline } = useGlobalPresence()
 *   return <OnlineBadge isOnline={isOnline(friendId)} />
 * }
 * ```
 */
export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { customUser, isAuthenticated } = useAuth()

  // Track presence globally - aktif di semua halaman
  const presenceState = usePresence({
    channelName: 'friends-presence',
    currentUserId: customUser?.userId?.toString() || '',
    username: customUser?.name || customUser?.email || 'Anonymous',
    enabled: isAuthenticated && !!customUser
  })

  // Optional: Log connection status untuk debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (presenceState.isConnected && customUser) {
        console.log('✅ Presence connected globally for:', customUser.name || customUser.email)
      }
    }
  }, [presenceState.isConnected, customUser])

  // Share presence state via context
  return (
    <PresenceContext.Provider value={presenceState}>
      {children}
    </PresenceContext.Provider>
  )
}
