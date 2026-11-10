/**
 * Order Detail — Konstanta domain
 *
 * Status order, session, payment, dan mapping ke config UI.
 * Mengikuti pola features/support/model/constants.ts
 */

import type { OrderStatus, OrderStatusConfig, SessionStatusConfig, PaymentStatusConfig, Translate } from "./types"

// ============================================
// Order Status
// ============================================

/** Semua status order yang mungkin muncul dari API */
export const ORDER_STATUSES: readonly string[] = [
    "active", "completed", "cancelled", "menunggu_guru", "pending",
] as const

/** Batas ID untuk SimOrder (id >= ini = simulasi lokal) */
export const SIM_ORDER_ID_THRESHOLD = 9001

// ============================================
// Status config factories (butuh `t` supaya terlokalisasi)
// ============================================

export function getOrderStatusConfig(
    status: string,
    t: Translate,
): OrderStatusConfig {
    const map: Record<string, OrderStatusConfig> = {
        active: {
            label: t("billing.orders.detail.status.order.active", "Aktif"),
            dotClass: "bg-sky-500",
            badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800",
        },
        completed: {
            label: t("billing.orders.detail.status.order.completed", "Selesai"),
            dotClass: "bg-emerald-500",
            badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
        },
        cancelled: {
            label: t("billing.orders.detail.status.order.cancelled", "Dibatalkan"),
            dotClass: "bg-rose-500",
            badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
        },
        menunggu_guru: {
            label: t("billing.orders.detail.status.order.menunggu_guru", "Menunggu Guru"),
            dotClass: "bg-orange-500",
            badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
        },
        pending: {
            label: t("billing.orders.detail.status.order.pending", "Menunggu Bayar"),
            dotClass: "bg-amber-500",
            badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
        },
    }
    return map[status] ?? map.pending
}

export function getSessionStatusConfig(
    status: string,
    t: Translate,
): SessionStatusConfig {
    const map: Record<string, SessionStatusConfig> = {
        completed: {
            label: t("billing.orders.detail.status.session.completed", "Selesai"),
            iconName: "CheckCircle2",
            textClass: "text-emerald-700 dark:text-emerald-400",
            bgClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
            iconBgClass: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        },
        ongoing: {
            label: t("billing.orders.detail.status.session.ongoing", "Berlangsung"),
            iconName: "Activity",
            textClass: "text-blue-700 dark:text-blue-400",
            bgClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
            iconBgClass: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
        },
        scheduled: {
            label: t("billing.orders.detail.status.session.scheduled", "Terjadwal"),
            iconName: "Clock",
            textClass: "text-sky-700 dark:text-sky-400",
            bgClass: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
            iconBgClass: "bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400",
        },
        cancelled: {
            label: t("billing.orders.detail.status.session.cancelled", "Batal"),
            iconName: "XCircle",
            textClass: "text-rose-700 dark:text-rose-400",
            bgClass: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
            iconBgClass: "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
        },
    }
    return map[status] ?? map.scheduled
}

export function getPaymentStatusConfig(
    status: string,
    t: Translate,
): PaymentStatusConfig {
    const map: Record<string, PaymentStatusConfig> = {
        paid: {
            label: t("billing.orders.detail.status.payment.paid", "Lunas"),
            badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
        },
        pending: {
            label: t("billing.orders.detail.status.payment.pending", "Belum Bayar"),
            badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
        },
        failed: {
            label: t("billing.orders.detail.status.payment.failed", "Gagal"),
            badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
        },
        refunded: {
            label: t("billing.orders.detail.status.payment.refunded", "Refund"),
            badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
        },
        paid_out: {
            label: t("billing.orders.detail.status.payment.paid_out", "Dana Diteruskan"),
            badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
        },
    }
    return map[status] ?? map.pending
}

export function getPayoutStatusLabel(status: string, t: Translate): string {
    const map: Record<string, string> = {
        paid_out: t("billing.orders.detail.payout_status.paid_out", "Dana Diteruskan ke Guru"),
        refunded: t("billing.orders.detail.payout_status.refunded", "Dana Dikembalikan (Refund)"),
        paid:     t("billing.orders.detail.payout_status.paid",     "Lunas (Menunggu Payout)"),
        pending:  t("billing.orders.detail.payout_status.pending",  "Pending Payment"),
    }
    return map[status] ?? status
}
