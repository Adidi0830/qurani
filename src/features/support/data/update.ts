"use server"

/**
 * Support — Ticket Update (server action)
 *
 * Berpindah dari `src/utils/api/tickets/update.ts`.
 * Catatan: field project/service tidak didukung API Qurani dan sudah dihapus.
 */

import { cookies } from "next/headers"

import { PRIORITY_TO_ID, STATUS_TO_ID } from "../model/constants"
import type { TicketPriority, TicketStatus, TicketUpdates } from "../model/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

async function getAuthToken(): Promise<string | null> {
    try {
        const cookieStore = await cookies()
        return cookieStore.get("myqurani_access_token")?.value || null
    } catch {
        return null
    }
}

function getStatusNumber(status: string): number {
    return STATUS_TO_ID[status as TicketStatus] || STATUS_TO_ID.Open
}

function getPriorityNumber(priority: string): number {
    return PRIORITY_TO_ID[priority as TicketPriority] || PRIORITY_TO_ID.Medium
}

export async function updateTicketStatus(
    ticketId: number,
    status: string,
): Promise<{ success: boolean; error?: string }> {
    const token = await getAuthToken()

    if (!token) {
        return { success: false, error: "Not authenticated" }
    }

    try {
        console.log("[updateTicketStatus] Updating ticket", ticketId, "status to", status)

        const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: getStatusNumber(status) }),
        })

        const result = await response.json()

        if (!response.ok) {
            console.error("[updateTicketStatus] API error:", result)
            return { success: false, error: result.message || "Failed to update status" }
        }

        return { success: true }
    } catch (error) {
        console.error("[updateTicketStatus] Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

export async function updateTicketPriority(
    ticketId: number,
    priority: string,
): Promise<{ success: boolean; error?: string }> {
    const token = await getAuthToken()

    if (!token) {
        return { success: false, error: "Not authenticated" }
    }

    try {
        console.log("[updateTicketPriority] Updating ticket", ticketId, "priority to", priority)

        const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}/priority`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ priority: getPriorityNumber(priority) }),
        })

        const result = await response.json()

        if (!response.ok) {
            console.error("[updateTicketPriority] API error:", result)
            return { success: false, error: result.message || "Failed to update priority" }
        }

        return { success: true }
    } catch (error) {
        console.error("[updateTicketPriority] Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

/** API memakai endpoint terpisah, jadi tiap field dikirim sebagai request sendiri. */
export async function updateTicket(
    ticketId: number,
    updates: TicketUpdates,
): Promise<{ success: boolean; error?: string }> {
    let hasError = false
    let errorMessage = ""

    if (updates.status) {
        const result = await updateTicketStatus(ticketId, updates.status)
        if (!result.success) {
            hasError = true
            errorMessage = result.error || "Failed to update status"
        }
    }

    if (updates.priority) {
        const result = await updateTicketPriority(ticketId, updates.priority)
        if (!result.success) {
            hasError = true
            errorMessage = result.error || "Failed to update priority"
        }
    }

    return hasError ? { success: false, error: errorMessage } : { success: true }
}

export async function bulkUpdateTickets(
    ticketIds: number[],
    updates: TicketUpdates,
): Promise<{ success: boolean; error?: string }> {
    const results = await Promise.all(ticketIds.map((id) => updateTicket(id, updates)))

    const failed = results.filter((r) => !r.success)

    if (failed.length > 0) {
        return {
            success: false,
            error: `Failed to update ${failed.length} of ${ticketIds.length} tickets`,
        }
    }

    return { success: true }
}