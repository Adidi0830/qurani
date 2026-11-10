"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AppSidebar } from "@/components/ui/sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar/custom-sidebar"
import { SidebarInset } from "@/components/ui/sidebar/custom-sidebar-inset"
import { Topbar } from "@/components/ui/topbar"
import { RoleGuard } from "@/components/auth/role-guard"

interface AdminLayoutProps {
  children: React.ReactNode
}

function AdminShell({ children }: AdminLayoutProps) {
  const { loading, isAuthenticated } = useAuth()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Redirect unauthenticated users
  useEffect(() => {
    if (hasMounted && !loading && !isAuthenticated) {
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

  return (
    <SidebarProvider className="select-none">
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        {/* pt-16 agar konten tidak tertimpa topbar fixed height 64px */}
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 pt-16 p-4 lg:px-10 xl:px-10 overflow-y-auto">
          <div className="lg:pt-4">
            <RoleGuard>
              {children}
            </RoleGuard>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminShell>{children}</AdminShell>
}
