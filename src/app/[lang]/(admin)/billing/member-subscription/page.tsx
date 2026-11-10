"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    RefreshCcw,
    Download,
    Filter,
    Users,
    CheckCircle2,
    Clock,
    ChevronsUpDown,
    Sparkles,
    Zap,
    X,
    ChevronRight as Next,
    Trash2,
} from "lucide-react"
import Link from "next/link"
import dummyData from "@/data/billing-dummy.json"
import {
    getSimOrders,
    getSimOrderById,
    saveSimOrder,
    updateSimOrderPayment,
    clearSimOrders,
    nextSimId,
    addSimNotif,
    type SimOrder,
} from "@/lib/sim-store"
import { SimToast, SimNotifBell } from "@/components/sim-notif"

// ── Types ─────────────────────────────────────────────────────────────────────
type BookingStatus = "all" | "lunas" | "pending"
type PackageKey = "all" | "1x" | "5x" | "10x"

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

function formatDate(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
    })
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
    active: { label: "Lunas", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    completed: { label: "Lunas", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    cancelled: { label: "Pending", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    pending: { label: "Pending", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
} as const

const PACKAGE_CFG: Record<string, { label: string; cls: string }> = {
    "1x": { label: "1x Pertemuan", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    "5x": { label: "5x Pertemuan", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    "10x": { label: "10x Pertemuan", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
}

function SessionBadge({ completed, total }: { completed: number; total: number }) {
    const cls = completed === 0
        ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}>
            {completed}/{total} sesi
        </span>
    )
}

const PAGE_SIZE = 10

// ── Sim data: extract members & trainers from dummy ───────────────────────────
const SIM_MEMBERS = dummyData.bookingDetails.reduce((acc, d) => {
    if (!acc.find((m: any) => m.id === d.member.id)) acc.push(d.member)
    return acc
}, [] as any[])

const SIM_TRAINERS = dummyData.bookingDetails.reduce((acc, d) => {
    if (!acc.find((t: any) => t.id === d.trainer.id)) acc.push(d.trainer)
    return acc
}, [] as any[])

const SIM_METHOD: Record<number, string> = {
    300: "Ummi", 301: "Ummi", 302: "Tilawati",
    303: "IQRO", 304: "IQRO", 305: "Tahsin",
}

// ── Convert SimOrder → row format (same as booking) ──────────────────────────
function simOrderToRow(o: SimOrder) {
    const pkgKey = `${o.pkg.sessions}x` as "1x" | "5x" | "10x"
    return {
        id: o.id,
        userName: o.member.name,
        userEmail: o.member.email,
        trainerName: o.trainer.name,
        packageName: o.pkg.name,
        packageKey: pkgKey,
        completedSessions: o.completedSessions,
        totalSessions: o.totalSessions,
        totalPayment: o.paymentStatus === "paid" ? o.pkg.price + o.pkg.serviceFee : 0,
        status: o.status,
        bookingDate: o.bookingDate,
        paymentGateway: o.paymentGateway || "—",
        _isSim: true,
    }
}

// ── MODAL SIMULASI ─────────────────────────────────────────────────────────────
interface SimModalProps {
    onClose: () => void
    onOrderCreated: () => void
    initialOrderId?: number   // jika ada → langsung ke step 4 (bayar pesanan pending)
}

function SimModal({ onClose, onOrderCreated, initialOrderId }: SimModalProps) {
    // Jika ada initialOrderId → ambil data order dari localStorage, langsung step 4
    const initOrder = initialOrderId ? getSimOrderById(initialOrderId) : null

    const [step, setStep] = useState(initOrder ? 4 : 1)
    const [selMember, setSelMember] = useState<any>(initOrder?.member ?? null)
    const [selTrainer, setSelTrainer] = useState<any>(initOrder?.trainer ?? null)
    const [selPkg, setSelPkg] = useState<any>(initOrder ? {
        sessions: initOrder.pkg.sessions,
        name: initOrder.pkg.name,
        basePrice: initOrder.pkg.price,
        serviceFee: initOrder.pkg.serviceFee,
    } : null)
    const [selGateway, setSelGateway] = useState("")
    const [pendingOrderId, setPendingOrderId] = useState<number | null>(initOrder?.id ?? null)
    const [done, setDone] = useState(false)

    // Paket berdasarkan trainer terpilih
    const trainerPackages = useMemo(() => {
        if (!selTrainer) return []
        return dummyData.trainerPackages.filter((p: any) => p.trainerId === selTrainer.id)
    }, [selTrainer])

    // Step 3: buat order PENDING
    function handleOrder() {
        if (!selMember || !selTrainer || !selPkg) return
        const id = nextSimId()
        const order: SimOrder = {
            id,
            member: selMember,
            trainer: selTrainer,
            pkg: {
                key: (`${selPkg.sessions}x`) as "1x" | "5x" | "10x",
                name: selPkg.name,
                sessions: selPkg.sessions,
                price: selPkg.basePrice,
                serviceFee: selPkg.serviceFee,
            },
            mode: "online",
            paymentGateway: "",
            paymentMethod: SIM_METHOD[selTrainer.id] || "Ummi",
            status: "pending",
            paymentStatus: "pending",
            bookingDate: new Date().toISOString(),
            paidAt: null,
            invoiceNo: `INV-SIM-${id}`,
            completedSessions: 0,
            totalSessions: selPkg.sessions,
            sessions: [],         // akan diisi otomatis saat bayar
        }
        saveSimOrder(order)
        setPendingOrderId(id)

        // Notif #1 PENDING
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

    // Step 4: konfirmasi bayar
    function handlePay() {
        if (!pendingOrderId || !selGateway) return
        updateSimOrderPayment(pendingOrderId, selGateway)

        // Notif #2 PAID
        addSimNotif({
            type: "payment_success",
            message: "Pembayaran Berhasil ✅",
            subMessage: `${selMember.name} • ${selGateway} • ${formatRupiah(selPkg.basePrice + selPkg.serviceFee)}`,
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
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Simulasi Pesanan Baru</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
                        /* Sukses */
                        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">Pembayaran Berhasil!</p>
                            <p className="text-sm text-gray-500">Pesanan #{pendingOrderId} sudah masuk ke daftar</p>
                            <button
                                onClick={onClose}
                                className="mt-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                Lihat di Tabel
                            </button>
                        </div>
                    ) : step === 1 ? (
                        /* Step 1: Pilih Member */
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih member yang memesan:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {SIM_MEMBERS.map((m: any) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelMember(m)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selMember?.id === m.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {m.name.charAt(0)}
                                        </div>
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
                        /* Step 2: Pilih Guru */
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih guru:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {SIM_TRAINERS.map((t: any) => (
                                    <button
                                        key={t.id}
                                        onClick={() => { setSelTrainer(t); setSelPkg(null) }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selTrainer?.id === t.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                    >
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
                        /* Step 3: Pilih Paket */
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih paket dari {selTrainer?.name}:</p>
                            {trainerPackages.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">Tidak ada paket tersedia</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {trainerPackages.map((p: any) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelPkg(p)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${selPkg?.id === p.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                                <p className="text-[11px] text-gray-400">{p.sessions}x sesi · {p.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-emerald-600">{formatRupiah(p.totalPrice)}</p>
                                                {selPkg?.id === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Ringkasan sebelum pesan */}
                            {selPkg && (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 text-xs space-y-1 border border-gray-200 dark:border-gray-700">
                                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Ringkasan Pesanan:</p>
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
                        /* Step 4: Pilih Metode Bayar */
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih metode pembayaran:</p>
                            <div className="space-y-1.5">
                                {["GoPay", "QRIS", "OVO"].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setSelGateway(g)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${selGateway === g ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                    >
                                        {g}
                                        {selGateway === g && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </button>
                                ))}
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                ⚠️ Pesanan #{pendingOrderId} sudah masuk dengan status <b>Menunggu Bayar</b>. Pilih metode untuk konfirmasi.
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!done && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => step > 1 && step < 4 ? setStep(s => s - 1) : onClose()}
                            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                        >
                            {step === 1 ? "Batal" : step < 4 ? "← Kembali" : ""}
                        </button>
                        {step === 3 ? (
                            <button
                                onClick={handleOrder}
                                disabled={!selPkg}
                                className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
                            >
                                Pesan Sekarang <Next className="w-4 h-4" />
                            </button>
                        ) : step === 4 ? (
                            <button
                                onClick={handlePay}
                                disabled={!selGateway}
                                className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
                            >
                                Konfirmasi Bayar <CheckCircle2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={(step === 1 && !selMember) || (step === 2 && !selTrainer)}
                                className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
                            >
                                Lanjut <Next className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── MAIN PAGE CONTENT ─────────────────────────────────────────────────────────
function MemberSubscriptionContent() {
    const staticBookings = dummyData.bookings
    const [simOrders, setSimOrders] = useState<SimOrder[]>([])
    const [showModal, setShowModal] = useState(false)
    const [payOrderId, setPayOrderId] = useState<number | null>(null) // notif → bayar langsung
    const [search, setSearch] = useState("")
    const [statusFilter, setStatus] = useState<BookingStatus>("all")
    const [packageFilter, setPackage] = useState<PackageKey>("all")
    const [page, setPage] = useState(1)
    const [sortField, setSortField] = useState<string>("id")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

    // Baca sim orders dari localStorage
    const refreshSim = useCallback(() => {
        setSimOrders(getSimOrders())
    }, [])

    useEffect(() => {
        refreshSim()
        window.addEventListener("sim-notif-update", refreshSim)
        // Notif diklik → buka bayar pesanan pending
        function onOpenPayment(e: Event) {
            const orderId = (e as CustomEvent<number>).detail
            setPayOrderId(orderId)
            setShowModal(true)
        }
        window.addEventListener("sim-open-payment", onOpenPayment)
        return () => {
            window.removeEventListener("sim-notif-update", refreshSim)
            window.removeEventListener("sim-open-payment", onOpenPayment)
        }
    }, [refreshSim])

    // Gabung static + sim, sim orders di paling atas
    const allBookings = useMemo(() => {
        const simRows = simOrders.map(simOrderToRow)
        return [...simRows, ...staticBookings]
    }, [simOrders, staticBookings])

    const summary = useMemo(() => ({
        total: allBookings.length,
        lunas: allBookings.filter(b => b.status === "active" || b.status === "completed").length,
        pending: allBookings.filter(b => b.status === "pending" || b.status === "cancelled").length,
    }), [allBookings])

    const filtered = useMemo(() => {
        let list = [...allBookings]
        if (statusFilter === "lunas") list = list.filter(b => b.status === "active" || b.status === "completed")
        if (statusFilter === "pending") list = list.filter(b => b.status === "pending" || b.status === "cancelled")
        if (packageFilter !== "all") list = list.filter(b => b.packageKey === packageFilter)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(b =>
                b.userName.toLowerCase().includes(q) ||
                b.userEmail.toLowerCase().includes(q) ||
                b.trainerName.toLowerCase().includes(q) ||
                b.packageName.toLowerCase().includes(q) ||
                b.paymentGateway?.toLowerCase().includes(q) ||
                String(b.id).includes(q)
            )
        }
        list.sort((a, b) => {
            let av: number | string = (a as any)[sortField] ?? ""
            let bv: number | string = (b as any)[sortField] ?? ""
            if (typeof av === "string") av = av.toLowerCase()
            if (typeof bv === "string") bv = bv.toLowerCase()
            if (av < bv) return sortDir === "asc" ? -1 : 1
            if (av > bv) return sortDir === "asc" ? 1 : -1
            return 0
        })
        return list
    }, [allBookings, statusFilter, packageFilter, search, sortField, sortDir])

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function handleSort(field: string) {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(field); setSortDir("asc") }
        setPage(1)
    }

    function SortIcon({ field }: { field: string }) {
        return (
            <ChevronsUpDown className={`w-3 h-3 inline ml-1 ${sortField === field ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`} />
        )
    }

    function handleResetSim() {
        clearSimOrders()
        setSimOrders([])
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            {/* Toast global */}
            <SimToast />

            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h1 className="text-2xl font-black text-gray-950 dark:text-white">Pesanan</h1>
                    <div className="flex items-center gap-2">
                        {/* Reset simulasi (hanya tampil jika ada sim orders) */}
                        {simOrders.length > 0 && (
                            <button
                                onClick={handleResetSim}
                                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Reset Sim
                            </button>
                        )}

                        {/* Bell notif */}
                        <SimNotifBell />

                        {/* Tombol simulasi */}
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-medium"
                        >
                            <Zap className="w-4 h-4" /> Simulasi
                        </button>

                        <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <button onClick={refreshSim} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                            <RefreshCcw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {/* ── Status tabs ── */}
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { key: "all", label: `Semua: ${summary.total}`, icon: Users, active: statusFilter === "all" },
                        { key: "lunas", label: `Lunas: ${summary.lunas}`, icon: CheckCircle2, active: statusFilter === "lunas" },
                        { key: "pending", label: `Pending: ${summary.pending}`, icon: Clock, active: statusFilter === "pending" },
                    ].map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.key}
                                onClick={() => { setStatus(tab.key as BookingStatus); setPage(1) }}
                                className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg border transition-colors ${tab.active
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                    : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold"
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* ── Toolbar ── */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama, email, trainer, atau paket..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Paket:</span>
                        {[
                            { key: "all", label: "Semua" },
                            { key: "1x", label: "1x Pertemuan" },
                            { key: "5x", label: "5x Pertemuan" },
                            { key: "10x", label: "10x Pertemuan" },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => { setPackage(t.key as PackageKey); setPage(1) }}
                                className={`text-xs px-4 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${packageFilter === t.key
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold"
                                    : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold"
                                    }`}
                            >
                                {t.key === "all" && <Sparkles className="w-3.5 h-3.5" />}
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("id")}>ID <SortIcon field="id" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("userName")}>Member <SortIcon field="userName" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("trainerName")}>Guru <SortIcon field="trainerName" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("packageName")}>Paket <SortIcon field="packageName" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("packageKey")}>Sesi <SortIcon field="packageKey" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("completedSessions")}>Progress <SortIcon field="completedSessions" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("totalPayment")}>Harga <SortIcon field="totalPayment" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("status")}>Status <SortIcon field="status" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("bookingDate")}>Tgl Pesan <SortIcon field="bookingDate" /></th>
                                    <th className="text-left text-xs font-extrabold text-slate-900 dark:text-slate-200 px-4 py-3 whitespace-nowrap">Payment</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada data yang ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map((booking: any) => {
                                    const st = STATUS_CFG[(booking.status as keyof typeof STATUS_CFG)] ?? STATUS_CFG.active
                                    const pkg = PACKAGE_CFG[booking.packageKey] ?? { label: booking.packageKey, cls: "bg-gray-100 text-gray-600" }
                                    return (
                                        <tr key={booking.id}
                                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${booking._isSim ? "bg-emerald-50/30 dark:bg-emerald-900/5" : ""}`}>
                                            {/* ID */}
                                            <td className="px-4 py-3 text-xs text-slate-600 font-bold font-mono">
                                                #{booking.id}
                                                {booking._isSim && (
                                                    <span className="ml-1 text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded font-bold">SIM</span>
                                                )}
                                            </td>
                                            {/* Member */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                        {booking.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <p className="font-bold text-gray-950 dark:text-white text-xs leading-tight">{booking.userName}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-gray-950 dark:text-gray-100">{booking.trainerName}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{booking.packageName}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${pkg.cls}`}>{pkg.label}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <SessionBadge completed={booking.completedSessions} total={booking.totalSessions} />
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-gray-950 dark:text-white">
                                                {booking.totalPayment > 0 ? formatRupiah(booking.totalPayment) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.bg} ${st.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-300">{formatDate(booking.bookingDate)}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-950 dark:text-slate-100">
                                                <span className={`px-2 py-0.5 rounded-md ${booking.paymentGateway && booking.paymentGateway !== "—" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "text-gray-400"}`}>
                                                    {booking.paymentGateway || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/billing/orders/${booking.id}`}
                                                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                                                        <Eye className="w-3.5 h-3.5" /> Detail
                                                    </Link>
                                                    <span className="text-gray-200 dark:text-gray-700">|</span>
                                                    <button className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium">Batalkan</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page
                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal Simulasi */}
            {showModal && (
                <SimModal
                    onClose={() => { setShowModal(false); setPayOrderId(null) }}
                    onOrderCreated={refreshSim}
                    initialOrderId={payOrderId ?? undefined}
                />
            )}
        </div>
    )
}

export default function MemberSubscriptionPage() {
    return (
                <MemberSubscriptionContent />
    )
}
