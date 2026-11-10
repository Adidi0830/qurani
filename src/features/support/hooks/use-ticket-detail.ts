"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { getClientToken, ticketsApi } from "../data/api"
import { extractListPayload } from "../data/mappers"
import { fetchTicketRepliesPage } from "../data/fetch"
import { REPLIES_PAGE_SIZE } from "../model/constants"
import type { AssigneeUser, RelatedMatchSource, RelatedTicketItem, TicketListItem, TicketReply, TicketState } from "../model/types"
import { ticketKeys } from "./use-ticket-collections"

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

/** Hitung tiket terkait: department sama (+5) atau contact sama (+4). */
export function useRelatedTickets(currentTicket: TicketState | null, enabled: boolean) {
    const [related, setRelated] = useState<RelatedTicketItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const loadedFor = useRef<string | null>(null)

    const load = useCallback(async () => {
        if (!currentTicket) return

        const accessToken = getClientToken()
        if (!accessToken) return

        setIsLoading(true)
        try {
            const params = new URLSearchParams({ PageSize: "50", Page: "1" })
            const response = await fetch(`${API_BASE_URL}/api/v1/tickets?${params}`, {
                headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
            })
            if (!response.ok) return

            const raw = extractListPayload(await response.json())
            if (!Array.isArray(raw)) return

            const normalize = (v: unknown) => String(v || "").trim().toLowerCase()

            const scored = raw
                .filter((t: any) => String(t.id) !== String(currentTicket.id))
                .map((t: any) => {
                    let score = 0
                    const relatedBy: RelatedMatchSource[] = []

                    if (t.department && normalize(t.department) === normalize(currentTicket.department)) {
                        score += 5
                        relatedBy.push("Department")
                    }
                    if ((t.name || t.email) && normalize(t.name || t.email) === normalize(currentTicket.contact)) {
                        score += 4
                        relatedBy.push("Contact")
                    }
                    return { t, score, relatedBy }
                })
                .filter((x) => x.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 8)

            setRelated(
                scored.map(
                    (x) =>
                        ({
                            id: x.t.id,
                            ticket_number: x.t.ticketKey || `#${x.t.id}`,
                            subject: x.t.subject || "No Subject",
                            contact: x.t.name || x.t.email || "Unknown",
                            department: String(x.t.department || ""),
                            project: null,
                            service: x.t.service || null,
                            priority: x.t.priorityName || "Medium",
                            status: x.t.statusName || "Open",
                            last_reply: x.t.lastReply || null,
                            submitted_date: x.t.date || new Date().toISOString(),
                            body: null,
                            relatedBy: x.relatedBy,
                        }) as RelatedTicketItem,
                ),
            )
        } catch (error) {
            console.warn("[related] Failed to load:", error)
        } finally {
            setIsLoading(false)
        }
    }, [currentTicket])

    useEffect(() => {
        if (!enabled || !currentTicket) return
        if (loadedFor.current === String(currentTicket.id)) return

        loadedFor.current = String(currentTicket.id)
        load()
    }, [enabled, currentTicket, load])

    return { related, isLoading }
}

/** Daftar admin untuk dropdown assignee. */
export function useAdminUsers() {
    const [users, setUsers] = useState<AssigneeUser[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const accessToken = getClientToken()
        if (!accessToken) {
            setIsLoading(false)
            return
        }

        const load = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/Users?role=admin&pageSize=100`, {
                    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
                })
                if (!response.ok) return

                const list: any[] = extractListPayload(await response.json())
                if (!Array.isArray(list)) return

                setUsers(
                    list.map((u: any) => ({
                        id: String(u.id || u.userId),
                        name: u.name || u.username || u.email || "Admin",
                        email: u.email || "",
                        role: u.role || "admin",
                    })),
                )
            } catch (error) {
                console.warn("[assignee] Failed to load admins:", error)
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [])

    return { users, isLoading }
}

/** Assignee terpilih, dipersist ke localStorage (belum ada endpoint baca). */
export function useTicketAssignee(ticketId: number) {
    const [selected, setSelected] = useState<{ id: string; name: string; email: string } | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        try {
            const saved = localStorage.getItem(ticketKeys.assignee(String(ticketId)))
            if (saved) setSelected(JSON.parse(saved))
        } catch {
            /* ignore */
        }
    }, [ticketId])

    const assign = useCallback(
        async (user: AssigneeUser, ticket: TicketListItem): Promise<boolean> => {
            setIsSaving(true)
            try {
                const result = await ticketsApi.assignTicket(ticket.id, user.id)

                if (result.success === false) {
                    alert(result.message || "Failed to assign ticket")
                    return false
                }

                setSelected({ id: user.id, name: user.name, email: user.email })
                localStorage.setItem(
                    ticketKeys.assignee(String(ticketId)),
                    JSON.stringify({ id: user.id, name: user.name, email: user.email }),
                )
                updateTicketCache(ticket.id, { assignee: user.name })
                return true
            } catch (e: any) {
                console.error("[assignee] Failed to assign:", e)
                alert(e.message || "Failed to assign ticket")
                return false
            } finally {
                setIsSaving(false)
            }
        },
        [ticketId],
    )

    return { selected, isSaving, assign }
}

/**
 * Patch cache tiket. `assignee` hanya ada di cache lokal (API tidak
 * mengembalikannya), dan versi lama memang menuliskannya di sini.
 */
export type TicketCachePatch = Partial<TicketListItem> & { assignee?: string }

/** Gabungkan patch ke cache tiket agar halaman detail berikutnya cepat tampil. */
export function updateTicketCache(ticketId: number, updates: TicketCachePatch) {
    try {
        const key = ticketKeys.cache(String(ticketId))
        const cached = localStorage.getItem(key)
        const base = cached ? JSON.parse(cached) : null
        localStorage.setItem(key, JSON.stringify(base ? { ...base, ...updates } : updates))
    } catch (e) {
        console.warn("Failed to update ticket cache", e)
    }
}

/**
 * State detail tiket: gabungkan SSR + cache, status/priority, dan paginasi balasan.
 */
export function useTicketDetailState({
    ticketId,
    initialTicket,
    initialReplies,
}: {
    ticketId: string
    initialTicket: TicketListItem | null
    initialReplies: TicketReply[]
}) {
    const [ticket, setTicket] = useState<TicketState | null>(() => {
        if (!initialTicket) return null
        if (typeof window === "undefined") return { ...initialTicket, replies: initialReplies }

        // Balasan optimistic belum terkirim server ikut di-cache agar tidak hilang saat reload.
        try {
            const cached = localStorage.getItem(ticketKeys.replies(ticketId))
            if (!cached) return { ...initialTicket, replies: initialReplies }

            const parsed: TicketReply[] = JSON.parse(cached)
            const merged = [...initialReplies]
            parsed.forEach((cachedReply) => {
                if (!merged.some((r) => r.id === cachedReply.id)) merged.push(cachedReply)
            })
            merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

            return { ...initialTicket, replies: merged }
        } catch (error) {
            console.error("Failed to parse cached replies:", error)
            return { ...initialTicket, replies: initialReplies }
        }
    })

    const [status, setStatus] = useState(initialTicket?.status || "Open")
    const [priority, setPriority] = useState(initialTicket?.priority || "Medium")

    const [isSending, setIsSending] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [hasMoreReplies, setHasMoreReplies] = useState(initialReplies.length >= REPLIES_PAGE_SIZE)
    const [offset, setOffset] = useState(REPLIES_PAGE_SIZE)

    // Persist balasan setiap berubah supaya tidak hilang saat reload.
    useEffect(() => {
        if (ticket?.replies && ticket.replies.length > 0) {
            try {
                localStorage.setItem(ticketKeys.replies(ticketId), JSON.stringify(ticket.replies))
            } catch {
                /* ignore */
            }
        }
    }, [ticket?.replies, ticketId])

    const loadMoreReplies = useCallback(async () => {
        setIsLoadingMore(true)
        try {
            const result = await fetchTicketRepliesPage(parseInt(ticketId), REPLIES_PAGE_SIZE, offset)

            if (!result.success || !result.data) {
                setHasMoreReplies(false)
                return
            }

            if (result.data.length < REPLIES_PAGE_SIZE) setHasMoreReplies(false)

            setTicket((prev) => {
                if (!prev) return null
                const combined = [...prev.replies, ...result.data!]
                const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values())
                unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                return { ...prev, replies: unique }
            })

            setOffset((prev) => prev + REPLIES_PAGE_SIZE)
        } catch (err) {
            console.error("Error loading more replies", err)
        } finally {
            setIsLoadingMore(false)
        }
    }, [ticketId, offset])

    const addReply = useCallback((reply: TicketReply) => {
        setTicket((prev) => (prev ? { ...prev, replies: [reply, ...prev.replies] } : prev))
    }, [])

    const removeFirstReply = useCallback(() => {
        setTicket((prev) => (prev ? { ...prev, replies: prev.replies.slice(1) } : prev))
    }, [])

    const changePriority = useCallback(async (newPriority: string) => {
        if (!ticket) return
        try {
            const { updateTicketPriority } = await import("../data/update")
            const result = await updateTicketPriority(ticket.id, newPriority)
            if (result.success) {
                setPriority(newPriority)
                updateTicketCache(ticket.id, { priority: newPriority })
                return true
            }
        } catch (error) {
            console.error("Error updating priority:", error)
        }
        return false
    }, [ticket])

    return {
        ticket,
        setTicket,
        status,
        setStatus,
        priority,
        changePriority,
        isSending,
        setIsSending,
        isLoadingMore,
        hasMoreReplies,
        loadMoreReplies,
        addReply,
        removeFirstReply,
    }
}