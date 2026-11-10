"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Wallet,
    Clock,
    RefreshCw,
    Filter,
    CheckCircle,
    XCircle,
    Download,
    Info,
    X,
    History
} from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { walletApi } from "@/lib/api"
import { showToast, ToastContainer } from "@/components/ui/toast-sim"
import { SmartPagination } from "@/components/ui/smart-pagination"
import {
    getSimWalletStats,
    getSimTransactions
} from "@/lib/sim-wallet-store"
import { getSimPayoutPending } from "@/lib/sim-billing-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function formatDate(dateString: string | undefined, format: 'relative' | 'long' | 'short' = 'relative', tz: string = 'UTC', locale: string = 'id-ID') {
    if (!dateString) return "-"
    try {
        let normalized = dateString.trim()
        if (normalized.includes(" ") && !normalized.includes("T")) normalized = normalized.replace(" ", "T")
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(normalized)) normalized += "Z"
        const date = new Date(normalized)
        if (isNaN(date.getTime())) return "-"
        if (format === 'long') return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short', timeZone: tz }).format(date)
        if (format === 'short') return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short', timeZone: tz }).format(date)
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
        if (diffInSeconds < 60) return "Baru saja"
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari lalu`
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: tz }).format(date)
    } catch {
        return dateString
    }
}

function getTxTypeBadge(type: number | undefined, typeName?: string) {
    if (type === 1 || typeName === 'TopUp') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">TopUp</span>
    if (type === 2 || typeName === 'Withdraw') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Withdraw</span>
    if (type === 3) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">Transfer</span>
    if (type === 4) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Payment</span>
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Lainnya</span>
}

function getStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase()
    if (s === "success" || s === "completed" || s === "approved") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle className="w-3 h-3" />Berhasil</span>
    }
    if (s === "pending" || s === "waiting") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Gagal</span>
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status || "-"}</span>
}

function getPaymentMethodName(raw: string | undefined): string {
    if (!raw) return "-"
    const lower = raw.toLowerCase()
    if (lower.includes("qurani wallet") || lower.includes("wallet qurani") || lower.includes("saldo wallet") || lower.includes("qurani")) return "Qurani Wallet"
    if (lower.includes("gopay")) return "GoPay"
    if (lower.includes("dana")) return "DANA"
    if (lower.includes("ovo")) return "OVO"
    if (lower.includes("shopeepay") || lower.includes("spay")) return "ShopeePay"
    if (lower.includes("bca")) return "Bank BCA"
    if (lower.includes("mandiri")) return "Bank Mandiri"
    if (lower.includes("bni")) return "Bank BNI"
    if (lower.includes("bri")) return "Bank BRI"
    if (lower.includes("bsi")) return "Bank BSI"
    if (lower.includes("cimb")) return "Bank CIMB"
    if (lower.includes("permata")) return "Bank Permata"
    if (lower.includes("virtual account") || lower.includes("va")) return raw.replace(/virtual account/i, "VA").trim()
    if (lower.includes("transfer bank")) return raw.replace(/transfer bank/i, "Bank").trim()
    return raw
}

const DEFAULT_FILTERS = {
    kategori: "all",
    nominalMin: "",
    nominalMax: "",
    dateStart: "",
    dateEnd: "",
    metode: "",
    status: "all"
}

export default function FinanceDashboardPage() {
    const { t } = useI18n()
    const params = useParams()
    const router = useRouter()
    const lang = params?.lang || "en"
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const locale = 'id-ID'

    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>(null)
    const [transactions, setTransactions] = useState<any[]>([])
    const [allTransactions, setAllTransactions] = useState<any[]>([])
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    // Filter states
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [kategoriFilter, setKategoriFilter] = useState("all")
    const [nominalMin, setNominalMin] = useState("")
    const [nominalMax, setNominalMax] = useState("")
    const [dateStart, setDateStart] = useState("")
    const [dateEnd, setDateEnd] = useState("")
    const [metodeFilter, setMetodeFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS)

    const isFilterActive =
        activeFilters.kategori !== "all" ||
        activeFilters.nominalMin !== "" ||
        activeFilters.nominalMax !== "" ||
        activeFilters.dateStart !== "" ||
        activeFilters.dateEnd !== "" ||
        activeFilters.metode !== "" ||
        activeFilters.status !== "all"

    function applyFiltersToItems(items: any[], filters: typeof DEFAULT_FILTERS) {
        let filtered = [...items]
        if (filters.kategori && filters.kategori !== "all") filtered = filtered.filter((item: any) => item.type === parseInt(filters.kategori))
        if (filters.metode) { const m = filters.metode.toLowerCase(); filtered = filtered.filter((item: any) => item.paymentMethod?.toLowerCase().includes(m)) }
        if (filters.status && filters.status !== "all") {
            const s = filters.status.toLowerCase()
            if (s === "berhasil") filtered = filtered.filter((item: any) => ["completed", "success", "approved"].includes((item.status || "").toLowerCase()))
            else if (s === "pending") filtered = filtered.filter((item: any) => ["pending", "waiting"].includes((item.status || "").toLowerCase()))
            else if (s === "tolak") filtered = filtered.filter((item: any) => ["failed", "rejected", "cancelled"].includes((item.status || "").toLowerCase()))
        }
        if (filters.nominalMin) filtered = filtered.filter((item: any) => Math.abs(item.amount) >= parseInt(filters.nominalMin))
        if (filters.nominalMax) filtered = filtered.filter((item: any) => Math.abs(item.amount) <= parseInt(filters.nominalMax))
        if (filters.dateStart) filtered = filtered.filter((item: any) => new Date(item.createdAt) >= new Date(filters.dateStart))
        if (filters.dateEnd) { const endDate = new Date(filters.dateEnd); endDate.setHours(23, 59, 59, 999); filtered = filtered.filter((item: any) => new Date(item.createdAt) <= endDate) }
        return filtered
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [statsRes, txRes] = await Promise.allSettled([
                walletApi.getStatisticsOverview(),
                walletApi.getTransactions({ page: 1, pageSize: 200 })
            ])
            let fetchedStats: any = null
            let fetchedTxs: any[] = []
            if (statsRes.status === 'fulfilled' && statsRes.value) fetchedStats = statsRes.value.data || statsRes.value
            if (txRes.status === 'fulfilled' && txRes.value) {
                const data = txRes.value?.data || txRes.value
                fetchedTxs = Array.isArray(data) ? data : (data?.items || data?.data || [])
            }
            if (!fetchedStats) { fetchedStats = getSimWalletStats(); fetchedStats.activeBalance = 0; fetchedStats.pendingBalance = 0 }
            if (fetchedTxs.length === 0) fetchedTxs = getSimTransactions()
            
            // Hitung Saldo Aktif dari riwayat transaksi yang berhasil (ditambah modal awal/base balance agar tidak minus karena data dummy withdraw > topup)
            const BASE_BALANCE = 1240000;
            const calculatedActiveBalance = BASE_BALANCE + fetchedTxs.reduce((sum, tx) => {
                const s = (tx.status || "").toLowerCase()
                if (s === "success" || s === "completed" || s === "approved") {
                    const isPayout = tx.amount < 0 && String(tx.description).toLowerCase().includes('payout');
                    if (isPayout) {
                        return sum;
                    }
                    return sum + (tx.amount || 0)
                }
                return sum
            }, 0)
            
            // Hitung Saldo Pending dari data Payout Pending (uang user yang sudah masuk dan menunggu dicairkan ke guru)
            const pendingPayouts = getSimPayoutPending()
            const calculatedPendingBalance = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0)

            fetchedStats.activeBalance = calculatedActiveBalance
            fetchedStats.pendingBalance = calculatedPendingBalance

            setStats(fetchedStats)
            setAllTransactions(fetchedTxs)
        } catch {
            const fallbackStats = getSimWalletStats()
            const fallbackTxs = getSimTransactions()
            
            const BASE_BALANCE = 124000000;
            const calculatedActiveBalance = BASE_BALANCE + fallbackTxs.reduce((sum, tx) => {
                const s = (tx.status || "").toLowerCase()
                if (s === "success" || s === "completed" || s === "approved") {
                    const isPayout = tx.amount < 0 && String(tx.description).toLowerCase().includes('payout');
                    if (isPayout) {
                        return sum;
                    }
                    return sum + (tx.amount || 0)
                }
                return sum
            }, 0)
            
            const pendingPayouts = getSimPayoutPending()
            const calculatedPendingBalance = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0)

            fallbackStats.activeBalance = calculatedActiveBalance
            fallbackStats.pendingBalance = calculatedPendingBalance

            setStats(fallbackStats)
            setAllTransactions(fallbackTxs)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        const filtered = applyFiltersToItems(allTransactions, activeFilters)
        setTotalCount(filtered.length)
        const start = (page - 1) * pageSize
        setTransactions(filtered.slice(start, start + pageSize))
    }, [allTransactions, activeFilters, page, pageSize])

    function handleApplyFilter() {
        setActiveFilters({ kategori: kategoriFilter, nominalMin, nominalMax, dateStart, dateEnd, metode: metodeFilter, status: statusFilter })
        setPage(1)
        setIsFilterOpen(false)
    }

    function handleResetFilter() {
        setKategoriFilter("all"); setNominalMin(""); setNominalMax(""); setDateStart(""); setDateEnd(""); setMetodeFilter(""); setStatusFilter("all")
        setActiveFilters(DEFAULT_FILTERS)
        setPage(1)
        setIsFilterOpen(false)
    }

    // legacy compat
    const pagedTransactions = transactions

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
            <ToastContainer />
            <div className="max-w-[1400px] mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-emerald-500" />
                            Wallet
                        </h1>
                        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                            Refresh
                        </button>
                    </div>

                    {/* ── Main Balance Cards ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Active Balance */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-6 right-6 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Saldo Aktif</h3>
                            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                                {loading ? <Skeleton className="h-10 w-48" /> : formatCurrency(stats?.activeBalance || 0)}
                            </div>
                        </div>

                        {/* Pending Balance */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-6 right-6 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Saldo Pending</h3>
                            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                                {loading ? <Skeleton className="h-10 w-48" /> : formatCurrency(stats?.pendingBalance || 0)}
                            </div>
                        </div>
                    </div>

                    {/* ── Transaction Ledger Table ── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Riwayat Transaksi</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsFilterOpen(true)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                                        isFilterActive
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700"
                                            : "bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    <Filter className="w-4 h-4" /> Filter
                                    {isFilterActive && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold">✓</span>}
                                </button>
                                <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    <Download className="w-4 h-4" /> Export
                                </button>
                            </div>
                        </div>

                        {isFilterActive && (
                            <div className="px-6 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
                                {activeFilters.kategori !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Kategori: {activeFilters.kategori === "1" ? "TopUp" : activeFilters.kategori === "2" ? "Withdraw" : activeFilters.kategori === "3" ? "Transfer" : "Payment"}</span>}
                                {activeFilters.status !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Status: {activeFilters.status}</span>}
                                {activeFilters.metode && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Metode: {activeFilters.metode}</span>}
                                {(activeFilters.nominalMin || activeFilters.nominalMax) && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Nominal: {activeFilters.nominalMin || "0"} s/d {activeFilters.nominalMax || "max"}</span>}
                                {(activeFilters.dateStart || activeFilters.dateEnd) && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Tanggal: {activeFilters.dateStart || "-"} s/d {activeFilters.dateEnd || "-"}</span>}
                                <button onClick={handleResetFilter} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><X className="w-3 h-3" /> Reset</button>
                            </div>
                        )}

                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Kategori</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Nominal</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Metode</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Waktu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i}>
                                                <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                                                <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                                                <td className="px-6 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                                                <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                                                <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                                                <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                                <td className="px-6 py-4 hidden xl:table-cell"><Skeleton className="h-4 w-24" /></td>
                                            </tr>
                                        ))
                                    ) : pagedTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                <History className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                                <p>Belum ada riwayat transaksi</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        pagedTransactions.map((tx: any, idx: number) => (
                                            <tr
                                                key={tx.id || idx}
                                                onClick={() => router.push(`/${lang}/billing/${tx.id}/transaction`)}
                                                className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">#{tx.id}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (tx.userId) { router.push(`/${lang}/users/manage/${tx.userId}?tab=wallet`) } }}
                                                        className="font-bold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left"
                                                        title="Lihat profil"
                                                    >
                                                        {tx.user?.name || `User ID: ${tx.userId}`}
                                                    </button>
                                                    {tx.user?.username && <p className="text-[11px] text-gray-400">@{tx.user.username}</p>}
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <div className="mb-1">{getTxTypeBadge(tx.type, tx.typeName)}</div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{tx.description || '-'}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <span className={`font-bold text-sm ${tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount || 0))}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">{getPaymentMethodName(tx.paymentMethod)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(tx.status)}</td>
                                                <td className="px-6 py-4 hidden xl:table-cell whitespace-nowrap">
                                                    <TooltipProvider delayDuration={100}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 pb-0.5">
                                                                    {formatDate(tx.createdAt, 'relative', tz, locale)}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="text-xs">
                                                                {formatDate(tx.createdAt, 'long', tz, locale)}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <div className="p-4 space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : pagedTransactions.length === 0 ? (
                                <div className="py-12 text-center text-gray-500">
                                    <History className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                    <p className="text-sm font-medium">Belum ada riwayat transaksi</p>
                                </div>
                            ) : (
                                pagedTransactions.map((tx: any, idx: number) => (
                                    <div
                                        key={tx.id || idx}
                                        onClick={() => router.push(`/${lang}/billing/${tx.id}/transaction`)}
                                        className="p-4 space-y-3 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {/* Row 1: ID + Status */}
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800 shrink-0">
                                                #{tx.id}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {getTxTypeBadge(tx.type, tx.typeName)}
                                                {getStatusBadge(tx.status)}
                                            </div>
                                        </div>

                                        {/* Row 2: User info */}
                                        <div className="flex items-start gap-2">
                                            <div className="min-w-0 flex-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (tx.userId) { router.push(`/${lang}/users/manage/${tx.userId}?tab=wallet`) } }}
                                                    className="font-semibold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left truncate block w-full"
                                                >
                                                    {tx.user?.name || `User ID: ${tx.userId}`}
                                                </button>
                                                {tx.user?.username && (
                                                    <span className="text-[11px] text-gray-400">@{tx.user.username}</span>
                                                )}
                                                {tx.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{tx.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 3: Amount + Method + Time */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                    {getPaymentMethodName(tx.paymentMethod)}
                                                </span>
                                                <span className="text-[11px] text-gray-400">
                                                    {formatDate(tx.createdAt, 'relative', tz, locale)}
                                                </span>
                                            </div>
                                            <span className={`font-black text-base ${tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount || 0))}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <SmartPagination
                            total={totalCount}
                            page={page}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(s: number) => { setPageSize(s); setPage(1) }}
                            loading={loading}
/>
                        </div>
                </div>

            {/* ── Filter Dialog ── */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Filter className="w-5 h-5 text-emerald-500" /> Filter Transaksi
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Kategori</label>
                            <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                                <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">Semua Kategori</SelectItem>
                                        <SelectItem value="1">TopUp</SelectItem>
                                        <SelectItem value="2">Withdraw</SelectItem>
                                        <SelectItem value="3">Transfer</SelectItem>
                                        <SelectItem value="4">Payment</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Metode Pembayaran</label>
                            <input type="text" placeholder="Contoh: Bank BCA, DANA, dll" value={metodeFilter} onChange={e => setMetodeFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"><SelectValue placeholder="Semua Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="Berhasil">Berhasil</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="Tolak">Ditolak</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Nominal (Rp)</label>
                            <div className="flex items-center gap-2">
                                <input type="number" placeholder="Min" value={nominalMin} onChange={e => setNominalMin(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
                                <span className="text-gray-400">-</span>
                                <input type="number" placeholder="Max" value={nominalMax} onChange={e => setNominalMax(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Rentang Tanggal</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow [color-scheme:light] dark:[color-scheme:dark]" />
                                <span className="text-gray-400">-</span>
                                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow [color-scheme:light] dark:[color-scheme:dark]" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <button onClick={handleResetFilter} className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Reset</button>
                        <button onClick={handleApplyFilter} className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all">Terapkan Filter</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
