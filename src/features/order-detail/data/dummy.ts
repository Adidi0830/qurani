/**
 * Order Detail — Dummy / Fallback Data
 *
 * Data dummy untuk pengembangan & demo ketika API tidak tersedia.
 * Sebelumnya tersebar di page.tsx sebagai const literal raksasa.
 * Mengikuti pola features/support/data/load-ticket-detail.ts
 */

import billingDummy from "@/data/billing-dummy.json"
import type {
    OrderBooking,
    OrderDetail,
    AuditTrailEntry,
    OrderMember,
    OrderTrainer,
    OrderPayment,
    OrderSession,
    SessionStatus,
    OrderStatus,
} from "../model/types"

// ============================================
// Helpers
// ============================================

function sessions(...args: Array<{ no: number; date: string; time: string; status: string; feedback?: { rating: number; pesan: string } }>) {
    return args as OrderDetail["sessions"]
}

// ============================================
// Dummy Orders
// ============================================

/** #3028 — Siti Rahmawati · Aktif · 5 sesi */
export const DUMMY_3028: { booking: OrderBooking; detail: OrderDetail } = {
    booking: {
        id: 3028,
        bookingCode: "BK-QUR-3028",
        userName: "Siti Rahmawati",
        userEmail: "siti.rahma@example.com",
        trainerName: "Zain Al-Fattah",
        packageName: "5x Pertemuan",
        totalSessions: 5,
        completedSessions: 0,
        totalPayment: 405000,
        bookingDate: "2026-09-19T07:00:00.000Z",
        paymentGateway: "Bank Transfer (Mandiri)",
        paymentMethod: "Tahfidz Intensif",
        status: "pending",
        mode: "online",
    },
    detail: {
        bookingId: 3028,
        bookingCode: "BK-QUR-3028",
        member: {
            id: 501,
            name: "Siti Rahmawati",
            email: "siti.rahma@example.com",
            phone: "+62 857-1100-9988",
            location: "Jakarta Selatan",
            joinDate: "2026-01-15T00:00:00.000Z",
        },
        trainer: {
            id: 401,
            name: "Zain Al-Fattah",
            email: "zain.alfattah@qurani.id",
            username: "@zain_fattah",
            avatar: "https://i.pravatar.cc/150?img=68",
            rating: 4.1,
            totalStudents: 187,
            specialization: "Irama & Tajwid Lanjut",
            location: "Madinah, Saudi Arabia",
            yearsExperience: 8,
            subjects: ["Irama & Tajwid Lanjut", "Murrotal", "Tahsin"],
        },
        payment: {
            invoiceNo: "INV-2026-3028",
            receiptRef: "—",
            method: "Bank Transfer (Mandiri)",
            status: "pending",
            paidAt: null,
            pricePackage: 360000,
            serviceFee: 0,
            tax: 45000,
            total: 405000,
        },
        sessions: sessions(
            { no: 1, date: "2026-09-19", time: "10:00 - 11:00", status: "scheduled" },
            { no: 2, date: "2026-09-26", time: "19:00 - 20:00", status: "scheduled" },
            { no: 3, date: "2026-10-03", time: "12:00 - 13:00", status: "scheduled" },
            { no: 4, date: "2026-10-10", time: "20:00 - 21:00", status: "scheduled" },
            { no: 5, date: "2026-10-17", time: "10:00 - 11:00", status: "scheduled" },
        ),
    },
}

/** #3010 — Muhammad Yusuf · Selesai · 3 sesi */
export const DUMMY_3010: { booking: OrderBooking; detail: OrderDetail } = {
    booking: {
        id: 3010,
        bookingCode: "BK-QUR-3010",
        userName: "Muhammad Yusuf",
        userEmail: "m.yusuf@qurani.id",
        trainerName: "Hasyim Asy'ari, Lc",
        packageName: "3x Pertemuan",
        totalSessions: 3,
        completedSessions: 3,
        totalPayment: 250000,
        bookingDate: "2026-01-10T08:00:00.000Z",
        paymentGateway: "GoPay",
        paymentMethod: "Ummi",
        status: "completed",
        mode: "online",
    },
    detail: {
        bookingId: 3010,
        bookingCode: "BK-QUR-3010",
        member: {
            id: 110,
            name: "Muhammad Yusuf",
            email: "m.yusuf@qurani.id",
            phone: "0812-3456-7890",
            location: "Depok, Jawa Barat",
            joinDate: "2026-01-12T00:00:00.000Z",
        },
        trainer: {
            id: 301,
            name: "Hasyim Asy'ari, Lc",
            email: "hasyim@qurani.id",
            username: "@hasyim_lc",
            avatar: "https://c.superprof.com/i/m/11946808/600/20251105122731/11946808.webp",
            rating: 5.0,
            totalStudents: 245,
            specialization: "Tahsin, Tajwid & Talaqqi",
            location: "Kairo, Egypt (Al-Azhar)",
            yearsExperience: 12,
            subjects: ["Ummi", "Tajwid", "Talaqqi"],
        },
        payment: {
            invoiceNo: "INV-ZLF-3010",
            receiptRef: "GPY-77889900",
            method: "GoPay",
            status: "paid",
            paidAt: "2026-01-10T08:05:22.000Z",
            pricePackage: 220000,
            serviceFee: 0,
            tax: 30000,
            total: 250000,
        },
        sessions: sessions(
            { no: 1, date: "2026-01-10", time: "08:00 - 09:00", status: "completed", feedback: { rating: 5, pesan: "Pengucapan huruf makhraj mulai membaik, terima kasih Ustadz." } },
            { no: 2, date: "2026-01-17", time: "08:00 - 09:00", status: "completed", feedback: { rating: 5, pesan: "Penjelasan hukum tajwid Nun mati sangat mudah dipahami." } },
            { no: 3, date: "2026-01-24", time: "08:00 - 09:00", status: "completed", feedback: { rating: 5, pesan: "Alhamdulillah selesai 3 sesi, sangat puas dengan bimbingannya." } },
        ),
        graduationNote: "Lulus dengan baik. Bacaan sudah sesuai kaidah tajwid dasar.",
    },
}

/** #3098 — Fauzia Nurrohma · Menunggu Guru · 1 sesi */
export const DUMMY_3098: { booking: OrderBooking; detail: OrderDetail } = {
    booking: {
        id: 3098,
        bookingCode: "BK-QUR-3098",
        userName: "Fauzia Nurrohma",
        userEmail: "fauzia.nurrohma@email.com",
        trainerName: "Indi Fitriani",
        packageName: "1x Pertemuan",
        totalSessions: 1,
        completedSessions: 0,
        totalPayment: 89600,
        bookingDate: "2026-04-02T10:30:00.000Z",
        paymentGateway: "GoPay",
        paymentMethod: "Tilawati",
        status: "menunggu_guru",
        mode: "online",
    },
    detail: {
        bookingId: 3098,
        bookingCode: "BK-QUR-3098",
        member: {
            id: 211,
            name: "Fauzia Nurrohma",
            email: "fauzia.nurrohma@email.com",
            phone: "0813-2233-4455",
            location: "Tangerang, Banten",
            joinDate: "2026-03-20T00:00:00.000Z",
        },
        trainer: {
            id: 302,
            name: "Indi Fitriani",
            email: "indi.f@qurani.id",
            username: "@indi_fitriani",
            avatar: "https://c.superprof.com/i/m/26923640/600/20250828080508/26923640.webp",
            rating: 4.9,
            totalStudents: 39,
            specialization: "Tahsinul Qur'an & Tahfidzul Qur'an",
            location: "Bekasi, Jawa Barat",
            yearsExperience: 5,
            subjects: ["Tahsinul Qur'an", "Tahfidzul Qur'an"],
        },
        payment: {
            invoiceNo: "INV-FZN-3098",
            receiptRef: "GOPAY-20260402-FZN",
            method: "GoPay",
            status: "paid",
            paidAt: "2026-04-02T10:35:00.000Z",
            pricePackage: 80000,
            serviceFee: 0,
            tax: 9600,
            total: 89600,
        },
        sessions: sessions(
            { no: 1, date: "2026-04-09", time: "10:00 - 11:00", status: "scheduled" },
        ),
    },
}

/** #3001 — Siti Rahmawati · Aktif · 5 sesi (2 selesai) */
export const DUMMY_3001: { booking: OrderBooking; detail: OrderDetail } = {
    booking: {
        id: 3001,
        bookingCode: "e1f1a554-a3c1-46fd-b531-0824284c900c",
        userName: "Siti Rahmawati",
        userEmail: "siti.rahma@example.com",
        trainerName: "Indi Fitriani",
        packageName: "5x Pertemuan",
        totalSessions: 5,
        completedSessions: 2,
        totalPayment: 387500,
        bookingDate: "2026-04-05T00:00:00Z",
        paymentGateway: "GoPay",
        paymentMethod: "Tahsin Intensif",
        status: "active",
        mode: "online",
    },
    detail: {
        bookingId: 3001,
        bookingCode: "e1f1a554-a3c1-46fd-b531-0824284c900c",
        member: {
            id: 889977665544101,
            name: "Siti Rahmawati",
            email: "siti.rahma@example.com",
            phone: "+62 857-1100-9988",
            location: "Semarang, Jawa Tengah",
            joinDate: "2025-09-01T00:00:00Z",
        },
        trainer: {
            id: 302,
            name: "Indi Fitriani",
            email: "indi.f@qurani.id",
            username: "@indi_fitriani",
            avatar: "https://i.pravatar.cc/150?img=47",
            rating: 4.9,
            totalStudents: 39,
            specialization: "Tahsinul Qur'an & Tahfidzul Qur'an",
            location: "Bekasi, Jawa Barat",
            yearsExperience: 5,
            subjects: ["Tahsinul Qur'an", "Tahfidzul Qur'an"],
        },
        payment: {
            invoiceNo: "INV-2026-3001",
            receiptRef: "MID-2026-04-0010",
            method: "GoPay",
            status: "paid",
            paidAt: "2026-04-05T10:30:00Z",
            pricePackage: 382500,
            serviceFee: 0,
            tax: 45900,
            total: 428400,
        },
        sessions: sessions(
            { no: 1, date: "2026-04-10", time: "09:00 - 10:00", status: "completed", feedback: { rating: 5, pesan: "Sesi pengenalan makhraj sangat jelas dan menyenangkan." } },
            { no: 2, date: "2026-04-12", time: "09:00 - 10:00", status: "completed", feedback: { rating: 5, pesan: "Sesi kedua lancar, belajar hukum nun mati." } },
            { no: 3, date: "2026-04-14", time: "09:00 - 10:00", status: "scheduled" },
            { no: 4, date: "2026-04-16", time: "09:00 - 10:00", status: "scheduled" },
            { no: 5, date: "2026-04-18", time: "09:00 - 10:00", status: "scheduled" },
        ),
    },
}

/** #3099 — Rahma Aulia · Pending · 5 sesi */
export const DUMMY_3099: { booking: OrderBooking; detail: OrderDetail } = {
    booking: {
        id: 3099,
        bookingCode: "BK-QUR-3099",
        userName: "Rahma Aulia",
        userEmail: "rahma.aulia@email.com",
        trainerName: "Indi Fitriani",
        packageName: "5x Pertemuan",
        totalSessions: 5,
        completedSessions: 0,
        totalPayment: 420000,
        bookingDate: "2026-04-01T09:00:00.000Z",
        paymentGateway: "—",
        paymentMethod: "Tilawati",
        status: "pending",
        mode: "online",
    },
    detail: {
        bookingId: 3099,
        bookingCode: "BK-QUR-3099",
        member: {
            id: 210,
            name: "Rahma Aulia",
            email: "rahma.aulia@email.com",
            phone: "0821-5566-7788",
            location: "Depok, Jawa Barat",
            joinDate: "2026-03-15T00:00:00.000Z",
        },
        trainer: {
            id: 302,
            name: "Indi Fitriani",
            email: "indi.f@qurani.id",
            username: "@indi_fitriani",
            avatar: "https://c.superprof.com/i/m/26923640/600/20250828080508/26923640.webp",
            rating: 4.9,
            totalStudents: 39,
            specialization: "Tahsinul Qur'an & Tahfidzul Qur'an",
            location: "Bekasi, Jawa Barat",
            yearsExperience: 5,
            subjects: ["Tahsinul Qur'an", "Tahfidzul Qur'an"],
        },
        payment: {
            invoiceNo: "INV-RHM-3099",
            receiptRef: "—",
            method: "—",
            status: "pending",
            paidAt: null,
            pricePackage: 375000,
            serviceFee: 0,
            tax: 45000,
            total: 420000,
        },
        sessions: sessions(
            { no: 1, date: "2026-04-10", time: "09:00 - 10:00", status: "scheduled" },
            { no: 2, date: "2026-04-17", time: "09:00 - 10:00", status: "scheduled" },
            { no: 3, date: "2026-04-24", time: "09:00 - 10:00", status: "scheduled" },
            { no: 4, date: "2026-05-01", time: "09:00 - 10:00", status: "scheduled" },
            { no: 5, date: "2026-05-08", time: "09:00 - 10:00", status: "scheduled" },
        ),
    },
}

// ============================================
// Audit trail fallbacks
// ============================================

export const DUMMY_AUDIT: Record<number, AuditTrailEntry[]> = {
    3028: [
        { statusName: "Pending", createdAt: "2026-09-19T07:00:00.000Z", notes: "Pesanan baru dibuat, menunggu konfirmasi pembayaran.", changedBy: "Siti Rahmawati" },
    ],
    3006: [
        { statusName: "Dibatalkan", createdAt: "2026-03-04T10:00:00.000Z", notes: "Pesanan dibatalkan oleh pengguna (alasan: Penampilan Tidak Sesuai). Seluruh jadwal sesi dibatalkan.", changedBy: "Nur Hidayah" },
        { statusName: "Aktif",      createdAt: "2025-12-01T08:05:00.000Z", notes: "Pembayaran terkonfirmasi. Sesi dijadwalkan.",               changedBy: "System" },
        { statusName: "Pending",    createdAt: "2025-12-01T08:00:00.000Z", notes: "Pesanan baru dibuat, menunggu pembayaran.",                   changedBy: "Nur Hidayah" },
    ],
    3009: [
        { statusName: "Sesi Selesai", createdAt: "2026-03-10T14:00:00.000Z", notes: "Sesi ke-4 telah diselesaikan.", changedBy: "Indi Fitriani" },
        { statusName: "Sesi Selesai", createdAt: "2026-03-03T14:00:00.000Z", notes: "Sesi ke-3 telah diselesaikan.", changedBy: "Indi Fitriani" },
        { statusName: "Aktif",        createdAt: "2026-02-20T09:05:00.000Z", notes: "Pembayaran terkonfirmasi.",     changedBy: "System" },
        { statusName: "Pending",      createdAt: "2026-02-20T09:00:00.000Z", notes: "Pesanan baru dibuat.",          changedBy: "Muhammad Yusuf" },
    ],
    3010: [
        { statusName: "Selesai", createdAt: "2026-01-24T09:00:00.000Z", notes: "Semua sesi telah selesai.", changedBy: "System" },
        { statusName: "Aktif",   createdAt: "2026-01-10T08:05:22.000Z", notes: "Pembayaran terkonfirmasi.", changedBy: "System" },
        { statusName: "Pending", createdAt: "2026-01-10T08:00:00.000Z", notes: "Pesanan baru dibuat, menunggu pembayaran.", changedBy: "System" },
    ],
    3003: [
        { statusName: "Selesai", createdAt: "2026-01-24T09:00:00.000Z", notes: "Semua sesi telah selesai.", changedBy: "System" },
        { statusName: "Aktif",   createdAt: "2026-01-10T08:05:22.000Z", notes: "Pembayaran terkonfirmasi.", changedBy: "System" },
        { statusName: "Pending", createdAt: "2026-01-10T08:00:00.000Z", notes: "Pesanan baru dibuat.",      changedBy: "System" },
    ],
    3001: [
        { statusName: "Sesi Selesai", createdAt: "2026-04-12T10:00:00.000Z", notes: "Sesi ke-2 selesai.", changedBy: "Indi Fitriani" },
        { statusName: "Sesi Selesai", createdAt: "2026-04-10T10:00:00.000Z", notes: "Sesi ke-1 selesai.", changedBy: "Indi Fitriani" },
        { statusName: "Aktif",        createdAt: "2026-04-05T10:30:00.000Z", notes: "Pembayaran GoPay terkonfirmasi. Sesi dijadwalkan.", changedBy: "System" },
        { statusName: "Pending",      createdAt: "2026-04-05T10:00:00.000Z", notes: "Pesanan baru dibuat, menunggu pembayaran.",         changedBy: "Siti Rahmawati" },
    ],
    3099: [
        { statusName: "Pending", createdAt: "2026-04-01T09:00:00.000Z", notes: "Pesanan baru dibuat, menunggu konfirmasi pembayaran.", changedBy: "Rahma Aulia" },
    ],
    3098: [
        { statusName: "Menunggu Guru", createdAt: "2026-04-02T10:35:00.000Z", notes: "Pembayaran GoPay terkonfirmasi. Menunggu konfirmasi guru.", changedBy: "System" },
        { statusName: "Pending",       createdAt: "2026-04-02T10:30:00.000Z", notes: "Pesanan baru dibuat, menunggu pembayaran.",                  changedBy: "Fauzia Nurrohma" },
    ],
}

export const FALLBACK_AUDIT: AuditTrailEntry[] = [
    { statusName: "Pending", createdAt: new Date().toISOString(), notes: "Pesanan baru dibuat, menunggu konfirmasi.", changedBy: "System" },
]

// ============================================
// Auto-generate Dummy Orders from billing-dummy.json (All 32 orders)
// ============================================

function normalizeStatus(status: string): OrderStatus {
    if (status === "pending_payment") return "pending"
    if (status === "pending_trainer") return "menunggu_guru"
    if (status === "active") return "active"
    if (status === "completed") return "completed"
    if (status === "cancelled") return "cancelled"
    return (status as OrderStatus) || "pending"
}

function convertFromBillingDummy(): Record<number, { booking: OrderBooking; detail: OrderDetail }> {
    const result: Record<number, { booking: OrderBooking; detail: OrderDetail }> = {}

    for (const b of (billingDummy as any).bookings || []) {
        const rawDetail = (billingDummy as any).bookingDetails?.find((d: any) => d.bookingId === b.id)
        const status = normalizeStatus(b.status)

        const booking: OrderBooking = {
            id: b.id,
            bookingCode: b.bookingCode || `#${b.id}`,
            userName: b.userName,
            userEmail: b.userEmail,
            trainerName: b.trainerName,
            packageName: b.packageName,
            totalSessions: b.totalSessions,
            completedSessions: b.completedSessions,
            totalPayment: b.totalPayment,
            bookingDate: b.bookingDate,
            paymentGateway: b.paymentGateway && b.paymentGateway !== "-" ? b.paymentGateway : undefined,
            paymentMethod: b.paymentMethod && b.paymentMethod !== "-" ? b.paymentMethod : undefined,
            status,
            mode: (b.mode as "online" | "offline") || "online",
        }

        const member: OrderMember = rawDetail?.member ? {
            id: rawDetail.member.id,
            name: rawDetail.member.name || b.userName,
            email: rawDetail.member.email || b.userEmail || "",
            phone: rawDetail.member.phone || "-",
            location: rawDetail.member.location || "-",
            joinDate: rawDetail.member.joinDate || b.bookingDate,
            image: rawDetail.member.image,
        } : {
            id: b.userId || b.id,
            name: b.userName,
            email: b.userEmail || "",
            phone: "-",
            location: "-",
            joinDate: b.bookingDate,
        }

        const trainer: OrderTrainer = rawDetail?.trainer ? {
            id: rawDetail.trainer.id,
            name: rawDetail.trainer.name || b.trainerName,
            email: rawDetail.trainer.email,
            username: rawDetail.trainer.username || `@${b.trainerName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            avatar: rawDetail.trainer.avatar,
            rating: rawDetail.trainer.rating,
            totalStudents: rawDetail.trainer.totalStudents,
            specialization: rawDetail.trainer.specialization || "Pengajar Al-Qur'an",
            location: rawDetail.trainer.location,
            yearsExperience: rawDetail.trainer.yearsExperience,
            subjects: rawDetail.trainer.subjects || [],
        } : {
            id: b.trainerId || 0,
            name: b.trainerName,
            username: `@${b.trainerName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            specialization: "Pengajar Al-Qur'an",
        }

        const payment: OrderPayment = rawDetail?.payment ? {
            invoiceNo: rawDetail.payment.invoiceNo || `INV-2026-${b.id}`,
            receiptRef: rawDetail.payment.receiptRef || "—",
            method: rawDetail.payment.method && rawDetail.payment.method !== "-" ? rawDetail.payment.method : (b.paymentGateway || "—"),
            status: rawDetail.payment.status === "pending" || status === "pending" ? "pending" : (rawDetail.payment.status || "paid"),
            paidAt: rawDetail.payment.paidAt || null,
            pricePackage: rawDetail.payment.pricePackage || b.pricePackage || b.totalPayment,
            serviceFee: rawDetail.payment.serviceFee ?? b.serviceFee ?? 0,
            tax: rawDetail.payment.tax ?? 0,
            total: rawDetail.payment.total || b.totalPayment,
        } : {
            invoiceNo: `INV-2026-${b.id}`,
            receiptRef: "—",
            method: b.paymentGateway || "—",
            status: status === "pending" ? "pending" : "paid",
            paidAt: status === "pending" ? null : b.bookingDate,
            pricePackage: b.pricePackage || b.totalPayment,
            serviceFee: b.serviceFee ?? 5000,
            tax: 0,
            total: b.totalPayment,
        }

        const sessionsList: OrderSession[] = (rawDetail?.sessions || []).map((s: any) => ({
            no: s.no,
            date: s.date,
            time: s.time,
            status: (s.status as SessionStatus) || "scheduled",
            feedback: s.feedback || (s.notes ? { rating: 5, pesan: s.notes } : undefined),
        }))

        const detail: OrderDetail = {
            bookingId: b.id,
            bookingCode: b.bookingCode || `#${b.id}`,
            member,
            trainer,
            payment,
            sessions: sessionsList,
            graduationNote: status === "completed" ? "Semua sesi telah selesai dijalankan dengan baik." : undefined,
            cancellationInfo: status === "cancelled" ? {
                kategori: "Permintaan Pengguna",
                ulasan: "Pesanan dibatalkan.",
                resolusi: "Dana telah diproses sesuai kebijakan pembatalan.",
            } : undefined,
        }

        result[b.id] = { booking, detail }
    }

    return result
}

function generateAuditTrail(b: OrderBooking, sessions: OrderSession[]): AuditTrailEntry[] {
    const list: AuditTrailEntry[] = []
    const dateStr = b.bookingDate || new Date().toISOString()

    if (b.status === "completed") {
        list.push({
            statusName: "Selesai",
            createdAt: sessions[sessions.length - 1]?.date || dateStr,
            notes: "Semua sesi telah selesai, pesanan ditandai Selesai.",
            changedBy: "System",
        })
    }

    const doneSessions = sessions.filter(s => s.status === "completed")
    doneSessions.slice(-2).reverse().forEach(s => {
        list.push({
            statusName: "Sesi Selesai",
            createdAt: s.date,
            notes: `Sesi ke-${s.no} telah selesai dilaksanakan.`,
            changedBy: b.trainerName,
        })
    })

    if (b.status === "cancelled") {
        list.push({
            statusName: "Dibatalkan",
            createdAt: dateStr,
            notes: "Pesanan dibatalkan.",
            changedBy: "System",
        })
    } else if (b.status === "menunggu_guru") {
        list.push({
            statusName: "Menunggu Guru",
            createdAt: dateStr,
            notes: "Pembayaran terkonfirmasi. Menunggu persetujuan guru.",
            changedBy: "System",
        })
    } else if (b.status === "active" || b.status === "completed") {
        list.push({
            statusName: "Aktif",
            createdAt: dateStr,
            notes: `Pembayaran ${b.paymentGateway || "terkonfirmasi"}. Sesi telah dijadwalkan.`,
            changedBy: "System",
        })
    }

    list.push({
        statusName: "Pending",
        createdAt: dateStr,
        notes: "Pesanan baru dibuat, menunggu pembayaran.",
        changedBy: b.userName,
    })

    return list
}

const DUMMY_FROM_JSON = convertFromBillingDummy()

// Auto-fill audit trails for all bookings from json
for (const [idStr, data] of Object.entries(DUMMY_FROM_JSON)) {
    const id = Number(idStr)
    if (!DUMMY_AUDIT[id]) {
        DUMMY_AUDIT[id] = generateAuditTrail(data.booking, data.detail.sessions)
    }
}

// ============================================
// Lookup map (Semua 32 pesanan dari data dummy)
// ============================================

export const DUMMY_ORDERS: Record<number, { booking: OrderBooking; detail: OrderDetail }> = {
    ...DUMMY_FROM_JSON,
    // Overlay manual rich dummies jika ada kustomisasi spesifik
    3028: DUMMY_3028,
    3010: DUMMY_3010,
    3098: DUMMY_3098,
    3001: DUMMY_3001,
    3099: DUMMY_3099,
}
