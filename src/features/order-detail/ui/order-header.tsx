"use client"

/**
 * Order Detail — Header Component
 * Header ringan pengganti hero banner hijau tua.
 */

import React, { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Check, FileText } from "lucide-react"
import { toast } from "sonner"
import type { OrderBooking, OrderDetail, Translate } from "../model/types"
import { getOrderStatusConfig } from "../model/constants"
import { formatDateTime } from "../model/format"

interface OrderHeaderProps {
    booking: OrderBooking
    detail: OrderDetail
    backUrl: string
    t: Translate
    locale: string
    isRtl: boolean
}

export function OrderHeader({ booking, detail, backUrl, t, locale, isRtl }: OrderHeaderProps) {
    const [copied, setCopied] = useState(false)
    const statusCfg = getOrderStatusConfig(String(booking.status), t)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(detail.payment.invoiceNo)
            setCopied(true)
            toast.success(t("billing.orders.detail.copied", "Tersalin!"), { duration: 2000 })
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error("Gagal menyalin")
        }
    }

    return (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4 mb-6 sticky top-0 z-10 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
            <div className="max-w-screen-xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                    {/* Left: back + title + meta */}
                    <div className="flex items-start gap-3 min-w-0">
                        <Link
                            href={backUrl}
                            aria-label={t("billing.orders.detail.back", "Kembali")}
                            className="flex-shrink-0 mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg
                                       bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                                       hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white
                                       transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                        >
                            <ArrowLeft
                                className={`w-4 h-4 transition-transform ${isRtl ? "rotate-180" : ""}`}
                                aria-hidden="true"
                            />
                        </Link>

                        <div className="min-w-0">
                            {/* Title + badge */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                                    {t("billing.orders.detail.title", "Detail Pesanan")}
                                    <span className="text-gray-400 dark:text-gray-500 font-mono font-normal ms-1.5 text-base">
                                        #{booking.id}
                                    </span>
                                </h1>
                                <span
                                    role="status"
                                    aria-label={`Status: ${statusCfg.label}`}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.badgeClass}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} aria-hidden="true" />
                                    {statusCfg.label}
                                </span>
                            </div>

                            {/* Invoice + copy */}
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-gray-400 dark:text-gray-500 text-xs">
                                    {t("billing.orders.detail.invoice_no", "No. Invoice")}
                                </span>
                                <code className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[160px] sm:max-w-none">
                                    {detail.payment.invoiceNo}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    aria-label={t("billing.orders.detail.copy", "Salin nomor invoice")}
                                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400
                                               hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors
                                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 rounded px-1"
                                >
                                    {copied
                                        ? <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                        : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                                    {copied
                                        ? t("billing.orders.detail.copied", "Tersalin!")
                                        : t("billing.orders.detail.copy", "Salin")}
                                </button>
                            </div>

                            {/* Created at */}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {t("billing.orders.detail.created_at", "Dibuat pada")}{" "}
                                {formatDateTime(booking.bookingDate, locale)}
                            </p>
                        </div>
                    </div>

                    {/* Right: Lihat Invoice button */}
                    <div className="flex items-center gap-2 flex-shrink-0 ps-11 sm:ps-0">
                        <button
                            onClick={handleCopy}
                            aria-label={t("billing.orders.detail.view_invoice", "Lihat Invoice")}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
                                       border border-gray-200 dark:border-gray-700
                                       text-gray-700 dark:text-gray-300 text-xs font-semibold
                                       hover:border-emerald-300 dark:hover:border-emerald-700
                                       hover:text-emerald-700 dark:hover:text-emerald-400
                                       hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all
                                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                        >
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                            {t("billing.orders.detail.view_invoice", "Lihat Invoice")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
