"use client"

import { use, useEffect, useState } from "react"
import {
    ArrowLeft,
    User,
    BookOpen,
    CreditCard,
    Star,
    CheckCircle2,
    Clock,
    XCircle,
    Wifi,
    MapPin,
    Phone,
    Mail,
    Calendar,
    Zap,
} from "lucide-react"
import Link from "next/link"
import dummyData from "@/data/billing-dummy.json"
import { getSimOrderById, type SimOrder } from "@/lib/sim-store"

// ── helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}
function formatDate(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("id-ID", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
    })
}
function formatDateTime(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

// ── session status config ─────────────────────────────────────────────────────
const SESSION_STATUS = {
    completed: { label: "Selesai", icon: CheckCircle2, cls: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
    scheduled: { label: "Terjadwal", icon: Clock, cls: "text-sky-500", bg: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    cancelled: { label: "Batal", icon: XCircle, cls: "text-red-400", bg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
} as const

// ── booking status ────────────────────────────────────────────────────────────
const BOOKING_STATUS = {
    active: { label: "Aktif", dotCls: "bg-emerald-500", badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    completed: { label: "Selesai", dotCls: "bg-blue-500", badgeCls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    cancelled: { label: "Batal", dotCls: "bg-red-500", badgeCls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
} as const

// ── package badge ─────────────────────────────────────────────────────────────
const PACKAGE_CFG: Record<string, { cls: string }> = {
    "1x": { cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
    "5x": { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    "10x": { cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
}

// ── Sim Order Detail View ─────────────────────────────────────────────────────
function SimOrderDetail({ order }: { order: SimOrder }) {
    const isPaid = order.paymentStatus === "paid"
    const statusLabel = isPaid ? "Aktif" : "Menunggu Bayar"
    const statusCls = isPaid
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    const statusDot = isPaid ? "bg-emerald-500" : "bg-amber-500"

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1200px] mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/billing/member-subscription"
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-emerald-600 hover:border-emerald-400 transition-all shadow-sm">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Detail Pesan</h1>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                            {statusLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold">
                            <Zap className="w-2.5 h-2.5" /> SIMULASI
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-10">
                    {/* Left */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* ── Progress Belajar Card ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                        <BookOpen className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Progress Belajar</span>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-600">
                                    {order.completedSessions} / {order.totalSessions} Selesai
                                </span>
                            </div>
                            <div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${Math.round(order.completedSessions / order.totalSessions * 100)}%` }} />
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                                    {Math.round(order.completedSessions / order.totalSessions * 100)}% perjalanan belajar selesai
                                </p>
                            </div>
                        </div>

                        {/* Jadwal Sesi */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                    <Calendar className="w-4 h-4 text-emerald-500" /> Jadwal Sesi
                                </div>
                                {isPaid && order.sessions?.length > 0 && (
                                    <span className="text-[11px] text-gray-400 font-medium">
                                        {order.sessions.length} sesi terjadwal
                                    </span>
                                )}
                            </div>

                            {!isPaid || !order.sessions?.length ? (
                                <p className="text-sm text-gray-400 text-center py-6">
                                    Jadwal sesi akan ditentukan setelah pembayaran dikonfirmasi
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {order.sessions.map((sess) => {
                                        const sessDate = new Date(sess.date)
                                        const dateStr = sessDate.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                                        const isSched = sess.status === "scheduled"
                                        const isDone = sess.status === "completed"
                                        return (
                                            <div key={sess.sessionNo}
                                                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/20">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                                                    ${isDone ? "bg-emerald-500 text-white" :
                                                        isSched ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" :
                                                            "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                                                    {isDone ? "✓" : sess.sessionNo}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        Sesi {sess.sessionNo}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        {sess.startTime} – {sess.endTime}
                                                    </p>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block
                                                        ${isDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                            isSched ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" :
                                                                "bg-gray-100 text-gray-500"}`}>
                                                        {isDone ? "Selesai" : isSched ? "Terjadwal" : "Batal"}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Pembayaran */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                                <CreditCard className="w-4 h-4 text-emerald-500" /> Informasi Pembayaran
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">#Invoice</p><p className="font-bold text-gray-900 dark:text-white">{order.invoiceNo}</p></div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Metode</p><p className="font-bold text-gray-900 dark:text-white">{order.paymentGateway || "—"}</p></div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {isPaid ? "✅ Lunas" : "⏳ Pending"}
                                    </span>
                                </div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Harga Paket</p><p className="font-bold text-gray-900 dark:text-white">{formatRupiah(order.pkg.price)}</p></div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Biaya Layanan</p><p className="font-bold text-gray-900 dark:text-white">{formatRupiah(order.pkg.serviceFee)}</p></div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1 font-black">Total Bayar</p><p className="font-black text-emerald-600 text-base">{formatRupiah(order.pkg.price + order.pkg.serviceFee)}</p></div>
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-4">
                        {/* Member */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-3">
                                <User className="w-4 h-4 text-emerald-500" /> Informasi Member
                            </div>
                            <a href={`/myqurani/profiles/${order.member.id}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 group hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-xl p-2 -mx-2 transition-colors">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-100 flex-shrink-0">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(order.member.name)}&background=10b981&color=fff`} alt={order.member.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base group-hover:text-emerald-600 transition-colors">{order.member.name}</p>
                                </div>
                            </a>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Mail className="w-3.5 h-3.5 text-emerald-500" />{order.member.email}</div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Phone className="w-3.5 h-3.5 text-emerald-500" />{order.member.phone}</div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><MapPin className="w-3.5 h-3.5 text-emerald-500" />{order.member.location}</div>
                            </div>
                        </div>

                        {/* Guru */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-3">
                                <BookOpen className="w-4 h-4 text-emerald-500" /> Guru
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-100 flex-shrink-0">
                                    <img src={order.trainer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.trainer.name)}&background=10b981&color=fff`} alt={order.trainer.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base">{order.trainer.name}</p>
                                    <p className="text-[11px] text-emerald-600 font-semibold">@{order.trainer.email.split("@")[0]}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded text-amber-600 font-bold text-[10px]">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{order.trainer.rating}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400">{order.trainer.totalStudents} Murid</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-400 font-bold">
                                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />{order.trainer.specialization}
                                </div>
                            </div>
                        </div>

                        {/* ── Informasi Pesanan Card (Moved) ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-3">
                                <BookOpen className="w-4 h-4 text-emerald-500" /> Informasi Pesanan
                            </div>
                            <div className="space-y-3 text-xs">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Nama Paket</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{order.pkg.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Metode Belajar</p>
                                    <p className="font-bold text-gray-700 dark:text-gray-300">{order.mode === "online" ? "🌐 Online" : "Offline"} • {order.paymentMethod}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Mulai Sesi</p>
                                    <p className="font-bold text-gray-700 dark:text-gray-300">{new Date(order.bookingDate).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BookingDetailContent({ id }: { id: number }) {
    const [simOrder, setSimOrder] = useState<SimOrder | null | undefined>(undefined)

    useEffect(() => {
        if (id >= 9001) {
            setSimOrder(getSimOrderById(id))
        } else {
            setSimOrder(null)
        }
    }, [id])

    if (simOrder === undefined) return null
    if (simOrder !== null) return <SimOrderDetail order={simOrder} />

    const booking = dummyData.bookings.find(b => b.id === id)
    const detail = dummyData.bookingDetails.find(d => d.bookingId === id)

    if (!booking || !detail) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex flex-col items-center justify-center gap-4">
                <div className="text-6xl">🔍</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pesan tidak ditemukan</h2>
                <p className="text-gray-500 text-sm">ID #{id} tidak ada dalam data.</p>
                <Link href="/billing/member-subscription"
                    className="text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
                </Link>
            </div>
        )
    }

    const bStatus = BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS]
    const paidStr = detail.payment.status === "paid" ? "Lunas" : "Belum Dibayar"
    const paidCls = detail.payment.status === "paid"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    const sessCompleted = detail.sessions.filter(s => s.status === "completed").length
    const pct = Math.round((sessCompleted / booking.totalSessions) * 100)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1200px] mx-auto space-y-4">

                {/* ── Back + Header ── */}
                <div className="flex items-center gap-3">
                    <Link href="/billing/member-subscription"
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                Detail Pesan
                            </h1>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${bStatus?.badgeCls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${bStatus?.dotCls}`} />
                                {bStatus?.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-10">

                    {/* ── LEFT column ── */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* ── Progress Belajar Card ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                        <BookOpen className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Progress Belajar</span>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-600">
                                    {sessCompleted} / {booking.totalSessions} Selesai
                                </span>
                            </div>
                            <div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                                    {pct}% perjalanan belajar selesai
                                </p>
                            </div>
                        </div>

                        {/* Session List */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 px-5 py-4 uppercase tracking-wider">
                                <Calendar className="w-4 h-4 text-emerald-500" /> Jadwal Sesi
                            </div>
                            <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                                {detail.sessions.map(s => {
                                    const sc = SESSION_STATUS[s.status as keyof typeof SESSION_STATUS]
                                    const Icon = sc?.icon ?? Clock
                                    return (
                                        <div key={s.no} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30"
                                                : s.status === "cancelled" ? "bg-red-100 dark:bg-red-900/30"
                                                    : "bg-sky-100 dark:bg-sky-900/30"
                                                }`}>
                                                <Icon className={`w-4 h-4 ${sc?.cls}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-gray-950 dark:text-white">
                                                        Pertemuan {s.no}
                                                    </span>
                                                    <span className={`text-[9px] rounded-full px-2 py-0.5 font-bold uppercase ${sc?.bg}`}>
                                                        {sc?.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-bold text-gray-950 dark:text-gray-300">{s.date}</p>
                                                <p className="text-[10px] text-gray-400">{s.time}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <CreditCard className="w-4 h-4 text-emerald-500" /> Informasi Pembayaran
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter"># Invoice</span>
                                        <span className="font-mono font-bold text-gray-950 dark:text-gray-300">{detail.payment.invoiceNo}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Payment</span>
                                        <span className="font-bold text-gray-950 dark:text-gray-300">{detail.payment.method}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Status</span>
                                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${paidCls}`}>{paidStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Waktu Bayar</span>
                                        <span className="text-gray-600 font-bold dark:text-gray-300 text-right">{formatDateTime(detail.payment.paidAt)}</span>
                                    </div>
                                </div>
                                <div className="border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-3 md:pt-0 md:pl-6 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase">Harga Paket</span>
                                        <span className="font-bold text-gray-950">{formatRupiah(detail.payment.pricePackage)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase">Biaya Layanan</span>
                                        <span className="font-bold text-gray-950">{formatRupiah(detail.payment.serviceFee)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black text-gray-950 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <span className="uppercase">Total Bayar</span>
                                        <span className="text-emerald-600">{formatRupiah(detail.payment.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── RIGHT column ── */}
                    <div className="space-y-4">
                        {/* Member Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <User className="w-4 h-4 text-emerald-500" /> Informasi Member
                            </div>
                            <a
                                href={`/myqurani/profiles/${detail.member.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 group cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-xl p-2 -mx-2 transition-colors"
                            >
                                <div className="w-14 h-14 rounded-full border-2 border-emerald-100 p-0.5 flex-shrink-0">
                                    <div className="w-full h-full rounded-full overflow-hidden">
                                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(detail.member.name)}&background=10b981&color=fff`} alt={detail.member.name} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-gray-950 dark:text-white text-base leading-tight group-hover:text-emerald-600 transition-colors">{detail.member.name}</p>
                                </div>
                            </a>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400">
                                    <Mail className="w-3.5 h-3.5 text-emerald-500" /> {detail.member.email}
                                </div>
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400">
                                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> {detail.member.phone}
                                </div>
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500" /> {detail.member.location}
                                </div>
                            </div>
                        </div>

                        {/* Trainer (Guru) Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <BookOpen className="w-4 h-4 text-emerald-500" /> Guru
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-100 shadow-sm flex-shrink-0">
                                    <img
                                        src={(detail.trainer as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.trainer.name)}&background=10b981&color=fff`}
                                        alt={detail.trainer.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base leading-tight">{detail.trainer.name}</p>
                                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                                        @{detail.trainer.email.split("@")[0]}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded text-amber-600 font-bold text-[10px]">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        {detail.trainer.rating}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-tight">{detail.trainer.totalStudents} Murid</span>
                                </div>
                                <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-400 font-bold">
                                    <BookOpen className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{detail.trainer.specialization}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Informasi Pesanan Card (Moved) ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-3">
                                <BookOpen className="w-4 h-4 text-emerald-500" /> Informasi Pesanan
                            </div>
                            <div className="space-y-3 text-xs">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Nama Paket</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{booking.packageName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Metode Belajar</p>
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${booking.mode === "online" ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" : "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                                            {booking.mode === "online" ? <Wifi className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                            {booking.mode === "online" ? "Online" : "Offline"}
                                        </span>
                                        <span className="font-bold text-gray-700 dark:text-gray-300 italic border-l border-gray-200 dark:border-gray-700 pl-2">{booking.paymentMethod}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Mulai Sesi</p>
                                    <p className="font-bold text-gray-950 dark:text-gray-200">{formatDate(booking.bookingDate)}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const numId = Number(id)

    return (
                <BookingDetailContent id={numId} />
    )
}
