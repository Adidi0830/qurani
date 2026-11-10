"use client"

export type BillingPipelineStatus = "baru" | "lunas" | "aktif" | "gagal" | "selesai" | "menunggu_guru"

export type BillingPipelineOrder = {
    id: string | number
    bookingCode: string          // Human-readable code e.g. "BK-3098" or raw bookingCode from API
    member: string
    username: string
    memberAvatar: string
    memberImage?: string
    guru: string
    guruUsername: string
    guruImage?: string
    paket: string
    sesi: number
    sesiSelesai: number
    harga: number
    tglPesan: string
    rawDate: Date
    payment: string              // Gateway: GoPay, QRIS, OVO, etc.
    mode: "online" | "offline"   // Learning mode
    status: BillingPipelineStatus
    isPendingPayment?: boolean
    isSim?: boolean
    userId?: string | number
    trainerId?: string | number
    isApi?: boolean
    apiStatus?: number | string | null
}

const API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

function getClientToken(): string | null {
    if (typeof window === "undefined") return null

    const direct =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("myqurani_access_token") ||
        sessionStorage.getItem("myqurani_access_token")

    if (direct) return direct

    const auth = localStorage.getItem("myqurani_auth") || sessionStorage.getItem("myqurani_auth")
    if (!auth) return null

    try {
        const parsed = JSON.parse(auth)
        return parsed?.accessToken || parsed?.token || null
    } catch {
        return null
    }
}

function headers() {
    const token = getClientToken()
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

async function apiJson(path: string, init?: RequestInit) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            ...headers(),
            ...(init?.headers || {}),
        },
    })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
    }

    const text = await res.text()
    if (!text) return null
    return JSON.parse(text)
}

function pick<T = unknown>(obj: any, keys: string[], fallback?: T): T {
    if (!obj) return fallback as T
    for (const key of keys) {
        const value = key.split(".").reduce((acc, part) => acc?.[part], obj)
        if (value !== undefined && value !== null && value !== "") return value as T
    }
    return fallback as T
}

function toNumber(value: unknown, fallback = 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function toDate(value: unknown) {
    const date = value ? new Date(String(value)) : new Date()
    return Number.isNaN(date.getTime()) ? new Date() : date
}

function initials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "QR"
}

function toUsername(email: string, name: string) {
    if (email && email.includes("@")) return email.split("@")[0].replace(/[^a-z0-9._-]/gi, "").toLowerCase()
    return name.toLowerCase().replace(/[^a-z0-9._-]/g, "")
}

function unwrapList(payload: any): any[] {
    const candidates = [
        payload,
        payload?.data,
        payload?.items,
        payload?.results,
        payload?.bookings,
        payload?.data?.items,
        payload?.data?.results,
        payload?.data?.bookings,
        payload?.data?.data,
    ]
    return candidates.find(Array.isArray) || []
}

function unwrapOne(payload: any): any {
    return payload?.data?.data || payload?.data || payload?.booking || payload
}

export function normalizeApiStatus(raw: unknown, statusText?: unknown, paymentStatus?: unknown): BillingPipelineStatus {
    const text = String(statusText ?? raw ?? "").toLowerCase().replace(/[_-]/g, " ")
    const payment = String(paymentStatus ?? "").toLowerCase()

    if (/cancel|batal|reject|failed|gagal|no show/.test(text)) return "gagal"
    if (/complete|selesai|done|finished/.test(text)) return "selesai"
    if (/active|aktif|ongoing|progress|started|berlangsung/.test(text)) return "aktif"
    if (/waiting.*trainer|trainer.*waiting|menunggu guru|approved|confirmed|accepted/.test(text)) return "menunggu_guru"
    if (/paid|lunas|success/.test(text) || payment === "paid") return "lunas"
    if (/pending|waiting|unpaid|menunggu bayar|draft/.test(text)) return "baru"

    const n = Number(raw)
    if (n === 0) return "baru"
    if (n === 1) return payment === "paid" ? "menunggu_guru" : "menunggu_guru"
    if (n === 2) return "aktif"
    if (n === 3) return "selesai"
    if (n === 4 || n === 5) return "gagal"

    return "baru"
}

export function apiStatusValue(status: BillingPipelineStatus): number {
    const map: Record<BillingPipelineStatus, number> = {
        baru: 0,
        lunas: 1,
        menunggu_guru: 1,
        aktif: 2,
        selesai: 3,
        gagal: 4,
    }
    return map[status]
}

export function apiBookingToPipeline(raw: any): BillingPipelineOrder {
    const id = pick(raw, ["id", "bookingId", "bookingID"], "-")
    // bookingCode: prefer dedicated bookingCode field, else derive from id
    const rawBookingCode = pick<string>(raw, ["bookingCode", "code", "orderCode"], "")
    const bookingCode = rawBookingCode || `#${id}`

    const userName = pick<string>(raw, ["userName", "studentName", "memberName", "user.name", "student.name", "member.name"], `Member #${pick(raw, ["userId", "studentId"], "")}`)
    const userEmail = pick<string>(raw, ["userEmail", "studentEmail", "memberEmail", "user.email", "student.email", "member.email"], "")
    const memberImage = pick<string>(raw, ["userImage", "memberImage", "studentImage", "user.image", "member.image"], "")

    const trainerName = pick<string>(raw, ["trainerName", "teacherName", "guruName", "trainer.name", "trainer.userName", "course.trainerName"], "Guru Qurani")
    const trainerEmail = pick<string>(raw, ["trainerEmail", "trainer.email", "teacherEmail"], "")
    const guruImage = pick<string>(raw, ["trainerImage", "trainerAvatar", "trainer.image", "trainer.avatar", "trainer.userImage"], "")

    const packageName = pick<string>(raw, ["packageName", "courseName", "courseTitle", "course.title", "course.name", "package.name"], "Paket Qurani")
    const totalSessions = toNumber(pick(raw, ["totalSessions", "sessions", "course.totalSessions", "package.sessions"], 1), 1)
    const completedSessions = toNumber(pick(raw, ["completedSessions", "completedSessionCount", "sessionsCompleted"], 0), 0)
    const totalPayment = toNumber(pick(raw, ["totalPayment", "totalAmount", "amount", "price", "payment.total", "course.packagePrice", "course.discountPrice"], 0), 0)
    const bookingDate = toDate(pick(raw, ["bookingDate", "scheduledDate", "createdAt", "startDate", "date"], null))
    const paymentStatus = pick(raw, ["paymentStatus", "payment.status"], null)
    const status = normalizeApiStatus(pick(raw, ["status"], null), pick(raw, ["statusText", "statusName"], null), paymentStatus)

    // Mode: 1 = online, 2 = offline (or string "online"/"offline")
    const modeRaw = pick(raw, ["mode", "course.mode", "learningMode"], 1)
    const mode: "online" | "offline" = (String(modeRaw) === "2" || String(modeRaw).toLowerCase() === "offline") ? "offline" : "online"

    const paymentGateway = pick<string>(raw, ["paymentGateway", "paymentMethod", "payment.method", "payment.gateway", "gateway"], paymentStatus === "paid" ? "Paid" : "-")

    return {
        id,
        bookingCode,
        member: userName,
        username: toUsername(userEmail, userName),
        memberAvatar: initials(userName),
        memberImage,
        guru: trainerName,
        guruUsername: `@${toUsername(trainerEmail, trainerName)}`,
        guruImage,
        paket: packageName,
        sesi: totalSessions,
        sesiSelesai: completedSessions,
        harga: totalPayment,
        tglPesan: bookingDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        rawDate: bookingDate,
        payment: paymentGateway,
        mode,
        status,
        isPendingPayment: status === "baru",
        isApi: true,
        apiStatus: pick(raw, ["status"], null),
    }
}

function minutesToTime(value: unknown) {
    const minutes = toNumber(value, 0)
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function apiBookingToDetail(rawPayload: any) {
    const raw = unwrapOne(rawPayload)
    const row = apiBookingToPipeline(raw)
    const scheduled = toDate(pick(raw, ["scheduledDate", "bookingDate", "startDate", "createdAt"], null))
    const mode = row.mode
    const statusKey =
        row.status === "gagal" ? "cancelled" :
        row.status === "selesai" ? "completed" :
        row.status === "aktif" || row.status === "lunas" ? "active" :
        row.status === "menunggu_guru" ? "menunggu_guru" :
        "pending"

    const totalSessions = Math.max(1, row.sesi)
    const apiSessions = unwrapList(pick(raw, ["sessions", "bookingSessions", "schedules"], []))
    const sessions = (apiSessions.length ? apiSessions : Array.from({ length: totalSessions }, (_, i) => ({ no: i + 1 }))).map((s: any, idx: number) => {
        const sessionDate = toDate(pick(s, ["date", "scheduledDate", "startDate"], scheduled.toISOString()))
        const start = pick(s, ["time", "startTimeText"], null) || minutesToTime(pick(s, ["startTime"], 600))
        const end = pick(s, ["endTimeText"], null) || minutesToTime(pick(s, ["endTime"], toNumber(pick(s, ["startTime"], 600), 600) + 60))
        const sessionStatus = normalizeApiStatus(pick(s, ["status"], null), pick(s, ["statusText"], null))
        return {
            no: toNumber(pick(s, ["no", "sessionNo", "order"], idx + 1), idx + 1),
            date: sessionDate.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
            time: `${start} - ${end}`,
            status: sessionStatus === "selesai" ? "completed" : sessionStatus === "gagal" ? "cancelled" : sessionStatus === "aktif" ? "ongoing" : "scheduled",
            feedback: pick(s, ["feedback", "review"], undefined),
        }
    })

    const pricePackage = toNumber(pick(raw, ["pricePackage", "course.packagePrice", "course.discountPrice", "payment.pricePackage"], row.harga), row.harga)
    const tax = toNumber(pick(raw, ["tax", "payment.tax"], Math.round(pricePackage * 0.12)), Math.round(pricePackage * 0.12))
    const serviceFee = toNumber(pick(raw, ["serviceFee", "payment.serviceFee"], 0), 0)
    const paymentStatus = pick(raw, ["paymentStatus", "payment.status"], row.status === "baru" ? "pending" : "paid")

    return {
        booking: {
            id: row.id,
            bookingCode: row.bookingCode,
            userName: row.member,
            userEmail: pick<string>(raw, ["userEmail", "studentEmail", "memberEmail", "user.email", "student.email"], ""),
            userPhone: pick<string>(raw, ["userPhone", "studentPhone", "member.phone", "user.phone"], ""),
            userLocation: pick<string>(raw, ["userLocation", "studentLocation", "city", "member.location", "user.city"], ""),
            trainerName: row.guru,
            trainerUsername: pick<string>(raw, ["trainerUsername", "trainer.username", "trainer.userName"], row.guruUsername),
            packageName: row.paket,
            totalSessions,
            completedSessions: row.sesiSelesai,
            totalPayment: row.harga,
            bookingDate: scheduled.toISOString(),
            paymentGateway: row.payment,
            paymentMethod: pick<string>(raw, ["learningMethod", "course.categoryName", "course.courseType"], "Qurani"),
            status: statusKey,
            mode,
        },
        detail: {
            bookingId: row.id,
            bookingCode: row.bookingCode,
            member: {
                id: pick(raw, ["userId", "studentId", "member.id"], 0),
                name: row.member,
                email: pick<string>(raw, ["userEmail", "studentEmail", "memberEmail", "user.email", "student.email"], ""),
                phone: pick<string>(raw, ["userPhone", "studentPhone", "member.phone", "user.phone"], "-"),
                location: pick<string>(raw, ["userLocation", "studentLocation", "city", "member.location", "user.city"], "-"),
                joinDate: pick<string>(raw, ["user.createdAt", "member.joinDate", "createdAt"], scheduled.toISOString()),
                image: pick<string>(raw, ["userImage", "memberImage", "user.image", "member.image"], ""),
            },
            trainer: {
                id: pick(raw, ["trainerId", "teacherId", "trainer.id", "course.trainerId"], 0),
                name: row.guru,
                email: pick<string>(raw, ["trainerEmail", "trainer.email"], ""),
                username: pick<string>(raw, ["trainerUsername", "trainer.username", "trainer.userName"], row.guruUsername),
                avatar: pick<string>(raw, ["trainerAvatar", "trainer.avatar", "trainer.userImage", "trainerImage"], ""),
                rating: toNumber(pick(raw, ["trainer.rating", "trainer.averageRating", "course.averageRating"], 0), 0),
                totalStudents: toNumber(pick(raw, ["trainer.totalStudents", "course.totalStudents"], 0), 0),
                specialization: pick<string>(raw, ["trainer.specialization", "course.categoryName", "course.title"], "Pengajar Al-Qur'an"),
                location: pick<string>(raw, ["trainer.location", "trainer.city"], "-"),
                yearsExperience: toNumber(pick(raw, ["trainer.yearsExperience", "trainer.experienceYears"], 0), 0),
                subjects: pick<string[]>(raw, ["trainer.subjects", "trainer.expertise", "course.tags"], []),
            },
            payment: {
                invoiceNo: pick<string>(raw, ["invoiceNo", "invoiceNumber", "payment.invoiceNo"], `INV-${row.id}`),
                receiptRef: pick<string>(raw, ["receiptRef", "payment.reference", "payment.receiptRef"], "-"),
                method: row.payment,
                status: String(paymentStatus).toLowerCase() === "pending" || row.status === "baru" ? "pending" : "paid",
                paidAt: pick<string | null>(raw, ["paidAt", "payment.paidAt"], null),
                pricePackage,
                serviceFee,
                tax,
                total: toNumber(pick(raw, ["total", "totalPayment", "totalAmount", "payment.total"], pricePackage + tax + serviceFee), pricePackage + tax + serviceFee),
            },
            sessions,
        },
    }
}

export async function fetchAdminBookings(params?: {
    page?: number
    pageSize?: number
    dateFrom?: Date
    dateTo?: Date
    keyword?: string
    status?: number
    trainerId?: number
    userId?: number
}) {
    if (!getClientToken()) return []

    const query = new URLSearchParams()
    query.set("Page", String(params?.page ?? 1))
    query.set("PageSize", String(params?.pageSize ?? 100))
    if (params?.dateFrom) query.set("DateFrom", params.dateFrom.toISOString())
    if (params?.dateTo) query.set("DateTo", params.dateTo.toISOString())
    if (params?.keyword) query.set("Keyword", params.keyword)
    if (params?.status !== undefined && params.status >= 0) query.set("Status", String(params.status))
    if (params?.trainerId) query.set("TrainerId", String(params.trainerId))
    if (params?.userId) query.set("UserId", String(params.userId))

    try {
        const payload = await apiJson(`/api/v1/Bookings/search?${query.toString()}`)
        return unwrapList(payload).map(apiBookingToPipeline)
    } catch (err: any) {
        if (err.message && err.message.includes("401")) {
            return [] // Fail gracefully on 401 Unauthorized
        }
        throw err
    }
}

export async function fetchBookingById(id: string | number) {
    try {
        const payload = await apiJson(`/api/v1/Bookings/${id}`)
        if (!payload) return null
        return apiBookingToDetail(payload)
    } catch (err: any) {
        // 404 = ID tidak ada di server, 401 = belum login → kembalikan null agar UI pakai data dummy
        if (err?.message && /40[14]/.test(err.message)) return null
        throw err
    }
}

export async function fetchBookingByCode(code: string) {
    try {
        const payload = await apiJson(`/api/v1/Bookings/code/${encodeURIComponent(code)}`)
        if (!payload) return null
        return apiBookingToDetail(payload)
    } catch (err: any) {
        // 404 = kode tidak ditemukan, 401 = belum login → kembalikan null
        if (err?.message && /40[14]/.test(err.message)) return null
        throw err
    }
}

export async function fetchBookingAuditTrail(id: string | number) {
    try {
        const payload = await apiJson(`/api/v1/Bookings/${id}/audit-trail`)
        return unwrapList(payload)
    } catch (err: any) {
        if (err?.message && /40[14]/.test(err.message)) return []
        throw err
    }
}


export async function bulkUpdateBookingStatus(bookingIds: Array<string | number>, status: BillingPipelineStatus) {
    return apiJson("/api/v1/Bookings/bulk/status", {
        method: "POST",
        body: JSON.stringify({
            bookingIds: bookingIds.map(id => Number(id)).filter(Number.isFinite),
            status: apiStatusValue(status),
        }),
    })
}
