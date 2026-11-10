"use client"

import { useCallback, useState } from "react"

import type { DateRange, TicketPriority, TicketStatus } from "../model/types"

export type DatePreset = number | "year"

const EMPTY_RANGE: DateRange = { start: null, end: null }

function toISODate(date: Date): string {
    return date.toISOString().split("T")[0]
}

/**
 * State filter halaman daftar tiket.
 *
 * Memisahkan filter yang sudah "diterapkan" dari state sementara di panel
 * filter — jadi tombol batal tidak mengubah hasil query yang sedang berjalan.
 */
export function useTicketFilters() {
    const [searchInput, setSearchInput] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilters, setStatusFilters] = useState<TicketStatus[]>([])
    const [priorityFilters, setPriorityFilters] = useState<TicketPriority[]>([])
    const [departmentFilters, setDepartmentFilters] = useState<string[]>([])
    const [dateRange, setDateRange] = useState<DateRange>(EMPTY_RANGE)

    const [tempStatusFilters, setTempStatusFilters] = useState<TicketStatus[]>([])
    const [tempPriorityFilters, setTempPriorityFilters] = useState<TicketPriority[]>([])
    const [tempDepartmentFilters, setTempDepartmentFilters] = useState<string[]>([])

    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    const goToFirstPage = useCallback(() => setCurrentPage(1), [])

    const submitSearch = useCallback(() => {
        setSearchQuery(searchInput)
        goToFirstPage()
    }, [searchInput, goToFirstPage])

    /** Tab status: klik sekali memilih satu status, klik lagi menghapus filter. */
    const toggleStatusTab = useCallback(
        (status: TicketStatus) => {
            setStatusFilters((prev) => (prev.includes(status) ? [] : [status]))
            goToFirstPage()
        },
        [goToFirstPage],
    )

    const showAllStatuses = useCallback(() => {
        setStatusFilters([])
        goToFirstPage()
    }, [goToFirstPage])

    const applyDatePreset = useCallback(
        (preset: DatePreset) => {
            const end = new Date()
            const start = new Date()
            if (preset === "year") {
                start.setFullYear(end.getFullYear() - 1)
            } else {
                start.setMonth(end.getMonth() - preset)
            }
            setDateRange({ start: toISODate(start), end: toISODate(end) })
            goToFirstPage()
        },
        [goToFirstPage],
    )

    const clearDateRange = useCallback(() => {
        setDateRange(EMPTY_RANGE)
        goToFirstPage()
    }, [goToFirstPage])

    /** Buka panel filter dengan menyalin filter aktif ke state sementara. */
    const openFilterPanel = useCallback(() => {
        setTempStatusFilters([...statusFilters])
        setTempPriorityFilters([...priorityFilters])
        setTempDepartmentFilters([...departmentFilters])
        setShowFilterPanel(true)
    }, [statusFilters, priorityFilters, departmentFilters])

    const closeFilterPanel = useCallback(() => setShowFilterPanel(false), [])

    const clearTempFilters = useCallback(() => {
        setTempStatusFilters([])
        setTempPriorityFilters([])
        setTempDepartmentFilters([])
    }, [])

    const applyFilters = useCallback(() => {
        setStatusFilters([...tempStatusFilters])
        setPriorityFilters([...tempPriorityFilters])
        setDepartmentFilters([...tempDepartmentFilters])
        goToFirstPage()
        setShowFilterPanel(false)
    }, [tempStatusFilters, tempPriorityFilters, tempDepartmentFilters, goToFirstPage])

    /** Dipakai tombol "clear all filters" di empty state. */
    const resetAll = useCallback(() => {
        setSearchQuery("")
        setSearchInput("")
        setStatusFilters([])
        setPriorityFilters([])
        setDepartmentFilters([])
        setDateRange(EMPTY_RANGE)
        setCurrentPage(1)
    }, [])

    const hasActiveFilters =
        statusFilters.length > 0 || priorityFilters.length > 0 || departmentFilters.length > 0

    return {
        // filter aktif
        searchInput,
        setSearchInput,
        searchQuery,
        statusFilters,
        priorityFilters,
        departmentFilters,
        dateRange,
        setDateRange,
        currentPage,
        setCurrentPage,

        // panel filter
        showFilterPanel,
        tempStatusFilters,
        setTempStatusFilters,
        tempPriorityFilters,
        setTempPriorityFilters,
        tempDepartmentFilters,
        setTempDepartmentFilters,

        // actions
        submitSearch,
        toggleStatusTab,
        showAllStatuses,
        applyDatePreset,
        clearDateRange,
        openFilterPanel,
        closeFilterPanel,
        clearTempFilters,
        applyFilters,
        resetAll,
        hasActiveFilters,
    }
}