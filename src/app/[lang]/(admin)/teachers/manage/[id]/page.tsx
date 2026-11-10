"use client"

import { useState, useEffect, useMemo, ReactNode, Suspense } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ArrowLeft, MapPin, Clock3, BookOpen, Star, CheckCircle2, XCircle,
    AlertTriangle, ShieldCheck, ShieldOff, Image as ImageIcon, MessageSquare,
    Info, Award, FileText, User, BadgeCheck, CircleDashed, X, ExternalLink,
    Loader2, Package, Quote, Mail, Coins, PlayCircle, Users, LinkIcon, Hourglass,
    Copy, Check, Globe, Wifi, WifiOff, CalendarDays, ShoppingCart
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import dummyData from "@/data/billing-dummy.json"
import pendingDummies from "@/data/pending-trainers-list.json"
import { SIM_TRAINERS } from "@/data/sim-dummy-users"
import guruDetailDummy from "@/data/guru-detail-dummy.json"
import { TeacherOrdersTab } from "@/components/Teachers/TeacherOrdersTab"
// TeacherWalletTab removed — wallet tab dihapus dari profil guru


// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? null
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TrainerStatus = "verified" | "pending" | "suspended" | "rejected"
type DetailTab = "informasi" | "paket" | "galeri" | "ulasan" | "pesanan"
type RequirementKey = "profil_kontak" | "kualifikasi_metode" | "sertifikat" | "media_portofolio"

type TrainerDetail = {
    id: number
    userId: number
    userName: string
    username: string
    userImage: string
    headline: string | null
    bio: string | null
    location: string | null
    experienceYears: number
    expertise: string[]
    isOnline: boolean
    isOffline: boolean
    hourlyRate: number
    currency: string
    averageRating: number
    totalCourses: number
    totalStudents: number
    totalReviews: number
    status: TrainerStatus
    bgCheckStatus?: "none" | "requested" | "completed" | "failed"
    isVerified?: boolean
    verificationLevel?: number | null
    isFeatured?: boolean
    createdAt: string
    portfolioUrls: string[]
    certifications: {
        name: string
        issuer: string
        issuedDate: string
        expiryDate: string
        url: string
    }[]
    teachingMethods: {
        name: string
        description: string
    }[]
}

type RequirementItem = {
    key: RequirementKey
    title: string
    subtitle: string
    required: boolean
    ok: boolean
    dataCount: number
    evidence: Array<{
        label: string
        value?: string
        url?: string
        isPhoto?: boolean
        isVideo?: boolean
        isCert?: boolean
    }>
}

type ReviewItem = {
    id: number
    reviewerName: string
    reviewerAvatar: string
    rating: number
    comment: string
    tags: string[]
    createdAt: string
}

type CourseItem = {
    id: number | string
    title: string
    description: string
    price: number
    currency: string
    sessions: number | null
    level: string
    features: string[]
    isPublished: boolean
    totalStudents: number
    averageRating: number
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<TrainerStatus, { label: string; badge: string; dot: string }> = {
    verified: { label: "Terverifikasi", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
    pending: { label: "Menunggu Verifikasi", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
    suspended: { label: "Nonaktif", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
    rejected: { label: "Ditolak", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", dot: "bg-rose-500" },
}

// ── Qurani normalization ───────────────────────────────────────────────────────
const NON_QURANI_PATTERN = /biologi|kimia|fisika|matematika|bahasa inggris|bahasa indonesia|sejarah|ekonomi|akuntansi|komputer|programming|koding/i

function normalizeExpertise(raw: any): string[] {
    if (!raw) return ["Tahfidz", "Tajwid"]
    const rawArray = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',').map(s => s.trim()) : [])
    if (rawArray.length === 0) return ["Tahfidz", "Tajwid"]
    const filtered = rawArray.filter((e: string) => !NON_QURANI_PATTERN.test(e))
    if (filtered.length === 0) return ["Tahfidz", "Tajwid"]
    return filtered
}

function normalizeHeadline(raw: string | null): string | null {
    if (!raw) return null
    if (NON_QURANI_PATTERN.test(raw)) return "Pengajar Al-Qur'an & Tahfidz"
    return raw
}

// ── Dummy Reviews ─────────────────────────────────────────────────────────────
const DUMMY_REVIEWS: ReviewItem[] = guruDetailDummy.reviews

// ── Dummy gallery items for fallback ──────────────────────────────────────────
const DUMMY_GALLERY_URLS = guruDetailDummy.galleryUrls

// ── Dummy certs for fallback ──────────────────────────────────────────────────
const DUMMY_CERTS = guruDetailDummy.certs

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d?: string): string {
    if (!d) return "—"
    try {
        return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    } catch { return d }
}

// Format full date + time with timezone for tooltip
function formatDateTimeWithTZ(d?: string): string {
    if (!d) return ""
    try {
        const date = new Date(d)
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        return date.toLocaleString("id-ID", {
            day: "numeric", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit",
            timeZoneName: "short",
        }) + ` (${tz})`
    } catch { return d }
}

function formatCurrency(amount: number, currency = "IDR"): string {
    try {
        return new Intl.NumberFormat("id-ID", {
            style: "currency", currency,
            minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(amount)
    } catch { return `${currency} ${amount.toLocaleString()}` }
}

function detectMediaKind(url: string): "video" | "image" | "link" {
    if (!url) return "link"
    const lower = url.toLowerCase()
    if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm|\.mov/.test(lower)) return "video"
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/.test(lower)) return "image"
    return "link"
}

function extractYoutubeId(url: string): string | null {
    if (!url) return null
    const m =
        url.match(/youtube\.com\/watch\?v=([^&]+)/) ??
        url.match(/youtu\.be\/([^?]+)/) ??
        url.match(/youtube\.com\/embed\/([^?]+)/)
    return m?.[1] ?? null
}

function getMethodInfo(name: string): { color: string; description: string } {
    const methods: Record<string, { color: string; description: string }> = {
        Iqro: { color: "bg-emerald-500", description: "Metode belajar Al-Qur'an bertahap mulai dari huruf hijaiyah." },
        Ummi: { color: "bg-blue-500", description: "Metode pembelajaran berbasis irama khas dengan prinsip talaqqi musyafahah." },
        Tilawati: { color: "bg-violet-500", description: "Belajar membaca Al-Qur'an dengan lagu yang khas dan menyenangkan." },
        Qiroati: { color: "bg-amber-500", description: "Metode terstruktur dari pengenalan huruf hingga tajwid." },
        "Yanbu'a": { color: "bg-rose-500", description: "Metode tahfidz dan tartil Al-Qur'an dari Kudus." },
        "Al-Baghdadi": { color: "bg-orange-500", description: "Metode klasik pengajaran Al-Qur'an yang telah terbukti selama berabad-abad." },
        Dirosa: { color: "bg-cyan-500", description: "Metode belajar membaca Al-Qur'an untuk orang dewasa." },
        Wafa: { color: "bg-lime-500", description: "Metode pembelajaran Al-Qur'an berbasis otak kanan." },
        "Grand PQ": { color: "bg-pink-500", description: "Metode menghafal Al-Qur'an dengan gerakan." },
        "An-Nahdliyah": { color: "bg-teal-500", description: "Metode dari LPPTKA-BKPRMI Nahdlatul Ulama." },
        Tartil: { color: "bg-indigo-500", description: "Membaca Al-Qur'an dengan pelan, jelas, dan benar makhraj-nya." },
        Talaqqi: { color: "bg-fuchsia-500", description: "Menghafal langsung face-to-face dengan guru." },
        Tafsir: { color: "bg-sky-500", description: "Pembelajaran makna dan tafsir ayat Al-Qur'an." },
    }
    return methods[name] ?? { color: "bg-gray-500", description: "Metode pengajaran Al-Qur'an." }
}

function getMethodAbbrev(name: string): string {
    return name.split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase()
}

// ── Build verification requirements ──────────────────────────────────────────
function buildRequirements(detail: TrainerDetail): RequirementItem[] {
    const allPortfolio = detail.portfolioUrls || []
    const videoLinks = allPortfolio.filter((url) => detectMediaKind(url) === "video")
    const photoLinks = allPortfolio.filter((url) => detectMediaKind(url) === "image")
    const fatihahLinks = videoLinks.filter((url) => /(fatihah|fatiha|alfatihah|al-fatihah)/i.test(url))
    const suratPendekLinks = videoLinks.filter((url) => !fatihahLinks.includes(url))

    // ─── 1. Profil Dasar ───────────────────────────────────────────────────────
    const profilOk = Boolean(detail.userName && detail.location)
    const profilEvidence = [
        { label: "Nama Lengkap & Gelar", value: detail.userName || "-" },
        { label: "Domisili", value: detail.location || "-" },
        { label: "Pengalaman Mengajar", value: `${detail.experienceYears || 0} Tahun` },
    ]

    // ─── 2. Kualifikasi & Metode ───────────────────────────────────────────────
    const modeString =
        detail.isOnline && detail.isOffline ? "Online & Offline"
            : detail.isOnline ? "Online"
                : detail.isOffline ? "Offline"
                    : "-"
    const kualifikasiEvidence = [
        { label: "Headline / Slogan", value: detail.headline || "-" },
        { label: "Biografi Singkat", value: detail.bio || "-" },
        { label: "Keahlian / Spesialisasi", value: detail.expertise.join(", ") || "-" },
        { label: "Mode Mengajar", value: modeString },
        { label: "Tarif Mengajar per Jam", value: `${detail.currency || "IDR"} ${detail.hourlyRate || 0}` },
    ]
    const kualifikasiOk = detail.expertise.length > 0 || Boolean(detail.bio)

    // ─── 3. Sertifikasi & Ijazah ───────────────────────────────────────────────
    const certEvidence = detail.certifications.map((cert, idx) => ({
        label: `Sertifikat / Ijazah: ${cert.name || `Sertifikat ${idx + 1}`}`,
        value: `Penerbit: ${cert.issuer || "—"} | Diterbitkan: ${formatDate(cert.issuedDate)}${cert.expiryDate ? ` | Berlaku hingga: ${formatDate(cert.expiryDate)}` : ""}`,
        url: cert.url || undefined,
        isCert: true as const,
    }))
    const certOk = detail.certifications.length > 0

    // ─── 4. Portofolio & Media ─────────────────────────────────────────────────
    const mediaEvidence = [
        ...fatihahLinks.map((url, idx) => ({
            label: `Link Video Surat Al-Fatihah${fatihahLinks.length > 1 ? ` ${idx + 1}` : ""}`,
            url,
            isVideo: true as const,
        })),
        ...suratPendekLinks.map((url, idx) => ({
            label: `Link Video Surat Pendek / Portofolio${suratPendekLinks.length > 1 ? ` ${idx + 1}` : ""}`,
            url,
            isVideo: true as const,
        })),
        ...photoLinks.map((url, idx) => ({
            label: `Foto Portofolio${photoLinks.length > 1 ? ` ${idx + 1}` : ""}`,
            url,
            isPhoto: true as const,
        })),
        ...(fatihahLinks.length === 0 && suratPendekLinks.length === 0 && photoLinks.length === 0 ? [{ label: "Media Portofolio", value: "-", isPhoto: false, isVideo: false }] : [])
    ]
    const mediaOk = allPortfolio.length > 0

    return [
        {
            key: "profil_kontak",
            title: "Profil Dasar",
            subtitle: "Nama, lokasi domisili & pengalaman",
            required: true,
            ok: profilOk,
            dataCount: profilEvidence.filter((d) => d.value && d.value !== "-").length,
            evidence: profilEvidence,
        },
        {
            key: "kualifikasi_metode",
            title: "Kualifikasi & Metode",
            subtitle: "Headline, biografi, keahlian & tarif",
            required: true,
            ok: kualifikasiOk,
            dataCount: kualifikasiEvidence.filter((d) => d.value && d.value !== "-").length,
            evidence: kualifikasiEvidence,
        },
        {
            key: "sertifikat",
            title: "Sertifikat / Ijazah",
            subtitle: "Dokumen riwayat pendidikan & sertifikasi",
            required: true,
            ok: certOk,
            dataCount: detail.certifications.length,
            evidence: certEvidence,
        },
        {
            key: "media_portofolio",
            title: "Portofolio & Media",
            subtitle: "Video hafalan atau foto kegiatan mengajar",
            required: false,
            ok: mediaOk,
            dataCount: fatihahLinks.length + suratPendekLinks.length + photoLinks.length,
            evidence: mediaEvidence,
        },
    ]
}

// ── RequirementModal ──────────────────────────────────────────────────────────
function RequirementModal({ item, onClose, onVerifyCredential, loadingCert }: { item: RequirementItem | null; onClose: () => void; onVerifyCredential?: (ev: any) => void; loadingCert?: string | null }) {
    if (!item) return null

    const photoItems = item.evidence.filter(e => e.isPhoto)
    const videoItems = item.evidence.filter(e => e.isVideo)
    const certItems = item.evidence.filter(e => e.isCert)
    const dataItems = item.evidence.filter(e => !e.isPhoto && !e.isVideo && !e.isCert)

    function getYoutubeThumbnail(url: string): string | null {
        const vid = extractYoutubeId(url)
        return vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : null
    }

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
                    {item.evidence.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            Belum ada data submit untuk syarat ini.
                        </div>
                    ) : (
                        <>
                            {/* ─── Foto (isPhoto) ─── */}
                            {photoItems.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {photoItems.map((ev, idx) => (
                                        <div key={`photo-${idx}`} className="flex flex-col gap-1">
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{ev.label}</p>
                                            <a href={ev.url} target="_blank" rel="noreferrer" className="block">
                                                <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-100 dark:border-gray-700 hover:border-emerald-400 transition-colors">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={ev.url} alt={ev.label} className="w-full h-full object-cover" />
                                                </div>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ─── Video Links (isVideo) ─── */}
                            {videoItems.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Media Verifikasi Hafalan</p>
                                    {videoItems.map((ev, idx) => {
                                        const thumb = ev.url ? getYoutubeThumbnail(ev.url) : null
                                        const ytId = ev.url ? extractYoutubeId(ev.url) : null
                                        return (
                                            <div key={`video-${idx}`} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/40">
                                                <div className="px-3 pt-3 pb-1">
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                        <PlayCircle className="w-3.5 h-3.5 text-red-500" />
                                                        {ev.label}
                                                    </p>
                                                </div>
                                                {ev.url ? (
                                                    <a href={ev.url} target="_blank" rel="noreferrer" className="block group">
                                                        <div className="relative mx-3 mb-3 rounded-lg overflow-hidden aspect-video bg-gray-900">
                                                            {thumb ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={thumb} alt={ev.label} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <PlayCircle className="w-10 h-10 text-white/60" />
                                                                </div>
                                                            )}
                                                            {/* Play overlay */}
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                                    <PlayCircle className="w-7 h-7 text-white fill-white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="px-3 pb-3 text-[10px] text-emerald-600 dark:text-emerald-400 break-all flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                            {ytId ? `youtube.com/watch?v=${ytId}` : ev.url}
                                                        </p>
                                                    </a>
                                                ) : (
                                                    <p className="px-3 pb-3 text-xs text-gray-400 italic">Belum ada link yang disubmit</p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* ─── Sertifikat / Ijazah (isCert) ─── */}
                            {certItems.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Dokumen Sertifikat</p>
                                    {certItems.map((ev, idx) => (
                                        <div key={`cert-${idx}`} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                            {ev.url ? (
                                                <a href={ev.url} target="_blank" rel="noreferrer" className="group block">
                                                    <div className="relative aspect-[3/2] bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 overflow-hidden">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={ev.url}
                                                            alt={ev.label}
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="bg-white text-gray-800 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                                                                <ExternalLink className="w-2.5 h-2.5" /> Buka
                                                            </span>
                                                        </div>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="aspect-[3/2] bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 flex flex-col items-center justify-center gap-2">
                                                    <Award className="w-10 h-10 text-amber-400 opacity-40" />
                                                    <span className="text-xs text-amber-600/60 dark:text-amber-400/40">Belum ada dokumen</span>
                                                </div>
                                            )}
                                            <div className="px-3 py-2.5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{ev.label}</p>
                                                {ev.value && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{ev.value}</p>}

                                                {onVerifyCredential && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onVerifyCredential(ev); }}
                                                        disabled={loadingCert === ev.url}
                                                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold transition-colors disabled:opacity-50"
                                                    >
                                                        {loadingCert === ev.url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                                        Tandai Dokumen Sah / Valid
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ─── Data fields (text) ─── */}
                            {dataItems.length > 0 && (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                    {dataItems.map((ev, idx) => (
                                        <div key={`data-${idx}`} className="px-4 py-3 bg-white dark:bg-gray-900">
                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{ev.label}</p>
                                            {ev.value && (
                                                <p className={`text-sm mt-0.5 ${ev.value === "-" ? "text-gray-300 dark:text-gray-600" : "text-gray-600 dark:text-gray-300"}`}>
                                                    {ev.value}
                                                </p>
                                            )}
                                            {ev.url && (
                                                <a href={ev.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline break-all">
                                                    <ExternalLink className="w-3 h-3" /> Buka dokumen
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Dummy trainer builder (fallback) ─────────────────────────────────────────
const DUMMY_NAMES = guruDetailDummy.names
const DUMMY_HEADLINES = guruDetailDummy.headlines
const DUMMY_BIOS = guruDetailDummy.bios
const DUMMY_EXPERTISE_LIST = guruDetailDummy.expertiseList

function buildFallbackDetail(id: number): TrainerDetail {
    if (id === 999999) {
        return {
            id: 999999,
            userId: 999999,
            userName: "Ahmad Faris",
            username: "ahmadfaris_tahsin",
            userImage: "https://i.pravatar.cc/150?img=11",
            headline: "Pengajar Tahsin & Tajwid Bersertifikat",
            bio: "Lulusan Universitas Al-Azhar Kairo jurusan Ilmu Al-Qur'an dan Tafsir. Berpengalaman 5 tahun mengajar Al-Qur'an dengan metode talaqqi dan fokus pada perbaikan makhraj huruf serta hukum tajwid.",
            location: "Jakarta Selatan, Indonesia",
            experienceYears: 5,
            expertise: ["Tahsin", "Tajwid", "Tafsir"],
            isOnline: true,
            isOffline: true,
            hourlyRate: 75000,
            currency: "IDR",
            averageRating: 0,
            totalCourses: 0,
            totalStudents: 0,
            totalReviews: 0,
            status: "pending", // Ini yang memicu munculnya tombol Verifikasi Pengajar
            bgCheckStatus: "none",
            createdAt: new Date().toISOString(),
            portfolioUrls: [
                "https://www.youtube.com/watch?v=11xO9zK7lU0",
                "https://images.unsplash.com/photo-1609599006353-e629aaab31f7?q=80&w=600&auto=format&fit=crop"
            ],
            certifications: [
                {
                    name: "Syahadah Tahsin Metode Qiroati",
                    issuer: "Lembaga Qiroati Pusat",
                    issuedDate: "2021-05-10T00:00:00Z",
                    expiryDate: "",
                    url: "https://images.unsplash.com/photo-1589330694653-efa647611536?q=80&w=600&auto=format&fit=crop"
                }
            ],
            teachingMethods: [{
                name: "Talaqqi",
                description: "Menghafal langsung face-to-face dengan guru untuk memastikan pelafalan makhraj yang tepat."
            }]
        }
    }

    const idx = (id - 1) % 5
    // Look up the name from dummyData to ensure consistency
    const found = dummyData.bookingDetails.map(bd => bd.trainer).find(t => t.id === Number(id))
    const simFound = SIM_TRAINERS[id as keyof typeof SIM_TRAINERS]

    return {
        id,
        userId: simFound?.userId ?? id,
        userName: simFound?.name ?? found?.name ?? DUMMY_NAMES[idx] ?? `Guru #${id}`,
        username: simFound?.username ?? found?.email?.split('@')[0] ?? `ustadz${id}`,
        userImage: simFound?.avatar ?? found?.avatar ?? "",
        headline: simFound?.specialty ?? found?.specialization ?? DUMMY_HEADLINES[idx] ?? "Pengajar Al-Qur'an",
        bio: DUMMY_BIOS[idx] ?? "Belum ada bio.",
        location: "Indonesia",
        experienceYears: 5 + (id % 10),
        expertise: simFound?.specialty ? [simFound.specialty as string] : (DUMMY_EXPERTISE_LIST[idx] ?? ["Tahfidz", "Tajwid"]),
        isOnline: true,
        isOffline: id % 2 === 0,
        hourlyRate: 50000 + (id % 5) * 25000,
        currency: "IDR",
        averageRating: 4.2 + ((id % 8) * 0.1),
        totalCourses: 2 + (id % 5),
        totalStudents: 20 + (id % 50),
        totalReviews: DUMMY_REVIEWS.length,
        status: "verified",
        createdAt: new Date(Date.now() - id * 30 * 24 * 3600 * 1000).toISOString(),
        portfolioUrls: DUMMY_GALLERY_URLS,
        certifications: DUMMY_CERTS,
        teachingMethods: (simFound?.specialty ? [simFound.specialty as string] : (DUMMY_EXPERTISE_LIST[idx] ?? ["Tahfidz"])).map((name) => ({
            name,
            description: getMethodInfo(name).description,
        })),
    }
}

// ── GuruDetailContent ─────────────────────────────────────────────────────────
function GuruDetailContent() {
    const params = useParams()
    const searchParams = useSearchParams()
    const fromParam = searchParams?.get("from")
    const id = Number(params?.id)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [detail, setDetail] = useState<TrainerDetail | null>(null)
    const [actionLoading, setActionLoading] = useState<"approve" | "reject" | "suspend" | "unsuspend" | "bgcheck" | "verify" | "feature" | null>(null)
    const [certLoading, setCertLoading] = useState<string | null>(null)
    const router = useRouter()
    const defaultTab = (searchParams?.get("tab") as DetailTab) || "informasi"
    const [tab, setTabState] = useState<DetailTab>(defaultTab)

    useEffect(() => {
        const currentTab = searchParams?.get("tab") as DetailTab
        if (currentTab && currentTab !== tab) {
            setTabState(currentTab)
        }
    }, [searchParams, tab])

    const setTab = (val: DetailTab) => {
        setTabState(val)
        let newUrl = `/${params?.lang || "en"}/teachers/manage/${id}?tab=${val}`
        if (fromParam) newUrl += `&from=${fromParam}`
        router.replace(newUrl, { scroll: false })
    }

    const [activeRequirement, setActiveRequirement] = useState<RequirementItem | null>(null)
    const [reviews, setReviews] = useState<ReviewItem[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [reviewsTotalCount, setReviewsTotalCount] = useState(0)
    const [courses, setCourses] = useState<CourseItem[]>([])
    const [coursesLoading, setCoursesLoading] = useState(false)
    const [coursesError, setCoursesError] = useState<string | null>(null)
    const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null)
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState("")
    const [suspendModalOpen, setSuspendModalOpen] = useState(false)
    const [suspendReason, setSuspendReason] = useState("")
    const [suspendUntil, setSuspendUntil] = useState("")
    const [copiedUserId, setCopiedUserId] = useState(false)

    function copyUserId() {
        if (!detail) return
        navigator.clipboard.writeText(String(detail.userId)).catch(() => { })
        setCopiedUserId(true)
        setTimeout(() => setCopiedUserId(false), 2000)
    }

    // ── Fetch detail ────────────────────────────────────────────────────────
    // ── Fetch detail ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return
        const token = getClientToken()
        const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }

        setLoading(true)

        // 1. Fetch Trainer Detail
        fetch(`${API_BASE_URL}/api/v1/Trainers/${id}`, { headers })
            .then(res => {
                if (res.status === 401) throw new Error(`HTTP 401 Unauthorized`)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then(json => {
                const d = json?.data ?? json
                const rawExpertise: string[] = d.expertise ?? d.subjects ?? []
                const rawHeadline: string | null = d.headline ?? d.specialization ?? null

                const s = String(d.status ?? "pending").toLowerCase()
                const validStatus: TrainerStatus = (s === "active" || s === "verified") ? "verified" : s === "suspended" ? "suspended" : s === "rejected" ? "rejected" : "pending"

                const uname = d.userName ?? d.name ?? `Guru #${id}`
                setDetail({
                    id: d.id,
                    userId: d.userId ?? SIM_TRAINERS[id as keyof typeof SIM_TRAINERS]?.userId ?? d.id,
                    userName: uname,
                    username: d.username ?? d.userUsername ?? uname.toLowerCase().replace(/\s+/g, ""),
                    userImage: d.userImage ?? d.avatar ?? "",
                    headline: normalizeHeadline(rawHeadline),
                    bio: d.bio ?? null,
                    location: d.location ?? null,
                    experienceYears: d.experienceYears ?? 0,
                    expertise: normalizeExpertise(rawExpertise),
                    isOnline: d.isOnline ?? true,
                    isOffline: d.isOffline ?? false,
                    hourlyRate: d.hourlyRate ?? d.rate ?? 0,
                    currency: d.currency ?? "IDR",
                    averageRating: d.averageRating ?? d.rating ?? 0,
                    totalCourses: d.totalCourses ?? 0,
                    totalStudents: d.totalStudents ?? 0,
                    totalReviews: d.totalReviews ?? 0,
                    status: validStatus,
                    isVerified: Boolean(d.isVerified === 1 || d.isVerified === true),
                    verificationLevel: d.verificationLevel ?? null,
                    isFeatured: Boolean(d.isFeatured === 1 || d.isFeatured === true),
                    createdAt: d.createdAt ?? new Date().toISOString(),
                    portfolioUrls: Array.isArray(d.portfolioUrls) && d.portfolioUrls.length > 0 ? d.portfolioUrls : [],
                    certifications: Array.isArray(d.certifications) && d.certifications.length > 0 ? d.certifications : [],
                    teachingMethods: Array.isArray(d.teachingMethods) ? d.teachingMethods : [],
                })
                // Clear any error if success
                setError(null)
            })
            .catch((err) => {
                // Fallback check in pendingDummies if API fails
                const fromPending = pendingDummies.find(d => String(d.id) === String(id))
                if (fromPending) {
                    setDetail({
                        id: fromPending.id,
                        userId: fromPending.userId,
                        userName: fromPending.userName,
                        username: fromPending.username,
                        userImage: "",
                        headline: fromPending.headline,
                        bio: fromPending.bio,
                        location: fromPending.location,
                        experienceYears: fromPending.experienceYears,
                        expertise: fromPending.expertise,
                        isOnline: Boolean(fromPending.isOnline),
                        isOffline: Boolean(fromPending.isOffline),
                        hourlyRate: fromPending.hourlyRate,
                        currency: fromPending.currency,
                        averageRating: 0,
                        totalCourses: 0,
                        totalStudents: 0,
                        totalReviews: 0,
                        status: "verified",
                        createdAt: fromPending.createdAt,
                        portfolioUrls: fromPending.portfolioUrls,
                        certifications: fromPending.certifications as any,
                        teachingMethods: fromPending.expertise.map(name => ({
                            name,
                            description: getMethodInfo(name).description,
                        })),
                    })
                    setError(null)
                } else {
                    try {
                        setDetail(buildFallbackDetail(id))
                        setError(null)
                    } catch (fallbackErr) {
                        setError(err.message)
                        setDetail(null)
                    }
                }
            })
            .finally(() => {
                setLoading(false)
            })
    }, [id])

    useEffect(() => {
        if (!id || !detail?.userName) return

        const token = getClientToken()
        const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }

        setCoursesLoading(true)
        // 2. Fetch Courses for this Trainer
        fetch(`${API_BASE_URL}/api/v1/Courses?Page=1&PageSize=100`, { headers })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then(json => {
                const items = Array.isArray(json) ? json : json?.data ?? json?.items ?? json?.courses ?? []
                const filteredAPI = items.filter((c: any) => {
                    const tId = c.trainerId ?? c.instructorId ?? c.teacherId ?? c.createdByTrainerId
                    if (tId && String(tId) === String(id)) return true;
                    if (c.trainerName && c.trainerName.toLowerCase() === detail.userName.toLowerCase()) return true;
                    return false;
                }).map((p: any) => ({
                    id: p.id,
                    title: p.title || p.name,
                    description: p.description || p.shortDescription,
                    price: p.packagePrice ?? p.totalPrice ?? p.price ?? p.sessionPrice ?? p.hourlyRate ?? 0,
                    currency: p.currency || "IDR",
                    sessions: p.totalSessions ?? p.sessions ?? 1,
                    level: p.levelText ?? p.level ?? "Beginner",
                    features: [],
                    isPublished: (p.isPublished === true || String(p.status).toLowerCase() === "published" || String(p.status).toLowerCase() === "active" || true),
                    totalStudents: p.students ?? p.totalStudents ?? p.totalOrders ?? p.enrolledCount ?? 0,
                    averageRating: p.rating ?? p.averageRating ?? p.avgRating ?? 0
                }))

                if (filteredAPI.length > 0) {
                    setCourses(filteredAPI)
                } else {
                    // Fallback ke dummy JSON trainerPackages jika API tidak mengembalikan data
                    const dummyCourses = dummyData.trainerPackages.filter(p => p.trainerId === id).map(p => ({
                        id: p.id,
                        title: p.name,
                        description: p.description,
                        price: p.totalPrice,
                        currency: "IDR",
                        sessions: p.sessions,
                        level: "Beginner",
                        features: [],
                        isPublished: p.status === "active",
                        totalStudents: p.totalOrders,
                        averageRating: 0
                    }))
                    setCourses(dummyCourses)
                }
            })
            .catch(() => {
                // API gagal — pakai dummy JSON trainerPackages
                const dummyCourses = dummyData.trainerPackages.filter(p => p.trainerId === id).map(p => ({
                    id: p.id,
                    title: p.name,
                    description: p.description,
                    price: p.totalPrice,
                    currency: "IDR",
                    sessions: p.sessions,
                    level: "Beginner",
                    features: [],
                    isPublished: p.status === "active",
                    totalStudents: p.totalOrders,
                    averageRating: 0
                }))
                if (dummyCourses.length > 0) {
                    setCourses(dummyCourses)
                    setCoursesError(null)
                } else {
                    setCoursesError("Data paket tidak tersedia")
                    setCourses([])
                }
            })
            .finally(() => {
                setCoursesLoading(false)
            })

        // Populate reviews dari dummy data per trainer
        const reviewsMap = (guruDetailDummy as any).reviewsByTrainer ?? {}
        const trainerReviews = reviewsMap[String(id)] ?? []
        if (trainerReviews.length > 0) {
            setReviews(trainerReviews)
            setReviewsTotalCount(trainerReviews.length)
        } else {
            // Fallback ke reviews global jika tidak ada per-trainer
            setReviews(DUMMY_REVIEWS)
            setReviewsTotalCount(DUMMY_REVIEWS.length)
        }
    }, [id, detail?.userName])

    // ── Derived ──────────────────────────────────────────────────────────────
    const requirements = useMemo(() => detail ? buildRequirements(detail) : [], [detail])
    const requiredItems = useMemo(() => requirements.filter(r => r.required), [requirements])
    const allRequiredOk = requiredItems.every(r => r.ok)

    const portfolioGallery = useMemo(() => {
        if (!detail) return []
        return detail.portfolioUrls.map((url, i) => ({
            id: i,
            url,
            kind: detectMediaKind(url),
            youtubeId: extractYoutubeId(url),
        }))
    }, [detail])

    const ratingDist = useMemo(() => {
        const dist = [0, 0, 0, 0, 0]
        reviews.forEach(r => {
            const s = Math.round(r.rating)
            if (s >= 1 && s <= 5) dist[s - 1]++
        })
        return dist
    }, [reviews])

    function getRatingBars(avg: number, dist: number[]) {
        const total = dist.reduce((s, c) => s + c, 0)
        return [5, 4, 3, 2, 1].map(star => ({
            star,
            pct: total > 0 ? Math.round((dist[star - 1] / total) * 100) : 0,
        }))
    }

    async function runAction(action: "approve" | "reject" | "suspend" | "unsuspend") {
        if (!detail || actionLoading) return
        const token = getClientToken()
        // Tidak block jika tidak ada token — fallback ke mock untuk local testing
        const endpoint =
            action === "approve" ? `${API_BASE_URL}/api/v1/Trainers/${detail.id}/review`
                : action === "reject" ? `${API_BASE_URL}/api/v1/Trainers/${detail.id}/review`
                    : action === "suspend" ? `${API_BASE_URL}/api/v1/Trainers/${detail.id}/suspend`
                        : `${API_BASE_URL}/api/v1/Trainers/${detail.id}/unsuspend`

        setActionLoading(action)
        try {
            if (action === "approve" || action === "reject") {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        approve: action === "approve" ? 1 : 0,
                        rejectionReason: action === "reject" ? (rejectReason || "Ditolak oleh admin") : null
                    })
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
            } else if (action === "suspend") {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        reason: suspendReason || "Dinonaktifkan oleh admin",
                        until: suspendUntil || null
                    })
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
            } else if (action === "unsuspend") {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
            } else {
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            const titleMap: Record<typeof action, string> = {
                approve: "Pendaftaran guru diterima", reject: "Pendaftaran guru ditolak",
                suspend: "Guru dinonaktifkan", unsuspend: "Guru diaktifkan kembali",
            }
            showToast({
                type: action === "approve" ? "success" : "info",
                title: titleMap[action],
                message: detail.userName,
                endpoint: `POST ${endpoint.replace(API_BASE_URL, "")}`,
            })
            const statusMap: Record<typeof action, TrainerStatus> = {
                approve: "verified", reject: "rejected", suspend: "suspended", unsuspend: "verified",
            }
            const newStatus = statusMap[action]
            setDetail(prev => prev ? { ...prev, status: newStatus } : null)
            try { 
                const stored = sessionStorage.getItem("guruStatuses")
                const dict = stored ? JSON.parse(stored) : {}
                dict[detail.id] = newStatus
                sessionStorage.setItem("guruStatuses", JSON.stringify(dict))
            } catch {}
        } catch (e: any) {
            // Fallback to local mutation for dummy data if API fails
            const titleMap: Record<typeof action, string> = {
                approve: "Pendaftaran guru diterima", reject: "Pendaftaran guru ditolak",
                suspend: "Guru dinonaktifkan", unsuspend: "Guru diaktifkan kembali",
            }
            showToast({
                type: action === "approve" ? "success" : "info",
                title: titleMap[action],
                message: `${detail.userName} (Mocked due to API error)`,
                endpoint: `POST ${endpoint.replace(API_BASE_URL, "")}`,
            })
            const statusMap: Record<string, TrainerStatus> = {
                approve: "verified", reject: "rejected", suspend: "suspended", unsuspend: "verified",
            }
            if (action in statusMap) {
                const newStatus = statusMap[action]
                setDetail(prev => prev ? { ...prev, status: newStatus } : null)
                try { 
                    const stored = sessionStorage.getItem("guruStatuses")
                    const dict = stored ? JSON.parse(stored) : {}
                    dict[detail.id] = newStatus
                    sessionStorage.setItem("guruStatuses", JSON.stringify(dict))
                } catch {}
            }
        } finally {
            setActionLoading(null)
        }
    }

    async function handleVerifyTrainer(isVerified: boolean) {
        if (!detail || actionLoading) return
        const token = getClientToken()
        const endpoint = `${API_BASE_URL}/api/v1/Trainers/${detail.id}/verify`
        setActionLoading("verify")
        try {
            await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ isVerified: isVerified ? 1 : 0, verificationLevel: isVerified ? 1 : null })
            })
            showToast({
                type: isVerified ? "success" : "info",
                title: isVerified ? "Guru Diverifikasi" : "Verifikasi Dibatalkan",
                message: isVerified ? `${detail.userName} mendapatkan status Admin Verified.` : `Status verifikasi admin untuk ${detail.userName} dicabut.`,
                endpoint: `POST /api/v1/Trainers/${detail.id}/verify`,
            })
            setDetail(prev => prev ? { ...prev, isVerified, verificationLevel: isVerified ? 1 : null } : null)
        } catch {
            showToast({ type: isVerified ? "success" : "info", title: isVerified ? "Guru Diverifikasi" : "Verifikasi Dibatalkan", message: `${detail.userName} (Mocked)`, endpoint: `POST /api/v1/Trainers/${detail.id}/verify` })
            setDetail(prev => prev ? { ...prev, isVerified, verificationLevel: isVerified ? 1 : null } : null)
        } finally { setActionLoading(null) }
    }

    async function handleFeatureTrainer(isFeatured: boolean) {
        if (!detail || actionLoading) return
        const token = getClientToken()
        const endpoint = `${API_BASE_URL}/api/v1/Trainers/${detail.id}/feature`
        setActionLoading("feature")
        try {
            await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ isFeatured: isFeatured ? 1 : 0 })
            })
            showToast({
                type: isFeatured ? "success" : "info",
                title: isFeatured ? "Guru Dijadikan Unggulan" : "Guru Dihapus dari Unggulan",
                message: isFeatured ? `${detail.userName} akan tampil di halaman utama marketplace.` : `${detail.userName} tidak lagi tampil sebagai guru unggulan.`,
                endpoint: `POST /api/v1/Trainers/${detail.id}/feature`,
            })
            setDetail(prev => prev ? { ...prev, isFeatured } : null)
        } catch {
            showToast({ type: isFeatured ? "success" : "info", title: isFeatured ? "Guru Dijadikan Unggulan" : "Guru Dihapus dari Unggulan", message: `${detail.userName} (Mocked)`, endpoint: `POST /api/v1/Trainers/${detail.id}/feature` })
            setDetail(prev => prev ? { ...prev, isFeatured } : null)
        } finally { setActionLoading(null) }
    }

    async function handleBackgroundCheck() {
        if (!detail || actionLoading) return
        const token = getClientToken()
        // Tidak block jika tidak ada token — fallback ke mock untuk local testing
        setActionLoading("bgcheck")
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/Trainers/${detail.id}/background-check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            showToast({
                type: "success",
                title: "Background Check Diminta",
                message: `Permintaan background check untuk ${detail.userName} berhasil dikirim.`,
                endpoint: `POST /api/v1/Trainers/${detail.id}/background-check`,
            })
            setDetail(prev => prev ? { ...prev, bgCheckStatus: "requested" } : null)
        } catch (e: any) {
            showToast({
                type: "success",
                title: "Background Check Diminta",
                message: `Permintaan background check untuk ${detail.userName} berhasil (Testing Mode).`,
                endpoint: `POST /api/v1/Trainers/${detail.id}/background-check`,
            })
            setDetail(prev => prev ? { ...prev, bgCheckStatus: "requested" } : null)
        } finally {
            setActionLoading(null)
        }
    }

    async function handleVerifyCredential(ev: any) {
        if (!detail || certLoading) return
        const token = getClientToken()
        // Tidak block jika tidak ada token — fallback ke mock
        setCertLoading(ev.url)
        try {
            let issuer = "Lembaga Terkait"
            let issueDate = new Date().toISOString()
            if (ev.value && ev.value.includes("Penerbit: ")) {
                const parts = ev.value.split(" | ")
                if (parts[0]) issuer = parts[0].replace("Penerbit: ", "").trim()
            }

            const payload = {
                credentialType: "Certification",
                credentialName: ev.label.replace("Sertifikat / Ijazah: ", "").trim(),
                issuingOrganization: issuer,
                issueDate: issueDate,
                expiryDate: null,
                documentUrl: ev.url || "",
                isVerified: 1,
                notes: "Diverifikasi oleh Admin"
            }

            const res = await fetch(`${API_BASE_URL}/api/v1/Trainers/${detail.id}/verify-credential`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            showToast({
                type: "success",
                title: "Dokumen Diverifikasi",
                message: `Dokumen ${payload.credentialName} telah ditandai valid.`,
                endpoint: `POST /api/v1/Trainers/${detail.id}/verify-credential`,
            })
        } catch (e: any) {
            showToast({
                type: "success",
                title: "Dokumen Diverifikasi (Mocked)",
                message: `Berhasil mock validasi dokumen ${ev.label}.`,
                endpoint: `POST /api/v1/Trainers/${detail.id}/verify-credential`,
            })
        } finally {
            setCertLoading(null)
        }
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-4">
            <ToastContainer />
            <RequirementModal
                item={activeRequirement}
                onClose={() => setActiveRequirement(null)}
                onVerifyCredential={handleVerifyCredential}
                loadingCert={certLoading}
            />

            {rejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-500" /> Tolak Pendaftaran Guru
                            </h3>
                            <button onClick={() => setRejectModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alasan Penolakan</label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Tulis alasan mengapa guru ini ditolak..."
                                className="w-full h-28 p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50 dark:bg-gray-800 dark:text-white resize-none"
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1.5">Alasan ini akan dikirimkan ke email guru yang bersangkutan.</p>
                        </div>
                        <div className="flex items-center gap-3 justify-end">
                            <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Batal</button>
                            <button
                                onClick={() => {
                                    setRejectModalOpen(false)
                                    runAction("reject")
                                }}
                                disabled={!rejectReason.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors inline-flex items-center gap-2"
                            >
                                Konfirmasi Penolakan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {suspendModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ShieldOff className="w-5 h-5 text-red-500" /> Nonaktifkan Guru
                            </h3>
                            <button onClick={() => setSuspendModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alasan Penonaktifan</label>
                            <textarea
                                value={suspendReason}
                                onChange={e => setSuspendReason(e.target.value)}
                                placeholder="Tulis alasan mengapa guru ini dinonaktifkan..."
                                className="w-full h-24 p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50 dark:bg-gray-800 dark:text-white resize-none"
                            ></textarea>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hingga (Opsional)</label>
                            <input
                                type="datetime-local"
                                value={suspendUntil}
                                onChange={e => setSuspendUntil(e.target.value)}
                                className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50 dark:bg-gray-800 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1.5">Kosongkan jika penonaktifan permanen/tanpa batas waktu.</p>
                        </div>
                        <div className="flex items-center gap-3 justify-end">
                            <button onClick={() => setSuspendModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Batal</button>
                            <button
                                onClick={() => {
                                    setSuspendModalOpen(false)
                                    runAction("suspend")
                                }}
                                disabled={!suspendReason.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors inline-flex items-center gap-2"
                            >
                                Konfirmasi Penonaktifan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1320px] mx-auto space-y-4">
                <div className="flex items-center gap-2">
                    <Link
                        href={
                            fromParam === "payments" ? `/${params?.lang}/billing/payments` :
                                fromParam === "orders" ? `/${params?.lang}/billing/orders` :
                                    fromParam === "payout" ? `/${params?.lang}/billing/payout` :
                                        fromParam === "refund" ? `/${params?.lang}/billing/refund` :
                                            fromParam === "sertifikat" ? `/${params?.lang}/sertifikat` :
                                                `/${params?.lang}/teachers`
                        }
                        className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-emerald-600 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profil Guru</h1>
                    </div>
                </div>

                {/* Removed error alert banner */}

                {loading ? (
                    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 space-y-4 animate-pulse">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-24" /></div>
                        </div>
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
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
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start lg:items-start">
                            {/* ══ LEFT ══ */}
                            <div className="space-y-4 min-w-0">

                                {/* ── Hero card: Fungsional, compact, trust signals inline ── */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {/* Accent bar — visual, bukan focal point */}
                                    <div className="h-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400" />

                                    <div className="p-5">
                                        {/* Row 1: Avatar + Identity + Status badge */}
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div
                                                className="relative flex-shrink-0 rounded-2xl ring-4 ring-emerald-100 dark:ring-emerald-900/40 overflow-hidden w-16 h-16 cursor-pointer hover:opacity-90 transition-opacity bg-white dark:bg-gray-800 flex items-center justify-center shadow-md"
                                                onClick={() => detail.userImage && window.open(detail.userImage, "_blank")}
                                            >
                                                {detail.userImage ? (
                                                    <Image src={detail.userImage} alt={detail.userName} fill className="object-cover" unoptimized />
                                                ) : (
                                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{detail.userName.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>

                                            {/* Identity block */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">{detail.userName}</h2>
                                                    {/* Status badge inline */}
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_CFG[detail.status]?.badge || "bg-gray-100 text-gray-700"}`}>
                                                        {detail.status === "verified" ? (
                                                            <BadgeCheck className="w-3.5 h-3.5" />
                                                        ) : detail.status === "pending" ? (
                                                            <CircleDashed className="w-3.5 h-3.5" />
                                                        ) : detail.status === "suspended" ? (
                                                            <ShieldOff className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        {STATUS_CFG[detail.status]?.label || detail.status}
                                                    </span>
                                                </div>
                                                {/* Headline — tagline profesional */}
                                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 leading-snug">
                                                    {detail.headline || "Calon Pengajar Al-Qur'an"}
                                                </p>
                                                {/* Meta row: lokasi + pengalaman + mode */}
                                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="inline-flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                                        {detail.location || "—"}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock3 className="w-3.5 h-3.5 text-blue-500" />
                                                        {detail.experienceYears} thn pengalaman
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        {detail.isOnline && detail.isOffline ? (
                                                            <Globe className="w-3.5 h-3.5 text-teal-500" />
                                                        ) : detail.isOnline ? (
                                                            <Wifi className="w-3.5 h-3.5 text-sky-500" />
                                                        ) : (
                                                            <WifiOff className="w-3.5 h-3.5 text-gray-400" />
                                                        )}
                                                        {detail.isOnline && detail.isOffline ? "Online & Offline" : detail.isOnline ? "Online" : "Offline"}
                                                    </span>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Row 2: Expertise multi-badge */}
                                        {detail.expertise.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-1.5">
                                                {detail.expertise.map(exp => {
                                                    const info = getMethodInfo(exp)
                                                    return (
                                                        <span
                                                            key={exp}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white ${info.color}`}
                                                            title={info.description}
                                                        >
                                                            <BookOpen className="w-3 h-3" />
                                                            {exp}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        )}

                                    </div>
                                </div>

                                {/* ── Quick Stats Row: 4 stat cards horizontal ── */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {(() => {
                                        // Hitung stats dari dummy data yang konsisten
                                        const packagesMap = dummyData.trainerPackages.filter((p: any) => p.trainerId === id)
                                        const ordersMap = (guruDetailDummy as any).ordersByTrainer ?? {}
                                        const trainerOrders = ordersMap[String(id)] ?? []
                                        const billingBookings = dummyData.bookings.filter((b: any) => String(b.trainerId) === String(id))
                                        const totalDummyPesanan = trainerOrders.length + billingBookings.length
                                        
                                        const dummyPaketCount = packagesMap.length || detail.totalCourses || courses.length
                                        const dummyTotalOrders = totalDummyPesanan || packagesMap.reduce((s: number, p: any) => s + (p.totalOrders || 0), 0) || courses.reduce((s: number, c: any) => s + (c.totalStudents || 0), 0)
                                        const reviewsMap = (guruDetailDummy as any).reviewsByTrainer ?? {}
                                        const trainerReviews = reviewsMap[String(id)] ?? []
                                        const reviewCount = trainerReviews.length || detail.totalReviews
                                        const avgRating = trainerReviews.length > 0
                                            ? (trainerReviews.reduce((s: number, r: any) => s + r.rating, 0) / trainerReviews.length)
                                            : detail.averageRating
                                        return (
                                            <>
                                                {/* Kursus */}
                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                                        <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                                        Kursus
                                                    </div>
                                                    <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{dummyPaketCount}</p>
                                                    <p className="text-[10px] text-gray-400">paket aktif</p>
                                                </div>
                                                {/* Murid */}
                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                                        <Users className="w-3.5 h-3.5 text-blue-500" />
                                                        Murid
                                                    </div>
                                                    <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{dummyTotalOrders}</p>
                                                    <p className="text-[10px] text-gray-400">total pesanan</p>
                                                </div>
                                                {/* Rating */}
                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                                        <Star className="w-3.5 h-3.5 text-amber-500" />
                                                        Rating
                                                    </div>
                                                    <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                                        {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">{reviewCount} ulasan</p>
                                                </div>
                                                {/* Total Pesanan */}
                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                                        <ShoppingCart className="w-3.5 h-3.5 text-violet-500" />
                                                        Total Pesanan
                                                    </div>
                                                    <p className="text-2xl font-black text-violet-600 dark:text-violet-400 leading-none">{dummyTotalOrders || "—"}</p>
                                                    <p className="text-[10px] text-gray-400">total order</p>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>

                                {/* Tabs */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="grid grid-cols-5 border-b border-gray-100 dark:border-gray-800">
                                        {[
                                            { key: "informasi" as const, label: "Informasi", icon: Info },
                                            { key: "paket" as const, label: "Paket", icon: FileText },
                                            { key: "pesanan" as const, label: "Pesanan", icon: ShoppingCart },
                                            { key: "galeri" as const, label: "Galeri", icon: ImageIcon },
                                            { key: "ulasan" as const, label: "Ulasan", icon: MessageSquare },
                                        ].map(item => {
                                            const active = tab === item.key
                                            const Icon = item.icon
                                            return (
                                                <button
                                                    key={item.key}
                                                    onClick={() => setTab(item.key)}
                                                    title={item.label}
                                                    className={`py-3 text-sm font-semibold inline-flex items-center justify-center gap-1.5 border-b-2 transition-colors ${active
                                                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/10"
                                                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                        }`}
                                                >
                                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                                    <span className="hidden sm:inline">{item.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Tab: Informasi */}
                                    {tab === "informasi" && (
                                        <div className="p-4 sm:p-5 space-y-5">

                                            {/* ── Bio: Tentang Pengajar ── */}
                                            <InfoCard icon={<Quote className="w-4 h-4 text-emerald-600" />} title="Tentang Pengajar" body={detail.bio || "Guru ini belum mengisi deskripsi diri."} />

                                            {/* ── Keahlian & Metode Mengajar ── */}
                                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                        <BookOpen className="w-4 h-4 text-violet-600" />
                                                    </div>
                                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Keahlian & Metode Mengajar</h3>
                                                </div>
                                                {detail.expertise.length === 0 ? (
                                                    <p className="text-sm text-gray-500">Belum ada keahlian yang disubmit.</p>
                                                ) : (
                                                    <div className="space-y-2.5">
                                                        {detail.expertise.map(method => {
                                                            const info = getMethodInfo(method)
                                                            const abbrev = getMethodAbbrev(method)
                                                            const custom = detail.teachingMethods.find(tm => tm.name === method)
                                                            const desc = custom?.description || info.description
                                                            return (
                                                                <div key={method} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${info.color}`}>
                                                                        {abbrev}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{method}</p>
                                                                        <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5 leading-snug">{desc}</p>
                                                                    </div>
                                                                    {/* Badge expertise */}
                                                                    <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${info.color}`}>
                                                                        {method}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Kredensial & Sertifikasi ── */}
                                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4">
                                                <div className="flex items-center justify-between gap-2 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                            <Award className="w-4 h-4 text-amber-600" />
                                                        </div>
                                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Kredensial & Sertifikasi</h3>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                                                        {detail.certifications.length} sertifikat
                                                    </span>
                                                </div>

                                                {detail.certifications.length === 0 ? (
                                                    <div className="text-center py-8 text-gray-400">
                                                        <Award className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                        <p className="text-sm font-medium">Belum ada sertifikat yang diunggah.</p>
                                                        <p className="text-xs mt-1 opacity-60">Guru perlu mengunggah ijazah/sertifikat untuk verifikasi.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {detail.certifications.map((cert, idx) => (
                                                            <div
                                                                key={`${cert.name}-${idx}`}
                                                                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                                            >
                                                                <div className="flex gap-4 p-4">
                                                                    {/* Thumbnail sertifikat */}
                                                                    {cert.url ? (
                                                                        <a href={cert.url} target="_blank" rel="noreferrer" className="flex-shrink-0 group">
                                                                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20 relative">
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img
                                                                                    src={cert.url}
                                                                                    alt={cert.name || "Sertifikat"}
                                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                                                                                />
                                                                            </div>
                                                                        </a>
                                                                    ) : (
                                                                        <div className="flex-shrink-0 w-16 h-16 rounded-lg border border-dashed border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                                                            <Award className="w-7 h-7 text-amber-300 dark:text-amber-600" />
                                                                        </div>
                                                                    )}

                                                                    {/* Detail sertifikat */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                                                                            {cert.name || `Sertifikat ${idx + 1}`}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                            {cert.issuer || "—"}
                                                                        </p>
                                                                        {/* Tanggal terbit & kadaluarsa */}
                                                                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                                                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                                                                <CalendarDays className="w-3 h-3" />
                                                                                Terbit: <span className="font-semibold text-gray-600 dark:text-gray-300">{formatDate(cert.issuedDate)}</span>
                                                                            </span>
                                                                            {cert.expiryDate && (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                                                                    <CalendarDays className="w-3 h-3" />
                                                                                    Berlaku s/d: <span className="font-semibold text-gray-600 dark:text-gray-300">{formatDate(cert.expiryDate)}</span>
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {/* TODO: credentialId field not in current API schema — tambahkan saat endpoint update */}
                                                                    </div>
                                                                </div>

                                                                {/* Link verifikasi + tombol Tandai Valid */}
                                                                {(cert.url) && (
                                                                    <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-gray-800/30">
                                                                        <a
                                                                            href={cert.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                                                                        >
                                                                            <ExternalLink className="w-3.5 h-3.5" /> Buka Dokumen
                                                                        </a>
                                                                        <button
                                                                            onClick={() => handleVerifyCredential({
                                                                                label: `Sertifikat / Ijazah: ${cert.name || `Sertifikat ${idx + 1}`}`,
                                                                                value: `Penerbit: ${cert.issuer || "—"} | Diterbitkan: ${formatDate(cert.issuedDate)}${cert.expiryDate ? ` | Berlaku hingga: ${formatDate(cert.expiryDate)}` : ""}`,
                                                                                url: cert.url,
                                                                                isCert: true,
                                                                            })}
                                                                            disabled={certLoading === cert.url}
                                                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 transition-colors disabled:opacity-50"
                                                                        >
                                                                            {certLoading === cert.url ? (
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                            ) : (
                                                                                <ShieldCheck className="w-3 h-3" />
                                                                            )}
                                                                            Tandai Valid
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Portofolio URLs ── */}
                                            {detail.portfolioUrls.length > 0 && (
                                                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                            <LinkIcon className="w-4 h-4 text-sky-600" />
                                                        </div>
                                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Portofolio & Media</h3>
                                                        <span className="ml-auto text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800/50">
                                                            {detail.portfolioUrls.length} item
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {detail.portfolioUrls.map((url, idx) => {
                                                            const kind = detectMediaKind(url)
                                                            const ytId = extractYoutubeId(url)
                                                            return (
                                                                <a
                                                                    key={idx}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-sky-400 dark:hover:border-sky-600 transition-colors group"
                                                                >
                                                                    {/* Thumbnail / icon */}
                                                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                        {kind === "video" && ytId ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img
                                                                                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                                                                alt="video thumbnail"
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        ) : kind === "image" ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img src={url} alt="portfolio" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                                                                        ) : (
                                                                            <LinkIcon className="w-5 h-5 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                                            {kind === "video" ? "📹 Video" : kind === "image" ? "🖼️ Gambar" : "🔗 Link"}{" "}
                                                                            Portofolio #{idx + 1}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{url}</p>
                                                                    </div>
                                                                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-sky-500 flex-shrink-0 transition-colors" />
                                                                </a>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab: Paket */}
                                    {tab === "paket" && (
                                        <div className="p-4 sm:p-5">
                                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                                                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/40">
                                                    {detail.userImage ? (
                                                        <Image src={detail.userImage} alt={detail.userName} fill className="object-cover" unoptimized />
                                                    ) : (
                                                        <div className="w-full h-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                                                            {detail.userName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">{detail.userName}</p>
                                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">@{detail.username}</p>
                                                </div>
                                            </div>
                                            {coursesLoading ? (
                                                <div className="space-y-3">
                                                    {[...Array(3)].map((_, i) => (
                                                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 animate-pulse">
                                                            <Skeleton className="h-4 w-48" />
                                                            <Skeleton className="h-3 w-full" />
                                                            <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-20 rounded-full" /></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : coursesError ? (
                                                <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Gagal memuat paket</p>
                                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{coursesError}</p>
                                                    </div>
                                                </div>
                                            ) : courses.length === 0 ? (
                                                <div className="rounded-xl border border-gray-100 dark:border-gray-800 py-12 text-center text-gray-400">
                                                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                    <p className="text-sm">Belum ada paket yang dibuat oleh guru ini.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {courses.map(course => (
                                                        <button
                                                            key={course.id}
                                                            onClick={() => setSelectedCourse(course)}
                                                            className="group text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all duration-200 cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${course.sessions !== null ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"}`}>
                                                                    {course.sessions !== null ? `${course.sessions} Sesi` : "-"}
                                                                </span>
                                                                {!course.isPublished && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Draft</span>}
                                                            </div>
                                                            <h6 className="text-sm font-bold text-gray-900 dark:text-white leading-snug mb-1 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{course.title}</h6>
                                                            {course.level && <p className="text-[10px] text-gray-400 mb-2">{course.level}</p>}
                                                            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-auto">
                                                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Harga Paket</p>
                                                                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {course.price > 0 ? formatCurrency(course.price, course.currency) : <span className="text-gray-400 font-normal text-sm">Gratis</span>}
                                                                </p>
                                                                <div className="flex items-center justify-between mt-2">
                                                                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                                        <Users className="w-3 h-3" />
                                                                        {course.totalStudents} Pendaftar
                                                                    </span>
                                                                    {course.averageRating > 0 && (
                                                                        <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                                                                            <Star className="w-3 h-3 fill-amber-400" />
                                                                            {course.averageRating.toFixed(1)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab: Galeri */}
                                    {tab === "galeri" && (
                                        <div className="p-4 sm:p-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {portfolioGallery.length === 0
                                                    ? DUMMY_GALLERY_URLS.map((url, idx) => (
                                                        <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                                            <div className="aspect-video relative overflow-hidden">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={url} alt={`Foto kegiatan ${idx + 1}`} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="p-3">
                                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Foto Kegiatan Mengajar {idx + 1}</p>
                                                                <p className="text-[10px] text-gray-400 mt-0.5">Portofolio pengajaran guru</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                    : portfolioGallery.map(item => (
                                                        <div key={item.id} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                                            {item.kind === "video" && item.youtubeId ? (
                                                                <div className="aspect-video">
                                                                    <iframe
                                                                        src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0`}
                                                                        title={item.url}
                                                                        className="w-full h-full border-0"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                    />
                                                                </div>
                                                            ) : item.kind === "image" ? (
                                                                <div className="aspect-video relative">
                                                                    <Image src={item.url} alt="portfolio" fill className="object-cover" unoptimized />
                                                                </div>
                                                            ) : (
                                                                <div className="aspect-video flex items-center justify-center bg-slate-50 dark:bg-slate-800/40">
                                                                    <LinkIcon className="w-8 h-8 text-slate-400" />
                                                                </div>
                                                            )}
                                                            <div className="p-3">
                                                                <p className="text-xs text-gray-600 dark:text-gray-300 break-all">{item.url}</p>
                                                                <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                                                                    <ExternalLink className="w-3 h-3" /> Buka link
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab: Ulasan */}
                                    {tab === "ulasan" && (
                                        <div className="p-4 sm:p-5">
                                            {reviewsLoading ? (
                                                <div className="space-y-3">
                                                    {[...Array(3)].map((_, i) => (
                                                        <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-2 animate-pulse">
                                                            <div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-3 w-24" /></div>
                                                            <Skeleton className="h-3 w-full" />
                                                            <Skeleton className="h-3 w-3/4" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : reviews.length === 0 ? (
                                                <div className="rounded-xl border border-gray-100 dark:border-gray-800 py-12 text-center text-gray-400">
                                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                    <p className="text-sm">Belum ada ulasan dari murid untuk guru ini.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {/* Rating summary */}
                                                    {(() => {
                                                        const avgRating = detail?.averageRating || (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) || 0
                                                        const total = reviewsTotalCount || reviews.length
                                                        const bars = getRatingBars(avgRating, ratingDist)
                                                        return (
                                                            <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col sm:flex-row gap-6 items-center mb-2">
                                                                <div className="flex flex-col items-center flex-shrink-0">
                                                                    <p className="text-5xl font-black text-gray-900 dark:text-white leading-none">{avgRating.toFixed(1)}</p>
                                                                    <div className="flex items-center gap-0.5 my-2">
                                                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"}`} />)}
                                                                    </div>
                                                                    <p className="text-xs text-gray-400">{total} ulasan</p>
                                                                </div>
                                                                <div className="flex-1 w-full space-y-2">
                                                                    {bars.map(({ star, pct }) => (
                                                                        <div key={star} className="flex items-center gap-2">
                                                                            <span className="text-[11px] text-gray-500 w-3 text-right flex-shrink-0">{star}</span>
                                                                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                                                                            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                                                                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                                                                            </div>
                                                                            <span className="text-[10px] text-gray-400 w-7 text-right flex-shrink-0">{pct}%</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    })()}
                                                    {reviews.map(rev => (
                                                        <div key={rev.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100 dark:ring-gray-800">
                                                                    {rev.reviewerAvatar ? (
                                                                        <Image src={rev.reviewerAvatar} alt={rev.reviewerName} fill className="object-cover" unoptimized />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-sm">
                                                                            {rev.reviewerName.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                        <p className="text-xs font-bold text-gray-900 dark:text-white">{rev.reviewerName}</p>
                                                                        <p
                                                                            className="text-[10px] text-gray-400 cursor-default relative group/date"
                                                                        >
                                                                            {formatDate(rev.createdAt)}
                                                                            {/* Tooltip */}
                                                                            <span className="absolute bottom-full right-0 mb-1.5 hidden group-hover/date:block z-50 pointer-events-none">
                                                                                <span className="bg-gray-900 dark:bg-gray-700 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap block">
                                                                                    {formatDateTimeWithTZ(rev.createdAt)}
                                                                                </span>
                                                                                <span className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></span>
                                                                            </span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-0.5 mt-0.5 mb-2">
                                                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"}`} />)}
                                                                        <span className="text-[10px] text-gray-500 ml-1">{rev.rating}/5</span>
                                                                    </div>
                                                                    {rev.comment ? (
                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{rev.comment}</p>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-400 italic">Tidak ada komentar.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab: Pesanan */}
                                    {tab === "pesanan" && (
                                        <TeacherOrdersTab trainerId={detail.id} locale={(Array.isArray(params?.lang) ? params.lang[0] : params?.lang) || "id"} />
                                    )}

                                    {/* Tab: Wallet dihapus */}
                                </div>
                            </div>

                            {/* ══ RIGHT SIDEBAR ══ */}
                            <div className="space-y-3 order-last lg:order-last">

                                {/* ── Card: Tindakan ── */}
                                {detail.status !== "pending" && (
                                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        {/* Header dengan left accent */}
                                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-gray-800 border-l-4 border-l-blue-500">
                                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tindakan Admin</h3>
                                        </div>

                                        <div className="p-4 space-y-2.5">
                                            {/* Background Check */}
                                            <div className="pb-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Verifikasi Latar Belakang</p>
                                                {detail.bgCheckStatus === "completed" ? (
                                                    <div className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 text-xs font-bold py-2.5">
                                                        <CheckCircle2 className="w-4 h-4" /> Lolos Background Check
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={handleBackgroundCheck}
                                                            disabled={!!actionLoading || detail.bgCheckStatus === "requested"}
                                                            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl disabled:opacity-80 text-white text-sm font-semibold py-2.5 transition-colors ${detail.bgCheckStatus === "requested"
                                                                    ? "bg-indigo-400 cursor-not-allowed"
                                                                    : "bg-blue-500 hover:bg-blue-600"
                                                                }`}
                                                        >
                                                            {actionLoading === "bgcheck" ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : detail.bgCheckStatus === "requested" ? (
                                                                <Hourglass className="w-4 h-4 animate-pulse" />
                                                            ) : (
                                                                <ShieldCheck className="w-4 h-4" />
                                                            )}
                                                            {detail.bgCheckStatus === "requested" ? "Pemeriksaan Berjalan..." : "Minta Background Check"}
                                                        </button>
                                                        {detail.bgCheckStatus === "requested" && (
                                                            <button
                                                                onClick={() => setDetail(prev => prev ? { ...prev, bgCheckStatus: "completed" } : null)}
                                                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold py-1.5 transition-colors"
                                                            >
                                                                [Testing] Selesaikan Pemeriksaan
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Status-dependent actions */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Status Guru</p>
                                                {detail.status === "verified" && (
                                                    <button
                                                        onClick={() => setSuspendModalOpen(true)}
                                                        disabled={!!actionLoading}
                                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 hover:bg-red-500 hover:border-red-500 text-red-600 dark:text-red-400 hover:text-white text-sm font-bold py-2.5 transition-all disabled:opacity-60"
                                                    >
                                                        {actionLoading === "suspend" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                                                        Nonaktifkan Guru
                                                    </button>
                                                )}
                                                {detail.status === "suspended" && (
                                                    <button
                                                        onClick={() => runAction("unsuspend")}
                                                        disabled={!!actionLoading}
                                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold py-2.5 transition-colors"
                                                    >
                                                        {actionLoading === "unsuspend" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                        Aktifkan Kembali
                                                    </button>
                                                )}
                                                {detail.status === "rejected" && (
                                                    <button
                                                        onClick={() => runAction("approve")}
                                                        disabled={!!actionLoading || !allRequiredOk}
                                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-bold py-2.5 transition-colors"
                                                    >
                                                        {actionLoading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                                                        Terima Sekarang
                                                    </button>
                                                )}
                                            </div>

                                            {/* Verify Trainer */}
                                            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Verifikasi Admin</p>
                                                {detail.isVerified ? (
                                                    <div className="space-y-2">
                                                        <div className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold py-2.5">
                                                            <BadgeCheck className="w-4 h-4" />
                                                            Admin Verified {detail.verificationLevel ? `(Level ${detail.verificationLevel})` : ""}
                                                        </div>
                                                        <button
                                                            onClick={() => handleVerifyTrainer(false)}
                                                            disabled={!!actionLoading}
                                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold py-2 transition-colors disabled:opacity-60"
                                                        >
                                                            {actionLoading === "verify" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                                            Batalkan Verifikasi
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleVerifyTrainer(true)}
                                                        disabled={!!actionLoading}
                                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-bold py-2.5 transition-colors"
                                                    >
                                                        {actionLoading === "verify" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                                                        Verifikasi Guru
                                                    </button>
                                                )}
                                            </div>

                                            {/* Feature Trainer */}
                                            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Guru Unggulan</p>
                                                {detail.isFeatured ? (
                                                    <div className="space-y-2">
                                                        <div className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-xs font-bold py-2.5">
                                                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                                            Guru Unggulan Aktif
                                                        </div>
                                                        <button
                                                            onClick={() => handleFeatureTrainer(false)}
                                                            disabled={!!actionLoading}
                                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold py-2 transition-colors disabled:opacity-60"
                                                        >
                                                            {actionLoading === "feature" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                                            Hapus dari Unggulan
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleFeatureTrainer(true)}
                                                        disabled={!!actionLoading}
                                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold py-2.5 transition-colors"
                                                    >
                                                        {actionLoading === "feature" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                                                        Jadikan Unggulan
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                )}

                                {/* ── Card: Info Akun ── */}
                                <div className="bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Info Akun</h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {/* ID User + copy */}
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">ID User</p>
                                            <div className="flex items-center gap-1.5">
                                                <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-lg truncate">
                                                    {detail.userId}
                                                </code>
                                                <button
                                                    onClick={copyUserId}
                                                    title="Salin ID User"
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 ${copiedUserId
                                                            ? "bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400"
                                                            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-emerald-600 hover:border-emerald-400"
                                                        }`}
                                                >
                                                    {copiedUserId
                                                        ? <Check className="w-3.5 h-3.5" />
                                                        : <Copy className="w-3.5 h-3.5" />
                                                    }
                                                </button>
                                            </div>
                                            {copiedUserId && (
                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">✓ Tersalin ke clipboard</p>
                                            )}
                                        </div>

                                        {/* Tgl Daftar */}
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                                <CalendarDays className="w-3.5 h-3.5" />
                                                Tgl Daftar
                                            </span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(detail.createdAt)}</span>
                                        </div>

                                        {/* Mode Mengajar */}
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                                {detail.isOnline && detail.isOffline ? (
                                                    <Globe className="w-3.5 h-3.5" />
                                                ) : detail.isOnline ? (
                                                    <Wifi className="w-3.5 h-3.5" />
                                                ) : (
                                                    <WifiOff className="w-3.5 h-3.5" />
                                                )}
                                                Mode
                                            </span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                {detail.isOnline && detail.isOffline ? "Online & Offline"
                                                    : detail.isOnline ? "Online"
                                                        : "Offline"}
                                            </span>
                                        </div>

                                        {/* Tarif */}
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                                <Coins className="w-3.5 h-3.5" />
                                                Tarif/Jam
                                            </span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(detail.hourlyRate, detail.currency)}
                                            </span>
                                        </div>

                                        {/* Link Profil User */}
                                        <Link
                                            href={`/${params?.lang || "en"}/users/manage/${detail.userId}`}
                                            className="mt-1 w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-3 py-2 rounded-xl transition-colors"
                                        >
                                            <User className="w-3.5 h-3.5" />
                                            Lihat Profil User
                                        </Link>
                                    </div>
                                </div>

                                {/* ── Card: Statistik Pengajaran ── */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                        <Star className="w-4 h-4 text-amber-500" />
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Statistik Pengajaran</h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {/* Rating besar */}
                                        {detail.averageRating > 0 && (
                                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                                                <p className="text-4xl font-black text-gray-900 dark:text-white leading-none">{detail.averageRating.toFixed(1)}</p>
                                                <div>
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(detail.averageRating) ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"}`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{detail.totalReviews} ulasan</p>
                                                </div>
                                            </div>
                                        )}
                                        <StatRow icon={<BookOpen className="w-3.5 h-3.5 text-emerald-500" />} label="Total Kursus" value={`${detail.totalCourses}`} />
                                        <StatRow icon={<Users className="w-3.5 h-3.5 text-blue-500" />} label="Total Murid" value={`${detail.totalStudents}`} />
                                        <StatRow icon={<Award className="w-3.5 h-3.5 text-amber-500" />} label="Sertifikat" value={`${detail.certifications.length}`} />
                                        <StatRow icon={<LinkIcon className="w-3.5 h-3.5 text-sky-500" />} label="Portfolio" value={`${detail.portfolioUrls.length} item`} />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Course Detail Modal ──────────────────────────────────────────── */}
            {selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <button className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedCourse(null)} />
                    <div className="relative flex max-h-[92vh] w-full sm:max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-950 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Detail Paket</h2>
                                <p className="text-[10px] text-gray-400 mt-0.5">ID: {selectedCourse.id}</p>
                            </div>
                            <button onClick={() => setSelectedCourse(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-5 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${selectedCourse.isPublished
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${selectedCourse.isPublished ? "bg-emerald-500" : "bg-gray-400"}`} />
                                    {selectedCourse.isPublished ? "Published" : "Unpublished"}
                                </span>
                                {selectedCourse.sessions !== null && (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                        <BookOpen className="w-3 h-3" />
                                        {selectedCourse.sessions} Sesi
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white">{selectedCourse.title}</h3>
                                {selectedCourse.level && <p className="text-sm text-gray-500 mt-1">{selectedCourse.level}</p>}
                            </div>
                            {selectedCourse.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selectedCourse.description}</p>
                            )}
                            {detail && (
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/40">
                                        {detail.userImage ? (
                                            <Image src={detail.userImage} alt={detail.userName} fill className="object-cover" unoptimized />
                                        ) : (
                                            <div className="w-full h-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 flex items-center justify-center font-bold">
                                                {detail.userName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{detail.userName}</p>
                                        <p className="text-xs text-gray-500">@{detail.username}</p>
                                    </div>
                                    {selectedCourse.averageRating > 0 && (
                                        <div className="flex items-center gap-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                            {selectedCourse.averageRating.toFixed(1)}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Harga Paket</p>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                    {selectedCourse.price > 0 ? formatCurrency(selectedCourse.price, selectedCourse.currency) : "Gratis"}
                                </p>
                                {selectedCourse.sessions !== null && (
                                    <p className="text-xs text-gray-500 mt-1">{selectedCourse.sessions} sesi</p>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <Users className="w-4 h-4" />
                                    <span className="font-semibold text-gray-900 dark:text-white">{selectedCourse.totalStudents}</span> Pendaftar
                                </div>
                                {selectedCourse.averageRating > 0 && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        <span className="font-semibold text-gray-900 dark:text-white">{selectedCourse.averageRating.toFixed(1)}</span> Rating
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

}

function InfoCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
    return (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">{icon}</div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{body}</p>
        </div>
    )
}

function StatRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                {icon}
                {label}
            </span>
            <span className="text-gray-900 dark:text-white font-semibold text-right">{value || "-"}</span>
        </div>
    )
}

export default function GuruDetailPage() {
    return (
                <GuruDetailContent />
    )
}
