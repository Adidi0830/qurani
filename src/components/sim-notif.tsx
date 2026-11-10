"use client"

import { useEffect, useState } from "react"
import { Bell, X, CheckCircle2, ShoppingBag } from "lucide-react"
import { getSimNotifs, type SimNotif } from "@/lib/sim-store"

// ── Toast tunggal ─────────────────────────────────────────────────────────────
interface ToastItem {
    id: string
    notif: SimNotif
}

export function SimToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    useEffect(() => {
        function onUpdate() {
            const notifs = getSimNotifs()
            const latest = notifs.find(n => !n.isRead)
            if (latest) {
                setToasts(prev => {
                    if (prev.find(t => t.id === latest.id)) return prev
                    return [{ id: latest.id, notif: latest }, ...prev]
                })
                // Auto-hilang 5 detik
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== latest.id))
                }, 5000)
            }
        }
        // Cek saat mount (untuk menangkap event yang sudah terjadi sebelum komponen mount)
        onUpdate()
        window.addEventListener("sim-notif-update", onUpdate)
        return () => window.removeEventListener("sim-notif-update", onUpdate)
    }, [])

    if (toasts.length === 0) return null

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
            {toasts.map(t => {
                const isPaid = t.notif.type === "payment_success"
                const isCancelled = t.notif.type === "order_cancelled"
                return (
                    <div
                        key={t.id}
                        className="pointer-events-auto flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 min-w-[300px] max-w-[360px] animate-in slide-in-from-right-4"
                    >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isPaid ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : isCancelled ? "bg-rose-100 dark:bg-rose-900/30"
                            : "bg-amber-100 dark:bg-amber-900/30"
                        }`}>
                            {isPaid
                                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                : isCancelled
                                ? <X className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                                : <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{t.notif.message}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{t.notif.subMessage}</p>
                        </div>
                        <button
                            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

// ── Bell badge (bisa ditaruh di layout/sidebar) ────────────────────────────────
export function SimNotifBell() {
    const [count, setCount] = useState(0)
    const [open, setOpen] = useState(false)
    const [notifs, setNotifs] = useState<SimNotif[]>([])

    function refresh() {
        const all = getSimNotifs()
        setNotifs(all)
        setCount(all.filter(n => !n.isRead).length)
    }

    useEffect(() => {
        refresh()
        window.addEventListener("sim-notif-update", refresh)
        return () => window.removeEventListener("sim-notif-update", refresh)
    }, [])

    return (
        <div className="relative">
            <button
                onClick={() => { setOpen(o => !o); refresh() }}
                className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-emerald-600 hover:border-emerald-400 transition-colors"
            >
                <Bell className="w-4 h-4" />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-10 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Notifikasi Simulasi</p>
                        <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    {notifs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">Belum ada notifikasi</p>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-64 overflow-y-auto">
                            {notifs.map((n, i) => {
                                const isPaid = n.type === "payment_success"
                                const isCancelled = n.type === "order_cancelled"
                                const isPending = n.type === "new_order"
                                return (
                                    <div
                                        key={`${n.id}-${i}`}
                                        onClick={() => {
                                            if (isPending && n.orderId) {
                                                setOpen(false)
                                                window.dispatchEvent(new CustomEvent("sim-open-payment", { detail: n.orderId }))
                                            }
                                        }}
                                        className={`flex items-start gap-3 px-4 py-3 transition-colors
                                            ${!n.isRead ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""}
                                            ${isPending && n.orderId ? "cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10" : ""}`}
                                    >
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                            isPaid ? "bg-emerald-100"
                                            : isCancelled ? "bg-rose-100"
                                            : "bg-amber-100"
                                        }`}>
                                            {isPaid
                                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                : isCancelled
                                                ? <X className="w-3.5 h-3.5 text-rose-500" />
                                                : <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                                            }
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-xs font-bold ${!n.isRead ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>{n.message}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">{n.subMessage}</p>
                                            {isPending && n.orderId && (
                                                <p className="text-[10px] text-amber-600 font-semibold mt-1">↗ Klik untuk bayar</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
