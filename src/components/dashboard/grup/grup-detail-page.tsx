"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { GrupDetail } from "./grup-detail"
import { useGroupDetail } from "@/hooks/use-grup-data"
import { checkRole } from "@/utils/helpers/checkRole"
import { GroupDetail } from "@/types/grup"
import { I18nProvider, useI18n } from "@/components/providers/i18n-provider"
import { useCallback } from "react"
import { AlertCircle, ArrowLeft } from "lucide-react"

interface GrupDetailPageProps {
    groupId: string
}

// Internal component that uses i18n hooks inside provider
function GrupDetailContent({ groupId }: GrupDetailPageProps) {
    const router = useRouter()
    const { userId, loading: authLoading } = useAuth()
    const { t } = useI18n()

    // SWR hook for group detail data
    const { group, isLoading: loading, error } = useGroupDetail(groupId, userId)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleGroupUpdate = useCallback((updatedGroup: GroupDetail) => {
        // Note: With SWR, group updates should be handled via mutations
        // This callback is kept for backward compatibility but may not be needed
    }, [])

    // Simple calculations - no need for memoization
    const isOwner = group ? checkRole(userId ?? "", group) === "owner" : false
    const isAdmin = group ? checkRole(userId ?? "", group) === "admin" : false
    const userRole = isOwner ? "owner" : isAdmin ? "admin" : "member"

    // Use is_member from API directly (more reliable), fallback to checking grup_members array
    const isMember = group ? (
        group.is_member === true ||
        isOwner ||
        isAdmin ||
        (group.grup_members && group.grup_members.some((member: { user_id: string }) => member.user_id === userId))
    ) : false

    // Loading state - check both auth and group loading
    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <div className="text-sm text-muted-foreground">Loading group data...</div>
                </div>
            </div>
        )
    }

    // Error state - grup tidak ditemukan (hanya muncul setelah SEMUA loading selesai)
    if (!loading && !authLoading && (error || !group)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="text-base font-medium mb-2">{t('grup detail.errors.group_not_found', 'Group not found')}</div>
                    <div className="text-sm text-muted-foreground">
                        {error || t('grup detail.errors.group_not_found_description', "The group you're looking for may have been deleted or you don't have access")}
                    </div>
                </div>
            </div>
        )
    }

    // Note: For Admin Panel, we don't redirect owner to manage page
    // All users can view group details regardless of their role

    // For Admin Panel: Allow viewing all groups except deleted ones
    // Note: This is an admin panel, so we don't restrict by membership
    if (group?.deleted_at) {
        return (
            <div className="min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center">
                <div className="relative w-full max-w-md">
                    <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-red-200/70 dark:border-red-800/40 p-8 text-center transition-shadow duration-300 hover:shadow-red-200 dark:hover:shadow-red-900/20">

                        {/* Icon dengan animasi */}
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 animate-pulse">
                            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>

                        {/* Judul */}
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                            {t('grup detail.errors.access_denied', 'Access Denied')}
                        </h2>

                        {/* Deskripsi */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                            {t('grup detail.errors.access_denied_description', "You don't have permission to view this group")}
                        </p>

                        {/* Tombol Kembali */}
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm font-medium shadow-md hover:bg-red-700 hover:shadow-lg transition-all duration-300 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" /> {t('kelola grup.error.back', 'Go Back')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen max-w-7xl mx-auto">
            <div className="space-y-4 pt-4">
                <GrupDetail
                    group={group!}
                    userRole={userRole}
                    onUpdate={handleGroupUpdate}
                />
            </div>
        </div>
    )
}

// Main exported component that wraps content with provider
export function GrupDetailPage({ groupId }: GrupDetailPageProps) {
    return (
        <I18nProvider namespaces={["grup detail", "kelola grup"]}>
            <GrupDetailContent groupId={groupId} />
        </I18nProvider>
    )
}
