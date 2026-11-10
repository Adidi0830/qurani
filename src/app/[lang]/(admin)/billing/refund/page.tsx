"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import {
    Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock,
    RotateCcw, AlertCircle, RefreshCw, MoreVertical,
    Check, X, Banknote, Receipt, Filter, Calendar, DollarSign, ChevronDown
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { SmartPagination } from "@/components/ui/smart-pagination"
import { paymentsApi } from "@/lib/api"
import {
    getSimRefundPending,
    getSimRefundProcessed,
    approveSimRefund,
    rejectSimRefund,
} from "@/lib/sim-billing-store"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNowStrict } from "date-fns"
import { id, enUS } from "date-fns/locale"
import { useRouter } from "next/navigation"

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
        if (dateStr.includes(' ') && !dateStr.includes('T')) dateStr = dateStr.replace(' ', 'T')
        if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) dateStr += 'Z'
        const date = new Date(dateStr)
        if (Number.isNaN(date.getTime())) return dateString
        if (variant === 'relative') {
            return formatDistanceToNowStrict(date, { addSuffix: true, locale: locale === 'id' ? id : enUS })
        }
        const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", timeZone: tz }
        if (variant === 'long') { options.year = "numeric"; options.hour = "2-digit"; options.minute = "2-digit"; options.hour12 = false; options.timeZoneName = "short" }
        return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', options).format(date)
    } catch { return dateString }
}

interface RefundItem {
    id: number | string;
    userId?: number | string;
    userName?: string;
    trainerId?: number | string;
    trainerName?: string;
    bookingId?: number | string;
    amount: number;
    refundAmount?: number;
    status: string;
    paymentMethod?: string;
    refundReason?: string;
    sessionsInfo?: string;
    createdAt: string;
    updatedAt?: string;
    notes?: string;
}

// Filter state type
interface FilterState {
    status: string; // '' | 'pending' | 'approved' | 'rejected'
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
}

function getStatusBadge(status: string) {
    const s = status?.toLowerCase() || '';
    if (s === 'refunded' || s === 'approved')
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />Disetujui</span>;
    if (s === 'rejected' || s === 'failed')
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Ditolak</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
}

function RefundContent() {
    const { t, locale } = useTranslation(['billing', 'common'])
    const { profile } = useAuth()
    const router = useRouter()

    const resolveTimezone = useCallback(() => {
        const isValidTimezone = (tz: string) => { try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date()); return true; } catch { return false; } }
        let cached = ""; try { const raw = localStorage.getItem('myqurani_user_profile_v2'); if (raw) { cached = JSON.parse(raw)?.timezone || ""; } } catch { }
        const fromProfile = String(profile?.timezone || "").trim();
        const preferred = cached || fromProfile;
        if (preferred && isValidTimezone(preferred)) return preferred;
        if (fromProfile && isValidTimezone(fromProfile)) return fromProfile;
        try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && isValidTimezone(tz)) return tz; } catch { }
        return "UTC";
    }, [profile?.timezone]);

    const [tz, setTz] = useState("UTC");
    useEffect(() => { setTz(resolveTimezone()); }, [resolveTimezone]);

    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [allRefunds, setAllRefunds] = useState<RefundItem[]>([]);

    const [search, setSearch] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filter state
    const [filterOpen, setFilterOpen] = useState(false);
    const [filter, setFilter] = useState<FilterState>({ status: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
    const [activeFilter, setActiveFilter] = useState<FilterState>({ status: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
    const filterRef = useRef<HTMLDivElement>(null);

    const [stats, setStats] = useState({ pendingCount: 0, totalValue: 0, approvedCount: 0, rejectedCount: 0 });

    // Modal
    const [actionModal, setActionModal] = useState<{ open: boolean; item: RefundItem | null; type: 'approve' | 'reject' }>({ open: false, item: null, type: 'approve' });
    const [viewModal, setViewModal] = useState<{ open: boolean; item: RefundItem | null }>({ open: false, item: null });
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewModal.open) setViewModal({ open: false, item: null });
                if (actionModal.open) setActionModal({ open: false, item: null, type: 'approve' });
                if (filterOpen) setFilterOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [viewModal.open, actionModal.open, filterOpen]);

    // ── Fetch all refunds (pending + processed combined) ───────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [pendingRes, processedRes] = await Promise.allSettled([
                paymentsApi.getPendingRefunds({ page: 1, pageSize: 100 } as any),
                paymentsApi.search({ Status: 'refunded', Page: 1, PageSize: 100 } as any),
            ]);

            let pendingItems: RefundItem[] = [];
            let processedItems: RefundItem[] = [];

            if (pendingRes.status === 'fulfilled') {
                const res = pendingRes.value;
                pendingItems = Array.isArray(res) ? res : (res?.data || res?.items || []);
            }
            if (processedRes.status === 'fulfilled') {
                const res = processedRes.value;
                processedItems = Array.isArray(res) ? res : (res?.data || res?.items || []);
            }

            let combined: RefundItem[] = [...pendingItems, ...processedItems];

            if (combined.length === 0) {
                const simPending = getSimRefundPending();
                const simProcessed = getSimRefundProcessed();
                combined = [...simPending, ...simProcessed];
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }

            setAllRefunds(combined);
            setStats({
                pendingCount: combined.filter(r => {
                    const s = (r.status || '').toLowerCase();
                    return s === 'pending' || s === 'waiting' || s === 'pending_refund';
                }).length,
                totalValue: combined.reduce((a, b) => a + (b.refundAmount ?? b.amount), 0),
                approvedCount: combined.filter(r => {
                    const s = (r.status || '').toLowerCase();
                    return s === 'refunded' || s === 'approved';
                }).length,
                rejectedCount: combined.filter(r => {
                    const s = (r.status || '').toLowerCase();
                    return s === 'rejected' || s === 'failed';
                }).length,
            });
        } catch {
            const simPending = getSimRefundPending();
            const simProcessed = getSimRefundProcessed();
            const combined = [...simPending, ...simProcessed];
            setAllRefunds(combined);
            setIsDemoMode(true);
            setStats({
                pendingCount: combined.filter(r => ['pending', 'waiting', 'pending_refund'].includes((r.status || '').toLowerCase())).length,
                totalValue: combined.reduce((a: number, b: any) => a + (b.refundAmount ?? b.amount), 0),
                approvedCount: combined.filter(r => ['refunded', 'approved'].includes((r.status || '').toLowerCase())).length,
                rejectedCount: combined.filter(r => ['rejected', 'failed'].includes((r.status || '').toLowerCase())).length,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Apply filters + search client-side
    const filteredRefunds = allRefunds.filter(r => {
        // Search
        if (activeSearch) {
            const q = activeSearch.toLowerCase();
            if (!(r.userName?.toLowerCase().includes(q) || r.trainerName?.toLowerCase().includes(q) || String(r.id).includes(q) || r.refundReason?.toLowerCase().includes(q))) return false;
        }
        // Status filter
        if (activeFilter.status) {
            const s = (r.status || '').toLowerCase();
            if (activeFilter.status === 'pending' && !['pending', 'waiting', 'pending_refund'].includes(s)) return false;
            if (activeFilter.status === 'approved' && !['approved', 'refunded'].includes(s)) return false;
            if (activeFilter.status === 'rejected' && !['rejected', 'failed'].includes(s)) return false;
        }
        // Date from
        if (activeFilter.dateFrom) {
            const d = new Date(r.createdAt);
            const from = new Date(activeFilter.dateFrom);
            if (d < from) return false;
        }
        // Date to
        if (activeFilter.dateTo) {
            const d = new Date(r.createdAt);
            const to = new Date(activeFilter.dateTo);
            to.setHours(23, 59, 59);
            if (d > to) return false;
        }
        // Amount min
        if (activeFilter.amountMin) {
            const val = r.refundAmount ?? r.amount;
            if (val < Number(activeFilter.amountMin)) return false;
        }
        // Amount max
        if (activeFilter.amountMax) {
            const val = r.refundAmount ?? r.amount;
            if (val > Number(activeFilter.amountMax)) return false;
        }
        return true;
    });

    const paged = filteredRefunds.slice((page - 1) * pageSize, page * pageSize);

    const handleSearch = () => { setActiveSearch(search); setPage(1); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };

    const hasActiveFilter = activeFilter.status || activeFilter.dateFrom || activeFilter.dateTo || activeFilter.amountMin || activeFilter.amountMax;

    const applyFilter = () => {
        setActiveFilter({ ...filter });
        setPage(1);
        setFilterOpen(false);
    };
    const resetFilter = () => {
        const empty = { status: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };
        setFilter(empty);
        setActiveFilter(empty);
        setPage(1);
        setFilterOpen(false);
    };

    const openAction = (item: RefundItem, type: 'approve' | 'reject') => {
        setActionModal({ open: true, item, type });
        setNotes("");
    };

    const handleRowClick = (bookingId: number | string | undefined) => {
        if (!bookingId) return
        router.push(`/${locale}/billing/orders/${bookingId}?from=refund`)
    };

    const handleProcessRefund = async () => {
        if (!actionModal.item) return;
        if (actionModal.type === 'reject' && !notes.trim()) {
            showToast({ type: 'error', title: 'Catatan wajib diisi', message: 'Harap isi alasan penolakan.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await paymentsApi.processRefund(actionModal.item.id, {
                approved: actionModal.type === 'approve' ? 1 : 0,
                notes: notes.trim() || undefined,
                amount: actionModal.item.refundAmount ?? actionModal.item.amount,
            });
            showToast({
                type: 'success',
                title: actionModal.type === 'approve' ? 'Refund Disetujui' : 'Refund Ditolak',
                message: actionModal.type === 'approve'
                    ? 'Refund berhasil disetujui dan akan diproses ke user.'
                    : 'Refund berhasil ditolak.',
            });
            setActionModal({ open: false, item: null, type: 'approve' });
            fetchAll();
        } catch {
            if (actionModal.type === 'approve') {
                approveSimRefund(actionModal.item!.id, notes.trim() || undefined);
            } else {
                rejectSimRefund(actionModal.item!.id, notes.trim() || 'Ditolak oleh Admin');
            }

            const simPending = getSimRefundPending();
            const simProcessed = getSimRefundProcessed();
            const combined = [...simPending, ...simProcessed];
            setAllRefunds(combined);
            setStats({
                pendingCount: combined.filter(r => ['pending', 'waiting', 'pending_refund'].includes((r.status || '').toLowerCase())).length,
                totalValue: combined.reduce((a: number, b: any) => a + (b.refundAmount ?? b.amount), 0),
                approvedCount: combined.filter(r => ['refunded', 'approved'].includes((r.status || '').toLowerCase())).length,
                rejectedCount: combined.filter(r => ['rejected', 'failed'].includes((r.status || '').toLowerCase())).length,
            });

            showToast({
                type: 'info',
                title: `[DEMO] Refund ${actionModal.type === 'approve' ? 'Disetujui' : 'Ditolak'}`,
                message: 'Aksi berhasil disimulasikan secara lokal.',
            });
            setActionModal({ open: false, item: null, type: 'approve' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <TooltipProvider>
            <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
                <ToastContainer />
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <RotateCcw className="w-6 h-6 text-emerald-500" />
                                Refund
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                                <RefreshCw className="w-4 h-4 text-gray-500" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* ── Stats Cards (4 cards) ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Refund Pending", value: stats.pendingCount, icon: Clock, bg: "bg-amber-100 dark:bg-amber-900/30", clr: "text-amber-600 dark:text-amber-400" },
                            { label: "Nilai Refund", value: formatRupiah(stats.totalValue), icon: Banknote, bg: "bg-emerald-100 dark:bg-emerald-900/30", clr: "text-emerald-600 dark:text-emerald-400", isStr: true },
                            { label: "Disetujui", value: stats.approvedCount, icon: CheckCircle2, bg: "bg-emerald-100 dark:bg-emerald-900/30", clr: "text-emerald-600 dark:text-emerald-400" },
                            { label: "Ditolak", value: stats.rejectedCount, icon: XCircle, bg: "bg-red-100 dark:bg-red-900/30", clr: "text-red-600 dark:text-red-400" },
                        ].map(c => {
                            const Icon = c.icon;
                            return (
                                <div key={c.label} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                    <div className={`p-3 ${c.bg} rounded-lg flex-shrink-0`}><Icon className={`w-6 h-6 ${c.clr}`} /></div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{c.label}</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? "..." : c.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Table Card ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* Toolbar: Search + Filter */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center border-b border-gray-100 dark:border-gray-700 px-4 py-3 gap-3">
                            {/* Search - Left side, bigger */}
                            <div className="flex items-center gap-2 flex-1">
                                <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow flex-1 max-w-md">
                                    <div className="relative bg-white dark:bg-gray-900 flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Cari nama, alasan refund..."
                                            className="w-full pl-10 pr-3 py-2.5 text-sm bg-transparent border-none focus:outline-none dark:text-white"
                                        />
                                    </div>
                                    <button onClick={handleSearch} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors whitespace-nowrap">Cari</button>
                                </div>

                                {/* Filter Button */}
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
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Filter className="w-5 h-5 text-emerald-500" /> Filter Data Refund</h3>
                                                    <button onClick={() => setFilterOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="p-6 space-y-4">
                                            {/* Status */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Status</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['', 'pending', 'approved', 'rejected'].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setFilter(f => ({ ...f, status: s }))}
                                                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter.status === s
                                                                ? 'bg-emerald-500 text-white border-emerald-500'
                                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                                                            }`}
                                                        >
                                                            {s === '' ? 'Semua' : s === 'pending' ? 'Pending' : s === 'approved' ? 'Disetujui' : 'Ditolak'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Date Range */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Rentang Tanggal</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 mb-1">Dari</p>
                                                        <input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))}
                                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 mb-1">Sampai</p>
                                                        <input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))}
                                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount Range */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><DollarSign className="w-3 h-3" />Nilai Refund (Rp)</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 mb-1">Lebih dari</p>
                                                        <input type="number" placeholder="0" value={filter.amountMin} onChange={e => setFilter(f => ({ ...f, amountMin: e.target.value }))}
                                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 mb-1">Kurang dari</p>
                                                        <input type="number" placeholder="∞" value={filter.amountMax} onChange={e => setFilter(f => ({ ...f, amountMax: e.target.value }))}
                                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
                            </div>
                        </div>

                        {/* Mobile Cards */}
                        <div className="space-y-3 sm:hidden p-4">
                            {loading ? (
                                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="border rounded-lg p-4 space-y-2 animate-pulse"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></div>)}</div>
                            ) : paged.length === 0 ? (
                                <div className="text-center py-8 text-gray-400"><RotateCcw className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p>Tidak ada data refund</p></div>
                            ) : paged.map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => handleRowClick(r.bookingId)}
                                    className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm transition-colors ${r.bookingId ? 'cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10' : ''}`}
                                >
                                    <div className="flex justify-between">
                                        <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">#{r.bookingId || r.id}</span>
                                        {getStatusBadge(r.status)}
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div>User: <button onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/users/manage/${r.userId}`); }} className="font-medium text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">{r.userName || `ID: ${r.userId}`}</button></div>
                                        <div>Guru: <button onClick={(e) => { e.stopPropagation(); if (r.trainerId) router.push(`/${locale}/teachers/manage/${r.trainerId}?from=refund`); }} title={r.trainerId ? "Lihat profil guru" : ""} className={`text-left ${r.trainerId ? 'font-medium text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : 'font-medium text-gray-900 dark:text-white'}`}>{r.trainerName}</button></div>
                                        {r.sessionsInfo && <div>Sesi: <span className="font-medium text-emerald-600 dark:text-emerald-400">{r.sessionsInfo}</span></div>}
                                        {r.refundReason && <div className="text-gray-500 italic">"{r.refundReason}"</div>}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span className="font-bold text-red-600 dark:text-red-400">{formatRupiah(r.refundAmount ?? r.amount)}</span>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"><MoreVertical className="w-4 h-4" /></button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-52">
                                                    <DropdownMenuLabel>Aksi Refund</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {(r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'waiting') && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => openAction(r, 'approve')}><Check className="w-4 h-4 mr-2 text-emerald-600" /><span className="text-emerald-600 font-medium">Setuju</span></DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openAction(r, 'reject')}><X className="w-4 h-4 mr-2 text-red-600" /><span className="text-red-600 font-medium">Tolak</span></DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {(r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'refunded') && (
                                                        <DropdownMenuItem onClick={() => setViewModal({ open: true, item: r })}><CheckCircle2 className="w-4 h-4 mr-2 text-teal-600" /><span>Lihat Catatan</span></DropdownMenuItem>
                                                    )}
                                                    {(r.status?.toLowerCase() === 'rejected' || r.status?.toLowerCase() === 'failed') && (
                                                        <DropdownMenuItem onClick={() => setViewModal({ open: true, item: r })}><XCircle className="w-4 h-4 mr-2 text-red-600" /><span>Lihat Alasan Ditolak</span></DropdownMenuItem>
                                                    )}
                                                    {!['pending', 'waiting', 'pending_refund', 'approved', 'refunded', 'rejected', 'failed'].includes(r.status?.toLowerCase() || '') && <DropdownMenuItem disabled><span className="text-gray-400 text-xs">Tidak ada aksi</span></DropdownMenuItem>}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Kode Pesanan</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Guru</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden xl:table-cell">Sesi</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                                        <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 pr-8">Nilai Refund</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tgl Request</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {loading ? (
                                        <tr><td colSpan={8}>
                                            <div className="space-y-3 py-4 px-6">
                                                {[...Array(3)].map((_, i) => <div key={i} className="flex items-center gap-4 animate-pulse"><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 flex-1" /></div>)}
                                            </div>
                                        </td></tr>
                                    ) : paged.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                                            <RotateCcw className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                            <p>Tidak ada data refund</p>
                                        </td></tr>
                                    ) : paged.map(r => {
                                        return (
                                            <tr
                                                key={r.id}
                                                onClick={() => handleRowClick(r.bookingId)}
                                                className={`transition-colors ${r.bookingId ? 'cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                        #{r.bookingId || r.id}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/users/manage/${r.userId}`); }} className="font-medium text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left">{r.userName || `ID: ${r.userId}`}</button>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <button onClick={(e) => { e.stopPropagation(); if (r.trainerId) router.push(`/${locale}/teachers/manage/${r.trainerId}?from=refund`); }} title={r.trainerId ? "Lihat profil guru" : ""} className={`text-left text-sm ${r.trainerId ? 'font-medium text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : 'font-medium text-gray-900 dark:text-white'}`}>{r.trainerName || `ID: ${r.trainerId}`}</button>
                                                </td>
                                                <td className="px-4 py-3 hidden xl:table-cell">
                                                    <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800 max-w-fit">{r.sessionsInfo || '—'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {getStatusBadge(r.status)}
                                                </td>
                                                <td className="px-4 py-3 text-right pr-8">
                                                    <span className="font-bold text-red-600 dark:text-red-400">{formatRupiah(r.refundAmount ?? r.amount)}</span>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 pb-px">
                                                                {formatDate(r.createdAt, 'relative', tz, locale)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p className="text-xs">{formatDate(r.createdAt, 'long', tz, locale)}</p>
                                                            {r.refundReason && <p className="text-xs text-gray-400 italic mt-1">Alasan: {r.refundReason}</p>}
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
                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuLabel>Aksi Refund</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {(r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'waiting' || r.status?.toLowerCase() === 'pending_refund') && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => openAction(r, 'approve')}><Check className="w-4 h-4 mr-2 text-emerald-600" /><span className="text-emerald-600 font-medium">Setuju</span></DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => openAction(r, 'reject')}><X className="w-4 h-4 mr-2 text-red-600" /><span className="text-red-600 font-medium">Tolak</span></DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {(r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'refunded') && (
                                                                <DropdownMenuItem onClick={() => setViewModal({ open: true, item: r })}><CheckCircle2 className="w-4 h-4 mr-2 text-teal-600" /><span>Lihat Catatan</span></DropdownMenuItem>
                                                            )}
                                                            {(r.status?.toLowerCase() === 'rejected' || r.status?.toLowerCase() === 'failed') && (
                                                                <DropdownMenuItem onClick={() => setViewModal({ open: true, item: r })}><XCircle className="w-4 h-4 mr-2 text-red-600" /><span>Lihat Alasan Ditolak</span></DropdownMenuItem>
                                                            )}
                                                            {!['pending', 'waiting', 'pending_refund', 'approved', 'refunded', 'rejected', 'failed'].includes(r.status?.toLowerCase() || '') && <DropdownMenuItem disabled><span className="text-gray-400 text-xs">Tidak ada aksi</span></DropdownMenuItem>}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <SmartPagination
                            total={filteredRefunds.length}
                            page={page}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                            loading={loading}
                        />
                    </div>

                    {/* ── View Modal ── */}
                    {viewModal.open && viewModal.item && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Detail Catatan</h3>
                                    <button onClick={() => setViewModal({ open: false, item: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {viewModal.item.refundReason && (
                                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/50">
                                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Alasan Refund:</p>
                                            <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{viewModal.item.refundReason}</p>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catatan/Alasan Admin:</p>
                                        <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{viewModal.item.notes || 'Tidak ada catatan.'}</p>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button onClick={() => setViewModal({ open: false, item: null })} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm">Tutup</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Action Modal ── */}
                    {actionModal.open && actionModal.item && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${actionModal.type === 'approve' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                        {actionModal.type === 'approve'
                                            ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            : <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        }
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                            {actionModal.type === 'approve' ? 'Setujui Refund' : 'Tolak Refund'}
                                        </h3>
                                        <p className="text-xs text-gray-500">#{actionModal.item.bookingId || actionModal.item.id} — {actionModal.item.userName}</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className={`p-3 rounded-xl text-sm border space-y-1 ${actionModal.type === 'approve' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'}`}>
                                        <p className="text-gray-500 dark:text-gray-400">User: <span className="font-semibold text-gray-900 dark:text-white">{actionModal.item.userName}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Nilai Refund: <span className="font-bold text-red-600 dark:text-red-400">{formatRupiah(actionModal.item.refundAmount ?? actionModal.item.amount)}</span></p>
                                        {actionModal.item.refundReason && <p className="text-gray-500 dark:text-gray-400 italic text-xs">"{actionModal.item.refundReason}"</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            {actionModal.type === 'reject' ? <>Alasan Penolakan <span className="text-red-500">*</span></> : 'Catatan (Opsional)'}
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            rows={3}
                                            placeholder={actionModal.type === 'reject' ? "Contoh: Alasan refund tidak valid..." : "Catatan tambahan untuk user..."}
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={handleProcessRefund}
                                            disabled={isSubmitting || (actionModal.type === 'reject' && !notes.trim())}
                                            className={`flex-1 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm ${actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                                        >
                                            {isSubmitting ? 'Memproses...' : actionModal.type === 'approve' ? 'Setujui Refund' : 'Tolak Refund'}
                                        </button>
                                        <button
                                            onClick={() => { setActionModal({ open: false, item: null, type: 'approve' }); setNotes(""); }}
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

export default function RefundPage() {
    return (
                <RefundContent />
    )
}
