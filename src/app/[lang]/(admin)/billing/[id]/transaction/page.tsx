"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { walletApi } from "@/lib/api";
import { getSimTransactions } from "@/lib/sim-wallet-store";
import { ArrowLeft, ArrowRight, CheckCircle, Clock, XCircle, FileText, User, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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
    if (type === 1) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">TopUp</span>;
    if (type === 2) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Withdraw</span>;
    if (type === 3) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">Transfer</span>;
    if (type === 4) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Payment</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Lainnya</span>;
}

function getStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase();
    if (s === "success" || s === "completed" || s === "approved") {
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle className="w-3.5 h-3.5" /> Berhasil</span>;
    }
    if (s === "pending" || s === "waiting") {
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><Clock className="w-3.5 h-3.5" /> Pending</span>;
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"><XCircle className="w-3.5 h-3.5" /> Gagal</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">{status || "—"}</span>;
}

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

export default function TransactionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const txId = params?.id as string;
    const lang = params?.lang as string;

    const [loading, setLoading] = useState(true);
    const [txData, setTxData] = useState<any>(null);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = 'id-ID';

    useEffect(() => {
        if (!txId) return;

        const fetchTx = async () => {
            setLoading(true);
            try {
                // Try admin API first
                try {
                    const res = await walletApi.getTransactionById?.(txId); // Adjust to proper admin API if needed
                    const detail = res?.data || res;
                    if (detail && detail.id) {
                        setTxData(detail);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to fetch from API, trying dummy data");
                }

                // Fallback to dummy data
                const dummyTxs = getSimTransactions();
                const found = dummyTxs.find((tx: any) => String(tx.id) === txId);
                
                if (found) {
                    setTxData(found);
                } else {
                    setTxData(null); // Not found
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTx();
    }, [txId]);

    return (
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 min-h-screen">
                <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.back()}
                            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Detail Transaksi</h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-mono">ID: #{txId}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            <Skeleton className="h-40 w-full rounded-2xl" />
                            <Skeleton className="h-[400px] w-full rounded-2xl" />
                        </div>
                    ) : !txData ? (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Transaksi Tidak Ditemukan</h2>
                            <p className="text-gray-500 mb-6">Maaf, data transaksi dengan ID #{txId} tidak dapat ditemukan.</p>
                            <button 
                                onClick={() => router.back()}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors"
                            >
                                Kembali
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* Amount Card */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-center relative overflow-hidden">
                                {/* Decorative background elements */}
                                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 ${txData.amount < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 ${txData.amount < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                
                                <div className="relative z-10">
                                    <div className="text-sm text-gray-500 font-bold tracking-widest uppercase mb-3 flex items-center justify-center gap-2">
                                        Nominal Transaksi
                                    </div>
                                    <div className={`text-4xl sm:text-5xl font-black mb-6 tracking-tight ${txData.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {txData.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(txData.amount || 0))}
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        {getStatusBadge(txData.status)}
                                        {getTxTypeBadge(txData.type)}
                                    </div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                <div className="p-6 divide-y divide-gray-100 dark:divide-gray-800">
                                    
                                    {/* User */}
                                    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <User className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Pengguna</span>
                                        </div>
                                        <Link 
                                            href={`/${lang}/billing/${txData.userId}/wallet`}
                                            className="text-left sm:text-right p-3 sm:p-0 bg-gray-50 sm:bg-transparent dark:bg-gray-800/50 sm:dark:bg-transparent rounded-xl sm:rounded-none hover:opacity-80 transition-opacity flex sm:block items-center gap-3"
                                        >
                                            <div className="w-10 h-10 sm:hidden rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
                                                {txData.user?.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white sm:text-base text-sm hover:text-emerald-600 dark:hover:text-emerald-400">
                                                    {txData.user?.name || `User ID: ${txData.userId}`}
                                                </div>
                                                {txData.user?.username && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        @{txData.user.username}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    </div>

                                    {/* Method */}
                                    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <CreditCard className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Metode Pembayaran</span>
                                        </div>
                                        <div className="font-semibold text-gray-900 dark:text-white text-left sm:text-right bg-gray-50 sm:bg-transparent dark:bg-gray-800 sm:dark:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none">
                                            {getPaymentMethodName(txData.paymentMethod)}
                                        </div>
                                    </div>

                                    {/* Date */}
                                    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Waktu Transaksi</span>
                                        </div>
                                        <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent dark:bg-gray-800 sm:dark:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none">
                                            <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                                                {formatDate(txData.createdAt, 'long', tz, locale)}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {formatDate(txData.createdAt, 'relative', tz, locale)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reference */}
                                    {txData.referenceId && (
                                        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <FileText className="w-4 h-4" />
                                                <span className="font-semibold text-sm">Nomor Referensi</span>
                                            </div>
                                            <div className="font-mono text-sm text-gray-900 dark:text-white text-left sm:text-right bg-gray-50 sm:bg-transparent dark:bg-gray-800 sm:dark:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none">
                                                {txData.referenceId}
                                            </div>
                                        </div>
                                    )}

                                    {/* Description */}
                                    <div className="py-5">
                                        <div className="font-semibold text-sm text-gray-500 mb-2">Deskripsi</div>
                                        <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white font-medium text-sm sm:text-base leading-relaxed">
                                            {txData.description || 'Tidak ada deskripsi'}
                                        </div>
                                    </div>

                                    {/* Balance Changes */}
                                    <div className="py-5">
                                        <div className="font-semibold text-sm text-gray-500 mb-3">Perubahan Saldo</div>
                                        <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
                                            <div className="relative z-10 w-2/5">
                                                <div className="text-xs text-gray-500 mb-1 font-medium">Saldo Awal</div>
                                                <div className="font-bold text-gray-900 dark:text-white text-sm sm:text-lg truncate">
                                                    {formatCurrency(txData.balanceBefore || 0)}
                                                </div>
                                            </div>
                                            
                                            <div className="relative z-10 flex flex-col items-center justify-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${txData.amount < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'}`}>
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                            
                                            <div className="relative z-10 text-right w-2/5">
                                                <div className="text-xs text-gray-500 mb-1 font-medium">Saldo Akhir</div>
                                                <div className="font-bold text-gray-900 dark:text-white text-sm sm:text-lg truncate">
                                                    {formatCurrency(txData.balanceAfter || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
    );
}
