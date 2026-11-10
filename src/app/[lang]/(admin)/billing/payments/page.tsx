"use client"
import { useRouter, useParams } from "next/navigation";

import { useState, useEffect, useCallback, useRef } from "react"
import { useI18n } from "@/components/providers/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton"
import { paymentsApi, type PaymentSearchParams } from "@/lib/api"
import { formatTooltipDate } from "@/lib/date-utils"
import { showToast, ToastContainer } from "@/components/ui/toast-sim"
import {
    getSimPayments,
    markSimPaymentAsPaidOut,
    syncPaymentStatusFromOrder,
} from "@/lib/sim-billing-store"
import { Search, ChevronLeft, ChevronRight, DollarSign, Activity, MoreHorizontal, AlertCircle, SlidersHorizontal, Download, Send, CheckSquare, Filter } from "lucide-react"
import DisputesTab from "./DisputesTab"
import { SmartPagination } from "@/components/ui/smart-pagination"
interface PaymentData {
    id: number | string;
    userId: number | string;
    userName: string;
    trainerId: number | string;
    trainerName: string;
    bookingId?: number | string;
    amount: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    updatedAt?: string;
    payoutReference?: string;
    isPaidOut?: boolean;
}

// Data sepenuhnya dari sim-billing-store (persistent localStorage).
// DUMMY lama dihapus — getSimPayments() sudah mengembalikan 10 entries
// yang sesuai persis dengan 10 pesanan di halaman Orders/Pesanan.

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
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    })
}

// Time ago: menampilkan waktu relatif dengan full date di tooltip (timezone-aware)
function timeAgo(dateStr: string, locale: string = "id", timezone?: string): { relative: string; full: string } {
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

    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localeCode = locale === "ar" ? "ar-SA" : locale === "en" ? "en-GB" : "id-ID";
    const full = new Intl.DateTimeFormat(localeCode, {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
        hour12: false,
        timeZone: tz,
        timeZoneName: "short"
    }).format(date);

    let relative: string;
    if (locale === "en") {
        if (diffSec < 60) relative = "just now";
        else if (diffMin < 60) relative = `${diffMin} min ago`;
        else if (diffHour < 24) relative = `${diffHour} hr ago`;
        else if (diffDay === 1) relative = `yesterday`;
        else if (diffDay < 7) relative = `${diffDay} days ago`;
        else if (diffWeek < 5) relative = `${diffWeek} wk ago`;
        else if (diffMonth < 12) relative = `${diffMonth} mo ago`;
        else relative = `${diffYear} yr ago`;
    } else if (locale === "ar") {
        if (diffSec < 60) relative = "الآن";
        else if (diffMin < 60) relative = `منذ ${diffMin} دقيقة`;
        else if (diffHour < 24) relative = `منذ ${diffHour} ساعة`;
        else if (diffDay < 7) relative = `منذ ${diffDay} أيام`;
        else relative = date.toLocaleDateString("ar-SA", { day: "2-digit", month: "short", year: "numeric" });
    } else {
        if (diffSec < 60) relative = "Baru saja";
        else if (diffMin < 60) relative = `${diffMin} menit lalu`;
        else if (diffHour < 24) relative = `${diffHour} jam lalu`;
        else if (diffDay === 1) relative = `Kemarin`;
        else if (diffDay < 7) relative = `${diffDay} hari lalu`;
        else if (diffWeek < 5) relative = `${diffWeek} minggu lalu`;
        else if (diffMonth < 12) relative = `${diffMonth} bulan lalu`;
        else relative = `${diffYear} tahun lalu`;
    }

    return { relative, full };
}

// Action dropdown component to avoid clipping issues
function ActionDropdown({ payment, onSendInvoice, onUpdateStatus }: { payment: PaymentData, onSendInvoice: () => void, onUpdateStatus: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setOpen(!open)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            >
                <MoreHorizontal className="w-5 h-5" />
            </button>
            {open && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                    <button 
                        onClick={() => { setOpen(false); onSendInvoice(); }}
                        className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2"
                    >
                        <Send className="w-3.5 h-3.5" />
                        Kirim Invoice
                    </button>
                    <button 
                        onClick={() => { setOpen(false); onUpdateStatus(); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Update Status
                    </button>
                </div>
            )}
        </div>
    )
}

function PaymentsContent() {
    const params = useParams();
    const router = useRouter();
    const lang = params?.lang as string || 'en';
    const { t } = useI18n()
    const [payments, setPayments] = useState<PaymentData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalItems, setTotalItems] = useState(0)
    const [isDemoMode, setIsDemoMode] = useState(false)
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'payments' | 'disputes'>('payments')

    // Search state
    const [searchInput, setSearchInput] = useState("")
    const [activeSearch, setActiveSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [methodFilter, setMethodFilter] = useState("")
    const [showFilterPanel, setShowFilterPanel] = useState(false)

    // Bulk action state
    const [selectedIds, setSelectedIds] = useState<Array<number | string>>([])

    // Modals state
    const [sendInvoiceModal, setSendInvoiceModal] = useState<PaymentData | null>(null)
    const [updateStatusModal, setUpdateStatusModal] = useState<PaymentData | null>(null)
    
    // Form fields
    const [invoiceIncludeReceipt, setInvoiceIncludeReceipt] = useState(true)
    const [statusUpdateValue, setStatusUpdateValue] = useState("paid")
    const [failureReason, setFailureReason] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Stats from API
    const [stats, setStats] = useState({
        revenue: 0,
        totalPayments: 0,
        pendingRefunds: 0,
        pendingCount: 0,
        completedCount: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

    // Export State
    const [isExporting, setIsExporting] = useState(false);

    // Fetch stats from API on mount
    useEffect(() => {
        let cancelled = false;
        const fetchStats = async () => {
            setStatsLoading(true);
            try {
                const [statsRes, revenueRes] = await Promise.allSettled([
                    paymentsApi.getStats(),
                    paymentsApi.getRevenueAnalytics(),
                ]);
                if (cancelled) return;
                const statsData = statsRes.status === 'fulfilled' ? statsRes.value : null;
                const revenueData = revenueRes.status === 'fulfilled' ? revenueRes.value : null;
                setStats(prev => ({
                    ...prev,
                    totalPayments: statsData?.totalPayments ?? statsData?.total ?? statsData?.count ?? prev.totalPayments,
                    revenue: revenueData?.totalRevenue ?? revenueData?.revenue ?? revenueData?.total ?? prev.revenue,
                    pendingCount: statsData?.pendingCount ?? statsData?.pending ?? prev.pendingCount,
                    completedCount: statsData?.completedCount ?? statsData?.completed ?? prev.completedCount,
                }));
            } catch {
                // fallback: data will be updated from fetchPayments
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        };
        fetchStats();
        return () => { cancelled = true; };
    }, []);

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            const params: PaymentSearchParams = {};
            if (activeSearch && !isNaN(Number(activeSearch))) {
                params.UserId = activeSearch;
            }
            if (statusFilter) {
                params.Status = statusFilter;
            }
            if (methodFilter) {
                params.PaymentMethod = methodFilter;
            }
            
            const res = await paymentsApi.exportCSV(params);
            if (!res.ok) throw new Error("Failed to export");
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Payments_Export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.warn("API Export failed, using fallback export:", err);
            // Fallback: Export current data in `payments`
            if (payments.length === 0) {
                showToast({ type: 'info', title: 'Tidak ada data', message: 'Tidak ada data untuk diexport.' });
                setIsExporting(false);
                return;
            }
            const headers = ["ID", "User", "Trainer", "Amount", "Status", "Payment Method", "Date"];
            const csvRows = [headers.join(",")];
            
            payments.forEach(p => {
                const row = [
                    p.id,
                    `"${p.userName || ''}"`,
                    `"${p.trainerName || ''}"`,
                    p.amount,
                    p.status,
                    p.paymentMethod,
                    p.createdAt || ''
                ];
                csvRows.push(row.join(","));
            });
            
            const csvContent = csvRows.join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Payments_Export_Fallback_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    };

    const fetchPayments = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params: PaymentSearchParams = {
                Page: page,
                PageSize: pageSize,
            }

            if (activeSearch) {
                if (!isNaN(Number(activeSearch))) {
                    params.UserId = activeSearch;
                }
            }

            if (statusFilter) {
                params.Status = statusFilter;
            }

            if (methodFilter) {
                params.PaymentMethod = methodFilter;
            }

            const response = await paymentsApi.search(params)
            
            const items = response.items || response.data || response || [];
            const dataArr = Array.isArray(items) ? items : [];
            setPayments(dataArr)
            setTotalItems(response.totalCount || response.totalItems || dataArr.length || 0)
            setIsDemoMode(false)
            
            // Only update revenue from payment data as fallback when stats API hasn't loaded real data
            if (statsLoading) {
                setStats(prev => ({
                    ...prev,
                    revenue: prev.revenue || dataArr.filter((p: any) => p.status === 'paid').reduce((a: number, b: any) => a + b.amount, 0) || 5000000,
                    totalPayments: prev.totalPayments || response.totalCount || dataArr.length || 0,
                    pendingRefunds: dataArr.filter((p: any) => p.status === 'refunded').length || 2,
                    pendingCount: prev.pendingCount || dataArr.filter((p: any) => ['pending', 'pending_payment'].includes((p.status || '').toLowerCase())).length,
                    completedCount: prev.completedCount || dataArr.filter((p: any) => ['paid', 'completed', 'lunas'].includes((p.status || '').toLowerCase())).length,
                }));
            }

        } catch (err: any) {
            console.warn("API Fetch Error:", err.message)
            setIsDemoMode(true)
            // Gunakan sim-billing-store (persistent localStorage) sebagai fallback
            let dummy = getSimPayments();

            if (activeSearch) {
                const searchLower = activeSearch.toLowerCase();
                dummy = dummy.filter(p =>
                    (p.userName && p.userName.toLowerCase().includes(searchLower)) ||
                    (p.trainerName && p.trainerName.toLowerCase().includes(searchLower)) ||
                    (p.paymentMethod && p.paymentMethod.toLowerCase().includes(searchLower)) ||
                    String(p.userId).includes(searchLower) ||
                    String(p.trainerId).includes(searchLower) ||
                    (p.bookingId && String(p.bookingId).includes(searchLower))
                );
            }

            if (statusFilter) {
                dummy = dummy.filter(p => p.status === statusFilter);
            }

            if (methodFilter) {
                dummy = dummy.filter(p => p.paymentMethod && p.paymentMethod.toLowerCase() === methodFilter.toLowerCase());
            }

            // Urutkan dummy data: pending di atas, lalu urut berdasarkan tanggal terbaru
            dummy.sort((a, b) => {
                const isAPending = a.status === 'pending' || a.status === 'pending_payment';
                const isBPending = b.status === 'pending' || b.status === 'pending_payment';
                
                if (isAPending && !isBPending) return -1;
                if (!isAPending && isBPending) return 1;
                
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                return timeB - timeA; // Descending (terbaru di atas)
            });

            setTotalItems(dummy.length)
            setPayments(dummy.slice((page - 1) * pageSize, page * pageSize))
            setStats(prev => ({
                ...prev,
                revenue: prev.revenue || dummy.filter(p => p.status === 'paid').reduce((a, b) => a + b.amount, 0),
                totalPayments: prev.totalPayments || dummy.length,
                pendingRefunds: dummy.filter(p => p.status === 'pending_refund').length,
                pendingCount: prev.pendingCount || dummy.filter(p => ['pending', 'pending_payment'].includes((p.status || '').toLowerCase())).length,
                completedCount: prev.completedCount || dummy.filter(p => ['paid', 'completed', 'lunas'].includes((p.status || '').toLowerCase())).length,
            }))
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, activeSearch, statusFilter, methodFilter])

    useEffect(() => {
        fetchPayments()
    }, [fetchPayments])

    const handleSearch = () => {
        setActiveSearch(searchInput)
        setPage(1)
        setSelectedIds([])
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    const handleSendInvoice = async (paymentId: string | number, userEmail?: string) => {
        setIsSubmitting(true)
        try {
            await paymentsApi.sendInvoice(paymentId, {
                email: userEmail || null,
                includeReceipt: invoiceIncludeReceipt ? 1 : 0
            })
            showToast({ type: 'success', title: 'Invoice Terkirim', message: `Invoice telah berhasil dikirim ke email user.` })
            setSendInvoiceModal(null)
            setInvoiceIncludeReceipt(true)
        } catch (err: any) {
            showToast({ type: 'error', title: 'Gagal Kirim Invoice', message: err?.message || 'Terjadi kesalahan saat mengirim invoice.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdateStatus = async (paymentId: string | number) => {
        setIsSubmitting(true)
        try {
            await paymentsApi.updateStatus(paymentId, {
                status: statusUpdateValue,
                failureReason: statusUpdateValue === 'failed' ? failureReason : undefined
            })
            showToast({ type: 'success', title: 'Status Diperbarui', message: `Status pembayaran berhasil diubah menjadi ${statusUpdateValue}.` })
            setUpdateStatusModal(null)
            setFailureReason("")
            fetchPayments()
        } catch (err: any) {
            // Update dummy data when API fails
            const bId = payments.find(p => p.id === paymentId)?.bookingId || paymentId;
            syncPaymentStatusFromOrder(bId, statusUpdateValue);
            showToast({ type: 'info', title: '[DEMO] Status Diperbarui', message: `Status pembayaran diubah menjadi ${statusUpdateValue} (simulasi lokal).` })
            setUpdateStatusModal(null)
            setFailureReason("")
            fetchPayments()
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === payments.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(payments.map(p => p.id))
        }
    }

    const toggleSelect = (id: number | string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const handleRowClick = (bookingId: number | string | undefined) => {
        if (!bookingId) return
        router.push(`/${lang}/billing/orders/${bookingId}?from=payment`)
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-10">
            <ToastContainer />
            {/* Header section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t("billing.payments.title", "Pembayaran")}
                </h1>
            </div>

            {/* Payments Tab Content — Stats (payments-only) */}
            {activeTab === 'payments' && (
            <div className="px-4 sm:px-6 lg:px-8 mt-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                    {/* Card: Total Pembayaran */}
                    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex-shrink-0">
                            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{t("billing.payments.summary.payments", "Pembayaran")}</p>
                            {statsLoading ? (
                                <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-0.5" />
                            ) : (
                                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                    {(stats.totalPayments || totalItems).toLocaleString('id-ID')}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Card: Payment Pending */}
                    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex-shrink-0">
                            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">Payment Pending</p>
                            {statsLoading ? (
                                <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-0.5" />
                            ) : (
                                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                    {(stats.pendingCount).toLocaleString('id-ID')}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Card: Selesai */}
                    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex-shrink-0">
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">Selesai</p>
                            {statsLoading ? (
                                <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-0.5" />
                            ) : (
                                <p className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white">
                                    {(stats.completedCount).toLocaleString('id-ID')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Shared Toolbar */}
            <div className="px-4 sm:px-6 lg:px-8 mt-4">
                <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                        {/* Kiri: Search & Filter */}
                        <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1 flex-1">
                            {/* Search */}
                            <div className="flex flex-1 sm:flex-none sm:w-64 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                                <div className="relative flex-1 bg-gray-50 dark:bg-gray-800">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari kode pesanan, metode..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white"
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors flex-shrink-0"
                                >
                                    {t("billing.payments.searchButton", "Cari")}
                                </button>
                            </div>

                            {/* Filter */}
                            <button
                                onClick={() => setShowFilterPanel(true)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border flex-shrink-0 ${
                                    statusFilter || methodFilter
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                        : "bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                            >
                                <Filter className="w-4 h-4" /> 
                                <span className="hidden sm:inline">Filter</span>
                                {(statusFilter || methodFilter) && (
                                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                                        {[statusFilter, methodFilter].filter(Boolean).length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Kanan: CSV & Tabs */}
                        <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2 justify-end">
                            {/* Export CSV */}
                            <button
                                onClick={handleExportCSV}
                                disabled={isExporting}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 border flex-shrink-0 ${
                                    isExporting
                                    ? "bg-gray-100 text-gray-400 cursor-wait dark:bg-gray-800 dark:text-gray-600 border-gray-200 dark:border-gray-700"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                                }`}
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden md:inline">{isExporting ? "Ekspor..." : "CSV"}</span>
                            </button>

                            {/* Tab Pills */}
                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                                <button
                                    onClick={() => setActiveTab('payments')}
                                    className={`px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                        activeTab === 'payments'
                                            ? 'bg-emerald-500 text-white'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    Payments List
                                </button>
                                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
                                <button
                                    onClick={() => setActiveTab('disputes')}
                                    className={`px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                        activeTab === 'disputes'
                                            ? 'bg-emerald-500 text-white'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    Disputes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Modal Dialog */}
                {showFilterPanel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowFilterPanel(false)}
                        />
                        {/* Dialog */}
                        <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Filter Pembayaran</h2>
                                </div>
                                <button
                                    onClick={() => setShowFilterPanel(false)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                                >
                                    <span className="text-lg leading-none">&times;</span>
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-5 py-5 space-y-6">
                                {/* Status */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Status Pembayaran</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { val: "", label: "Semua Status" },
                                            { val: "paid", label: "✓ Dibayar" },
                                            { val: "pending", label: "⏳ Menunggu" },
                                            { val: "failed", label: "✕ Gagal" },
                                            { val: "refunded", label: "↩ Dikembalikan" },
                                        ].map(opt => (
                                            <button
                                                key={opt.val}
                                                onClick={() => { setStatusFilter(opt.val); setPage(1); setSelectedIds([]); }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                    statusFilter === opt.val
                                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900'
                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:text-emerald-600'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                                {/* Metode */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Metode Pembayaran</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { val: "", label: "Semua" },
                                            { val: "GoPay", label: "GoPay" },
                                            { val: "OVO", label: "OVO" },
                                            { val: "DANA", label: "DANA" },
                                            { val: "Qurani Wallet", label: "Qurani Wallet" },
                                            { val: "Bank Transfer", label: "Bank Transfer" },
                                            { val: "Midtrans", label: "Midtrans" },
                                        ].map(opt => (
                                            <button
                                                key={opt.val}
                                                onClick={() => { setMethodFilter(opt.val); setPage(1); setSelectedIds([]); }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                    methodFilter === opt.val
                                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900'
                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:text-emerald-600'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                <button
                                    onClick={() => { setStatusFilter(""); setMethodFilter(""); setPage(1); }}
                                    disabled={!statusFilter && !methodFilter}
                                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                                >
                                    Reset Semua
                                </button>
                                <button
                                    onClick={() => setShowFilterPanel(false)}
                                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payments Tab — Data Table */}
            {activeTab === 'payments' && (
            <div className="px-4 sm:px-6 lg:px-8 pb-6">
                {/* Data Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {/* MOBILE CARD VIEW (<640px) — like SupportTicketsPage */}
                    <div className="space-y-3 sm:hidden p-3">
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="border-l-4 border-l-gray-200 dark:border-l-gray-700 border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-3 bg-white dark:bg-gray-800 animate-pulse">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-4 w-12 rounded" />
                                                <Skeleton className="h-5 w-16 rounded-full" />
                                            </div>
                                            <Skeleton className="h-7 w-7 rounded" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Skeleton className="h-3.5 w-3/4 rounded" />
                                            <Skeleton className="h-3 w-1/2 rounded" />
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Skeleton className="h-4 w-24 rounded" />
                                            <Skeleton className="h-4 w-16 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm">{t("billing.payments.empty", "Tidak ada pembayaran yang ditemukan.")}</p>
                            </div>
                        ) : (
                            payments.map((payment) => {
                                const statusBorderColor =
                                    payment.status === 'paid' ? 'border-l-emerald-500' :
                                    payment.status === 'pending' ? 'border-l-amber-400' :
                                    payment.status === 'refunded' ? 'border-l-blue-500' :
                                    payment.status === 'disputed' ? 'border-l-purple-500' :
                                    'border-l-rose-500';
                                return (
                                    <div
                                        key={payment.id}
                                        className={`border-l-4 ${statusBorderColor} border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm transition-all active:scale-[0.99] ${payment.bookingId ? 'cursor-pointer hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700' : ''}`}
                                    >
                                        <div className="p-4 space-y-3">
                                            {/* Row 1: Kode + Status + Action */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div onClick={e => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 dark:border-gray-600 focus:ring-emerald-500"
                                                            checked={selectedIds.includes(payment.id)}
                                                            onChange={() => toggleSelect(payment.id)}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleRowClick(payment.bookingId)}
                                                        className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                                                    >
                                                        #{payment.bookingId || payment.id}
                                                    </button>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                                                        payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                        payment.status === 'refunded' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        payment.status === 'disputed' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                    }`}>
                                                        {payment.status === 'paid' ? 'Lunas' : payment.status === 'pending' ? 'Pending' : payment.status === 'failed' ? 'Gagal' : payment.status === 'refunded' ? 'Refund' : payment.status === 'disputed' ? 'Bermasalah' : payment.status}
                                                    </span>
                                                </div>
                                                <div onClick={e => e.stopPropagation()}>
                                                    <ActionDropdown
                                                        payment={payment}
                                                        onSendInvoice={() => setSendInvoiceModal(payment)}
                                                        onUpdateStatus={() => {
                                                            setStatusUpdateValue(payment.status);
                                                            setUpdateStatusModal(payment);
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 2: User & Trainer info */}
                                            <div onClick={() => handleRowClick(payment.bookingId)} className="space-y-1">
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide w-14 flex-shrink-0">User</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (payment.userId) { router.push(`/${lang}/users/manage/${payment.userId}?tab=wallet`); } }}
                                                        title="Lihat profil"
                                                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left leading-tight"
                                                    >
                                                        {payment.userName || '-'}
                                                    </button>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide w-14 flex-shrink-0">Trainer</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (payment.trainerId) { router.push(`/${lang}/teachers/manage/${payment.trainerId}?from=payments`); } }}
                                                        title={payment.trainerId ? "Lihat profil guru" : ""}
                                                        className={`text-sm leading-tight text-left ${payment.trainerId ? 'font-semibold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : 'text-gray-700 dark:text-gray-300'}`}
                                                    >
                                                        {payment.trainerName || '-'}
                                                    </button>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide w-14 flex-shrink-0">Metode</span>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-tight">{payment.paymentMethod || '-'}</span>
                                                </div>
                                            </div>

                                            {/* Row 3: Amount + Date */}
                                            <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 dark:border-gray-700">
                                                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(payment.amount)}
                                                </span>
                                                <span
                                                    className="text-[11px] text-gray-400 dark:text-gray-500 border-b border-dashed border-gray-300 dark:border-gray-600 cursor-default"
                                                    title={formatTooltipDate(payment.updatedAt || payment.createdAt)}
                                                >
                                                    {timeAgo(payment.updatedAt || payment.createdAt).relative}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* Mobile Bulk Action Bar */}
                        {selectedIds.length > 0 && (
                            <div className="fixed bottom-4 left-4 right-4 z-40 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl shadow-2xl p-3 flex items-center justify-between">
                                <span className="text-sm font-semibold">{selectedIds.length} dipilih</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedIds([])}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 w-10 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                            checked={payments.length > 0 && selectedIds.length === payments.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3 font-semibold">Kode Pesanan</th>
                                    <th className="px-4 py-3 font-semibold">{t("billing.payments.table.user", "User")}</th>
                                    <th className="px-4 py-3 font-semibold">{t("billing.payments.table.trainer", "Trainer")}</th>
                                    <th className="px-4 py-3 font-semibold text-right pr-16">{t("billing.payments.table.amount", "Nominal")}</th>
                                    <th className="px-4 py-3 font-semibold text-center">{t("billing.payments.table.status", "Status")}</th>
                                    <th className="px-4 py-3 font-semibold">{t("billing.payments.table.paymentMethod", "Metode")}</th>
                                    <th className="px-4 py-3 font-semibold">{t("billing.payments.table.paymentDate", "Tgl Bayar")}</th>
                                    <th className="px-4 py-3 font-semibold text-center">{t("billing.payments.table.actions", "Aksi")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9}>
                                            <div className="space-y-3 py-4 px-6">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-4 animate-pulse">
                                                        <Skeleton className="h-3 w-full max-w-[60px]" />
                                                        <Skeleton className="h-3 w-full max-w-[100px]" />
                                                        <Skeleton className="h-3 w-full max-w-[80px]" />
                                                        <Skeleton className="h-3 w-full max-w-[80px]" />
                                                        <Skeleton className="h-3 w-full max-w-[70px]" />
                                                        <Skeleton className="h-3 w-full max-w-[90px]" />
                                                        <Skeleton className="h-3 w-full max-w-[60px]" />
                                                        <Skeleton className="h-3 w-full max-w-[60px]" />
                                                        <Skeleton className="h-3 w-full max-w-[50px]" />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ) : payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                            {t("billing.payments.empty", "Tidak ada pembayaran yang ditemukan.")}
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((payment) => {
                                        const tglBayar = timeAgo(payment.updatedAt || payment.createdAt);
                                        return (
                                        <tr
                                            key={payment.id}
                                            onClick={() => handleRowClick(payment.bookingId)}
                                            className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${payment.bookingId ? 'cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                        >
                                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                                    checked={selectedIds.includes(payment.id)}
                                                    onChange={() => toggleSelect(payment.id)}
                                                />
                                            </td>
                                            {/* Kode Pesanan */}
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                    #{payment.bookingId || payment.id}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={(e) => { e.stopPropagation(); if (payment.userId) { router.push(`/${lang}/users/manage/${payment.userId}?tab=wallet`); } }} title="Lihat profil pengguna" className="font-medium text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left">{payment.userName || '-'}</button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (payment.trainerId) { router.push(`/${lang}/teachers/manage/${payment.trainerId}?from=payments`); } }}
                                                    title={payment.trainerId ? "Lihat profil guru" : ""}
                                                    className={`text-left ${payment.trainerId ? 'font-medium text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : 'font-medium text-gray-900 dark:text-white'}`}
                                                >
                                                    {payment.trainerName || '-'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 text-right pr-16">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                                                    payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    payment.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    payment.status === 'refunded' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                }`}>
                                                    {payment.status === 'paid' ? 'Lunas' : payment.status === 'pending' ? 'Pending' : payment.status === 'failed' ? 'Gagal' : payment.status === 'refunded' ? 'Refund' : payment.status === 'disputed' ? 'Bermasalah' : payment.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{payment.paymentMethod || '-'}</td>
                                            {/* Tgl Bayar - Relative time + tooltip */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {(() => { const t2 = timeAgo(payment.updatedAt || payment.createdAt); return (
                                                    <span
                                                        title={formatTooltipDate(payment.updatedAt || payment.createdAt)}
                                                        className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default border-b border-dashed border-gray-400 dark:border-gray-500 pb-px"
                                                    >{t2.relative}</span>
                                                ); })()}
                                            </td>
                                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                <ActionDropdown 
                                                    payment={payment}
                                                    onSendInvoice={() => setSendInvoiceModal(payment)}
                                                    onUpdateStatus={() => {
                                                        setStatusUpdateValue(payment.status);
                                                        setUpdateStatusModal(payment);
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <SmartPagination
                        total={totalItems}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
                        loading={loading}
                    />
                </div>
            </div>
            )}

            {/* Disputes Tab Content */}
            {activeTab === 'disputes' && (
                <div className="px-4 sm:px-6 lg:px-8 mt-4">
                    <DisputesTab />
                </div>
            )}

            {/* Send Invoice Modal */}
            {sendInvoiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Kirim Invoice</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Kirim bukti pembayaran ke email user</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Info payment */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl text-sm border border-blue-100 dark:border-blue-800/50 space-y-1">
                                <p className="text-gray-500 dark:text-gray-400">Payment ID: <span className="font-semibold text-gray-900 dark:text-white">#{sendInvoiceModal.id}</span></p>
                                <p className="text-gray-500 dark:text-gray-400">Nominal: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sendInvoiceModal.amount)}</span></p>
                                <p className="text-gray-500 dark:text-gray-400">User: <span className="font-semibold text-gray-900 dark:text-white">{sendInvoiceModal.userName}</span></p>
                            </div>

                            {/* Email field (read-only dari data user) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Email Tujuan <span className="text-xs text-gray-400">(dari akun user)</span>
                                </label>
                                <input
                                    type="email"
                                    value={sendInvoiceModal.userName ? `(email ${sendInvoiceModal.userName})` : 'Email user terdaftar'}
                                    readOnly
                                    disabled
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Invoice akan dikirim ke email yang terdaftar pada akun user.</p>
                            </div>

                            {/* Toggle include receipt */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sertakan Struk / Receipt</p>
                                    <p className="text-xs text-gray-400">Lampirkan detail transaksi ke email</p>
                                </div>
                                <button
                                    onClick={() => setInvoiceIncludeReceipt(!invoiceIncludeReceipt)}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                                        invoiceIncludeReceipt ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                                        invoiceIncludeReceipt ? 'translate-x-5' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleSendInvoice(sendInvoiceModal.id)}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSubmitting ? 'Mengirim...' : 'Kirim Sekarang'}
                                </button>
                                <button
                                    onClick={() => { setSendInvoiceModal(null); setInvoiceIncludeReceipt(true); }}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Status Modal */}
            {updateStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {t("billing.payments.modal.updateStatusTitle", "Update Status")}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-sm mb-4 border border-gray-100 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400">Payment ID: <span className="font-medium text-gray-900 dark:text-white">#{updateStatusModal.id}</span></p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Status
                                </label>
                                <select
                                    value={statusUpdateValue}
                                    onChange={(e) => setStatusUpdateValue(e.target.value)}
                                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                                >
                                    <option value="paid">{t("billing.payments.status.paid", "Dibayar")}</option>
                                    <option value="pending">{t("billing.payments.status.pending", "Menunggu")}</option>
                                    <option value="failed">{t("billing.payments.status.failed", "Gagal")}</option>
                                    <option value="refunded">{t("billing.payments.status.refunded", "Dikembalikan")}</option>
                                    <option value="disputed">{t("billing.payments.status.disputed", "Bermasalah")}</option>
                                </select>
                            </div>

                            {statusUpdateValue === 'failed' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t("billing.payments.modal.failureReason", "Alasan Gagal (Wajib)")}
                                    </label>
                                    <textarea
                                        value={failureReason}
                                        onChange={(e) => setFailureReason(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        rows={2}
                                        required
                                    />
                                </div>
                            )}
                            
                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => handleUpdateStatus(updateStatusModal.id)}
                                    disabled={isSubmitting || (statusUpdateValue === 'failed' && !failureReason.trim())}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors"
                                >
                                    {t("billing.payments.modal.submit", "Simpan")}
                                </button>
                                <button 
                                    onClick={() => setUpdateStatusModal(null)}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium transition-colors"
                                >
                                    {t("billing.payments.modal.cancel", "Batal")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default function PaymentsPage() {
    return (
                <PaymentsContent />
    )
}
