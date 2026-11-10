"use client"

/**
 * Order Detail — useOrderDetail hook
 *
 * Mengelola seluruh state halaman detail pesanan admin:
 * SimOrder | API | dummy fallback, localStorage overrides, dan session sim.
 * Mengikuti pola features/support/hooks/use-ticket-detail.ts
 */

import { useCallback, useEffect, useState } from "react"
import { SIM_ORDER_ID_THRESHOLD } from "../model/constants"
import {
    fetchOrderDetail,
    convertSimOrder,
    getDummyOrder,
    getSimPayment,
    getSimOrder,
} from "../data/fetch"
import type {
    OrderBooking,
    OrderDetail,
    AuditTrailEntry,
    SimPaymentInfo,
    UseOrderDetailReturn,
} from "../model/types"
import { FALLBACK_AUDIT } from "../data/dummy"

// ── LocalStorage keys ─────────────────────────────────────────────────────
const lsKey = (id: number, suffix: string) => `sim_${suffix}_${id}`

function readLS<T>(key: string): T | null {
    if (typeof window === "undefined") return null
    try {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : null
    } catch {
        return null
    }
}

function writeLS(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─────────────────────────────────────────────────────────────────────────

export function useOrderDetail(id: number): UseOrderDetailReturn {
    // ── Raw data from API / sim ────────────────────────────────────────
    const [apiBooking, setApiBooking]   = useState<OrderBooking | null>(null)
    const [apiDetail, setApiDetail]     = useState<OrderDetail | null>(null)
    const [apiAudit, setApiAudit]       = useState<AuditTrailEntry[]>([])
    const [isApiData, setIsApiData]     = useState(false)
    const [isLoading, setIsLoading]     = useState(true)
    const [isError, setIsError]         = useState<string | null>(null)
    const [simPaymentStatus, setSimPaymentStatus] = useState<SimPaymentInfo | null>(null)

    // ── LocalStorage overrides (sim session marking) ───────────────────
    const [localSessions, setLocalSessions]       = useState<OrderDetail["sessions"] | null>(null)
    const [localAudit, setLocalAudit]             = useState<AuditTrailEntry[] | null>(null)
    const [localCompleted, setLocalCompleted]     = useState(false)

    // ── Boot: load sim payment & LS overrides ─────────────────────────
    useEffect(() => {
        const payment = getSimPayment(id)
        if (payment) setSimPaymentStatus(payment)

        const savedSessions = readLS<OrderDetail["sessions"]>(lsKey(id, "sessions"))
        if (savedSessions) setLocalSessions(savedSessions)

        const savedAudit = readLS<AuditTrailEntry[]>(lsKey(id, "audit_trail"))
        if (savedAudit) setLocalAudit(savedAudit)

        const savedCompleted = localStorage.getItem(lsKey(id, "order_completed"))
        if (savedCompleted === "true") setLocalCompleted(true)
    }, [id])

    // ── Fetch data ────────────────────────────────────────────────────
    useEffect(() => {
        setIsLoading(true)
        setIsError(null)

        const isSim = id >= SIM_ORDER_ID_THRESHOLD

        if (isSim) {
            const simOrder = getSimOrder(id)
            if (simOrder) {
                const { booking, detail } = convertSimOrder(simOrder)
                setApiBooking(booking)
                setApiDetail(detail)
                setApiAudit(FALLBACK_AUDIT)
            }
            setIsLoading(false)
            return
        }

        // Real API path
        fetchOrderDetail(id).then(({ booking, detail, auditTrail, isApiData: api, error }) => {
            if (booking) setApiBooking(booking)
            if (detail)  setApiDetail(detail)
            setApiAudit(auditTrail)
            setIsApiData(api)
            if (error) setIsError(error)
        }).finally(() => setIsLoading(false))
    }, [id])

    // ── Resolve: api → dummy fallback ────────────────────────────────
    const dummy = getDummyOrder(id)
    const booking: OrderBooking | null = apiBooking ?? dummy?.booking ?? null
    const detail:  OrderDetail | null  = apiDetail  ?? dummy?.detail  ?? null

    // ── Session overrides ─────────────────────────────────────────────
    const baseSessions = detail?.sessions ?? []
    const finalSessions: OrderDetail["sessions"] = localSessions ?? baseSessions

    // ── Audit trail ───────────────────────────────────────────────────
    const finalAudit: AuditTrailEntry[] = localAudit ?? apiAudit

    // ── Derived status ────────────────────────────────────────────────
    const finalBookingStatus = localCompleted ? "completed" : (booking?.status ?? "pending")
    const sessCompleted = finalSessions.filter(s => s.status === "completed").length
    const sessOngoing   = finalSessions.filter(s => s.status === "ongoing").length
    const sessScheduled = finalSessions.filter(s => s.status === "scheduled").length
    const sessCancelled = finalSessions.filter(s => s.status === "cancelled").length
    const progressPct   = Math.round((sessCompleted / Math.max(1, booking?.totalSessions ?? 1)) * 100)
    const isPaid        = detail?.payment.status === "paid"
    const isSim         = id >= SIM_ORDER_ID_THRESHOLD

    // ── Sim action: mark session as completed ─────────────────────────
    const handleMarkSessionCompleted = useCallback((sessionNo: number) => {
        const newSessions = finalSessions.map(s =>
            s.no === sessionNo ? { ...s, status: "completed" as const } : s
        )
        const newEntry: AuditTrailEntry = {
            statusName: "Sesi Selesai",
            createdAt: new Date().toISOString(),
            notes: `Sesi ${sessionNo} telah diselesaikan.`,
            changedBy: "Admin (Simulasi)",
        }
        let newAudit = [newEntry, ...finalAudit]

        const allDone = newSessions.every(s => s.status === "completed")
        if (allDone && !localCompleted) {
            newAudit = [{
                statusName: "Selesai",
                createdAt: new Date().toISOString(),
                notes: "Semua sesi telah selesai, pesanan ditandai Selesai.",
                changedBy: "System (Simulasi)",
            }, ...newAudit]
            setLocalCompleted(true)
            localStorage.setItem(lsKey(id, "order_completed"), "true")
        }

        setLocalSessions(newSessions)
        setLocalAudit(newAudit)
        writeLS(lsKey(id, "sessions"), newSessions)
        writeLS(lsKey(id, "audit_trail"), newAudit)
    }, [finalSessions, finalAudit, localCompleted, id])

    return {
        booking,
        detail,
        auditTrail: finalAudit,
        isLoading,
        isError,
        isApiData,
        simPaymentStatus,
        finalSessions,
        sessCompleted,
        sessOngoing,
        sessScheduled,
        sessCancelled,
        progressPct,
        finalBookingStatus: String(finalBookingStatus),
        isPaid,
        isSim,
        handleMarkSessionCompleted,
    }
}
