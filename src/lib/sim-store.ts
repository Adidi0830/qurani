// ── Simulation Store — localStorage helper ────────────────────────────────────
// Semua data simulasi disimpan di localStorage, TIDAK mengubah JSON asli.

export interface SimMember {
    id: number
    name: string
    email: string
    phone: string
    location: string
    joinDate: string
}

export interface SimTrainer {
    id: number
    name: string
    email: string
    avatar: string
    rating: number
    totalStudents: number
    specialization: string
}

export interface SimPackage {
    key: "1x" | "5x" | "10x"
    name: string
    sessions: number
    price: number
    serviceFee: number
}

export interface SimSession {
    sessionNo: number          // 1, 2, 3, ...
    date: string               // ISO date
    startTime: string          // "08:00"
    endTime: string            // "09:00"
    status: "scheduled" | "completed" | "cancelled"
    notes: string
}

export interface SimOrder {
    id: number
    member: SimMember
    trainer: SimTrainer
    pkg: SimPackage
    mode: "online"
    paymentGateway: string       // "GoPay" | "QRIS" | "OVO" | ""
    paymentMethod: string        // metode mengajar (Ummi, dll)
    status: "pending" | "active" | "completed" | "cancelled"
    paymentStatus: "pending" | "paid"
    bookingDate: string
    paidAt: string | null
    invoiceNo: string
    completedSessions: number
    totalSessions: number
    sessions: SimSession[]      // kosong saat pending, terisi saat paid
}

export interface SimNotif {
    id: string
    type: "new_order" | "payment_success" | "order_cancelled" | "static_cancelled" | "guru_approved"
    message: string
    subMessage: string
    isRead: boolean
    createdAt: string
    orderId: number
}

const ORDERS_KEY = "qurani_sim_orders"
const NOTIFS_KEY = "qurani_sim_notifs"
const COUNTER_KEY = "qurani_sim_counter"

// ── Orders ────────────────────────────────────────────────────────────────────
export function getSimOrders(): SimOrder[] {
    if (typeof window === "undefined") return []
    try {
        return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]")
    } catch { return [] }
}

export function saveSimOrder(order: SimOrder): void {
    const orders = getSimOrders().filter(o => o.id !== order.id)
    if (!order.sessions) order.sessions = [] // pastikan field ada
    orders.unshift(order) // paling atas
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

export function getSimOrderById(id: number): SimOrder | null {
    return getSimOrders().find(o => o.id === id) ?? null
}

// Generate jadwal sesi mingguan mulai dari bookingDate
function generateSessions(totalSessions: number, bookingDate: string): SimSession[] {
    const TIMES = ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00", "19:00", "20:00"]
    const startTime = TIMES[Math.floor(Math.random() * TIMES.length)]
    const [h, m] = startTime.split(":").map(Number)
    const endTime = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`

    const sessions: SimSession[] = []
    const base = new Date(bookingDate)
    for (let i = 0; i < totalSessions; i++) {
        const d = new Date(base)
        d.setDate(base.getDate() + i * 7) // setiap minggu
        sessions.push({
            sessionNo: i + 1,
            date: d.toISOString(),
            startTime,
            endTime,
            status: "scheduled",
            notes: "",
        })
    }
    return sessions
}

export function cancelSimOrder(id: number): void {
    const orders = getSimOrders()
    const idx = orders.findIndex(o => o.id === id)
    if (idx !== -1) {
        orders[idx].status = "cancelled"
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
    }
}

export function updateSimOrderPayment(id: number, gateway: string): void {
    const orders = getSimOrders()
    const idx = orders.findIndex(o => o.id === id)
    if (idx !== -1) {
        orders[idx].paymentGateway = gateway
        orders[idx].paymentStatus = "paid"
        orders[idx].status = "active"
        orders[idx].paidAt = new Date().toISOString()
        // Auto-generate jadwal sesi setelah bayar
        orders[idx].sessions = generateSessions(
            orders[idx].totalSessions,
            orders[idx].bookingDate
        )
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
    }
}

export function clearSimOrders(): void {
    localStorage.removeItem(ORDERS_KEY)
    localStorage.removeItem(NOTIFS_KEY)
    localStorage.removeItem(COUNTER_KEY)
}

// ── Auto-increment ID (mulai 9001) ────────────────────────────────────────────
export function nextSimId(): number {
    const cur = parseInt(localStorage.getItem(COUNTER_KEY) || "9000")
    const next = cur + 1
    localStorage.setItem(COUNTER_KEY, String(next))
    return next
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function getSimNotifs(): SimNotif[] {
    if (typeof window === "undefined") return []
    try {
        return JSON.parse(localStorage.getItem(NOTIFS_KEY) || "[]")
    } catch { return [] }
}

export function addSimNotif(notif: Omit<SimNotif, "id" | "createdAt">): void {
    const notifs = getSimNotifs()
    notifs.unshift({
        ...notif,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
    })
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs))

    // Broadcast ke komponen lain yang listen
    window.dispatchEvent(new CustomEvent("sim-notif-update"))
}

export function markSimNotifsRead(): void {
    const notifs = getSimNotifs().map(n => ({ ...n, isRead: true }))
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs))
    window.dispatchEvent(new CustomEvent("sim-notif-update"))
}

export function unreadSimNotifCount(): number {
    return getSimNotifs().filter(n => !n.isRead).length
}
