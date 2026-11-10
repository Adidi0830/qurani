"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { useRouter, useParams } from "next/navigation";
import { walletApi } from "@/lib/api";
import { RefreshCw, Search, History, CheckCircle, Clock, XCircle, ArrowRight, ChevronLeft, ChevronRight, Filter, MoreHorizontal, Wallet, User, ExternalLink, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SmartPagination } from "@/components/ui/smart-pagination";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function formatDate(dateString: string | undefined, format: 'relative' | 'long' | 'short' = 'long', tz: string = 'UTC', locale: string = 'id-ID') {
    if (!dateString) return "—";
    try {
        const date = new Date(dateString);
        if (format === 'long') return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short', timeZone: tz }).format(date);
        if (format === 'short') return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short', timeZone: tz }).format(date);
        
        // relative
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diffInSeconds < 60) return "Baru saja";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: tz }).format(date);
    } catch {
        return dateString;
    }
}

function getTxTypeBadge(type: number | undefined) {
    if (type === 1) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">TopUp</span>;
    if (type === 2) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Withdraw</span>;
    if (type === 3) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">Transfer</span>;
    if (type === 4) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Payment</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Lainnya</span>;
}

function getStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase();
    if (s === "success" || s === "completed" || s === "approved") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle className="w-3 h-3" />Berhasil</span>;
    }
    if (s === "pending" || s === "waiting") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Gagal</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status || "—"}</span>;
}

/** Normalize payment method to short display name */
function getPaymentMethodName(raw: string | undefined): string {
    if (!raw) return "—";
    const lower = raw.toLowerCase();
    if (lower.includes("qurani wallet") || lower.includes("wallet qurani") || lower.includes("saldo wallet") || lower.includes("qurani")) return "Qurani Wallet";
    if (lower.includes("gopay")) return "GoPay";
    if (lower.includes("dana")) return "DANA";
    if (lower.includes("ovo")) return "OVO";
    if (lower.includes("shopeepay") || lower.includes("spay")) return "ShopeePay";
    if (lower.includes("bca")) return "Bank BCA";
    if (lower.includes("mandiri")) return "Bank Mandiri";
    if (lower.includes("bni")) return "Bank BNI";
    if (lower.includes("bri")) return "Bank BRI";
    if (lower.includes("bsi")) return "Bank BSI";
    if (lower.includes("cimb")) return "Bank CIMB";
    if (lower.includes("permata")) return "Bank Permata";
    if (lower.includes("virtual account") || lower.includes("va")) return raw.replace(/virtual account/i, "VA").trim();
    if (lower.includes("transfer bank")) return raw.replace(/transfer bank/i, "Bank").trim();
    return raw;
}

import { getSimTransactions } from "@/lib/sim-wallet-store";

function HistoryPageContent() {
    const { t } = useI18n();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [txLoading, setTxLoading] = useState(true);
    const [txError, setTxError] = useState<string | null>(null);
    const [txPage, setTxPage] = useState(1);
    const [txPageSize, setTxPageSize] = useState(10);
    const [txTotalPages, setTxTotalPages] = useState(1);
    const [isDemoMode, setIsDemoMode] = useState(false);
    
    // Search states
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    const params = useParams();
    const router = useRouter();
    const lang = params?.lang as string || 'en';
    
    // Filter states
    const [kategoriFilter, setKategoriFilter] = useState("all");
    const [nominalMin, setNominalMin] = useState("");
    const [nominalMax, setNominalMax] = useState("");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");
    const [metodeFilter, setMetodeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    
    const [activeFilters, setActiveFilters] = useState({
        kategori: "all",
        nominalMin: "",
        nominalMax: "",
        dateStart: "",
        dateEnd: "",
        metode: "",
        status: "all"
    });
    
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    // Store all transactions for user lookup
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    
    // Removed TX_PAGE_SIZE constant as it's now state
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = 'id-ID';

    const [totalCount, setTotalCount] = useState(0);

    const fetchTransactions = useCallback(async (page: number, search: string = "", filters: any = {}) => {
        setTxLoading(true);
        setTxError(null);
        try {
            const res = await walletApi.getTransactions({ page, pageSize: txPageSize });
            const data = res?.data || res;
            let items = Array.isArray(data) ? data : (data?.items || data?.data || []);
            
            if (items.length === 0) {
                items = getSimTransactions();
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }

            // Halaman Transaksi hanya menampilkan data yang sudah terproses
            // (selesai/berhasil atau ditolak). Data pending disaring agar tidak tampil.
            items = items.filter((item: any) => {
                const s = (item.status || "").toLowerCase();
                return !["pending", "waiting"].includes(s);
            });

            // Store all transactions for user detail lookup
            setAllTransactions(items);

            // Apply search and filters
            if (search) {
                const lowerSearch = search.toLowerCase();
                items = items.filter((item: any) => 
                    item.user?.name?.toLowerCase().includes(lowerSearch) ||
                    item.description?.toLowerCase().includes(lowerSearch) ||
                    item.referenceId?.toLowerCase().includes(lowerSearch)
                );
            }
            if (filters.kategori && filters.kategori !== "all") {
                items = items.filter((item: any) => item.type === parseInt(filters.kategori));
            }
            if (filters.metode) {
                const m = filters.metode.toLowerCase();
                items = items.filter((item: any) => item.paymentMethod?.toLowerCase().includes(m));
            }
            if (filters.status && filters.status !== "all") {
                const s = filters.status.toLowerCase();
                if (s === "berhasil") {
                    items = items.filter((item: any) => ["completed", "success", "approved"].includes((item.status || "").toLowerCase()));
                } else if (s === "pending") {
                    items = items.filter((item: any) => ["pending", "waiting"].includes((item.status || "").toLowerCase()));
                } else if (s === "tolak") {
                    items = items.filter((item: any) => ["failed", "rejected", "cancelled"].includes((item.status || "").toLowerCase()));
                }
            }
            if (filters.nominalMin) {
                items = items.filter((item: any) => Math.abs(item.amount) >= parseInt(filters.nominalMin));
            }
            if (filters.nominalMax) {
                items = items.filter((item: any) => Math.abs(item.amount) <= parseInt(filters.nominalMax));
            }
            if (filters.dateStart) {
                items = items.filter((item: any) => new Date(item.createdAt) >= new Date(filters.dateStart));
            }
            if (filters.dateEnd) {
                const endDate = new Date(filters.dateEnd);
                endDate.setHours(23, 59, 59, 999);
                items = items.filter((item: any) => new Date(item.createdAt) <= endDate);
            }

            const total = items.length;
            setTotalCount(total);
            setTxTotalPages(Math.ceil(total / txPageSize));
            
            // Apply pagination on frontend
            const startIndex = (page - 1) * txPageSize;
            const displayItems = items.slice(startIndex, startIndex + txPageSize);

            setTransactions(displayItems);
        } catch (err: any) {
            console.error("Error fetching transactions:", err);
        } finally {
            setTxLoading(false);
        }
    }, [isDemoMode]);

    useEffect(() => {
        fetchTransactions(txPage, activeSearch, activeFilters);
    }, [txPage, activeSearch, activeFilters, fetchTransactions]);

    // Auto-refresh saat ada aksi dari modul lain (Payout/Refund/Withdraw)
    useEffect(() => {
        const handleBillingUpdate = () => {
            fetchTransactions(txPage, activeSearch, activeFilters);
        };
        // Native storage event (cross-tab)
        window.addEventListener('storage', handleBillingUpdate);
        // Custom event dari sim-billing-store (same-tab)
        window.addEventListener('sim-billing-update', handleBillingUpdate);
        return () => {
            window.removeEventListener('storage', handleBillingUpdate);
            window.removeEventListener('sim-billing-update', handleBillingUpdate);
        };
    }, [txPage, activeSearch, activeFilters, fetchTransactions]);

    const handleSearch = () => {
        setActiveSearch(searchInput);
        setActiveFilters({
            kategori: kategoriFilter,
            nominalMin,
            nominalMax,
            dateStart,
            dateEnd,
            metode: metodeFilter,
            status: statusFilter
        });
        setTxPage(1);
        setIsFilterOpen(false);
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    // --- Mobile card renderer ---
    const TransactionCard = ({ item }: { item: any }) => (
        <div
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 shrink-0">#{item.id}</span>
                    <div className="min-w-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/${lang}/billing/${item.userId}/wallet`); }}
                            className="font-bold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left"
                        >
                            {item.user?.name || `User ID: ${item.userId}`}
                        </button>
                        {item.user?.username && (
                            <p className="text-[10px] text-gray-400">@{item.user.username}</p>
                        )}
                    </div>
                </div>
                <span className={`font-bold text-sm shrink-0 ${item.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {item.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.amount))}
                </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
                {getTxTypeBadge(item.type)}
                {getStatusBadge(item.status)}
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {getPaymentMethodName(item.paymentMethod)}
                </span>
            </div>
            {item.description && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-2">{item.description}</p>
            )}
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{formatDate(item.createdAt, 'relative', tz, locale)}</span>
                {item.referenceId && <span className="text-[10px] font-mono text-gray-400">{item.referenceId}</span>}
            </div>
        </div>
    );

    return (
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
                
                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Transaksi</h1>
                </div>

                {/* ── Main Content ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                        {/* Kiri: Search & Filter */}
                        <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1 flex-1">
                            
                            <div className="flex flex-1 sm:flex-none sm:w-64 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                                <div className="relative flex-1 bg-gray-50 dark:bg-gray-800">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Cari user, ref..."
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white"
                                    />
                                </div>
                                <button onClick={handleSearch} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
                                    Cari
                                </button>
                            </div>

                            <button 
                                onClick={() => setIsFilterOpen(true)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                    (activeFilters.kategori !== "all" || activeFilters.nominalMin !== "" || activeFilters.nominalMax !== "" || activeFilters.dateStart !== "" || activeFilters.dateEnd !== "" || activeFilters.metode !== "" || activeFilters.status !== "all")
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                        : "bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                            >
                                <Filter className="w-4 h-4" /> Filter
                            </button>

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
                                                <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                                    <SelectValue placeholder="Semua Kategori" />
                                                </SelectTrigger>
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
                                            <input 
                                                type="text"
                                                placeholder="Contoh: Bank BCA, DANA, dll"
                                                value={metodeFilter}
                                                onChange={e => setMetodeFilter(e.target.value)}
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status</label>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                                    <SelectValue placeholder="Semua Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="all">Semua Status</SelectItem>
                                                        <SelectItem value="Berhasil">Berhasil</SelectItem>
                                                        <SelectItem value="Tolak">Ditolak</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Nominal (Rp)</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    placeholder="Min"
                                                    value={nominalMin}
                                                    onChange={e => setNominalMin(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
                                                />
                                                <span className="text-gray-400">-</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Max"
                                                    value={nominalMax}
                                                    onChange={e => setNominalMax(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Rentang Tanggal</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="date" 
                                                    value={dateStart}
                                                    onChange={e => setDateStart(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow [color-scheme:light] dark:[color-scheme:dark]"
                                                />
                                                <span className="text-gray-400">-</span>
                                                <input 
                                                    type="date" 
                                                    value={dateEnd}
                                                    onChange={e => setDateEnd(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow [color-scheme:light] dark:[color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <DialogFooter>
                                        <button 
                                            onClick={handleSearch}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all"
                                        >
                                            Terapkan Filter
                                        </button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        
                        {/* Kanan: Refresh dll */}
                        <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2 justify-end">
                            <button onClick={() => fetchTransactions(txPage, activeSearch, activeFilters)} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors border border-emerald-200 dark:border-emerald-800">
                                <RefreshCw className="w-4 h-4" /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">ID</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">User</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Kategori</th>
                                    <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Nominal</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Metode</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4 hidden xl:table-cell">Tanggal</th>
                                    <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {txLoading ? (
                                    <tr><td colSpan={8}><div className="space-y-3 py-4 px-6">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                                <Skeleton className="h-3 w-[80px]" /><Skeleton className="h-3 w-[120px]" />
                                                <Skeleton className="h-3 w-[200px]" /><Skeleton className="h-3 w-[90px]" />
                                            </div>
                                        ))}
                                    </div></td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                                        <History className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                        <p>Belum ada riwayat transaksi</p>
                                    </td></tr>
                                ) : transactions.map((item: any) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => router.push(`/${lang}/billing/${item.id}/transaction`)}
                                        className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">#{item.id}</span>
                                            {item.referenceId && <div className="text-[10px] text-gray-400 mt-1 font-mono">{item.referenceId}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); router.push(`/${lang}/billing/${item.userId || item.id}/wallet`); }}
                                                className="font-bold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left"
                                            >
                                                {item.user?.name || `User ID: ${item.userId}`}
                                            </button>
                                            <p className="text-[11px] text-gray-400">{item.user?.username ? `@${item.user.username}` : ''}</p>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <div className="mb-1">{getTxTypeBadge(item.type)}</div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{item.description || '—'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <span className={`font-bold text-sm ${item.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {item.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.amount))}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                                                {getPaymentMethodName(item.paymentMethod)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4 hidden xl:table-cell whitespace-nowrap">
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 pb-0.5">
                                                            {formatDate(item.createdAt, 'relative', tz, locale)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs">
                                                        {formatDate(item.createdAt, 'long', tz, locale)}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => router.push(`/${lang}/billing/${item.id}/transaction`)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {txLoading ? (
                            <div className="p-4 space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse space-y-3">
                                        <div className="flex justify-between">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                        <Skeleton className="h-3 w-32" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-5 w-14 rounded-full" />
                                            <Skeleton className="h-5 w-16 rounded-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 px-4">
                                <History className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                <p>Belum ada riwayat transaksi</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {transactions.map((item: any) => (
                                    <TransactionCard key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination Footer */}
                    <SmartPagination
                        total={totalCount}
                        page={txPage}
                        pageSize={txPageSize}
                        onPageChange={setTxPage}
                        onPageSizeChange={(s: number) => { setTxPageSize(s); setTxPage(1); }}
                        loading={txLoading}
                    />
                </div>
            </div>
            
        </div>
    );
}

export default function HistoryPage() {
    return (
            <HistoryPageContent />
    );
}
