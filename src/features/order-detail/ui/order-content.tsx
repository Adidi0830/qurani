"use client"

/**
 * Order Detail — Progress Card, Session Cards, Session Grid, Notes Card
 */

import React, { useState } from "react"
import {
    BookOpen, CheckCircle2, Activity, Clock, XCircle,
    CalendarDays, ChevronDown, MessageSquare, Star, StickyNote, GraduationCap, AlertCircle,
} from "lucide-react"
import type { OrderBooking, OrderDetail, OrderSession, Translate } from "../model/types"
import { getSessionStatusConfig } from "../model/constants"

// ─────────────────────────────────────────────
// Progress Card
// ─────────────────────────────────────────────

const ICON_BY_STATUS: Record<string, React.FC<{ className?: string }>> = {
    CheckCircle2, Activity, Clock, XCircle,
}

interface OrderProgressCardProps {
    booking: OrderBooking
    sessCompleted: number
    sessOngoing: number
    sessScheduled: number
    sessCancelled: number
    progressPct: number
    t: Translate
    isRtl: boolean
}

export function OrderProgressCard({
    booking, sessCompleted, progressPct, t,
}: OrderProgressCardProps) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {t("billing.orders.detail.progress.title", "Progress Belajar")}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{booking.packageName}</p>
                    </div>
                </div>
                <div
                    className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full"
                    aria-label={`${sessCompleted} dari ${booking.totalSessions} sesi selesai`}
                >
                    {t("billing.orders.detail.progress.sessions_done", `${sessCompleted}/${booking.totalSessions} Selesai`, {
                        done: sessCompleted, total: booking.totalSessions,
                    })}
                </div>
            </div>

            {/* Progress bar */}
            <div>
                <div
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${progressPct}% selesai`}
                    className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
                >
                    <div
                        style={{ width: `${progressPct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                    />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    {t("billing.orders.detail.progress.percent", `${progressPct}% perjalanan belajar selesai`, { pct: progressPct })}
                </p>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Session Card
// ─────────────────────────────────────────────

interface SessionCardProps {
    session: OrderSession
    bookingStatus: string
    isPaid: boolean
    isSim: boolean
    t: Translate
    onMarkDone?: (no: number) => void
}

export function SessionCard({ session, bookingStatus, isPaid, isSim, t, onMarkDone }: SessionCardProps) {
    const [feedbackOpen, setFeedbackOpen] = useState(false)

    const isCancelled = bookingStatus === "cancelled"
    const isDone      = session.status === "completed"
    const isPending   = bookingStatus === "pending" || bookingStatus === "menunggu_guru"

    const effectiveStatus = isCancelled ? "cancelled" : isPending && !isDone ? "scheduled" : session.status
    const cfg = getSessionStatusConfig(effectiveStatus, t)
    const Icon = ICON_BY_STATUS[cfg.iconName] ?? Clock

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all">
            <div className="p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                        {t("billing.orders.detail.schedule.session", `Pertemuan ${session.no}`, { n: session.no })}
                    </h4>
                    <span
                        role="status"
                        className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg.bgClass}`}
                    >
                        {cfg.label}
                    </span>
                </div>

                {/* Date + Time */}
                <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        <span>{session.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        <span>{session.time}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100 dark:border-gray-800">
                    {isDone && session.feedback ? (
                        <button
                            onClick={() => setFeedbackOpen(p => !p)}
                            aria-expanded={feedbackOpen}
                            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400
                                       bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30
                                       px-2 py-1 rounded-lg transition-colors
                                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                        >
                            {t("billing.orders.detail.schedule.detail", "Detail")}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${feedbackOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                        </button>
                    ) : (
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBgClass}`}>
                            <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                    )}

                    {/* Sim-only: mark done */}
                    {isSim && !isDone && isPaid && onMarkDone && (
                        <button
                            onClick={() => onMarkDone(session.no)}
                            className="text-[10px] font-bold px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800
                                       text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20
                                       hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                        >
                            {t("billing.orders.detail.schedule.mark_done", "Tandai Selesai")}
                        </button>
                    )}
                </div>
            </div>

            {/* Feedback panel */}
            {isDone && session.feedback && (
                <div className={`overflow-hidden transition-all duration-300 ${feedbackOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="px-4 pb-4">
                        <div className="bg-emerald-50/60 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                                    {t("billing.orders.detail.schedule.feedback_label", "Feedback Sesi")}
                                </span>
                                {session.feedback.rating && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                        <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
                                        {session.feedback.rating}.0
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">
                                "{session.feedback.pesan}"
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// Session Grid
// ─────────────────────────────────────────────

interface SessionGridProps {
    sessions: OrderSession[]
    bookingStatus: string
    isPaid: boolean
    isSim: boolean
    t: Translate
    onMarkDone?: (no: number) => void
}

export function SessionGrid({ sessions, bookingStatus, isPaid, isSim, t, onMarkDone }: SessionGridProps) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                    {t("billing.orders.detail.schedule.title", "Jadwal Belajar")}
                </h3>
                {sessions.length > 0 && (
                    <span className="text-xs font-semibold bg-white dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 shadow-sm">
                        {t("billing.orders.detail.schedule.count", `${sessions.length} Pertemuan`, { count: sessions.length })}
                    </span>
                )}
            </div>

            <div className="p-5">
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                            <CalendarDays className="w-7 h-7 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                {t("billing.orders.detail.schedule.empty", "Belum ada jadwal")}
                            </p>
                            {!isPaid && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    {t("billing.orders.detail.schedule.empty_hint", "Selesaikan pembayaran untuk mengatur jadwal.")}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sessions.map(s => (
                            <SessionCard
                                key={s.no}
                                session={s}
                                bookingStatus={bookingStatus}
                                isPaid={isPaid}
                                isSim={isSim}
                                t={t}
                                onMarkDone={onMarkDone}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Notes Card
// ─────────────────────────────────────────────

interface OrderNotesCardProps {
    notes?: string | null
    graduationNote?: string | null
    cancellationInfo?: OrderDetail["cancellationInfo"] | null
    bookingStatus: string
    t: Translate
}

export function OrderNotesCard({ notes, graduationNote, cancellationInfo, bookingStatus, t }: OrderNotesCardProps) {
    const isCompleted = bookingStatus === "completed"
    const isCancelled = bookingStatus === "cancelled"

    const hasContent = notes || (isCompleted && graduationNote) || (isCancelled && cancellationInfo)
    if (!hasContent) return null

    return (
        <div className="space-y-4">
            {notes && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
                        {t("billing.orders.detail.notes.title", "Catatan")}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">"{notes}"</p>
                </div>
            )}
            {isCompleted && graduationNote && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                        {t("billing.orders.detail.notes.graduation", "Catatan Kelulusan")}
                    </h3>
                    <div className="bg-white/60 dark:bg-gray-900/40 rounded-xl p-3.5 border border-emerald-100/60 dark:border-emerald-800/30">
                        <p className="text-sm text-emerald-900 dark:text-emerald-100 font-medium leading-relaxed italic">"{graduationNote}"</p>
                    </div>
                </div>
            )}
            {isCancelled && cancellationInfo && (
                <div className="bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-800/50 p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 pb-3 border-b border-rose-200 dark:border-rose-800/50">
                        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        {t("billing.orders.detail.notes.cancellation", "Detail Pembatalan")}
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="text-rose-600/70 dark:text-rose-400/70 font-semibold">{t("billing.orders.detail.notes.reason", "Alasan")}</span>
                            <span className="font-bold text-rose-900 dark:text-rose-200">{cancellationInfo.kategori}</span>
                        </div>
                        <div className="bg-white/60 dark:bg-rose-950/40 rounded-xl p-3 border border-rose-100 dark:border-rose-900/50">
                            <p className="text-xs text-rose-600/70 dark:text-rose-400/70 font-semibold mb-1">{t("billing.orders.detail.notes.note", "Catatan")}</p>
                            <p className="text-rose-900 dark:text-rose-200 italic">"{cancellationInfo.ulasan}"</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="text-rose-600/70 dark:text-rose-400/70 font-semibold">{t("billing.orders.detail.notes.resolution", "Resolusi")}</span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800">
                                {cancellationInfo.resolusi}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
