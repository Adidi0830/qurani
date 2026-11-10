"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, ArrowRight, Calendar, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/components/providers/i18n-provider"
import dummyData from "@/data/billing-dummy.json"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatTimeAgo, formatTooltipDate, formatDateShort } from "@/lib/date-utils"

const PAGE_SIZE = 10

function formatCurrency(amount: number, locale: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

type OrderStatus = "baru" | "lunas" | "aktif" | "gagal" | "selesai" | "menunggu_guru"

const STATUS_CONFIG: Record<OrderStatus, { key: string; badgeCls: string }> = {
    baru: { key: "user_detail.orders.status.pending", badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    lunas: { key: "user_detail.orders.status.active", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    aktif: { key: "user_detail.orders.status.active", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    gagal: { key: "user_detail.orders.status.cancelled", badgeCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
    selesai: { key: "user_detail.orders.status.completed", badgeCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
    menunggu_guru: { key: "user_detail.orders.status.waiting_teacher", badgeCls: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
}

function getStage(status: string): OrderStatus {
    if (status === "cancelled") return "gagal"
    if (status === "completed") return "selesai"
    if (status === "pending_trainer") return "menunggu_guru"
    if (status === "active") return "aktif"
    return "baru"
}

interface UserOrdersProps {
    userId: string
    /** Preview mode: hanya tampilkan 10 data, tanpa paginasi penuh */
    preview?: boolean
}

export function UserOrders({ userId, preview = true }: UserOrdersProps) {
    const router = useRouter()
    const { t, locale } = useI18n()
    const lang = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en"

    const orders = useMemo(() => {
        const seen = new Set<string | number>()
        return dummyData.bookings
            .filter((b) => {
                if (String(b.userId) !== String(userId)) return false
                // dedup — simpan hanya ID pertama yang muncul
                if (seen.has(b.id)) return false
                seen.add(b.id)
                return true
            })
            .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())
    }, [userId])

    const [currentPage, setCurrentPage] = useState(1)
    
    const totalPages = Math.ceil(orders.length / PAGE_SIZE)

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
    }, [currentPage, totalPages])

    const displayOrders = preview 
        ? orders.slice(0, PAGE_SIZE) 
        : orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    
    const hasMore = preview && orders.length > 0

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-base font-medium text-gray-600 dark:text-gray-400">{t("user_detail.orders.empty", "Belum ada pesanan untuk pengguna ini")}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {t("user_detail.orders.title", "Riwayat Pesanan")}
                </h4>
                {hasMore && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/${lang}/users/manage/${userId}/orders`)}
                        className="gap-2 text-xs h-8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-400"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t("user_detail.orders.view_all_count", "Lihat Semua ({{count}} Pesanan)").replace("{{count}}", String(orders.length))}
                    </Button>
                )}
            </div>

            {/* Preview notice */}
            {preview && orders.length > PAGE_SIZE && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                    {t("user_detail.orders.showing_preview", "Menampilkan 10 pesanan terbaru")}
                </p>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.order_id", "Kode")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.trainer", "Guru")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.package", "Paket")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.sessions", "Sesi")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.amount", "Nominal")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.status", "Status")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.date", "Tanggal")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayOrders.map((order) => {
                            const st = STATUS_CONFIG[getStage(order.status)]
                            return (
                                <TableRow
                                    key={order.id}
                                    onClick={() => router.push(`/${lang}/billing/orders/${order.id}`)}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                >
                                    <TableCell>
                                        <span className="font-semibold text-gray-900 dark:text-white">#{order.id}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{order.trainerName}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{order.packageName}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {order.completedSessions}/{order.totalSessions}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalPayment, locale)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${st.badgeCls} border-0 font-medium w-fit`}>
                                            {t(st.key, st.key)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 cursor-help border-b border-dashed border-gray-400 w-fit">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatTimeAgo(order.bookingDate, locale)}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{formatTooltipDate(order.bookingDate)}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {displayOrders.map((order) => {
                    const st = STATUS_CONFIG[getStage(order.status)]
                    return (
                        <div
                            key={order.id}
                            onClick={() => router.push(`/${lang}/billing/orders/${order.id}`)}
                            className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900 dark:text-white">#{order.id}</span>
                                <Badge className={`${st.badgeCls} border-0 font-medium`}>{t(st.key, st.key)}</Badge>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-200">
                                <p className="font-medium">{order.packageName}</p>
                                <p className="text-gray-500">{t("user_detail.orders.columns.trainer", "Guru")}: {order.trainerName}</p>
                                <p className="text-gray-500">{order.completedSessions}/{order.totalSessions} {t("user_detail.orders.session_label", "sesi")}</p>
                                <p className="text-gray-500">{formatDateShort(order.bookingDate, locale)}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalPayment, locale)}</span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    {t("user_detail.orders.detail", "Detail")} <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* View All Button (bottom, mobile-friendly) */}
            {hasMore && (
                <button
                    onClick={() => router.push(`/${lang}/users/manage/${userId}/orders`)}
                    className="w-full py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <ExternalLink className="w-4 h-4" />
                    {t("user_detail.orders.view_all_count", "Lihat Semua ({{count}} Pesanan)").replace("{{count}}", String(orders.length))}
                </button>
            )}

            {/* Pagination (full mode only) */}
            {!preview && orders.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    {/* Left: Info text + rows per page */}
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                            Menampilkan{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, orders.length)}
                            </span>{" "}
                            dari{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">{orders.length}</span>{" "}
                            pesanan
                        </span>
                    </div>

                    {/* Right: Page buttons + prev/next */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            {/* Prev */}
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {/* Page numbers */}
                            {(() => {
                                const pages: (number | "...")[] = []
                                const delta = 1
                                const left = currentPage - delta
                                const right = currentPage + delta

                                for (let i = 1; i <= totalPages; i++) {
                                    if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                                        pages.push(i)
                                    } else if (pages[pages.length - 1] !== "...") {
                                        pages.push("...")
                                    }
                                }

                                return pages.map((p, idx) =>
                                    p === "..." ? (
                                        <span key={`ellipsis-${idx}`} className="flex items-center justify-center w-8 h-8 text-xs text-gray-400">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p as number)}
                                            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                                                currentPage === p
                                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )
                            })()}

                            {/* Next */}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}