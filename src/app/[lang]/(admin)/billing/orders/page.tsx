"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
    Search, ShoppingBag, CheckCircle2, X,
    MoreHorizontal, ChevronLeft,
    ChevronRight, Trash2,
    ChevronDown, ChevronUp, ChevronsUpDown, Check, Timer, BarChart2, History, Calendar,
    Loader2, AlertCircle, Wifi, MapPin, CreditCard,
    Filter, Banknote, XCircle
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"
import {
    bulkUpdateBookingStatus,
    fetchAdminBookings,
    type BillingPipelineStatus as PipelineStatus,
} from "@/lib/billing-bookings"
import {
    getSimOrders, addSimNotif,
    nextSimId, saveSimOrder, updateSimOrderPayment,
    type SimOrder,
} from "@/lib/sim-store"
import { formatTimeAgo, formatTooltipDate } from "@/lib/date-utils"
import { SmartPagination } from "@/components/ui/smart-pagination"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UserWalletModal } from "@/components/Wallet/UserWalletModal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// ─── Types ────────────────────────────────────────────────────────────────────
// PipelineStatus comes from the Qurani booking API normalizer.

type PipelineOrder = {
    id: string | number
    userId?: string | number
    bookingCode: string
    member: string
    username: string
    memberAvatar: string
    memberImage?: string
    guru: string
    guruUsername: string
    guruImage?: string
    paket: string
    sesi: number
    sesiSelesai: number
    harga: number
    tglPesan: string
    rawDate: Date
    payment: string
    mode: "online" | "offline"
    status: PipelineStatus
    isPendingPayment?: boolean
    isSim?: boolean
    isApi?: boolean
    apiStatus?: number | string | null
    trainerId?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
}

function toUsername(email: string, name: string) {
    if (email && email.includes("@")) return email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase()
    return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function initials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

// ─── Mapping booking status → pipeline stage ───────────────────────────────
function getStage(b: typeof dummyData.bookings[0]): PipelineStatus {
    const s = b.status
    if (s === "cancelled") return "gagal"
    if (s === "completed") return "selesai"
    if (s === "pending_trainer") return "menunggu_guru"
    if (s === "pending_payment") return "baru"
    if (s === "active" && b.completedSessions > 0) return "aktif"
    if (s === "active") return "lunas"
    return "baru"
}

// ─── Convert JSON bookings → PipelineOrder ──────────────────────────────────
const AVATAR_COLORS = ["bg-emerald-500", "bg-violet-500", "bg-sky-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500", "bg-orange-500"]

function bookingToPipeline(b: typeof dummyData.bookings[0]): PipelineOrder {
    const detail = dummyData.bookingDetails.find(d => d.bookingId === b.id)
    const isPendingPayment = detail ? detail.payment.status === "pending" : false
    return {
        id: b.id,
        userId: b.userId || undefined,
        bookingCode: `#${b.id}`,
        member: b.userName,
        username: toUsername(b.userEmail, b.userName),
        memberAvatar: initials(b.userName),
        guru: b.trainerName,
        guruUsername: `@${toUsername("", b.trainerName)}`,
        paket: b.packageName,
        sesi: b.totalSessions,
        sesiSelesai: b.completedSessions,
        harga: b.totalPayment,
        tglPesan: new Date(b.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        payment: b.paymentGateway,
        rawDate: new Date(b.bookingDate),
        status: getStage(b),
        isPendingPayment,
        mode: "online",
        trainerId: b.trainerId,
    }
}

function simOrderToPipeline(o: SimOrder): PipelineOrder {
    let status: PipelineStatus = "baru"
    if (o.status === "cancelled") status = "gagal"
    else if (o.paymentStatus === "paid" && o.completedSessions > 0) status = "aktif"
    else if (o.paymentStatus === "paid") status = "lunas"
    return {
        id: o.id,
        userId: o.member.id,
        bookingCode: `#${o.id}`,
        member: o.member.name,
        username: toUsername(o.member.email, o.member.name),
        memberAvatar: initials(o.member.name),
        guru: o.trainer.name,
        guruUsername: `@${toUsername(o.trainer.email, o.trainer.name)}`,
        paket: o.pkg.name,
        sesi: o.totalSessions,
        sesiSelesai: o.completedSessions,
        harga: o.pkg.price,
        tglPesan: new Date(o.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        payment: o.paymentGateway || "—",
        rawDate: new Date(o.bookingDate),
        status,
        isPendingPayment: o.paymentStatus === "pending",
        isSim: true,
        mode: "online",
        trainerId: o.trainer.id,
    }
}

// ─── Table Config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PipelineStatus, { label: string; dotCls: string; badgeCls: string }> = {
    baru:         { label: "Pending",  dotCls: "bg-amber-500",   badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    lunas:        { label: "Aktif",           dotCls: "bg-sky-500",     badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    aktif:        { label: "Aktif",           dotCls: "bg-sky-500",     badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    gagal:        { label: "Batal",           dotCls: "bg-rose-500",    badgeCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
    selesai:      { label: "Selesai",         dotCls: "bg-blue-500",    badgeCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
    menunggu_guru:{ label: "Pending",   dotCls: "bg-amber-500",   badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
}

const STATUS_ACTIONS: { key: PipelineStatus; label: string; dot: string; text: string; hover: string; border: string }[] = [
    { key: "baru",         label: "Pending",  dot: "bg-amber-400",   text: "text-amber-700 dark:text-amber-400",   hover: "hover:bg-amber-50 dark:hover:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800" },
    { key: "aktif",        label: "Aktif",           dot: "bg-sky-500",     text: "text-sky-700 dark:text-sky-400",       hover: "hover:bg-sky-50 dark:hover:bg-sky-900/20",       border: "border-sky-200 dark:border-sky-800" },
    { key: "selesai",      label: "Selesai",         dot: "bg-blue-500",    text: "text-blue-700 dark:text-blue-400",     hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20",     border: "border-blue-200 dark:border-blue-800" },
    { key: "gagal",        label: "Batal",           dot: "bg-rose-500",    text: "text-rose-700 dark:text-rose-400",     hover: "hover:bg-rose-50 dark:hover:bg-rose-900/20",     border: "border-rose-200 dark:border-rose-800" },
]

// ─── Simulasi Modal ────────────────────────────────────────────────────────────
const SIM_MEMBERS = dummyData.bookingDetails.reduce((acc, d) => {
    if (!acc.find((m: any) => m.id === d.member.id)) acc.push(d.member)
    return acc
}, [] as any[])

const SIM_TRAINERS = dummyData.bookingDetails.reduce((acc, d) => {
    if (!acc.find((t: any) => t.id === d.trainer.id)) acc.push(d.trainer)
    return acc
}, [] as any[])

function SimModal({ onClose, onOrderCreated }: { onClose: () => void; onOrderCreated: () => void }) {
    const [step, setStep] = useState(1)
    const [selMember, setSelMember] = useState<any>(null)
    const [selTrainer, setSelTrainer] = useState<any>(null)
    const [selPkg, setSelPkg] = useState<any>(null)
    const [selGateway, setSelGateway] = useState("")
    const [pendingOrderId, setPendingOrderId] = useState<number | null>(null)
    const [done, setDone] = useState(false)

    const trainerPackages = useMemo(() => {
        if (!selTrainer) return []
        return dummyData.trainerPackages.filter((p: any) => p.trainerId === selTrainer.id)
    }, [selTrainer])

    function handleOrder() {
        if (!selMember || !selTrainer || !selPkg) return
        const id = nextSimId()
        const order: SimOrder = {
            id,
            member: { id: selMember.id, name: selMember.name, email: selMember.email, phone: selMember.phone || "", location: selMember.location || "", joinDate: selMember.joinDate || "" },
            trainer: { id: selTrainer.id, name: selTrainer.name, email: selTrainer.email || "", avatar: selTrainer.avatar || "", rating: selTrainer.rating, totalStudents: selTrainer.totalStudents, specialization: selTrainer.specialization },
            pkg: { key: `${selPkg.sessions}x` as "1x" | "5x" | "10x", name: selPkg.name, sessions: selPkg.sessions, price: selPkg.basePrice, serviceFee: 0 },
            mode: "online",
            paymentGateway: "",
            paymentMethod: "Ummi",
            status: "pending",
            paymentStatus: "pending",
            bookingDate: new Date().toISOString(),
            paidAt: null,
            invoiceNo: `INV-SIM-${id}`,
            completedSessions: 0,
            totalSessions: selPkg.sessions,
            sessions: [],
        }
        saveSimOrder(order)
        setPendingOrderId(id)
        addSimNotif({
            type: "new_order",
            message: "Pesanan Baru — Menunggu Bayar",
            subMessage: `${selMember.name} • ${selPkg.name} • ${selTrainer.name}`,
            isRead: false,
            orderId: id,
        })
        onOrderCreated()
        setStep(4)
    }

    function handlePay() {
        if (!pendingOrderId || !selGateway) return
        updateSimOrderPayment(pendingOrderId, selGateway)
        addSimNotif({
            type: "payment_success",
            message: "Pembayaran Berhasil",
            subMessage: `${selMember?.name} • ${selGateway} • ${formatRupiah((selPkg?.basePrice || 0) + (selPkg?.serviceFee || 0))}`,
            isRead: false,
            orderId: pendingOrderId,
        })
        onOrderCreated()
        setDone(true)
    }

    const stepLabel = ["", "Pilih Member", "Pilih Guru", "Pilih Paket", "Pembayaran"]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Simulasi Pesanan Baru</p>
                    </div>
                    <button onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Step indicator */}
                {!done && (
                    <div className="flex items-center px-5 pt-4 gap-1">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className="flex items-center gap-1 flex-1">
                                <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${s < step ? "bg-emerald-500 text-white" : s === step ? "bg-emerald-600 text-white ring-2 ring-emerald-200" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                                    {s < step ? "✓" : s}
                                </div>
                                <p className={`text-[10px] font-medium truncate ${s === step ? "text-emerald-600" : "text-gray-400"}`}>{stepLabel[s]}</p>
                                {s < 4 && <div className={`flex-1 h-px mx-1 ${s < step ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
                            </div>
                        ))}
                    </div>
                )}

                {/* Body */}
                <div className="p-5 space-y-3 min-h-[240px]">
                    {done ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">Pembayaran Berhasil!</p>
                            <p className="text-sm text-gray-500">Pesanan #{pendingOrderId} sudah masuk</p>
                            <button onClick={onClose} className="mt-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors">Tutup</button>
                        </div>
                    ) : step === 1 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih member yang memesan:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {SIM_MEMBERS.map((m: any) => (
                                    <button key={m.id} onClick={() => setSelMember(m)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selMember?.id === m.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{m.name.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</p>
                                            <p className="text-[11px] text-gray-400">{m.email}</p>
                                        </div>
                                        {selMember?.id === m.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : step === 2 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih guru:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {SIM_TRAINERS.map((t: any) => (
                                    <button key={t.id} onClick={() => { setSelTrainer(t); setSelPkg(null) }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selTrainer?.id === t.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        <img src={t.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=10b981&color=fff`} alt={t.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                                            <p className="text-[11px] text-gray-400">⭐ {t.rating} · {t.totalStudents} murid</p>
                                        </div>
                                        {selTrainer?.id === t.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : step === 3 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih paket dari {selTrainer?.name}:</p>
                            {trainerPackages.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">Tidak ada paket tersedia</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {trainerPackages.map((p: any) => (
                                        <button key={p.id} onClick={() => setSelPkg(p)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${selPkg?.id === p.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                                <p className="text-[11px] text-gray-400">{p.sessions}x sesi · {p.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-emerald-600">{formatRupiah(p.totalPrice)}</p>
                                                {selPkg?.id === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto mt-1" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selPkg && (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 text-xs space-y-1 border border-gray-200 dark:border-gray-700">
                                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Ringkasan:</p>
                                    <div className="flex justify-between"><span className="text-gray-500">Member</span><span className="font-semibold text-gray-900 dark:text-white">{selMember?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Guru</span><span className="font-semibold text-gray-900 dark:text-white">{selTrainer?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Paket</span><span className="font-semibold text-gray-900 dark:text-white">{selPkg?.name}</span></div>
                                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">Total</span>
                                        <span className="font-bold text-emerald-600">{formatRupiah(selPkg.totalPrice)}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih metode pembayaran:</p>
                            <div className="space-y-1.5">
                                {["GoPay", "QRIS", "OVO"].map(g => (
                                    <button key={g} onClick={() => setSelGateway(g)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${selGateway === g ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        {g}
                                        {selGateway === g && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </button>
                                ))}
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                ⚠️ Pesanan #{pendingOrderId} sudah masuk. Pilih metode untuk konfirmasi.
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!done && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={() => step > 1 && step < 4 ? setStep(s => s - 1) : onClose()} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                            {step === 1 ? "Batal" : step < 4 ? "← Kembali" : ""}
                        </button>
                        {step === 3 ? (
                            <button onClick={handleOrder} disabled={!selPkg} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Pesan Sekarang <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : step === 4 ? (
                            <button onClick={handlePay} disabled={!selGateway} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Konfirmasi Bayar <CheckCircle2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={() => setStep(s => s + 1)} disabled={(step === 1 && !selMember) || (step === 2 && !selTrainer)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Lanjut <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}


// ─── Main Content ──────────────────────────────────────────────────────────────
function PesananContent() {
    const router = useRouter()
    const rawParams = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en'
    const langCode = rawParams || 'en'

    // ── Search state — server-side via API Keyword param
    const [searchInput, setSearchInput] = useState("")
    const [search, setSearch] = useState("")
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [filterOpen, setFilterOpen] = useState(false)
    const [filter, setFilter] = useState({ dateFrom: '', dateTo: '', status: '', mode: '', minPrice: '', maxPrice: '' })
    const [activeFilter, setActiveFilter] = useState({ dateFrom: '', dateTo: '', status: '', mode: '', minPrice: '', maxPrice: '' })

    const hasActiveFilter = activeFilter.dateFrom || activeFilter.dateTo || activeFilter.status || activeFilter.mode || activeFilter.minPrice || activeFilter.maxPrice;

    const applyFilter = () => { setActiveFilter({ ...filter }); setPage(1); setFilterOpen(false); };
    const resetFilter = () => {
        const empty = { dateFrom: '', dateTo: '', status: '', mode: '', minPrice: '', maxPrice: '' };
        setFilter(empty); setActiveFilter(empty); setPage(1); setFilterOpen(false);
    };

    const [statusTab, setStatusTab] = useState<"all" | PipelineStatus>("all")
    const [simOrders, setSimOrders] = useState<SimOrder[]>([])
    const [apiOrders, setApiOrders] = useState<PipelineOrder[]>([])
    const [apiLoading, setApiLoading] = useState(true)
    const [apiError, setApiError] = useState<string | null>(null)
    const [statusOverrides, setStatusOverrides] = useState<Record<string | number, PipelineStatus>>({})
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([])
    const [openActionId, setOpenActionId] = useState<string | number | null>(null)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    // ── Sorting state
    type SortKey = "id" | "member" | "guru" | "paket" | "harga" | "status" | "tglPesan"
    const [sortKey, setSortKey] = useState<SortKey>("tglPesan")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

    function handleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
        setPage(1)
    }

    function SortIcon({ col }: { col: SortKey }) {
        if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40 inline" />
        return sortDir === "asc"
            ? <ChevronUp className="w-3 h-3 ml-1 text-emerald-400 inline" />
            : <ChevronDown className="w-3 h-3 ml-1 text-emerald-400 inline" />
    }
    
    // User wallet modal state
    const [selectedWalletUserId, setSelectedWalletUserId] = useState<string | number | null>(null);
    const [selectedWalletUserName, setSelectedWalletUserName] = useState<string>("");

    const refreshSim = useCallback(() => setSimOrders(getSimOrders()), [])

    // ── Server-side search + date filter
    const refreshApi = useCallback((keyword?: string) => {
        setApiLoading(true)
        setApiError(null)
        const dateFrom = activeFilter.dateFrom ? new Date(activeFilter.dateFrom) : undefined;
        const dateTo = activeFilter.dateTo ? new Date(activeFilter.dateTo) : undefined;
        if (dateTo) dateTo.setHours(23, 59, 59, 999);
        fetchAdminBookings({
            page: 1,
            pageSize: 100,
            ...(dateFrom && dateTo ? { dateFrom, dateTo } : {}),
            ...(keyword ? { keyword } : {}),
        })
            .then(rows => setApiOrders(rows as PipelineOrder[]))
            .catch(err => {
                console.error("Failed to fetch bookings:", err)
                setApiOrders([])
                setApiError("API booking belum bisa dimuat, menampilkan data dummy untuk testing.")
            })
            .finally(() => setApiLoading(false))
    }, [activeFilter.dateFrom, activeFilter.dateTo])

    useEffect(() => {
        refreshApi(search || undefined)
    }, [refreshApi, search])

    useEffect(() => {
        refreshSim()
        window.addEventListener("sim-notif-update", refreshSim)
        return () => window.removeEventListener("sim-notif-update", refreshSim)
    }, [refreshSim])

    // ── Debounced search handler
    function handleSearchChange(val: string) {
        setSearchInput(val)
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
        searchDebounceRef.current = setTimeout(() => {
            setSearch(val)
            setPage(1)
        }, 600)
    }

    function handleSearchSubmit() {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
        setSearch(searchInput)
        setPage(1)
    }

    function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === "Enter") handleSearchSubmit()
    }

    async function handleAdvance(id: string | number, next: PipelineStatus) {
        const allOrders = [...apiOrders, ...simOrders.map(simOrderToPipeline), ...dummyData.bookings.map(bookingToPipeline)]
        const order = allOrders.find(o => String(o.id) === String(id))
        if (!order) return

        const prev = statusOverrides[id] ?? order.status
        setUpdatingStatus(true)

        try {
            if (order.isApi) {
                await bulkUpdateBookingStatus([id], next)
                refreshApi(search || undefined)
            }
            setStatusOverrides(prev2 => ({ ...prev2, [id]: next }))
        } catch (err) {
            console.error("Failed to update booking status:", err)
            setApiError("Gagal mengubah status di API. Status dummy/lokal tidak diubah.")
            return
        } finally {
            setUpdatingStatus(false)
            setOpenActionId(null)
        }

        const numId = typeof id === "number" ? id : parseInt(String(id)) || 0

        const timestamp = new Date().toISOString()
        const logMap: Record<PipelineStatus, string> = {
            lunas: "Pembayaran terkonfirmasi (Lunas).",
            aktif: "Pesanan aktif dan sesi dijadwalkan.",
            gagal: "Pesanan dibatalkan.",
            selesai: "Semua sesi selesai, pesanan ditandai selesai.",
            menunggu_guru: "Menunggu konfirmasi guru.",
            baru: "Pesanan baru."
        }
        const titleMap: Record<PipelineStatus, string> = {
            lunas: "Lunas",
            aktif: "Aktif",
            gagal: "Dibatalkan",
            selesai: "Selesai",
            menunggu_guru: "Menunggu Guru",
            baru: "Pending"
        }
        
        try {
            const key = `sim_audit_trail_${id}`
            const existingStr = localStorage.getItem(key)
            const existing = existingStr ? JSON.parse(existingStr) : []
            const newLog = {
                statusName: titleMap[next] || "Diubah",
                createdAt: timestamp,
                notes: logMap[next] || `Status diubah menjadi ${next}`,
                changedBy: "Admin"
            }
            localStorage.setItem(key, JSON.stringify([newLog, ...existing]))
        } catch (e) {}
    }

    async function handleBulkStatus(next: PipelineStatus) {
        const selected = allOrders.filter(o => selectedIds.some(id => String(id) === String(o.id)))
        if (selected.length === 0) return

        const apiIds = selected.filter(o => o.isApi).map(o => o.id)
        setUpdatingStatus(true)

        try {
            if (apiIds.length > 0) {
                await bulkUpdateBookingStatus(apiIds, next)
                refreshApi(search || undefined)
            }
            setStatusOverrides(prev => {
                const updated = { ...prev }
                selected.forEach(o => { updated[o.id] = next })
                return updated
            })
            
            const timestamp = new Date().toISOString()
            const logMap: Record<PipelineStatus, string> = {
                lunas: "Pembayaran terkonfirmasi (Lunas).",
                aktif: "Pesanan aktif dan sesi dijadwalkan.",
                gagal: "Pesanan dibatalkan.",
                selesai: "Semua sesi selesai, pesanan ditandai selesai.",
                menunggu_guru: "Menunggu konfirmasi guru.",
                baru: "Pesanan baru."
            }
            const titleMap: Record<PipelineStatus, string> = {
                lunas: "Lunas",
                aktif: "Aktif",
                gagal: "Dibatalkan",
                selesai: "Selesai",
                menunggu_guru: "Menunggu Guru",
                baru: "Pending"
            }
            
            selected.forEach(o => {
                try {
                    const key = `sim_audit_trail_${o.id}`
                    const existingStr = localStorage.getItem(key)
                    const existing = existingStr ? JSON.parse(existingStr) : []
                    const newLog = {
                        statusName: titleMap[next] || "Diubah",
                        createdAt: timestamp,
                        notes: logMap[next] || `Status diubah secara bulk menjadi ${next}`,
                        changedBy: "Admin"
                    }
                    localStorage.setItem(key, JSON.stringify([newLog, ...existing]))
                } catch (e) {}
            })

            setSelectedIds([])
            setBulkOpen(false)
        } catch (err) {
            console.error("Failed to bulk update booking status:", err)
            setApiError("Bulk status gagal dikirim ke API.")
        } finally {
            setUpdatingStatus(false)
        }
    }

    const allOrders = useMemo<PipelineOrder[]>(() => {
        const simRows = simOrders.map(simOrderToPipeline)
        // Dummy/static data dipakai selama apiOrders masih kosong (API belum ada data atau error)
        // Begitu apiOrders terisi dari server, dummy otomatis tidak dipakai
        const useStaticFallback = !apiLoading && apiOrders.length === 0
        const staticRows = useStaticFallback ? dummyData.bookings.map(bookingToPipeline) : []
        const combined = [...apiOrders, ...simRows, ...staticRows]
        const seen = new Set<string>()
        return combined
            .filter(o => {
                const key = String(o.id)
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
            .map(o => statusOverrides[o.id] ? { ...o, status: statusOverrides[o.id] } : o)
    }, [apiOrders, simOrders, statusOverrides, apiLoading, apiError])

    // ── Client-side filtering: date range + status tab (search already applied server-side)
    const filtered = useMemo(() => {
        return allOrders.filter(o => {
            // For API orders, date filtering already done server-side; apply locally for dummy data only
            if (!o.isApi && (activeFilter.dateFrom || activeFilter.dateTo)) {
                const dateFrom = activeFilter.dateFrom ? new Date(activeFilter.dateFrom) : null;
                const dateTo = activeFilter.dateTo ? new Date(activeFilter.dateTo) : null;
                if (dateTo) dateTo.setHours(23, 59, 59, 999);
                if (dateFrom && o.rawDate < dateFrom) return false;
                if (dateTo && o.rawDate > dateTo) return false;
            }
            if (activeFilter.status) {
                if (activeFilter.status === 'pending' && !['baru', 'menunggu_guru'].includes(o.status)) return false;
                if (activeFilter.status === 'aktif' && !['lunas', 'aktif'].includes(o.status)) return false;
                if (activeFilter.status === 'selesai' && o.status !== 'selesai') return false;
                if (activeFilter.status === 'gagal' && !['gagal', 'batal'].includes(o.status)) return false;
            }
            if (activeFilter.mode && o.mode !== activeFilter.mode) return false;
            if (activeFilter.minPrice && o.harga < parseInt(activeFilter.minPrice)) return false;
            if (activeFilter.maxPrice && o.harga > parseInt(activeFilter.maxPrice)) return false;
            if (statusTab !== "all") {
                if (statusTab === "baru") {
                    if (!['baru', 'menunggu_guru'].includes(o.status)) return false
                } else if (statusTab === "aktif") {
                    if (!['lunas', 'aktif'].includes(o.status)) return false
                } else if (statusTab === "gagal") {
                    if (!['gagal', 'batal'].includes(o.status)) return false
                } else {
                    if (o.status !== statusTab) return false
                }
            }
            // For non-API orders, also apply client-side keyword search
            if (!o.isApi && search) {
                const q = search.toLowerCase()
                return (
                    o.member.toLowerCase().includes(q) ||
                    o.guru.toLowerCase().includes(q) ||
                    String(o.id).includes(q) ||
                    o.paket.toLowerCase().includes(q) ||
                    o.username.includes(q)
                )
            }
            return true
        })
    }, [allOrders, activeFilter, statusTab, search])

    // ── Sorted results
    const sortedFiltered = useMemo(() => {
        const copy = [...filtered]
        copy.sort((a, b) => {
            let aVal: any
            let bVal: any
            switch (sortKey) {
                case "id":      aVal = Number(a.id);          bVal = Number(b.id);          break
                case "member":  aVal = a.member.toLowerCase(); bVal = b.member.toLowerCase(); break
                case "guru":    aVal = a.guru.toLowerCase();   bVal = b.guru.toLowerCase();   break
                case "paket":   aVal = a.paket.toLowerCase();  bVal = b.paket.toLowerCase();  break
                case "harga":   aVal = a.harga;                bVal = b.harga;                break
                case "status":  aVal = a.status;               bVal = b.status;               break
                case "tglPesan": aVal = a.rawDate.getTime();  bVal = b.rawDate.getTime();    break
                default:        aVal = a.rawDate.getTime();   bVal = b.rawDate.getTime();
            }
            if (aVal < bVal) return sortDir === "asc" ? -1 : 1
            if (aVal > bVal) return sortDir === "asc" ? 1 : -1
            return 0
        })
        return copy
    }, [filtered, sortKey, sortDir])

    const dateFiltered = useMemo(() => {
        return allOrders.filter(o => {
            if (!o.isApi && (activeFilter.dateFrom || activeFilter.dateTo)) {
                const dateFrom = activeFilter.dateFrom ? new Date(activeFilter.dateFrom) : null;
                const dateTo = activeFilter.dateTo ? new Date(activeFilter.dateTo) : null;
                if (dateTo) dateTo.setHours(23, 59, 59, 999);
                if (dateFrom && o.rawDate < dateFrom) return false;
                if (dateTo && o.rawDate > dateTo) return false;
            }
            return true
        })
    }, [allOrders, activeFilter])

    const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize))
    const paged = sortedFiltered.slice((page - 1) * pageSize, page * pageSize)
    const pagedIds = paged.map(o => o.id)
    const allPagedSelected = pagedIds.length > 0 && pagedIds.every(id => selectedIds.some(selected => String(selected) === String(id)))

    function toggleSelected(id: string | number) {
        setSelectedIds(prev => prev.some(selected => String(selected) === String(id))
            ? prev.filter(selected => String(selected) !== String(id))
            : [...prev, id]
        )
    }

    function togglePagedSelected() {
        if (allPagedSelected) {
            setSelectedIds(prev => prev.filter(id => !pagedIds.some(pagedId => String(pagedId) === String(id))))
            return
        }
        setSelectedIds(prev => {
            const next = [...prev]
            pagedIds.forEach(id => {
                if (!next.some(selected => String(selected) === String(id))) next.push(id)
            })
            return next
        })
    }

    function handleResetSim() {
        import("@/lib/sim-store").then(m => { m.clearSimOrders(); setSimOrders([]) })
        setStatusOverrides({})
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-2 sm:p-5">

            <div className="max-w-[1600px] mx-auto">
                {/* ── Page Header ── */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-emerald-500" />
                        Order
                    </h1>
                </div>

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0"><Timer className="w-6 h-6 text-amber-600 dark:text-amber-400" /></div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{dateFiltered.filter(o => ['baru', 'menunggu_guru'].includes(o.status)).length}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex-shrink-0"><BarChart2 className="w-6 h-6 text-sky-600 dark:text-sky-400" /></div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Aktif</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{dateFiltered.filter(o => ['lunas', 'aktif'].includes(o.status)).length}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0"><CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Selesai</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{dateFiltered.filter(o => ['selesai'].includes(o.status)).length}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex-shrink-0"><XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" /></div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Batal</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{dateFiltered.filter(o => ['gagal', 'batal'].includes(o.status)).length}</p>
                        </div>
                    </div>
                </div>

                {/* ── Action Toolbar ── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
                    {/* Search & Filter Container */}
                    <div className="flex flex-wrap items-center gap-2 w-full">
                        {/* Search */}
                        <div className="relative group flex-1 min-w-[200px] md:max-w-sm flex shadow-sm rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 transition-all focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                {apiLoading && search && (
                                    <Loader2 className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400 animate-spin" />
                                )}
                                <input
                                    type="text"
                                    placeholder="Cari member, guru..."
                                    value={searchInput}
                                    onChange={e => handleSearchChange(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    className="w-full pl-9 sm:pl-11 pr-4 py-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all h-10"
                                />
                            </div>
                            <button
                                onClick={handleSearchSubmit}
                                className="px-3 sm:px-5 bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer h-10"
                            >
                                <Search className="w-4 h-4 sm:hidden" />
                                <span className="hidden sm:inline">Cari</span>
                            </button>
                        </div>

                        {/* Bulk Button */}
                        <button
                            onClick={() => setBulkOpen(o => !o)}
                            disabled={selectedIds.length === 0 || updatingStatus}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 h-10 text-xs font-bold transition-all shadow-sm ${
                                selectedIds.length > 0 
                                ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white cursor-pointer" 
                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed opacity-60"
                            }`}
                        >
                            <span className="hidden sm:inline">Bulk</span>
                            {selectedIds.length > 0 && <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-white/20 text-white text-[10px]">{selectedIds.length}</span>}
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Filter Button */}
                        <button
                            onClick={() => setFilterOpen(true)}
                            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 h-10 rounded-xl border text-sm font-semibold transition-colors shadow-sm whitespace-nowrap ${hasActiveFilter
                                ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filter</span>
                        </button>
                    </div>

                    <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Filter Data Pesanan</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Status</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['', 'pending', 'aktif', 'selesai', 'gagal'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setFilter(f => ({ ...f, status: s }))}
                                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter.status === s
                                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                                                }`}
                                            >
                                                {s === '' ? 'Semua' : s === 'pending' ? 'Pending' : s === 'aktif' ? 'Aktif' : s === 'selesai' ? 'Selesai' : 'Batal'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Mode</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['', 'online', 'offline'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setFilter(f => ({ ...f, mode: s }))}
                                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter.mode === s
                                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                                                }`}
                                            >
                                                {s === '' ? 'Semua' : s === 'online' ? 'Online' : 'Tatap Muka'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
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
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Harga</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] text-gray-400 mb-1">Minimum (Rp)</p>
                                            <input type="number" value={filter.minPrice} onChange={e => setFilter(f => ({ ...f, minPrice: e.target.value }))} placeholder="0"
                                                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 mb-1">Maksimum (Rp)</p>
                                            <input type="number" value={filter.maxPrice} onChange={e => setFilter(f => ({ ...f, maxPrice: e.target.value }))} placeholder="Tak terbatas"
                                                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 sm:justify-between">
                                <button onClick={resetFilter} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Reset</button>
                                <button onClick={applyFilter} className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors">Terapkan</button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Simulation Tools */}
                    {simOrders.length > 0 && (
                        <button onClick={handleResetSim}
                            className="flex items-center justify-center w-10 h-10 rounded-xl border border-red-100 bg-white dark:bg-gray-900 text-red-500 hover:bg-red-50 transition-all cursor-pointer shadow-sm group">
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                    )}
                </div>

                {/* ── API Loading / Error Toast ── */}
                {(apiLoading || apiError) && (
                    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
                        {apiLoading && (
                            <div className="pointer-events-auto flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-xl shadow-black/10 animate-in slide-in-from-bottom-3 fade-in duration-300">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800 dark:text-white">Memuat pesanan...</p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {search ? `Mencari "${search}" via API Qurani` : "Mengambil data dari API Qurani"}
                                    </p>
                                </div>
                            </div>
                        )}
                        {!apiLoading && apiError && (
                            <div className="pointer-events-auto flex items-center gap-3 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 shadow-xl shadow-black/10 animate-in slide-in-from-bottom-3 fade-in duration-300">
                                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">API tidak tersedia</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Menampilkan data lokal</p>
                                </div>
                                <button
                                    onClick={() => setApiError(null)}
                                    className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                )}


                {/* ── Table List ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="w-10 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={allPagedSelected}
                                            onChange={togglePagedSelected}
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </th>
                                    <th
                                        onClick={() => handleSort("id")}
                                        className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        Kode Pesanan <SortIcon col="id" />
                                    </th>
                                    <th
                                        onClick={() => handleSort("member")}
                                        className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        Murid <SortIcon col="member" />
                                    </th>
                                    <th
                                        onClick={() => handleSort("guru")}
                                        className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        Guru <SortIcon col="guru" />
                                    </th>
                                    <th
                                        onClick={() => handleSort("paket")}
                                        className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        Paket <SortIcon col="paket" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Mode</th>
                                    <th
                                        onClick={() => handleSort("harga")}
                                        className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        Harga <SortIcon col="harga" />
                                    </th>
                                    <th
                                        onClick={() => handleSort("status")}
                                        className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        Status <SortIcon col="status" />
                                    </th>
                                    <th
                                        onClick={() => handleSort("tglPesan")}
                                        className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        Tanggal <SortIcon col="tglPesan" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>{search ? `Tidak ada pesanan untuk "${search}"` : "Tidak ada pesanan ditemukan"}</p>
                                        </td>
                                    </tr>
                                ) : paged.map(order => {
                                    const colorIdx = Math.abs(order.member.charCodeAt(0) + (order.member.charCodeAt(1) || 0)) % AVATAR_COLORS.length
                                    const st = STATUS_CONFIG[order.status]
                                    const isSelected = selectedIds.some(id => String(id) === String(order.id))
                                    return (
                                    <tr
                                        key={order.id}
                                        onClick={() => { const l = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en'; router.push(`/${l}/billing/orders/${order.id}`); }}
                                        className={`${isSelected ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer`}
                                    >
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelected(order.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                            </td>
                                            {/* Kode Pesanan */}
                                            <td className="px-4 py-3 w-auto" onClick={e => e.stopPropagation()}>
                                                <div className="flex flex-col gap-0.5 items-start">
                                                    <span
                                                        onClick={() => { const l = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en'; router.push(`/${l}/billing/orders/${order.id}`); }}
                                                        className="inline-flex w-fit items-center font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800 whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors"
                                                    >
                                                        {order.bookingCode}
                                                    </span>
                                                    {order.isApi && (
                                                        <span className="text-[9px] font-medium text-emerald-500 dark:text-emerald-400 pl-1">API</span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Member */}
                                            <td className="px-4 py-3">
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (order.userId) {
                                                            const langStr = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en';
                                                            router.push(`/${langStr}/users/manage/${order.userId}?tab=wallet`);
                                                        }
                                                    }}
                                                    className={order.userId ? 'cursor-pointer group/member inline-block' : ''}
                                                    title={order.userId ? 'Lihat profil' : ''}
                                                >
                                                    <p className={`text-sm font-semibold text-gray-900 dark:text-white ${order.userId ? 'group-hover/member:text-emerald-600 dark:group-hover/member:text-emerald-400 group-hover/member:underline' : ''}`}>{order.member}</p>
                                                    <p className={`text-[11px] ${order.userId ? 'text-emerald-600 dark:text-emerald-400 group-hover/member:underline' : 'text-gray-500'}`}>@{order.username.replace(/^@/, '')}</p>
                                                </div>
                                            </td>
                                            {/* Guru */}
                                            <td className="px-4 py-3">
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (order.trainerId) {
                                                            const langStr = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en';
                                                            router.push(`/${langStr}/teachers/manage/${order.trainerId}?from=orders`);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-2 ${order.trainerId ? 'cursor-pointer group/guru inline-flex' : ''}`}
                                                    title={order.trainerId ? 'Lihat profil guru' : ''}
                                                >
                                                    {order.guruImage ? (
                                                        <img src={order.guruImage} alt={order.guru} className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-100" />
                                                    ) : null}
                                                    <div>
                                                        <p className={`text-sm font-semibold text-gray-900 dark:text-white ${order.trainerId ? 'group-hover/guru:text-emerald-600 dark:group-hover/guru:text-emerald-400 group-hover/guru:underline' : ''}`}>{order.guru}</p>
                                                        <p className={`text-[11px] ${order.trainerId ? 'text-emerald-600 dark:text-emerald-400 group-hover/guru:underline' : 'text-gray-500'}`}>{order.guruUsername}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Paket */}
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{order.paket}</p>
                                                <p className="text-[11px] text-gray-500">{order.sesiSelesai}/{order.sesi} Sesi</p>
                                            </td>
                                            {/* Mode (online/offline) */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
                                                    order.mode === "offline" 
                                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800" 
                                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${order.mode === "offline" ? "bg-purple-500" : "bg-blue-500"}`} />
                                                    {order.mode === "offline" ? "Tatap Muka" : "Online"}
                                                </span>
                                            </td>
                                            {/* Harga */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatRupiah(order.harga)}</td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badgeCls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls} inline-block`} />
                                                    {st.label}
                                                </span>
                                            </td>
                                            {/* Tanggal */}
                                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help border-b border-dashed border-gray-400 font-medium">
                                                                {formatTimeAgo(order.rawDate, langCode)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{formatTooltipDate(order.rawDate)}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3 relative">
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation()
                                                        setOpenActionId(openActionId === order.id ? null : order.id)
                                                    }}
                                                    disabled={updatingStatus}
                                                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 transition-colors opacity-60 group-hover:opacity-100"
                                                >
                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                </button>
                                                {openActionId === order.id && (
                                                    <div
                                                        onClick={e => e.stopPropagation()}
                                                        className="absolute right-4 top-10 z-40 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl py-1.5 overflow-hidden"
                                                    >
                                                        <button
                                                            onClick={() => { const l = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en'; router.push(`/${l}/billing/orders/${order.id}`); }}
                                                            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                                                            Lihat Detail
                                                        </button>
                                                        <div className="my-1 h-px bg-gray-100 dark:bg-gray-800 mx-3" />
                                                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubah Status</div>
                                                        {STATUS_ACTIONS.map(action => (
                                                            <button
                                                                key={action.key}
                                                                onClick={() => handleAdvance(order.id, action.key)}
                                                                className={`w-full px-3 py-1.5 text-left text-xs font-semibold flex items-center gap-2 ${action.text} ${action.hover} transition-colors`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${action.dot} flex-shrink-0`} />
                                                                {action.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                        {paged.length === 0 ? (
                            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p>{search ? `Tidak ada pesanan untuk "${search}"` : "Tidak ada pesanan ditemukan"}</p>
                            </div>
                        ) : paged.map(order => {
                            const st = STATUS_CONFIG[order.status]
                            const isSelected = selectedIds.some(id => String(id) === String(order.id))
                            return (
                                <div key={order.id} onClick={() => { const l = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en'; router.push(`/${l}/billing/orders/${order.id}`); }} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative ${isSelected ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => { e.stopPropagation(); toggleSelected(order.id); }}
                                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div className="flex flex-col gap-0.5 items-start">
                                                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">{order.bookingCode}</span>
                                                {order.isApi && <span className="text-[9px] font-medium text-emerald-500 pl-1">API</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badgeCls}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls} inline-block`} />
                                                {st.label}
                                            </span>
                                            <button
                                                onClick={e => { e.stopPropagation(); setOpenActionId(openActionId === order.id ? null : order.id) }}
                                                disabled={updatingStatus}
                                                className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            >
                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-start mb-3 pl-7">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (order.userId) {
                                                    const langStr = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en';
                                                    router.push(`/${langStr}/users/manage/${order.userId}?tab=wallet`);
                                                }
                                            }}
                                            className={order.userId ? 'cursor-pointer group/membermobile inline-block' : ''}
                                            title={order.userId ? 'Lihat profil' : ''}
                                        >
                                            <p className="text-[10px] text-gray-500 mb-0.5">Murid</p>
                                            <p className={`text-sm font-semibold text-gray-900 dark:text-white ${order.userId ? 'group-hover/membermobile:text-emerald-600 dark:group-hover/membermobile:text-emerald-400' : ''}`}>{order.member}</p>
                                            <p className={`text-[11px] ${order.userId ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>@{order.username.replace(/^@/, '')}</p>
                                        </div>
                                        <div 
                                            className={`text-right ${order.trainerId ? 'cursor-pointer group/gurumobile' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (order.trainerId) {
                                                    const langStr = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en';
                                                    router.push(`/${langStr}/teachers/manage/${order.trainerId}?from=orders`);
                                                }
                                            }}
                                        >
                                            <p className="text-[10px] text-gray-500 mb-0.5">Guru</p>
                                            <p className={`text-sm font-semibold text-gray-900 dark:text-white ${order.trainerId ? 'group-hover/gurumobile:text-emerald-600 dark:group-hover/gurumobile:text-emerald-400 group-hover/gurumobile:underline' : ''}`}>{order.guru}</p>
                                            <p className={`text-[11px] ${order.trainerId ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>{order.guruUsername}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 ml-7">
                                        <div>
                                            <p className="text-[10px] text-gray-500 mb-0.5">{order.paket} &bull; {order.sesiSelesai}/{order.sesi} Sesi</p>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">{formatRupiah(order.harga)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${order.mode === "offline" ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800" : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${order.mode === "offline" ? "bg-purple-500" : "bg-blue-500"}`} />
                                                {order.mode === "offline" ? "Tatap Muka" : "Online"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action dropdown for mobile */}
                                    {openActionId === order.id && (
                                        <div onClick={e => e.stopPropagation()} className="absolute right-4 top-14 z-40 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl py-1.5 overflow-hidden">
                                            <button onClick={() => { const l = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en'; router.push(`/${l}/billing/orders/${order.id}`); }} className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" /> Lihat Detail
                                            </button>
                                            <div className="my-1 h-px bg-gray-100 dark:bg-gray-800 mx-3" />
                                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubah Status</div>
                                            {STATUS_ACTIONS.map(action => (
                                                <button key={action.key} onClick={() => handleAdvance(order.id, action.key)} className={`w-full px-3 py-1.5 text-left text-xs font-semibold flex items-center gap-2 ${action.text} ${action.hover} transition-colors`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${action.dot} flex-shrink-0`} /> {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* ── Pagination ── */}
                    <SmartPagination
                        total={filtered.length}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
                        loading={apiLoading}
                    />
                </div>
            </div>



            {/* ── Bulk Status Modal ── */}
            {bulkOpen && selectedIds.length > 0 && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={() => setBulkOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">Ubah Status Massal</p>
                                <p className="text-xs text-gray-500 mt-0.5">{selectedIds.length} pesanan dipilih</p>
                            </div>
                            <button onClick={() => setBulkOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2">
                            {STATUS_ACTIONS.map(action => (
                                <button
                                    key={action.key}
                                    onClick={() => handleBulkStatus(action.key)}
                                    disabled={updatingStatus}
                                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left text-sm font-semibold transition-all disabled:opacity-50 ${action.border} ${action.text} ${action.hover}`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${action.dot}`} />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                        <div className="px-4 pb-4">
                            <button
                                onClick={() => { setSelectedIds([]); setBulkOpen(false) }}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                            >
                                Batal &amp; Hapus Pilihan
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* User Wallet Modal */}
            {selectedWalletUserId && (
                <UserWalletModal
                    onClose={() => {
                        setSelectedWalletUserId(null);
                        setSelectedWalletUserName("");
                    }}
                    userId={selectedWalletUserId}
                    userName={selectedWalletUserName}
                />
            )}
        </div>
    )
}

export default function PesananPage() {
    return <PesananContent />
}

