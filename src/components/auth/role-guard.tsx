"use client"

import { useAuthContext } from "@/components/providers/auth-provider"
import { ShieldAlert } from "lucide-react"
import { getRoleMetaBase, getSavedRolePages } from "@/lib/role-utils"
import { usePathname } from "next/navigation"
import Link from "next/link"

interface RoleGuardProps {
    pageName?: string
    children: React.ReactNode
}

function getPageNameFromPath(pathname: string): string | null {
    if (pathname.startsWith("/dashboard")) return "Dashboard"
    if (pathname.startsWith("/support")) return "Support"
    if (pathname.startsWith("/groups")) return "Groups"
    if (pathname.startsWith("/billing")) return "Billing"
    if (pathname.startsWith("/admin")) return "Administrator"
    if (pathname.startsWith("/master")) return "Master Data"
    if (pathname.startsWith("/notification")) return "Notifications"
    if (pathname.startsWith("/settings")) return "Settings"
    if (pathname.startsWith("/profile")) return "Profile"
    if (pathname.startsWith("/myqurani")) return "My Qurani"
    return null
}

export function RoleGuard({ pageName: explicitPageName, children }: RoleGuardProps) {
    const { customUser, loading } = useAuthContext()
    const pathname = usePathname()

    if (loading) {
        return null // Let the layout handle global loading or just wait
    }

    // Determine page name
    const pageName = explicitPageName || getPageNameFromPath(pathname || "")
    
    // If we can't determine the page, just let it pass (e.g. root route or unregulated route)
    if (!pageName) return <>{children}</>

    // 2. Check API Qurani Roles (customUser)
    const userRoles = customUser?.roles || []
    
    // Default to "Member" if no roles assigned (or if we want to be strict, we can deny)
    const activeRoles = userRoles.length > 0 ? userRoles : ["Member"]

    let hasAccess = false

    // Check if ANY of the user's roles has access to this page
    for (const role of activeRoles) {
        const baseMeta = getRoleMetaBase(role)
        const allowedPages = getSavedRolePages(role, baseMeta.pages)
        
        // If the role has access to this page, grant access
        if (allowedPages.includes(pageName as string)) {
            hasAccess = true
            break
        }
    }

    if (!hasAccess) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Akses Ditolak (403)</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Maaf, role Anda <strong>({activeRoles.join(", ")})</strong> tidak memiliki izin untuk melihat halaman <strong>{pageName}</strong>. 
                        Hubungi Administrator jika Anda merasa ini adalah sebuah kesalahan.
                    </p>
                    <div className="pt-4">
                        <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                            Kembali ke Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
