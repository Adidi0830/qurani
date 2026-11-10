"use client"

import { Suspense, useState, useMemo, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    ArrowLeft, Wallet, Printer, SlidersHorizontal, ChevronDown,
    X, FileText, ArrowDownLeft, ArrowUpRight, History,
    ExternalLink, ChevronLeft, ChevronRight
} from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { API_BASE } from "@/lib/api"
import {
    getSimWallet,
    getSimWalletBalances,
    getSimTransactions,
} from "@/lib/sim-wallet-store"

function getAvatarSrc(user: any): string | null {
    if (!user) return null
    if (user.imageBase64?.trim()) {
        const b64 = user.imageBase64.trim()
        if (b64.startsWith("data:image")) return b64
        return `data:image/jpeg;base64,${b64}`
    }
    if (user.avatar_url?.trim()) return user.avatar_url
    if (user.avatar?.trim()) return user.avatar
    if (user.image?.trim()) {
        const img = user.image.trim()
        if (img.startsWith("http")) return img
        return `${API_BASE}${img.startsWith("/") ? img : `/${img}`}`
    }
    return null
}

function formatCurrency(amount: number, locale: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function formatDateShort(dateString: string | undefined, locale: string = "id-ID") {
    if (!dateString) return "—"
    try {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date)
    } catch {
        return dateString
    }
}

function getTxTypeBadge(type: number | undefined, t: (key: string, fallback?: string) => string) {
    if (type === 1) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">TopUp</span>
    if (type === 2) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Withdraw</span>
    if (type === 3) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">Transfer</span>
    if (type === 4) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Payment</span>
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Lainnya</span>
}

function getTxTypeName(type: number | undefined, t: (k: string, f?: string) => string): string {
    if (type === 1) return "TopUp"
    if (type === 2) return "Withdraw"
    if (type === 3) return "Transfer"
    if (type === 4) return "Payment"
    return "Lainnya"
}

function MutationsFullContent() {
    const params = useParams()
    const router = useRouter()
    const { t, locale } = useI18n()
    const userId = (params as any)?.id as string
    const lang = (params as any)?.lang as string || "en"
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    const { profile, loading } = useUserProfile(userId)
    const user = profile as any

    const [walletData, setWalletData] = useState<any>(null)
    const [transactions, setTransactions] = useState<any[]>([])
    const [walletLoading, setWalletLoading] = useState(true)

    const [filterDateFrom, setFilterDateFrom] = useState("")
    const [filterDateTo, setFilterDateTo] = useState("")
    const [filterType, setFilterType] = useState<string>("all")
    const [filterOpen, setFilterOpen] = useState(false)
    const filterRef = useRef<HTMLDivElement>(null)

    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 10

    useEffect(() => {
        if (!userId) return
        setWalletLoading(true)
        try {
            const wInfo = getSimWallet(userId)
            const wBalances = getSimWalletBalances(userId)
            const allTxs = getSimTransactions()
            const txData = allTxs.filter((tx: any) => String(tx.userId) === String(userId))
            setWalletData({ ...wInfo, ...wBalances })
            setTransactions(txData)
        } catch (err) {
            console.error("Error fetching wallet:", err)
        } finally {
            setWalletLoading(false)
        }
    }, [userId])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filteredTransactions = useMemo(() => {
        let txs = [...transactions]
        if (filterDateFrom) {
            const from = new Date(filterDateFrom); from.setHours(0, 0, 0, 0)
            txs = txs.filter((tx) => new Date(tx.createdAt) >= from)
        }
        if (filterDateTo) {
            const to = new Date(filterDateTo); to.setHours(23, 59, 59, 999)
            txs = txs.filter((tx) => new Date(tx.createdAt) <= to)
        }
        if (filterType !== "all") {
            const typeNum = parseInt(filterType, 10)
            txs = txs.filter((tx) => tx.type === typeNum)
        }
        return txs
    }, [transactions, filterDateFrom, filterDateTo, filterType])

    const mutasiRows = useMemo(() => {
        if (!walletData) return []
        const ascending = [...filteredTransactions].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        let running = 0
        const withBalance = ascending.map((tx) => {
            running += tx.amount
            return { ...tx, runningBalance: Math.max(0, running) }
        })
        const activeBalance: number = walletData.activeBalance ?? walletData.balance ?? 0
        if (withBalance.length > 0) {
            const lastComputedBalance = withBalance[withBalance.length - 1].runningBalance
            const delta = activeBalance - lastComputedBalance
            return withBalance.map((tx) => ({
                ...tx,
                runningBalance: Math.max(0, tx.runningBalance + delta),
            })).reverse()
        }
        return []
    }, [filteredTransactions, walletData])

    const hasActiveFilters = filterDateFrom || filterDateTo || filterType !== "all"
    const clearFilters = () => { setFilterDateFrom(""); setFilterDateTo(""); setFilterType("all"); setCurrentPage(1) }

    // Pagination logic
    const totalPages = Math.ceil(mutasiRows.length / PAGE_SIZE)
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
    }, [currentPage, totalPages])
    
    const paginatedRows = useMemo(() => {
        return mutasiRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    }, [mutasiRows, currentPage, PAGE_SIZE])

    const handleExportPDF = () => {
        const userName = user?.name || user?.username || userId
        const fromLabel = filterDateFrom || "—"
        const toLabel = filterDateTo || "—"
        const printWindow = window.open("", "_blank")
        if (!printWindow) return

        const rows = mutasiRows.map((tx: any) => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">${formatDateShort(tx.createdAt, locale)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">
                    <div style="font-weight:600">${getTxTypeName(tx.type, t)}</div>
                    <div style="color:#9ca3af;font-size:11px">${tx.referenceId || `#${tx.id}`}</div>
                    <div style="color:#6b7280;font-size:11px">${tx.description || ""}</div>
                </td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;font-weight:700;color:${tx.amount < 0 ? "#dc2626" : "transparent"}">
                    ${tx.amount < 0 ? formatCurrency(Math.abs(tx.amount), locale) : "—"}
                </td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;font-weight:700;color:${tx.amount >= 0 ? "#059669" : "transparent"}">
                    ${tx.amount >= 0 ? formatCurrency(tx.amount, locale) : "—"}
                </td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;font-weight:700">${formatCurrency(tx.runningBalance, locale)}</td>
            </tr>`).join("")

        printWindow.document.write(`<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"/><title>Mutasi Rekening — ${userName}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:32px;background:#fff}h1{font-size:20px;margin-bottom:4px;color:#065f46}.meta{font-size:12px;color:#6b7280;margin-bottom:24px}table{width:100%;border-collapse:collapse}thead tr{background:#f0fdf4}th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #d1fae5}.num{text-align:right}tfoot td{font-weight:700;border-top:2px solid #6ee7b7;padding:10px 12px}@media print{body{padding:16px}}</style>
</head>
<body>
<h1>🕌 Qurani — Mutasi Rekening</h1>
<div class="meta">Pengguna: <strong>${userName}</strong> &nbsp;|&nbsp; Periode: <strong>${fromLabel} → ${toLabel}</strong> &nbsp;|&nbsp; Dicetak: <strong>${new Date().toLocaleString(locale)}</strong></div>
<table>
<thead><tr><th>Tanggal</th><th>Keterangan</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Saldo Akhir</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr><td colspan="4">Saldo Aktif</td><td class="num">${formatCurrency(walletData?.activeBalance ?? 0, locale)}</td></tr></tfoot>
</table>
<script>window.onload=function(){window.print();window.close()}<\/script>
</body></html>`)
        printWindow.document.close()
    }

    const isLoading = loading || walletLoading

    return (
        <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-6 py-6">
            {/* Back + Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <button
                    onClick={() => router.back()}
                    className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-emerald-600 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all shadow-sm shrink-0"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className="min-w-0">
                    {loading ? (
                        <Skeleton className="h-6 w-48" />
                    ) : (
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {t("user_detail.wallet_statement.full_page_title", "Semua Mutasi Saldo")}
                            {user?.name && (
                                <span className="text-gray-400 font-normal text-base ml-2">— {user.name}</span>
                            )}
                        </h1>
                    )}
                </div>
            </div>

            {/* User mini-header */}
            {!loading && user && (
                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <Avatar className="w-10 h-10 shrink-0 rounded-full border border-gray-100 dark:border-gray-800">
                        <AvatarImage src={getAvatarSrc(user) || undefined} className="object-cover" />
                        <AvatarFallback className="bg-emerald-50 text-emerald-600 font-bold">
                            {user.name?.charAt(0) || user.username?.charAt(1) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || user.username}</p>
                        <p className="text-xs text-gray-500 truncate">@{user.username?.replace("@", "")} · #{userId}</p>
                    </div>
                    <div className="ml-auto shrink-0">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
                            <Wallet className="w-3.5 h-3.5" />
                            {t("user_detail.wallet_statement.full_page_title", "Mutasi Saldo")}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {!isLoading && walletData && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                {t("user_detail.wallet_statement.income", "Pemasukan")}
                            </p>
                            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                {formatCurrency(mutasiRows.filter((tx: any) => tx.amount > 0).reduce((acc: number, tx: any) => acc + tx.amount, 0), locale)}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                {t("user_detail.wallet_statement.expense", "Pengeluaran")}
                            </p>
                            <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 truncate">
                                {formatCurrency(Math.abs(mutasiRows.filter((tx: any) => tx.amount < 0).reduce((acc: number, tx: any) => acc + tx.amount, 0)), locale)}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Table Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Section Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-emerald-500 shrink-0" />
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                                {t("billing.wallet_detail.history_title", "Riwayat Transaksi")}
                            </h3>
                            {!isLoading && (
                                <span className="text-xs text-gray-400 font-medium">({mutasiRows.length})</span>
                            )}
                        </div>
                        {/* Export PDF */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportPDF}
                            disabled={isLoading || mutasiRows.length === 0}
                            className="gap-1.5 text-xs h-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            {t("user_detail.wallet_statement.export_pdf", "Ekspor PDF")}
                        </Button>
                    </div>

                    {/* Filter Bar */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={() => setFilterOpen((v) => !v)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${hasActiveFilters
                                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                                    }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Filter
                                {hasActiveFilters && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                                <ChevronDown className={`w-3 h-3 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
                            </button>

                            {filterOpen && (
                                <div className="absolute top-full mt-2 z-30 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 space-y-3">
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Filter Transaksi</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Dari</label>
                                            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                                                className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Sampai</label>
                                            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                                                className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jenis Transaksi</label>
                                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                                            className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                                            <option value="all">Semua</option>
                                            <option value="1">TopUp</option>
                                            <option value="2">Withdraw</option>
                                            <option value="3">Transfer</option>
                                            <option value="4">Pembayaran</option>
                                        </select>
                                    </div>
                                    {hasActiveFilters && (
                                        <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold">
                                            <X className="w-3 h-3" /> Reset Filter
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Filter chips */}
                        {filterDateFrom && (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-full font-semibold">
                                Dari {filterDateFrom}
                                <button onClick={() => setFilterDateFrom("")}><X className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filterDateTo && (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-full font-semibold">
                                Sampai {filterDateTo}
                                <button onClick={() => setFilterDateTo("")}><X className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filterType !== "all" && (
                            <span className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-full font-semibold">
                                {getTxTypeName(parseInt(filterType), t)}
                                <button onClick={() => setFilterType("all")}><X className="w-3 h-3" /></button>
                            </span>
                        )}
                        {hasActiveFilters && (
                            <span className="text-[10px] text-gray-400 font-medium ml-1">
                                {filteredTransactions.length} transaksi
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-lg" />
                        ))}
                    </div>
                ) : mutasiRows.length === 0 ? (
                    <div className="text-center py-16 px-4 text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                        <p className="font-medium text-gray-500">
                            {t("user_detail.wallet_statement.empty", "Tidak ada transaksi ditemukan")}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 tracking-wider font-bold">
                                    <tr>
                                        <th className="px-5 py-3.5">{t("user_detail.wallet_statement.col_date", "Tanggal")}</th>
                                        <th className="px-5 py-3.5">{t("user_detail.wallet_statement.col_desc", "Keterangan")}</th>
                                        <th className="px-5 py-3.5 text-right">{t("user_detail.wallet_statement.col_debit", "Debit")}</th>
                                        <th className="px-5 py-3.5 text-right">{t("user_detail.wallet_statement.col_credit", "Kredit")}</th>
                                        <th className="px-5 py-3.5 text-right">{t("user_detail.wallet_statement.col_balance", "Saldo Akhir")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                    {paginatedRows.map((tx: any, idx: number) => {
                                        const isDebit = tx.amount < 0
                                        const isFirst = currentPage === 1 && idx === 0
                                        return (
                                            <tr key={`tbl-${tx.id}-${idx}`} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                            {formatDateShort(tx.createdAt, locale)}
                                                        </span>
                                                        {isFirst && (
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">
                                                                Terbaru
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            {getTxTypeBadge(tx.type, t)}
                                                        </div>
                                                        {tx.description && (
                                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 max-w-[220px] truncate">
                                                                {tx.description}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-mono text-gray-400">
                                                            {tx.referenceId || `#${tx.id}`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    {isDebit ? (
                                                        <span className="font-bold text-red-600 dark:text-red-400">
                                                            {formatCurrency(Math.abs(tx.amount), locale)}
                                                        </span>
                                                    ) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    {!isDebit ? (
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(tx.amount, locale)}
                                                        </span>
                                                    ) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                        {formatCurrency(tx.runningBalance, locale)}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                {/* Footer with active balance */}
                                <tfoot className="bg-gray-50/80 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <td colSpan={4} className="px-5 py-3.5 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                            {t("billing.wallet_detail.active_balance", "Saldo Aktif")}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(walletData?.activeBalance ?? 0, locale)}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-800/60">
                            {paginatedRows.map((tx: any, idx: number) => {
                                const isDebit = tx.amount < 0
                                const isFirst = currentPage === 1 && idx === 0
                                return (
                                    <div key={`mob-${tx.id}-${idx}`} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {getTxTypeBadge(tx.type, t)}
                                                {isFirst && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">Terbaru</span>}
                                            </div>
                                            <span className={`text-base font-black ${isDebit ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                {isDebit ? "-" : "+"}{formatCurrency(Math.abs(tx.amount), locale)}
                                            </span>
                                        </div>
                                        {tx.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{tx.description}</p>
                                        )}
                                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 pt-2">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-mono text-gray-400">{tx.referenceId || `#${tx.id}`}</span>
                                                <span className="text-[10px] text-gray-400">{formatDateShort(tx.createdAt, locale)}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Saldo</p>
                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{formatCurrency(tx.runningBalance, locale)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            {/* Footer saldo aktif */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                    {t("billing.wallet_detail.active_balance", "Saldo Aktif")}
                                </span>
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(walletData?.activeBalance ?? 0, locale)}
                                </span>
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t("user_detail.wallet_statement.pagination", "Menampilkan {{from}}-{{to}} dari {{total}} transaksi", {
                                        from: (currentPage - 1) * PAGE_SIZE + 1,
                                        to: Math.min(currentPage * PAGE_SIZE, mutasiRows.length),
                                        total: mutasiRows.length,
                                    })}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="text-xs h-8"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> {t("common.previous", "Sebelumnya")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="text-xs h-8"
                                    >
                                        {t("common.next", "Selanjutnya")} <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default function UserMutationsFullPage() {
    return (
        <Suspense>
            <MutationsFullContent />
        </Suspense>
    )
}
