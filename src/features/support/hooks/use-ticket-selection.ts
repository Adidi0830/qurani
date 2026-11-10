"use client"

import { useCallback, useMemo, useState } from "react"

import type { TicketListItem } from "../model/types"

/**
 * State multi-select baris tabel tiket.
 * `visibleIds` adalah id yang sedang tampil di halaman ini.
 */
export function useTicketSelection(visibleIds: number[]) {
    const [selected, setSelected] = useState<number[]>([])

    const allVisibleSelected = visibleIds.length > 0 && selected.length === visibleIds.length

    const toggleAll = useCallback(() => {
        setSelected((prev) => (prev.length === visibleIds.length ? [] : [...visibleIds]))
    }, [visibleIds])

    const toggleOne = useCallback((id: number) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]))
    }, [])

    const clear = useCallback(() => setSelected([]), [])

    return useMemo(
        () => ({
            selected,
            selectedSet: new Set(selected),
            allVisibleSelected,
            toggleAll,
            toggleOne,
            clear,
            count: selected.length,
        }),
        [selected, allVisibleSelected, toggleAll, toggleOne, clear],
    )
}

export type TicketSelection = ReturnType<typeof useTicketSelection>

/** Cache tiket ke localStorage lalu buka halaman detail-nya. */
export function useTicketNavigation() {
    return useCallback((ticket: TicketListItem) => {
        try {
            localStorage.setItem(`ticket_cache_${ticket.id}`, JSON.stringify(ticket))
        } catch (err) {
            console.error("Failed to save ticket cache:", err)
        }
        return `/support/tickets/${ticket.id}`
    }, [])
}