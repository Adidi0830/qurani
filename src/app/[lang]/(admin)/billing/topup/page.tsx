"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
    Wallet,
    TrendingUp,
    Clock,
    Search,
    CheckCircle,
    XCircle,
    Check,
    X,
    MoreVertical,
    Banknote,
    Users,
    Activity,
    CreditCard,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ArrowDownToLine,
    RefreshCw,
    Eye,
    Filter,
    Calendar,
    DollarSign,
    ChevronDown,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/components/providers/i18n-provider"
import { walletApi } from "@/lib/api"
import { formatTooltipDate } from "@/lib/date-utils"
import { showToast, ToastContainer } from "@/components/ui/toast-sim"
import { SmartPagination } from "@/components/ui/smart-pagination"
import {
    getSimPendingTopups,
    getSimTopupHistory,
    getSimWalletStats,
    confirmSimTopup,
    rejectSimTopup
} from "@/lib/sim-wallet-store"


// ─── Types ────────────────────────────────────────────────────────────────────

interface UserInfo {
    id: number | string;
    name: string;
    email: string;
    username?: string;
}

interface PendingTopup {
    id: number | string;
    userId: number | string;
    user?: UserInfo;
    amount: number;
    status: string;
    paymentMethod?: string;
    createdAt: string;
    externalReference?: string | null;
}

interface TopupHistory {
    id: number | string;
    userId?: number | string;
    user?: UserInfo;
    amount?: number;
    status?: string;
    paymentMethod?: string;
    createdAt?: string;
    externalReference?: string | null;
    rejectionReason?: string;
}

interface FilterState {
    status: string;
    paymentMethod: string;
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function timeAgo(dateStr: string, t: any): { relative: string; full: string } {
    if (!dateStr) return { relative: "-", full: "-" };
    let normalized = dateStr.trim();
    if (normalized.includes(" ") && !normalized.includes("T")) normalized = normalized.replace(" ", "T");
    if (!normalized.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(normalized)) normalized += "Z";
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return { relative: "-", full: "-" };
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    let relative: string;
    if (diffSec < 60) relative = t("common.timeAgo.justNow", "Baru saja");
    else if (diffMin < 60) relative = t("common.timeAgo.minutesAgo", "{minutes} menit lalu").replace("{minutes}", String(diffMin));
    else if (diffHour < 24) relative = t("common.timeAgo.hoursAgo", "{hours} jam lalu").replace("{hours}", String(diffHour));
    else if (diffDay === 1) relative = t("common.timeAgo.yesterday", "Kemarin");
    else if (diffDay < 7) relative = t("common.timeAgo.daysAgo", "{days} hari lalu").replace("{days}", String(diffDay));
    else if (diffWeek < 5) relative = t("common.timeAgo.weeksAgo", "{weeks} minggu lalu").replace("{weeks}", String(diffWeek));
    else if (diffMonth < 12) relative = t("common.timeAgo.monthsAgo", "{months} bulan lalu").replace("{months}", String(diffMonth));
    else relative = t("common.timeAgo.yearsAgo", "{years} tahun lalu").replace("{years}", String(diffYear));

    return { relative, full: "" };
}

function getStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase();
    if (s === "success" || s === "completed" || s === "approved" || s === "confirmed") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle className="w-3 h-3" />Disetujui</span>;
    }
    if (s === "pending" || s === "waiting") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Ditolak</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status || "—"}</span>;
}

// ─── Components ───────────────────────────────────────────────────────────────

function WalletPageContent() {
    const { t } = useI18n();
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang || "en";
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Combined all topup data
    const [allTopups, setAllTopups] = useState<(PendingTopup | TopupHistory)[]>([]);

    // Search states
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    // Filter state
    const [filterOpen, setFilterOpen] = useState(false);
    const [filter, setFilter] = useState<FilterState>({ status: '', paymentMethod: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
    const [activeFilter, setActiveFilter] = useState<FilterState>({ status: '', paymentMethod: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
    const filterRef = useRef<HTMLDivElement>(null);

    // Modal states
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'confirm_topup' | 'reject_topup' | null;
        item: any;
    }>({ isOpen: false, type: null, item: null });

    const [modalInput, setModalInput] = useState({ reason: "", extId: "", ref: "" });

    // Rejection reason modal
    const [rejectionModal, setRejectionModal] = useState<{
        isOpen: boolean;
        reason: string;
        userName: string;
        amount: number;
    }>({ isOpen: false, reason: "", userName: "", amount: 0 });

    const [isDemoMode, setIsDemoMode] = useState(false);

    // Filter click outside handled by modal backdrop

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (rejectionModal.isOpen) setRejectionModal(prev => ({ ...prev, isOpen: false }));
                if (actionModal.isOpen) setActionModal({ isOpen: false, type: null, item: null });
                if (filterOpen) setFilterOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [rejectionModal.isOpen, actionModal.isOpen, filterOpen]);

    // ── Fetch all topup data (pending + history combined) ─────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, pendingRes, historyRes] = await Promise.allSettled([
                walletApi.getStatisticsOverview(),
                walletApi.getPendingTopups(),
                walletApi.getTopupHistory({ page: 1, pageSize: 200 }),
            ]);

            let fetchedStats = null;
            let pendingTopups: any[] = [];
            let historyTopups: any[] = [];

            if (statsRes.status === 'fulfilled' && statsRes.value) {
                fetchedStats = statsRes.value.data || statsRes.value;
            }
            if (pendingRes.status === 'fulfilled' && pendingRes.value) {
                pendingTopups = pendingRes.value.data || pendingRes.value;
                if (!Array.isArray(pendingTopups)) pendingTopups = [];
            }
            if (historyRes.status === 'fulfilled' && historyRes.value) {
                const data = historyRes.value?.data || historyRes.value;
                historyTopups = Array.isArray(data) ? data : (data?.items || data?.data || []);
            }

            if (!fetchedStats) {
                fetchedStats = getSimWalletStats();
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }

            let combined = [...pendingTopups, ...historyTopups];
            if (combined.length === 0) {
                const simPending = getSimPendingTopups();
                const simHistory = getSimTopupHistory();
                combined = [...simPending, ...simHistory];
                setIsDemoMode(true);
            }

            setStats(fetchedStats);
            setAllTopups(combined);
        } catch (error) {
            const simPending = getSimPendingTopups();
            const simHistory = getSimTopupHistory();
            setStats(getSimWalletStats());
            setAllTopups([...simPending, ...simHistory]);
            setIsDemoMode(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSearch = () => { setActiveSearch(searchInput); setPage(1); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    // Apply filters + search
    const filteredTopups = allTopups.filter(item => {
        const topup = item as any;
        // Search
        if (activeSearch) {
            const q = activeSearch.toLowerCase();
            if (!(topup.user?.name?.toLowerCase().includes(q) || String(topup.id).includes(q) || topup.paymentMethod?.toLowerCase().includes(q))) return false;
        }
        // Status
        if (activeFilter.status) {
            const s = (topup.status || '').toLowerCase();
            if (activeFilter.status === 'pending' && !['pending', 'waiting'].includes(s)) return false;
            if (activeFilter.status === 'approved' && !['success', 'completed', 'approved', 'confirmed'].includes(s)) return false;
            if (activeFilter.status === 'rejected' && !['failed', 'rejected', 'cancelled'].includes(s)) return false;
        }
        // Payment method
        if (activeFilter.paymentMethod) {
            const m = (topup.paymentMethod || '').toLowerCase();
            if (!m.includes(activeFilter.paymentMethod.toLowerCase())) return false;
        }
        // Date from
        if (activeFilter.dateFrom && topup.createdAt) {
            if (new Date(topup.createdAt) < new Date(activeFilter.dateFrom)) return false;
        }
        // Date to
        if (activeFilter.dateTo && topup.createdAt) {
            const to = new Date(activeFilter.dateTo); to.setHours(23, 59, 59);
            if (new Date(topup.createdAt) > to) return false;
        }
        // Amount min
        if (activeFilter.amountMin && topup.amount !== undefined) {
            if (topup.amount < Number(activeFilter.amountMin)) return false;
        }
        // Amount max
        if (activeFilter.amountMax && topup.amount !== undefined) {
            if (topup.amount > Number(activeFilter.amountMax)) return false;
        }
        return true;
    });

    const pagedTopups = filteredTopups.slice((page - 1) * pageSize, page * pageSize);

    const hasActiveFilter = activeFilter.status || activeFilter.paymentMethod || activeFilter.dateFrom || activeFilter.dateTo || activeFilter.amountMin || activeFilter.amountMax;

    const applyFilter = () => { setActiveFilter({ ...filter }); setPage(1); setFilterOpen(false); };
    const resetFilter = () => {
        const empty = { status: '', paymentMethod: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };
        setFilter(empty); setActiveFilter(empty); setPage(1); setFilterOpen(false);
    };

    const executeAction = async () => {
        const { type, item } = actionModal;
        if (!type || !item) return;

        if (isDemoMode) {
            if (type === 'confirm_topup') {
                confirmSimTopup(item.id, modalInput.ref);
                showToast({ type: 'success', title: '[DEMO] Topup Dikonfirmasi', message: `Saldo ${item.user?.name || 'User'} +${formatCurrency(item.amount)} (simulasi)` });
            } else if (type === 'reject_topup') {
                if (!modalInput.reason.trim()) {
                    showToast({ type: 'error', title: 'Alasan wajib diisi', message: 'Harap isi alasan penolakan topup.' });
                    return;
                }
                rejectSimTopup(item.id, modalInput.reason.trim());
                showToast({ type: 'info', title: '[DEMO] Topup Ditolak', message: `Permintaan topup ${item.user?.name || 'User'} ditolak (simulasi)` });
            }
            fetchData();
            setActionModal({ isOpen: false, type: null, item: null });
            setModalInput({ reason: "", extId: "", ref: "" });
            return;
        }

        try {
            if (type === 'confirm_topup') {
                await walletApi.confirmTopup(item.id, modalInput.ref);
                showToast({ type: 'success', title: 'Topup Dikonfirmasi', message: `Saldo ${item.user?.name || 'User'} berhasil ditambahkan.` });
            } else if (type === 'reject_topup') {
                if (!modalInput.reason.trim()) {
                    showToast({ type: 'error', title: 'Alasan wajib diisi', message: 'Harap isi alasan penolakan topup.' });
                    return;
                }
                await walletApi.rejectTopup(item.id, modalInput.reason.trim());
                showToast({ type: 'info', title: 'Topup Ditolak', message: `Permintaan topup ${item.user?.name || 'User'} telah ditolak.` });
            }
            fetchData();
            setActionModal({ isOpen: false, type: null, item: null });
            setModalInput({ reason: "", extId: "", ref: "" });
        } catch (error: any) {
            showToast({ type: 'error', title: 'Gagal Melakukan Aksi', message: error.message || 'Terjadi kesalahan. Coba lagi.' });
        }
    };

    const openModal = (type: typeof actionModal.type, item: any) => {
        setActionModal({ isOpen: true, type, item });
        setModalInput({ reason: "", extId: "", ref: "" });
    };

    // Compute stats for cards
    const pendingCount = allTopups.filter(t => ['pending', 'waiting'].includes(((t as any).status || '').toLowerCase())).length;
    const approvedCount = allTopups.filter(t => ['success', 'completed', 'approved', 'confirmed'].includes(((t as any).status || '').toLowerCase())).length;
    const rejectedCount = allTopups.filter(t => ['failed', 'rejected', 'cancelled'].includes(((t as any).status || '').toLowerCase())).length;

    const WALLET_STATS = [
        {
            title: t("billing.wallet.stats.pendingTopup", "Topup Pending"),
            value: pendingCount,
            isCurrency: false,
            icon: Clock,
            bgColor: "bg-amber-50 dark:bg-amber-900/20",
            iconColor: "text-amber-500"
        },
        {
            title: "Disetujui",
            value: approvedCount,
            isCurrency: false,
            icon: CheckCircle,
            bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
            iconColor: "text-emerald-500"
        },
        {
            title: "Ditolak",
            value: rejectedCount,
            isCurrency: false,
            icon: XCircle,
            bgColor: "bg-red-50 dark:bg-red-900/20",
            iconColor: "text-red-500"
        }
    ];

    // Collect unique payment methods for filter
    const paymentMethods = Array.from(new Set(allTopups.map(t => (t as any).paymentMethod).filter(Boolean)));

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
            <ToastContainer />
            <div className="max-w-[1400px] mx-auto space-y-8">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ArrowDownToLine className="w-6 h-6 text-emerald-500" />
                            TopUp
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ── Stats Cards (6 cards) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {WALLET_STATS.map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">{stat.title}</span>
                                        <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                                            <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {loading ? "..." : (stat.isCurrency ? formatCurrency(stat.value) : stat.value)}
                                    </h3>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Table Section ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">

                    {/* Toolbar: Search + Filter */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center border-b border-gray-100 dark:border-gray-700 px-4 py-3 gap-3">
                        <div className="flex items-center gap-2 flex-1">
                            {/* Search - bigger */}
                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow flex-1 max-w-md">
                                <div className="relative bg-white dark:bg-gray-900 flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Cari nama, metode pembayaran..."
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
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Filter className="w-5 h-5 text-emerald-500" /> Filter Data Topup</h3>
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

                                        {/* Payment Method */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Metode Pembayaran</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: GoPay, BCA, Transfer..."
                                                value={filter.paymentMethod}
                                                onChange={e => setFilter(f => ({ ...f, paymentMethod: e.target.value }))}
                                                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
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
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><DollarSign className="w-3 h-3" />Nominal (Rp)</label>
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

                    {/* Mobile Card View */}
                    <div className="space-y-3 sm:hidden p-4">
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 animate-pulse">
                                        <div className="flex justify-between items-start"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                                        <div className="grid grid-cols-2 gap-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /></div>
                                    </div>
                                ))}
                            </div>
                        ) : pagedTopups.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Tidak ada data topup.</div>
                        ) : (
                            pagedTopups.map((item: any) => (
                                <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                            #{item.id}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(item.status)}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Aksi Topup</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {['pending', 'waiting'].includes((item.status || '').toLowerCase()) && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => openModal('confirm_topup', item)}>
                                                                <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                                <span>Confirm Topup</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openModal('reject_topup', item)}>
                                                                <X className="w-4 h-4 mr-2 text-red-600" />
                                                                <span className="text-red-600">Reject Topup</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {['success', 'completed', 'approved', 'confirmed'].includes((item.status || '').toLowerCase()) && (
                                                        <DropdownMenuItem onClick={() => setRejectionModal({ isOpen: true, reason: item.rejectionReason || 'Tidak ada catatan.', userName: item.user?.name || `User #${item.userId}`, amount: item.amount || 0 })}>
                                                            <Eye className="w-4 h-4 mr-2 text-blue-600" />
                                                            <span>Lihat Detail Penerimaan</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {['failed', 'rejected', 'cancelled'].includes((item.status || '').toLowerCase()) && (
                                                        <DropdownMenuItem onClick={() => setRejectionModal({ isOpen: true, reason: item.rejectionReason || 'Ditolak oleh admin.', userName: item.user?.name || `User #${item.userId}`, amount: item.amount || 0 })}>
                                                            <Eye className="w-4 h-4 mr-2 text-red-600" />
                                                            <span className="text-red-600">Lihat Alasan Ditolak</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <div>
                                        <Link href={`/${lang}/users/manage/${item.userId}`} title="Lihat profil" className="font-bold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors">{item.user?.name || `User ID: ${item.userId}`}</Link>
                                        <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                            <CreditCard className="w-3 h-3" />
                                            {item.paymentMethod || 'Transfer/Payment Gateway'}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{item.amount !== undefined ? formatCurrency(item.amount) : '—'}</div>
                                        {item.createdAt && (
                                            <span title={formatTooltipDate(item.createdAt)} className="text-xs text-gray-500 cursor-default border-b border-dashed border-gray-400 pb-px">{timeAgo(item.createdAt, t).relative}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block p-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 uppercase tracking-widest text-[10px] font-bold border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 text-left">ID</th>
                                    <th className="px-6 py-4 text-left">User</th>
                                    <th className="px-6 py-4 text-left">Metode Pembayaran</th>
                                    <th className="px-6 py-4 text-right">Nominal</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-left">Tanggal</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {loading && (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="space-y-3 py-4 px-6">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-4 animate-pulse">
                                                        <Skeleton className="h-3 w-full max-w-[120px]" />
                                                        <Skeleton className="h-3 w-full max-w-[80px]" />
                                                        <Skeleton className="h-3 w-full max-w-[100px]" />
                                                        <Skeleton className="h-3 w-full max-w-[60px]" />
                                                        <Skeleton className="h-3 w-full max-w-[90px]" />
                                                        <Skeleton className="h-3 w-full max-w-[60px]" />
                                                        <Skeleton className="h-3 w-full max-w-[50px]" />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && pagedTopups.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-500">
                                            <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                            <p>Tidak ada data topup.</p>
                                        </td>
                                    </tr>
                                )}
                                {!loading && pagedTopups.map((item: any) => {
                                    const userUsername = item.user?.username
                                        ? `@${item.user.username}`
                                        : item.user?.email
                                            ? `@${item.user.email.split('@')[0]}`
                                            : null
                                    const isPending = ['pending', 'waiting'].includes((item.status || '').toLowerCase());
                                    const isRejected = ['failed', 'rejected', 'cancelled'].includes((item.status || '').toUpperCase() === 'REJECTED' ? 'rejected' : (item.status || '').toLowerCase());
                                    const rejReason = item.rejectionReason;
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                    #{item.id}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link href={`/${lang}/users/manage/${item.userId}?tab=wallet`} title="Lihat profil" className="font-bold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors">{item.user?.name || `User ID: ${item.userId}`}</Link>
                                                {userUsername && <div className="text-[11px] text-gray-400 mt-0.5">{userUsername}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                    <CreditCard className="w-3 h-3" />
                                                    {item.paymentMethod || 'Transfer/Payment Gateway'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.amount !== undefined ? formatCurrency(item.amount) : '—'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {getStatusBadge(item.status)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.createdAt ? (
                                                    <span title={formatTooltipDate(item.createdAt)} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default border-b border-dashed border-gray-400 dark:border-gray-500 pb-px whitespace-nowrap">{timeAgo(item.createdAt, t).relative}</span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center items-center gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Aksi Topup</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {isPending && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => openModal('confirm_topup', item)}>
                                                                        <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                                        <span>Confirm Topup</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => openModal('reject_topup', item)}>
                                                                        <X className="w-4 h-4 mr-2 text-red-600" />
                                                                        <span className="text-red-600">Reject Topup</span>
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {!isPending && !isRejected && (
                                                                <DropdownMenuItem onClick={() => setRejectionModal({ isOpen: true, reason: rejReason || 'Tidak ada catatan.', userName: item.user?.name || `User #${item.userId}`, amount: item.amount || 0 })}>
                                                                    <Eye className="w-4 h-4 mr-2 text-blue-600" />
                                                                    <span>Lihat Detail Penerimaan</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {isRejected && (
                                                                <DropdownMenuItem onClick={() => setRejectionModal({ isOpen: true, reason: rejReason || 'Ditolak oleh admin.', userName: item.user?.name || `User #${item.userId}`, amount: item.amount || 0 })}>
                                                                    <Eye className="w-4 h-4 mr-2 text-red-600" />
                                                                    <span className="text-red-600">Lihat Alasan Ditolak</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <SmartPagination
                        total={filteredTopups.length}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                        loading={loading}
                    />
                </div>

                {/* ── Modal: Confirm / Reject Topup ── */}
                {actionModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {actionModal.type === 'confirm_topup' && 'Confirm Topup'}
                                    {actionModal.type === 'reject_topup' && 'Reject Topup'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Anda akan melakukan aksi pada transaksi <span className="font-bold">{actionModal.item?.user?.name || `User ID: ${actionModal.item?.userId}`}</span> senilai <span className="font-bold">{formatCurrency(actionModal.item?.amount)}</span>.
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                {actionModal.type === 'confirm_topup' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External Reference</label>
                                        <input
                                            type="text"
                                            value={modalInput.ref}
                                            onChange={(e) => setModalInput({ ...modalInput, ref: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                            placeholder="Opsional..."
                                        />
                                    </div>
                                )}
                                {actionModal.type === 'reject_topup' && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            Masukkan alasan penolakan topup untuk pengguna ini.
                                        </p>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Alasan Penolakan <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={modalInput.reason}
                                                onChange={(e) => setModalInput({ ...modalInput, reason: e.target.value })}
                                                rows={3}
                                                placeholder="Contoh: Bukti transfer tidak valid, nominal tidak sesuai..."
                                                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => setActionModal({ isOpen: false, type: null, item: null })}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={executeAction}
                                    className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${actionModal.type?.includes('reject') ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                >
                                    Konfirmasi
                                </button>
                            </div>
                        </div>
                    </div>
                )}



                {/* ── Rejection Reason Modal ── */}
                {rejectionModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Alasan Penolakan Topup</h3>
                                <button onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catatan/Alasan Admin:</p>
                                    <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{rejectionModal.reason || 'Tidak ada catatan.'}</p>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm">Tutup</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

export default function WalletPage() {
    return (
                <WalletPageContent />
    )
}
