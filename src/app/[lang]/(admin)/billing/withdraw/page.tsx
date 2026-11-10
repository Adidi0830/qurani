"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import {
    Search, CheckCircle2, XCircle, Clock,
    ArrowDownToLine, RefreshCw, MoreVertical, Check, X, Wallet,
    Banknote, Filter, Calendar, DollarSign, ChevronDown, Eye, FileText
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { SmartPagination } from "@/components/ui/smart-pagination"
import { walletApi } from "@/lib/api"
import {
    getSimWithdrawPending,
    getSimWithdrawHistory,
    approveSimWithdraw,
    rejectSimWithdraw,
    completeSimWithdraw,
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
        if (variant === 'long') {
            options.year = "numeric"; options.hour = "2-digit"; options.minute = "2-digit"
            options.hour12 = false; options.timeZoneName = "short"
        }
        return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', options).format(date)
    } catch { return dateString }
}

interface WithdrawItem {
    id: number | string;
    userId?: number | string;
    user?: { name?: string; email?: string; username?: string; avatar?: string };
    amount: number;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    status: string;
    notes?: string;
    externalTransactionId?: string;
    gatewayReference?: string;
    createdAt: string;
    updatedAt?: string;
}

interface FilterState {
    status: string;
    target: string;
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
}

function getWithdrawStatusBadge(status: string) {
    const s = (status || "").toLowerCase();
    if (s === "completed")
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"><CheckCircle2 className="w-3 h-3" />Selesai</span>;
    if (s === "approved")
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><Check className="w-3 h-3" />Disetujui</span>;
    if (s === "rejected" || s === "failed")
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Ditolak</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
}

type ModalType = 'approve' | 'reject' | 'complete' | null;

const modalTitleMap: Record<string, string> = {
    approve: 'Setujui Permintaan Withdraw',
    complete: 'Tandai Withdraw Selesai Ditransfer',
    reject: 'Tolak Permintaan Withdraw',
};

function WithdrawContent() {
    const { t, locale } = useTranslation(['billing', 'common'])
    const { profile } = useAuth()
    const router = useRouter();

    const resolveTimezone = useCallback(() => {
        const isValid = (tz: string) => { try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date()); return true; } catch { return false; } }
        let cached = ""; try { const raw = localStorage.getItem('myqurani_user_profile_v2'); if (raw) { cached = JSON.parse(raw)?.timezone || ""; } } catch { }
        const fromProfile = String(profile?.timezone || "").trim();
        const preferred = cached || fromProfile;
        if (preferred && isValid(preferred)) return preferred;
        if (fromProfile && isValid(fromProfile)) return fromProfile;
        try { const btz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (btz && isValid(btz)) return btz; } catch { }
        return "UTC";
    }, [profile?.timezone]);

    const [tz, setTz] = useState("UTC");
    useEffect(() => { setTz(resolveTimezone()); }, [resolveTimezone]);

    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [allWithdraws, setAllWithdraws] = useState<WithdrawItem[]>([]);

    const [search, setSearch] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filter state
    const [filterOpen, setFilterOpen] = useState(false);
    const [filter, setFilter] = useState<FilterState>({ status: '', target: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
    const [activeFilter, setActiveFilter] = useState<FilterState>({ status: '', target: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
    const filterRef = useRef<HTMLDivElement>(null);

    const [stats, setStats] = useState({ pendingCount: 0, pendingTotal: 0, approvedCount: 0, rejectedCount: 0 });

    // Action modal
    const [actionModal, setActionModal] = useState<{ open: boolean; item: WithdrawItem | null; type: ModalType }>({ open: false, item: null, type: null });
    // View detail / reason modal
    const [viewModal, setViewModal] = useState<{ open: boolean; item: WithdrawItem | null; mode: 'detail' | 'reason' }>({ open: false, item: null, mode: 'detail' });
    const [modalInput, setModalInput] = useState({ reason: "", extId: "", ref: "" });
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
                if (viewModal.open) setViewModal({ open: false, item: null, mode: 'detail' });
                if (actionModal.open) setActionModal({ open: false, item: null, type: null });
                if (filterOpen) setFilterOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [viewModal.open, actionModal.open, filterOpen]);

    // ── Fetch all withdraw data ───────────────────────────────────────────────
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [pendingRes, historyRes] = await Promise.allSettled([
                walletApi.getPendingWithdraws({ page: 1, pageSize: 100 } as any),
                walletApi.getWithdrawHistory({ page: 1, pageSize: 100 } as any),
            ]);

            let pendingItems: WithdrawItem[] = [];
            let historyItems: WithdrawItem[] = [];

            if (pendingRes.status === 'fulfilled') {
                const res = pendingRes.value;
                pendingItems = Array.isArray(res) ? res : (res?.data || res?.items || []);
            }
            if (historyRes.status === 'fulfilled') {
                const res = historyRes.value;
                historyItems = Array.isArray(res) ? res : (res?.data || res?.items || []);
            }

            let combined = [...pendingItems, ...historyItems];
            if (combined.length === 0) {
                combined = [...getSimWithdrawPending(), ...getSimWithdrawHistory()];
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }

            setAllWithdraws(combined);
            setStats({
                pendingCount: combined.filter(w => (w.status || '').toLowerCase() === 'pending').length,
                pendingTotal: combined.filter(w => (w.status || '').toLowerCase() === 'pending').reduce((a, b) => a + b.amount, 0),
                approvedCount: combined.filter(w => ['approved', 'completed'].includes((w.status || '').toLowerCase())).length,
                rejectedCount: combined.filter(w => ['rejected', 'failed'].includes((w.status || '').toLowerCase())).length,
            });
        } catch {
            const combined = [...getSimWithdrawPending(), ...getSimWithdrawHistory()];
            setAllWithdraws(combined);
            setIsDemoMode(true);
            setStats({
                pendingCount: combined.filter(w => (w.status || '').toLowerCase() === 'pending').length,
                pendingTotal: combined.filter(w => (w.status || '').toLowerCase() === 'pending').reduce((a, b) => a + b.amount, 0),
                approvedCount: combined.filter(w => ['approved', 'completed'].includes((w.status || '').toLowerCase())).length,
                rejectedCount: combined.filter(w => ['rejected', 'failed'].includes((w.status || '').toLowerCase())).length,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const handleSearch = () => { setActiveSearch(search); setPage(1); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };

    // Client-side filter + search
    const filteredWithdraws = allWithdraws.filter(w => {
        if (activeSearch) {
            const q = activeSearch.toLowerCase();
            if (!(w.user?.name?.toLowerCase().includes(q) || w.bankName?.toLowerCase().includes(q) || w.accountNumber?.includes(q) || String(w.id).includes(q) || w.accountName?.toLowerCase().includes(q))) return false;
        }
        if (activeFilter.status) {
            const s = (w.status || '').toLowerCase();
            if (activeFilter.status === 'pending' && s !== 'pending') return false;
            if (activeFilter.status === 'approved' && !['approved', 'completed'].includes(s)) return false;
            if (activeFilter.status === 'rejected' && !['rejected', 'failed'].includes(s)) return false;
        }
        if (activeFilter.target) {
            const targetQ = activeFilter.target.toLowerCase();
            if (!((w.bankName || '').toLowerCase().includes(targetQ) || (w.accountNumber || '').toLowerCase().includes(targetQ))) return false;
        }
        if (activeFilter.dateFrom && w.createdAt && new Date(w.createdAt) < new Date(activeFilter.dateFrom)) return false;
        if (activeFilter.dateTo && w.createdAt) {
            const to = new Date(activeFilter.dateTo); to.setHours(23, 59, 59);
            if (new Date(w.createdAt) > to) return false;
        }
        if (activeFilter.amountMin && w.amount < Number(activeFilter.amountMin)) return false;
        if (activeFilter.amountMax && w.amount > Number(activeFilter.amountMax)) return false;
        return true;
    });

    const paged = filteredWithdraws.slice((page - 1) * pageSize, page * pageSize);
    const hasActiveFilter = activeFilter.status || activeFilter.target || activeFilter.dateFrom || activeFilter.dateTo || activeFilter.amountMin || activeFilter.amountMax;

    const applyFilter = () => { setActiveFilter({ ...filter }); setPage(1); setFilterOpen(false); };
    const resetFilter = () => {
        const empty = { status: '', target: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };
        setFilter(empty); setActiveFilter(empty); setPage(1); setFilterOpen(false);
    };

    const openModal = (item: WithdrawItem, type: ModalType) => {
        setActionModal({ open: true, item, type });
        setModalInput({ reason: "", extId: "", ref: "" });
    };

    const executeAction = async () => {
        if (!actionModal.item || !actionModal.type) return;
        const { id: wId } = actionModal.item;

        if (actionModal.type === 'reject' && !modalInput.reason.trim()) {
            showToast({ type: 'error', title: 'Alasan wajib diisi', message: 'Harap isi alasan penolakan.' });
            return;
        }

        setIsSubmitting(true);
        try {
            if (actionModal.type === 'approve') {
                await walletApi.approveWithdraw(wId);
                showToast({ type: 'success', title: 'Withdraw Disetujui', message: 'Penarikan dana berhasil disetujui.' });
            } else if (actionModal.type === 'reject') {
                await walletApi.rejectWithdraw(wId, modalInput.reason.trim());
                showToast({ type: 'info', title: 'Withdraw Ditolak', message: 'Penarikan dana berhasil ditolak.' });
            } else if (actionModal.type === 'complete') {
                await walletApi.completeWithdraw(
                    wId,
                    modalInput.extId.trim() || null,
                    modalInput.ref.trim() || null
                );
                showToast({ type: 'success', title: 'Withdraw Selesai', message: 'Status berhasil diperbarui ke selesai.' });
            }
            setActionModal({ open: false, item: null, type: null });
            fetchAllData();
        } catch {
            if (actionModal.type === 'approve') {
                approveSimWithdraw(wId);
                showToast({ type: 'info', title: '[DEMO] Withdraw Disetujui', message: 'Status diubah ke approved (simulasi lokal).' });
            } else if (actionModal.type === 'reject') {
                rejectSimWithdraw(wId, modalInput.reason.trim());
                showToast({ type: 'info', title: '[DEMO] Withdraw Ditolak', message: 'Status diubah ke rejected (simulasi lokal).' });
            } else if (actionModal.type === 'complete') {
                completeSimWithdraw(wId, modalInput.extId.trim() || undefined, modalInput.ref.trim() || undefined);
                showToast({ type: 'info', title: '[DEMO] Withdraw Selesai', message: 'Status diubah ke completed (simulasi lokal).' });
            }
            setActionModal({ open: false, item: null, type: null });
            fetchAllData();
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ArrowDownToLine className="w-6 h-6 text-emerald-500" />
                            Withdraw
                        </h1>
                        <button onClick={fetchAllData} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                            Refresh
                        </button>
                    </div>

                    {/* ── Overview Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Withdraw Pending", value: stats.pendingCount, icon: Clock, bg: "bg-amber-100 dark:bg-amber-900/30", iconClr: "text-amber-600 dark:text-amber-400" },
                            { label: "Nilai Withdraw", value: formatRupiah(stats.pendingTotal), icon: Banknote, bg: "bg-emerald-100 dark:bg-emerald-900/30", iconClr: "text-emerald-600 dark:text-emerald-400", isStr: true },
                            { label: "Disetujui", value: stats.approvedCount, icon: CheckCircle2, bg: "bg-emerald-100 dark:bg-emerald-900/30", iconClr: "text-emerald-600 dark:text-emerald-400" },
                            { label: "Ditolak", value: stats.rejectedCount, icon: XCircle, bg: "bg-red-100 dark:bg-red-900/30", iconClr: "text-red-600 dark:text-red-400" },
                        ].map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                    <div className={`p-3 ${card.bg} rounded-lg flex-shrink-0`}>
                                        <Icon className={`w-6 h-6 ${card.iconClr}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? "..." : card.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Table Card ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center border-b border-gray-100 dark:border-gray-700 px-4 py-3 gap-3">
                            <div className="flex items-center gap-2 flex-1">
                                {/* Search */}
                                <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow flex-1 max-w-md">
                                    <div className="relative bg-white dark:bg-gray-900 flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKeyDown} placeholder="Cari user, bank, no. rekening..." className="w-full pl-10 pr-3 py-2.5 text-sm bg-transparent border-none focus:outline-none dark:text-white" />
                                    </div>
                                    <button onClick={handleSearch} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors whitespace-nowrap">Cari</button>
                                </div>

                                {/* Filter Dropdown */}
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
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Filter className="w-5 h-5 text-emerald-500" /> Filter Data Withdraw</h3>
                                                    <button onClick={() => setFilterOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="p-6 space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Status</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['', 'pending', 'approved', 'rejected'].map(s => (
                                                        <button key={s} onClick={() => setFilter(f => ({ ...f, status: s }))}
                                                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter.status === s ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300'}`}>
                                                            {s === '' ? 'Semua' : s === 'pending' ? 'Pending' : s === 'approved' ? 'Disetujui' : 'Ditolak'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Tujuan (Bank / No. Rek)</label>
                                                <input type="text" placeholder="Contoh: BCA, Mandiri, 12345..." value={filter.target} onChange={e => setFilter(f => ({ ...f, target: e.target.value }))}
                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Rentang Tanggal</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><p className="text-[10px] text-gray-400 mb-1">Dari</p><input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                                                    <div><p className="text-[10px] text-gray-400 mb-1">Sampai</p><input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><DollarSign className="w-3 h-3" />Nominal (Rp)</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><p className="text-[10px] text-gray-400 mb-1">Lebih dari</p><input type="number" placeholder="0" value={filter.amountMin} onChange={e => setFilter(f => ({ ...f, amountMin: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                                                    <div><p className="text-[10px] text-gray-400 mb-1">Kurang dari</p><input type="number" placeholder="∞" value={filter.amountMax} onChange={e => setFilter(f => ({ ...f, amountMax: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
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
                            {/* No "N data" counter */}
                        </div>

                        {/* Mobile Cards */}
                        <div className="space-y-3 sm:hidden p-4">
                            {loading ? (
                                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 animate-pulse"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></div>)}</div>
                            ) : paged.length === 0 ? (
                                <div className="text-center py-8 text-gray-400"><ArrowDownToLine className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" /><p>Tidak ada data withdraw</p></div>
                            ) : paged.map(w => {
                                const s = (w.status || '').toLowerCase();
                                return (
                                    <div key={w.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-800 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">#{w.id}</span>
                                            <div className="flex items-center gap-2">
                                                {getWithdrawStatusBadge(w.status)}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"><MoreVertical className="w-4 h-4" /></button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-52">
                                                        <DropdownMenuLabel>Aksi Withdraw</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {s === 'pending' && <>
                                                            <DropdownMenuItem onClick={() => openModal(w, 'approve')}><Check className="w-4 h-4 mr-2 text-emerald-600" /><span className="text-emerald-600 font-medium">Approve</span></DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openModal(w, 'reject')}><X className="w-4 h-4 mr-2 text-red-600" /><span className="text-red-600 font-medium">Tolak</span></DropdownMenuItem>
                                                        </>}
                                                        {s === 'approved' && <DropdownMenuItem onClick={() => openModal(w, 'complete')}><CheckCircle2 className="w-4 h-4 mr-2 text-teal-600" /><span className="text-teal-600 font-medium">Tandai Selesai</span></DropdownMenuItem>}
                                                        {s === 'completed' && <DropdownMenuItem onClick={() => setViewModal({ open: true, item: w, mode: 'detail' })}><FileText className="w-4 h-4 mr-2 text-blue-600" /><span>Lihat Detail Transfer</span></DropdownMenuItem>}
                                                        {(s === 'rejected' || s === 'failed') && <DropdownMenuItem onClick={() => setViewModal({ open: true, item: w, mode: 'reason' })}><Eye className="w-4 h-4 mr-2 text-red-600" /><span>Lihat Alasan Ditolak</span></DropdownMenuItem>}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-0.5">
                                            <button onClick={() => { router.push(`/${locale}/users/manage/${w.userId || w.id}`); }} className="font-bold text-gray-800 dark:text-gray-200 hover:text-emerald-600 hover:underline">{w.user?.name || `User ID: ${w.userId}`}</button>
                                            <div>{w.bankName ? `${w.bankName} • ${w.accountNumber}` : '—'}</div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatRupiah(w.amount)}</span>
                                            <span className="text-xs text-gray-500">{formatDate(w.createdAt, 'relative', tz, locale)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">ID</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Tujuan</th>
                                        <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 pr-8">Nominal</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tgl Request</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {loading ? (
                                        <tr><td colSpan={7}><div className="space-y-3 py-4 px-6">{[...Array(4)].map((_, i) => <div key={i} className="flex items-center gap-4 animate-pulse"><Skeleton className="h-3 w-[80px]" /><Skeleton className="h-3 w-[120px]" /><Skeleton className="h-3 w-[100px]" /><Skeleton className="h-3 w-[80px]" /><Skeleton className="h-3 w-[90px]" /></div>)}</div></td></tr>
                                    ) : paged.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-gray-400"><ArrowDownToLine className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" /><p>Tidak ada data withdraw</p></td></tr>
                                    ) : paged.map(w => {
                                        const s = (w.status || '').toLowerCase();
                                        const userUsername = w.user?.username ? `@${w.user.username}` : w.user?.email ? `@${w.user.email.split('@')[0]}` : null;
                                        return (
                                            <tr key={w.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">#{w.id}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <button onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/users/manage/${w.userId || w.id}`); }} className="font-bold text-gray-900 dark:text-white text-sm leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left">{w.user?.name || `User ID: ${w.userId}`}</button>
                                                        {userUsername && <p className="text-[11px] text-gray-400">{userUsername}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <div className="text-xs font-bold text-gray-900 dark:text-white">{w.bankName || '—'}</div>
                                                    <div className="text-[11px] font-mono text-gray-500">{w.accountNumber || ''}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase">{w.accountName || ''}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right pr-8">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(w.amount)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">{getWithdrawStatusBadge(w.status)}</td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px">
                                                                {formatDate(w.createdAt, 'relative', tz, locale)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top"><p className="text-xs">{formatDate(w.createdAt, 'long', tz, locale)}</p></TooltipContent>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuLabel>Aksi Withdraw</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {s === 'pending' && <>
                                                                <DropdownMenuItem onClick={() => openModal(w, 'approve')}><Check className="w-4 h-4 mr-2 text-emerald-600" /><span className="text-emerald-600 font-medium">Approve</span></DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openModal(w, 'reject')}><X className="w-4 h-4 mr-2 text-red-600" /><span className="text-red-600 font-medium">Tolak</span></DropdownMenuItem>
                                                            </>}
                                                            {s === 'approved' && <DropdownMenuItem onClick={() => openModal(w, 'complete')}><CheckCircle2 className="w-4 h-4 mr-2 text-teal-600" /><span className="text-teal-600 font-medium">Tandai Selesai</span></DropdownMenuItem>}
                                                            {s === 'completed' && <DropdownMenuItem onClick={() => setViewModal({ open: true, item: w, mode: 'detail' })}><FileText className="w-4 h-4 mr-2 text-blue-600" /><span>Lihat Detail Transfer</span></DropdownMenuItem>}
                                                            {(s === 'rejected' || s === 'failed') && <DropdownMenuItem onClick={() => setViewModal({ open: true, item: w, mode: 'reason' })}><Eye className="w-4 h-4 mr-2 text-red-600" /><span>Lihat Alasan Ditolak</span></DropdownMenuItem>}
                                                            {!['pending', 'approved', 'completed', 'rejected', 'failed'].includes(s) && <DropdownMenuItem disabled><span className="text-gray-400 text-xs">Tidak ada aksi</span></DropdownMenuItem>}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <SmartPagination total={filteredWithdraws.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} loading={loading} />
                    </div>

                    {/* ── View Modal (Detail / Reason) ── */}
                    {viewModal.open && viewModal.item && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        {viewModal.mode === 'reason' ? 'Alasan Ditolak' : 'Detail Transfer'}
                                    </h3>
                                    <button onClick={() => setViewModal({ open: false, item: null, mode: 'detail' })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {viewModal.mode === 'reason' ? (
                                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-800">
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Catatan / Alasan Penolakan:</p>
                                            <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{viewModal.item.notes || 'Tidak ada catatan.'}</p>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 space-y-2">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Detail Transfer:</p>
                                            <div className="text-sm text-gray-900 dark:text-white space-y-1">
                                                <div className="flex justify-between"><span className="text-gray-500">Nominal:</span><span className="font-bold text-emerald-600">{formatRupiah(viewModal.item.amount)}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Bank Tujuan:</span><span className="font-semibold">{viewModal.item.bankName || '—'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">No. Rekening:</span><span className="font-mono">{viewModal.item.accountNumber || '—'}</span></div>
                                                {viewModal.item.externalTransactionId && <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="font-mono text-xs">{viewModal.item.externalTransactionId}</span></div>}
                                                {viewModal.item.gatewayReference && <div className="flex justify-between"><span className="text-gray-500">Gateway Ref:</span><span className="font-mono text-xs">{viewModal.item.gatewayReference}</span></div>}
                                                {viewModal.item.notes && <div className="flex justify-between"><span className="text-gray-500">Catatan:</span><span>{viewModal.item.notes}</span></div>}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end pt-2">
                                        <button onClick={() => setViewModal({ open: false, item: null, mode: 'detail' })} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm">Tutup</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Action Modal ── */}
                    {actionModal.open && actionModal.item && actionModal.type && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${actionModal.type === 'reject' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                                        {actionModal.type === 'approve' && <Check className="w-5 h-5 text-emerald-600" />}
                                        {actionModal.type === 'complete' && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                                        {actionModal.type === 'reject' && <X className="w-5 h-5 text-red-600" />}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{modalTitleMap[actionModal.type]}</h3>
                                        <p className="text-xs text-gray-500">#{actionModal.item.id} — {actionModal.item.user?.name}</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className={`p-3 rounded-xl text-sm border space-y-1 ${actionModal.type === 'reject' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50'}`}>
                                        <p className="text-gray-500 dark:text-gray-400">User: <span className="font-semibold text-gray-900 dark:text-white">{actionModal.item.user?.name}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Nominal: <span className="font-bold text-emerald-600">{formatRupiah(actionModal.item.amount)}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Bank: <span className="font-semibold text-gray-900 dark:text-white">{actionModal.item.bankName} — {actionModal.item.accountNumber}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400 uppercase text-[11px]">{actionModal.item.accountName}</p>
                                    </div>

                                    {actionModal.type === 'reject' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Alasan Penolakan <span className="text-red-500">*</span></label>
                                            <textarea value={modalInput.reason} onChange={e => setModalInput(p => ({ ...p, reason: e.target.value }))} rows={3} placeholder="Contoh: Rekening tidak valid..."
                                                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white resize-none" />
                                        </div>
                                    )}

                                    {actionModal.type === 'complete' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">External Transaction ID <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                                <input type="text" value={modalInput.extId} onChange={e => setModalInput(p => ({ ...p, extId: e.target.value }))} placeholder="ID transaksi dari bank/gateway..."
                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Gateway Reference <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                                <input type="text" value={modalInput.ref} onChange={e => setModalInput(p => ({ ...p, ref: e.target.value }))} placeholder="Referensi gateway..."
                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" />
                                            </div>
                                        </>
                                    )}

                                    {actionModal.type === 'approve' && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 text-sm">
                                            Pastikan Anda telah memverifikasi data rekening sebelum menyetujui penarikan ini.
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-1">
                                        <button onClick={executeAction} disabled={isSubmitting || (actionModal.type === 'reject' && !modalInput.reason.trim())}
                                            className={`flex-1 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm ${actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                            {isSubmitting ? 'Memproses...' : 'Konfirmasi'}
                                        </button>
                                        <button onClick={() => setActionModal({ open: false, item: null, type: null })} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold transition-colors text-sm">Batal</button>
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

export default function WithdrawPage() {
    return (
                <WithdrawContent />
    )
}
