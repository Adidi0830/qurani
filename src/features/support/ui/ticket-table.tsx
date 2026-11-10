"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Eye, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

import { formatDate } from "../model/format"
import type { DateVariant } from "../model/format"
import { getPriorityConfig, getStatusConfig } from "./ticket-badges"
import type { TicketListSharedProps } from "./ticket-cards"

type Translate = TicketListSharedProps["t"]

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="bg-white dark:bg-gray-900">
                    <td className="px-4 py-3 text-center">
                        <input
                            type="checkbox"
                            disabled
                            checked={false}
                            className="rounded border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50"
                        />
                    </td>
                    <td className="px-4 py-3 max-w-[300px]">
                        <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
                            <Skeleton className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800 opacity-70" />
                        </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                        <Skeleton className="h-5 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                        <Skeleton className="h-5 w-16 rounded bg-gray-200 dark:bg-gray-800" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                        <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
                            <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                        </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                        <Skeleton className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
                    </td>
                    <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                            <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                            <Skeleton className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-800 opacity-70" />
                        </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                        <Skeleton className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 ml-auto opacity-50" />
                    </td>
                </tr>
            ))}
        </>
    )
}

/** Footer paginasi. */
export function TicketPagination({
    currentPage,
    totalPages,
    shownCount,
    totalCount,
    onChangePage,
    t,
}: {
    currentPage: number
    totalPages: number
    shownCount: number
    totalCount: number
    onChangePage: (page: number) => void
    t: Translate
}) {
    if (totalPages <= 1) return null

    const pageSize = 10

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
            <p className="text-xs text-gray-500">
                {t("pagination.showing", "Showing {{start}}-{{end}} of {{total}}", {
                    start: shownCount > 0 ? (currentPage - 1) * pageSize + 1 : 0,
                    end: (currentPage - 1) * pageSize + Math.min(shownCount, pageSize),
                    total: totalCount,
                })}
            </p>
            <div className="flex gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onChangePage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="flex items-center px-2 text-sm text-gray-500 font-medium">
                    {t("pagination.page_of", "Page {{page}} of {{total}}", {
                        page: currentPage,
                        total: totalPages,
                    })}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onChangePage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

/** Tabel tiket untuk layar >= sm, termasuk footer paginasi. */
export function TicketTable(props: TicketListSharedProps) {
    const {
        tickets,
        isLoading,
        timezone,
        locale,
        selectedSet,
        allVisibleSelected,
        onToggleAll,
        onToggleOne,
        onOpen,
        t,
        currentPage,
        totalPages,
        totalCount,
        onChangePage,
    } = props

    const fmt = (date: string | null, variant: DateVariant = "long") => formatDate(date, variant, timezone, locale)

    return (
        <div className="hidden sm:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 font-medium border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-4 py-3 w-[40px] text-center">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-emerald-500 text-emerald-600"
                                    checked={allVisibleSelected}
                                    onChange={onToggleAll}
                                    disabled={isLoading}
                                />
                            </th>
                            <th className="px-4 py-3 w-[180px]">{t("subject")}</th>
                            <th className="px-4 py-3 w-[140px] hidden md:table-cell">{t("status")}</th>
                            <th className="px-4 py-3 hidden md:table-cell">{t("priority")}</th>
                            <th className="px-4 py-3 hidden lg:table-cell">{t("department")}</th>
                            <th className="px-4 py-3 hidden lg:table-cell">{t("contact")}</th>
                            <th className="px-4 py-3 hidden xl:table-cell">{t("created")}</th>
                            <th className="px-4 py-3 text-right">{t("last_reply")}</th>
                            <th className="px-4 py-3 w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {isLoading ? (
                            <SkeletonRows />
                        ) : (
                            tickets.map((ticket, index) => {
                                const statusConfig = getStatusConfig(ticket.status, t)
                                const priorityConfig = getPriorityConfig(ticket.priority, t)
                                const isSelected = selectedSet.has(ticket.id)

                                return (
                                    <tr
                                        key={ticket.id}
                                        className={cn(
                                            "group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer",
                                            isSelected && "bg-emerald-50/60 dark:bg-emerald-900/10",
                                            index % 2 === 0
                                                ? "bg-white dark:bg-gray-900"
                                                : "bg-gray-50/30 dark:bg-gray-900/50",
                                        )}
                                        onClick={() => onOpen(ticket)}
                                    >
                                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-emerald-500 text-emerald-600"
                                                checked={isSelected}
                                                onChange={() => onToggleOne(ticket.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 max-w-[300px]">
                                            <div className="flex flex-col">
                                                <span
                                                    className="font-medium text-gray-900 dark:text-white truncate"
                                                    title={ticket.subject}
                                                >
                                                    {ticket.subject}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        {String(ticket.ticket_number || ticket.id).replace(/^#+/, "")}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <Badge
                                                className={cn(
                                                    "font-medium whitespace-nowrap",
                                                    statusConfig.className,
                                                )}
                                                variant="outline"
                                            >
                                                {statusConfig.icon} {statusConfig.label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "font-normal border-0 text-xs",
                                                    priorityConfig.className,
                                                )}
                                            >
                                                {priorityConfig.label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell text-gray-600 dark:text-gray-300 text-sm">
                                            {ticket.department}
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                    {ticket.contact?.charAt(0)}
                                                </div>
                                                {ticket.contact?.startsWith("@") ? (
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <Link
                                                            href={`/profile/${ticket.contact.replace(/^@/, "")}`}
                                                            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-sm transition-colors cursor-pointer inline-block truncate max-w-[120px]"
                                                        >
                                                            {ticket.contact}
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px] text-sm">
                                                        {ticket.contact}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className="px-4 py-3 hidden xl:table-cell text-xs text-gray-500 whitespace-nowrap cursor-help"
                                            title={`${fmt(ticket.submitted_date)} (${timezone})`}
                                        >
                                            {fmt(ticket.submitted_date, "relative")}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <span
                                                className="text-sm text-gray-700 dark:text-gray-300 font-medium cursor-help"
                                                title={
                                                    ticket.last_reply
                                                        ? `${fmt(ticket.last_reply)} (${timezone})`
                                                        : undefined
                                                }
                                            >
                                                {fmt(ticket.last_reply, "relative")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => onOpen(ticket)}>
                                                        <Eye className="w-3.5 h-3.5 mr-2" />{" "}
                                                        {t("view_details", "View Details")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <TicketPagination
                currentPage={currentPage}
                totalPages={totalPages}
                shownCount={tickets.length}
                totalCount={totalCount}
                onChangePage={onChangePage}
                t={t}
            />
        </div>
    )
}