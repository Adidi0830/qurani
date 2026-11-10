/**
 * Order Detail — Domain Model
 *
 * Single source of truth untuk seluruh tipe data fitur Order Detail Admin.
 * Struktur mengikuti pola features/support/model/types.ts
 */

// ============================================
// Translate signature (agar komponen tidak perlu import hook)
// ============================================

export type Translate = (
    key: string,
    fallback?: string,
    params?: Record<string, string | number>,
) => string

// ============================================
// Status Unions
// ============================================

export type OrderStatus =
    | "active"
    | "completed"
    | "cancelled"
    | "menunggu_guru"
    | "pending"

export type SessionStatus =
    | "completed"
    | "ongoing"
    | "scheduled"
    | "cancelled"

export type PaymentStatus =
    | "paid"
    | "pending"
    | "failed"
    | "refunded"
    | "paid_out"

// ============================================
// Core entities
// ============================================

export interface OrderMember {
    id: string | number
    name: string
    email: string
    phone?: string
    location?: string
    joinDate?: string
    image?: string
}

export interface OrderTrainer {
    id: string | number
    name: string
    email?: string
    username?: string
    avatar?: string
    rating?: number
    totalStudents?: number
    specialization?: string
    location?: string
    yearsExperience?: number
    subjects?: string[]
}

export interface OrderPayment {
    invoiceNo: string
    receiptRef?: string
    method: string
    status: string
    paidAt?: string | null
    pricePackage: number
    serviceFee: number
    tax: number
    total: number
}

export interface SessionFeedback {
    rating: number
    pesan: string
}

export interface OrderSession {
    no: number
    date: string
    time: string
    status: SessionStatus
    feedback?: SessionFeedback
}

export interface CancellationInfo {
    kategori: string
    ulasan: string
    resolusi: string
}

export interface OrderBooking {
    id: string | number
    bookingCode: string
    userName: string
    userEmail?: string
    trainerName: string
    packageName: string
    totalSessions: number
    completedSessions: number
    totalPayment: number
    bookingDate: string
    paymentGateway?: string
    paymentMethod?: string
    status: string
    mode: "online" | "offline"
}

export interface OrderDetail {
    bookingId: string | number
    bookingCode: string
    member: OrderMember
    trainer: OrderTrainer
    payment: OrderPayment
    sessions: OrderSession[]
    graduationNote?: string
    cancellationInfo?: CancellationInfo
    notes?: string
}

export interface AuditTrailEntry {
    action?: string
    statusName?: string
    statusText?: string
    createdAt?: string
    timestamp?: string
    notes?: string
    description?: string
    message?: string
    changedBy?: string
}

export interface SimPaymentInfo {
    status: "paid" | "paid_out" | "refunded" | "pending"
    payoutReference?: string
}

// ============================================
// UI config helpers
// ============================================

export interface OrderStatusConfig {
    label: string
    dotClass: string
    badgeClass: string
}

export interface SessionStatusConfig {
    label: string
    iconName: "CheckCircle2" | "Activity" | "Clock" | "XCircle"
    textClass: string
    bgClass: string
    iconBgClass: string
}

export interface PaymentStatusConfig {
    label: string
    badgeClass: string
}

// ============================================
// Hook return shape
// ============================================

export interface UseOrderDetailReturn {
    booking: OrderBooking | null
    detail: OrderDetail | null
    auditTrail: AuditTrailEntry[]
    isLoading: boolean
    isError: string | null
    isApiData: boolean
    simPaymentStatus: SimPaymentInfo | null
    finalSessions: OrderSession[]
    sessCompleted: number
    sessOngoing: number
    sessScheduled: number
    sessCancelled: number
    progressPct: number
    finalBookingStatus: string
    isPaid: boolean
    isSim: boolean
    handleMarkSessionCompleted: (sessionNo: number) => void
}
