"use client"

/**
 * Order Detail — Timeline (Audit Trail)
 */

import React from "react"
import { History, User } from "lucide-react"
import type { AuditTrailEntry, Translate } from "../model/types"
import { formatRelativeTime } from "../model/format"

interface OrderTimelineProps {
    auditTrail: AuditTrailEntry[]
    locale: string
    t: Translate
    isRtl: boolean
}

function getDotStyle(action: string): { dotBg: string; textClass: string } {
    const s = action.toLowerCase()
    if (/selesai|lunas|paid|complete/.test(s)) return { dotBg: "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-500", textClass: "text-emerald-700 dark:text-emerald-400" }
    if (/batal|gagal|cancel|fail/.test(s))     return { dotBg: "bg-rose-100 dark:bg-rose-900/50 border-rose-500",          textClass: "text-rose-700 dark:text-rose-400" }
    if (/aktif|active|approved/.test(s))        return { dotBg: "bg-sky-100 dark:bg-sky-900/50 border-sky-500",             textClass: "text-sky-700 dark:text-sky-400" }
    if (/menunggu|pending|waiting/.test(s))     return { dotBg: "bg-amber-100 dark:bg-amber-900/50 border-amber-500",       textClass: "text-amber-700 dark:text-amber-400" }
    return { dotBg: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600", textClass: "text-gray-700 dark:text-gray-300" }
}

export function OrderTimeline({ auditTrail, locale, t, isRtl }: OrderTimelineProps) {
    if (auditTrail.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
                    <History className="w-7 h-7 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("billing.orders.detail.log.empty", "Belum ada aktivitas tercatat.")}
                </p>
            </div>
        )
    }

    return (
        <div className="relative">
            {/* Vertical connector line */}
            <div
                aria-hidden="true"
                className={`absolute top-5 bottom-5 w-0.5 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent ${isRtl ? "end-5" : "start-5"}`}
            />

            <ol className="space-y-0" aria-label={t("billing.orders.detail.log.title", "Riwayat & Aktivitas")}>
                {auditTrail.map((log, idx) => {
                    const actionText = String(log.action || log.statusName || log.statusText || "Update Status")
                    const { dotBg, textClass } = getDotStyle(actionText)
                    const iso  = log.createdAt || log.timestamp
                    const desc = log.description || log.notes || log.message

                    return (
                        <li key={idx} className={`relative flex gap-4 pb-6 ${isRtl ? "flex-row-reverse" : ""}`}>
                            {/* Dot */}
                            <div
                                aria-hidden="true"
                                className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-4 ${dotBg} flex items-center justify-center shadow-sm`}
                            >
                                <div className="w-2.5 h-2.5 rounded-full bg-current opacity-70" />
                            </div>

                            {/* Content */}
                            <div className={`flex-1 min-w-0 ${isRtl ? "me-2" : "ms-2"}`}>
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all">
                                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                                        <span className={`font-black text-sm uppercase tracking-wide leading-tight ${textClass}`}>
                                            {actionText}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md flex-shrink-0">
                                            {formatRelativeTime(iso, locale)}
                                        </span>
                                    </div>

                                    {desc && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
                                    )}

                                    {log.changedBy && (
                                        <div className={`mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                                            <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                <User className="w-3 h-3 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {t("billing.orders.detail.log.by", "Oleh")}{" "}
                                                <strong className="font-bold text-gray-700 dark:text-gray-300">{log.changedBy}</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
