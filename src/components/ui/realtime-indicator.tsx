"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRealtime } from "@/hooks/use-realtime"

interface RealtimeIndicatorProps {
  enabled?: boolean
  tables?: string[]
}

export function RealtimeIndicator({ enabled = true, tables = ['friend_requests', 'notifications'] }: RealtimeIndicatorProps) {
  const { customUser } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showPermanent, setShowPermanent] = useState(false)
  
  const realtime = useRealtime({
    userId: customUser?.userId?.toString(),
    onDataChange: () => {},
    enabled: enabled && !!customUser?.userId,
    tables
  })

  useEffect(() => {
    // Show permanently when realtime is connected
    if (realtime.isConnected) {
      setShowPermanent(true)
    }
  }, [realtime.isConnected])

  if (!enabled || !customUser?.userId) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
        realtime.isConnected 
          ? 'bg-green-600 text-white' 
          : 'bg-red-600 text-white animate-pulse'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            realtime.isConnected ? 'bg-green-300' : 'bg-red-300'
          }`} />
          <span>
            {realtime.isConnected ? '🟢 Realtime Connected' : '🔴 Connecting...'}
          </span>
        </div>
        <div className="text-xs opacity-75 mt-1">
          Tables: {tables.join(', ')}
        </div>
      </div>
    </div>
  )
}
