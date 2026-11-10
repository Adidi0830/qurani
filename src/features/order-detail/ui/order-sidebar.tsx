"use client"

/**
 * Order Detail — Sidebar Components
 * StudentCard, TeacherCard, PaymentSummaryCard, OrderInfoCard
 */

import React from "react"
import Link from "next/link"
import {
    User, GraduationCap, Mail, Star, ExternalLink,
    CreditCard, Globe2, CalendarDays, Layers, CheckSquare,
} from "lucide-react"
import type { OrderBooking, OrderDetail, OrderMember, OrderTrainer, SimPaymentInfo, Translate } from "../model/types"
import { getPaymentStatusConfig } from "../model/constants"
import { formatCurrency, formatDateTime, formatDate, getAvatarUrl, deriveUsername } from "../model/format"

// ─────────────────────────────────────────────
// Student Card
// ─────────────────────────────────────────────

interface StudentCardProps { member: OrderMember; lang: string; t: Translate }

export function StudentCard({ member, lang, t }: StudentCardProps) {
    const avatarUrl = getAvatarUrl(member.image, member.name, "10b981")
    const username  = deriveUsername(member.email, member.name)

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                {t("billing.orders.detail.student.title", "Murid")}
            </h3>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-100 dark:border-emerald-900/40 flex-shrink-0 shadow-sm">
                    <img src={avatarUrl} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{member.name || "—"}</h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 truncate">{username}</p>
                </div>
                <Link
                    href={`/${lang}/users/${member.id}`}
                    aria-label={`Lihat profil ${member.name}`}
                    className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center
                               text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400
                               hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
            </div>

            {member.email && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm text-emerald-500 flex-shrink-0">
                        <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{member.email}</span>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// Teacher Card
// ─────────────────────────────────────────────

interface TeacherCardProps { trainer: OrderTrainer; lang: string; t: Translate }

export function TeacherCard({ trainer, lang, t }: TeacherCardProps) {
    const avatarUrl = getAvatarUrl(trainer.avatar, trainer.name, "0ea5e9")
    const username  = trainer.username?.startsWith("@")
        ? trainer.username
        : `@${trainer.username || deriveUsername(trainer.email, trainer.name).replace("@", "")}`

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                {t("billing.orders.detail.teacher.title", "Pengajar")}
            </h3>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-sky-100 dark:border-sky-900/40 flex-shrink-0 shadow-sm">
                    <img src={avatarUrl} alt={trainer.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{trainer.name || "—"}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        {(trainer.rating ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-700/30">
                                <Star className="w-2.5 h-2.5 fill-amber-400" aria-hidden="true" />
                                {trainer.rating}
                            </span>
                        )}
                        {(trainer.totalStudents ?? 0) > 0 && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                {t("billing.orders.detail.teacher.students", `${trainer.totalStudents} Murid`, { count: trainer.totalStudents ?? 0 })}
                            </span>
                        )}
                    </div>
                </div>
                <Link
                    href={`/${lang}/teachers/${trainer.id}`}
                    aria-label={`Lihat profil ${trainer.name}`}
                    className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center
                               text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400
                               hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
            </div>

            {trainer.specialization && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {trainer.specialization}
                </div>
            )}

            {trainer.subjects && trainer.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {trainer.subjects.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 shadow-sm">
                            {s}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// Payment Summary Card
// ─────────────────────────────────────────────

interface PaymentSummaryCardProps {
    payment: OrderDetail["payment"]
    packageName: string
    simPaymentStatus?: SimPaymentInfo | null
    lang: string
    locale: string
    t: Translate
    isRtl: boolean
}

export function PaymentSummaryCard({ payment, packageName, simPaymentStatus, lang, locale, t, isRtl }: PaymentSummaryCardProps) {
    const statusCfg = getPaymentStatusConfig(String(payment.status), t)
    const isFree    = (n: number) => n === 0

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                {t("billing.orders.detail.payment.title", "Ringkasan Pembayaran")}
            </h3>

            {/* Method + Package */}
            <div className="space-y-2 mb-4 pb-4 border-b border-dashed border-gray-100 dark:border-gray-800">
                {[
                    { label: t("billing.orders.detail.payment.method", "Metode Bayar"), val: payment.method || "—" },
                    { label: t("billing.orders.detail.payment.package", "Paket"),        val: packageName },
                ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
                        <span className="font-semibold text-gray-900 dark:text-white text-end truncate max-w-[60%]">{val}</span>
                    </div>
                ))}
            </div>

            {/* Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5 space-y-2.5 mb-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t("billing.orders.detail.payment.price_package", "Harga Paket")}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payment.pricePackage, locale)}</span>
                </div>
                {payment.tax > 0 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{t("billing.orders.detail.payment.tax", "Pajak")}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payment.tax, locale)}</span>
                    </div>
                )}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t("billing.orders.detail.payment.service_fee", "Biaya Layanan")}</span>
                    <span className={`font-semibold ${isFree(payment.serviceFee) ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                        {isFree(payment.serviceFee) ? t("billing.orders.detail.payment.free", "Gratis") : formatCurrency(payment.serviceFee, locale)}
                    </span>
                </div>
                <div className="pt-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{t("billing.orders.detail.payment.total", "Total")}</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.total, locale)}</span>
                </div>
            </div>

            {/* Admin section: status + gateway + ref + paid at */}
            <div className="space-y-2.5 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{t("billing.orders.detail.payment.payment_status", "Status Pembayaran")}</span>
                    <span role="status" className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeClass}`}>{statusCfg.label}</span>
                </div>
                {payment.method && payment.method !== "—" && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{t("billing.orders.detail.payment.gateway", "Gateway")}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{payment.method}</span>
                    </div>
                )}
                {payment.receiptRef && !["—", "-", ""].includes(payment.receiptRef) && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{t("billing.orders.detail.payment.transaction_ref", "Ref. Transaksi")}</span>
                        <code className="font-mono text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[55%]">{payment.receiptRef}</code>
                    </div>
                )}
                {payment.paidAt && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{t("billing.orders.detail.payment.paid_at", "Tanggal Bayar")}</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-end">{formatDateTime(payment.paidAt, locale)}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Order Info Card
// ─────────────────────────────────────────────

interface OrderInfoCardProps { booking: OrderBooking; sessCompleted: number; locale: string; t: Translate }

export function OrderInfoCard({ booking, sessCompleted, locale, t }: OrderInfoCardProps) {
    const modeLabel = booking.mode === "offline"
        ? t("billing.orders.detail.mode.offline", "Offline")
        : t("billing.orders.detail.mode.online", "Online")

    const rows = [
        { Icon: CalendarDays, label: t("billing.orders.detail.order_info.order_date", "Tanggal Pesan"),          val: formatDate(booking.bookingDate, locale) },
        { Icon: Layers,       label: t("billing.orders.detail.order_info.total_sessions", "Total Sesi"),          val: `${booking.totalSessions} Sesi` },
        { Icon: CheckSquare,  label: t("billing.orders.detail.order_info.completed_sessions", "Sesi Selesai"),    val: `${sessCompleted} / ${booking.totalSessions}` },
        { Icon: Globe2,       label: t("billing.orders.detail.order_info.mode", "Metode"),                        val: modeLabel },
    ]

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" aria-hidden="true" />
                {t("billing.orders.detail.order_info.title", "Info Pesanan")}
            </h3>
            <div className="space-y-3">
                {rows.map(({ Icon, label, val }) => (
                    <div key={label} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 flex-shrink-0">
                            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{label}</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white text-end">{val}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
