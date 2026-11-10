"use client"

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
    Search, ChevronLeft, ChevronRight, Users,
    Eye, ClipboardList, XCircle, CheckCircle2,
    Calendar, Clock, Video, MapPin, Sparkles, AlertTriangle, RefreshCw, Info, Loader2,
    ChevronDown, Mail, User, Star, Send, ImageIcon, UploadCloud
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import pendingDummies from "@/data/pending-trainers-list.json"
import seleksiTeam from "@/data/seleksi-team.json"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDistanceToNowStrict } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { resolveUserTimezone } from "@/lib/date-utils"

// ---------- Status Types ----------
type PengajuanStatus = "pending" | "seleksi" | "diterima" | "ditolak" | "batal"
type FilterStatus = PengajuanStatus | "all"

const STATUS_CFG: Record<PengajuanStatus, { label: string; bg: string; text: string; dot: string }> = {
    pending: { label: "Menunggu", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    seleksi: { label: "Seleksi", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
    diterima: { label: "Diterima", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    ditolak: { label: "Ditolak", bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500" },
    batal: { label: "Batal", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-500 dark:text-gray-400", dot: "bg-gray-400" },
}

// ---------- Session keys ----------
const SELEKSI_KEY = "pengajuanGuruSeleksi"
const PENILAIAN_KEY = "pengajuanGuruPenilaian"
const STATUS_KEY = "pengajuanGuruStatuses"
const RESCHEDULE_KEY = "pengajuanGuruReschedule"

function getSession<T>(key: string): T | null {
    try {
        const s = sessionStorage.getItem(key)
        return s ? JSON.parse(s) : null
    } catch { return null }
}
function setSession(key: string, val: unknown) {
    try {
        sessionStorage.setItem(key, JSON.stringify(val))
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("sessionStorageChanged"))
        }
    } catch { }
}

// ---------- Date Helpers ----------
function formatDateRelative(dateStr: string) {
    try {
        return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: true, locale: idLocale })
    } catch { return dateStr }
}
function formatDateFull(dateStr: string) {
    try {
        const tz = resolveUserTimezone()
        return new Intl.DateTimeFormat("id-ID", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
            timeZone: tz, timeZoneName: "short",
        }).format(new Date(dateStr))
    } catch { return dateStr }
}

// ---------- Sub-components ----------
function StatusBadge({ status }: { status: PengajuanStatus }) {
    const cfg = STATUS_CFG[status]
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    )
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <button onClick={() => onChange(Math.max(1, value - 1))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-bold">−</button>
                <span className={`w-8 text-center text-sm font-bold ${value >= 7 ? "text-emerald-600" : value >= 4 ? "text-amber-600" : "text-rose-600"}`}>{value}</span>
                <button onClick={() => onChange(Math.min(9, value + 1))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-bold">+</button>
            </div>
        </div>
    )
}

// ---------- Penguji Dropdown ----------
type PengujiItem = {
    id: number; username: string; name: string; role: string; email: string;
    zoomLink: string; skills: string[]; avatar: string
    totalSeleksi: number; rating: number
}

function PengujiDropdown({
    value, onSelect
}: {
    value: PengujiItem | null
    onSelect: (p: PengujiItem) => void
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [appliedSearch, setAppliedSearch] = useState("")
    const ref = useRef<HTMLDivElement>(null)

    const filtered = useMemo(() => {
        const q = appliedSearch.toLowerCase()
        return (seleksiTeam as PengujiItem[]).filter(p =>
            !q || p.name.toLowerCase().includes(q) || p.skills.some(s => s.toLowerCase().includes(q)) || p.role.toLowerCase().includes(q)
        )
    }, [appliedSearch])

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
                        ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400"
                    } focus:ring-2 focus:ring-blue-500 outline-none`}>
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
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            setAppliedSearch(search);
                                        }
                                    }}
                                    placeholder="Cari nama atau spesialisasi..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <button type="button" onClick={() => setAppliedSearch(search)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-1">
                                <Search className="w-3.5 h-3.5" /> Cari
                            </button>
                        </div>
                    </div>
                    {/* List */}
                    <div className="max-h-52 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        {filtered.length === 0 ? (
                            <div className="py-6 text-center text-xs text-gray-400">Tidak ada penyeleksi ditemukan</div>
                        ) : filtered.map(p => (
                            <button key={p.id} type="button"
                                onClick={() => { onSelect(p); setOpen(false); setSearch(""); setAppliedSearch("") }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left
                                    ${value?.id === p.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {p.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.role} · {p.skills.join(", ")}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="flex items-center gap-0.5 text-amber-500">
                                        <Star className="w-3 h-3 fill-amber-400" />
                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{p.rating}</span>
                                    </div>
                                </div>
                                {value?.id === p.id && <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

const PAGE_SIZE = 10

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const stored = localStorage.getItem("myqurani_auth")
        if (stored) {
            const auth = JSON.parse(stored)
            return auth.accessToken || null
        }
    } catch { return null }
    return null
}

function mapPendingTrainer(d: any) {
    return {
        id: d.id,
        name: d.userName || d.name || `Guru #${d.id}`,
        email: d.email || "",
        username: d.username || d.userUsername || "",
        specialization: d.headline || d.expertise?.join?.(" | ") || "Pengajar Al-Qur'an",
        location: d.location || "",
        timezone: d.timezone || "Asia/Jakarta", // fallback if missing
        teachingMethod: d.isOnline && d.isOffline ? "Online / Offline" : d.isOnline ? "Online" : "Offline",
        createdAtRaw: d.createdAt || d.appliedAt || new Date().toISOString(),
    }
}

// ---------- Email sender helper ----------
async function sendSelectionEmail(payload: {
    trainerName: string; trainerEmail: string; date: string; time: string
    timezone?: string; duration: string; method: "online" | "offline"; link: string
    pengujiName: string; pengujiSpecialty: string; notes?: string; trainerId: number
}) {
    try {
        const res = await fetch("/api/send-selection-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        return await res.json()
    } catch { return { success: false, error: "Network error" } }
}

function PengajuanContent() {
    // ---------- Data (from API) ----------
    const [guruList, setGuruList] = useState<any[]>([])
    const [isFetchingList, setIsFetchingList] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)

    const fetchPending = useCallback(async () => {
        setIsFetchingList(true)
        setFetchError(null)
        try {
            const token = getClientToken()
            const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
            const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
            const res = await fetch(`${API_BASE_URL}/api/v1/Trainers/pending`, { headers })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            const raw: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
            setGuruList(raw.map(mapPendingTrainer))
        } catch (err: any) {
            console.warn("[PengajuanGuru] fetch error, using dummy fallback:", err.message)
            setFetchError(null)
            setGuruList(pendingDummies.map(mapPendingTrainer))
        } finally {
            setIsFetchingList(false)
        }
    }, [])

    useEffect(() => { fetchPending() }, [fetchPending])

    const [statuses, setStatuses] = useState<Record<number, PengajuanStatus>>({})
    const [seleksiData, setSeleksiData] = useState<Record<number, any>>({})
    const [penilaianData, setPenilaianData] = useState<Record<number, any>>({})
    const [rescheduleFlags, setRescheduleFlags] = useState<Record<number, boolean>>({})

    // Helper: normalize keys from sessionStorage (JSON.parse returns string keys, but g.id is number)
    const normalizeNumericKeys = <T,>(obj: Record<string, T> | null): Record<number, T> => {
        if (!obj) return {}
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [Number(k), v])
        ) as Record<number, T>
    }

    const loadFromSession = useCallback(() => {
        const s = getSession<Record<string, PengajuanStatus>>(STATUS_KEY)
        const sel = getSession<Record<string, any>>(SELEKSI_KEY)
        const pen = getSession<Record<string, any>>(PENILAIAN_KEY)
        const res = getSession<Record<string, boolean>>(RESCHEDULE_KEY)
        if (s) setStatuses(normalizeNumericKeys(s))
        if (sel) setSeleksiData(normalizeNumericKeys(sel))
        if (pen) setPenilaianData(normalizeNumericKeys(pen))
        if (res) setRescheduleFlags(normalizeNumericKeys(res))
    }, [])

    useEffect(() => {
        loadFromSession()
        window.addEventListener("sessionStorageChanged", loadFromSession)
        return () => window.removeEventListener("sessionStorageChanged", loadFromSession)
    }, [loadFromSession])

    const updateStatus = (id: number, status: PengajuanStatus) => {
        setStatuses(prev => {
            const updated = { ...prev, [id]: status }
            setSession(STATUS_KEY, updated)
            return updated
        })
    }

    // ---------- Modal: Seleksi ----------
    const [seleksiModal, setSeleksiModal] = useState<{
        open: boolean; guruId: number | null; name: string; email: string; location: string; timezone: string; isReschedule: boolean
    }>({ open: false, guruId: null, name: "", email: "", location: "", timezone: "", isReschedule: false })

    const [sDate, setSDate] = useState("")
    const [sTimeStart, setSTimeStart] = useState("")
    const [sTimeEnd, setSTimeEnd] = useState("")
    const [sTimezone, setSTimezone] = useState("WIB")
    const [sMethod, setSMethod] = useState<"online" | "offline">("online")
    const [sLink, setSLink] = useState("")
    const [sPengujiObj, setSPengujiObj] = useState<PengujiItem | null>(null)
    const [sNotes, setSNotes] = useState("")
    const [isSendingEmail, setIsSendingEmail] = useState(false)

    // Email preview modal
    const [emailPreview, setEmailPreview] = useState<{
        open: boolean; data: any | null
    }>({ open: false, data: null })

    const inferTimezone = (location: string) => {
        const loc = location.toLowerCase()
        if (loc.includes("bali") || loc.includes("nusa tenggara") || loc.includes("kalimantan selatan") || loc.includes("kalimantan timur") || loc.includes("kalimantan utara") || loc.includes("sulawesi")) return "WITA"
        if (loc.includes("maluku") || loc.includes("papua")) return "WIT"
        return "WIB"
    }

    // Pre-fill form dengan data yang sudah ada (untuk Edit Jadwal & Reschedule)
    const openSeleksiModal = (guru: any, isReschedule = false) => {
        const existing = seleksiData[guru.id]
        const detectedTz = guru.timezone || inferTimezone(guru.location || "")
        setSeleksiModal({ open: true, guruId: guru.id, name: guru.name, email: guru.email, location: guru.location || "", timezone: detectedTz, isReschedule })
        if (existing) {
            setSDate(existing.date || "")
            setSTimeStart(existing.time || "")
            setSTimeEnd(existing.timeEnd || "")
            setSTimezone(existing.timezone || detectedTz)
            setSMethod(existing.method || "online")
            setSLink(existing.link || "")
            setSNotes(existing.notes || "")
            // Restore penguji object
            const foundPenguji = (seleksiTeam as PengujiItem[]).find(p => p.id === existing.pengujiId)
            setSPengujiObj(foundPenguji || null)
        } else {
            setSDate(""); setSTimeStart(""); setSTimeEnd(""); setSLink(""); setSNotes("")
            setSTimezone(detectedTz)
            setSMethod("online"); setSPengujiObj(null)
        }
    }

    const closeSeleksiModal = () =>
        setSeleksiModal({ open: false, guruId: null, name: "", email: "", location: "", timezone: "", isReschedule: false })

    const handleSelectPenguji = (p: PengujiItem) => {
        setSPengujiObj(p)
        // Auto-fill Zoom link for online method
        if (sMethod === "online") setSLink(p.zoomLink)
    }

    // When method changes, update link from penguji if online
    const handleMethodChange = (m: "online" | "offline") => {
        setSMethod(m)
        if (m === "online" && sPengujiObj) setSLink(sPengujiObj.zoomLink)
        else if (m === "offline") setSLink("")
    }

    const convertedTime = useMemo(() => {
        if (!sDate || !sTimeStart || !seleksiModal.timezone) return null
        try {
            const offset = sTimezone === "WIB" ? "+07:00" : sTimezone === "WITA" ? "+08:00" : sTimezone === "WIT" ? "+09:00" : "+07:00"
            const dateObj = new Date(`${sDate}T${sTimeStart}:00${offset}`)
            if (isNaN(dateObj.getTime())) return null
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: seleksiModal.timezone,
                hour: '2-digit', minute: '2-digit', hour12: false
            })
            return formatter.format(dateObj)
        } catch (e) {
            return null
        }
    }, [sDate, sTimeStart, sTimezone, seleksiModal.timezone])

    const handleSubmitSeleksi = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!seleksiModal.guruId) return
        if (!sPengujiObj) {
            showToast({ type: "error", title: "Pilih Tim Penyeleksi", message: "Harap pilih penguji dari dropdown." })
            return
        }

        const data = {
            id: `session-${seleksiModal.guruId}`,
            trainerId: seleksiModal.guruId,
            trainerName: seleksiModal.name,
            trainerEmail: seleksiModal.email,
            pengujiId: sPengujiObj.id,
            pengujiName: sPengujiObj.name,
            pengujiSpecialty: sPengujiObj.skills.join(", "),
            date: sDate,
            time: sTimeStart, // Admin time for Calendar
            timeEnd: sTimeEnd,
            timezone: sTimezone, // Admin timezone for Calendar
            method: sMethod,
            link: sLink,
            notes: sNotes,
            status: "scheduled" as const,
            trainerResponse: null
        }

        // Save to session
        setSeleksiData(prev => {
            const updated = { ...prev, [seleksiModal.guruId!]: data }
            setSession(SELEKSI_KEY, updated)
            return updated
        })
        setRescheduleFlags(prev => {
            const updated = { ...prev, [seleksiModal.guruId!]: false }
            setSession(RESCHEDULE_KEY, updated)
            return updated
        })
        updateStatus(seleksiModal.guruId, "seleksi")

        // Close form modal and open email preview
        closeSeleksiModal()
        setEmailPreview({
            open: true,
            data: {
                ...data,
                // Override for Email payload:
                time: convertedTime || sTimeStart, 
                timezone: seleksiModal.timezone || sTimezone,
                
                trainerName: seleksiModal.name,
                trainerEmail: seleksiModal.email,
                trainerId: seleksiModal.guruId,
                isReschedule: seleksiModal.isReschedule,
            }
        })
    }

    const handleSendEmail = async () => {
        if (!emailPreview.data) return
        setIsSendingEmail(true)
        try {
            const result = await sendSelectionEmail({
                trainerName: emailPreview.data.trainerName,
                trainerEmail: emailPreview.data.trainerEmail,
                date: emailPreview.data.date,
                time: emailPreview.data.time,
                timezone: emailPreview.data.timezone,
                duration: emailPreview.data.duration || "-",
                method: emailPreview.data.method,
                link: emailPreview.data.link,
                pengujiName: emailPreview.data.pengujiName,
                pengujiSpecialty: emailPreview.data.pengujiSpecialty,
                notes: emailPreview.data.notes,
                trainerId: emailPreview.data.trainerId,
            })

            if (result.success) {
                showToast({
                    type: "success",
                    title: result.mock ? "Jadwal Tersimpan (Email Disimulasi)" : "📧 Email Terkirim!",
                    message: result.mock
                        ? `Data tersimpan. Email akan dikirim ke ${emailPreview.data.trainerEmail} setelah Gmail dikonfigurasi.`
                        : `Email undangan seleksi berhasil dikirim ke ${result.recipient}.`,
                    endpoint: `POST /api/send-selection-email`,
                })
            } else {
                showToast({
                    type: "error",
                    title: "Gagal Kirim Email",
                    message: result.error || "Terjadi kesalahan saat mengirim email.",
                })
            }
        } finally {
            setIsSendingEmail(false)
            setEmailPreview({ open: false, data: null })
        }
    }

    const handleEditUlang = () => {
        if (!emailPreview.data) return
        const prevData = emailPreview.data
        setEmailPreview({ open: false, data: null })
        openSeleksiModal(
            { id: prevData.trainerId, name: prevData.trainerName, email: prevData.trainerEmail },
            prevData.isReschedule
        )
    }

    // ---------- Modal: Penilaian ----------
    const [penilaianModal, setPenilaianModal] = useState<{ open: boolean; guruId: number | null; name: string }>({ open: false, guruId: null, name: "" })

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSeleksiModal({ open: false, guruId: null, name: "", email: "", location: "", timezone: "", isReschedule: false })
                setEmailPreview({ open: false, data: null })
                setPenilaianModal({ open: false, guruId: null, name: "" })
            }
        }
        window.addEventListener("keydown", handleEsc)
        return () => window.removeEventListener("keydown", handleEsc)
    }, [])
    const [pHadir, setPHadir] = useState<"hadir" | "tidak_hadir" | null>(null)
    const [pFluency, setPFluency] = useState(5)
    const [pTajweed, setPTajweed] = useState(5)
    const [pIntonation, setPIntonation] = useState(5)
    const [pAppearance, setPAppearance] = useState(5)
    const [pExperience, setPExperience] = useState(5)
    const [pPhotoName, setPPhotoName] = useState<string | null>(null)
    const [pPhotoUrl, setPPhotoUrl] = useState<string | null>(null)

    const openPenilaianModal = (guru: any) => {
        setPenilaianModal({ open: true, guruId: guru.id, name: guru.name })
        setPHadir(null); setPFluency(5); setPTajweed(5); setPIntonation(5); setPAppearance(5); setPExperience(5); setPPhotoName(null); setPPhotoUrl(null)
    }

    const handleSubmitPenilaian = (decision: "diterima" | "ditolak") => {
        if (!penilaianModal.guruId) return
        if (!pHadir) { showToast({ type: "error", title: "Pilih Status Kehadiran", message: "Harap pilih status kehadiran dahulu." }); return }
        const data = { hadir: pHadir, scores: { fluency: pFluency, tajweed: pTajweed, intonation: pIntonation, appearance: pAppearance, experience: pExperience }, photoUrl: pPhotoUrl, photoName: pPhotoName, decision }
        setPenilaianData(prev => {
            const updated = { ...prev, [penilaianModal.guruId!]: data }
            setSession(PENILAIAN_KEY, updated)
            return updated
        })
        updateStatus(penilaianModal.guruId, decision)
        showToast({
            type: decision === "diterima" ? "success" : "info",
            title: decision === "diterima" ? "Guru Berhasil Diterima" : "Guru Ditolak",
            message: penilaianModal.name,
            endpoint: `POST /api/v1/Trainers/${penilaianModal.guruId}/grade-selection`,
        })
        setPenilaianModal({ open: false, guruId: null, name: "" })
    }

    // ---------- Filters ----------
    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending")
    const [page, setPage] = useState(1)

    const effective = useMemo(() =>
        guruList.map(g => ({ ...g, status: (statuses[g.id] ?? "pending") as PengajuanStatus })),
        [guruList, statuses]
    )

    const counts: Record<FilterStatus, number> = useMemo(() => {
        const c: Record<FilterStatus, number> = { all: effective.length, pending: 0, seleksi: 0, diterima: 0, ditolak: 0, batal: 0 }
        effective.forEach(g => { c[g.status as FilterStatus] = (c[g.status as FilterStatus] ?? 0) + 1 })
        return c
    }, [effective])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return effective.filter(g => {
            const matchSearch = !q || g.name.toLowerCase().includes(q) || g.specialization.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
            const matchStatus = statusFilter === "all" || g.status === statusFilter
            return matchSearch && matchStatus
        })
    }, [effective, search, statusFilter])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const TABS: { key: FilterStatus; label: string; color: string }[] = [
        { key: "pending", label: "Menunggu", color: "amber" },
        { key: "seleksi", label: "Seleksi", color: "blue" },
        { key: "diterima", label: "Diterima", color: "emerald" },
        { key: "ditolak", label: "Ditolak", color: "rose" },
        { key: "batal", label: "Batal", color: "gray" },
        { key: "all", label: "Semua", color: "slate" },
    ]

    const tabColorMap: Record<string, { active: string; inactive: string }> = {
        amber: { active: "bg-amber-500 text-white border-amber-500", inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-400" },
        blue: { active: "bg-blue-500 text-white border-blue-500", inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400" },
        emerald: { active: "bg-emerald-500 text-white border-emerald-500", inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400" },
        rose: { active: "bg-rose-500 text-white border-rose-500", inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-rose-400" },
        gray: { active: "bg-gray-500 text-white border-gray-500", inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400" },
        slate: { active: "bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900", inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
    }

    return (
        <TooltipProvider>
            <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
                <ToastContainer />
                <div className="max-w-[1600px] mx-auto space-y-4">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengajuan Guru</h1>
                        <button onClick={fetchPending} disabled={isFetchingList}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingList ? "animate-spin" : ""}`} /> Refresh
                        </button>
                    </div>

                    {/* Loading state */}
                    {isFetchingList ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-white dark:bg-gray-800 animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                                    </div>
                                    <div className="space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>
                                </div>
                            ))}
                        </div>
                    ) : fetchError ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                            <AlertTriangle className="w-10 h-10 text-amber-400" />
                            <div>
                                <p className="font-semibold text-gray-700 dark:text-gray-300">Gagal memuat data</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{fetchError}</p>
                            </div>
                            <button onClick={fetchPending} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg">Coba Lagi</button>
                        </div>
                    ) : (
                        <>

                            {/* Tabs filter + Search */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {TABS.map(t => {
                                        const isActive = statusFilter === t.key
                                        const colors = tabColorMap[t.color]
                                        return (
                                            <button key={t.key}
                                                onClick={() => { setStatusFilter(t.key); setPage(1) }}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${isActive ? colors.active : colors.inactive}`}>
                                                {t.key === "all" && <Sparkles className="w-3 h-3" />}
                                                {t.label}
                                                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-white/25" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                                                    {counts[t.key]}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="relative flex w-full lg:w-[22rem]">
                                    <div className="relative flex-grow">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1) } }}
                                            placeholder="Cari nama atau email..."
                                            className="w-full pl-9 pr-4 py-2 text-sm rounded-l-lg border border-r-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
                                    </div>
                                    <button onClick={() => { setSearch(searchInput); setPage(1) }}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-r-lg border border-emerald-500 transition-colors flex items-center gap-1.5">
                                        <Search className="w-4 h-4" /> Cari
                                    </button>
                                </div>
                            </div>

                            {/* ── Desktop Table ── */}
                            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Pendaftar</th>
                                                <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Spesialisasi</th>
                                                <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Status</th>
                                                <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Aksi</th>
                                                <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3 text-right">Tgl Daftar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {paged.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-16 text-gray-400">
                                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                        <p>Tidak ada data pengajuan</p>
                                                    </td>
                                                </tr>
                                            ) : paged.map(guru => (
                                                <tr key={guru.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
                                                    {/* Pendaftar – nama & avatar bisa diklik */}
                                                    <td className="px-4 py-3">
                                                        <Link href={`/en/teachers/manage/${guru.id}/review`} className="flex items-center gap-3 group/name">
                                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm ring-2 ring-transparent group-hover/name:ring-emerald-300 transition-all">
                                                                {guru.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 dark:text-white text-xs leading-tight group-hover/name:text-emerald-600 dark:group-hover/name:text-emerald-400 transition-colors">{guru.name}</p>
                                                                <p className="text-[10px] text-gray-400 mt-0.5">@{guru.username}</p>
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs italic font-semibold text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                                        {guru.specialization}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <StatusBadge status={guru.status} />
                                                            {guru.status === "seleksi" && rescheduleFlags[guru.id] && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                                    <RefreshCw className="w-2.5 h-2.5" /> Reschedule
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity flex-wrap">
                                                            {/* Detail button – selalu tampil */}
                                                            <Link href={`/en/teachers/manage/${guru.id}/review`}
                                                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg transition-colors">
                                                                <Eye className="w-3.5 h-3.5" /> Detail
                                                            </Link>
                                                            {guru.status === "seleksi" && (
                                                                rescheduleFlags[guru.id] ? (
                                                                    <button onClick={() => openSeleksiModal(guru, true)}
                                                                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg transition-colors">
                                                                        <RefreshCw className="w-3.5 h-3.5" /> Atur Ulang
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => openSeleksiModal(guru)}
                                                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                                                                        <Calendar className="w-3.5 h-3.5" /> Edit Jadwal
                                                                    </button>
                                                                )
                                                            )}
                                                            {guru.status === "seleksi" && (
                                                                <button onClick={() => openPenilaianModal(guru)}
                                                                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 font-semibold border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded-lg transition-colors">
                                                                    <ClipboardList className="w-3.5 h-3.5" /> Penilaian
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 font-medium text-right">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px whitespace-nowrap">
                                                                    {formatDateRelative(guru.createdAtRaw)}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="text-xs">{formatDateFull(guru.createdAtRaw)}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── Mobile Card Layout ── */}
                            <div className="block md:hidden space-y-3">
                                {paged.length === 0 ? (
                                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                        <p className="text-sm text-gray-400">Tidak ada data pengajuan</p>
                                    </div>
                                ) : paged.map(guru => (
                                    <div key={guru.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
                                        {/* Header: Avatar + Nama + Status – bisa diklik */}
                                        <div className="flex items-start justify-between gap-3">
                                            <Link href={`/en/teachers/manage/${guru.id}/review`} className="flex items-center gap-3 min-w-0 group/name">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm ring-2 ring-transparent group-hover/name:ring-emerald-300 transition-all">
                                                    {guru.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate group-hover/name:text-emerald-600 dark:group-hover/name:text-emerald-400 transition-colors">{guru.name}</p>
                                                    <p className="text-[11px] text-gray-400 truncate">@{guru.username}</p>
                                                </div>
                                            </Link>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                <StatusBadge status={guru.status} />
                                                {guru.status === "seleksi" && rescheduleFlags[guru.id] && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                        <RefreshCw className="w-2.5 h-2.5" /> Reschedule
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Detail: Spesialisasi + Tanggal */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Spesialisasi</p>
                                                <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{guru.specialization}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Tgl Daftar</p>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px font-semibold text-gray-700 dark:text-gray-300">
                                                            {formatDateRelative(guru.createdAtRaw)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p className="text-xs">{formatDateFull(guru.createdAtRaw)}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        {/* Aksi */}
                                        <div className="flex items-center gap-2 flex-wrap pt-1">
                                            <Link href={`/en/teachers/manage/${guru.id}/review`}
                                                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                                <Eye className="w-3.5 h-3.5" /> Detail
                                            </Link>
                                            {guru.status === "seleksi" && (
                                                rescheduleFlags[guru.id] ? (
                                                    <button onClick={() => openSeleksiModal(guru, true)}
                                                        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                                        <RefreshCw className="w-3.5 h-3.5" /> Atur Ulang
                                                    </button>
                                                ) : (
                                                    <button onClick={() => openSeleksiModal(guru)}
                                                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                                        <Calendar className="w-3.5 h-3.5" /> Edit Jadwal
                                                    </button>
                                                )
                                            )}
                                            {guru.status === "seleksi" && (
                                                <button onClick={() => openPenilaianModal(guru)}
                                                    className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 font-semibold border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                                    <ClipboardList className="w-3.5 h-3.5" /> Penilaian
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Pagination ── */}
                            <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                                <span className="text-xs text-gray-500">
                                    Menampilkan {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                        <button key={p} onClick={() => setPage(p)}
                                            className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                            {p}
                                        </button>
                                    ))}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ─── Modal: Jadwal Seleksi ──────────────────────────────────── */}
                {seleksiModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">

                            <div className={`flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 rounded-t-2xl ${seleksiModal.isReschedule ? "bg-amber-50 dark:bg-amber-900/20" : "bg-blue-50 dark:bg-blue-900/20"}`}>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {seleksiModal.isReschedule
                                            ? <><RefreshCw className="w-5 h-5 text-amber-500" /> Atur Ulang Jadwal Seleksi</>
                                            : <><Calendar className="w-5 h-5 text-blue-500" /> Jadwal Wawancara Seleksi</>
                                        }
                                    </h2>
                                </div>
                                <button onClick={closeSeleksiModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto space-y-4" style={{ scrollbarWidth: "none" }}>
                                <form id="formSeleksi" onSubmit={handleSubmitSeleksi} className="space-y-4">

                                    {seleksiModal.isReschedule && (
                                        <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                            <RefreshCw className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Permintaan Reschedule</p>
                                                <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                                                    Guru mengajukan reschedule. Jadwal lama ditampilkan — silakan ubah ke waktu yang baru lalu kirim ulang.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Tanggal Seleksi</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="date" value={sDate} onChange={e => setSDate(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>

                                    {/* Waktu Seleksi & Zona Waktu */}
                                    <div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Waktu Seleksi</label>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                        <input required type="time" value={sTimeStart} onChange={e => setSTimeStart(e.target.value)}
                                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                                    </div>
                                                    <span className="text-gray-400 font-bold flex-shrink-0 text-base">—</span>
                                                    <div className="relative flex-1">
                                                        <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                        <input required type="time" value={sTimeEnd} onChange={e => setSTimeEnd(e.target.value)}
                                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Zona Waktu</label>
                                                <select value={sTimezone} onChange={e => setSTimezone(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                                                    <option value="WIB">WIB</option>
                                                    <option value="WITA">WITA</option>
                                                    <option value="WIT">WIT</option>
                                                </select>
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
                                        {convertedTime && seleksiModal.timezone && (
                                            <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-xs">
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    Zona waktu calon guru terdeteksi: <strong className="text-blue-700 dark:text-blue-400">{seleksiModal.timezone}</strong>
                                                </p>
                                                <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                                                    Waktu seleksi di lokasi calon guru adalah <strong className="text-blue-700 dark:text-blue-400">{convertedTime} {seleksiModal.timezone}</strong>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Penguji Dropdown - dipindah setelah Waktu Seleksi */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Penguji / Tim Penyeleksi</label>
                                        <PengujiDropdown value={sPengujiObj} onSelect={handleSelectPenguji} />
                                        {sPengujiObj && (
                                            <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                                <Mail className="w-3 h-3" />
                                                <span>{sPengujiObj.email}</span>
                                                <span>·</span>
                                                <span>{sPengujiObj.skills.join(", ")}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Metode - dipindah setelah Penguji */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Metode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => handleMethodChange("online")}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${sMethod === "online" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                                                <Video className="w-4 h-4" /> Online
                                            </button>
                                            <button type="button" onClick={() => handleMethodChange("offline")}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${sMethod === "offline" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                                                <MapPin className="w-4 h-4" /> Offline
                                            </button>
                                        </div>
                                    </div>

                                    {/* Link pertemuan / Lokasi */}
                                    {sMethod === "online" ? (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                                                Link Pertemuan (Zoom / Google Meet)
                                                {sPengujiObj && <span className="ml-1 text-emerald-600 font-normal">(otomatis dari penguji)</span>}
                                            </label>
                                            <div className="relative">
                                                <Video className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                <input required type="url" value={sLink} onChange={e => setSLink(e.target.value)} placeholder="https://zoom.us/j/..."
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Lokasi / Alamat</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                <input required type="text" value={sLink} onChange={e => setSLink(e.target.value)}
                                                    placeholder={seleksiModal.location || "Jl. Contoh No. 1, Kota..."}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-1">Lokasi pendaftar: <span className="font-semibold">{seleksiModal.location || "-"}</span></p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Catatan / Info Tambahan</label>
                                        <textarea value={sNotes} onChange={e => setSNotes(e.target.value)} rows={3}
                                            placeholder="Persiapkan hafalan surah pendek, bawa dokumen asli..."
                                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                                    </div>
                                </form>
                            </div>

                            <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
                                <button onClick={closeSeleksiModal}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors">
                                    Batal
                                </button>
                                <button type="submit" form="formSeleksi"
                                    className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 ${seleksiModal.isReschedule ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-500 hover:bg-blue-600"}`}>
                                    {seleksiModal.isReschedule
                                        ? <><RefreshCw className="w-4 h-4" /> Simpan Jadwal Baru</>
                                        : <><Send className="w-4 h-4" /> Simpan</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Modal: Preview Email Konfirmasi ───────────────────────── */}
                {emailPreview.open && emailPreview.data && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
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

                            <div className="p-5 space-y-4">
                                {/* Preview info */}
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
                                                    {emailPreview.data.date} · {emailPreview.data.time} {emailPreview.data.timezone}
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

                                {/* Info */}
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

                {/* ─── Modal: Penilaian Seleksi ───────────────────────────────── */}
                {penilaianModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">

                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-violet-50 dark:bg-violet-900/20 rounded-t-2xl">
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-violet-500" /> Penilaian Seleksi
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Peserta: <span className="font-bold text-violet-600 dark:text-violet-400">{penilaianModal.name}</span></p>
                                </div>
                                <button onClick={() => setPenilaianModal({ open: false, guruId: null, name: "" })}
                                    className="text-gray-400 hover:text-gray-600 p-1"><XCircle className="w-5 h-5" /></button>
                            </div>

                            <div className="p-5 overflow-y-auto space-y-5">
                                {/* Ringkasan Jadwal */}
                                {(() => {
                                    const sel = penilaianModal.guruId ? seleksiData[penilaianModal.guruId] : null
                                    return sel ? (
                                        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-800 space-y-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Info Jadwal Seleksi</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                    <Calendar className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                                    <span>{sel.date} · {sel.time} {sel.timezone || "WIB"}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                    {sel.method === "online"
                                                        ? <Video className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                                        : <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                                    }
                                                    <span className="capitalize">{sel.method}</span>
                                                </div>
                                                {sel.penguji && (
                                                    <div className="col-span-2 flex items-start gap-1.5 text-gray-600 dark:text-gray-400">
                                                        <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                                                        <span><span className="font-semibold text-gray-700 dark:text-gray-300">Penyeleksi:</span> {sel.penguji}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                                            <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span>Data jadwal seleksi belum tersedia.</span>
                                        </div>
                                    )
                                })()}

                                {/* Kehadiran */}
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Konfirmasi Kehadiran</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setPHadir("hadir")}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${pHadir === "hadir" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-emerald-300"}`}>
                                            <CheckCircle2 className="w-4 h-4" /> Hadir
                                        </button>
                                        <button onClick={() => setPHadir("tidak_hadir")}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${pHadir === "tidak_hadir" ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-rose-300"}`}>
                                            <XCircle className="w-4 h-4" /> Tidak Hadir
                                        </button>
                                    </div>
                                </div>

                                {/* Penilaian */}
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Kriteria Penilaian (Skala 1–9)</p>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-0.5">
                                        <ScoreInput label="Kelancaran Baca" value={pFluency} onChange={setPFluency} />
                                        <ScoreInput label="Tajwid & Makhraj" value={pTajweed} onChange={setPTajweed} />
                                        <ScoreInput label="Intonasi Suara" value={pIntonation} onChange={setPIntonation} />
                                        <ScoreInput label="Penampilan" value={pAppearance} onChange={setPAppearance} />
                                        <ScoreInput label="Pengalaman" value={pExperience} onChange={setPExperience} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 px-1">
                                        <span>Rata-rata: <span className="font-bold text-gray-700 dark:text-gray-300">{((pFluency + pTajweed + pIntonation + pAppearance + pExperience) / 5).toFixed(1)}</span></span>
                                        <span>Nilai min. lolos: <span className="font-bold text-emerald-600">≥ 6.0</span></span>
                                    </div>
                                </div>

                                {/* Upload Bukti */}
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Foto / Dokumentasi Penyeleksian</p>
                                    <div className="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group overflow-hidden">
                                        {pPhotoUrl ? (
                                            <div className="w-full relative rounded-lg overflow-hidden flex flex-col items-center">
                                                <img src={pPhotoUrl} alt="Bukti" className="w-full h-32 object-cover rounded-lg" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <p className="text-xs font-bold text-white">Ganti Foto</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                    <UploadCloud className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Unggah Foto (Screenshot)</p>
                                                <p className="text-[10px] text-gray-400 mt-1">Format: JPG, PNG (Maks 2MB)</p>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0]
                                                    setPPhotoName(file.name)
                                                    setPPhotoUrl(URL.createObjectURL(file))
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {!pHadir && (
                                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <p className="text-xs text-amber-700 dark:text-amber-400">Pilih status kehadiran sebelum memberikan keputusan akhir.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
                                <button onClick={() => handleSubmitPenilaian("ditolak")} disabled={!pHadir}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors">
                                    <XCircle className="w-4 h-4" /> Tolak
                                </button>
                                <button onClick={() => handleSubmitPenilaian("diterima")} disabled={!pHadir}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                                    <CheckCircle2 className="w-4 h-4" /> Terima Guru
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    )
}

export default function PengajuanGuruPage() {
    return (
        <Suspense fallback={<div className="p-4 text-gray-500">Memuat data...</div>}>
            <PengajuanContent />
        </Suspense>
    )
}
