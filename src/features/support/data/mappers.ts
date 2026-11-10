/**
 * Support — Mappers
 *
 * Konversi DTO API Qurani → model lokal `TicketListItem`.
 * Dipakai oleh server action (`data/fetch.ts`) dan langsung oleh client
 * (halaman daftar & detail), sebelumnya logikanya ditulis ulang di 3 tempat.
 */

import { ID_TO_PRIORITY, ID_TO_STATUS, DEFAULT_DEPARTMENT_NAME, DEPARTMENT_ID_TO_NAME } from "../model/constants"
import type { TicketListItem, TicketPriority, TicketStatus } from "../model/types"

/** Bentuk list dari GET /api/v1/tickets. */
export interface ApiTicketListDto {
    id: number
    ticketKey: string
    subject: string
    email: string | null
    name: string | null
    status: number
    statusName: string
    priority: number
    priorityName: string
    department: number
    assigned: number
    date: string
    lastReply: string | null
    clientRead: number
    adminRead: number
    replyCount: number
}

function statusNameOf(dto: { status: number; statusName?: string | null }): string {
    return dto.statusName || ID_TO_STATUS[dto.status] || "Unknown"
}

function priorityNameOf(dto: { priority: number; priorityName?: string | null }): string {
    return dto.priorityName || ID_TO_PRIORITY[dto.priority] || "Medium"
}

export function toTicketListItem(dto: ApiTicketListDto): TicketListItem {
    return {
        id: dto.id,
        ticket_number: dto.ticketKey,
        subject: dto.subject,
        contact: dto.name || dto.email || "Unknown",
        // Nama department di-resolve di sisi UI lewat DEPARTMENT_ID_TO_NAME.
        department: String(dto.department),
        project: null,
        service: null,
        priority: priorityNameOf(dto),
        status: statusNameOf(dto),
        last_reply: dto.lastReply,
        submitted_date: dto.date,
        body: null,
    }
}

/** Sama seperti `toTicketListItem`, tapi department langsung jadi nama. */
export function toTicketListItemWithDepartment(dto: ApiTicketListDto): TicketListItem {
    return {
        ...toTicketListItem(dto),
        department: DEPARTMENT_ID_TO_NAME[String(dto.department)] || DEFAULT_DEPARTMENT_NAME,
    }
}

/** Ambil total dari berbagai bentuk envelope list API. */
export function extractListPayload(payload: any): any[] {
    if (Array.isArray(payload)) return payload
    const data = payload?.data ?? payload
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(payload?.items)) return payload.items
    return []
}

/** Ambil totalCount dari berbagai bentuk envelope API. */
export function extractTotalCount(payload: any, fallback: number): number {
    const data = payload?.data ?? payload
    return (
        data?.pagination?.totalCount ??
        data?.totalCount ??
        payload?.totalCount ??
        data?.TotalCount ??
        payload?.TotalCount ??
        data?.total ??
        data?.count ??
        fallback
    )
}

export type { TicketListItem, TicketPriority, TicketStatus }