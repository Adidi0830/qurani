"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { getClientToken, ticketsApi } from "../data/api"
import { extractListPayload, extractTotalCount, toTicketListItemWithDepartment } from "../data/mappers"
import {
    DEPARTMENT_ID_TO_NAME,
    DEFAULT_DEPARTMENT_NAME,
    PRIORITY_TO_ID,
    STATUS_TO_ID,
    STATUS_TO_STATS_KEY,
    TICKETS_PAGE_SIZE,
} from "../model/constants"
import type { TicketListItem, TicketPriority, TicketStats, TicketStatsKey, TicketStatus } from "../model/types"

const EMPTY_STATS: TicketStats = { total: 0, open: 0, in_progress: 0, answered: 0, on_hold: 0, closed: 0 }

export interface UseTicketListParams {
    currentPage: number
    statusFilters: TicketStatus[]
    priorityFilters: TicketPriority[]
    departmentFilters: string[]
    searchQuery: string
    dateRange: { start: string | null; end: string | null }
}

/**
 * Memuat daftar tiket + jumlah per status.
 *
 * Catatan perilaku yang sengaja dipertahankan dari implementasi lama:
 * - Token dibaca dari localStorage (client), bukan cookie server action.
 * - Filter multi-select tidak didukung API, jadi saat dipakai bersamaan dengan
 *   filter lain, halaman menarik 500 baris lalu memfilter & mem-paginate di client.
 * - Bila endpoint admin kosong, dicoba fallback ke /tickets/my.
 */
export function useTicketList(params: UseTicketListParams) {
    const { currentPage, statusFilters, priorityFilters, departmentFilters, searchQuery } = params

    const [tickets, setTickets] = useState<TicketListItem[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [statusCounts, setStatusCounts] = useState<TicketStats>(EMPTY_STATS)

    const abortRef = useRef<AbortController | null>(null)

    const loadTickets = useCallback(
        async (signal?: AbortSignal) => {
            const accessToken = getClientToken()
            if (!accessToken) {
                setTickets([])
                setTotalCount(0)
                setIsLoading(false)
                return
            }

            const needsClientFilter =
                statusFilters.length > 1 || priorityFilters.length > 1 || departmentFilters.length > 0

            const singleStatus = statusFilters.length === 1 ? STATUS_TO_ID[statusFilters[0]] : undefined
            const singlePriority = priorityFilters.length === 1 ? PRIORITY_TO_ID[priorityFilters[0]] : undefined

            const limit = needsClientFilter ? 500 : TICKETS_PAGE_SIZE
            const page = needsClientFilter ? 1 : currentPage

            setIsLoading(true)

            try {
                let result: any
                try {
                    result = await ticketsApi.getTickets(
                        {
                            page,
                            pageSize: limit,
                            status: needsClientFilter ? undefined : singleStatus,
                            priority: needsClientFilter ? undefined : singlePriority,
                            keyword: searchQuery || undefined,
                        },
                        accessToken,
                        { signal },
                    )
                } catch (clientError) {
                    console.error("[useTicketList] Client API failed:", clientError)
                    if (!signal?.aborted) {
                        setTickets([])
                        setTotalCount(0)
                    }
                    return
                }

                let rows = extractListPayload(result)
                let total = extractTotalCount(result, rows.length)

                // Endpoint admin kosong → coba tiket milik sendiri.
                if (rows.length === 0 && !signal?.aborted) {
                    try {
                        result = await ticketsApi.getMyTickets(
                            { page, pageSize: limit, status: singleStatus, priority: singlePriority },
                            accessToken,
                            { signal },
                        )
                        rows = extractListPayload(result)
                        total = extractTotalCount(result, rows.length)
                    } catch {
                        // Diabaikan — akan tampil empty state.
                    }
                }

                if (signal?.aborted) return

                if (needsClientFilter) {
                    if (statusFilters.length > 0) {
                        rows = rows.filter((t: any) =>
                            statusFilters.includes(t.statusName || statusFilters[0]),
                        )
                    }
                    if (priorityFilters.length > 0) {
                        rows = rows.filter((t: any) =>
                            priorityFilters.includes(t.priorityName || priorityFilters[0]),
                        )
                    }
                    if (departmentFilters.length > 0) {
                        rows = rows.filter((t: any) => {
                            const deptName =
                                DEPARTMENT_ID_TO_NAME[String(t.department)] || DEFAULT_DEPARTMENT_NAME
                            return (
                                departmentFilters.includes(deptName) ||
                                departmentFilters.includes(
                                    deptName.charAt(0).toUpperCase() + deptName.slice(1).toLowerCase(),
                                )
                            )
                        })
                    }

                    total = rows.length

                    const offset = (currentPage - 1) * TICKETS_PAGE_SIZE
                    rows = rows.slice(offset, offset + TICKETS_PAGE_SIZE)
                }

                setTickets(rows.map(toTicketListItemWithDepartment))
                setTotalCount(total)
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") return
                console.error("[useTicketList] Error loading tickets:", error)
                setTickets([])
                setTotalCount(0)
            } finally {
                if (!signal?.aborted) setIsLoading(false)
            }
        },
        [currentPage, statusFilters, priorityFilters, departmentFilters, searchQuery],
    )

    /** Jumlah tiket per status — diambil dengan 6 request pageSize=1 secara paralel. */
    const loadStats = useCallback(async () => {
        const accessToken = getClientToken()
        if (!accessToken) return

        try {
            const keys = Object.keys(STATUS_TO_STATS_KEY) as TicketStatus[]

            const perStatus = await Promise.all(
                keys.map(async (status) => {
                    try {
                        const result = await ticketsApi.getTickets(
                            { page: 1, pageSize: 1, status: STATUS_TO_ID[status] },
                            accessToken,
                        )
                        return { key: STATUS_TO_STATS_KEY[status], total: extractTotalCount(result, 0) }
                    } catch {
                        return { key: STATUS_TO_STATS_KEY[status], total: 0 }
                    }
                }),
            )

            const allTotal = await ticketsApi
                .getTickets({ page: 1, pageSize: 1 }, accessToken)
                .then((result) => extractTotalCount(result, 0))
                .catch(() => 0)

            const next = { ...EMPTY_STATS }
            perStatus.forEach(({ key, total }) => {
                next[key as TicketStatsKey] = total
            })
            next.total = allTotal

            setStatusCounts(next)
        } catch (error) {
            console.error("[useTicketList] loadStats error:", error)
        }
    }, [])

    // Auto-load saat mount dan setiap filter/pagination berubah.
    useEffect(() => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        loadTickets(controller.signal)

        return () => controller.abort()
    }, [loadTickets, params.dateRange])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    const totalPages = Math.ceil(totalCount / TICKETS_PAGE_SIZE)

    return {
        tickets,
        totalCount,
        totalPages,
        isLoading,
        statusCounts,
        reload: loadTickets,
        reloadStats: loadStats,
    }
}