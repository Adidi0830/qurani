"use client"

/**
 * Order Detail — Main Page Orchestrator
 *
 * Komponen ini adalah satu-satunya tempat yang tahu tentang semua sub-komponen
 * dan hook. src/app/[lang]/(admin)/billing/orders/[id]/page.tsx hanya render ini.
 *
 * Mengikuti pola SupportTicketsPage yang di-import langsung oleh page.tsx.
 */

import React, { useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Activity, FileText, ArrowLeft, Search } from "lucide-react"

import { useI18n } from "@/components/providers/i18n-provider"
import { useOrderDetail } from "../hooks/use-order-detail"

// UI imports
import { OrderHeader }        from "./order-header"
import { OrderProgressCard, SessionGrid, OrderNotesCard } from "./order-content"
import { StudentCard, TeacherCard, PaymentSummaryCard, OrderInfoCard } from "./order-sidebar"
import { OrderTimeline }      from "./order-timeline"
import { OrderDetailSkeleton } from "./order-skeleton"

// ─────────────────────────────────────────────────────────────────────────────

interface OrderDetailPageProps {
    id: number
}

export default function OrderDetailPage({ id }: OrderDetailPageProps) {
    const { t, locale } = useI18n()
    const routeParams   = useParams()
    const searchParams  = useSearchParams()

    const lang  = (routeParams?.lang as string) || "id"
    const isRtl = locale === "ar"

    // Back URL based on referrer param
    const fromPage = searchParams?.get("from") || ""
    const backUrl =
        fromPage === "payment" ? `/${lang}/billing/payments` :
        fromPage === "payout"  ? `/${lang}/billing/payout`   :
        fromPage === "refund"  ? `/${lang}/billing/refund`   :
        `/${lang}/billing/orders`

    const [activeTab, setActiveTab] = useState<"info" | "log">("info")

    // ── Data ──────────────────────────────────────────────────────────────
    const {
        booking, detail, auditTrail,
        isLoading, isError,
        simPaymentStatus,
        finalSessions,
        sessCompleted, sessOngoing, sessScheduled, sessCancelled,
        progressPct, finalBookingStatus,
        isPaid, isSim,
        handleMarkSessionCompleted,
    } = useOrderDetail(id)

    // ── Loading ───────────────────────────────────────────────────────────
    if (isLoading) return <OrderDetailSkeleton />

    // ── Not found / Error ─────────────────────────────────────────────────
    if (!booking || !detail) {
        return (
            <div
                dir={isRtl ? "rtl" : "ltr"}
                className="min-h-[80vh] bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 m-4 sm:m-6 flex flex-col items-center justify-center gap-5 p-8"
            >
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center">
                    <Search className="w-9 h-9 text-gray-400" aria-hidden="true" />
                </div>
                <div className="text-center max-w-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t("billing.orders.detail.not_found.title", "Pesanan Tidak Ditemukan")}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isError ?? t("billing.orders.detail.not_found.desc", `ID pesanan #${id} tidak ditemukan.`, { id })}
                    </p>
                </div>
                <Link
                    href={backUrl}
                    className="mt-2 text-sm px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                    <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} aria-hidden="true" />
                    {t("billing.orders.detail.not_found.back", "Kembali ke Daftar Pesanan")}
                </Link>
            </div>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-gray-50/50 dark:bg-gray-950">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <OrderHeader
                booking={booking}
                detail={detail}
                backUrl={backUrl}
                t={t}
                locale={locale}
                isRtl={isRtl}
            />

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

                {/* Tabs */}
                <div
                    role="tablist"
                    aria-label="Order detail sections"
                    className="flex items-center gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto scrollbar-none"
                >
                    {(
                        [
                            { id: "info", Icon: FileText,  label: t("billing.orders.detail.tab_info", "Informasi Pesanan"), count: null },
                            { id: "log",  Icon: Activity,   label: t("billing.orders.detail.tab_log",  "Log & Aktivitas"),   count: auditTrail.length },
                        ] as const
                    ).map(({ id: tabId, Icon, label, count }) => (
                        <button
                            key={tabId}
                            role="tab"
                            id={`tab-${tabId}`}
                            aria-selected={activeTab === tabId}
                            aria-controls={`panel-${tabId}`}
                            onClick={() => setActiveTab(tabId)}
                            className={`flex-shrink-0 pb-3 pt-1 px-1 text-sm font-bold border-b-2 transition-all flex items-center gap-2
                                ${activeTab === tabId
                                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                    : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                                }`}
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                            {label}
                            {count !== null && count > 0 && (
                                <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-[10px] font-bold">
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── INFO TAB ───────────────────────────────────────────── */}
                {activeTab === "info" && (
                    <div
                        id="panel-info"
                        role="tabpanel"
                        aria-labelledby="tab-info"
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10"
                    >
                        {/* Main — col-span-2 */}
                        <div className="lg:col-span-2 space-y-6">
                            <OrderProgressCard
                                booking={booking}
                                sessCompleted={sessCompleted}
                                sessOngoing={sessOngoing}
                                sessScheduled={sessScheduled}
                                sessCancelled={sessCancelled}
                                progressPct={progressPct}
                                t={t}
                                isRtl={isRtl}
                            />
                            <SessionGrid
                                sessions={finalSessions}
                                bookingStatus={finalBookingStatus}
                                isPaid={isPaid}
                                isSim={isSim}
                                t={t}
                                onMarkDone={isSim ? handleMarkSessionCompleted : undefined}
                            />
                            <OrderNotesCard
                                notes={(detail as any).notes ?? null}
                                graduationNote={detail.graduationNote ?? null}
                                cancellationInfo={detail.cancellationInfo ?? null}
                                bookingStatus={finalBookingStatus}
                                t={t}
                            />
                        </div>

                        {/* Sidebar — col-span-1 */}
                        <div className="space-y-5 lg:sticky lg:top-[73px] lg:self-start">
                            <StudentCard member={detail.member} lang={lang} t={t} />
                            <TeacherCard trainer={detail.trainer} lang={lang} t={t} />
                            <PaymentSummaryCard
                                payment={detail.payment}
                                packageName={booking.packageName}
                                simPaymentStatus={simPaymentStatus}
                                lang={lang}
                                locale={locale}
                                t={t}
                                isRtl={isRtl}
                            />
                            <OrderInfoCard
                                booking={booking}
                                sessCompleted={sessCompleted}
                                locale={locale}
                                t={t}
                            />
                        </div>
                    </div>
                )}

                {/* ── LOG TAB ────────────────────────────────────────────── */}
                {activeTab === "log" && (
                    <div
                        id="panel-log"
                        role="tabpanel"
                        aria-labelledby="tab-log"
                        className="pb-10"
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
                            <h3 className="text-base font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2.5">
                                <Activity className="w-5 h-5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                                {t("billing.orders.detail.log.title", "Riwayat & Aktivitas")}
                            </h3>
                            <div className="max-w-2xl">
                                <OrderTimeline
                                    auditTrail={auditTrail}
                                    locale={locale}
                                    t={t}
                                    isRtl={isRtl}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
