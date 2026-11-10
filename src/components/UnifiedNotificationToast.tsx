"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, X, ExternalLink, Users, UserPlus, Bell } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { notificationsApi } from "@/lib/api"

interface ToastNotification {
    id: string
    type: string
    ticketId?: number
    senderName: string
    message: string
    createdAt: string
    actionUrl?: string
}

export function UnifiedNotificationToast() {
    const router = useRouter()
    const { userId, isAuthenticated, loading } = useAuth()
    const [toast, setToast] = useState<ToastNotification | null>(null)
    const subscriptionSetupRef = useRef(false)
    const userIdRef = useRef<string | null>(null)
    const lastCheckTimeRef = useRef<number>(Date.now())
    
    // Deduplication: track recent toasts to prevent spam
    const recentToastsRef = useRef<Map<string, number>>(new Map())

    // Keep userId ref in sync
    useEffect(() => {
        userIdRef.current = userId ?? null
    }, [userId])

    const dismissToast = useCallback(() => {
        setToast(null)
    }, [])

    const handleAction = useCallback((url: string) => {
        router.push(url)
        dismissToast()
    }, [router, dismissToast])

    const showToast = useCallback((notification: any) => {
        // Skip if this is admin's own action (admin should not see their own replies)
        if (notification.fromUserId && notification.fromUserId.toString() === userIdRef.current) {
            return
        }

        const type = notification.type;
        const ticketId = notification.ticketId || notification.ticket_id || notification.recapId || null;
        const notificationId = notification.id.toString();

        // Deduplication key
        const dedupKey = ticketId ? `${type}-${ticketId}` : notificationId
        const now = Date.now()
        const lastShown = recentToastsRef.current.get(dedupKey)
        if (lastShown && (now - lastShown) < 5000) {
            return
        }
        recentToastsRef.current.set(dedupKey, now)

        // Cleanup old entries
        const oneHourAgo = now - 3600000
        for (const [key, timestamp] of recentToastsRef.current.entries()) {
            if (timestamp < oneHourAgo) recentToastsRef.current.delete(key)
        }

        let senderName = notification.fromUser?.name || notification.fromUser?.username || "User"
        let message = ""
        let actionUrl = "/notification"

        // Handle different notification types
        if (type === "ticket_new_message" || type === "ticket_replay") {
            if (ticketId) {
                actionUrl = `/support/tickets/${ticketId}`
            }
            if (type === "ticket_new_message") {
                message = "Tiket support baru"
            } else {
                message = `Balasan baru dari ${senderName}`
            }
        } else if (type === "friend_request") {
            message = `${senderName} mengirim permintaan pertemanan`
        } else if (type === "friend_accepted") {
            message = `${senderName} menerima permintaan Anda`
        } else if (type === "group_invitation") {
            message = `${senderName} mengundang Anda ke grup`
            actionUrl = "/groups"
        } else if (type === "group_join_request") {
            message = `${senderName} ingin bergabung ke grup Anda`
            actionUrl = "/groups"
        } else if (type === "recap_notification") {
            message = `Ada setoran baru dari ${senderName}`
        } else {
            message = `Notifikasi baru dari ${senderName}`
        }

        const newToast: ToastNotification = {
            id: notificationId,
            type,
            ticketId: ticketId ?? undefined,
            senderName,
            message,
            createdAt: new Date().toISOString(),
            actionUrl
        }

        setToast(newToast)
    }, [])

    useEffect(() => {
        if (loading || !isAuthenticated || !userId) {
            return
        }

        if (subscriptionSetupRef.current) {
            return
        }
        subscriptionSetupRef.current = true

        // Use polling via API Qurani to get new notifications
        const fetchLatestNotifications = async () => {
            try {
                // Fetch the latest 5 notifications
                const response = await notificationsApi.getWithCursor({ pageSize: 5 })
                const data = response?.data || response
                const items = Array.isArray(data) ? data : (data?.data || [])

                items.forEach((notif: any) => {
                    const notifTime = new Date(notif.createdAt || notif.created_at).getTime()
                    // If notification was created after our last check
                    if (notifTime > lastCheckTimeRef.current) {
                        showToast(notif)
                    }
                })

                lastCheckTimeRef.current = Date.now()
            } catch (error) {
                console.error("Failed to poll notifications:", error)
            }
        }

        // Poll every 30 seconds
        const intervalId = setInterval(fetchLatestNotifications, 30000)

        return () => {
            subscriptionSetupRef.current = false
            clearInterval(intervalId)
        }
    }, [loading, isAuthenticated, userId, showToast])

    if (!toast) return null

    const getIcon = () => {
        switch (toast.type) {
            case "ticket_new_message":
            case "ticket_replay":
                return <MessageSquare className="w-5 h-5 text-white" />
            case "friend_request":
            case "friend_accepted":
                return <UserPlus className="w-5 h-5 text-white" />
            case "group_invitation":
            case "group_join_request":
                return <Users className="w-5 h-5 text-white" />
            default:
                return <Bell className="w-5 h-5 text-white" />
        }
    }

    const getTitle = () => {
        switch (toast.type) {
            case "ticket_new_message":
                return "Tiket Baru"
            case "ticket_replay":
                return "Balasan Tiket"
            case "friend_request":
                return "Permintaan Pertemanan"
            case "friend_accepted":
                return "Pertemanan Diterima"
            case "group_invitation":
                return "Undangan Grup"
            case "group_join_request":
                return "Permintaan Bergabung"
            case "recap_notification":
                return "Setoran Baru"
            default:
                return "Notifikasi"
        }
    }

    return (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-[9999] sm:w-[340px] animate-in slide-in-from-right-5 fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                {getIcon()}
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm">{getTitle()}</p>
                            </div>
                        </div>
                        <button
                            onClick={dismissToast}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                            {toast.senderName.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{toast.senderName}</p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{toast.message}</p>
                </div>

                <div className="px-4 pb-4 flex gap-2">
                    <button
                        onClick={() => {
                            const url = toast.actionUrl || "/notification"
                            handleAction(url)
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Lihat Detail
                    </button>
                    <button
                        onClick={dismissToast}
                        className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    )
}