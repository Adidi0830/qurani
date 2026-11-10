"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useLocalizedRouter as useRouter } from "@/hooks/use-localized-router"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useUnreadCount } from "@/hooks/use-notifications"
import { AppSidebar } from "@/components/ui/sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar/custom-sidebar"
import { SidebarInset } from "@/components/ui/sidebar/custom-sidebar-inset"
import { SidebarTrigger } from "@/components/ui/sidebar/custom-sidebar-trigger"
import Image from "next/image"
import { LocalizedLink as Link } from "@/components/ui/localized-link"
import { RoleGuard } from "@/components/auth/role-guard"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { loading, isAuthenticated, userId } = useAuth()
  const { unreadCount } = useUnreadCount(isAuthenticated ? userId : undefined)
  const [hasVisitedNotifications, setHasVisitedNotifications] = useState(false)

  // Strip locale prefix from pathname for comparisons
  const strippedPathname = (() => {
    const LOCALES = ["id", "en", "ar"]
    const segments = (pathname ?? "/").split("/").filter(Boolean)
    if (segments.length > 0 && LOCALES.includes(segments[0])) {
      return "/" + segments.slice(1).join("/")
    }
    return pathname ?? "/"
  })()

  // Cek apakah user sedang di halaman notifikasi
  const isOnNotificationsPage = strippedPathname === '/notification'

  // Memoize keys untuk menghindari pembuatan string berulang
  const visitKey = useMemo(() => userId ? `notifications_visited_${userId}` : '', [userId])
  const lastCountKey = useMemo(() => userId ? `last_notification_count_${userId}` : '', [userId])

  // Load status kunjungan dari localStorage saat component mount
  useEffect(() => {
    if (visitKey) {
      const hasVisited = localStorage.getItem(visitKey) === 'true'
      setHasVisitedNotifications(hasVisited)
    }
  }, [visitKey])

  // Simpan status kunjungan ketika user masuk ke halaman notifikasi
  useEffect(() => {
    if (isOnNotificationsPage && visitKey) {
      console.log('Layout2: User is on notifications page, saving visit status:', visitKey)
      localStorage.setItem(visitKey, 'true')
      setHasVisitedNotifications(true)
    }
  }, [isOnNotificationsPage, visitKey])

  // Reset status kunjungan jika ada notifikasi baru masuk (untuk menampilkan badge lagi)
  useEffect(() => {
    if (visitKey && unreadCount > 0 && hasVisitedNotifications) {
      const lastCount = parseInt(localStorage.getItem(lastCountKey) || '0')

      // Jika ada notifikasi baru (count bertambah), reset status kunjungan
      if (unreadCount > lastCount) {
        localStorage.removeItem(visitKey)
        setHasVisitedNotifications(false)
      }

      // Simpan count terbaru
      localStorage.setItem(lastCountKey, unreadCount.toString())
    }
  }, [unreadCount, visitKey, hasVisitedNotifications, lastCountKey])

  // Badge logic SEDERHANA:
  // Badge HILANG jika user sedang di halaman notifikasi ATAU sudah pernah mengunjungi
  // Badge MUNCUL LAGI jika ada notifikasi baru masuk
  const showMobileBadge = useMemo(() => unreadCount > 0 && !isOnNotificationsPage && !hasVisitedNotifications, [unreadCount, isOnNotificationsPage, hasVisitedNotifications])

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Gunakan force-logout (bypass middleware) agar hapus httpOnly cookies
      // sebelum ke login — mencegah infinite redirect loop
      window.location.href = '/api/auth/force-logout';
    }
  }, [loading, isAuthenticated]);

  // Show loading only while checking session
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Show loading while redirecting to login
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <SidebarProvider className="select-none">
      <AppSidebar />
      <SidebarInset>
        {/* Header - tombol sidebar dengan background yang lebih terlihat di mobile */}
        <header className="fixed top-0 left-0 right-0 z-50 md:absolute md:top-4 md:left-4 md:right-auto">
          <div className="flex items-center justify-between p-4 pt-safe md:p-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 md:bg-transparent md:backdrop-blur-none md:border-none">
            <div className="relative">
              <SidebarTrigger
                className="md:hidden bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm md:bg-transparent md:hover:bg-white/10 md:dark:hover:bg-black/10 md:border-0 md:shadow-none"
                notificationCount={unreadCount}
              />
              {/* BADGE NOTIFIKASI MOBILE - hilang ketika di halaman notifikasi */}
              {showMobileBadge && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full z-[9999] border-2 border-white shadow-lg md:hidden">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {/* Logo */}
            <Link href="/dashboard" className="md:hidden">
              <Image src="/icons/Qurani - Logo Green.png" alt="Qurani" width={80} height={80} className="dark:hidden" />
              <Image src="/icons/Qurani - Logo White.png" alt="Qurani" width={80} height={80} className="dark:block hidden" />
            </Link>
          </div>
        </header>
        {/* Content container - dengan padding top yang cukup untuk mobile header */}
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 pt-20 md:pt-7 p-4 lg:px-10 xl:px-10 overflow-y-auto">
          <div className="lg:pt-0">
            <RoleGuard>
              {children}
            </RoleGuard>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}