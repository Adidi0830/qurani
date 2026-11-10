/**
 * Order Detail — Data Fetching
 *
 * Wrapper tipis atas lib/billing-bookings.ts.
 * Layer ini memisahkan logika fetch dari hook agar mudah di-test dan di-swap.
 * Mengikuti pola features/support/data/fetch.ts
 */

"use client"

import {
    fetchBookingById,
    fetchBookingAuditTrail,
    fetchBookingByCode,
} from "@/lib/billing-bookings"
import { getSimOrderById } from "@/lib/sim-store"
import { getSimPaymentByBookingId } from "@/lib/sim-billing-store"
import { SIM_ORDER_ID_THRESHOLD } from "../model/constants"
import { DUMMY_ORDERS, DUMMY_AUDIT, FALLBACK_AUDIT } from "./dummy"
import type { OrderBooking, OrderDetail, AuditTrailEntry, SimPaymentInfo } from "../model/types"

export interface FetchOrderResult {
    booking: OrderBooking | null
    detail: OrderDetail | null
    auditTrail: AuditTrailEntry[]
    isApiData: boolean
    error: string | null
}

export interface SimResult {
    booking: OrderBooking | null
    detail: OrderDetail | null
}

// ============================================
// SimOrder → unified format
// ============================================

export function convertSimOrder(simOrder: ReturnType<typeof getSimOrderById>): SimResult {
    if (!simOrder) return { booking: null, detail: null }

    const booking: OrderBooking = {
        id: simOrder.id,
        bookingCode: `SIM-${simOrder.id}`,
        userName: simOrder.member.name,
        trainerName: simOrder.trainer.name,
        packageName: simOrder.pkg.name,
        totalSessions: simOrder.totalSessions,
        completedSessions: simOrder.completedSessions,
        totalPayment: simOrder.pkg.price,
        bookingDate: simOrder.bookingDate,
        paymentGateway: simOrder.paymentGateway,
        paymentMethod: simOrder.paymentMethod,
        status:
            simOrder.status === "cancelled" ? "cancelled" :
            simOrder.paymentStatus === "paid" && simOrder.completedSessions > 0 ? "active" :
            simOrder.paymentStatus === "paid" ? "completed" :
            "pending",
        mode: simOrder.mode,
    }

    const detail: any = {
        ...simOrder,
        payment: {
            invoiceNo: simOrder.invoiceNo,
            receiptRef: "—",
            method: simOrder.paymentGateway || "—",
            status: simOrder.paymentStatus,
            paidAt: simOrder.paidAt,
            pricePackage: simOrder.pkg.price,
            serviceFee: simOrder.pkg.serviceFee,
            tax: 0,
            total: simOrder.pkg.price + simOrder.pkg.serviceFee,
        },
    }

    return { booking, detail }
}

// ============================================
// Fetch from API (id < SIM_THRESHOLD)
// ============================================

export async function fetchOrderDetail(id: number): Promise<FetchOrderResult> {
    try {
        const [apiData, trail] = await Promise.all([
            fetchBookingById(id).then(async (data) => {
                if (!data) {
                    const code = `BK-QUR-${id}`
                    return fetchBookingByCode(code)
                }
                return data
            }),
            fetchBookingAuditTrail(id).catch(() => [] as AuditTrailEntry[]),
        ])

        const auditTrail: AuditTrailEntry[] =
            trail.length > 0 ? trail : (DUMMY_AUDIT[id] ?? FALLBACK_AUDIT)

        return {
            booking: (apiData?.booking ?? null) as OrderBooking | null,
            detail: (apiData?.detail ?? null) as unknown as OrderDetail | null,
            auditTrail,
            isApiData: !!apiData,
            error: null,
        }
    } catch (err) {
        console.error("[fetchOrderDetail]", err)
        return {
            booking: null,
            detail: null,
            auditTrail: DUMMY_AUDIT[id] ?? FALLBACK_AUDIT,
            isApiData: false,
            error: "Gagal memuat dari API.",
        }
    }
}

// ============================================
// Get SimPayment status
// ============================================

export function getSimPayment(id: number): SimPaymentInfo | null {
    return getSimPaymentByBookingId(id) as SimPaymentInfo | null
}

// ============================================
// Get SimOrder
// ============================================

export function getSimOrder(id: number) {
    if (id < SIM_ORDER_ID_THRESHOLD) return null
    return getSimOrderById(id) ?? null
}

// ============================================
// Fallback dummy lookup
// ============================================

export function getDummyOrder(id: number | string): { booking: OrderBooking; detail: OrderDetail } | null {
    const num = Number(id)
    return DUMMY_ORDERS[num] ?? null
}
