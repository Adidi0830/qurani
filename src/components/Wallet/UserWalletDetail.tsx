"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Wallet, History, Loader2, AlertTriangle, FileText,
    ChevronDown, SlidersHorizontal, X, Printer, GraduationCap,
    ArrowRight, Clock, CheckCircle2, ExternalLink,
    ArrowDownLeft, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    getSimWallet,
    updateSimWallet,
    getSimWalletBalances,
    getSimTransactions,
    getSimPayouts
} from "@/lib/sim-wallet-store";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, locale: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp");
}

function formatDate(
    dateString: string | undefined,
    format: "relative" | "long" | "short" = "long",
    tz: string = "UTC",
    locale: string = "id-ID",
    t?: (key: string, fallback?: string, params?: Record<string, string | number>) => string
) {
    if (!dateString) return "—";
    try {
        const date = new Date(dateString);
        if (format === "long")
            return new Intl.DateTimeFormat(locale, {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: tz,
            }).format(date);

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diffInSeconds < 60)
            return t ? t("billing.wallet_detail.rel.just_now", "Baru saja") : "Baru saja";
        if (diffInSeconds < 3600)
            return t
                ? t("billing.wallet_detail.rel.minutes", "{{count}} menit lalu", {
                    count: Math.floor(diffInSeconds / 60),
                })
                : `${Math.floor(diffInSeconds / 60)} menit lalu`;
        if (diffInSeconds < 86400)
            return t
                ? t("billing.wallet_detail.rel.hours", "{{count}} jam lalu", {
                    count: Math.floor(diffInSeconds / 3600),
                })
                : `${Math.floor(diffInSeconds / 3600)} jam lalu`;
        if (diffInSeconds < 2592000)
            return t
                ? t("billing.wallet_detail.rel.days", "{{count}} hari lalu", {
                    count: Math.floor(diffInSeconds / 86400),
                })
                : `${Math.floor(diffInSeconds / 86400)} hari lalu`;
        return new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeZone: tz,
        }).format(date);
    } catch {
        return dateString;
    }
}

function formatDateShort(dateString: string | undefined, locale: string = "id-ID") {
    if (!dateString) return "—";
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    } catch {
        return dateString;
    }
}

function formatDateInput(dateString: string | undefined) {
    if (!dateString) return "";
    try {
        const d = new Date(dateString);
        return d.toISOString().slice(0, 10);
    } catch {
        return "";
    }
}

function getTxTypeBadge(
    type: number | undefined,
    t: (key: string, fallback?: string, params?: Record<string, string | number>) => string
) {
    if (type === 1)
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {t("billing.wallet_detail.tx_types.topup", "TopUp")}
            </span>
        );
    if (type === 2)
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                {t("billing.wallet_detail.tx_types.withdraw", "Withdraw")}
            </span>
        );
    if (type === 3)
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                {t("billing.wallet_detail.tx_types.transfer", "Transfer")}
            </span>
        );
    if (type === 4)
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                {t("billing.wallet_detail.tx_types.payment", "Payment")}
            </span>
        );
    return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {t("billing.wallet_detail.tx_types.other", "Lainnya")}
        </span>
    );
}

function getStatusBadge(
    status: string | undefined,
    t: (key: string, fallback?: string, params?: Record<string, string | number>) => string
) {
    const s = (status || "").toLowerCase();
    if (s === "success" || s === "completed" || s === "approved") {
        return (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {t("billing.wallet_detail.tx_status.success", "Berhasil")}
            </span>
        );
    }
    if (s === "pending" || s === "waiting") {
        return (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {t("billing.wallet_detail.tx_status.pending", "Pending")}
            </span>
        );
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return (
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                {t("billing.wallet_detail.tx_status.failed", "Gagal")}
            </span>
        );
    }
    return (
        <span className="text-[10px] font-bold text-gray-500">{status || "—"}</span>
    );
}

function getTxTypeName(
    type: number | undefined,
    t: (key: string, fallback?: string) => string
): string {
    if (type === 1) return t("billing.wallet_detail.tx_types.topup", "TopUp");
    if (type === 2) return t("billing.wallet_detail.tx_types.withdraw", "Withdraw");
    if (type === 3) return t("billing.wallet_detail.tx_types.transfer", "Transfer");
    if (type === 4) return t("billing.wallet_detail.tx_types.payment", "Payment");
    return t("billing.wallet_detail.tx_types.other", "Lainnya");
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserWalletDetailProps {
    userId: string;
    userData?: any;
    hideProfileCard?: boolean;
    hideLimitFeature?: boolean;
    /** Jika true, card Saldo Pending bisa diklik untuk melihat data payout guru */
    isTeacher?: boolean;
    /** Preview mode: hanya tampilkan 10 mutasi terbaru di profile, dengan tombol Lihat Semua */
    preview?: boolean;
}

const MUTASI_PREVIEW = 10;

type ViewMode = "list" | "mutasi";

// ─── Main Component ────────────────────────────────────────────────────────────

export function UserWalletDetail({
    userId,
    userData,
    hideProfileCard = false,
    hideLimitFeature = false,
    isTeacher = false,
    preview = true,
}: UserWalletDetailProps) {
    const router = useRouter();
    const pathname = usePathname();
    const lang = pathname?.split("/")[1] || "en";
    const { t, locale } = useI18n();
    const isRTL = locale === "ar";

    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // ─── View Mode ──────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<ViewMode>("list");

    // ─── Filters ────────────────────────────────────────────────────────────
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // ─── Modals ─────────────────────────────────────────────────────────────
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [limits, setLimits] = useState({
        dailyTopupLimit: "",
        dailyWithdrawLimit: "",
        dailyTransferLimit: "",
        minWithdrawAmount: "",
        maxBalance: "",
    });
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [suspendReason, setSuspendReason] = useState("");
    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);

    // ─── Payout Popup (untuk user yang juga guru) ────────────────────────────
    const [isPayoutPopupOpen, setIsPayoutPopupOpen] = useState(false);
    const [payoutRecords, setPayoutRecords] = useState<any[]>([]);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // ─── Print ref ──────────────────────────────────────────────────────────
    const printRef = useRef<HTMLDivElement>(null);

    // ─── Data Fetching ───────────────────────────────────────────────────────
    const fetchData = () => {
        setLoading(true);
        try {
            const wInfo = getSimWallet(userId);
            const wBalances = getSimWalletBalances(userId);
            const allTxs = getSimTransactions();
            const txData = allTxs.filter(
                (tx: any) => String(tx.userId) === String(userId)
            );
            setWalletData({ ...wInfo, ...wBalances });
            setTransactions(txData);
        } catch (err) {
            console.error("Error fetching wallet data:", err);
            toast.error(t("billing.wallet_detail.toasts.load_error", "Gagal memuat data wallet"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchData();
    }, [userId]);

    // Load payout data jika user adalah guru
    useEffect(() => {
        if (isTeacher && userId) {
            const records = getSimPayouts(userId);
            setPayoutRecords(records);
        }
    }, [isTeacher, userId]);

    // Close filter popover on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ─── Filtered Transactions ────────────────────────────────────────────────
    const filteredTransactions = useMemo(() => {
        let txs = [...transactions];
        if (filterDateFrom) {
            const from = new Date(filterDateFrom);
            from.setHours(0, 0, 0, 0);
            txs = txs.filter((tx) => new Date(tx.createdAt) >= from);
        }
        if (filterDateTo) {
            const to = new Date(filterDateTo);
            to.setHours(23, 59, 59, 999);
            txs = txs.filter((tx) => new Date(tx.createdAt) <= to);
        }
        if (filterType !== "all") {
            const typeNum = parseInt(filterType, 10);
            txs = txs.filter((tx) => tx.type === typeNum);
        }
        return txs;
    }, [transactions, filterDateFrom, filterDateTo, filterType]);

    // ─── Mutasi Bank: running balance (baris terbaru = activeBalance) ──────────
    const mutasiRows = useMemo(() => {
        if (!walletData) return [];
        // Sort ascending (oldest first) to compute running balance
        const ascending = [...filteredTransactions].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        let running = 0;
        const withBalance = ascending.map((tx) => {
            running += tx.amount;
            return { ...tx, runningBalance: Math.max(0, running) };
        });

        // Adjust so the latest row's balance = activeBalance
        // The actual activeBalance is authoritative, so we compute the delta
        const activeBalance: number = walletData.activeBalance ?? walletData.balance ?? 0;
        if (withBalance.length > 0) {
            const lastComputedBalance = withBalance[withBalance.length - 1].runningBalance;
            const delta = activeBalance - lastComputedBalance;
            return withBalance.map((tx) => ({
                ...tx,
                runningBalance: Math.max(0, tx.runningBalance + delta),
            })).reverse(); // descending for display
        }
        return [];
    }, [filteredTransactions, walletData]);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleSuspendWallet = () => {
        if (!suspendReason.trim()) {
            toast.error(
                t("billing.wallet_detail.toasts.suspend_reason_required", "Alasan penangguhan wajib diisi")
            );
            return;
        }
        setIsProcessing(true);
        try {
            updateSimWallet(userId, { status: "suspended", suspendReason });
            fetchData();
            toast.success(
                t("billing.wallet_detail.toasts.suspend_success", "Status dompet berhasil diubah menjadi Suspended")
            );
            setIsSuspendModalOpen(false);
        } catch {
            toast.error(t("billing.wallet_detail.toasts.suspend_error", "Gagal melakukan suspend dompet"));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleActivateWallet = () => {
        setIsProcessing(true);
        try {
            updateSimWallet(userId, { status: "active", suspendReason: null });
            fetchData();
            toast.success(
                t("billing.wallet_detail.toasts.activate_success", "Status dompet berhasil diaktifkan kembali")
            );
            setIsActivateModalOpen(false);
        } catch {
            toast.error(t("billing.wallet_detail.toasts.activate_error", "Gagal mengaktifkan dompet"));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveLimit = () => {
        const parsedLimits = {
            dailyTopupLimit: parseInt(limits.dailyTopupLimit.replace(/\D/g, ""), 10) || null,
            dailyWithdrawLimit: parseInt(limits.dailyWithdrawLimit.replace(/\D/g, ""), 10) || null,
            dailyTransferLimit: parseInt(limits.dailyTransferLimit.replace(/\D/g, ""), 10) || null,
            minWithdrawAmount: parseInt(limits.minWithdrawAmount.replace(/\D/g, ""), 10) || null,
            maxBalance: parseInt(limits.maxBalance.replace(/\D/g, ""), 10) || null,
        };
        setIsProcessing(true);
        try {
            updateSimWallet(userId, { limits: parsedLimits });
            fetchData();
            toast.success(
                t("billing.wallet_detail.toasts.limit_success", "Limit wallet berhasil diperbarui")
            );
            setIsLimitModalOpen(false);
        } catch {
            toast.error(t("billing.wallet_detail.toasts.limit_error", "Gagal memperbarui limit wallet"));
        } finally {
            setIsProcessing(false);
        }
    };

    const openLimitModal = () => {
        const currentLimits = walletData?.limits || {};
        setLimits({
            dailyTopupLimit: currentLimits.dailyTopupLimit?.toString() || "",
            dailyWithdrawLimit: currentLimits.dailyWithdrawLimit?.toString() || "",
            dailyTransferLimit: currentLimits.dailyTransferLimit?.toString() || "",
            minWithdrawAmount: currentLimits.minWithdrawAmount?.toString() || "",
            maxBalance: currentLimits.maxBalance?.toString() || "",
        });
        setIsLimitModalOpen(true);
    };

    const handleExportPDF = () => {
        const userName = userData?.name || userData?.username || userId;
        // userEmail tetap tersedia di komponen, tidak ditampilkan di versi cetak
        const _userEmail = userData?.email || "";
        const generatedAt = new Date().toLocaleString(locale, {
            day: "2-digit", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("Popup diblokir browser. Izinkan popup untuk ekspor PDF.");
            return;
        }

        // Compute totals
        const totalDebit = mutasiRows.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);
        const totalCredit = mutasiRows.reduce((sum, tx) => sum + (tx.amount >= 0 ? tx.amount : 0), 0);
        const activeBalance: number = walletData?.activeBalance ?? walletData?.balance ?? 0;


        const walletId = walletData?.id || `W-${userId}`;

        // ── Rentang periode dari data transaksi aktual ──────────────────────────
        const fmtShortDate = (d: Date) =>
            d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
        const allDates = mutasiRows
            .map((tx: any) => new Date(tx.createdAt).getTime())
            .filter((ts: number) => !isNaN(ts));
        const minDate = allDates.length ? new Date(Math.min(...allDates)) : null;
        const maxDate = allDates.length ? new Date(Math.max(...allDates)) : null;
        const periodeDisplay =
            filterDateFrom && filterDateTo
                ? `${fmtShortDate(new Date(filterDateFrom))} \u2013 ${fmtShortDate(new Date(filterDateTo))}`
                : filterDateFrom
                ? `Mulai ${fmtShortDate(new Date(filterDateFrom))}`
                : filterDateTo
                ? `s/d ${fmtShortDate(new Date(filterDateTo))}`
                : (minDate && maxDate)
                ? (minDate.getTime() === maxDate.getTime()
                    ? fmtShortDate(minDate)
                    : `${fmtShortDate(minDate)} \u2013 ${fmtShortDate(maxDate)}`)
                : "Seluruh Riwayat Transaksi";

        // ── Format tanggal satu baris dd/MM/yyyy HH:mm ─────────────────────────
        const fmtTableDate = (dateString: string) => {
            try {
                const d = new Date(dateString);
                const dd = String(d.getDate()).padStart(2, "0");
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const yyyy = d.getFullYear();
                const hh = String(d.getHours()).padStart(2, "0");
                const mn = String(d.getMinutes()).padStart(2, "0");
                return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
            } catch { return dateString; }
        };

        // ── Format angka tanpa prefix "Rp" ─────────────────────────────────────
        const fmtNum = (n: number) =>
            new Intl.NumberFormat(locale, {
                minimumFractionDigits: 0, maximumFractionDigits: 0,
            }).format(n);

        // ── Baris HTML tabel compact ────────────────────────────────────────────
        const rowsHtml = mutasiRows.length === 0
            ? "<tr><td colspan='5' style='text-align:center;padding:16px;font-size:10px'>Tidak ada data mutasi pada periode ini</td></tr>"
            : mutasiRows.map((tx: any) => {
                const typeName = getTxTypeName(tx.type, t);
                const desc = tx.description ? ` \u2013 ${tx.description}` : "";
                const ref = tx.referenceId || `#${tx.id}`;
                const debitStr = tx.amount < 0 ? fmtNum(Math.abs(tx.amount)) : "\u2013";
                const creditStr = tx.amount >= 0 ? fmtNum(tx.amount) : "\u2013";
                const balStr = fmtNum(tx.runningBalance);
                return [
                    "<tr>",
                    `<td style="white-space:nowrap">${fmtTableDate(tx.createdAt)}</td>`,
                    `<td><span class="tx-desc">${typeName}${desc}</span> <span class="tx-ref">${ref}</span></td>`,
                    `<td class="r">${debitStr}</td>`,
                    `<td class="r">${creditStr}</td>`,
                    `<td class="r">${balStr}</td>`,
                    "</tr>",
                ].join("");
            }).join("");


        const writeDoc = (logoBase64: string) => {
            const logoTag = logoBase64
                ? `<img src="${logoBase64}" alt="Qurani" class="hdr-logo"/>`
                : `<span class="hdr-logo-text">QURANI</span>`;

            const totalDebitStr = fmtNum(totalDebit);
            const totalCreditStr = fmtNum(totalCredit);
            const activeBalStr = fmtNum(activeBalance);

            printWindow.document.write(`<!DOCTYPE html>
<html lang="${locale}" dir="${isRTL ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Mutasi Rekening \u2014 ${userName}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,'Helvetica Neue',sans-serif;background:#fff;color:#000;padding:32px;font-size:11px;line-height:1.4}
.toolbar{position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;align-items:center;gap:8px;background:#064e3b;border-radius:30px;padding:6px 14px 6px 12px;box-shadow:0 4px 16px rgba(6,78,59,.3)}
.btn-print{background:#fff;color:#064e3b;border:none;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;cursor:pointer}
.btn-print:hover{background:#d1fae5}
.toolbar-lbl{color:rgba(167,243,208,.85);font-size:11px}
.pw{max-width:780px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:7px;margin-bottom:7px;border-bottom:1px solid #ccc}
.hdr-left{display:flex;align-items:center;gap:10px}
.hdr-logo{width:100px;height:auto;object-fit:contain;filter:grayscale(100%)}
.hdr-logo-text{font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#000}
.hdr-title{font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
.info-wrap{display:grid;grid-template-columns:1fr 1fr;gap:0;padding:4px 0;margin-bottom:10px}
.info-item{display:flex;gap:6px;padding:2px 6px;font-size:10.5px;align-items:baseline}
.info-lbl{color:#555;min-width:70px;white-space:nowrap;flex-shrink:0}
.info-val{color:#000;font-weight:500}
table.mutasi{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10px}
table.mutasi thead th{font-weight:600;text-align:left;padding:4px 6px;border-bottom:1px solid #aaa;border-top:1px solid #aaa;white-space:nowrap;background:none}
table.mutasi thead th.r{text-align:right}
table.mutasi tbody td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:middle}
table.mutasi tbody td.r{text-align:right}
.tx-desc{font-weight:normal;font-size:10px}
.tx-ref{font-size:9px;color:#888}
.summary-bar{display:flex;justify-content:flex-end;gap:20px;padding:5px 6px;border-top:1px solid #aaa;margin-bottom:12px;font-size:10.5px}
.sum-item{display:flex;gap:4px;align-items:baseline}
.sum-lbl{color:#555}
.sum-val{color:#000}
.sum-val.bold{font-weight:600}
.ftr{font-size:9px;color:#777;text-align:center;margin-top:10px;padding-top:6px}
@media print{
  -webkit-print-color-adjust:economy;
  print-color-adjust:economy;
  body{padding:0;font-size:11px;background:#fff;color:#000}
  .toolbar{display:none!important}
  .pw{max-width:100%}
  table.mutasi thead{display:table-header-group}
  table.mutasi tr{page-break-inside:avoid}
  *{background-color:transparent!important;box-shadow:none!important}
  .hdr-logo{filter:grayscale(100%)}
  @page{size:A4;margin:12mm}
}
</style>
</head>
<body>
<div class="toolbar">
  <span class="toolbar-lbl">Siap dicetak / simpan PDF</span>
  <button class="btn-print" onclick="window.print()">\u{1F5A8}\uFE0F Cetak / Simpan PDF</button>
</div>
<div class="pw">

  <!-- HEADER: satu baris, logo kecil kiri + judul kanan -->
  <div class="hdr">
    <div class="hdr-left">
      ${logoTag}
    </div>
    <div class="hdr-title">MUTASI SALDO</div>
  </div>

  <!-- INFO NASABAH: 2 kolom ringkas, tanpa border tebal, email disembunyikan -->
  <div class="info-wrap">
    <div class="info-item"><span class="info-lbl">Nama</span><span class="info-val">${userName}</span></div>
    <div class="info-item"><span class="info-lbl">No</span><span class="info-val">${walletId}</span></div>
    <div class="info-item"><span class="info-lbl">Periode</span><span class="info-val">${periodeDisplay}</span></div>
    <div class="info-item"><span class="info-lbl">Tgl Cetak</span><span class="info-val">${generatedAt}</span></div>
  </div>

  <!-- TABEL MUTASI: compact, font 10px, padding 4px -->
  <table class="mutasi">
    <thead>
      <tr>
        <th style="width:100px">Tanggal</th>
        <th>Keterangan</th>
        <th class="r" style="width:88px">Debit (Rp)</th>
        <th class="r" style="width:88px">Kredit (Rp)</th>
        <th class="r" style="width:88px">Saldo (Rp)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <!-- RINGKASAN: satu baris ringkas -->
  <div class="summary-bar">
    <div class="sum-item"><span class="sum-lbl">Total Debit:</span><span class="sum-val">${totalDebitStr}</span></div>
    <div class="sum-item"><span class="sum-lbl">Total Kredit:</span><span class="sum-val">${totalCreditStr}</span></div>
    <div class="sum-item"><span class="sum-lbl">Saldo Akhir:</span><span class="sum-val bold">${activeBalStr}</span></div>
  </div>

  <!-- FOOTER: satu baris kecil -->
  <div class="ftr">Dokumen ini dicetak secara elektronik melalui sistem myQurani.com dan sah tanpa tanda tangan dan cap basah. - myQurani.com @ 2026</div>
</div>
</body>
</html>`);
            printWindow.document.close();
        };

        // Convert logo to base64 so it renders correctly in the blank popup window
        fetch("/icons/Qurani%20-%20Logo%20Green.png")
            .then((res) => res.blob())
            .then((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => writeDoc(reader.result as string);
                reader.onerror = () => writeDoc("");
                reader.readAsDataURL(blob);
            })
            .catch(() => writeDoc(""));
    };

    const hasActiveFilters = filterDateFrom || filterDateTo || filterType !== "all";


    const clearFilters = () => {
        setFilterDateFrom("");
        setFilterDateTo("");
        setFilterType("all");
    };

    // ─── Loading / Empty states ───────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6">
                {!hideProfileCard && <Skeleton className="h-24 w-full rounded-2xl" />}
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    if (!walletData) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <AlertTriangle className="w-12 h-12 text-amber-400" />
                </div>
                <p className="text-base font-medium text-gray-600 dark:text-gray-400">
                    {t("billing.wallet_detail.title", "Data Dompet User tidak ditemukan")}
                </p>
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" dir={isRTL ? "rtl" : "ltr"}>

            {/* Profile Card with Wallet Status & ID */}
            {!hideProfileCard && userData && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-sm">
                            {userData?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{userData?.name}</h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                {userData?.username && (
                                    <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                                        @{userData.username.replace("@", "")}
                                    </span>
                                )}
                                {userData?.email && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {userData.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-1 text-right">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {t("billing.wallet_detail.status_label", "Status:")}
                            </span>
                            <Badge
                                variant="outline"
                                className={`capitalize ${walletData.status?.toLowerCase() === "suspended"
                                    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                    }`}
                            >
                                {walletData.status?.toLowerCase() === "suspended"
                                    ? t("billing.wallet_detail.status_suspended", "Suspended")
                                    : t("billing.wallet_detail.status_active", "Active")}
                            </Badge>
                        </div>
                        {walletData.status?.toLowerCase() === "suspended" && walletData.suspendReason && (
                            <span
                                className="text-[10px] text-red-500 font-medium mb-1 max-w-[150px] truncate"
                                title={walletData.suspendReason}
                            >
                                {t("billing.wallet_detail.reason_label", "Alasan:")} {walletData.suspendReason}
                            </span>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {t("billing.wallet_detail.id_label", "ID:")}
                            </span>
                            <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
                                {walletData.id || `W-MOCK-${userId}`}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Wallet Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-bold text-gray-900 dark:text-white">
                            {t("billing.wallet_detail.title", "Informasi Wallet")}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {!hideLimitFeature && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={openLimitModal}
                                disabled={isProcessing}
                                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            >
                                {t("billing.wallet_detail.set_limit", "Set Limit")}
                            </Button>
                        )}
                        {walletData.status?.toLowerCase() === "suspended" ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                onClick={() => setIsActivateModalOpen(true)}
                                disabled={isProcessing}
                            >
                                {t("billing.wallet_detail.activate", "Aktifkan")}
                            </Button>
                        ) : (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => { setSuspendReason(""); setIsSuspendModalOpen(true); }}
                                disabled={isProcessing}
                            >
                                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {t("billing.wallet_detail.suspend", "Suspend")}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Saldo Aktif */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">
                            {t("billing.wallet_detail.active_balance", "Saldo Aktif")}
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(walletData?.activeBalance || walletData?.balance || 0, locale)}
                        </div>
                    </div>

                    {/* Saldo Pending — clickable untuk guru */}
                    <div
                        className={`p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border transition-all duration-200 ${
                            isTeacher
                                ? "border-amber-200 dark:border-amber-700 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:shadow-md group"
                                : "border-gray-100 dark:border-gray-800"
                        }`}
                        onClick={isTeacher ? () => setIsPayoutPopupOpen(true) : undefined}
                        title={isTeacher ? "Klik untuk melihat data payout guru" : undefined}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                {t("billing.wallet_detail.pending_balance", "Saldo Pending")}
                            </div>
                            {isTeacher && (
                                <div className="flex items-center gap-1">
                                    <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                                    <ArrowRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(walletData?.pendingBalance || 0, locale)}
                        </div>
                        {isTeacher && (
                            <p className="text-[10px] text-amber-500 font-medium mt-1.5">
                                Klik untuk lihat data payout
                            </p>
                        )}
                    </div>

                    {/* Total Transaksi */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                        <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">
                            {t("billing.wallet_detail.total_transactions", "Total Transaksi")}
                        </div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                            {transactions.length}{" "}
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {t("billing.wallet_detail.transactions", "Transaksi")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History / Mutasi Bank */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

                {/* Section Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
                    {/* Top row: title + toggle + export */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-emerald-500 shrink-0" />
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                                {t("billing.wallet_detail.history_title", "Riwayat Transaksi")}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Segmented control: List / Mutasi Bank */}
                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 gap-0.5">
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${viewMode === "list"
                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        }`}
                                >
                                    {t("user_detail.wallet_statement.view_list", "Daftar")}
                                </button>
                                <button
                                    onClick={() => setViewMode("mutasi")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${viewMode === "mutasi"
                                        ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        }`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    {t("user_detail.wallet_statement.view_mutasi", "Mutasi Bank")}
                                </button>
                            </div>

                            {/* Export PDF — only in mutasi mode */}
                            {viewMode === "mutasi" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportPDF}
                                    className="gap-1.5 text-xs h-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    {t("user_detail.wallet_statement.export_pdf", "Ekspor PDF")}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Filter bar (shared both modes) */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {/* Filter popover trigger */}
                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={() => setFilterOpen((v) => !v)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${hasActiveFilters
                                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                                    }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                {t("user_detail.wallet_statement.filter_type", "Filter")}
                                {hasActiveFilters && (
                                    <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                )}
                                <ChevronDown className={`w-3 h-3 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
                            </button>

                            {filterOpen && (
                                <div className="absolute top-full mt-2 z-30 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 space-y-3"
                                    style={{ [isRTL ? "right" : "left"]: 0 }}>
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        {t("user_detail.wallet_statement.filter_type", "Filter Transaksi")}
                                    </p>

                                    {/* Date range */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                                {t("user_detail.wallet_statement.filter_from", "Dari")}
                                            </label>
                                            <input
                                                type="date"
                                                value={filterDateFrom}
                                                onChange={(e) => setFilterDateFrom(e.target.value)}
                                                className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                                {t("user_detail.wallet_statement.filter_to", "Sampai")}
                                            </label>
                                            <input
                                                type="date"
                                                value={filterDateTo}
                                                onChange={(e) => setFilterDateTo(e.target.value)}
                                                className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Transaction type */}
                                    <div>
                                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                            {t("user_detail.wallet_statement.filter_type", "Jenis Transaksi")}
                                        </label>
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                            className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        >
                                            <option value="all">{t("user_detail.wallet_statement.filter_type_all", "Semua")}</option>
                                            <option value="1">{t("user_detail.wallet_statement.filter_topup", "TopUp")}</option>
                                            <option value="2">{t("user_detail.wallet_statement.filter_withdraw", "Withdraw")}</option>
                                            <option value="3">{t("user_detail.wallet_statement.filter_transfer", "Transfer")}</option>
                                            <option value="4">{t("user_detail.wallet_statement.filter_payment", "Pembayaran")}</option>
                                        </select>
                                    </div>

                                    {hasActiveFilters && (
                                        <button
                                            onClick={clearFilters}
                                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                            Reset Filter
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Active filter chips */}
                        {filterDateFrom && (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-full font-semibold">
                                {t("user_detail.wallet_statement.filter_from", "Dari")} {filterDateFrom}
                                <button onClick={() => setFilterDateFrom("")}><X className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filterDateTo && (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-full font-semibold">
                                {t("user_detail.wallet_statement.filter_to", "Sampai")} {filterDateTo}
                                <button onClick={() => setFilterDateTo("")}><X className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filterType !== "all" && (
                            <span className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-full font-semibold">
                                {getTxTypeName(parseInt(filterType), t)}
                                <button onClick={() => setFilterType("all")}><X className="w-3 h-3" /></button>
                            </span>
                        )}

                        {/* Result count */}
                        {hasActiveFilters && (
                            <span className="text-[10px] text-gray-400 font-medium ml-1">
                                {filteredTransactions.length} {t("billing.wallet_detail.transactions", "transaksi")}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── LIST MODE ─────────────────────────────────────────────────────── */}
                {viewMode === "list" && (
                    <>
                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-12 px-4 text-gray-400">
                                <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                <p className="font-medium text-gray-500">
                                    {t("billing.wallet_detail.empty_history", "Belum ada riwayat transaksi")}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800 tracking-wider font-bold">
                                        <tr>
                                            <th className="px-5 py-3.5">{t("billing.wallet_detail.table.id", "ID")}</th>
                                            <th className="px-5 py-3.5">{t("billing.wallet_detail.table.category", "Kategori")}</th>
                                            <th className="px-5 py-3.5">{t("billing.wallet_detail.table.amount", "Nominal")}</th>
                                            <th className="px-5 py-3.5">{t("billing.wallet_detail.table.status", "Status")}</th>
                                            <th className="px-5 py-3.5">{t("billing.wallet_detail.table.date", "Tanggal")}</th>
                                            <th className="px-5 py-3.5 text-center">{t("billing.wallet_detail.table.action", "Aksi")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                        {filteredTransactions.map((tx: any) => (
                                            <tr
                                                key={tx.id}
                                                onClick={() => router.push(`/${lang}/billing/${tx.id}/transaction`)}
                                                className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-5 py-4">
                                                    {tx.referenceId ? (
                                                        <>
                                                            <div className="font-bold text-gray-900 dark:text-white text-sm font-mono">{tx.referenceId}</div>
                                                            <div className="text-[10px] text-gray-400 uppercase mt-0.5">
                                                                {t("billing.wallet_detail.internal_id", "Internal: #{{id}}", { id: tx.id })}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="font-bold text-gray-900 dark:text-white text-sm">#{tx.id}</div>
                                                            <div className="text-[10px] text-gray-400 uppercase mt-0.5">
                                                                {t("billing.wallet_detail.internal_tx", "Transaksi Internal")}
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col items-start gap-1">
                                                        {getTxTypeBadge(tx.type, t)}
                                                        {tx.paymentMethod && (
                                                            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                                {tx.paymentMethod}
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] text-gray-500 truncate max-w-[200px]">
                                                            {tx.description || t("billing.wallet_detail.description_fallback", "Transaksi")}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className={`font-black text-sm ${tx.amount < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                        {tx.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(tx.amount), locale)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1 rounded border border-gray-100 dark:border-gray-700/50 inline-flex items-center">
                                                        {getStatusBadge(tx.status, t)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        {formatDate(tx.createdAt, "relative", tz, locale, t)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <button className="text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-md transition-colors inline-flex items-center">
                                                        {t("billing.wallet_detail.detail", "Detail")}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile cards for List mode */}
                            <div className="sm:hidden space-y-3 mt-4">
                                {filteredTransactions.map((tx: any) => (
                                    <div
                                        key={`mob-list-${tx.id}`}
                                        onClick={() => router.push(`/${lang}/billing/${tx.id}/transaction`)}
                                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 cursor-pointer"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-white text-sm">{tx.referenceId ? tx.referenceId : `#${tx.id}`}</span>
                                                <span className="text-[10px] text-gray-400 uppercase mt-0.5">{tx.referenceId ? t("billing.wallet_detail.internal_id", "Internal: #{{id}}", { id: tx.id }) : t("billing.wallet_detail.internal_tx", "Transaksi Internal")}</span>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/60 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700/50">
                                                {getStatusBadge(tx.status, t)}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {getTxTypeBadge(tx.type, t)}
                                                {tx.paymentMethod && (
                                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                        {tx.paymentMethod}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {tx.description || t("billing.wallet_detail.description_fallback", "Transaksi")}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                {formatDate(tx.createdAt, "relative", tz, locale, t)}
                                            </span>
                                            <span className={`font-black text-sm ${tx.amount < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                {tx.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(tx.amount), locale)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}
                    </>
                )}

                {/* ── MUTASI BANK MODE (TABLE BANK DESIGN) ──────────────────────────────────────────────── */}
                {viewMode === "mutasi" && (
                    <div ref={printRef} className="flex flex-col">
                        {/* Summary Cards — hanya Pemasukan & Pengeluaran (Saldo Aktif sudah ada di atas) */}
                        <div className="p-4 sm:p-5">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">
                                            {t("user_detail.wallet_statement.income", "Pemasukan")}
                                        </p>
                                        <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                            {formatCurrency(mutasiRows.filter((tx: any) => tx.amount > 0).reduce((acc: number, tx: any) => acc + tx.amount, 0), locale)}
                                        </p>
                                    </div>
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                                        <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">
                                            {t("user_detail.wallet_statement.expense", "Pengeluaran")}
                                        </p>
                                        <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 truncate">
                                            {formatCurrency(Math.abs(mutasiRows.filter((tx: any) => tx.amount < 0).reduce((acc: number, tx: any) => acc + tx.amount, 0)), locale)}
                                        </p>
                                    </div>
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                        <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {mutasiRows.length === 0 ? (
                            <div className="text-center py-12 px-4 text-gray-400 border-t border-gray-100 dark:border-gray-800">
                                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                <p className="font-medium text-gray-500">
                                    {t("user_detail.wallet_statement.empty", "Tidak ada transaksi ditemukan")}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Preview notice */}
                                {preview && mutasiRows.length > MUTASI_PREVIEW && (
                                    <div className="px-4 sm:px-5 pb-4">
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                            {t("user_detail.wallet_statement.showing_preview", "Menampilkan 10 mutasi terbaru")}
                                        </p>
                                    </div>
                                )}

                                {/* ── Bank Statement Table ── */}
                                {/* Desktop: full table */}
                                <div className="hidden sm:block overflow-x-auto border-t border-gray-100 dark:border-gray-800">
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800 tracking-wider font-bold">
                                            <tr>
                                                <th className="px-5 py-3.5">{t("user_detail.wallet_statement.col_date", "Tanggal")}</th>
                                                <th className="px-5 py-3.5">{t("user_detail.wallet_statement.col_desc", "Keterangan")}</th>
                                                <th className="px-5 py-3.5 text-right">{t("user_detail.wallet_statement.col_debit", "Debit")}</th>
                                                <th className="px-5 py-3.5 text-right">{t("user_detail.wallet_statement.col_credit", "Kredit")}</th>
                                                <th className="px-5 py-3.5 text-right">{t("user_detail.wallet_statement.col_balance", "Saldo Akhir")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                            {(preview ? mutasiRows.slice(0, MUTASI_PREVIEW) : mutasiRows).map((tx: any, idx: number) => {
                                                const isDebit = tx.amount < 0;
                                                const isFirst = idx === 0;
                                                return (
                                                    <tr
                                                        key={`tbl-${tx.id}-${idx}`}
                                                        className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
                                                    >
                                                        <td className="px-5 py-4 whitespace-nowrap">
                                                            <span
                                                                className="text-xs text-gray-600 dark:text-gray-400 font-medium cursor-default"
                                                                title={formatDateShort(tx.createdAt, locale)}
                                                            >
                                                                {formatDate(tx.createdAt, "relative", tz, locale, t)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    {getTxTypeBadge(tx.type, t)}
                                                                </div>
                                                                {tx.description && (
                                                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
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
                                                            ) : (
                                                                <span className="text-gray-300 dark:text-gray-700">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            {!isDebit ? (
                                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {formatCurrency(tx.amount, locale)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300 dark:text-gray-700">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                                                {formatCurrency(tx.runningBalance, locale)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile: card per row */}
                                <div className="sm:hidden space-y-3 px-4 pb-4">
                                    {(preview ? mutasiRows.slice(0, MUTASI_PREVIEW) : mutasiRows).map((tx: any, idx: number) => {
                                        const isDebit = tx.amount < 0;
                                        return (
                                            <div
                                                key={`mob-${tx.id}-${idx}`}
                                                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {getTxTypeBadge(tx.type, t)}
                                                    </div>
                                                    <span className={`text-base font-black ${isDebit ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {isDebit ? '-' : '+'}{formatCurrency(Math.abs(tx.amount), locale)}
                                                    </span>
                                                </div>
                                                {tx.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{tx.description}</p>
                                                )}
                                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-mono text-gray-400">{tx.referenceId || `#${tx.id}`}</span>
                                                        <span
                                                            className="text-[10px] text-gray-400 cursor-default"
                                                            title={formatDateShort(tx.createdAt, locale)}
                                                        >
                                                            {formatDate(tx.createdAt, "relative", tz, locale, t)}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Saldo</p>
                                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{formatCurrency(tx.runningBalance, locale)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* View All button (preview mode) */}
                                {preview && mutasiRows.length > 0 && (
                                    <button
                                        onClick={() => router.push(`/${lang}/users/manage/${userId}/mutations`)}
                                        className="w-full py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        {t("user_detail.wallet_statement.view_all_count", "Lihat Semua ({{count}} Mutasi)").replace("{{count}}", String(mutasiRows.length))}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modals ──────────────────────────────────────────────────────────── */}

            {/* Edit Limit Modal */}
            <Dialog open={isLimitModalOpen} onOpenChange={setIsLimitModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("billing.wallet_detail.limit_modal.title", "Ubah Limit Wallet")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {[
                            { id: "dailyTopupLimit", label: t("billing.wallet_detail.limit_modal.daily_topup", "Daily Topup Limit"), placeholder: t("billing.wallet_detail.limit_modal.optional_topup", "Opsional (mis: 10000000)") },
                            { id: "dailyWithdrawLimit", label: t("billing.wallet_detail.limit_modal.daily_withdraw", "Daily Withdraw Limit"), placeholder: t("billing.wallet_detail.limit_modal.optional_withdraw", "Opsional (mis: 5000000)") },
                            { id: "dailyTransferLimit", label: t("billing.wallet_detail.limit_modal.daily_transfer", "Daily Transfer Limit"), placeholder: t("billing.wallet_detail.limit_modal.optional_transfer", "Opsional (mis: 5000000)") },
                            { id: "minWithdrawAmount", label: t("billing.wallet_detail.limit_modal.min_withdraw", "Min Withdraw"), placeholder: t("billing.wallet_detail.limit_modal.optional_min", "Opsional (mis: 50000)") },
                            { id: "maxBalance", label: t("billing.wallet_detail.limit_modal.max_balance", "Max Balance"), placeholder: t("billing.wallet_detail.limit_modal.optional_max", "Opsional (mis: 100000000)") },
                        ].map(({ id, label, placeholder }) => (
                            <div key={id} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={id} className="text-right text-xs">{label}</Label>
                                <Input
                                    id={id}
                                    value={(limits as any)[id]}
                                    onChange={(e) => setLimits({ ...limits, [id]: e.target.value })}
                                    className="col-span-3"
                                    placeholder={placeholder}
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLimitModalOpen(false)}>
                            {t("billing.wallet_detail.limit_modal.cancel", "Batal")}
                        </Button>
                        <Button onClick={handleSaveLimit} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t("billing.wallet_detail.limit_modal.save", "Simpan")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Suspend Modal */}
            <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("billing.wallet_detail.suspend_modal.title", "Suspend Wallet")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="suspendReason">
                                {t("billing.wallet_detail.suspend_modal.reason_label", "Alasan Penangguhan (Wajib)")}
                            </Label>
                            <Input
                                id="suspendReason"
                                value={suspendReason}
                                onChange={(e) => setSuspendReason(e.target.value)}
                                placeholder={t("billing.wallet_detail.suspend_modal.reason_placeholder", "Masukkan alasan wallet disuspend...")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSuspendModalOpen(false)}>
                            {t("billing.wallet_detail.suspend_modal.cancel", "Batal")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleSuspendWallet}
                            disabled={isProcessing || !suspendReason.trim()}
                        >
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t("billing.wallet_detail.suspend_modal.confirm", "Suspend")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Activate Modal */}
            <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("billing.wallet_detail.activate_modal.title", "Aktifkan Wallet")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label>{t("billing.wallet_detail.activate_modal.prev_reason_label", "Alasan Penangguhan Sebelumnya:")}</Label>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                                {walletData?.suspendReason || t("billing.wallet_detail.no_reason", "Tidak ada alasan penangguhan yang tercatat.")}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {t("billing.wallet_detail.activate_modal.confirm_text", "Apakah Anda yakin ingin mengaktifkan kembali wallet ini?")}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsActivateModalOpen(false)}>
                            {t("billing.wallet_detail.activate_modal.cancel", "Batal")}
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleActivateWallet}
                            disabled={isProcessing}
                        >
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t("billing.wallet_detail.activate_modal.confirm", "Aktifkan")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Payout Popup Modal (untuk user yang juga Guru) ────────────────── */}
            <Dialog open={isPayoutPopupOpen} onOpenChange={setIsPayoutPopupOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            Data Payout Guru
                        </DialogTitle>
                        <p className="text-xs text-gray-500 mt-1">
                            Riwayat payout dari pesanan yang telah selesai untuk{" "}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {userData?.name || `User #${userId}`}
                            </span>
                        </p>
                    </DialogHeader>

                    {/* Summary Row */}
                    <div className="grid grid-cols-3 gap-3 py-3 border-b border-gray-100 dark:border-gray-800">
                        {[
                            {
                                label: "Total Payout",
                                value: formatCurrency(
                                    payoutRecords.reduce((s, p) => s + (p.amount || 0), 0),
                                    locale
                                ),
                                color: "text-gray-900 dark:text-white",
                            },
                            {
                                label: "Sudah Dibayar",
                                value: payoutRecords.filter((p) => p.status === "completed").length,
                                color: "text-emerald-600 dark:text-emerald-400",
                            },
                            {
                                label: "Menunggu",
                                value: payoutRecords.filter((p) => p.status === "pending").length,
                                color: "text-amber-600 dark:text-amber-400",
                            },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">{stat.label}</p>
                                <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Payout List */}
                    <div className="flex-1 overflow-y-auto -mx-6 px-6">
                        {payoutRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
                                <GraduationCap className="w-10 h-10 text-gray-300" />
                                <p className="text-sm font-medium">Belum ada data payout</p>
                            </div>
                        ) : (
                            <div className="space-y-2 py-3">
                                {payoutRecords.map((payout: any) => {
                                    const isCompleted = payout.status === "completed";
                                    const isPending = payout.status === "pending";
                                    return (
                                        <div
                                            key={payout.id}
                                            className="flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
                                        >
                                            {/* Status icon */}
                                            <div className={`p-2 rounded-lg shrink-0 ${
                                                isCompleted
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                                                    : "bg-amber-50 dark:bg-amber-900/20"
                                            }`}>
                                                {isCompleted ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <Clock className="w-4 h-4 text-amber-500" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                    {payout.packageName}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-mono">
                                                    {payout.orderId} &nbsp;·&nbsp;
                                                    {formatDateShort(payout.createdAt, locale)}
                                                </p>
                                            </div>

                                            {/* Amount + status */}
                                            <div className="text-right shrink-0">
                                                <p className={`text-sm font-black ${
                                                    isCompleted
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-amber-600 dark:text-amber-400"
                                                }`}>
                                                    +{formatCurrency(payout.amount, locale)}
                                                </p>
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                                    isCompleted
                                                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                                                }`}>
                                                    {isCompleted ? "Dibayar" : "Pending"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsPayoutPopupOpen(false)}
                            className="flex-1 sm:flex-none"
                        >
                            Tutup
                        </Button>
                        <Button
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                            onClick={() => {
                                setIsPayoutPopupOpen(false);
                                router.push(`/${lang}/billing/payout`);
                            }}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Lihat Semua Payout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}