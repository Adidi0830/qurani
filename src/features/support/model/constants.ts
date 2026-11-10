/**
 * Support — Konstanta domain
 *
 * Peta status/priority/department ini sebelumnya diduplikasi di 4 file berbeda
 * (utils/api/tickets/fetch.ts, insert.ts, update.ts, SupportTicketsPage.tsx,
 * tickets/[id]/page.tsx). Semuanya memakai angka yang sama, jadi disatukan di sini.
 */

import type { TicketPriority, TicketStatus, TicketStatsKey } from "./types"

export const TICKET_STATUSES: readonly TicketStatus[] = [
  "Open",
  "In Progress",
  "Answered",
  "On Hold",
  "Closed",
] as const

export const TICKET_PRIORITIES: readonly TicketPriority[] = ["Low", "Medium", "High"] as const

export const TICKET_DEPARTMENTS = ["Marketing", "Billing", "Support"] as const

/** Nama status (UI) → id numerik (API). */
export const STATUS_TO_ID: Record<TicketStatus, number> = {
  "Open": 1,
  "In Progress": 2,
  "Answered": 3,
  "On Hold": 4,
  "Closed": 5,
}

/** Id numerik (API) → nama status (UI). */
export const ID_TO_STATUS: Record<number, TicketStatus> = {
  1: "Open",
  2: "In Progress",
  3: "Answered",
  4: "On Hold",
  5: "Closed",
}

/** Nama prioritas (UI) → id numerik (API). */
export const PRIORITY_TO_ID: Record<TicketPriority, number> = {
  "Low": 1,
  "Medium": 2,
  "High": 3,
}

/** Id numerik (API) → nama prioritas (UI). */
export const ID_TO_PRIORITY: Record<number, TicketPriority> = {
  1: "Low",
  2: "Medium",
  3: "High",
}

/** Nama status (UI) → kunci pada `TicketStats`. */
export const STATUS_TO_STATS_KEY: Record<TicketStatus, TicketStatsKey> = {
  "Open": "open",
  "In Progress": "in_progress",
  "Answered": "answered",
  "On Hold": "on_hold",
  "Closed": "closed",
}

/** Id department (API) → nama department. */
export const DEPARTMENT_ID_TO_NAME: Record<string, string> = {
  "1": "MARKETING",
  "2": "BILLING",
  "3": "SUPPORT",
}

/** Nama department legacy → id. Dipakai `createTicket` bila form mengirim string. */
export const DEPARTMENT_NAME_TO_ID: Record<string, number> = {
  "Marketing": 1,
  "Billing": 2,
  "Support": 3,
}

export const DEFAULT_DEPARTMENT_ID = 1
export const DEFAULT_DEPARTMENT_NAME = "GENERAL"

/** Jumlah baris per halaman untuk halaman daftar tiket. */
export const TICKETS_PAGE_SIZE = 10

/** Jumlah balasan yang dimuat per halaman di detail tiket. */
export const REPLIES_PAGE_SIZE = 20

export const MAX_REPLY_ATTACHMENTS = 2
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
export const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const

export const BACKUP_TICKET_ID_THRESHOLD = 1_000_000