"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import {
    Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle,
    Wallet, ArrowUpRight, Check, X, MoreVertical, RefreshCw, AlertCircle,
    Banknote, Users, TrendingUp, CheckSquare, Filter, Calendar, DollarSign, ChevronDown, FileText
} from "lucide-react"
import Image from "next/image"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { SmartPagination } from "@/components/ui/smart-pagination"
import { paymentsApi } from "@/lib/api"
import {
    getSimPayoutPending,
    getSimPayoutHistory,
    confirmSimPayout,
} from "@/lib/sim-billing-store"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNowStrict } from "date-fns"
import { id, enUS } from "date-fns/locale"

// ── helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n).replace("IDR", "Rp")
}

function formatDate(dateString: string | null, variant: 'short' | 'long' | 'relative' = 'long', tz: string = 'UTC', locale: string = 'en') {
    if (!dateString) return "—"
    try {
        let dateStr = String(dateString).trim()
        if (dateStr.includes(' ') && !dateStr.includes('T')) {
            dateStr = dateStr.replace(' ', 'T')
        }
        if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
            dateStr = dateStr + 'Z'
        }
        const date = new Date(dateStr)
        if (Number.isNaN(date.getTime())) return dateString

        if (variant === 'relative') {
            const localeObj = locale === 'id' ? id : enUS
            return formatDistanceToNowStrict(date, { addSuffix: true, locale: localeObj })
        }

        const options: Intl.DateTimeFormatOptions = {
            day: "2-digit",
            month: "short",
            timeZone: tz,
        }

        if (variant === 'long') {
            options.year = "numeric"
            options.hour = "2-digit"
            options.minute = "2-digit"
            options.hour12 = false
            options.timeZoneName = "short"
        }

        return new Intl.DateTimeFormat(
            locale === 'id' ? 'id-ID' : 'en-GB',
            options
        ).format(date)
    } catch {
        return dateString
    }
}

interface PendingPayout {
    id: number | string;
    userId?: number | string;
    userName?: string;
    trainerId?: number | string;
    trainerName?: string;
    bookingId?: number | string;
    amount: number;
    status: string;
    paymentMethod?: string;
    createdAt: string;
    updatedAt?: string;
    payoutReference?: string;
    isPaidOut?: boolean;
    notes?: string;
}

interface FilterState {
    status: string;
    method: string;
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
}

function getPayoutStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase();
    if (s === "paid_out" || s === "completed") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />Disetujui</span>;
    }
    if (s === "paid" || s === "pending_payout" || s === "pending") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Ditolak</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status || "—"}</span>;
}

function PayoutContent() {
    const { t, locale } = useTranslation(['billing', 'common'])
    const { profile } = useAuth()
    const router = useRouter();

    const resolveTimezone = useCallback(() => {
        const isValidTimezone = (tz: string) => {
            try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date()); return true; } catch { return false; }
        }
        let cachedTimezone = ""
        try {
            const raw = localStorage.getItem('myqurani_user_profile_v2')
            if (raw) { const parsed = JSON.parse(raw); cachedTimezone = String(parsed?.timezone || "").trim(); }
        } catch { /* no-op */ }
        const fromProfile = String(profile?.timezone || "").trim()
        const preferred = cachedTimezone || fromProfile
        if (preferred && isValidTimezone(preferred)) return preferred
        if (fromProfile && isValidTimezone(fromProfile)) return fromProfile
        try { const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (browserTz && isValidTimezone(browserTz)) return browserTz; } catch { /* no-op */ }
        return "UTC"
    }, [profile?.timezone])

    const [userTimezone, setUserTimezone] = useState<string>("UTC")
    useEffect(() => { setUserTimezone(resolveTimezone()) }, [resolveTimezone])

    const [loading, setLoading] = useState(true);
    const [allPayouts, setAllPayouts] = useState<PendingPayout[]>([]);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Search & Pagination
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filter state
    const [filterOpen, setFilterOpen] = useState(false);
    const [filter, setFilter] = useState<FilterState>({ status: '', method: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
    const [activeFilter, setActiveFilter] = useState<FilterState>({ status: '', method: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
    const filterRef = useRef<HTMLDivElement>(null);

    // Close filter modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && filterOpen) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [filterOpen]);

    // Stats
    const [stats, setStats] = useState({ pendingCount: 0, pendingTotal: 0, approvedCount: 0, rejectedCount: 0 });

    // Bulk select
    const [selectedIds, setSelectedIds] = useState<Array<number | string>>([]);

    // Modal states
    const [markPayoutModal, setMarkPayoutModal] = useState<PendingPayout | null>(null);
    const [bulkPayoutModal, setBulkPayoutModal] = useState(false);
    const [viewModal, setViewModal] = useState<{ open: boolean; item: PendingPayout | null }>({ open: false, item: null });
    const [payoutReference, setPayoutReference] = useState("");
    const [payoutNotes, setPayoutNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Close filter on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ── Fetch all payout data ────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pendingRes, completedRes] = await Promise.allSettled([
                paymentsApi.getPendingPayouts({ page: 1, pageSize: 100 }),
                paymentsApi.search({ Status: 'paid_out', Page: 1, PageSize: 100 } as any),
            ]);

            let pendingItems: PendingPayout[] = [];
            let completedItems: PendingPayout[] = [];

            if (pendingRes.status === 'fulfilled') {
                const res = pendingRes.value;
                pendingItems = Array.isArray(res) ? res : (res?.data || res?.items || []);
            }
            if (completedRes.status === 'fulfilled') {
                const res = completedRes.value;
                completedItems = Array.isArray(res) ? res : (res?.items || res?.data || []);
            }

            let combined = [...pendingItems, ...completedItems];

            if (combined.length === 0) {
                const simPending = getSimPayoutPending();
                const simHistory = getSimPayoutHistory();
                combined = [...simPending, ...simHistory];
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }

            setAllPayouts(combined);
            setStats({
                pendingCount: combined.filter(p => ['pending', 'pending_payout', 'paid'].includes((p.status || '').toLowerCase())).length,
                pendingTotal: combined.filter(p => ['pending', 'pending_payout', 'paid'].includes((p.status || '').toLowerCase())).reduce((a, b) => a + b.amount, 0),
                approvedCount: combined.filter(p => ['paid_out', 'completed'].includes((p.status || '').toLowerCase())).length,
                rejectedCount: combined.filter(p => ['failed', 'rejected', 'cancelled'].includes((p.status || '').toLowerCase())).length,
            });
        } catch (error) {
            const simPending = getSimPayoutPending();
            const simHistory = getSimPayoutHistory();
            const combined = [...simPending, ...simHistory];
            setAllPayouts(combined);
            setIsDemoMode(true);
            setStats({
                pendingCount: combined.filter(p => ['pending', 'pending_payout'].includes((p.status || '').toLowerCase())).length,
                pendingTotal: combined.filter(p => ['pending', 'pending_payout'].includes((p.status || '').toLowerCase())).reduce((a, b) => a + b.amount, 0),
                approvedCount: combined.filter(p => ['paid_out', 'completed'].includes((p.status || '').toLowerCase())).length,
                rejectedCount: 0,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSearch = () => { setActiveSearch(searchInput); setPage(1); setSelectedIds([]); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };

    // Apply filters + search client-side
    const filteredPayouts = allPayouts.filter(p => {
        if (activeSearch) {
            const q = activeSearch.toLowerCase();
            if (!(p.userName?.toLowerCase().includes(q) || p.trainerName?.toLowerCase().includes(q) || String(p.id).includes(q) || String(p.bookingId || '').includes(q))) return false;
        }
        if (activeFilter.status) {
            const s = (p.status || '').toLowerCase();
            if (activeFilter.status === 'pending' && !['pending', 'pending_payout', 'paid'].includes(s)) return false;
            if (activeFilter.status === 'approved' && !['paid_out', 'completed'].includes(s)) return false;
            if (activeFilter.status === 'rejected' && !['failed', 'rejected', 'cancelled'].includes(s)) return false;
        }
        if (activeFilter.method) {
            const m = (p.paymentMethod || '').toLowerCase();
            if (!m.includes(activeFilter.method.toLowerCase())) return false;
        }
        if (activeFilter.dateFrom && new Date(p.createdAt) < new Date(activeFilter.dateFrom)) return false;
        if (activeFilter.dateTo) {
            const to = new Date(activeFilter.dateTo); to.setHours(23, 59, 59);
            if (new Date(p.createdAt) > to) return false;
        }
        if (activeFilter.amountMin && p.amount < Number(activeFilter.amountMin)) return false;
        if (activeFilter.amountMax && p.amount > Number(activeFilter.amountMax)) return false;
        return true;
    });

    const hasActiveFilter = activeFilter.status || activeFilter.method || activeFilter.dateFrom || activeFilter.dateTo || activeFilter.amountMin || activeFilter.amountMax;
    const applyFilter = () => { setActiveFilter({ ...filter }); setPage(1); setFilterOpen(false); };
    const resetFilter = () => {
        const empty = { status: '', method: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };
        setFilter(empty); setActiveFilter(empty); setPage(1); setFilterOpen(false);
    };

    const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / pageSize));
    const paged = filteredPayouts.slice((page - 1) * pageSize, page * pageSize);

    const toggleSelectAll = () => {
        const pendingPaged = paged.filter(p => ['pending', 'pending_payout', 'paid'].includes((p.status || '').toLowerCase()));
        if (selectedIds.length === pendingPaged.length) setSelectedIds([]);
        else setSelectedIds(pendingPaged.map(p => p.id));
    };
    const toggleSelect = (id: number | string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleRowClick = (bookingId: number | string | undefined) => {
        if (!bookingId) return
        router.push(`/${locale}/billing/orders/${bookingId}?from=payout`)
    };

    // ── Payout Action: mark single payment as paid out ───────────────────────
    const handleMarkPayout = async (paymentId: string | number) => {
        if (!payoutReference.trim()) {
            showToast({ type: 'error', title: 'Referensi wajib diisi', message: 'Harap isi kolom Referensi Payout sebelum melanjutkan.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await paymentsApi.markPayout(paymentId, { payoutReference: payoutReference.trim(), notes: payoutNotes });
            showToast({ type: 'success', title: 'Payout Berhasil', message: 'Pembayaran telah berhasil ditandai sebagai sudah dibayarkan ke guru.' });
            setMarkPayoutModal(null);
            setPayoutReference("");
            setPayoutNotes("");
            fetchData();
        } catch (err: any) {
            confirmSimPayout(paymentId, payoutReference.trim(), payoutNotes.trim() || undefined);
            fetchData();
            showToast({ type: 'info', title: '[DEMO] Payout Ditandai', message: 'Pembayaran berhasil ditandai sebagai sudah dibayarkan (simulasi lokal).' });
            setMarkPayoutModal(null);
            setPayoutReference("");
            setPayoutNotes("");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Payout Action: bulk mark payments as paid out ────────────────────────
    const handleBulkPayout = async () => {
        if (!payoutReference.trim()) {
            showToast({ type: 'error', title: 'Referensi wajib diisi', message: 'Harap isi kolom Referensi Payout sebelum melanjutkan.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await paymentsApi.bulkPayout({ paymentIds: selectedIds, payoutReference: payoutReference.trim(), notes: payoutNotes });
            showToast({ type: 'success', title: 'Bulk Payout Berhasil', message: `${selectedIds.length} pembayaran berhasil ditandai sebagai sudah dibayarkan.` });
            setBulkPayoutModal(false);
            setPayoutReference("");
            setPayoutNotes("");
            setSelectedIds([]);
            fetchData();
        } catch {
            selectedIds.forEach(pid => confirmSimPayout(pid, payoutReference.trim(), payoutNotes.trim() || undefined));
            fetchData();
            showToast({ type: 'info', title: '[DEMO] Bulk Payout', message: `${selectedIds.length} pembayaran ditandai (simulasi lokal).` });
            setBulkPayoutModal(false);
            setPayoutReference("");
            setPayoutNotes("");
            setSelectedIds([]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const tz = userTimezone;

    return (
        <TooltipProvider>
            <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
                <ToastContainer />
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout Guru</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchData()}
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <RefreshCw className="w-4 h-4 text-gray-500" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* ── Overview Cards (3 cards) ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { label: "Payout Pending", value: stats.pendingCount, icon: Clock, bg: "bg-amber-100 dark:bg-amber-900/30", iconClr: "text-amber-600 dark:text-amber-400", isNum: true },
                            { label: "Nilai Pending", value: formatRupiah(stats.pendingTotal), icon: Banknote, bg: "bg-emerald-100 dark:bg-emerald-900/30", iconClr: "text-emerald-600 dark:text-emerald-400", isNum: false },
                            { label: "Disetujui", value: stats.approvedCount, icon: CheckCircle2, bg: "bg-emerald-100 dark:bg-emerald-900/30", iconClr: "text-emerald-600 dark:text-emerald-400", isNum: true },
                        ].map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                    <div className={`p-3 ${card.bg} ${card.iconClr} rounded-lg flex-shrink-0`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {loading ? "..." : card.value}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* ── Table ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* Toolbar: Search + Filter */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center border-b border-gray-100 dark:border-gray-700 px-4 py-3 gap-3">
                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                                {/* Search - bigger */}
                                <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow flex-1 max-w-md min-w-0">
                                    <div className="relative bg-white dark:bg-gray-900 flex-1 min-w-0">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            value={searchInput}
                                            onChange={e => setSearchInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Cari nama guru, user..."
                                            className="w-full pl-10 pr-3 py-2.5 text-sm bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSearch}
                                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                                    >
                                        Cari
                                    </button>
                                </div>

                                {/* Bulk Action & Filter */}
                                <div className="flex items-center gap-2">
                                    <div className="relative" ref={filterRef}>
                                        <button
                                            onClick={() => setFilterOpen(prev => !prev)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap ${hasActiveFilter
                                                ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                                                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <Filter className="w-4 h-4" />
                                            Filter
                                        </button>

                                    {/* Filter Modal */}
                                    {filterOpen && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Filter className="w-5 h-5 text-emerald-500" /> Filter Data Payout</h3>
                                                    <button onClick={() => setFilterOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="p-6 space-y-4">
                                                    {/* Status */}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Status</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['', 'pending', 'approved', 'rejected'].map(s => (
                                                                <button key={s} onClick={() => setFilter(f => ({ ...f, status: s }))}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter.status === s
                                                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                                                                    }`}>
                                                                    {s === '' ? 'Semua' : s === 'pending' ? 'Pending' : s === 'approved' ? 'Disetujui' : 'Ditolak'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Date Range */}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Tanggal</label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 mb-1">Dari</p>
                                                                <input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))}
                                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 mb-1">Sampai</p>
                                                                <input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))}
                                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Amount Range */}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><DollarSign className="w-3 h-3" />Nominal (Rp)</label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 mb-1">Lebih dari</p>
                                                                <input type="number" placeholder="0" value={filter.amountMin} onChange={e => setFilter(f => ({ ...f, amountMin: e.target.value }))}
                                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 mb-1">Kurang dari</p>
                                                                <input type="number" placeholder="∞" value={filter.amountMax} onChange={e => setFilter(f => ({ ...f, amountMax: e.target.value }))}
                                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                        <button onClick={resetFilter} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Reset</button>
                                                        <button onClick={applyFilter} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">Terapkan</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* end filterRef */}

                                    <button
                                        onClick={() => setBulkPayoutModal(true)}
                                        disabled={selectedIds.length === 0}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                                            selectedIds.length > 0
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        <CheckSquare className={`w-4 h-4 ${selectedIds.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500'}`} />
                                        Bulk Action {selectedIds.length > 0 && `(${selectedIds.length})`}
                                    </button>
                            </div>
                            {/* end Bulk+Filter flex */}
                        </div>
                        {/* end left flex flex-1 */}
                    </div>
                    {/* end toolbar */}

                    {/* MOBILE CARD VIEW (<640px) */}
                        <div className="space-y-3 sm:hidden p-4">
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 animate-pulse">
                                            <div className="flex justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                                            <div className="grid grid-cols-2 gap-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /></div>
                                        </div>
                                    ))}
                                </div>
                            ) : paged.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                    <p>Tidak ada data payout</p>
                                </div>
                            ) : paged.map(p => {
                                const isPending = ['pending', 'pending_payout', 'paid'].includes((p.status || '').toLowerCase());
                                return (
                                    <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                {isPending && <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 text-emerald-600 rounded border-gray-300" />}
                                                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                    #{p.bookingId || p.id}
                                                </span>
                                            </div>
                                            {getPayoutStatusBadge(p.status)}
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-1">
                                            <div>User: <button onClick={(e) => { e.stopPropagation(); router.push(`/${locale || 'id'}/users/manage/${p.userId}?tab=wallet`); }} title="Lihat profil" className="font-medium text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">{p.userName || `ID: ${p.userId}`}</button></div>
                                            <div>Guru: <button onClick={(e) => { e.stopPropagation(); if (p.trainerId) router.push(`/${locale || 'id'}/teachers/manage/${p.trainerId}?from=payout`); }} title={p.trainerId ? "Lihat profil guru" : ""} className={`text-sm leading-tight text-left ${p.trainerId ? 'font-semibold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : 'text-gray-700 dark:text-gray-300'}`}>{p.trainerName || `Trainer ID: ${p.trainerId}`}</button></div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.amount)}</span>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Aksi Payout</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {isPending ? (
                                                            <DropdownMenuItem onClick={() => setMarkPayoutModal(p)}>
                                                                <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                                <span className="font-medium text-emerald-600">Tandai Selesai</span>
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => setViewModal({ open: true, item: p })}>
                                                                <FileText className="w-4 h-4 mr-2 text-emerald-600" />
                                                                <span className="font-medium text-emerald-600">Lihat Catatan</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* DESKTOP TABLE (≥640px) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="w-10 px-4 py-3 text-center">
                                            <input type="checkbox"
                                                checked={paged.filter(p => ['pending', 'pending_payout', 'paid'].includes((p.status || '').toLowerCase())).length > 0 && selectedIds.length === paged.filter(p => ['pending', 'pending_payout', 'paid'].includes((p.status || '').toLowerCase())).length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 text-emerald-600 rounded border-gray-300" />
                                        </th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Kode Pesanan</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">User (Pembayar)</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Guru (Penerima)</th>
                                        <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 pr-8">Nominal</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tgl Bayar</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {loading ? (
                                        <tr><td colSpan={9}>
                                            <div className="space-y-3 py-4 px-6">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-4 animate-pulse">
                                                        {[80,120,100,120,80,80,90,60].map((w,j) => <Skeleton key={j} className={`h-3 w-[${w}px]`} />)}
                                                    </div>
                                                ))}
                                            </div>
                                        </td></tr>
                                    ) : paged.length === 0 ? (
                                        <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                                            <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                            <p>Tidak ada data payout</p>
                                        </td></tr>
                                    ) : paged.map(p => {
                                        const isPending = ['pending', 'pending_payout', 'paid'].includes((p.status || '').toLowerCase());
                                        return (
                                            <tr
                                                key={p.id}
                                                onClick={() => handleRowClick(p.bookingId)}
                                                className={`transition-colors ${p.bookingId ? 'cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'}`}
                                            >
                                                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                    {isPending && <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 text-emerald-600 rounded border-gray-300" />}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                        #{p.bookingId || p.id}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={(e) => { e.stopPropagation(); router.push(`/${locale || 'id'}/users/manage/${p.userId}?tab=wallet`); }} title="Lihat profil" className="font-medium text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left">{p.userName || `User ID: ${p.userId}`}</button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={(e) => { e.stopPropagation(); if (p.trainerId) router.push(`/${locale || 'id'}/teachers/manage/${p.trainerId}?from=payout`); }} title={p.trainerId ? "Lihat profil guru" : ""} className={`text-left ${p.trainerId ? 'font-medium text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : 'font-medium text-gray-900 dark:text-white text-sm'}`}>{p.trainerName || `Trainer ID: ${p.trainerId}`}</button>
                                                </td>
                                                <td className="px-4 py-3 text-right pr-8">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.amount)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {getPayoutStatusBadge(p.status)}
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px">
                                                                {formatDate(p.createdAt, 'relative', tz, locale)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p className="text-xs">{formatDate(p.createdAt, 'long', tz, locale)}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuLabel>Aksi Payout</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {isPending ? (
                                                                <DropdownMenuItem onClick={() => setMarkPayoutModal(p)}>
                                                                    <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                                    <span className="font-medium text-emerald-600">Tandai Selesai</span>
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => setViewModal({ open: true, item: p })}>
                                                                    <FileText className="w-4 h-4 mr-2 text-emerald-600" />
                                                                    <span className="font-medium text-emerald-600">Lihat Catatan</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <SmartPagination
                            total={filteredPayouts.length}
                            page={page}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                            loading={loading}
                        />
                    </div>

                    {/* ── Modals ── */}

                    {/* View Modal */}
                    {viewModal.open && viewModal.item && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Detail Catatan</h3>
                                    <button onClick={() => setViewModal({ open: false, item: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Catatan Admin:</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewModal.item.notes || 'Transfer Berhasil!'}</p>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button onClick={() => setViewModal({ open: false, item: null })} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm">Tutup</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mark Payout Modal */}
                    {markPayoutModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Tandai Sudah Dibayarkan</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Konfirmasi transfer ke guru</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl text-sm border border-emerald-100 dark:border-emerald-800/50 space-y-1">
                                        <p className="text-gray-500 dark:text-gray-400">Payment ID: <span className="font-semibold text-gray-900 dark:text-white">#{markPayoutModal.id}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Guru: <span className="font-semibold text-gray-900 dark:text-white">{markPayoutModal.trainerName}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Nominal: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(markPayoutModal.amount)}</span></p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Referensi Payout <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={payoutReference}
                                            onChange={e => setPayoutReference(e.target.value)}
                                            placeholder="Contoh: TRF-2026-001, REF-BANK-XXX"
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Catatan <span className="text-gray-400 font-normal">(Opsional)</span>
                                        </label>
                                        <textarea
                                            value={payoutNotes}
                                            onChange={e => setPayoutNotes(e.target.value)}
                                            rows={2}
                                            placeholder="Catatan tambahan..."
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={() => handleMarkPayout(markPayoutModal.id)}
                                            disabled={isSubmitting || !payoutReference.trim()}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                        >
                                            {isSubmitting ? 'Memproses...' : 'Konfirmasi Payout'}
                                        </button>
                                        <button
                                            onClick={() => { setMarkPayoutModal(null); setPayoutReference(""); setPayoutNotes(""); }}
                                            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Payout Modal */}
                    {bulkPayoutModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Bulk Payout</h3>
                                        <p className="text-xs text-gray-500">{selectedIds.length} pembayaran terpilih</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl text-sm border border-emerald-100 dark:border-emerald-800/50">
                                        <p className="text-gray-600 dark:text-gray-300">Total dipilih: <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedIds.length} pembayaran</span></p>
                                        <p className="text-gray-600 dark:text-gray-300 mt-0.5">Total nilai: <span className="font-bold text-emerald-600">{formatRupiah(allPayouts.filter(p => selectedIds.includes(p.id)).reduce((a, b) => a + b.amount, 0))}</span></p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Referensi Payout <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={payoutReference}
                                            onChange={e => setPayoutReference(e.target.value)}
                                            placeholder="Contoh: BATCH-2026-001"
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Catatan <span className="text-gray-400 font-normal">(Opsional)</span>
                                        </label>
                                        <textarea
                                            value={payoutNotes}
                                            onChange={e => setPayoutNotes(e.target.value)}
                                            rows={2}
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={handleBulkPayout}
                                            disabled={isSubmitting || !payoutReference.trim()}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                        >
                                            {isSubmitting ? 'Memproses...' : 'Proses Bulk Payout'}
                                        </button>
                                        <button
                                            onClick={() => { setBulkPayoutModal(false); setPayoutReference(""); setPayoutNotes(""); }}
                                            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            
        </TooltipProvider>
    )
}

export default function PayoutPage() {
    return (
                <PayoutContent />
    )
}
