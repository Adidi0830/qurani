"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SkeletonUserList } from "@/components/ui/skeleton-user-card"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getUserAvatar } from "@/utils/get-user-avatar"
import { UserPlus, Users, X, Bell, Loader2, Trash2, MoreVertical, Trash, BookOpen, Search, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { acceptGroupInvitation, rejectGroupInvitation } from "@/utils/api/grup/invitations"
import { acceptFriendRequest, rejectOrCancelFriendRequest } from "@/utils/api/friends"
import { notificationsApi } from "@/lib/api"
import { useI18n } from "../providers/i18n-provider"
import { ClientCache } from "@/utils/cache/client-cache"
import { useRealtime } from "@/hooks/use-realtime"
import Link from "next/link"
import { Input } from "../ui/input"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/hooks/use-notifications"
import { SimNotifSection } from "@/components/admin/sim-notif-section"

interface MappedNotification {
    id: string;
    type: string;
    is_read: boolean;
    is_action_taken: boolean;
    is_accept_friend: boolean | null;
    created_at: string;
    group_id: string | null;
    groupName: string;
    fromUserName: string;
    fromUserUsername: string;
    fromUserAvatar: string | null;
    fromUserProfileUser: string | null;
    fromUserId: string;
    userId: string;
    recap_id?: number | null;
    recitationType?: string;
    examinerName?: string;
    conclusion?: string;
    memorization?: string;
    ticket_id?: number | string | null;
    ticketContact?: string;
    ticketSubject?: string;
    ticketNumber?: string;
    latestReplyAuthor?: string;
    latestReplyMessage?: string;
}

interface NotifikasiProps {
    userId: string
}

interface StoredTicketReminder {
    id?: string
    title?: string
    date?: string
    dueAt?: string
    staff?: string
    ticketId?: string
    ticketSubject?: string
    ticketNumber?: string
    createdAt?: string
}

const TICKET_REMINDER_NOTIFICATION_STORAGE_KEY = "ticket_due_reminder_notifications_v1"

// Utility function untuk debounce
function debounce<TArgs extends readonly unknown[]>(
    func: (...args: TArgs) => void,
    wait: number
): (...args: TArgs) => void {
    let timeout: NodeJS.Timeout
    return (...args: TArgs) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}

// Function to optimize memorization range display
function optimizeMemorizationDisplay(memorization: string): string {
    if (!memorization) return '';

    // Check if the text contains a range pattern like "surah:start - surah:end"
    const rangePattern = /^([^:]+):(\d+)\s*-\s*([^:]+):(\d+)$/
    const match = memorization.match(rangePattern)

    if (match) {
        const [, startSurah, startVerse, endSurah, endVerse] = match

        // If both surah names are the same, optimize the display
        if (startSurah.trim().toLowerCase() === endSurah.trim().toLowerCase()) {
            return `${startSurah.trim()}: ${startVerse}-${endVerse}`
        }

        // If different surahs, keep the original format
        return memorization
    }

    // If it doesn't match the pattern, return as is
    return memorization
}

// Define props interface
interface NotificationItemProps {
    notification: MappedNotification
    index: number
    onAcceptInvitation: (notificationId: string, groupId: string) => void
    onRejectInvitation: (notificationId: string) => void
    onAcceptFriend: (requesterId: string, received_id: string, notificationId: string) => void
    onRejectFriend: (requesterId: string, received_id: string, notificationId: string) => void
    actionLoading: string | null
    registerNotification: (id: string, element: HTMLDivElement | null) => void
    getTimeAgo: (dateString: string) => string
    clickedNotifications: Set<string>
    onNotificationClick: (notification: MappedNotification) => void
    onTouchEnd: () => void
    isMobile: boolean
}

// Memoized notification item component untuk menghindari re-render yang tidak perlu
const NotificationItem = memo(function NotificationItem({
    notification,
    index,
    onAcceptInvitation,
    onRejectInvitation,
    onAcceptFriend,
    onRejectFriend,
    actionLoading,
    registerNotification,
    getTimeAgo,
    clickedNotifications,
    onNotificationClick,
    onTouchEnd,
    isMobile
}: NotificationItemProps) {
    const router = useRouter()
    const { t } = useI18n()

    const isConfirmed = notification.is_action_taken || clickedNotifications.has(notification.id)
    const isTicketNotification =
        notification.type === "ticket_reply" ||
        notification.type === "ticket_new_message" ||
        notification.type === "ticket_reminder_due"

    // No need for container click handler since we have dedicated delete button
    const handleClick = () => {
        // Container click disabled - delete button handles the action
    }

    return (
        <div
            key={notification.id}
            ref={(el) => registerNotification(notification.id, el)}
            onClick={handleClick}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            className={`group relative overflow-hidden rounded-xl border p-2 sm:p-4 transition-all duration-300 hover:shadow-lg ${!notification.is_read
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-2 fade-in-0"
                : isConfirmed && !isMobile
                    ? "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600"
                    : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                }`}
            style={{
                animationDelay: `${index * 50}ms`
            }}
        >
            {/* Unread indicator */}
            {!notification.is_read && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse z-10" />
            )}

            {/* Delete button moved to inline with View buttons below */}


            <div className="flex items-start gap-2 sm:gap-3">
                <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white dark:border-slate-700 shadow-lg">
                        {(() => {
                            const avatarUrl = getUserAvatar(
                                notification.fromUserAvatar,
                                notification.fromUserAvatar,
                                notification.fromUserName || 'Unknown User' // name for generated avatar (priority 3)
                            )

                            // For ticket notifications, don't show user avatar link
                            if (isTicketNotification) {
                                return (
                                    <>
                                        <AvatarImage
                                            src="/icons/ticket-support.svg"
                                            alt="Support Ticket"
                                            className="object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-semibold text-sm sm:text-base">
                                            🎫
                                        </AvatarFallback>
                                    </>
                                )
                            }

                            return (
                                <Link href={'/profile/' + notification.fromUserUsername?.replace(/^@/, '')}>
                                    <AvatarImage
                                        src={avatarUrl}
                                        alt={notification.fromUserName}
                                        className="object-cover"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                            // Fallback jika gambar gagal dimuat
                                            e.currentTarget.style.display = 'none'
                                        }}
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold text-sm sm:text-base">
                                        {notification.fromUserName
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase() || "?"}
                                    </AvatarFallback>
                                </Link>
                            )
                        })()}
                    </Avatar>
                    {/* Notification type icon */}
                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                        {notification.type === "group_invite" && <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />}
                        {notification.type === "friend_request" && <UserPlus className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />}
                        {notification.type === "recap_notification" && <BookOpen className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />}
                        {isTicketNotification && <MessageSquare className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 pr-0 sm:pr-3">
                            <div className="mb-1.5 flex items-center justify-between">
                                <h3
                                    className={isTicketNotification
                                        ? "font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-200"
                                        : "font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-200 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                    }
                                    onClick={isTicketNotification ? undefined : (e) => {
                                        e.stopPropagation()
                                        router.push('/profile/' + notification.fromUserUsername?.replace(/^@/, ''))
                                    }}
                                    title={isTicketNotification ? undefined : `View ${notification.fromUserName}'s profile`}
                                >
                                    {isTicketNotification
                                        ? (notification.type === "ticket_reminder_due"
                                            ? `${t('notifikasi.ticket_reminder_due_title', 'Reminder Selesai')}: ${notification.ticketSubject || 'Support Ticket'}`
                                            : `${t('notifikasi.ticket_reply_title', 'Update Ticket')}: ${notification.ticketSubject || 'Support'}`)
                                        : notification.fromUserName
                                    }
                                </h3>
                                {/* Timestamp and Three-dot menu - always on the right */}
                                <div className="flex items-center gap-2 shrink-0 sm:flex-shrink-0 min-w-0">
                                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                        {getTimeAgo(notification.created_at)}
                                    </div>

                                    {/* Three-dot menu */}
                                    <div className={notification.type !== "recap_notification" ? "md:hidden" : ""}>
                                        <DropdownMenu >
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreVertical className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onNotificationClick(notification)
                                                    }}
                                                    className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span>{t('notifikasi.hapus', 'Delete')}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                            </div>

                            <div className="text-slate-600 dark:text-slate-400 mb-2 text-xs sm:text-sm">
                                {notification.type === "group_invite" && (
                                    <p>
                                        {t('notifikasi.mengundang_anda_bergabung_dengan_grup', 'Mengundang Anda untuk bergabung dengan grup')} <span className="font-medium text-slate-700 dark:text-slate-300">{notification.groupName}</span>.
                                    </p>
                                )}
                                {notification.type === "friend_request" && (
                                    <p>
                                        {notification.is_action_taken && notification.is_accept_friend === true
                                            ? t('notifikasi.permintaan_teman_diterima', 'Permintaan pertemanan diterima')
                                            : notification.is_action_taken && notification.is_accept_friend === false
                                                ? t('notifikasi.permintaan_teman_ditolak', 'Permintaan pertemanan ditolak')
                                                : t('notifikasi.mengirim_anda_permintaan_teman', 'Mengirim Anda Permintaan Teman')
                                        }
                                    </p>
                                )}
                                {notification.type === "recap_notification" && (
                                    <div className="flex justify-between gap-5">
                                        <p className="break-words hyphens-auto">
                                            {(() => {
                                                // Debug logging
                                                if (process.env.NODE_ENV === 'development') {
                                                    console.log('🔍 Recap notification debug:', {
                                                        id: notification.id,
                                                        conclusion: notification.conclusion,
                                                        conclusionType: typeof notification.conclusion,
                                                        conclusionLength: notification.conclusion?.length,
                                                        hasConclusion: Boolean(notification.conclusion && notification.conclusion.trim())
                                                    });
                                                }

                                                const hasConclusion = notification.conclusion && notification.conclusion.trim();

                                                if (hasConclusion) {
                                                    return (
                                                        <>
                                                            {t('notifikasi.recap_completed_message', 'Recitation')} <span className="font-bold capitalize">{notification.recitationType || 'tahfidz'}</span> <span className="font-bold text-purple-600 dark:text-purple-400">{optimizeMemorizationDisplay(notification.memorization || '')}</span> {t('notifikasi.kepada_penguji', 'to')} <span onClick={() => router.push('/profile/' + notification.fromUserUsername?.replace(/^@/, ''))} className="font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">{notification.examinerName || t('notifikasi.tidak_diketahui', 'Unknown')}</span> {t('notifikasi.dengan_hasil', 'with result')} <span className="font-bold text-emerald-600 dark:text-emerald-400">{(() => {
                                                                // Translate conclusion values - safe because we checked hasConclusion above
                                                                const conclusionValue = hasConclusion as string;
                                                                const conclusionLower = conclusionValue.toLowerCase().replace(/\s+/g, '_');
                                                                const translationKey = `notifikasi.${conclusionLower}`;
                                                                return t(translationKey, conclusionValue);
                                                            })()}</span>
                                                        </>
                                                    );
                                                } else {
                                                    return (
                                                        <>
                                                            {t('notifikasi.recap_completed_message', 'Recitation')} <span className="font-bold capitalize">{notification.recitationType || 'tahfidz'}</span> <span className="font-bold text-purple-600 dark:text-purple-400">{optimizeMemorizationDisplay(notification.memorization || '')}</span> {t('notifikasi.kepada_penguji', 'to')} <span onClick={() => router.push('/profile/' + notification.fromUserUsername?.replace(/^@/, ''))} className="font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">{notification.examinerName || t('notifikasi.tidak_diketahui', 'Unknown')}</span>
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </p>

                                        <div className="flex-row gap-2 justify-end hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            {/* Delete button - left of View */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onNotificationClick(notification)
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-150 active:scale-95"
                                            >
                                                <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                {t('notifikasi.hapus', 'Delete')}
                                            </button>
                                            {/* View button */}
                                            <Button
                                                onClick={() => {
                                                    // Navigate to recap detail page
                                                    router.push(`/setoran/recap/${notification.recap_id}`)
                                                }}
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 border-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-xs sm:text-sm px-3 py-1.5 w-auto flex-1 text-white sm:flex-none"
                                            >
                                                <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white dark:text-white" />
                                                <span className="hidden sm:inline text-white dark:text-white">{t('notifikasi.lihat', 'View ')}</span>
                                                <span className="sm:hidden text-white dark:text-white">{t('notifikasi.lihat', 'View')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {isTicketNotification && (
                                    <div className="flex justify-between gap-5">
                                        <p className="break-words hyphens-auto">
                                            {notification.type === "ticket_reminder_due"
                                                ? `${t('notifikasi.ticket_reminder_due_message', 'Reminder ticket telah selesai')}${notification.ticketNumber ? ` (${notification.ticketNumber})` : ''}.`
                                                : notification.latestReplyAuthor && notification.latestReplyMessage
                                                ? `${notification.latestReplyAuthor} ${t('notifikasi.replied_message', 'membalas')}: "${notification.latestReplyMessage}"`
                                                : `${t('notifikasi.ticket_reply', 'Pesan baru pada ticket support')} ${notification.ticketNumber || ''}`
                                            }
                                        </p>

                                        <div className="flex-row gap-2 justify-end hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            {/* Delete button - left of View */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onNotificationClick(notification)
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-150 active:scale-95"
                                            >
                                                <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                {t('notifikasi.hapus', 'Delete')}
                                            </button>
                                            {/* View button */}
                                            <Button
                                                onClick={() => {
                                                    // Navigate to ticket detail page
                                                    router.push(`/support/tickets/${notification.ticket_id}`)
                                                }}
                                                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 active:scale-95 border-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-xs sm:text-sm px-3 py-1.5 w-auto flex-1 text-white sm:flex-none"
                                            >
                                                <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white dark:text-white" />
                                                <span className="hidden sm:inline text-white dark:text-white">{t('notifikasi.lihat', 'View ')}</span>
                                                <span className="sm:hidden text-white dark:text-white">{t('notifikasi.lihat', 'View')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Action buttons for specific notification types */}
                    {notification.type === "friend_request" && !notification.is_action_taken && !clickedNotifications.has(notification.id) && (
                        <div className="flex flex-row gap-2 justify-end">
                            <Button
                                onClick={() => onAcceptFriend(notification.fromUserId, notification.userId, notification.id)}
                                disabled={actionLoading === `friend_request_${notification.fromUserId}`}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 border-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-xs sm:text-sm px-3 py-1.5 w-auto flex-1 text-white sm:flex-none dark:text-white"
                            >
                                {actionLoading === `friend_request_${notification.fromUserId}` ? (
                                    <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                                )}
                                <span className="hidden sm:inline">{t('notifikasi.terima_teman', 'Terima Teman')}</span>
                                <span className="sm:hidden">{t('notifikasi.terima', 'Terima')}</span>
                            </Button>
                            <Button
                                onClick={() => onRejectFriend(notification.fromUserId, notification.userId, notification.id)}
                                disabled={actionLoading === `friend_request_${notification.fromUserId}`}
                                variant="outline"
                                className="border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 rounded-lg transition-all duration-150 text-xs sm:text-sm px-3 py-1.5 w-auto flex-1 sm:flex-none"
                            >
                                {actionLoading === `friend_request_${notification.fromUserId}` ? (
                                    <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                                )}
                                <span className="hidden sm:inline">{t('notifikasi.decline', 'Decline')}</span>
                                <span className="sm:hidden">{t('notifikasi.decline', 'Decline')}</span>
                            </Button>
                        </div>
                    )}

                    {notification.type === "group_invite" && !notification.is_action_taken && !clickedNotifications.has(notification.id) && notification.group_id && (
                        <div className="flex flex-row gap-2 justify-end">
                            <Button
                                onClick={() => onAcceptInvitation(notification.id, notification.group_id!)}
                                disabled={actionLoading === notification.id}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 border-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-xs sm:text-sm px-3 py-1.5 w-auto flex-1 sm:flex-none text-gray-100"
                            >
                                {actionLoading === notification.id ? (
                                    <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                                )}
                                <span className="hidden sm:inline">{t('notifikasi.terima_undangan', 'Terima Undangan')}</span>
                                <span className="sm:hidden">{t('notifikasi.terima', 'Terima')}</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onRejectInvitation(notification.id)}
                                disabled={actionLoading === notification.id}
                                className="border-2 border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 rounded-lg transition-all duration-150 text-xs sm:text-sm px-3 py-1.5 w-auto flex-1 sm:flex-none"
                            >
                                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                                {t('notifikasi.decline', 'Decline')}
                            </Button>
                        </div>
                    )}

                    {notification.type === "recap_notification" && notification.recap_id && (
                        <div className="flex flex-row gap-2 justify-end sm:hidden">
                            <Button
                                onClick={() => {
                                    // Navigate to recap detail page
                                    router.push(`/setoran/recap/${notification.recap_id}`)
                                }}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 border-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-xs sm:text-sm px-3 py-1.5 w-auto flex-1 text-white sm:flex-none"
                            >
                                <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white dark:text-white" />
                                <span className="hidden sm:inline text-white dark:text-white">{t('notifikasi.lihat', 'View ')}</span>
                                <span className="sm:hidden text-white dark:text-white">{t('notifikasi.lihat', 'View')}</span>
                            </Button>
                        </div>
                    )}

                    {isTicketNotification && notification.ticket_id && (
                        <div className="flex flex-row gap-2 justify-end sm:hidden">
                            <Button
                                onClick={() => {
                                    // Navigate to ticket detail page
                                    router.push(`/support/tickets/${notification.ticket_id}`)
                                }}
                                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 active:scale-95 border-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-xs sm:text-sm px-3 py-1.5 w-auto flex-1 text-white sm:flex-none"
                            >
                                <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white dark:text-white" />
                                <span className="hidden sm:inline text-white dark:text-white">{t('notifikasi.lihat', 'View ')}</span>
                                <span className="sm:hidden text-white dark:text-white">{t('notifikasi.lihat', 'View')}</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}, (prevProps: NotificationItemProps, nextProps: NotificationItemProps) => {
    // Custom comparison untuk mencegah re-render yang tidak perlu
    return (
        prevProps.notification.id === nextProps.notification.id &&
        prevProps.notification.is_read === nextProps.notification.is_read &&
        prevProps.notification.is_action_taken === nextProps.notification.is_action_taken &&
        prevProps.actionLoading === nextProps.actionLoading &&
        prevProps.clickedNotifications.has(prevProps.notification.id) === nextProps.clickedNotifications.has(nextProps.notification.id)
    )
})

export function Notifikasi({ userId }: NotifikasiProps) {
    const { t } = useI18n()
    const [notifications, setNotifications] = useState<MappedNotification[]>([])
    const [showFriendRequestOnly, setshowFriendRequestOnly] = useState(false)
    const [showGroupRequestOnly, setshowGroupRequestOnly] = useState(false)
    const [showSetoranOnly, setShowSetoranOnly] = useState(false)
    const [showReportsOnly, setShowReportsOnly] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [clickedNotifications, setClickedNotifications] = useState<Set<string>>(new Set())
    const [deleteAllDialog, setDeleteAllDialog] = useState(false)
    const [deleteAllLoading, setDeleteAllLoading] = useState(false)
    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [searchValue, setSearchValue] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // State untuk modal Send Notification
    const [sendNotifDialog, setSendNotifDialog] = useState(false)
    const [sendNotifLoading, setSendNotifLoading] = useState(false)
    const [sendNotifForm, setSendNotifForm] = useState({
        // Penerima
        targetMode: 'broadcast' as 'broadcast' | 'specific', // 'broadcast' = semua, 'specific' = ID tertentu
        userIds: '' as string, // dipisah koma jika multiple
        platform: '' as string,
        countryCode: '' as string,
        locale: '' as string,
        topic: '' as string,
        // Konten
        title: '',
        message: '',
        type: '',
        priority: '',
        category: '',
        imageUrl: '',
        // Aksi
        actionUrl: '',
        actionData: '',
        channels: 'push,in-app',
        // Waktu
        scheduledAt: '',
        expiresAt: '',
        // Tombol Aksi (max 2)
        actionButtons: [] as { id: string; title: string; url: string; action: string }[],
    })

    // Fetch notifications for current user from API Qurani
    const { notifications: hookNotifications, loading, error, refresh, loadMore, hasNext } = useNotifications(userId)

    const parseReminderDueAt = useCallback((reminder: StoredTicketReminder): Date | null => {
        if (reminder?.dueAt) {
            const fromDueAt = new Date(reminder.dueAt)
            if (!Number.isNaN(fromDueAt.getTime())) return fromDueAt
        }

        if (reminder?.date && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(reminder.date)) {
            const fromDate = new Date(reminder.date)
            if (!Number.isNaN(fromDate.getTime())) return fromDate
        }

        return null
    }, [])

    const removeLocalReminderNotificationById = useCallback((notificationId: string) => {
        if (typeof window === "undefined") return
        try {
            const raw = localStorage.getItem(TICKET_REMINDER_NOTIFICATION_STORAGE_KEY)
            const parsed = raw ? JSON.parse(raw) : {}
            if (parsed && typeof parsed === "object") {
                delete parsed[notificationId]
                localStorage.setItem(TICKET_REMINDER_NOTIFICATION_STORAGE_KEY, JSON.stringify(parsed))
            }
        } catch (error) {
            console.error("Failed removing local reminder notification:", error)
        }
    }, [])

    const buildLocalReminderDueNotifications = useCallback((): MappedNotification[] => {
        if (typeof window === "undefined") return []

        const now = Date.now()
        const dueNotifications: MappedNotification[] = []
        let changed = false

        let createdMap: Record<string, string> = {}
        try {
            const raw = localStorage.getItem(TICKET_REMINDER_NOTIFICATION_STORAGE_KEY)
            const parsed = raw ? JSON.parse(raw) : {}
            if (parsed && typeof parsed === "object") {
                createdMap = parsed
            }
        } catch {
            createdMap = {}
        }

        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i)
            if (!key || !/^ticket_(.+)_reminders$/.test(key)) continue

            const ticketId = key.replace(/^ticket_(.+)_reminders$/, "$1")
            if (!ticketId) continue

            try {
                const rawReminders = localStorage.getItem(key)
                if (!rawReminders) continue
                const reminders = JSON.parse(rawReminders)
                if (!Array.isArray(reminders)) continue

                reminders.forEach((reminder: StoredTicketReminder) => {
                    if (!reminder?.id) return
                    const dueAt = parseReminderDueAt(reminder)
                    if (!dueAt) return
                    if (dueAt.getTime() > now) return

                    const notificationId = `ticket_reminder_due_${ticketId}_${reminder.id}`
                    if (!createdMap[notificationId]) {
                        createdMap[notificationId] = new Date().toISOString()
                        changed = true
                    }

                    const createdAt = createdMap[notificationId]
                    dueNotifications.push({
                        id: notificationId,
                        type: "ticket_reminder_due",
                        is_read: false,
                        is_action_taken: true,
                        is_accept_friend: null,
                        created_at: createdAt,
                        group_id: null,
                        groupName: "",
                        fromUserName: "Reminder Ticket",
                        fromUserUsername: "",
                        fromUserAvatar: null,
                        fromUserProfileUser: null,
                        fromUserId: "system",
                        userId,
                        ticket_id: reminder.ticketId || ticketId,
                        ticketContact: reminder.staff || "Support Staff",
                        ticketSubject: reminder.title || reminder.ticketSubject || "Support Ticket Reminder",
                        ticketNumber: reminder.ticketNumber || `#${ticketId}`,
                        latestReplyAuthor: "",
                        latestReplyMessage: "",
                    })
                })
            } catch (error) {
                console.error("Failed parsing ticket reminders:", error)
            }
        }

        if (changed) {
            localStorage.setItem(TICKET_REMINDER_NOTIFICATION_STORAGE_KEY, JSON.stringify(createdMap))
        }

        return dueNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [parseReminderDueAt, userId])

    // Mirror hook data + local due reminders to local state
    useEffect(() => {
        const incoming = hookNotifications || []
        const dueReminderNotifications = buildLocalReminderDueNotifications()
        const mergedIncoming = [...incoming, ...dueReminderNotifications]

        // Remove duplicates by ID to ensure uniqueness at frontend level
        const uniqueIncoming = mergedIncoming.filter((item: MappedNotification, index: number, self: MappedNotification[]) =>
            index === self.findIndex((t: MappedNotification) => t.id === item.id)
        );

        // FIX: Compare with current state, not dependency
        setNotifications(prevNotifications => {
            // Only update if data actually changed
            if (JSON.stringify(uniqueIncoming) === JSON.stringify(prevNotifications)) {
                return prevNotifications
            }

            const scrollElement = document.querySelector('[data-notification-container]') as HTMLElement | null
            const scrollTop = scrollElement?.scrollTop || 0

            // Restore scroll after state update
            setTimeout(() => {
                if (scrollElement) {
                    scrollElement.scrollTop = scrollTop
                }
            }, 0)

            return uniqueIncoming
        })
    }, [hookNotifications, buildLocalReminderDueNotifications])

    useEffect(() => {
        const syncLocalReminderNotifications = () => {
            const dueReminderNotifications = buildLocalReminderDueNotifications()
            setNotifications((prev) => {
                const nonReminderNotifications = prev.filter(
                    (item) => item.type !== "ticket_reminder_due"
                )
                const merged = [...nonReminderNotifications, ...dueReminderNotifications]
                return merged.filter((item, index, self) =>
                    index === self.findIndex((t) => t.id === item.id)
                )
            })
        }

        syncLocalReminderNotifications()
        window.addEventListener("ticket-reminder-updated", syncLocalReminderNotifications)
        window.addEventListener("focus", syncLocalReminderNotifications)
        window.addEventListener("storage", syncLocalReminderNotifications)

        return () => {
            window.removeEventListener("ticket-reminder-updated", syncLocalReminderNotifications)
            window.removeEventListener("focus", syncLocalReminderNotifications)
            window.removeEventListener("storage", syncLocalReminderNotifications)
        }
    }, [buildLocalReminderDueNotifications])

    // Initial error toast (matches previous UX on first load failure)
    useEffect(() => {
        if (error && (hookNotifications?.length ?? 0) === 0) {
            toast.error(t('notifikasi.gagal_memuat_notifikasi', 'Gagal memuat notifikasi'))
        }
    }, [error, hookNotifications, t])

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Mark all notifications as read when component mounts (user visited notifications page)
    useEffect(() => {
        const markAsRead = async () => {
            if (!userId) return

            try {
                // Mark all notifications as read when component mounts (user visited notifications page)
                // We use the new API Qurani endpoint for this
                await notificationsApi.markAllAsRead()
                console.log('Marking all notifications as read for user:', userId)
                
                // Update local state without reload to prevent refresh
                setNotifications(prevNotifications =>
                    prevNotifications.map(notification => ({ ...notification, is_read: true }))
                )
            } catch (error) {
                console.error('Error marking notifications as read:', error)
            }
        }

        markAsRead()
    }, [userId])

    // Debounced mark as read untuk mengurangi API calls
    const debouncedMarkAsRead = useMemo(
        () => debounce(async (notificationId: string) => {
            try {
                await notificationsApi.markAsRead(notificationId)
            } catch (error) {
                console.error('Error marking notification as read:', error)
            }
        }, 500),
        []
    )

    // Manual mark as read when user interacts with notifications
    const markNotificationAsRead = useCallback(async (notificationId: string) => {
        // Update local state immediately untuk UX yang responsif
        setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
                notification.id === notificationId
                    ? { ...notification, is_read: true }
                    : notification
            )
        )

        // Debounced API call
        debouncedMarkAsRead(notificationId)
    }, [debouncedMarkAsRead])

    // Optimized intersection observer dengan debouncing
    const observerRef = useRef<IntersectionObserver | null>(null)
    const notificationRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    const intersectionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

    const debouncedIntersectionHandler = useMemo(
        () => debounce((entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                const target = entry.target as HTMLElement
                const notificationId = target.dataset.notificationId

                if (!notificationId) return

                // Clear existing timeout
                const existingTimeout = intersectionTimeouts.current.get(notificationId)
                if (existingTimeout) {
                    clearTimeout(existingTimeout)
                    intersectionTimeouts.current.delete(notificationId)
                }

                if (entry.isIntersecting) {
                    const notification = notifications.find(n => n.id === notificationId)

                    // Mark as read jika belum dibaca dan terlihat untuk 800ms (dikurangi dari 1000ms)
                    if (notification && !notification.is_read) {
                        const timeout = setTimeout(() => {
                            if (entry.isIntersecting) {
                                markNotificationAsRead(notificationId)
                            }
                            intersectionTimeouts.current.delete(notificationId)
                        }, 800)

                        intersectionTimeouts.current.set(notificationId, timeout)
                    }
                }
            })
        }, 100),
        [notifications, markNotificationAsRead]
    )

    useEffect(() => {
        // Copy current ref to avoid stale closure in cleanup
        const currentTimeouts = intersectionTimeouts.current
        const currentTouchTimeout = touchTimeoutRef.current

        if (!observerRef.current) {
            observerRef.current = new IntersectionObserver(
                debouncedIntersectionHandler,
                {
                    threshold: 0.6, // Tingkatkan threshold untuk performa lebih baik
                    rootMargin: '0px 0px -10% 0px' // Sedikit margin untuk performa
                }
            )
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
            // Clear semua timeouts using copied reference
            currentTimeouts.forEach(timeout => clearTimeout(timeout))
            currentTimeouts.clear()

            // Clear touch timeout
            if (currentTouchTimeout) {
                clearTimeout(currentTouchTimeout)
            }
        }
    }, [debouncedIntersectionHandler])

    // Function to register notification element for observation
    const registerNotification = useCallback((id: string, element: HTMLDivElement | null) => {
        if (!element) return

        notificationRefs.current.set(id, element)
        element.dataset.notificationId = id

        if (observerRef.current) {
            observerRef.current.observe(element)
        }
    }, [])

    // Silent realtime handler untuk notification updates
    const handleRealtimeNotificationUpdate = useCallback(async () => {
        if (!userId || loading) return
        try {
            await refresh()
        } catch (error) {
            // Silent error - tidak mengganggu UX
            console.error('Silent notification update failed:', error)
        }
    }, [userId, loading, refresh])

    // Debounced realtime handler untuk menghindari spam updates
    const debouncedRealtimeHandler = useCallback(() => {
        debounce(handleRealtimeNotificationUpdate, 500)()
    }, [handleRealtimeNotificationUpdate])

    // Supabase Realtime dinonaktifkan - menunggu WebSocket API Qurani (SignalR)
    // Error: wss://supabase-qurani.ubig.web.id koneksi gagal karena tidak ada keys
    const { isConnected: realtimeConnected } = useRealtime({
        userId,
        onDataChange: debouncedRealtimeHandler,
        enabled: false, // Disabled: migrasi ke API Qurani, Supabase Realtime tidak digunakan
        tables: ['notifications', 'friend_requests']
    })

    const filteredNotifications = useMemo(() => {
        let base = notifications;
        if (showFriendRequestOnly) {
            base = base.filter(n => n.type === "friend_request");
        } else if (showGroupRequestOnly) {
            base = base.filter(n => n.type === "group_invite");
        } else if (showSetoranOnly) {
            base = base.filter(n => n.type === "recap_notification");
        } else if (showReportsOnly) {
            base = base.filter(
                n => n.type === "ticket_reply" || n.type === "ticket_new_message" || n.type === "ticket_reminder_due"
            );
        }
        if (searchQuery.trim() !== "") {
            const q = searchQuery.trim().toLowerCase();
            base = base.filter(n =>
                (n.fromUserName && n.fromUserName.toLowerCase().includes(q)) ||
                (n.fromUserUsername && n.fromUserUsername.toLowerCase().includes(q)) ||
                (n.groupName && n.groupName.toLowerCase().includes(q)) ||
                (n.ticketSubject && n.ticketSubject.toLowerCase().includes(q)) ||
                (n.ticketNumber && n.ticketNumber.toLowerCase().includes(q))
            );
        }
        return base;
    }, [notifications, showFriendRequestOnly, showGroupRequestOnly, showSetoranOnly, showReportsOnly, searchQuery]);

    // Removed unused unreadCount calculation

    // Pagination untuk performa dengan banyak notifikasi
    const PAGE_SIZE = 10
    const [page, setPage] = useState(1)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const loadMoreRef = useRef<HTMLDivElement>(null)
    const filteredNotificationsRef = useRef(filteredNotifications)
    const loadingRef = useRef(loading)
    const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Keep refs updated
    useEffect(() => {
        filteredNotificationsRef.current = filteredNotifications
        loadingRef.current = loading
    }, [filteredNotifications, loading])

    const displayedNotifications = useMemo(() => {
        const start = 0
        const end = page * PAGE_SIZE
        return filteredNotifications.slice(start, end)
    }, [filteredNotifications, page])

    // Calculate hasMore based on current page and total items
    const hasMore = useMemo(() => {
        const totalItems = filteredNotifications.length
        const displayedCount = displayedNotifications.length
        // Has more if we haven't displayed all items yet
        return displayedCount > 0 && displayedCount < totalItems
    }, [displayedNotifications.length, filteredNotifications.length])

    // Ref to track loading more state without causing re-renders
    const isLoadingMoreRef = useRef(false)

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
        setIsLoadingMore(false)
        isLoadingMoreRef.current = false
        // Clear any pending load more timeout
        if (loadMoreTimeoutRef.current) {
            clearTimeout(loadMoreTimeoutRef.current)
            loadMoreTimeoutRef.current = null
        }
    }, [showFriendRequestOnly, showGroupRequestOnly, showSetoranOnly, showReportsOnly, searchQuery])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (loadMoreTimeoutRef.current) {
                clearTimeout(loadMoreTimeoutRef.current)
            }
        }
    }, [])

    // Keep ref updated
    useEffect(() => {
        isLoadingMoreRef.current = isLoadingMore
    }, [isLoadingMore])

    // Intersection Observer for infinite scroll with delay to show loading animation
    useEffect(() => {
        const currentRef = loadMoreRef.current
        if (!currentRef) {
            return
        }

        // Only create observer if we have more items to load and not currently loading
        if (!hasMore || loading) {
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                // Check ref instead of state to avoid stale closure
                if (entry.isIntersecting && !loadingRef.current && !isLoadingMoreRef.current) {
                    // Set loading state immediately to show spinner
                    setIsLoadingMore(true)
                    isLoadingMoreRef.current = true

                    // Clear any existing timeout
                    if (loadMoreTimeoutRef.current) {
                        clearTimeout(loadMoreTimeoutRef.current)
                    }

                    // Minimum delay to show loading animation (600ms)
                    loadMoreTimeoutRef.current = setTimeout(() => {
                        // Use functional update to get latest state
                        setPage(prev => {
                            // Get latest filtered notifications count from ref
                            const currentTotal = filteredNotificationsRef.current.length
                            const currentDisplayed = prev * PAGE_SIZE
                            // Only increment if we have more items to show
                            if (currentDisplayed < currentTotal) {
                                return prev + 1
                            }
                            return prev
                        })
                        // Reset loading after a short delay to ensure state update completes
                        setTimeout(() => {
                            setIsLoadingMore(false)
                            isLoadingMoreRef.current = false
                            loadMoreTimeoutRef.current = null
                        }, 200)
                    }, 600) // Minimum 600ms delay to show loading animation
                }
            },
            {
                rootMargin: "100px", // Reduced from 200px to trigger later
                threshold: 0.1
            }
        )

        // Use requestAnimationFrame to ensure element is fully rendered
        const rafId = requestAnimationFrame(() => {
            if (loadMoreRef.current === currentRef && hasMore && !loading) {
                observer.observe(currentRef)
            }
        })

        return () => {
            cancelAnimationFrame(rafId)
            if (loadMoreTimeoutRef.current) {
                clearTimeout(loadMoreTimeoutRef.current)
                loadMoreTimeoutRef.current = null
            }
            observer.disconnect()
        }
    }, [hasMore, loading, displayedNotifications.length])


    const handleAcceptInvitation = async (notificationId: string, groupId: string) => {
        // Prevent multiple clicks
        if (actionLoading === notificationId || clickedNotifications.has(notificationId)) return

        // Mark as clicked immediately to prevent reappearing
        setClickedNotifications(prev => new Set(prev).add(notificationId))
        setActionLoading(notificationId)

        // IMMEDIATE UI FEEDBACK: Update state optimistically for instant response
        setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
                notification.id === notificationId
                    ? { ...notification, is_read: true, is_action_taken: true }
                    : notification
            )
        )

        // Show immediate success message for better UX
        toast.success(t('notifikasi.undangan_grup_diterima', 'Undangan grup diterima'))

        // Clear loading immediately to prevent button flickering
        setActionLoading(null)

        // Parallel operations for better performance
        const apiPromise = acceptGroupInvitation(notificationId, groupId, userId)
        const cachePromise = userId ? ClientCache.invalidateUserGroupsCache(userId) : Promise.resolve()

        try {
            // Execute API call in background without blocking UI
            const [result] = await Promise.all([apiPromise, cachePromise])

            // Only revert if API actually fails (rare case)
            if (result.status !== 'success') {
                // Revert optimistic update silently but keep clicked state
                setNotifications(prevNotifications =>
                    prevNotifications.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, is_read: false, is_action_taken: false }
                            : notification
                    )
                )
                // Show error without removing success toast (user already saw success)
                console.error('API failed:', result.message)
                toast.error(result.message || t('notifikasi.gagal_menerima_undangan', 'Gagal menerima undangan'))
            }
        } catch (error) {
            // Revert optimistic update on network error but keep clicked state
            setNotifications(prevNotifications =>
                prevNotifications.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, is_read: false, is_action_taken: false }
                        : notification
                )
            )
            console.error('Network error:', error)
            // Only show error toast if it's a real network failure
            toast.error(t('notifikasi.gagal_menerima_undangan', 'Gagal menerima undangan'))
        }
    }

    const handleRejectInvitation = async (notificationId: string) => {
        // Prevent multiple clicks
        if (actionLoading === notificationId || clickedNotifications.has(notificationId)) return

        // Mark as clicked immediately to prevent reappearing
        setClickedNotifications(prev => new Set(prev).add(notificationId))
        setActionLoading(notificationId)

        // IMMEDIATE UI FEEDBACK: Update state optimistically for instant response
        setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
                notification.id === notificationId
                    ? { ...notification, is_read: true, is_action_taken: true }
                    : notification
            )
        )

        // Show immediate success message for better UX
        toast.success(t('notifikasi.undangan_grup_ditolak', 'Undangan grup ditolak'))

        // Clear loading immediately to prevent button flickering
        setActionLoading(null)

        try {
            // Execute API call in background without blocking UI
            const result = await rejectGroupInvitation(notificationId)

            // Only revert if API actually fails (rare case)
            if (result.status !== 'success') {
                // Revert optimistic update silently but keep clicked state
                setNotifications(prevNotifications =>
                    prevNotifications.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, is_read: false, is_action_taken: false }
                            : notification
                    )
                )
                console.error('API failed:', result.message)
                toast.error(result.message || t('notifikasi.gagal_menolak_undangan', 'Gagal menolak undangan'))
            }
        } catch (error) {
            // Revert optimistic update on network error but keep clicked state
            setNotifications(prevNotifications =>
                prevNotifications.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, is_read: false, is_action_taken: false }
                        : notification
                )
            )
            console.error('Network error:', error)
            toast.error(t('notifikasi.gagal_menolak_undangan', 'Gagal menolak undangan'))
        }
    }


    const getTimeAgo = useCallback((dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 60) return t('notifikasi.baru_saja', 'Baru saja')
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('notifikasi.menit_yang_lalu', 'menit yang lalu')}`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('notifikasi.jam_yang_lalu', 'jam yang lalu')}`
        return `${Math.floor(diffInSeconds / 86400)} ${t('notifikasi.hari_yang_lalu', 'hari yang lalu')}`
    }, [t])

    const handleAcceptFriend = async (requesterId: string, received_id: string, notificationId: string) => {
        const loadingKey = `friend_request_${requesterId}`

        // Prevent multiple clicks
        if (actionLoading === loadingKey || clickedNotifications.has(notificationId)) return

        // Mark as clicked immediately to prevent reappearing
        setClickedNotifications(prev => new Set(prev).add(notificationId))
        setActionLoading(loadingKey)

        // IMMEDIATE UI FEEDBACK: Update state optimistically for instant response
        setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
                notification.id === notificationId
                    ? { ...notification, is_read: true, is_action_taken: true, is_accept_friend: true }
                    : notification
            )
        )

        // Show immediate success message for better UX
        toast.success(t('notifikasi.permintaan_teman_diterima', 'Permintaan pertemanan diterima'))

        // Clear loading immediately to prevent button flickering
        setActionLoading(null)

        try {
            // Execute API call in background without blocking UI
            const result = await acceptFriendRequest(requesterId, received_id, notificationId)

            // Only revert if API actually fails (rare case)
            if (result.status !== 'success') {
                // Revert optimistic update silently but keep clicked state
                setNotifications(prevNotifications =>
                    prevNotifications.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, is_read: false, is_action_taken: false, is_accept_friend: null }
                            : notification
                    )
                )
                console.error('API failed for friend request')
                toast.error(t('notifikasi.gagal_menerima_permintaan_teman', 'Gagal menerima permintaan pertemanan'))
            }
        } catch (error) {
            // Revert optimistic update on network error but keep clicked state
            setNotifications(prevNotifications =>
                prevNotifications.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, is_read: false, is_action_taken: false, is_accept_friend: null }
                        : notification
                )
            )
            console.error('Network error accepting friend:', error)
            toast.error(t('notifikasi.gagal_menerima_permintaan_teman', 'Gagal menerima permintaan pertemanan'))
        }
    }

    const handleRejectFriend = async (requesterId: string, received_id: string, notificationId: string) => {
        const loadingKey = `friend_request_${requesterId}`

        // Prevent multiple clicks
        if (actionLoading === loadingKey || clickedNotifications.has(notificationId)) return

        // Mark as clicked immediately to prevent reappearing
        setClickedNotifications(prev => new Set(prev).add(notificationId))
        setActionLoading(loadingKey)

        // IMMEDIATE UI FEEDBACK: Update state optimistically for instant response
        setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
                notification.id === notificationId
                    ? { ...notification, is_read: true, is_action_taken: true, is_accept_friend: false }
                    : notification
            )
        )

        // Show immediate success message for better UX
        toast.success(t('notifikasi.permintaan_teman_ditolak', 'Permintaan pertemanan ditolak'))

        // Clear loading immediately to prevent button flickering
        setActionLoading(null)

        try {
            // Execute API call in background without blocking UI
            const result = await rejectOrCancelFriendRequest(requesterId, received_id, notificationId)

            // Only revert if API actually fails (rare case)
            if (result.status !== 'success') {
                // Revert optimistic update silently but keep clicked state
                setNotifications(prevNotifications =>
                    prevNotifications.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, is_read: false, is_action_taken: false, is_accept_friend: null }
                            : notification
                    )
                )
                console.error('API failed for friend rejection')
                toast.error(t('notifikasi.gagal_menolak_permintaan_teman', 'Gagal menolak permintaan pertemanan'))
            }
        } catch (error) {
            // Revert optimistic update on network error but keep clicked state
            setNotifications(prevNotifications =>
                prevNotifications.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, is_read: false, is_action_taken: false, is_accept_friend: null }
                        : notification
                )
            )
            console.error('Network error rejecting friend:', error)
            toast.error(t('notifikasi.gagal_menolak_permintaan_teman', 'Gagal menolak permintaan pertemanan'))
        }
    }

    // Delete single notification function - direct delete without dialog
    const handleDeleteNotification = async (notificationId: string) => {
        if (notificationId.startsWith("ticket_reminder_due_")) {
            removeLocalReminderNotificationById(notificationId)
            setNotifications(prevNotifications =>
                prevNotifications.filter(notification => notification.id !== notificationId)
            )
            setClickedNotifications(prev => {
                const newSet = new Set(prev)
                newSet.delete(notificationId)
                return newSet
            })
            toast.success(t('notifikasi.berhasil_dihapus', 'Notification deleted successfully'))
            return
        }

        try {
            await notificationsApi.delete(notificationId)

            // Remove from local state
            setNotifications(prevNotifications =>
                prevNotifications.filter(notification => notification.id !== notificationId)
            )

            // Remove from clicked notifications if exists
            setClickedNotifications(prev => {
                const newSet = new Set(prev)
                newSet.delete(notificationId)
                return newSet
            })

            toast.success(t('notifikasi.berhasil_dihapus', 'Notification deleted successfully'))

        } catch (error) {
            console.error('Error deleting notification:', error)
            toast.error(t('notifikasi.gagal_menghapus', 'Failed to delete notification'))
        }
    }

    // Delete ALL notifications using clear-all endpoint
    const handleDeleteAllNotifications = async () => {
        setDeleteAllLoading(true)
        try {
            // Hapus local reminder notifications dulu
            const localReminderIds = notifications
                .map(n => n.id)
                .filter((id) => id.startsWith("ticket_reminder_due_"))
            localReminderIds.forEach((id) => removeLocalReminderNotificationById(id))

            // Panggil clear-all API untuk hapus semua notifikasi di server
            await notificationsApi.clearAll()

            // Kosongkan semua local state
            setNotifications([])
            setClickedNotifications(new Set())

            toast.success(t('notifikasi.semua_notifikasi_dihapus', 'All notifications deleted successfully'))

        } catch (error) {
            console.error('Error clearing all notifications:', error)
            toast.error(t('notifikasi.gagal_menghapus_semua', 'Failed to delete notifications'))
        } finally {
            setDeleteAllLoading(false)
            setDeleteAllDialog(false)
        }
    }

    // Kirim Notifikasi (Admin only)
    const handleSendNotification = async () => {
        if (!sendNotifForm.title.trim() || !sendNotifForm.message.trim()) {
            toast.error('Judul dan Pesan wajib diisi')
            return
        }
        setSendNotifLoading(true)
        try {
            const payload: Parameters<typeof notificationsApi.send>[0] = {
                title: sendNotifForm.title,
                message: sendNotifForm.message,
                type: sendNotifForm.type || undefined,
                priority: sendNotifForm.priority || undefined,
                category: sendNotifForm.category || undefined,
                imageUrl: sendNotifForm.imageUrl || null,
                actionUrl: sendNotifForm.actionUrl || null,
                actionData: sendNotifForm.actionData || null,
                channels: sendNotifForm.channels ? sendNotifForm.channels.split(',').map(c => c.trim()).filter(Boolean) : ['push', 'in-app'],
                scheduledAt: sendNotifForm.scheduledAt || null,
                expiresAt: sendNotifForm.expiresAt || null,
                actionButtons: sendNotifForm.actionButtons.length > 0 ? sendNotifForm.actionButtons : undefined,
            }

            // Penerima: Spesifik atau Broadcast
            if (sendNotifForm.targetMode === 'specific' && sendNotifForm.userIds.trim()) {
                const rawIds = sendNotifForm.userIds.split(',').map(id => id.trim()).filter(id => id !== '');
                const parsedIds = rawIds.map(id => Number(id));
                
                // Cek apakah ada ID yang bukan angka valid (misal: user memasukkan email atau UUID)
                if (parsedIds.some(id => !Number.isInteger(id) || id <= 0 || id > Number.MAX_SAFE_INTEGER)) {
                    toast.error('Format User IDs tidak valid. Harus berupa angka (contoh: 1, 2, 3). Jangan masukkan email atau UUID.')
                    setSendNotifLoading(false)
                    return
                }
                payload.userIds = parsedIds
            } else {
                // Broadcast dengan target filter (opsional)
                payload.targetFilter = {
                    platform: sendNotifForm.platform || null,
                    countryCode: sendNotifForm.countryCode || null,
                    locale: sendNotifForm.locale || null,
                    topic: sendNotifForm.topic || null,
                    minAppVersion: null,
                }
            }

            const result = await notificationsApi.send(payload)
            const sent = result?.data?.successfullySent ?? result?.successfullySent ?? '?'
            const failed = result?.data?.failed ?? result?.failed ?? 0
            toast.success(`Notifikasi terkirim ke ${sent} penerima${failed > 0 ? `, ${failed} gagal` : ''}`)
            setSendNotifDialog(false)
            // Reset form
            setSendNotifForm(prev => ({ ...prev, title: '', message: '', userIds: '', actionButtons: [] }))
        } catch (error: any) {
            console.error('Error sending notification:', error)
            toast.error(error?.message || 'Gagal mengirim notifikasi')
        } finally {
            setSendNotifLoading(false)
        }
    }

    // Handle notification click/touch - direct delete without dialog
    const handleNotificationInteraction = (notification: MappedNotification) => {
        console.log('🎯 Direct delete for notification:', notification.id)

        // Only delete confirmed notifications
        const isConfirmed = notification.type === "recap_notification" || notification.is_action_taken || clickedNotifications.has(notification.id)

        if (!isConfirmed) {
            console.log('🎯 ❌ Notification not confirmed, skipping')
            return
        }

        // For desktop: any click on confirmed notification should delete directly
        // For mobile: only long press should delete directly
        console.log('🎯 ✅ Deleting notification directly')
        handleDeleteNotification(notification.id)
    }


    const handleTouchEnd = () => {
        if (touchTimeoutRef.current) {
            clearTimeout(touchTimeoutRef.current)
            touchTimeoutRef.current = null
        }
    }


    return (
        <div className="h-auto mx-auto max-w-7xl flex flex-col md:block">
            <div className="flex items-center justify-between mb-6 gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Desktop: Icon with background and border */}
                    <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl bg-transparent border-none dark:bg-transparent dark:border-none">
                        <Bell className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    {/* Mobile: Icon without background and border */}
                    <div className="flex sm:hidden items-center justify-center">
                        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg sm:text-2xl font-bold text-slate-700 dark:text-slate-200">{t('notifikasi.notifikasi', 'Notifikasi')}</h1>
                        {/* Realtime connection indicator */}
                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${realtimeConnected ? 'bg-green-500' : 'bg-gray-400'
                            }`} title={realtimeConnected ? 'Realtime terhubung' : 'Realtime terputus'} />
                    </div>
                </div>
                <div className="flex gap-2 sm:gap-3 sm:ml-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 sm:h-10 w-8 sm:w-10 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Menu notifikasi</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                                onClick={() => setSendNotifDialog(true)}
                                className="flex items-center gap-2"
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span>Kirim Notifikasi</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    if (notifications.length === 0) {
                                        toast.info('Tidak ada notifikasi untuk dihapus')
                                        return
                                    }
                                    setDeleteAllDialog(true)
                                }}
                                disabled={deleteAllLoading}
                                className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            >
                                <Trash className="h-4 w-4" />
                                <span>{t('notifikasi.hapus_semua_notifikasi', 'Delete All Notifications')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="flex-1 md:flex-none w-full p-4 sm:p-4 md:p-6 bg-white dark:bg-gray-800 rounded-lg md:rounded-3xl border md:border border-gray-200 md:border-gray-300 dark:border-gray-700 shadow-none sm:shadow-sm md:shadow-xl dark:shadow-gray-800/25 space-y-3 sm:space-y-4 md:space-y-7 overflow-hidden md:overflow-visible">

                <div className="flex justify-end w-full">
                    <div className="flex items-center w-full sm:w-auto">
                        <div className="relative flex items-center w-full sm:w-[320px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <Input
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") setSearchQuery(searchValue);
                                }}
                                placeholder={t('notifikasi.filter_placeholder', 'Cari notifikasi...')}
                                className="pl-9 pr-9 h-10 text-sm rounded-l-lg rounded-r-none border border-r-0 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white dark:bg-gray-800 w-full"
                            />
                            {searchValue && (
                                <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                    aria-label="Hapus pencarian"
                                    onClick={() => { setSearchValue(""); setSearchQuery(""); }}
                                >
                                    <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                </button>
                            )}
                        </div>
                        <Button
                            onClick={() => setSearchQuery(searchValue)}
                            className="h-10 rounded-l-none rounded-r-lg bg-emerald-500 hover:bg-emerald-600 text-white px-4 md:px-5 shadow-none flex items-center gap-2 m-0 border border-emerald-500 hover:border-emerald-600"
                        >
                            <Search className="h-4 w-4" />
                            <span className="font-semibold">{t('notifikasi.cari', 'Cari')}</span>
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-3 sm:flex gap-2 md:gap-3 lg:gap-3 xl:gap-3">
                    {/* All tab - reactivated */}
                    <Button
                        onClick={() => {
                            setshowFriendRequestOnly(false)
                            setshowGroupRequestOnly(false)
                            setShowSetoranOnly(false)
                            setShowReportsOnly(false)
                        }}
                        variant={!showFriendRequestOnly && !showSetoranOnly && !showGroupRequestOnly && !showReportsOnly ? "default" : "outline"}
                        className={`col-span-full md:col-auto flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2.5 px-2 sm:p-2 md:px-4 py-1 sm:py-2 md:py-3 rounded-md sm:rounded-lg md:rounded-2xl font-medium transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap flex-initial
              ${!showFriendRequestOnly && !showSetoranOnly && !showGroupRequestOnly && !showReportsOnly
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 border-0"
                                : "border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300"
                            }`}
                    >
                        <span className="w-3 h-3 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 flex items-center justify-center">
                            <Bell className="h-3 w-3 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                        </span>
                        {t('notifikasi.tampilkan_semua', 'Tampilkan Semua')}
                    </Button>
                    {/* Temporarily commented out Friend tab */}
                    {/* <Button
                        onClick={() => {
                            setshowFriendRequestOnly(true)
                            setshowGroupRequestOnly(false)
                            setShowSetoranOnly(false)
                            setShowReportsOnly(false)
                        }}
                        variant={showFriendRequestOnly ? "default" : "outline"}
                        className={`flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2.5 px-2 sm:p-2 md:px-4 py-1 sm:py-2 md:py-3 rounded-md sm:rounded-lg md:rounded-2xl font-medium transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap flex-initial
              ${showFriendRequestOnly
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 border-0"
                                : "border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300"
                            }`}
                    >
                        <span className="w-3 h-3 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 flex items-center justify-center">
                            <Users className="h-3 w-3 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                        </span>
                        {t('notifikasi.friend', 'Teman')}
                    </Button> */}
                    {/* Temporarily commented out Group tab */}
                    {/* <Button
                        onClick={() => {
                            setshowFriendRequestOnly(false)
                            setshowGroupRequestOnly(true)
                            setShowSetoranOnly(false)
                            setShowReportsOnly(false)
                        }}
                        variant={showGroupRequestOnly ? "default" : "outline"}
                        className={`relative flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2.5 px-2 sm:p-2 md:px-4 py-1 sm:py-2 md:py-3 rounded-md sm:rounded-lg md:rounded-2xl font-medium transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap flex-initial
              ${showGroupRequestOnly
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 border-0"
                                : "border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300"
                            }`}
                    >
                        <span className="w-3 h-3 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 flex items-center justify-center">
                            <Component className="h-3 w-3 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                        </span>
                        {t('notifikasi.group', 'Grup')}
                        
                    </Button> */}
                    {/* Temporarily commented out Setoran (Recitation) tab */}
                    {/* <Button
                        onClick={() => {
                            setshowFriendRequestOnly(false)
                            setshowGroupRequestOnly(false)
                            setShowSetoranOnly(true)
                            setShowReportsOnly(false)
                        }}
                        variant={showSetoranOnly ? "default" : "outline"}
                        className={`flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2.5 px-2 sm:p-2 md:px-4 py-1 sm:py-2 md:py-3 rounded-md sm:rounded-lg md:rounded-2xl font-medium transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap flex-initial
              ${showSetoranOnly
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 border-0"
                                : "border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300"
                            }`}
                    >
                        <span className="w-3 h-3 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 flex items-center justify-center">
                            <BookOpen className="h-3 w-3 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                        </span>
                        {t('notifikasi.setoran', 'Setoran')}
                    </Button> */}
                    {/* Reports tab - kept active */}
                    <Button
                        onClick={() => {
                            setshowFriendRequestOnly(false)
                            setshowGroupRequestOnly(false)
                            setShowSetoranOnly(false)
                            setShowReportsOnly(true)
                        }}
                        variant={showReportsOnly ? "default" : "outline"}
                        className={`flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2.5 px-2 sm:p-2 md:px-4 py-1 sm:py-2 md:py-3 rounded-md sm:rounded-lg md:rounded-2xl font-medium transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap flex-initial ${showReportsOnly
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 border-0"
                            : "border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300"
                            }`}
                    >
                        <span className="w-3 h-3 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 flex items-center justify-center">
                            <MessageSquare className="h-3 w-3 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                        </span>
                        {t('notifikasi.tickets', 'Tickets')}
                    </Button>
                </div>

                {/* Sim Notif Section — dummy notifications from localStorage */}
                <SimNotifSection />

                {/* Notifications List */}
                <div className="space-y-2" data-notification-container>
                    {loading ? (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-gray-800">
                            <SkeletonUserList count={1} />
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
                                {showSetoranOnly ? (
                                    <BookOpen className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                                ) : showReportsOnly ? (
                                    <MessageSquare className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                                ) : (
                                    <Bell className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                                )}
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 text-lg font-medium mb-2">
                                {showSetoranOnly
                                    ? t('notifikasi.tidak_ada_notifikasi_setoran', 'Tidak ada notifikasi setoran')
                                    : showReportsOnly
                                        ? t('notifikasi.tidak_ada_notifikasi_reports', 'Tidak ada notifikasi ticket support')
                                        : showFriendRequestOnly
                                            ? t('notifikasi.belum_ada_notifikasi_teman', 'Belum ada notifikasi dari teman')
                                            : showGroupRequestOnly
                                                ? t('notifikasi.belum_ada_notifikasi_grup', 'Belum ada notifikasi dari grup')
                                                : t('notifikasi.belum_ada_notifikasi', 'Belum ada notifikasi')
                                }
                            </div>
                            <p className="text-slate-500 dark:text-slate-500">
                                {showSetoranOnly
                                    ? t('notifikasi.belum_ada_setoran', 'Belum ada notifikasi setoran dari santri Anda.')
                                    : showReportsOnly
                                        ? t('notifikasi.belum_ada_reports', 'Belum ada notifikasi ticket support baru.')
                                        : t('notifikasi.semua_sudah_diproses', 'Semua notifikasi sudah diproses! Periksa kembali nanti untuk pembaruan baru.')
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Notifikasi dengan pagination untuk performa optimal */}
                            <div className="grid gap-2">
                                {displayedNotifications.map((notification, index) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        index={index}
                                        onAcceptInvitation={handleAcceptInvitation}
                                        onRejectInvitation={handleRejectInvitation}
                                        onAcceptFriend={handleAcceptFriend}
                                        onRejectFriend={handleRejectFriend}
                                        actionLoading={actionLoading}
                                        registerNotification={registerNotification}
                                        getTimeAgo={getTimeAgo}
                                        clickedNotifications={clickedNotifications}
                                        onNotificationClick={handleNotificationInteraction}
                                        onTouchEnd={handleTouchEnd}
                                        isMobile={isMobile}
                                    />
                                ))}
                                {/* Loading indicator and load more trigger */}
                                {displayedNotifications.length > 0 && (
                                    <div className="py-6">
                                        {hasMore && filteredNotifications.length > displayedNotifications.length ? (
                                            <div ref={loadMoreRef} className="flex flex-col justify-center items-center min-h-[4rem] gap-2 py-4">
                                                {isLoadingMore && (
                                                    <>
                                                        <div className="w-6 h-6 md:h-8 md:w-8 animate-spin rounded-full border-2 md:border-4 border-gray-200 dark:border-gray-700 border-t-emerald-600 dark:border-t-emerald-500" />
                                                    </>
                                                )}
                                            </div>
                                        ) : displayedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0 ? (
                                            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                                {t('notifikasi.all_data_displayed', 'Semua data telah ditampilkan')}
                                            </p>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>

                {/* Delete All Dialog */}
                <Dialog open={deleteAllDialog} onOpenChange={setDeleteAllDialog}>
                    <DialogContent className="sm:max-w-sm">
                        <div className="text-center py-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                                <Trash className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {t('notifikasi.hapus_semua_notifikasi', 'Delete All Notifications')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                {(() => {
                                    const confirmedCount = notifications.filter(n => n.is_action_taken || clickedNotifications.has(n.id) || n.type === "recap_notification").length
                                    return `${confirmedCount} ${t('notifikasi.konfirmasi_hapus_semua', 'confirmed notifications will be permanently deleted')}`
                                })()}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteAllDialog(false)}
                                    disabled={deleteAllLoading}
                                    className="px-4 py-2"
                                >
                                    {t('notifikasi.batal', 'Cancel')}
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteAllNotifications}
                                    disabled={deleteAllLoading}
                                    className="px-4 py-2"
                                >
                                    {deleteAllLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                            {t('notifikasi.menghapus', 'Deleting...')}
                                        </>
                                    ) : (
                                        <>
                                            <Trash className="h-4 w-4 mr-1" />
                                            {t('notifikasi.hapus', 'Delete')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* =============================================
                    DIALOG: KIRIM NOTIFIKASI (ADMIN ONLY)
                ============================================= */}
                <Dialog open={sendNotifDialog} onOpenChange={setSendNotifDialog}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* DialogTitle required for screen reader accessibility */}
                        <DialogTitle className="sr-only">Kirim Notifikasi ke Pengguna</DialogTitle>
                        <div className="space-y-5 p-1">
                            {/* Header */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                    <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Kirim Notifikasi</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Admin only — kirim notifikasi ke pengguna tertentu atau broadcast ke semua</p>
                                </div>
                            </div>

                            {/* ─── PENERIMA ─── */}
                            <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Penerima</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSendNotifForm(p => ({ ...p, targetMode: 'broadcast' }))}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${sendNotifForm.targetMode === 'broadcast' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400'}`}
                                    >
                                        📢 Broadcast (Semua)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSendNotifForm(p => ({ ...p, targetMode: 'specific' }))}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${sendNotifForm.targetMode === 'specific' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400'}`}
                                    >
                                        👤 User Spesifik
                                    </button>
                                </div>
                                {sendNotifForm.targetMode === 'specific' ? (
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">User IDs <span className="text-red-500">*</span> <span className="font-normal">(pisah dengan koma)</span></label>
                                        <input
                                            type="text"
                                            value={sendNotifForm.userIds}
                                            onChange={e => setSendNotifForm(p => ({ ...p, userIds: e.target.value }))}
                                            placeholder="1, 2, 3"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Platform <span className="font-normal text-slate-400">(opsional)</span></label>
                                            <select
                                                value={sendNotifForm.platform}
                                                onChange={e => setSendNotifForm(p => ({ ...p, platform: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                                <option value="">Semua Platform</option>
                                                <option value="android">Android</option>
                                                <option value="ios">iOS</option>
                                                <option value="web">Web</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Kode Negara <span className="font-normal text-slate-400">(opsional)</span></label>
                                            <input
                                                type="text"
                                                value={sendNotifForm.countryCode}
                                                onChange={e => setSendNotifForm(p => ({ ...p, countryCode: e.target.value }))}
                                                placeholder="ID, MY, SG"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ─── KONTEN ─── */}
                            <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Konten</p>
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Judul <span className="text-red-500">*</span> <span className="font-normal">(maks. 200 karakter)</span></label>
                                    <input
                                        type="text"
                                        maxLength={200}
                                        value={sendNotifForm.title}
                                        onChange={e => setSendNotifForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="Judul notifikasi..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Pesan <span className="text-red-500">*</span> <span className="font-normal">(maks. 1000 karakter)</span></label>
                                    <textarea
                                        maxLength={1000}
                                        rows={3}
                                        value={sendNotifForm.message}
                                        onChange={e => setSendNotifForm(p => ({ ...p, message: e.target.value }))}
                                        placeholder="Isi pesan notifikasi..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Type</label>
                                        <input type="text" value={sendNotifForm.type} onChange={e => setSendNotifForm(p => ({ ...p, type: e.target.value }))} placeholder="general" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Priority</label>
                                        <select value={sendNotifForm.priority} onChange={e => setSendNotifForm(p => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                            <option value="">Default</option>
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Category</label>
                                        <input type="text" value={sendNotifForm.category} onChange={e => setSendNotifForm(p => ({ ...p, category: e.target.value }))} placeholder="marketing" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Image URL <span className="font-normal">(opsional)</span></label>
                                    <input type="url" value={sendNotifForm.imageUrl} onChange={e => setSendNotifForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>

                            {/* ─── AKSI ─── */}
                            <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Aksi</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Action URL <span className="font-normal">(opsional)</span></label>
                                        <input type="text" value={sendNotifForm.actionUrl} onChange={e => setSendNotifForm(p => ({ ...p, actionUrl: e.target.value }))} placeholder="/dashboard" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Channels</label>
                                        <input type="text" value={sendNotifForm.channels} onChange={e => setSendNotifForm(p => ({ ...p, channels: e.target.value }))} placeholder="push,in-app" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs text-slate-500 dark:text-slate-400">Action Buttons <span className="font-normal">(maks. 2)</span></label>
                                        {sendNotifForm.actionButtons.length < 2 && (
                                            <button
                                                type="button"
                                                onClick={() => setSendNotifForm(p => ({
                                                    ...p,
                                                    actionButtons: [...p.actionButtons, { id: `btn_${Date.now()}`, title: '', url: '', action: '' }]
                                                }))}
                                                className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 font-medium"
                                            >
                                                + Tambah Tombol
                                            </button>
                                        )}
                                    </div>
                                    {sendNotifForm.actionButtons.map((btn, idx) => (
                                        <div key={btn.id} className="flex gap-2 mb-2 items-center">
                                            <input
                                                type="text"
                                                value={btn.title}
                                                onChange={e => setSendNotifForm(p => {
                                                    const abs = [...p.actionButtons]
                                                    abs[idx] = { ...abs[idx], title: e.target.value }
                                                    return { ...p, actionButtons: abs }
                                                })}
                                                placeholder="Label tombol"
                                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <input
                                                type="text"
                                                value={btn.url}
                                                onChange={e => setSendNotifForm(p => {
                                                    const abs = [...p.actionButtons]
                                                    abs[idx] = { ...abs[idx], url: e.target.value }
                                                    return { ...p, actionButtons: abs }
                                                })}
                                                placeholder="URL"
                                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setSendNotifForm(p => ({ ...p, actionButtons: p.actionButtons.filter((_, i) => i !== idx) }))}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ─── PENJADWALAN ─── */}
                            <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Penjadwalan <span className="font-normal normal-case text-slate-400">(opsional)</span></p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Kirim Pada</label>
                                        <input
                                            type="datetime-local"
                                            value={sendNotifForm.scheduledAt}
                                            onChange={e => setSendNotifForm(p => ({ ...p, scheduledAt: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Kedaluwarsa Pada</label>
                                        <input
                                            type="datetime-local"
                                            value={sendNotifForm.expiresAt}
                                            onChange={e => setSendNotifForm(p => ({ ...p, expiresAt: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ─── TOMBOL AKSI ─── */}
                            <div className="flex gap-3 pt-1">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setSendNotifDialog(false)}
                                    disabled={sendNotifLoading}
                                >
                                    Batal
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleSendNotification}
                                    disabled={sendNotifLoading || !sendNotifForm.title.trim() || !sendNotifForm.message.trim()}
                                >
                                    {sendNotifLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Kirim Notifikasi
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
