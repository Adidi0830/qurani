"use client"

import { AlertCircle, CheckCircle, Clock, MessageSquare } from "lucide-react"
import type { ReactNode } from "react"

import { DEPARTMENT_ID_TO_NAME, DEFAULT_DEPARTMENT_NAME, TICKET_PRIORITIES, TICKET_STATUSES } from "../model/constants"
import type { TicketPriority, TicketStatus, Translate } from "../model/types"

export { TICKET_PRIORITIES, TICKET_STATUSES }

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

export interface StatusConfig {
    label: string
    badgeVariant: BadgeVariant
    className: string
    /** Warna solid (tanpa opacity) — dipakai panel info detail & tiket terkait. */
    bgClass: string
    icon: ReactNode
}

const STATUS_CLASS: Record<TicketStatus, string> = {
    "Open": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200",
    "In Progress": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
    "Answered": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
    "On Hold": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200",
    "Closed":
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200",
}

/** Warna solid per status — dipakai untuk badge transparan (`bg-opacity-20`). */
const STATUS_BG: Record<TicketStatus, string> = {
    "Open": "bg-red-500",
    "In Progress": "bg-yellow-500",
    "Answered": "bg-blue-500",
    "On Hold": "bg-gray-500",
    "Closed": "bg-emerald-500",
}

export function getStatusConfig(status: string, t: Translate): StatusConfig {
    const map: Record<TicketStatus, { label: string; badgeVariant: BadgeVariant; icon: ReactNode }> = {
        "Open": {
            label: t("status_labels.open", "Open"),
            badgeVariant: "destructive",
            icon: <AlertCircle className="w-3 h-3 mr-1" />,
        },
        "In Progress": {
            label: t("status_labels.in_progress", "In Progress"),
            badgeVariant: "secondary",
            icon: <Clock className="w-3 h-3 mr-1" />,
        },
        "Answered": {
            label: t("status_labels.answered", "Answered"),
            badgeVariant: "secondary",
            icon: <MessageSquare className="w-3 h-3 mr-1" />,
        },
        "On Hold": {
            label: t("status_labels.on_hold", "On Hold"),
            badgeVariant: "outline",
            icon: <Clock className="w-3 h-3 mr-1" />,
        },
        "Closed": {
            label: t("status_labels.closed", "Closed"),
            badgeVariant: "secondary",
            icon: <CheckCircle className="w-3 h-3 mr-1" />,
        },
    }

    const fallback: StatusConfig = {
        label: status,
        badgeVariant: "secondary",
        className: "bg-gray-100 text-gray-800",
        bgClass: "bg-gray-500",
        icon: null,
    }

    const known = map[status as TicketStatus]
    if (!known) return fallback

    return {
        ...known,
        className: STATUS_CLASS[status as TicketStatus] || fallback.className,
        bgClass: STATUS_BG[status as TicketStatus] || fallback.bgClass,
    }
}

export interface PriorityConfig {
    label: string
    className: string
}

export function getPriorityConfig(priority: string, t: Translate): PriorityConfig {
    const map: Record<TicketPriority, PriorityConfig> = {
        "Low": {
            label: t("priority_labels.low", "Low"),
            className: "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800",
        },
        "Medium": {
            label: t("priority_labels.medium", "Medium"),
            className: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
        },
        "High": {
            label: t("priority_labels.high", "High"),
            className: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
        },
    }

    return map[priority as TicketPriority] || { label: priority, className: "text-gray-500 bg-gray-100" }
}

/** Label department yang tampil di UI — sudah termasuk fallback. */
export function getDepartmentLabel(departmentId: string | null | undefined, fallback = DEFAULT_DEPARTMENT_NAME): string {
    return DEPARTMENT_ID_TO_NAME[String(departmentId)] || fallback
}