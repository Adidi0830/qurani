"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreHorizontal } from "lucide-react"

import { formatDate } from "../model/format"
import type { DateVariant } from "../model/format"
import type { TicketListItem, Translate } from "../model/types"
import { getPriorityConfig, getStatusConfig } from "./ticket-badges"

export interface TicketListSharedProps {
    tickets: TicketListItem[]
    isLoading: boolean
    timezone: string
    locale: string
    selectedSet: Set<number>
    allVisibleSelected: boolean
    onToggleAll: () => void
    onToggleOne: (id: number) => void
    onOpen: (ticket: TicketListItem) => void
    t: Translate

    // paginasi — dipakai table & footer
    currentPage: number
    totalPages: number
    totalCount: number
    onChangePage: (page: number) => void
}

function useFmt(timezone: string, locale: string) {
    return (date: string | null, variant: DateVariant = "long") =>
        formatDate(date, variant, timezone, locale)
}

/** Tampilan kartu untuk layar < sm. */
export function TicketCards(props: TicketListSharedProps) {
    const { tickets, isLoading, onOpen, t } = props
    const fmt = useFmt(props.timezone, props.locale)

    if (isLoading) {
        return (
            <div className="space-y-3 sm:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden border-l-4 border-l-transparent shadow-sm">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-800" />
                                    <Skeleton className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800" />
                                    <span className="text-gray-300">-</span>
                                    <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
                                    <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-800" />
                                </div>
                                <Skeleton className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-800" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-3 sm:hidden">
            {tickets.map((ticket) => {
                const statusConfig = getStatusConfig(ticket.status, t)
                const priorityConfig = getPriorityConfig(ticket.priority, t)

                return (
                    <Card
                        key={ticket.id}
                        className="overflow-hidden border-l-4 border-l-transparent hover:border-l-emerald-500 transition-all shadow-sm active:scale-[0.99]"
                    >
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                        {ticket.ticket_number}
                                    </span>
                                    <Badge
                                        variant={statusConfig.badgeVariant}
                                        className={`text-[10px] h-5 px-1.5 border-0 ${statusConfig.className}`}
                                    >
                                        {statusConfig.icon}
                                        {statusConfig.label}
                                    </Badge>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 -mr-2">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onOpen(ticket)}>
                                            {t("view_details")}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div onClick={() => onOpen(ticket)} className="cursor-pointer group">
                                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1 text-sm group-hover:text-emerald-600 transition-colors">
                                    {ticket.subject}
                                </h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                                        {ticket.department}
                                    </span>
                                    <span className="text-gray-300">-</span>
                                    {ticket.contact?.startsWith("@") ? (
                                        <span
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-block"
                                        >
                                            <Link
                                                href={`/profile/${ticket.contact.replace(/^@/, "")}`}
                                                className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                                            >
                                                {ticket.contact}
                                            </Link>
                                        </span>
                                    ) : (
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                            {ticket.contact}
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="secondary"
                                        className={`text-[10px] h-5 px-1.5 border-0 font-normal ${priorityConfig.className}`}
                                    >
                                        {priorityConfig.label}
                                    </Badge>
                                    <span className="text-[10px] text-gray-400">
                                        {fmt(ticket.last_reply, "relative")}
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2"
                                    onClick={() => onOpen(ticket)}
                                >
                                    {t("view")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}