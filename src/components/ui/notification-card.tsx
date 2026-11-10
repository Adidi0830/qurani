"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getUserAvatar } from "@/utils/get-user-avatar"
import { UserPlus, Users, X, Mail, BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/providers/i18n-provider"

interface NotificationCardProps {
  type: string
  fromUserName: string
  fromUserAvatar: string | null
  fromUserId: string
  groupName?: string
  recitationType?: string
  examinerName?: string
  conclusion?: string
  recapId?: number | null
  onDismiss: () => void
  onAction?: (action: 'accept' | 'reject') => void
}

export function NotificationCard({
  type,
  fromUserName,
  fromUserAvatar,
  groupName,
  recitationType,
  examinerName,
  conclusion,
  recapId,
  onDismiss,
  onAction
}: NotificationCardProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss()
    }, 300)
  }, [onDismiss])

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Auto dismiss after 7 seconds for all notification types
  useEffect(() => {
    const dismissTime = 7000
    const timer = setTimeout(() => {
      handleDismiss()
    }, dismissTime)
    return () => clearTimeout(timer)
  }, [handleDismiss])

  const handleAccept = useCallback(() => {
    onAction?.('accept')
    handleDismiss()
  }, [onAction, handleDismiss])

  const handleReject = useCallback(() => {
    onAction?.('reject')
    handleDismiss()
  }, [onAction, handleDismiss])

  const handleCardClick = useCallback(() => {
    if (type === 'recap_notification' && recapId) {
      router.push(`/dashboard`)
    } else if (type === 'friend_request' || type === 'group_invite') {
      router.push('/notifikasi')
    }
    handleDismiss()
  }, [type, recapId, router, handleDismiss])

  const avatarUrl = getUserAvatar(
    fromUserAvatar,
    fromUserAvatar,
    fromUserName || 'Unknown User'
  )

  const getIcon = () => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-2.5 h-2.5 text-white" />
      case 'group_invite':
        return <Users className="w-2.5 h-2.5 text-white" />
      case 'recap_notification':
        return <Mail className="w-2.5 h-2.5 text-white" />
      default:
        return <BookOpen className="w-2.5 h-2.5 text-white" />
    }
  }

  const getMessage = () => {
    switch (type) {
      case 'friend_request':
        return t('notifikasi.mengirim_anda_permintaan_teman', 'Mengirim Anda Permintaan Teman')
      case 'group_invite':
        return (
          <>
            {t('notifikasi.mengundang_anda_bergabung_dengan_grup', 'Mengundang Anda untuk bergabung dengan grup')} <span className="font-medium text-slate-700 dark:text-slate-300">{groupName}</span>
          </>
        )
      case 'recap_notification':
        const hasConclusion = conclusion && conclusion.trim()
        if (hasConclusion) {
          const conclusionLower = conclusion!.toLowerCase().replace(/\s+/g, '_')
          const translationKey = `notifikasi.${conclusionLower}`
          const translatedConclusion = t(translationKey, conclusion!)

          return (
            <>
              {t('notifikasi.recap_completed_message', 'telah menyelesaikan sesi setoran')} <span className="font-bold capitalize">{recitationType === "praquran" ? "pra quran" : recitationType || 'tahfidz'}</span> {t('notifikasi.kepada_penguji', 'kepada penguji')} <span className="font-bold">{examinerName || t('notifikasi.tidak_diketahui', 'Tidak Diketahui')}</span> {t('notifikasi.dengan_hasil', 'dengan hasil')} <span className="font-bold text-emerald-600 dark:text-emerald-400">{translatedConclusion}</span>
            </>
          )
        } else {
          return (
            <>
              {t('notifikasi.recap_completed_message', 'telah menyelesaikan sesi setoran')} <span className="font-bold capitalize">{recitationType === "praquran" ? "pra quran" : recitationType || 'tahfidz'}</span> {t('notifikasi.kepada_penguji', 'kepada penguji')} <span className="font-bold">{examinerName || t('notifikasi.tidak_diketahui', 'Tidak Diketahui')}</span>
            </>
          )
        }
      default:
        return 'Notifikasi baru'
    }
  }

  const showActionButtons = type === 'friend_request' || type === 'group_invite'

  return (
    <div
      className={`
        fixed top-4 right-4 z-[9999] max-w-sm w-full
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
      style={{
        pointerEvents: isExiting ? 'none' : 'auto'
      }}
    >
      <div
        className="
          relative overflow-hidden rounded-xl border-2
          bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30
          border-blue-200 dark:border-blue-800
          shadow-2xl backdrop-blur-sm
          hover:shadow-3xl hover:scale-[1.02]
          transition-all duration-300
          cursor-pointer
        "
        onClick={handleCardClick}
      // onClick={showActionButtons ? undefined : handleCardClick}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDismiss()
          }}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
        </button>

        {/* Unread indicator - animated pulse */}
        <div className="absolute top-3 right-10 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
        <div className="absolute top-3 right-10 w-2.5 h-2.5 bg-blue-500 rounded-full" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar with icon */}
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-700 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800">
                <AvatarImage
                  src={avatarUrl}
                  alt={fromUserName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold">
                  {fromUserName?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {/* Notification type icon */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                {getIcon()}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-6">
              <h3
                className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 transition-colors cursor-pointer"
              // onClick={(e) => {
              //   e.stopPropagation()
              //   router.push('/profile/' + examinerName?.replace(/^@/, ''))
              //   handleDismiss()
              // }}
              >
                {fromUserName}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {getMessage()}
              </p>

              {/* Action buttons */}
              {showActionButtons && (
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAccept()
                    }}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs h-8 rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    {type === 'friend_request' ? (
                      <>
                        <UserPlus className="h-3 w-3 mr-1" />
                        {t('notifikasi.terima', 'Terima')}
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3 mr-1" />
                        {t('notifikasi.terima_undangan', 'Terima')}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReject()
                    }}
                    size="sm"
                    variant="outline"
                    className="flex-1 border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-8 rounded-lg"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t('notifikasi.decline', 'Tolak')}
                  </Button>
                </div>
              )}

              {/* View button for recap notifications */}
              {type === 'recap_notification' && recapId && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboard`)
                    handleDismiss()
                  }}
                  size="sm"
                  className="mt-3 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs h-8 rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  {t('notifikasi.lihat', 'Lihat')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        <div className="h-1 bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-progress-bar"
            style={{
              animationDuration: '7s'
            }}
          />
        </div>
      </div>
    </div>
  )
}
