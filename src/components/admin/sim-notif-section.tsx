"use client"

import React, { useState, useEffect, useCallback } from "react"
import { CheckCircle2, ShoppingBag, ExternalLink, XCircle, UserCheck } from "lucide-react"
import { getSimNotifs, markSimNotifsRead, updateSimOrderPayment, cancelSimOrder, addSimNotif, getSimOrderById, type SimNotif } from "@/lib/sim-store"
import { useRouter } from "next/navigation"

// ── Time ago helper ───────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Baru saja"
    if (mins < 60) return `${mins} menit yang lalu`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} jam yang lalu`
    const days = Math.floor(hours / 24)
    return `${days} hari yang lalu`
}

// ── Single Sim Notif Item ─────────────────────────────────────────────────────
function SimNotifItem({ notif, onItemClick, onPayClick, onCancelClick }: {
    notif: SimNotif
    onItemClick: () => void
    onPayClick: (orderId: number) => void
    onCancelClick: (orderId: number) => void
}) {
    const isPaid = notif.type === "payment_success"
    const isPending = notif.type === "new_order"
    const isCancelled = notif.type === "order_cancelled"
    const isStaticCancelled = notif.type === "static_cancelled"
    const isGuruApproved = notif.type === "guru_approved"

    return (
        <div
            onClick={onItemClick}
            className={`group relative overflow-hidden rounded-xl border p-3 sm:p-4 transition-all duration-300 hover:shadow-lg cursor-pointer bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700`}
        >
            {/* Unread indicator */}
            {!notif.isRead && (
                <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full animate-pulse z-10 ${(isCancelled || isStaticCancelled) ? "bg-rose-500" : isGuruApproved ? "bg-sky-500" : "bg-emerald-500"}`} />
            )}

            <div className="flex items-start gap-3 mt-2">
                {/* Icon */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-lg
                    ${isPaid ? "bg-emerald-100 dark:bg-emerald-900/30" : (isCancelled || isStaticCancelled) ? "bg-rose-100 dark:bg-rose-900/30" : isGuruApproved ? "bg-sky-100 dark:bg-sky-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                    {isPaid
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        : (isCancelled || isStaticCancelled)
                            ? <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            : isGuruApproved
                                ? <UserCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                : <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 leading-tight">
                            {notif.message.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F093}\u{1F004}\u{1F14E}\u{1F191}-\u{1F19A}\u{1F201}\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F23A}\u{1F250}\u{1F251}\u{1F300}-\u{1F320}\u{1F32D}-\u{1F335}\u{1F337}-\u{1F37C}\u{1F37E}-\u{1F393}\u{1F3A0}-\u{1F3CA}\u{1F3CF}-\u{1F3D3}\u{1F3E0}-\u{1F3F0}\u{1F3F4}\u{1F3F8}-\u{1F43E}\u{1F440}\u{1F442}-\u{1F4F7}\u{1F4F9}-\u{1F4FC}\u{1F500}-\u{1F53D}\u{1F54B}-\u{1F54E}\u{1F550}-\u{1F567}\u{1F57A}\u{1F595}\u{1F5A4}\u{1F5FB}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6C5}\u{1F6CC}\u{1F6D0}-\u{1F6D2}\u{1F6EB}\u{1F6EC}\u{1F6F4}-\u{1F6F6}\u{1F910}-\u{1F93E}\u{1F940}-\u{1F94C}\u{1F950}-\u{1F96B}\u{1F980}-\u{1F997}\u{1F9C0}\u{1F9D0}-\u{1F9E6}]/gu, '').trim()}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 whitespace-nowrap">
                            {timeAgo(notif.createdAt)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {notif.subMessage}
                    </p>

                    {/* Action buttons for pending orders */}
                    {isPending && notif.orderId && (
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onPayClick(notif.orderId) }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-all duration-150 active:scale-95 shadow-sm"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Lihat &amp; Bayar
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancelClick(notif.orderId) }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-700 text-xs font-semibold rounded-lg transition-all duration-150 active:scale-95"
                            >
                                Batal
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Static dummy notif: Pesanan Batal — Nur Hidayah (booking #3006) ───────────
const NUR_HIDAYAH_NOTIF: SimNotif = {
    id: "99001",
    type: "static_cancelled" as SimNotif["type"],
    message: "Pesanan Dibatalkan — Nur Hidayah",
    subMessage: "Nur Hidayah • 5x Pertemuan • Indi Fitriani • GoPay • Rp 595.000",
    isRead: false,
    orderId: 3006,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
}

// ── Static notif: Guru Indi Fitriani menyetujui pembatalan (booking #3006) ─────
const INDI_APPROVED_NOTIF: SimNotif = {
    id: "99002",
    type: "guru_approved" as SimNotif["type"],
    message: "Guru Menyetujui Pembatalan — Indi Fitriani",
    subMessage: "Indi Fitriani telah menyetujui pembatalan pesanan Nur Hidayah • 5x Pertemuan • GoPay • Rp 595.000",
    isRead: false,
    orderId: 3006,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
}

// ── Main Section Component ────────────────────────────────────────────────────
export function SimNotifSection() {
    const router = useRouter()
    const [notifs, setNotifs] = useState<SimNotif[]>([])

    const refresh = useCallback(() => {
        setNotifs(getSimNotifs())
    }, [])

    useEffect(() => {
        refresh()
        // Mark all as read when section is viewed
        markSimNotifsRead()

        window.addEventListener("sim-notif-update", refresh)
        return () => window.removeEventListener("sim-notif-update", refresh)
    }, [refresh])

    // Terbaru di atas: INDI (1 jam lalu) → NUR_HIDAYAH (2 jam lalu) → sim notifs
    const allNotifs = [INDI_APPROVED_NOTIF, NUR_HIDAYAH_NOTIF, ...notifs]

    if (allNotifs.length === 0) return null



    function handleCancelClick(orderId: number) {
        const existingOrder = getSimOrderById(orderId)
        cancelSimOrder(orderId)
        addSimNotif({
            type: "order_cancelled",
            message: `Pesanan Dibatalkan — Pesanan #${orderId}`,
            subMessage: `Pesanan ${existingOrder?.member?.name ?? ""} • ${existingOrder?.pkg?.name ?? ""} telah dibatalkan`,
            isRead: false,
            orderId,
        })
        window.dispatchEvent(new Event("sim-notif-update"))
        router.push("/billing/orders")
    }

    function handlePayClick(orderId: number) {
        // Ambil gateway dari sim order yang sudah ada
        const existingOrder = getSimOrderById(orderId)
        const gateway = existingOrder?.paymentGateway || "Transfer"
        // Konfirmasi bayar sim order
        updateSimOrderPayment(orderId, gateway)
        addSimNotif({
            type: "payment_success",
            message: `Pembayaran Lunas — Pesanan #${orderId}`,
            subMessage: `Pesanan telah dibayar lunas via ${gateway}`,
            isRead: false,
            orderId,
        })
        // Trigger refresh di halaman pesanan
        window.dispatchEvent(new Event("sim-notif-update"))
        router.push("/billing/orders")
    }

    function handleItemClick(orderId?: number) {
        if (orderId === 3006) {
            router.push("/billing/orders/3006")
        } else {
            router.push("/billing/orders")
        }
    }

    return (
        <div className="space-y-2 mb-4">
            {allNotifs.map((n, i) => (
                <SimNotifItem
                    key={`${n.id}-${i}`}
                    notif={n}
                    onItemClick={() => handleItemClick(n.orderId)}
                    onPayClick={handlePayClick}
                    onCancelClick={handleCancelClick}
                />
            ))}
        </div>
    )
}

