"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Loader2, Filter, AlertCircle, ChevronDown, ShoppingCart, MoreHorizontal } from "lucide-react"
import { fetchAdminBookings, type BillingPipelineOrder, type BillingPipelineStatus } from "@/lib/billing-bookings"
import dummyData from "@/data/billing-dummy.json"
import guruDetailDummy from "@/data/guru-detail-dummy.json"
import { getSimOrders, type SimOrder } from "@/lib/sim-store"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/providers/i18n-provider"

interface Props {
    trainerId: string | number
    userId?: string | number
    locale?: string | string[]
}

const STATUS_CONFIG: Record<string, { key: string; fallback: string; dotCls: string; badgeCls: string }> = {
    baru: { key: "teacher_detail.orders_tab.status.pending", fallback: "Pending", dotCls: "bg-amber-500", badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    lunas: { key: "teacher_detail.orders_tab.status.active", fallback: "Aktif", dotCls: "bg-sky-500", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    aktif: { key: "teacher_detail.orders_tab.status.active", fallback: "Aktif", dotCls: "bg-sky-500", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    gagal: { key: "teacher_detail.orders_tab.status.cancelled", fallback: "Batal", dotCls: "bg-rose-500", badgeCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
    selesai: { key: "teacher_detail.orders_tab.status.completed", fallback: "Selesai", dotCls: "bg-emerald-500", badgeCls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
    menunggu_guru: { key: "teacher_detail.orders_tab.status.waiting_teacher", fallback: "Menunggu Guru", dotCls: "bg-amber-500", badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
}

type StatusFilter = "semua" | BillingPipelineStatus

const STATUS_TABS: { key: StatusFilter; labelKey: string; fallback: string }[] = [
    { key: "semua", labelKey: "teacher_detail.orders_tab.status.all", fallback: "Semua" },
    { key: "baru", labelKey: "teacher_detail.orders_tab.status.pending", fallback: "Pending" },
    { key: "aktif", labelKey: "teacher_detail.orders_tab.status.active", fallback: "Aktif" },
    { key: "selesai", labelKey: "teacher_detail.orders_tab.status.completed", fallback: "Selesai" },
    { key: "gagal", labelKey: "teacher_detail.orders_tab.status.cancelled", fallback: "Batal" },
]

function normalizeFilterStatus(status: BillingPipelineStatus): StatusFilter {
    if (status === "lunas" || status === "menunggu_guru") return "baru"
    return status
}

function toUsername(email: string, name: string) {
    if (email && email.includes("@")) return email.split("@")[0].replace(/[^a-z0-9._-]/gi, "").toLowerCase()
    return name.toLowerCase().replace(/[^a-z0-9._-]/g, "")
}

function initials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

function getStage(b: typeof dummyData.bookings[0]): BillingPipelineStatus {
    const s = b.status
    if (s === "cancelled") return "gagal"
    if (s === "completed") return "selesai"
    if (s === "pending_trainer") return "menunggu_guru"
    if (s === "pending_payment") return "baru"
    if (s === "active" && b.completedSessions > 0) return "aktif"
    if (s === "active") return "lunas"
    return "baru"
}

function bookingToPipeline(b: typeof dummyData.bookings[0]): BillingPipelineOrder {
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

function simOrderToPipeline(o: SimOrder): BillingPipelineOrder {
    let status: BillingPipelineStatus = "baru"
    if (o.status === "cancelled") status = "gagal"
    else if (o.paymentStatus === "paid" && o.completedSessions > 0) status = "aktif"
    else if (o.paymentStatus === "paid") status = "lunas"
    return {
        id: o.id,
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
        // @ts-ignore
        trainerId: o.trainer.id
    }
}

export function TeacherOrdersTab({ trainerId, userId, locale }: Props) {
    const router = useRouter()
    const { t } = useI18n()
    const activeLocale = (Array.isArray(locale) ? locale[0] : locale) || "id"
    const [orders, setOrders] = useState<BillingPipelineOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua")
    const [filterOpen, setFilterOpen] = useState(false)

    useEffect(() => {
        let mounted = true
        async function load() {
            setLoading(true)
            try {
                // 1. Coba fetch API
                let data = await fetchAdminBookings({ trainerId: Number(trainerId), pageSize: 200 })
                if (data.length === 0 && userId && Number(userId) !== Number(trainerId)) {
                    data = await fetchAdminBookings({ trainerId: Number(userId), pageSize: 200 })
                }

                // 2. Load sim orders (filtered ke trainerId ini saja)
                const simRows = getSimOrders()
                    .filter(o => String(o.trainer.id) === String(trainerId))
                    .map(simOrderToPipeline)

                // 3. Load dummy JSON orders per trainer (sumber utama fallback)
                const jsonDummyRows: BillingPipelineOrder[] = dummyData.bookings
                    .filter((o: any) => String(o.trainerId) === String(trainerId))
                    .map((o: any) => bookingToPipeline(o))

                const trainerOrdersRows: BillingPipelineOrder[] = ((guruDetailDummy.ordersByTrainer as any)[String(trainerId)] || []).map((o: any) => {
                    let status: BillingPipelineStatus = "baru"
                    if (o.status === "selesai") status = "selesai"
                    else if (o.status === "gagal") status = "gagal"
                    else if (o.status === "aktif") status = "aktif"

                    return {
                        id: o.id,
                        userId: o.memberId,
                        bookingCode: `#${String(o.id).toUpperCase()}`,
                        member: o.memberName,
                        username: toUsername("", o.memberName),
                        memberAvatar: initials(o.memberName),
                        guru: "Trainer",
                        guruUsername: `@trainer`,
                        paket: o.courseName,
                        sesi: o.totalSessions,
                        sesiSelesai: o.completedSessions,
                        harga: o.price,
                        tglPesan: new Date(o.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
                        payment: o.paymentStatus === "paid" ? "Paid" : "Pending",
                        rawDate: new Date(o.bookingDate),
                        status,
                        isPendingPayment: o.paymentStatus === "pending",
                        mode: o.mode || "online",
                        trainerId: Number(trainerId)
                    }
                })

                // 4. Merge: API data diutamakan, dummy sebagai fallback jika kosong
                const apiAndSim = [...data, ...simRows]
                const allDummies = [...jsonDummyRows, ...trainerOrdersRows]
                if (apiAndSim.length > 0) {
                    // API / sim berhasil — pakai itu, jangan duplikasi dengan dummy
                    const uniqueIds = new Set<string | number>(apiAndSim.map(o => o.id))
                    const extra = allDummies.filter(o => !uniqueIds.has(o.id))
                    if (mounted) setOrders([...apiAndSim, ...extra].sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()))
                } else {
                    // API gagal / kosong — pakai dummy JSON saja
                    if (mounted) setOrders(allDummies.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()))
                }
            } catch (err) {
                console.error("Failed to load orders", err)
                // Fallback total ke dummy JSON
                const jsonDummyRows: BillingPipelineOrder[] = dummyData.bookings
                    .filter((o: any) => String(o.trainerId) === String(trainerId))
                    .map((o: any) => bookingToPipeline(o))
                if (mounted) setOrders(jsonDummyRows.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()))
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [trainerId, userId])

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat(activeLocale, { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

    const counts = useMemo(() => {
        const c: Record<StatusFilter, number> = { semua: orders.length, baru: 0, aktif: 0, selesai: 0, gagal: 0, lunas: 0, menunggu_guru: 0 }
        orders.forEach(o => {
            const ns = normalizeFilterStatus(o.status)
            if (ns in c) c[ns]++
        })
        return c
    }, [orders])

    const filtered = useMemo(() => {
        return orders.filter(o => {
            if (statusFilter !== "semua" && normalizeFilterStatus(o.status) !== statusFilter) return false
            const q = search.toLowerCase()
            if (q && !o.member.toLowerCase().includes(q) && !o.bookingCode.toLowerCase().includes(q) && !o.paket.toLowerCase().includes(q)) {
                return false
            }
            return true
        })
    }, [orders, statusFilter, search])

    const activeTab = STATUS_TABS.find(x => x.key === statusFilter)

    return (
        <div className="p-4 sm:p-5 space-y-4">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t("teacher_detail.orders_tab.search", "Cari pesanan, nama murid, atau paket...")}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    />
                </div>

                {/* Dropdown filter */}
                <div className="relative w-full sm:w-auto">
                    <button
                        onClick={() => setFilterOpen(v => !v)}
                        className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors justify-center"
                    >
                        <Filter className="w-4 h-4" />
                        {statusFilter === "semua" ? t("teacher_detail.orders_tab.filter_label", "Filter Status") : activeTab ? t(activeTab.labelKey, activeTab.fallback) : ""}
                        {statusFilter !== "semua" && (
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                                {counts[statusFilter]}
                            </span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
                    </button>

                    {filterOpen && (
                        <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                            {STATUS_TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => { setStatusFilter(tab.key); setFilterOpen(false) }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${statusFilter === tab.key
                                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                >
                                    <span>{t(tab.labelKey, tab.fallback)}</span>
                                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${statusFilter === tab.key
                                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                        }`}>
                                        {counts[tab.key]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm">{t("teacher_detail.orders_tab.loading", "Memuat data pesanan...")}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                        {orders.length === 0
                            ? t("teacher_detail.orders_tab.empty_all", "Belum ada pesanan untuk guru ini.")
                            : t("teacher_detail.orders_tab.empty_filter", "Tidak ada pesanan dengan filter ini.")}
                    </p>
                    {statusFilter !== "semua" && orders.length > 0 && (
                        <button
                            onClick={() => setStatusFilter("semua")}
                            className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                        >
                            {t("teacher_detail.orders_tab.show_all", "Tampilkan semua ({{count}})", { count: orders.length })}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* ── Desktop: Table ─────────────────────────────── */}
                    <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">{t("teacher_detail.orders_tab.columns.id", "ID Pesanan")}</th>
                                        <th className="px-4 py-3 whitespace-nowrap">{t("teacher_detail.orders_tab.columns.member", "Murid")}</th>
                                        <th className="px-4 py-3 whitespace-nowrap">{t("teacher_detail.orders_tab.columns.package", "Paket")}</th>
                                        <th className="px-4 py-3 whitespace-nowrap">{t("teacher_detail.orders_tab.columns.mode", "Mode")}</th>
                                        <th className="px-4 py-3 whitespace-nowrap">{t("teacher_detail.orders_tab.columns.amount", "Nominal")}</th>
                                        <th className="px-4 py-3 whitespace-nowrap">{t("teacher_detail.orders_tab.columns.status", "Status")}</th>
                                        <th className="px-4 py-3 whitespace-nowrap">{t("teacher_detail.orders_tab.columns.date", "Tanggal")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filtered.map((order) => {
                                        const st = STATUS_CONFIG[order.status] || STATUS_CONFIG["baru"]
                                        return (
                                            <tr
                                                key={order.id}
                                                onClick={() => router.push(`/${activeLocale}/billing/orders/${order.id}`)}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                            >
                                                <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                    {order.bookingCode}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                                                            {order.memberAvatar}
                                                        </div>
                                                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[120px]">{order.member}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                    <span className="block truncate max-w-[150px]">{order.paket}</span>
                                                    <span className="text-[10px] text-gray-400">{order.sesi} sesi</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${order.mode === "online"
                                                        ? "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800"
                                                        : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                                                        }`}>
                                                        {order.mode === "online" ? t("teacher_detail.mode.online", "Online") : t("teacher_detail.mode.offline", "Offline")}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                    {formatCurrency(order.harga)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${st.badgeCls}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />
                                                        {t(st.key, st.fallback)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                                    {order.tglPesan}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                            {t("teacher_detail.orders_tab.footer", "Menampilkan {{shown}} dari {{total}} pesanan", { shown: filtered.length, total: orders.length })}
                        </div>
                    </div>

                    {/* ── Mobile: Card list ───────────────────────────── */}
                    <div className="md:hidden flex flex-col divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800 mt-4">
                        {filtered.map((order) => {
                            const st = STATUS_CONFIG[order.status] || STATUS_CONFIG["baru"]
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => router.push(`/${activeLocale}/billing/orders/${order.id}`)}
                                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-0.5 items-start">
                                                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                    {order.bookingCode}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badgeCls}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls} inline-block`} />
                                                {t(st.key, st.fallback)}
                                            </span>
                                            <button
                                                onClick={e => { e.stopPropagation(); }}
                                                className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            >
                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const langStr = activeLocale;
                                                router.push(`/${langStr}/users/manage/${order.userId}?tab=wallet`);
                                            }}
                                            className="cursor-pointer group/membermobile inline-block"
                                            title="Lihat profil"
                                        >
                                            <p className="text-[10px] text-gray-500 mb-0.5">Murid</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover/membermobile:text-emerald-600 dark:group-hover/membermobile:text-emerald-400">{order.member}</p>
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">@{order.username.replace(/^@/, '')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 mb-0.5">Tanggal</p>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white">{order.tglPesan}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <div>
                                            <p className="text-[10px] text-gray-500 mb-0.5">{order.paket} &bull; {order.sesiSelesai}/{order.sesi} Sesi</p>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">{formatCurrency(order.harga)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${order.mode === "offline" ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800" : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${order.mode === "offline" ? "bg-purple-500" : "bg-blue-500"}`} />
                                                {order.mode === "offline" ? "Tatap Muka" : "Online"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
