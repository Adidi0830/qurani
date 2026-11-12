"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useI18n } from "@/components/providers/i18n-provider"
import { AppSidebar } from "@/components/ui/sidebar/app-sidebar"
import { SidebarProvider as CustomSidebarProvider } from "@/components/ui/sidebar/custom-sidebar"
import { SidebarInset as CustomSidebarInset } from "@/components/ui/sidebar/custom-sidebar-inset"
import {
  SidebarProvider as RtlSidebarProvider,
  SidebarInset as RtlSidebarInset,
} from "@/components/ui/sidebar"
import { Topbar } from "@/components/ui/topbar"
import { RoleGuard } from "@/components/auth/role-guard"
import { cn } from "@/lib/utils"

interface AdminLayoutProps {
  children: React.ReactNode
}

function AdminShell({ children }: AdminLayoutProps) {
  const { loading, isAuthenticated } = useAuth()
  const { locale } = useI18n()
  const [hasMounted, setHasMounted] = useState(false)
  const isRtl = locale === "ar"

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Redirect unauthenticated users
  useEffect(() => {
    if (hasMounted && !loading && !isAuthenticated) {
      document.cookie = 'myqurani_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'myqurani_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = "/api/auth/force-logout"
    }
  }, [hasMounted, loading, isAuthenticated])

  // Show spinner while checking auth
  if (!hasMounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  // Still redirecting
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  const Provider = isRtl ? RtlSidebarProvider : CustomSidebarProvider
  const Inset = isRtl ? RtlSidebarInset : CustomSidebarInset

  return (
    <Provider dir={isRtl ? "rtl" : undefined} className="select-none">
      <AppSidebar />
      <Inset>
        <Topbar />
        {/* pt-16 di LTR agar konten tidak tertimpa topbar fixed height 64px */}
        <div
          dir={isRtl ? "ltr" : undefined}
          className={cn(
            "min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4 lg:px-10 xl:px-10 overflow-y-auto",
            isRtl ? "pt-4" : "pt-16"
          )}
        >
          <div className="lg:pt-4">
            <RoleGuard>
              {children}
            </RoleGuard>
          </div>
        </div>
      </Inset>
    </Provider>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminShell>{children}</AdminShell>
}
