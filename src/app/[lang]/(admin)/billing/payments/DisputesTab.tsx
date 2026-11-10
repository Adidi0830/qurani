"use client"

import { useState, useEffect, useCallback } from "react"
import { useI18n } from "@/components/providers/i18n-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { paymentsApi } from "@/lib/api"
import { showToast, ToastContainer } from "@/components/ui/toast-sim"
import { Search, ChevronLeft, ChevronRight, Eye, MoreHorizontal, CheckCircle2, XCircle, AlertCircle, ChevronDown, MessageSquare } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { formatTooltipDate } from "@/lib/date-utils"

interface DisputeData {
    id: number | string;
    paymentId: number | string;
    userId: number | string;
    userName: string;
    trainerId: number | string;
    trainerName: string;
    amount: number;
    status: string; // 'Open', 'In Progress', 'Resolved', 'Closed'
    type: string;
    priority: string; // 'Low', 'Medium', 'High'
    createdAt: string;
    reason?: string;
    response?: string;
    resolution?: string;
}

const PAGE_SIZE = 10;

// Dummy data for disputes
let localDisputeDummyData: DisputeData[] = [
    {
        id: 101, paymentId: 1, userId: 101, userName: "Ahmad", trainerId: 201, trainerName: "Budi",
        amount: 150000, status: "Open", type: "Fraud", priority: "High", createdAt: new Date(Date.now() - 86400000).toISOString(),
        reason: "User claims unauthorized charge."
    },
    {
        id: 102, paymentId: 2, userId: 102, userName: "Siti", trainerId: 202, trainerName: "Aisyah",
        amount: 250000, status: "Resolved", type: "Service Not Delivered", priority: "Medium", createdAt: new Date(Date.now() - 172800000).toISOString(),
        reason: "Trainer did not attend the session.",
        response: "Trainer had technical issues.",
        resolution: "Refunded full amount to user."
    },
    {
        id: 103, paymentId: 3, userId: 103, userName: "Fatimah", trainerId: 201, trainerName: "Budi",
        amount: 100000, status: "In Progress", type: "Duplicate Charge", priority: "Low", createdAt: new Date(Date.now() - 3600000).toISOString(),
        reason: "User was charged twice for the same booking."
    }
];

function formatCurrency(amount: number, currency: string = "IDR") {
    return new Intl.NumberFormat("id-ID", { 
        style: "currency", 
        currency: currency, 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace("IDR", "Rp");
}

function formatDate(dateStr: string) {
    if (!dateStr) return "-";
    let normalized = dateStr.trim();
    if (normalized.includes(" ") && !normalized.includes("T")) normalized = normalized.replace(" ", "T");
    if (!normalized.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(normalized)) normalized += "Z";
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false
    }).format(d);
}

function timeAgo(dateStr: string): { relative: string; full: string } {
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

    const tz = typeof window !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC';
    const full = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
        hour12: false, timeZone: tz, timeZoneName: "short"
    }).format(date);

    let relative: string;
    if (diffSec < 60) relative = "Baru saja";
    else if (diffMin < 60) relative = `${diffMin} menit lalu`;
    else if (diffHour < 24) relative = `${diffHour} jam lalu`;
    else if (diffDay === 1) relative = "Kemarin";
    else if (diffDay < 7) relative = `${diffDay} hari lalu`;
    else if (diffWeek < 5) relative = `${diffWeek} minggu lalu`;
    else if (diffMonth < 12) relative = `${diffMonth} bulan lalu`;
    else relative = `${diffYear} tahun lalu`;

    return { relative, full };
}

export default function DisputesTab() {
    const { t } = useI18n()
    const [disputes, setDisputes] = useState<DisputeData[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)

    // Search and Filters
    const [searchInput, setSearchInput] = useState("")
    const [activeSearch, setActiveSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")

    // Modals
    const [detailModal, setDetailModal] = useState<DisputeData | null>(null)
    const [respondModal, setRespondModal] = useState<DisputeData | null>(null)
    const [resolveModal, setResolveModal] = useState<DisputeData | null>(null)

    // Form fields for Respond
    const [responseText, setResponseText] = useState("")
    const [merchantEvidence, setMerchantEvidence] = useState("")

    // Form fields for Resolve
    const [resolutionText, setResolutionText] = useState("")
    const [resolutionNotes, setResolutionNotes] = useState("")
    const [refundAmount, setRefundAmount] = useState<number | "">("")
    const [autoProcessRefund, setAutoProcessRefund] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDemoMode, setIsDemoMode] = useState(false)

    const fetchDisputes = useCallback(async () => {
        setLoading(true)
        try {
            const params: any = {
                page: page,
                pageSize: PAGE_SIZE,
            }
            if (statusFilter && statusFilter !== 'all') {
                params.status = statusFilter;
            }

            // Real API Call
            const response = await paymentsApi.getDisputes(params)
            const items = response.items || response.data || response || [];
            
            if (Array.isArray(items) && items.length > 0) {
                setDisputes(items)
                setTotalItems(response.totalCount || items.length)
                setIsDemoMode(false)
            } else {
                throw new Error("No items from API or empty array")
            }

        } catch (err: any) {
            console.log("API Fetch Disputes Error (using dummy data):", err.message)
            setIsDemoMode(true)
            // Fallback to localDummyData
            let dummy = [...localDisputeDummyData];

            if (activeSearch) {
                const searchLower = activeSearch.toLowerCase();
                dummy = dummy.filter(p => 
                    (p.userName && p.userName.toLowerCase().includes(searchLower)) || 
                    (p.trainerName && p.trainerName.toLowerCase().includes(searchLower)) ||
                    String(p.id).includes(searchLower) ||
                    String(p.paymentId).includes(searchLower)
                );
            }

            if (statusFilter && statusFilter !== 'all') {
                dummy = dummy.filter(p => p.status === statusFilter);
            }

            setDisputes(dummy)
            setTotalItems(dummy.length)
        } finally {
            setLoading(false)
        }
    }, [page, activeSearch, statusFilter])

    useEffect(() => {
        fetchDisputes()
    }, [fetchDisputes])

    const handleSearch = () => {
        setActiveSearch(searchInput)
        setPage(1)
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

    // Action Handlers
    const submitRespond = async () => {
        if (!responseText.trim()) {
            showToast({ type: 'error', title: 'Teks respons wajib diisi', message: 'Harap isi kolom respons sebelum mengirim.' });
            return;
        }
        setIsSubmitting(true)
        try {
            if (respondModal) {
                await paymentsApi.respondDispute(respondModal.id, {
                    response: responseText,
                    merchantEvidence
                });
                localDisputeDummyData = localDisputeDummyData.map(d => 
                    d.id === respondModal.id ? { ...d, response: responseText, status: "In Progress" } : d
                );
            }
            showToast({ type: 'success', title: 'Reply Terkirim', message: 'Reply dispute berhasil dikirim.' });
            closeModals();
            fetchDisputes();
        } catch (err: any) {
            console.error("Submit Respond Error:", err);
            // Even if API fails, update dummy data locally for testing
            if (respondModal) {
                localDisputeDummyData = localDisputeDummyData.map(d => 
                    d.id === respondModal.id ? { ...d, response: responseText, status: "In Progress" } : d
                );
            }
            showToast({ type: 'info', title: '[DEMO] Reply Tersimpan', message: 'Reply berhasil disimpan secara lokal (simulasi).' });
            closeModals();
            fetchDisputes();
        } finally {
            setIsSubmitting(false)
        }
    }

    const submitResolve = async () => {
        if (!resolutionText.trim()) {
            showToast({ type: 'error', title: 'Teks resolusi wajib diisi', message: 'Harap isi kolom resolusi sebelum mengirim.' });
            return;
        }
        setIsSubmitting(true)
        try {
            if (resolveModal) {
                await paymentsApi.resolveDispute(resolveModal.id, {
                    resolution: resolutionText,
                    resolutionNotes,
                    refundAmount: refundAmount ? Number(refundAmount) : undefined,
                    autoProcessRefund: autoProcessRefund ? 1 : 0
                });
                localDisputeDummyData = localDisputeDummyData.map(d => 
                    d.id === resolveModal.id ? { ...d, resolution: resolutionText, status: 'Resolved' } : d
                );
            }
            showToast({ type: 'success', title: 'Dispute Diselesaikan', message: 'Dispute berhasil diselesaikan.' + (autoProcessRefund ? ' Refund sedang diproses.' : '') });
            closeModals();
            fetchDisputes();
        } catch (err: any) {
            console.error("Submit Resolve Error:", err);
            // Local fallback for demo mode
            if (resolveModal) {
                localDisputeDummyData = localDisputeDummyData.map(d => 
                    d.id === resolveModal.id ? { ...d, resolution: resolutionText, status: 'Resolved' } : d
                );
            }
            showToast({ type: 'info', title: '[DEMO] Dispute Diselesaikan', message: 'Dispute berhasil diselesaikan secara lokal (simulasi).' });
            closeModals();
            fetchDisputes();
        } finally {
            setIsSubmitting(false)
        }
    }

    const closeModals = () => {
        setDetailModal(null);
        setRespondModal(null);
        setResolveModal(null);
        setResponseText("");
        setMerchantEvidence("");
        setResolutionText("");
        setResolutionNotes("");
        setRefundAmount("");
        setAutoProcessRefund(false);
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <ToastContainer />
            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">

                    <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-[160px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                    <div className="flex w-full sm:w-[350px] shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="relative flex-1 bg-white dark:bg-gray-900">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari sengketa..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-9 pr-3 py-2.5 text-sm bg-transparent border-none focus:ring-0 dark:text-white"
                            />
                        </div>
                        <button onClick={handleSearch} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
                            Cari
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* MOBILE CARD VIEW (<640px) */}
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
                    ) : disputes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Tidak ada sengketa ditemukan.</div>
                    ) : (
                        disputes.map((item) => (
                            <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${item.priority === 'High' ? 'bg-rose-100 text-rose-700' : item.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.priority}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                                            item.status === 'Open' ? 'bg-rose-100 text-rose-700' :
                                            item.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setDetailModal(item)}>
                                                <Eye className="w-4 h-4 mr-2" /> {t("billing.payments.disputes.action.detail", "Lihat Detail")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setRespondModal(item)}>
                                                <MessageSquare className="w-4 h-4 mr-2" /> {t("billing.payments.disputes.action.reply", "Balas")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setResolveModal(item)}>
                                                <CheckCircle2 className="w-4 h-4 mr-2" /> {t("billing.payments.disputes.action.resolve", "Selesaikan")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.type}</div>
                                    <div className="text-xs text-gray-500">
                                        {t("billing.payments.table.user", "Pengguna")}: <span className="font-medium text-gray-900 dark:text-gray-300">{item.userName}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {t("billing.payments.table.trainer", "Trainer")}: <span className="font-medium text-gray-900 dark:text-gray-300">{item.trainerName}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <div className="font-medium text-emerald-600 text-sm">{formatCurrency(item.amount)}</div>
                                    {(() => { const ta = timeAgo(item.createdAt); return (
                                        <span title={formatTooltipDate(item.createdAt)} className="text-xs text-gray-500 cursor-default border-b border-dashed border-gray-400 pb-px">{ta.relative}</span>
                                    ); })()}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* TABLE VIEW (Tablet & Desktop) */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3">{t("billing.payments.table.paymentDate", "Tanggal")}</th>
                                <th className="px-4 py-3">{t("billing.payments.summary.payments", "Pembayaran")}</th>
                                <th className="px-4 py-3">{t("billing.payments.table.user", "Pengguna")}</th>
                                <th className="px-4 py-3">{t("billing.payments.disputes.table.type", "Tipe")}</th>
                                <th className="px-4 py-3">{t("billing.payments.table.status", "Status")}</th>
                                <th className="px-4 py-3 text-center">{t("billing.payments.table.actions", "Aksi")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="space-y-3 py-4 px-6">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                                    <Skeleton className="h-3 w-full max-w-[120px]" />
                                                    <Skeleton className="h-3 w-full max-w-[80px]" />
                                                    <Skeleton className="h-3 w-full max-w-[100px]" />
                                                    <Skeleton className="h-3 w-full max-w-[60px]" />
                                                    <Skeleton className="h-3 w-full max-w-[90px]" />
                                                    <Skeleton className="h-3 w-full max-w-[50px]" />
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ) : disputes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Tidak ada sengketa ditemukan.</td>
                                </tr>
                            ) : (
                                disputes.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 py-3">
                                            {(() => { const ta = timeAgo(item.createdAt); return (
                                                <span title={formatTooltipDate(item.createdAt)} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default border-b border-dashed border-gray-400 dark:border-gray-500 pb-px">{ta.relative}</span>
                                            ); })()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-emerald-600">{formatCurrency(item.amount)}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 dark:text-white">{item.userName}</div>
                                            <div className="text-xs text-gray-500">Trainer: {item.trainerName}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-900 dark:text-white font-medium">{item.type}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${item.priority === 'High' ? 'bg-rose-100 text-rose-700' : item.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {item.priority}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                item.status === 'Open' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                item.status === 'In Progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setDetailModal(item)}>
                                                            <Eye className="w-4 h-4 mr-2" /> {t("billing.payments.disputes.action.detail", "Lihat Detail")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setRespondModal(item)}>
                                                            <MessageSquare className="w-4 h-4 mr-2" /> {t("billing.payments.disputes.action.reply", "Balas")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setResolveModal(item)}>
                                                            <CheckCircle2 className="w-4 h-4 mr-2" /> {t("billing.payments.disputes.action.resolve", "Selesaikan")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalItems > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Menampilkan <span className="font-semibold text-gray-900 dark:text-white">{(page - 1) * PAGE_SIZE + 1}</span> - <span className="font-semibold text-gray-900 dark:text-white">{Math.min(page * PAGE_SIZE, totalItems)}</span> dari <span className="font-semibold text-gray-900 dark:text-white">{totalItems}</span>
                        </span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            
            {/* Detail Modal */}
            {detailModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                Detail Sengketa #{detailModal.id}
                            </h3>
                            <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">ID Pembayaran</p>
                                    <p className="font-medium text-gray-900 dark:text-white">#{detailModal.paymentId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Nominal</p>
                                    <p className="font-bold text-emerald-600">{formatCurrency(detailModal.amount)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Pengguna (Pelapor)</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{detailModal.userName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Trainer Terkait</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{detailModal.trainerName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Status</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-medium">{detailModal.status}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Dibuat Pada</p>
                                    <p className="text-sm text-gray-900 dark:text-gray-300">{formatDate(detailModal.createdAt)}</p>
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700 my-2" />

                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Alasan Sengketa (Reason)</h4>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                                    {detailModal.reason || "Tidak ada alasan yang diberikan."}
                                </div>
                            </div>

                            {detailModal.response && (
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Respons Terakhir</h4>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30">
                                        {detailModal.response}
                                    </div>
                                </div>
                            )}

                            {detailModal.resolution && (
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Resolusi Akhir</h4>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-sm text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/30">
                                        {detailModal.resolution}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                            {detailModal.status !== 'Closed' && detailModal.status !== 'Resolved' && (
                                <>
                                    <Button variant="outline" onClick={() => { const item = detailModal; closeModals(); setRespondModal(item); }}>Respond</Button>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { const item = detailModal; closeModals(); setResolveModal(item); }}>Resolve</Button>
                                </>
                            )}
                            <Button variant="ghost" onClick={closeModals}>Tutup</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Respond Modal */}
            {respondModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                {t("billing.payments.disputes.action.reply", "Balas")} Sengketa #{respondModal?.id}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-white dark:bg-gray-900/50 p-3 rounded-lg text-sm border border-gray-100 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400">Pengguna: <span className="font-medium text-gray-900 dark:text-white">{respondModal?.userName}</span></p>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Alasan: <span className="text-gray-700 dark:text-gray-300 italic">{respondModal?.reason || '-'}</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Balasan (Wajib)
                                </label>
                                <textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                    rows={3}
                                    placeholder="Ketik balasan Anda di sini..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Bukti / Merchant Evidence (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={merchantEvidence}
                                    onChange={(e) => setMerchantEvidence(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="URL atau catatan bukti"
                                />
                            </div>

                            
                            <div className="flex gap-3 pt-4">
                                <Button 
                                    onClick={() => submitRespond()}
                                    disabled={isSubmitting || !responseText.trim()}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isSubmitting ? "Menyimpan..." : "Kirim Reply"}
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={closeModals}>Batal</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Modal */}
            {resolveModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20">
                            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                                {t("billing.payments.disputes.action.resolve", "Selesaikan")} Sengketa #{resolveModal?.id}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-white dark:bg-gray-900/50 p-3 rounded-lg text-sm border border-gray-100 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400">Pengguna: <span className="font-medium text-gray-900 dark:text-white">{resolveModal?.userName}</span></p>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Alasan: <span className="text-gray-700 dark:text-gray-300 italic">{resolveModal?.reason || '-'}</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Resolusi Akhir (Wajib)
                                </label>
                                <textarea
                                    value={resolutionText}
                                    onChange={(e) => setResolutionText(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                                    rows={2}
                                    placeholder="Keputusan akhir..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Catatan Resolusi (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Catatan tambahan"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nominal Refund (Opsional)
                                </label>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    id="autoProcess"
                                    checked={autoProcessRefund}
                                    onChange={(e) => setAutoProcessRefund(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                />
                                <label htmlFor="autoProcess" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Auto Process Refund
                                </label>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <Button 
                                    onClick={() => submitResolve()}
                                    disabled={isSubmitting || !resolutionText.trim()}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {isSubmitting ? "Menyimpan..." : "Kirim Resolve"}
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={closeModals}>Batal</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
