"use server"

/**
 * Support — Ticket Create (server action)
 *
 * Berpindah dari `src/utils/api/tickets/insert.ts`.
 * Peta priority & department berasal dari `../model/constants`.
 */

import { cookies } from "next/headers"

import { DEPARTMENT_NAME_TO_ID, DEFAULT_DEPARTMENT_ID, PRIORITY_TO_ID } from "../model/constants"
import type { CreateTicketData } from "../model/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

async function getAuthToken(): Promise<string | null> {
    try {
        const cookieStore = await cookies()
        return cookieStore.get("myqurani_access_token")?.value || null
    } catch {
        return null
    }
}

function getPriorityNumber(priority?: string): number {
    return PRIORITY_TO_ID[priority as keyof typeof PRIORITY_TO_ID] || PRIORITY_TO_ID.Medium
}

/**
 * Resolve department ke id numerik. Menerima id (number) maupun nama legacy.
 * Daftar department sebenarnya seharusnya dari GET /api/v1/tickets/config/categories
 * dan form mengirim id numeriknya secara langsung.
 */
function resolveDepartmentId(department: string | number): number {
    if (typeof department === "number") return department
    const parsed = parseInt(department, 10)
    if (!isNaN(parsed)) return parsed
    return DEPARTMENT_NAME_TO_ID[department] ?? DEFAULT_DEPARTMENT_ID
}

export async function createTicket(
    ticketData: CreateTicketData,
): Promise<{ success: boolean; data?: { id: number; ticket_number: string }; error?: string }> {
    const token = await getAuthToken()

    if (!token) {
        console.error("[createTicket] No auth token found")
        return { success: false, error: "Not authenticated" }
    }

    try {
        const payload = {
            subject: ticketData.subject,
            department: resolveDepartmentId(ticketData.department),
            priority: getPriorityNumber(ticketData.priority),
            message: ticketData.body,
            name: ticketData.contact,
        }

        console.log("[createTicket] Calling API POST /api/v1/tickets with payload:", payload)

        const response = await fetch(`${API_BASE_URL}/api/v1/tickets`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        })

        const responseText = await response.text().catch(() => "")
        console.log("[createTicket] Response status:", response.status)
        console.log("[createTicket] Response text:", responseText.substring(0, 300))

        if (!response.ok) {
            let errMsg = "Failed to create ticket"
            try {
                const errJson = JSON.parse(responseText)
                errMsg = errJson.message || errJson.error || errMsg
            } catch {
                /* ignore */
            }
            console.error("[createTicket] API error:", response.status, errMsg)
            return { success: false, error: errMsg }
        }

        let result: any = {}
        try {
            result = JSON.parse(responseText)
        } catch {
            /* empty response is OK */
        }

        const data = result.data || result
        const id = data?.id || data?.ticketId || 0
        const ticketNumber = data?.ticketKey || data?.ticket_number || `#${id}`

        console.log("[createTicket] ✅ Ticket created via API, id:", id)

        return { success: true, data: { id, ticket_number: ticketNumber } }
    } catch (error) {
        console.error("[createTicket] Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

export async function createTicketReply(replyData: {
    ticket_id: number
    author: string
    message: string
    attachments?: string
    isFromAdmin?: boolean
}): Promise<{ success: boolean; data?: { id: number }; error?: string }> {
    const token = await getAuthToken()

    if (!token) {
        console.error("[createTicketReply] No auth token found")
        return { success: false, error: "Not authenticated" }
    }

    try {
        const payload = { message: replyData.message }

        console.log("[createTicketReply] Calling API POST /api/v1/tickets/", replyData.ticket_id, "/reply")

        const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${replyData.ticket_id}/reply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        })

        const responseText = await response.text().catch(() => "")
        console.log("[createTicketReply] Response status:", response.status)

        if (!response.ok) {
            let errMsg = "Failed to send reply"
            try {
                const errJson = JSON.parse(responseText)
                errMsg = errJson.message || errJson.error || errMsg
            } catch {
                /* ignore */
            }
            console.error("[createTicketReply] API error:", response.status, errMsg)
            return { success: false, error: errMsg }
        }

        let result: any = {}
        try {
            result = JSON.parse(responseText)
        } catch {
            /* empty response is OK */
        }

        const data = result.data || result
        const id = data?.id || data?.replyId || Date.now()

        console.log("[createTicketReply] ✅ Reply sent via API, id:", id)

        return { success: true, data: { id } }
    } catch (error) {
        console.error("[createTicketReply] Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}