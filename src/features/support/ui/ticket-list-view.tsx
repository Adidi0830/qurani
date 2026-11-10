"use client"

import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Calendar as CalendarIcon,
    CheckCircle,
    ChevronDown,
    FileSpreadsheet,
    FileText,
    Filter,
    Printer,
    RefreshCw,
    Search,
} from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { cn } from "@/lib/utils"

import { STATUS_TO_STATS_KEY, TICKET_STATUSES } from "../model/constants"
import type { TicketListItem } from "../model/types"
import { useTicketBulkUpdate, useTicketExport } from "../hooks/use-ticket-export"
import { useTicketFilters } from "../hooks/use-ticket-filters"
import { useTicketList } from "../hooks/use-ticket-list"
import { useTicketSelection, useTicketNavigation } from "../hooks/use-ticket-selection"
import { useTicketTimezone } from "../hooks/use-ticket-timezone"
import { getStatusConfig } from "./ticket-badges"
import { TicketBulkModal } from "./ticket-bulk-modal"
import { TicketCards } from "./ticket-cards"
import type { TicketListSharedProps } from "./ticket-cards"
import { TicketFilterModal } from "./ticket-filter-modal"
import { TicketTable } from "./ticket-table"

/**
 * Halaman daftar tiket support.
 *
 * Seluruh state & pemanggilan API berada di hooks; file ini hanya merangkai
 * layout, toolbar, dan modal.
 */
export default function TicketListView() {
    const router = useRouter()
    const { profile } = useAuth()
    const { t, locale } = useTranslation(["support"])

    const timezone = useTicketTimezone(profile?.timezone)

    const filters = useTicketFilters()
    const list = useTicketList({
        currentPage: filters.currentPage,
        statusFilters: filters.statusFilters,
        priorityFilters: filters.priorityFilters,
        departmentFilters: filters.departmentFilters,
        searchQuery: filters.searchQuery,
        dateRange: filters.dateRange,
    })

    const selection = useTicketSelection(list.tickets.map((ticket) => ticket.id))
    const cacheTicket = useTicketNavigation()

    const bulk = useTicketBulkUpdate(async () => {
        selection.clear()
        await list.reload()
        await list.reloadStats()
    })

    const exportLabels = useMemo(
        () => ({
            reportTitle: t("export.report_title", "Tickets Report"),
            reportHeading: t("export.report_heading", "Support Tickets Report"),
            headers: [
                t("export.headers.id", "ID"),
                t("export.headers.ticket_number", "Ticket Number"),
                t("export.headers.subject", "Subject"),
                t("export.headers.department", "Department"),
                t("export.headers.contact", "Contact"),
                t("export.headers.status", "Status"),
                t("export.headers.priority", "Priority"),
                t("export.headers.last_reply", "Last Reply"),
                t("export.headers.created", "Created"),
            ],
        }),
        [t],
    )

    const exporter = useTicketExport()

    const openTicket = useCallback(
        (ticket: TicketListItem) => {
            router.push(cacheTicket(ticket))
        },
        [router, cacheTicket],
    )

    const openBulkModal = useCallback(() => {
        if (selection.count === 0) {
            window.alert(t("select_tickets_warning"))
            return
        }
        bulk.setIsOpen(true)
    }, [selection.count, bulk, t])

    const shared: TicketListSharedProps = {
        tickets: list.tickets,
        isLoading: list.isLoading,
        timezone,
        locale,
        selectedSet: selection.selectedSet,
        allVisibleSelected: selection.allVisibleSelected,
        onToggleAll: selection.toggleAll,
        onToggleOne: selection.toggleOne,
        onOpen: openTicket,
        t,
        currentPage: filters.currentPage,
        totalPages: list.totalPages,
        totalCount: list.totalCount,
        onChangePage: filters.setCurrentPage,
    }

    const showEmptyState = !list.isLoading && list.tickets.length === 0

    return (
        <div className="p-2 sm:p-4 md:p-6 space-y-4 w-full mx-auto min-h-screen bg-gray-50/50 dark:bg-black/20">
            {bulk.showSuccess && (
                <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{t("success_bulk")}</span>
                </div>
            )}

            <div className="mb-4">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
            </div>

            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-1">
                <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
                    <button
                        onClick={filters.showAllStatuses}
                        className={cn(
                            "relative px-4 py-2 text-sm font-medium transition-all rounded-t-lg whitespace-nowrap flex items-center gap-2",
                            filters.statusFilters.length === 0
                                ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50",
                        )}
                    >
                        {t("all_tickets")}
                        <Badge
                            variant="secondary"
                            className="ml-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 h-5 px-1.5 min-w-[1.25rem]"
                        >
                            {list.statusCounts.total}
                        </Badge>
                    </button>

                    {TICKET_STATUSES.map((status) => {
                        const count = list.statusCounts[STATUS_TO_STATS_KEY[status]]
                        const isSelected = filters.statusFilters.includes(status)

                        return (
                            <button
                                key={status}
                                onClick={() => filters.toggleStatusTab(status)}
                                className={cn(
                                    "relative px-4 py-2 text-sm font-medium transition-all rounded-t-lg whitespace-nowrap flex items-center gap-2",
                                    isSelected
                                        ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50",
                                )}
                            >
                                {getStatusConfig(status, t).label}
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "ml-1 h-5 px-1.5 min-w-[1.25rem]",
                                        isSelected
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                                    )}
                                >
                                    {count || 0}
                                </Badge>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* --- TOOLBAR --- */}
            <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 whitespace-nowrap text-xs">
                                {t("bulk_actions")} <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={openBulkModal}>{t("edit_selected")}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu
                        open={exporter.showExportDropdown}
                        onOpenChange={exporter.setShowExportDropdown}
                    >
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 whitespace-nowrap text-xs"
                                disabled={exporter.isExporting}
                            >
                                {exporter.isExporting ? (
                                    <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                                ) : (
                                    <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-gray-500" />
                                )}
                                {t("export_label", "Export")}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem
                                onClick={() => exporter.exportTickets("excel", list.tickets, exportLabels)}
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" />{" "}
                                {t("export.excel", "Excel")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => exporter.exportTickets("csv", list.tickets, exportLabels)}
                            >
                                <FileText className="w-3.5 h-3.5 mr-2 text-blue-600" /> {t("export.csv", "CSV")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => exporter.exportTickets("print", list.tickets, exportLabels)}
                            >
                                <Printer className="w-3.5 h-3.5 mr-2 text-gray-600" />{" "}
                                {t("export.print", "Print")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full xl:w-auto ml-auto">
                    <div className="flex items-center w-full sm:w-auto order-3 sm:order-1">
                        <div className="flex w-full sm:w-64 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                            <input
                                type="text"
                                placeholder={t("search_placeholder") || "Cari ticket..."}
                                value={filters.searchInput}
                                onChange={(e) => filters.setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") filters.submitSearch()
                                }}
                                className="w-full pl-3 pr-2 h-9 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
                            />
                            <button
                                onClick={filters.submitSearch}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 w-10 flex items-center justify-center shrink-0"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible order-1 sm:order-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-9 w-full sm:w-auto whitespace-nowrap text-xs",
                                filters.hasActiveFilters
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20"
                                    : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900",
                            )}
                            onClick={filters.openFilterPanel}
                        >
                            <Filter className="w-3.5 h-3.5 mr-2" />
                            {t("filters")}
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-9 w-full sm:w-auto justify-start sm:justify-center whitespace-nowrap text-xs",
                                        (filters.dateRange.start || filters.dateRange.end) &&
                                            "border-emerald-500 text-emerald-700 bg-emerald-50",
                                    )}
                                >
                                    <CalendarIcon className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                    {filters.dateRange.start ? (
                                        <span>
                                            {filters.dateRange.start}
                                            {filters.dateRange.end ? ` - ${filters.dateRange.end}` : ""}
                                        </span>
                                    ) : (
                                        t("date_range")
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="end">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => filters.applyDatePreset(0)}
                                            className="text-xs"
                                        >
                                            {t("this_month")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => filters.applyDatePreset(3)}
                                            className="text-xs"
                                        >
                                            {t("last_3_months")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => filters.applyDatePreset(6)}
                                            className="text-xs"
                                        >
                                            {t("last_6_months")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => filters.applyDatePreset("year")}
                                            className="text-xs"
                                        >
                                            {t("last_year")}
                                        </Button>
                                    </div>

                                    <div className="flex gap-2 items-center">
                                        <div className="space-y-1 flex-1">
                                            <label className="text-[10px] font-medium uppercase text-gray-500">
                                                {t("start")}
                                            </label>
                                            <input
                                                type="date"
                                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                                                value={filters.dateRange.start || ""}
                                                onChange={(e) =>
                                                    filters.setDateRange((prev) => ({
                                                        ...prev,
                                                        start: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <label className="text-[10px] font-medium uppercase text-gray-500">
                                                {t("end")}
                                            </label>
                                            <input
                                                type="date"
                                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                                                value={filters.dateRange.end || ""}
                                                onChange={(e) =>
                                                    filters.setDateRange((prev) => ({
                                                        ...prev,
                                                        end: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs"
                                            onClick={filters.clearDateRange}
                                        >
                                            {t("clear")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-emerald-600 text-white text-xs"
                                            onClick={() => filters.setCurrentPage(1)}
                                        >
                                            {t("apply")}
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-gray-500 hover:text-emerald-600"
                            onClick={() => list.reload()}
                            disabled={list.isLoading}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", list.isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- CONTENT --- */}
            {showEmptyState ? (
                <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {t("no_tickets_found")}
                    </h3>
                    <Button variant="outline" className="mt-6" onClick={filters.resetAll}>
                        {t("clear_all_filters")}
                    </Button>
                </div>
            ) : (
                <>
                    <TicketCards {...shared} />
                    <TicketTable {...shared} />
                </>
            )}

            <TicketFilterModal
                open={filters.showFilterPanel}
                onClose={filters.closeFilterPanel}
                t={t}
                tempStatus={filters.tempStatusFilters}
                setTempStatus={filters.setTempStatusFilters}
                tempPriority={filters.tempPriorityFilters}
                setTempPriority={filters.setTempPriorityFilters}
                tempDepartment={filters.tempDepartmentFilters}
                setTempDepartment={filters.setTempDepartmentFilters}
                onClearTemp={filters.clearTempFilters}
                onApply={filters.applyFilters}
            />

            <TicketBulkModal
                open={bulk.isOpen}
                onClose={bulk.close}
                onConfirm={() => bulk.confirm(selection.selected)}
                status={bulk.status}
                setStatus={bulk.setStatus}
                priority={bulk.priority}
                setPriority={bulk.setPriority}
                t={t}
            />
        </div>
    )
}