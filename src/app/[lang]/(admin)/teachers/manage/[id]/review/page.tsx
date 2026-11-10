"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { useLocalizedRouter as useRouter } from "@/hooks/use-localized-router"
import { LocalizedLink as Link } from "@/components/ui/localized-link"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ArrowLeft, MapPin, BookOpen, CheckCircle2, XCircle,
    AlertTriangle, ShieldCheck, User, BadgeCheck, X,
    ExternalLink, Loader2, PlayCircle, LinkIcon, Coins,
    Award, Video, Monitor, MapPinned,
    GraduationCap, Tag, Calendar, Clock, Search, ChevronDown, Mail, Star, Send, Info
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import pendingDummies from "@/data/pending-trainers-list.json"
import seleksiTeam from "@/data/seleksi-team.json"
import { CATEGORY_LIST } from "@/data/categories-data"

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? null
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TrainerStatus = "verified" | "pending" | "suspended" | "rejected" | "seleksi"

type Certification = {
    name: string
    issuer: string
    credentialId?: string
    issuedDate: string
    expiryDate: string
    url: string
}

type TrainerDetail = {
    id: number
    userId: number
    userName: string
    username: string
    email: string
    headline: string | null
    bio: string | null
    location: string | null
    experienceYears: number
    expertise: string[]
    categoryIds: number[]
    isOnline: boolean
    isOffline: boolean
    hourlyRate: number
    currency: string
    status: TrainerStatus
    createdAt: string
    portfolioUrls: string[]
    certifications: Certification[]
    rejectionReason?: string | null
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<TrainerStatus, { label: string; badge: string; dot: string }> = {
    verified: { label: "Terverifikasi", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
    pending: { label: "Menunggu Verifikasi", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
    suspended: { label: "Nonaktif", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
    rejected: { label: "Ditolak", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", dot: "bg-rose-500" },
    seleksi: { label: "Seleksi", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
}

// ── Penguji Dropdown ──────────────────────────────────────────────────────────
type PengujiItem = {
    id: number; username: string; name: string; role: string; email: string;
    zoomLink: string; skills: string[]; avatar: string;
    totalSeleksi: number; rating: number;
}

function PengujiDropdown({
    value, onSelect
}: {
    value: PengujiItem | null
    onSelect: (p: PengujiItem) => void
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const ref = useRef<HTMLDivElement>(null)

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return (seleksiTeam as PengujiItem[]).filter(p =>
            !q || p.name.toLowerCase().includes(q) || p.skills.join(", ").toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
        )
    }, [search])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border rounded-lg transition-all
                    ${value
                        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400"
                    } focus:ring-2 focus:ring-emerald-500 outline-none`}>
                {value ? (
                    <span className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {value.avatar}
                        </span>
                        <span className="font-semibold truncate">{value.name}</span>
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Pilih tim penyeleksi...</span>
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Cari nama atau spesialisasi..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        {filtered.length === 0 ? (
                            <div className="py-6 text-center text-xs text-gray-400">Tidak ada penyeleksi ditemukan</div>
                        ) : filtered.map(p => (
                            <button key={p.id} type="button"
                                onClick={() => { onSelect(p); setOpen(false); setSearch("") }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left
                                    ${value?.id === p.id ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {p.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.skills.join(", ")}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="flex items-center gap-0.5 text-amber-500">
                                        <Star className="w-3 h-3 fill-amber-400" />
                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{p.rating}</span>
                                    </div>
                                </div>
                                {value?.id === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

const NON_QURANI_PATTERN = /biologi|kimia|fisika|matematika|bahasa inggris|bahasa indonesia|sejarah|ekonomi|akuntansi|komputer|programming|koding/i

function normalizeExpertise(raw: any): string[] {
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : (typeof raw === "string" ? raw.split(",").map((s: string) => s.trim()) : [])
    const filtered = arr.filter((e: string) => !NON_QURANI_PATTERN.test(e))
    return filtered.length > 0 ? filtered : arr
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0] ?? "")
        .join("")
        .toUpperCase()
}

function formatDate(d?: string): string {
    if (!d) return "—"
    try { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) }
    catch { return d }
}

function formatCurrency(amount: number, currency = "IDR"): string {
    try {
        return new Intl.NumberFormat("id-ID", {
            style: "currency", currency,
            minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(amount)
    } catch { return `${currency} ${amount.toLocaleString()}` }
}

function extractYoutubeId(url: string): string | null {
    if (!url) return null
    const m =
        url.match(/youtube\.com\/watch\?v=([^&]+)/) ??
        url.match(/youtu\.be\/([^?]+)/) ??
        url.match(/youtube\.com\/embed\/([^?]+)/)
    return m?.[1] ?? null
}

function isVideoUrl(url: string): boolean {
    return /youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm|\.mov/i.test(url)
}

function getCategoryName(id: number): string {
    return CATEGORY_LIST.find((c) => c.id === id)?.name ?? `Kategori #${id}`
}

// ── Section Card wrapper ──────────────────────────────────────────────────────
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    {icon}
                </div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    )
}

// ── Field row ─────────────────────────────────────────────────────────────────
function FieldRow({ label, value, empty }: { label: string; value?: string | null; empty?: string }) {
    return (
        <div>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-sm ${value ? "text-gray-800 dark:text-gray-100" : "text-gray-300 dark:text-gray-600 italic"}`}>
                {value || empty || "—"}
            </p>
        </div>
    )
}

// ── GuruDetailContent ─────────────────────────────────────────────────────────
function GuruDetailContent() {
    const params = useParams()
    const id = params?.id as string
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [detail, setDetail] = useState<TrainerDetail | null>(null)
    const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null)
    const [certLoading, setCertLoading] = useState<string | null>(null)
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState("")

    // ── Seleksi Modal State ────────────────────────────────────────────────────
    const [seleksiModalOpen, setSeleksiModalOpen] = useState(false)
    const [sDate, setSDate] = useState("")
    const [sTimeStart, setSTimeStart] = useState("")
    const [sTimeEnd, setSTimeEnd] = useState("")
    const [sMethod, setSMethod] = useState<"online" | "offline">("online")
    const [sLink, setSLink] = useState("")
    const [sPengujiObj, setSPengujiObj] = useState<PengujiItem | null>(null)
    const [sNotes, setSNotes] = useState("")
    const [isSendingEmail, setIsSendingEmail] = useState(false)
    const [emailPreview, setEmailPreview] = useState<{ open: boolean; data: any | null }>({ open: false, data: null })

    // Close modals on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setRejectModalOpen(false)
                setSeleksiModalOpen(false)
                setEmailPreview({ open: false, data: null })
            }
        }
        window.addEventListener("keydown", handleEsc)
        return () => window.removeEventListener("keydown", handleEsc)
    }, [])

    // ── Fetch detail ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return
        const token = getClientToken()
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }

        setLoading(true)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 500)

        fetch(`${API_BASE_URL}/api/v1/Trainers/${id}`, { headers, signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then((json) => {
                const d = json?.data ?? json
                let s = String(d.status ?? "pending").toLowerCase()
                let rr = d.rejectionReason ?? null
                try {
                    const stored = sessionStorage.getItem("pengajuanGuruStatuses")
                    if (stored) {
                        const parsed = JSON.parse(stored)
                        if (parsed[d.id]) {
                            const st = parsed[d.id]
                            if (st === "seleksi" || st === "ditolak" || st === "diterima") s = st
                        }
                    }
                    const storedReasons = sessionStorage.getItem("pengajuanGuruRejectReasons")
                    if (storedReasons) {
                        const parsed = JSON.parse(storedReasons)
                        if (parsed[d.id]) rr = parsed[d.id]
                    }
                } catch { }

                const validStatus: TrainerStatus =
                    s === "active" || s === "verified" || s === "diterima" ? "verified"
                        : s === "suspended" ? "suspended"
                            : s === "rejected" || s === "ditolak" ? "rejected"
                                : s === "seleksi" ? "seleksi"
                                    : "pending"

                setDetail({
                    id: d.id,
                    userId: d.userId ?? d.id,
                    userName: d.userName ?? d.name ?? `Guru #${id}`,
                    username: d.username ?? d.userUsername ?? "",
                    email: d.email ?? d.userEmail ?? "",
                    headline: d.headline ?? null,
                    bio: d.bio ?? null,
                    location: d.location ?? null,
                    experienceYears: d.experienceYears ?? 0,
                    expertise: normalizeExpertise(d.expertise ?? d.subjects ?? []),
                    categoryIds: Array.isArray(d.categoryIds) ? d.categoryIds : [],
                    isOnline: Boolean(d.isOnline),
                    isOffline: Boolean(d.isOffline),
                    hourlyRate: d.hourlyRate ?? d.rate ?? 0,
                    currency: d.currency ?? "IDR",
                    status: validStatus,
                    createdAt: d.createdAt ?? new Date().toISOString(),
                    portfolioUrls: Array.isArray(d.portfolioUrls) ? d.portfolioUrls : [],
                    certifications: Array.isArray(d.certifications) ? d.certifications : [],
                    rejectionReason: rr,
                })
            })
            .catch(() => {
                // Fallback to dummy data
                const dummy = pendingDummies.find(d => String(d.id) === String(id))
                if (dummy) {
                    let ds = "pending"
                    try {
                        const stored = sessionStorage.getItem("pengajuanGuruStatuses")
                        if (stored) {
                            const parsed = JSON.parse(stored)
                            if (parsed[dummy.id]) {
                                const st = parsed[dummy.id]
                                if (st === "seleksi" || st === "ditolak" || st === "diterima") ds = st
                            }
                        }
                    } catch { }

                    const dummyStatus = ds === "diterima" ? "verified" : ds === "ditolak" ? "rejected" : ds === "seleksi" ? "seleksi" : "pending"

                    let rr = (dummy as any).rejectionReason ?? null
                    try {
                        const storedReasons = sessionStorage.getItem("pengajuanGuruRejectReasons")
                        if (storedReasons) {
                            const parsed = JSON.parse(storedReasons)
                            if (parsed[dummy.id]) rr = parsed[dummy.id]
                        }
                    } catch { }

                    setDetail({
                        id: Number(dummy.id),
                        userId: Number(dummy.userId),
                        userName: dummy.userName,
                        username: dummy.username,
                        email: dummy.email,
                        headline: dummy.headline,
                        bio: dummy.bio,
                        location: dummy.location,
                        experienceYears: dummy.experienceYears,
                        expertise: dummy.expertise,
                        categoryIds: dummy.categoryIds ?? [],
                        isOnline: !!dummy.isOnline,
                        isOffline: !!dummy.isOffline,
                        hourlyRate: dummy.hourlyRate,
                        currency: dummy.currency,
                        status: dummyStatus as TrainerStatus,
                        createdAt: dummy.createdAt,
                        portfolioUrls: dummy.portfolioUrls,
                        certifications: dummy.certifications as Certification[],
                        rejectionReason: rr,
                    })
                }
            })
            .finally(() => {
                clearTimeout(timeoutId)
                setLoading(false)
            })

        // Reset data dummy ke pending jika user melakukan hard refresh (F5)
        const handleBeforeUnload = () => {
            sessionStorage.removeItem("guruStatuses")
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            clearTimeout(timeoutId)
        }
    }, [id])

    // ── Derived ───────────────────────────────────────────────────────────────
    const videoUrls = useMemo(() => detail?.portfolioUrls.filter(isVideoUrl) ?? [], [detail])

    const allRequiredOk = useMemo(() => {
        if (!detail) return false
        return Boolean(detail.userName && detail.location) &&
            (detail.expertise.length > 0 || Boolean(detail.bio)) &&
            detail.certifications.length > 0 &&
            detail.portfolioUrls.length > 0
    }, [detail])

    // ── Actions ───────────────────────────────────────────────────────────────
    async function runReject() {
        if (!detail || actionLoading) return
        const token = getClientToken()
        const endpoint = `${API_BASE_URL}/api/v1/Trainers/${detail.id}/review`

        setActionLoading("reject")
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    approve: 0,
                    rejectionReason: rejectReason || "Ditolak oleh admin",
                }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
        } catch { /* fallback mock */ } finally {
            showToast({
                type: "info",
                title: "Pendaftaran guru ditolak",
                message: detail.userName,
                endpoint: `POST /api/v1/Trainers/${detail.id}/review`,
            })
            setDetail((prev) => prev ? { ...prev, status: "rejected", rejectionReason: rejectReason || "Ditolak oleh admin" } : null)
            setActionLoading(null)
            try {
                const stored = sessionStorage.getItem("pengajuanGuruStatuses")
                const statuses = stored ? JSON.parse(stored) : {}
                statuses[detail.id] = "ditolak"
                sessionStorage.setItem("pengajuanGuruStatuses", JSON.stringify(statuses))

                const storedReasons = sessionStorage.getItem("pengajuanGuruRejectReasons")
                const reasons = storedReasons ? JSON.parse(storedReasons) : {}
                reasons[detail.id] = rejectReason || "Ditolak oleh admin"
                sessionStorage.setItem("pengajuanGuruRejectReasons", JSON.stringify(reasons))
            } catch { }
            setTimeout(() => { router.push("/teachers/applications") }, 1200)
        }
    }

    async function handleSubmitSeleksi(e: React.FormEvent) {
        e.preventDefault()
        if (!detail) return
        if (!sPengujiObj) {
            showToast({ type: "error", title: "Pilih Tim Penyeleksi", message: "Harap pilih penguji dari dropdown." })
            return
        }
        const token = getClientToken()
        // Removed premature review approve. The trainer will remain in the pending list
        // and their status will be mapped to 'seleksi' via sessionStorage.
        // 2. Save seleksi data
        const selData = {
            id: `session-${detail.id}`,
            trainerId: detail.id,
            trainerName: detail.userName,
            trainerEmail: detail.email,
            pengujiId: sPengujiObj.id,
            pengujiName: sPengujiObj.name,
            pengujiSpecialty: sPengujiObj.skills.join(", "),
            date: sDate,
            time: sTimeStart,
            timeEnd: sTimeEnd,
            method: sMethod,
            link: sLink,
            notes: sNotes,
            status: "scheduled" as const,
            trainerResponse: null
        }
        try {
            const stored = sessionStorage.getItem("pengajuanGuruSeleksi")
            const selAll = stored ? JSON.parse(stored) : {}
            selAll[detail.id] = selData
            sessionStorage.setItem("pengajuanGuruSeleksi", JSON.stringify(selAll))
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("sessionStorageChanged"))
            }
        } catch { }
        // 3. Update status in pengajuan list
        try {
            const stored = sessionStorage.getItem("pengajuanGuruStatuses")
            const statuses = stored ? JSON.parse(stored) : {}
            statuses[detail.id] = "seleksi"
            sessionStorage.setItem("pengajuanGuruStatuses", JSON.stringify(statuses))
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("sessionStorageChanged"))
            }
        } catch { }

        setSeleksiModalOpen(false)
        // Show email preview
        setEmailPreview({
            open: true,
            data: {
                ...selData,
                trainerName: detail.userName,
                trainerEmail: detail.email,
                trainerId: detail.id,
            }
        })
    }

    async function handleSendEmail() {
        if (!emailPreview.data || !detail) return
        setIsSendingEmail(true)
        try {
            const res = await fetch("/api/send-selection-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trainerName: emailPreview.data.trainerName,
                    trainerEmail: emailPreview.data.trainerEmail,
                    date: emailPreview.data.date,
                    time: emailPreview.data.time,
                    timeEnd: emailPreview.data.timeEnd,
                    duration: emailPreview.data.duration || "-",
                    method: emailPreview.data.method,
                    link: emailPreview.data.link,
                    pengujiName: emailPreview.data.pengujiName,
                    pengujiSpecialty: emailPreview.data.pengujiSpecialty,
                    notes: emailPreview.data.notes,
                    trainerId: emailPreview.data.trainerId,
                }),
            })
            const result = await res.json()
            if (result.success) {
                setDetail((prev) => prev ? { ...prev, status: "seleksi" } : null)
                showToast({
                    type: "success",
                    title: result.mock ? "Jadwal Tersimpan (Email Disimulasi)" : "📧 Email Terkirim!",
                    message: result.mock
                        ? `Data tersimpan. Email ke ${emailPreview.data.trainerEmail} akan aktif setelah Gmail dikonfigurasi.`
                        : `Email undangan seleksi dikirim ke ${result.recipient}.`,
                    endpoint: `POST /api/send-selection-email`,
                })
            } else {
                showToast({ type: "error", title: "Gagal Kirim Email", message: result.error || "Terjadi kesalahan." })
            }
        } catch {
            showToast({ type: "error", title: "Gagal Kirim Email", message: "Network error." })
        } finally {
            setIsSendingEmail(false)
            setEmailPreview({ open: false, data: null })
            setTimeout(() => { router.push("/teachers/applications") }, 1200)
        }
    }

    function handleEditUlang() {
        setEmailPreview({ open: false, data: null })
        setSeleksiModalOpen(true)
    }

    async function handleVerifyCredential(cert: Certification) {
        if (!detail || certLoading) return
        const token = getClientToken()
        const endpoint = `${API_BASE_URL}/api/v1/Trainers/${detail.id}/verify-credential`
        setCertLoading(cert.url || cert.name)
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    credentialType: "Certification",
                    credentialName: cert.name,
                    issuingOrganization: cert.issuer,
                    issueDate: cert.issuedDate,
                    expiryDate: cert.expiryDate || null,
                    documentUrl: cert.url || "",
                    isVerified: 1,
                    notes: "Diverifikasi oleh Admin",
                }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
        } catch { /* mock ok */ } finally {
            showToast({
                type: "success",
                title: "Dokumen Diverifikasi",
                message: cert.name,
                endpoint: `POST /api/v1/Trainers/${detail.id}/verify-credential`,
            })
            setCertLoading(null)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-4">
            <ToastContainer />

            {/* Reject Modal */}
            {rejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-500" /> Tolak Pendaftaran Guru
                            </h3>
                            <button onClick={() => setRejectModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alasan Penolakan</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Tulis alasan mengapa guru ini ditolak..."
                                className="w-full h-28 p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50 dark:bg-gray-800 dark:text-white resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-1.5">Alasan ini akan dikirimkan ke email guru yang bersangkutan.</p>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                Batal
                            </button>
                            <button
                                onClick={() => { setRejectModalOpen(false); runReject() }}
                                disabled={!rejectReason.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                                Konfirmasi Penolakan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto space-y-4">
                {/* Header Nav */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/teachers/applications"
                            className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-emerald-600 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Review Pendaftar</h1>
                        </div>
                    </div>
                    {detail && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_CFG[detail.status]?.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[detail.status]?.dot}`} />
                            {STATUS_CFG[detail.status]?.label}
                        </span>
                    )}
                </div>

                {detail?.status === "rejected" && detail?.rejectionReason && (
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">Pendaftaran Ditolak</h3>
                            <p className="text-sm text-rose-700 dark:text-rose-400 mt-1">{detail.rejectionReason}</p>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 space-y-4 animate-pulse">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-24" /></div>
                        </div>
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-36" /></div>
                            ))}
                        </div>
                    </div>
                ) : !detail ? (
                    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 py-16 text-center text-gray-400">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Data guru tidak ditemukan</p>
                    </div>
                ) : (
                    <>
                        {/* ── Section 1: Profil & Headline ─────────────────────────────── */}
                        <SectionCard icon={<User className="w-4 h-4" />} title="Profil & Headline">
                            {/* Avatar Inisial + Nama */}
                            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold shadow-sm flex-shrink-0">
                                    {getInitials(detail.userName)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">{detail.userName}</p>
                                    {detail.username && (
                                        <p className="text-sm text-gray-400 dark:text-gray-500">@{detail.username}</p>
                                    )}
                                    {detail.email && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">{detail.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <FieldRow label="Headline / Tagline Profil" value={detail.headline} empty="Belum diisi" />
                                <FieldRow label="Biografi Singkat" value={detail.bio} empty="Belum diisi" />
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <FieldRow label="Lokasi / Kota Domisili" value={detail.location} empty="Belum diisi" />
                                    </div>
                                    {detail.location && (
                                        <MapPin className="w-4 h-4 text-rose-400 mt-5 flex-shrink-0" />
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                    Terdaftar: {formatDate(detail.createdAt)}
                                </p>
                            </div>
                        </SectionCard>

                        {/* ── Section 2: Keahlian & Kategori ──────────────────────────── */}
                        <SectionCard icon={<BookOpen className="w-4 h-4" />} title="Keahlian & Kategori">
                            <div className="space-y-4">
                                {/* Expertise chips */}
                                <div>
                                    <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                                        Keahlian / Metode yang Dikuasai
                                    </p>
                                    {detail.expertise.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {detail.expertise.map((e) => (
                                                <span
                                                    key={e}
                                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40"
                                                >
                                                    {e}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-300 dark:text-gray-600 italic">Belum ada keahlian yang dipilih</p>
                                    )}
                                </div>

                                {/* Kategori */}
                                <div>
                                    <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                                        Kategori
                                    </p>
                                    {detail.categoryIds.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {detail.categoryIds.map((cid) => (
                                                <span
                                                    key={cid}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800/40"
                                                >
                                                    <Tag className="w-3 h-3" />
                                                    {getCategoryName(cid)}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-300 dark:text-gray-600 italic">Belum ada kategori yang dipilih</p>
                                    )}
                                </div>
                            </div>
                        </SectionCard>

                        {/* ── Section 3: Tarif & Ketersediaan ─────────────────────────── */}
                        <SectionCard icon={<Coins className="w-4 h-4" />} title="Tarif & Ketersediaan">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-800/40">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tarif per Jam</p>
                                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(detail.hourlyRate, detail.currency)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-800/40">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pengalaman Mengajar</p>
                                        <p className="text-base font-bold text-gray-800 dark:text-white">
                                            {detail.experienceYears} Tahun
                                        </p>
                                    </div>
                                </div>

                                {/* Mode Mengajar */}
                                <div>
                                    <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                                        Mode Mengajar
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Online Card */}
                                        <div className={`rounded-xl border-2 p-3.5 transition-colors ${detail.isOnline
                                                ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-900/15 dark:border-emerald-700"
                                                : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30 opacity-50"
                                            }`}>
                                            <div className="flex items-start gap-2">
                                                <div className={`w-4 h-4 mt-0.5 flex-shrink-0 border flex items-center justify-center rounded ${detail.isOnline
                                                        ? "border-emerald-500 bg-emerald-500"
                                                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                                    }`}>
                                                    {detail.isOnline && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Monitor className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                        <p className="text-xs font-bold text-gray-800 dark:text-white">Online</p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">Via Zoom, Google Meet, dll</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Offline Card */}
                                        <div className={`rounded-xl border-2 p-3.5 transition-colors ${detail.isOffline
                                                ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-900/15 dark:border-emerald-700"
                                                : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30 opacity-50"
                                            }`}>
                                            <div className="flex items-start gap-2">
                                                <div className={`w-4 h-4 mt-0.5 flex-shrink-0 border flex items-center justify-center rounded ${detail.isOffline
                                                        ? "border-emerald-500 bg-emerald-500"
                                                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                                    }`}>
                                                    {detail.isOffline && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPinned className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                        <p className="text-xs font-bold text-gray-800 dark:text-white">Offline / Tatap Muka</p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">Kunjungan ke rumah murid</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        {/* ── Section 4: Portfolio & Sertifikasi ──────────────────────── */}
                        <SectionCard icon={<Award className="w-4 h-4" />} title="Portfolio & Sertifikasi">
                            <div className="space-y-6">

                                {/* Video Portfolio */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                            <Video className="w-3.5 h-3.5" /> Video Portfolio
                                        </p>
                                        {videoUrls.length > 0 && (
                                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                {videoUrls.length} video ditambahkan
                                            </span>
                                        )}
                                    </div>

                                    {videoUrls.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-8 text-center">
                                            <PlayCircle className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada video portfolio</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {videoUrls.map((url, idx) => {
                                                const ytId = extractYoutubeId(url)
                                                const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null
                                                return (
                                                    <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/40">
                                                        <a href={url} target="_blank" rel="noreferrer" className="group block">
                                                            {/* Thumbnail */}
                                                            <div className="relative aspect-video bg-gray-900 overflow-hidden">
                                                                {thumb ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={thumb}
                                                                        alt={`Video portfolio ${idx + 1}`}
                                                                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <PlayCircle className="w-12 h-12 text-white/40" />
                                                                    </div>
                                                                )}
                                                                {/* Play overlay */}
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                                                        <PlayCircle className="w-8 h-8 text-white fill-white" />
                                                                    </div>
                                                                </div>
                                                                {/* YouTube badge */}
                                                                {ytId && (
                                                                    <div className="absolute bottom-2 right-2 bg-black/70 rounded px-2 py-0.5 text-[10px] text-white font-semibold flex items-center gap-1">
                                                                        Tonton di YouTube
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </a>
                                                        {/* URL row */}
                                                        <div className="flex items-center justify-between px-3 py-2.5">
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline break-all flex items-center gap-1 flex-1 min-w-0"
                                                            >
                                                                <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                                                <span className="truncate">{url}</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-100 dark:border-gray-800" />

                                {/* Sertifikasi */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                            <GraduationCap className="w-3.5 h-3.5" /> Sertifikasi / Syahadah
                                        </p>
                                        {detail.certifications.length > 0 && (
                                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                {detail.certifications.length} sertifikat
                                            </span>
                                        )}
                                    </div>

                                    {detail.certifications.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-8 text-center">
                                            <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada sertifikat yang ditambahkan</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {detail.certifications.map((cert, idx) => (
                                                <div
                                                    key={idx}
                                                    className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                                >
                                                    {/* Cert header */}
                                                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/60 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20">
                                                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                                            <GraduationCap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                        </div>
                                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                                            Sertifikat {idx + 1}
                                                        </p>
                                                    </div>

                                                    {/* Cert fields */}
                                                    <div className="p-4 space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <FieldRow label="Nama Sertifikat" value={cert.name} />
                                                            <FieldRow label="Penerbit" value={cert.issuer} />
                                                        </div>
                                                        {cert.credentialId && (
                                                            <FieldRow label="ID Kredensial" value={cert.credentialId} />
                                                        )}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <FieldRow label="Tanggal Terbit" value={formatDate(cert.issuedDate)} />
                                                            <FieldRow
                                                                label="Tanggal Kadaluarsa"
                                                                value={cert.expiryDate ? formatDate(cert.expiryDate) : undefined}
                                                                empty="Tidak ada"
                                                            />
                                                        </div>
                                                        {cert.url && (
                                                            <div>
                                                                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">URL Sertifikat</p>
                                                                <a
                                                                    href={cert.url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline break-all"
                                                                >
                                                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                                    {cert.url}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {/* Verify button */}
                                                        <button
                                                            onClick={() => handleVerifyCredential(cert)}
                                                            disabled={certLoading === (cert.url || cert.name)}
                                                            className="mt-1 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold transition-colors disabled:opacity-50"
                                                        >
                                                            {certLoading === (cert.url || cert.name)
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                : <ShieldCheck className="w-3.5 h-3.5" />
                                                            }
                                                            Tandai Dokumen Sah / Valid
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SectionCard>

                        {/* ── Verification Action Card ─────────────────────────────────── */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className={`px-5 py-4 border-b ${allRequiredOk
                                ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/15 dark:border-emerald-900/30"
                                : "bg-amber-50 border-amber-100 dark:bg-amber-900/15 dark:border-amber-900/30"
                                }`}>
                                <h3 className={`text-sm font-bold ${allRequiredOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                                    Keputusan Verifikasi
                                </h3>
                                {!allRequiredOk && (
                                    <p className="text-[11px] mt-0.5 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Beberapa data wajib belum dilengkapi oleh pendaftar
                                    </p>
                                )}
                            </div>

                            {/* Checklist ringkas */}
                            <div className="px-5 py-4 space-y-2">
                                {[
                                    { label: "Profil dasar (nama & lokasi)", ok: Boolean(detail.userName && detail.location) },
                                    { label: "Keahlian & metode mengajar", ok: detail.expertise.length > 0 },
                                    { label: "Sertifikat / ijazah", ok: detail.certifications.length > 0 },
                                    { label: "Video portfolio", ok: videoUrls.length > 0 },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-2">
                                        {item.ok
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            : <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                        }
                                        <span className={`text-sm ${item.ok ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Action buttons */}
                            {detail.status === "pending" && (
                                <div className="px-5 pb-5 flex gap-3">
                                    <button
                                        onClick={() => {
                                            // Terima → buka modal jadwal seleksi
                                            setSDate(""); setSTimeStart(""); setSTimeEnd(""); setSLink(""); setSPengujiObj(null); setSNotes("")
                                            setSMethod("online")
                                            setSeleksiModalOpen(true)
                                        }}
                                        disabled={!!actionLoading}
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-bold py-3 transition-colors shadow-sm"
                                    >
                                        {actionLoading === "approve"
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <BadgeCheck className="w-4 h-4" />
                                        }
                                        Terima & Jadwalkan Seleksi
                                    </button>
                                    <button
                                        onClick={() => setRejectModalOpen(true)}
                                        disabled={!!actionLoading}
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-sm font-bold py-3 transition-colors shadow-sm"
                                    >
                                        {actionLoading === "reject"
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <XCircle className="w-4 h-4" />
                                        }
                                        Tolak
                                    </button>
                                </div>
                            )}
                            {detail.status !== "pending" && (
                                <div className="px-5 pb-5">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Pendaftar ini sudah dalam status <span className="font-bold">{STATUS_CFG[detail.status]?.label}</span>.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Modal Jadwal Seleksi ───────────────────────────────────── */}
            {seleksiModalOpen && detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-t-2xl">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-emerald-500" /> Jadwal Wawancara Seleksi
                                </h2>
                            </div>
                            <button onClick={() => setSeleksiModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                            <form id="formSeleksi" onSubmit={handleSubmitSeleksi} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Tanggal Seleksi</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input required type="date" value={sDate} onChange={e => setSDate(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                                {/* Waktu Seleksi – range */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Waktu Seleksi</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="time" value={sTimeStart} onChange={e => setSTimeStart(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        </div>
                                        <span className="text-gray-400 font-bold flex-shrink-0 text-base">—</span>
                                        <div className="relative flex-1">
                                            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="time" value={sTimeEnd} onChange={e => setSTimeEnd(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        </div>
                                    </div>
                                    {sTimeStart && sTimeEnd && (() => {
                                        const [h1, m1] = sTimeStart.split(":").map(Number)
                                        const [h2, m2] = sTimeEnd.split(":").map(Number)
                                        const total = (h2 * 60 + m2) - (h1 * 60 + m1)
                                        if (total <= 0) return null
                                        const hrs = Math.floor(total / 60); const mins = total % 60
                                        const label = hrs > 0 ? `${hrs} jam${mins > 0 ? ` ${mins} menit` : ""}` : `${mins} menit`
                                        return <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Durasi: {label}</p>
                                    })()}
                                </div>
                                {/* Penguji - dipindah setelah Waktu Seleksi */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Penguji / Tim Penyeleksi</label>
                                    <PengujiDropdown value={sPengujiObj} onSelect={(p) => {
                                        setSPengujiObj(p);
                                        if (sMethod === "online") setSLink(p.zoomLink);
                                    }} />
                                    {sPengujiObj && (
                                        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                            <Mail className="w-3 h-3" />
                                            <span>{sPengujiObj.email}</span>
                                            <span>&middot;</span>
                                            <span>{sPengujiObj.skills.join(", ")}</span>
                                        </div>
                                    )}
                                </div>
                                {/* Metode - dipindah setelah Penguji */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Metode</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => {
                                            setSMethod("online");
                                            if (sPengujiObj) setSLink(sPengujiObj.zoomLink);
                                        }}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${sMethod === "online" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>
                                            <Video className="w-4 h-4" /> Online
                                        </button>
                                        <button type="button" onClick={() => {
                                            setSMethod("offline");
                                            setSLink("");
                                        }}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${sMethod === "offline" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>
                                            <MapPin className="w-4 h-4" /> Offline
                                        </button>
                                    </div>
                                </div>
                                {sMethod === "online" ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Link Pertemuan (Zoom / Google Meet)</label>
                                        <div className="relative">
                                            <Video className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="url" value={sLink} onChange={e => setSLink(e.target.value)} placeholder="https://zoom.us/j/..."
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Lokasi / Alamat Pertemuan</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="text" value={sLink} onChange={e => setSLink(e.target.value)}
                                                placeholder={detail.location || "Jl. Contoh No. 1..."}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1">Lokasi pendaftar: <span className="font-semibold">{detail.location || "-"}</span></p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Catatan Tambahan</label>
                                    <textarea value={sNotes} onChange={e => setSNotes(e.target.value)} rows={3}
                                        placeholder="Persiapkan hafalan surah pendek..."
                                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                                </div>
                            </form>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={() => setSeleksiModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors">Batal</button>
                            <button type="submit" form="formSeleksi" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2">
                                <Send className="w-4 h-4" /> Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal: Preview Email Konfirmasi ───────────────────────── */}
            {emailPreview.open && emailPreview.data && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Konfirmasi Kirim Email</h2>
                                    <p className="text-[11px] text-gray-500">Notifikasi ke calon guru</p>
                                </div>
                            </div>
                            <button onClick={() => setEmailPreview({ open: false, data: null })} className="text-gray-400 hover:text-gray-600 p-1">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ringkasan Email yang Akan Dikirim</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-start gap-2">
                                        <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Penerima</span>
                                            <span className="font-semibold text-gray-800 dark:text-white">{emailPreview.data.trainerName}</span>
                                            <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">({emailPreview.data.trainerEmail})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Jadwal</span>
                                            <span className="font-semibold text-gray-800 dark:text-white">
                                                {emailPreview.data.date} · {emailPreview.data.time}
                                                {emailPreview.data.duration && <span className="text-gray-500 ml-1">({emailPreview.data.duration})</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        {emailPreview.data.method === "online"
                                            ? <Video className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                            : <MapPin className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                                        }
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Metode & Link</span>
                                            <span className="font-semibold text-gray-800 dark:text-white capitalize">{emailPreview.data.method}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 ml-1 text-xs break-all">{emailPreview.data.link}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Star className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Penguji</span>
                                            <span className="font-semibold text-gray-800 dark:text-white">{emailPreview.data.pengujiName}</span>
                                            <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">({emailPreview.data.pengujiSpecialty})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                                    Email akan berisi tombol <strong>Konfirmasi Hadir</strong> dan <strong>Minta Reschedule</strong> untuk calon guru.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={handleEditUlang}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors">
                                Edit
                            </button>
                            <button onClick={handleSendEmail} disabled={isSendingEmail}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors disabled:opacity-60">
                                {isSendingEmail
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                                    : <><Send className="w-4 h-4" /> Kirim Email</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function GuruReviewPage() {
    return (
                <GuruDetailContent />
    )
}
