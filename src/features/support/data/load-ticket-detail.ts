"use client"

/**
 * Support — Ticket Detail Loader
 *
 * Berpindah dari waterfall 4-metode yang tadinya inline di
 * `src/app/[lang]/(admin)/support/tickets/[id]/page.tsx`.
 *
 * API Qurani tidak punya satu endpoint yang konsisten untuk membaca detail tiket,
 * jadi urutan fallback di bawah dipertahankan apa adanya — ini perilaku yang sudah
 * bekerja di produksi dan sengaja tidak diubah.
 *
 * Urutan percobaan:
 *   1. GET /api/v1/tickets/{id}          (endpoint admin)
 *   2. GET /api/v1/tickets/my/{id}       (tiket milik sendiri)
 *   3. GET /api/v1/tickets/my            (cari di daftar tiket sendiri)
 *   3.5 GET /api/v1/tickets?keyword=     (cari di seluruh tiket)
 */

import { ticketsApi } from "./api"
import { DEFAULT_DEPARTMENT_NAME, DEPARTMENT_ID_TO_NAME } from "../model/constants"
import type { TicketListItem, TicketReply } from "../model/types"

const CACHE_PREFIX = "ticket_cache_"

/** Cache lokal ditulis TicketDetailClient setelah setiap mutasi. */
export function readCachedTicket(ticketId: string): TicketListItem | null {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + ticketId)
        if (!raw) return null
        return JSON.parse(raw) as TicketListItem
    } catch (error) {
        console.error("Failed to parse cached data:", error)
        return null
    }
}

export function writeCachedTicket(ticketId: string, ticket: TicketListItem): void {
    try {
        localStorage.setItem(CACHE_PREFIX + ticketId, JSON.stringify(ticket))
    } catch (error) {
        console.error("Failed to write cached ticket:", error)
    }
}

/** Cari id di dalam berbagai bentuk envelope list dari API. */
function extractList(payload: any): any[] {
    return payload?.data?.items || payload?.data || payload?.items || []
}

export interface TicketDetailPayload {
    ticket: TicketListItem | null
    replies: TicketReply[]
}

export async function loadTicketDetail(
    ticketId: string,
    accessToken: string,
    signal: AbortSignal,
    cachedTicket: TicketListItem | null,
): Promise<TicketDetailPayload> {
    const options = { signal }
    let apiData: any = null

    // 1. Endpoint admin.
    try {
        const result = await ticketsApi.getTicketById(ticketId, accessToken, options)
        if (result?.data || (result && !result.error)) {
            apiData = result?.data || result
        }
    } catch {
        // Diabaikan — dicoba lagi dengan endpoint berikutnya.
    }

    // 2. Endpoint tiket milik sendiri.
    if ((!apiData || !apiData.id) && !signal.aborted) {
        try {
            const result = await ticketsApi.getMyTicketById(ticketId, accessToken, options)
            if (result?.data || (result && !result.error)) {
                apiData = result?.data || result
                console.log("[loadTicketDetail] Step 2 (my ticket) succeeded")
            }
        } catch {
            console.log("[loadTicketDetail] Step 2 failed, trying step 3...")
        }
    }

    // 3. Cari di daftar tiket milik sendiri.
    if ((!apiData || !apiData.id) && !signal.aborted) {
        try {
            const myTickets = await ticketsApi.getMyTickets({ pageSize: 100 }, accessToken, options)
            const found = extractList(myTickets).find((t: any) => String(t.id) === String(ticketId))
            if (found) {
                apiData = found
                console.log("[loadTicketDetail] Step 3 (list search) succeeded")
            }
        } catch {
            console.log("[loadTicketDetail] Step 3 failed")
        }
    }

    // 3.5. Cari di seluruh tiket (fallback admin).
    if ((!apiData || !apiData.id) && !signal.aborted) {
        try {
            const allTickets = await ticketsApi.getTickets(
                { keyword: ticketId, pageSize: 10 },
                accessToken,
                options,
            )
            const found = extractList(allTickets).find((t: any) => String(t.id) === String(ticketId))
            if (found) {
                apiData = found
                console.log("[loadTicketDetail] Step 3.5 (admin list search) succeeded")
            }
        } catch {
            console.log("[loadTicketDetail] Step 3.5 failed")
        }
    }

    if (signal.aborted || !apiData?.id) {
        if (!cachedTicket) {
            console.log("[loadTicketDetail] Could not load ticket details")
        }
        return { ticket: cachedTicket, replies: [] }
    }

    return {
        ticket: toTicketListItem(apiData, ticketId, cachedTicket),
        replies: toReplies(apiData, ticketId),
    }
}

/** Bentuk lokal `TicketListItem` dari DTO API, dengan fallback ke cache. */
function toTicketListItem(apiData: any, ticketId: string, cached: TicketListItem | null): TicketListItem {
    return {
        id: apiData.id,
        ticket_number: apiData.ticketKey || `#${apiData.id}`,
        subject: apiData.subject,
        contact: apiData.name || apiData.email || cached?.contact || "Unknown",
        department:
            DEPARTMENT_ID_TO_NAME[String(apiData.department)] || cached?.department || DEFAULT_DEPARTMENT_NAME,
        project: null,
        service: null,
        priority: apiData.priorityName || cached?.priority || "Medium",
        status: apiData.statusName || cached?.status || "Open",
        last_reply: apiData.lastReply,
        submitted_date: apiData.date,
        body: apiData.message || cached?.body || null,
    }
}

function toReplies(apiData: any, ticketId: string): TicketReply[] {
    const replies = apiData.replies || []

    return replies.map((r: any) => ({
        id: r.id,
        ticket_id: Number(ticketId),
        author: r.name || r.email || (r.isStaffReply ? "Staff" : "User"),
        message: r.message || "",
        date: r.date || r.createdAt,
        attachments: r.attachments ? JSON.stringify(r.attachments.map((a: any) => a.url || a)) : null,
    }))
}