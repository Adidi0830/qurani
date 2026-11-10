/**
 * Support — Domain Model
 *
 * Single source of truth untuk seluruh tipe data sub-modul Support Tickets.
 * Sebelumnya tipe-tipe ini tersebar di 6+ file (utils/api/tickets/*,
 * components/Support/*, dan TicketDetailClient.tsx) dengan duplikasi
 * Note / Reminder / Task / DetailTab / Attachment.
 */

// ============================================
// Enums & unions
// ============================================

export type TicketStatus = "Open" | "In Progress" | "Answered" | "On Hold" | "Closed"

export type TicketPriority = "Low" | "Medium" | "High"

export type DetailTab = "reply" | "note" | "reminder" | "others" | "task"

export type TaskStatus = "pending" | "in_progress" | "completed"

export type ExportFormat = "excel" | "csv" | "print"

export type RelatedMatchSource = "Department" | "Contact"

// ============================================
// i18n
// ============================================

/**
 * Signature fungsi `t` dari `@/hooks/use-translation`.
 * Dideklarasikan ulang agar komponen feature tidak perlu import hook.
 */
export type Translate = (
    key: string,
    fallback?: string,
    params?: Record<string, string | number>,
) => string

// ============================================
// Core ticket entities
// ============================================

export interface TicketListItem {
  id: number
  ticket_number: string
  subject: string
  contact: string
  department: string
  project: string | null
  service: string | null
  priority: string
  status: string
  last_reply: string | null
  submitted_date: string
  body: string | null
}

export interface TicketReply {
  id: number
  ticket_id: number
  author: string
  message: string
  date: string
  attachments: string | null
}

export interface TicketWithReplies extends TicketListItem {
  replies: TicketReply[]
}

/** Bentuk state yang dipakai UI detail — list item + replies tertanam. */
export type TicketState = TicketListItem & { replies: TicketReply[] }

export interface RelatedTicketItem extends TicketListItem {
  relatedBy: RelatedMatchSource[]
}

export interface CreateTicketData {
  subject: string
  contact: string
  /** Menerima ID department (number) maupun nama (string) — lihat `resolveDepartmentId`. */
  department: string | number
  project?: string
  service?: string
  priority?: string
  body: string
}

export interface CreateTicketReplyData {
  ticket_id: number
  author: string
  message: string
  attachments?: string
  isFromAdmin?: boolean
}

export interface TicketCategory {
  id: number
  name: string
}

export interface Attachment {
  name: string
  url: string
  type: "image" | "file"
}

// ============================================
// Local (localStorage) entities
// ============================================

export interface Note {
  id: string
  content: string
  author: string
  date: string
}

export interface Reminder {
  id: string
  title: string
  date: string
  dueAt?: string
  notifyEmail: boolean
  staff: string
  ticketId?: string
  ticketSubject?: string
  ticketNumber?: string
  createdAt?: string
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  assignee: string
  dueDate: string
}

export interface NewReminderDraft {
  title: string
  date: string
  notifyEmail: boolean
  staff: string
}

export interface NewTaskDraft {
  title: string
  assignee: string
  dueDate: string
}

export interface AssigneeUser {
  id: string
  name: string
  email: string
  role?: string
}

// ============================================
// List-page state
// ============================================

export interface DateRange {
  start: string | null
  end: string | null
}

export interface TicketFilters {
  status: TicketStatus[]
  priority: TicketPriority[]
  department: string[]
  dateRange: DateRange
  search: string
}

export interface TicketStats {
  total: number
  open: number
  in_progress: number
  answered: number
  on_hold: number
  closed: number
}

/** Kunci yang dipakai untuk lookup `TicketStats` dari nama status. */
export type TicketStatsKey = Exclude<keyof TicketStats, "total">

export interface TicketUpdates {
  status?: string
  priority?: string
}

// ============================================
// Response envelopes
// ============================================

export interface TicketsResult {
  success: boolean
  data?: TicketListItem[]
  totalCount?: number
  error?: string
}

export interface TicketStatsResult {
  success: boolean
  data?: TicketStats
  error?: string
}

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface MultiUploadResult {
  success: boolean
  urls?: string[]
  errors?: string[]
}