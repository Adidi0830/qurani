"use client"

import { AlertCircle, ArrowLeft } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { KelolaGrup } from "./kelola-grup"
import { useGroupManage } from "@/hooks/use-group-manage"
import { checkRole } from "@/utils/helpers/checkRole"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface KelolaGrupPageProps {
  groupId: string
}

export function KelolaGrupPage({ groupId }: KelolaGrupPageProps) {
  const { t } = useI18n()
  const { userId, loading: isAuthLoading } = useAuth()
  const router = useRouter()

  // Use SWR hook for group data
  const { group, isLoading, error, refresh } = useGroupManage(groupId, userId)

  const handleGroupUpdate = () => {
    // Refresh group data after update
    refresh()
  }

  // Loading state - check both auth and group loading
  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">{t('kelola grup.loading.group_data', 'Loading group data...')}</div>
        </div>
      </div>
    )
  }

  console.log('group', group)

  // Error state - grup tidak ditemukan (hanya muncul setelah SEMUA loading selesai)
  if (!group) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center max-w-md">
            {/* Title */}
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">
              {t('kelola grup.error.group_not_found', 'Group Not Found')}
            </h2>

            {/* Description */}
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              {error || t(
                'kelola grup.error.group_not_found_desc',
                'The group you\'re looking for may have been deleted or you don\'t have access to manage it.'
              )}
            </p>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => router.push('/grup')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('kelola grup.error.back', 'Back')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = checkRole(userId ?? "", group) === "owner"
  const isAdmin = checkRole(userId ?? "", group) === "admin"
  const userRole = isOwner ? "owner" : isAdmin ? "admin" : "member"

  if ((!isAdmin && !isOwner) || !!group?.deleted_at) {
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
              {t('kelola grup.error.access_denied', 'Access Denied')}
            </h2>

            {/* Deskripsi */}
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              {t('kelola grup.error.access_denied_desc', 'You don\'t have permission to manage this group.')}
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
      <KelolaGrup
        isOwner={isOwner}
        initialGroup={group}
        onUpdate={handleGroupUpdate}
        userRole={userRole}
      />
    </div>
  )
}
