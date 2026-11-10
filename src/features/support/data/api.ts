/**
 * Support — Ticket REST client
 *
 * Dipindahkan dari `src/lib/api.ts` (blok `ticketsApi`, L579-662) supaya data
 * modul Support tidak lagi bergantung pada god-file 2.5k baris.
 * Hanya metode yang benar-benar dipakai modul Support yang dipertahankan:
 * `createTicket` & `closeTicket` di sana tidak pernah dipanggil.
 *
 * Token dibaca dari localStorage — modul ini hanya boleh dipanggil dari client.
 */

import { apiRequest, getStoredAuth, API_BASE } from "@/lib/api"

type TicketOptions = { signal?: AbortSignal }

export interface TicketListParams {
    page?: number
    pageSize?: number
    status?: number
    priority?: number
    keyword?: string
}

export interface MyTicketListParams {
    page?: number
    pageSize?: number
    status?: number
    priority?: number
}

function buildListParams(params: object, keys: string[]): string {
    const source = params as Record<string, number | string | undefined>
    const searchParams = new URLSearchParams()
    for (const key of keys) {
        const value = source[key]
        if (value !== undefined) searchParams.append(key, String(value))
    }
    const query = searchParams.toString()
    return query ? `?${query}` : ""
}

/** Ambil access token dari localStorage, atau string kosong. */
export function getClientToken(): string {
    return getStoredAuth()?.accessToken || ""
}

export const ticketsApi = {
    /** Endpoint admin — semua tiket. */
    getTickets: (params: TicketListParams = {}, token?: string, options: TicketOptions = {}) =>
        apiRequest<any>(
            `/api/v1/tickets${buildListParams(params, ["page", "pageSize", "status", "priority", "keyword"])}`,
            { token, signal: options.signal },
        ),

    /** Endpoint user — tiket milik sendiri. Dipakai sebagai fallback. */
    getMyTickets: (params: MyTicketListParams = {}, token?: string, options: TicketOptions = {}) =>
        apiRequest<any>(
            `/api/v1/tickets/my${buildListParams(params, ["page", "pageSize", "status", "priority"])}`,
            { token, signal: options.signal },
        ),

    getTicketById: (id: number | string, token?: string, options: TicketOptions = {}) =>
        apiRequest<any>(`/api/v1/tickets/${id}`, { token, signal: options.signal }),

    getMyTicketById: (id: number | string, token?: string, options: TicketOptions = {}) =>
        apiRequest<any>(`/api/v1/tickets/my/${id}`, { token, signal: options.signal }),

    replyTicket: (id: number | string, data: { name?: string; message: string }, token?: string) =>
        apiRequest<any>(`/api/v1/tickets/${id}/reply`, {
            method: "POST",
            body: { message: data.message }, // API hanya menerima field 'message'
            token,
        }),

    assignTicket: (id: number | string, userId: string | number, token?: string) =>
        apiRequest<any>(`/api/v1/tickets/${id}/assign`, {
            method: "PUT",
            body: { assigneeId: userId },
            token,
        }),

    uploadAttachment: async (id: number | string, file: File, token?: string) => {
        const authToken = token || getStoredAuth()?.accessToken
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${API_BASE}/api/v1/tickets/${id}/attachments`, {
            method: "POST",
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            body: formData,
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(err || "Upload failed")
        }
        return response.json()
    },
}