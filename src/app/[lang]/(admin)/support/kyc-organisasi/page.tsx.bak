"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, Filter, MoreHorizontal, Calendar,
    ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
    Building2, Users, ChevronDown, Check,
    X, FileText, Mail, Phone, MapPin, Globe,
    Building, AlertCircle, CheckCircle, Eye, RotateCcw
} from "lucide-react"
import rawData from "@/data/kyc-dummy.json"

// ─── Types ────────────────────────────────────────────────────────────────────
type KycOrg = {
    id: number
    nama: string
    singkatan?: string
    avatar: string
    avatarBg: string
    gradientFrom: string
    gradientTo: string
    tipe: string[]
    kategori: string
    user: string
    userUsername?: string
    tglPengajuan: string
    status: "menunggu" | "disetujui" | "ditolak"
    namaResmi: string
    email: string
    telepon: string
    alamat: string
    website: string
    deskripsi: string
    lat: string
    lng: string
}

const DATA: KycOrg[] = rawData.kyc_organisasi as KycOrg[]

// ─── Tipe badge config ────────────────────────────────────────────────────────
const TIPE_CONFIG: Record<string, { cls: string; icon: React.ReactNode }> = {
    YAYASAN: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    PESANTREN: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    LEMBAGA: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    KOMUNITAS: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    MADRASAH: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    PENDIDIKAN: { cls: "bg-blue-100 text-blue-700 border border-blue-200", icon: <Users className="w-3 h-3 mr-1 inline" /> },
}

const STATUS_CONFIG = {
    menunggu: { label: "Pending", cls: "bg-amber-50 text-amber-600 border border-amber-200", icon: Clock },
    disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: CheckCircle2 },
    ditolak: { label: "Ditolak", cls: "bg-red-50 text-red-600 border border-red-200", icon: XCircle },
}

const STATUS_BADGE: Record<string, string> = {
    menunggu: "bg-amber-100 text-amber-700 border border-amber-200",
    disetujui: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    ditolak: "bg-red-100 text-red-600 border border-red-200",
}

// ─── Toast Component ───────────────────────────────────────────────────────
type ToastData = { id: number; message: string; type: "success" | "error" }

function Toast({ toasts, onRemove }: { toasts: ToastData[]; onRemove: (id: number) => void }) {
    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto
                        animate-in slide-in-from-right-5 duration-300
                        ${t.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                            : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                        }`}
                >
                    {t.type === "success"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    }
                    <span>{t.message}</span>
                    <button
                        onClick={() => onRemove(t.id)}
                        className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    )
}

// ─── Per-Page Custom Dropdown ─────────────────────────────────────────────────
const PER_PAGE_OPTIONS = [10, 25, 50, 100]

function PerPageSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative inline-block ml-2">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                {value} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {open && (
                <div
                    className="absolute bottom-full left-0 mb-1 w-28 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1"
                    onMouseLeave={() => setOpen(false)}
                >
                    {PER_PAGE_OPTIONS.map(n => (
                        <button
                            key={n}
                            onClick={() => { onChange(n); setOpen(false) }}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${value === n
                                ? "bg-orange-50 dark:bg-emerald-900/20 text-gray-900 dark:text-white font-medium"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                }`}
                        >
                            {n}
                            {value === n && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Dropdown Aksi ────────────────────────────────────────────────────────────
function AksiDropdown({ id, onView }: { id: number; onView: () => void }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative" onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                    onMouseLeave={() => setOpen(false)}
                >
                    <button
                        onClick={() => setOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Setujui
                    </button>
                    <button
                        onClick={() => setOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Tolak
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Dokumen Card (persis MagangHub) ─────────────────────────────────────────────────
function DocCard({
    nama, file, warning, hasValidasi, noPreview, iconType,
}: {
    nama: string
    file?: string
    warning?: string
    hasValidasi?: boolean
    noPreview?: boolean
    iconType?: "doc" | "building"
}) {
    const IconComp = iconType === "building" ? Building2 : FileText
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
            {/* Card header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
                <div className="flex items-start gap-2.5">
                    <IconComp className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">{nama}</p>
                        {warning && (
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mt-0.5">{warning}</p>
                        )}
                    </div>
                </div>
                {/* Plain ✓ and × — no button border, just icons */}
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <button className="text-gray-300 hover:text-emerald-500 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Card body — plain white area, file name at bottom (lebih tinggi seperti MagangHub) */}
            <div className="mx-4 mb-3 h-28 rounded-lg bg-white dark:bg-gray-800/30 flex items-end justify-center pb-2">
                {noPreview ? (
                    <div className="flex flex-col items-center gap-1 mb-6">
                        <Eye className="w-5 h-5 text-gray-300" />
                        <span className="text-xs text-gray-400">No Preview</span>
                    </div>
                ) : file ? (
                    <span className="text-xs text-blue-400 dark:text-blue-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {file}
                    </span>
                ) : null}
            </div>

            {/* Validasi Real-time button */}
            {hasValidasi && (
                <div className="px-4 pb-4">
                    <button className="w-full py-2 bg-gray-900 dark:bg-gray-950 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                        Validasi Real-time
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── KYC Detail Modal ─────────────────────────────────────────────────────────
function KycDetailModal({
    org,
    onClose,
    onUpdateStatus,
}: {
    org: KycOrg
    onClose: () => void
    onUpdateStatus: (id: number, status: "disetujui" | "ditolak", rejectionReason?: string) => void
}) {
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [selectedReasons, setSelectedReasons] = useState<string[]>([])
    const [additionalNote, setAdditionalNote] = useState("")

    const REJECTION_REASONS = [
        "Data Penanggung Jawab Tidak Lengkap",
        "Surat Kuasa Tidak Ditandatangani",
        "Kualitas Dokumen Buruk (Blur)",
        "Indikasi Data Palsu",
        "NIB Tidak Valid / Kadaluwarsa",
        "NPWP Tidak Sesuai",
        "SK Kemenkumham Tidak Ditemukan",
        "Alamat Tidak Sesuai Akta",
        "NPSN Tidak Terdaftar di Dapodik",
        "Akreditasi Tidak Valid",
        "Izin Operasional Kadaluwarsa",
        "Bukan Institusi Pendidikan Resmi",
    ]

    const toggleReason = (reason: string) => {
        setSelectedReasons(prev =>
            prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
        )
    }

    const handleConfirmReject = () => {
        const fullReason = [...selectedReasons, ...(additionalNote.trim() ? [additionalNote] : [])].join(". ")
        onUpdateStatus(org.id, "ditolak", fullReason)
        setShowRejectModal(false)
        onClose()
    }

    const [docTab, setDocTab] = useState<"umum" | "industri" | "pendidikan">("umum")

    const hasPendidikan = org.tipe.includes("PENDIDIKAN") || org.tipe.includes("MADRASAH")

    const statusBadge = STATUS_BADGE[org.status]
    const statusLabel = STATUS_CONFIG[org.status].label.toUpperCase()

    // Dokumen per tab
    const dokumenUmum = [
        { nama: "KTP Penanggung Jawab", file: `KTP-${org.user.replace(" ", "")}.jpg`, warning: undefined, hasValidasi: false, noPreview: false },
        { nama: "Foto Gedung / Kantor", file: `gedung-${org.singkatan?.toLowerCase() || org.id}.jpg`, warning: undefined, hasValidasi: false, noPreview: false },
        { nama: "Surat Keabsahan Dokumen", file: `SK-Penunjukan-${org.singkatan || "ORG"}-...`, warning: undefined, hasValidasi: false, noPreview: false },
    ]
    const dokumenIndustri = [
        { nama: "Nomor Induk Berusaha (NIB)", file: `91203${org.id}334444`, warning: org.status === "ditolak" ? "NIB TIDAK VALID" : undefined, hasValidasi: true, noPreview: false },
        { nama: "NPWP Badan", file: `01.234.567.${org.id}-012.000`, warning: undefined, hasValidasi: false, noPreview: false },
        { nama: "SK Kemenkumham", file: undefined, warning: undefined, hasValidasi: false, noPreview: false },
    ]
    const dokumenPendidikan = [
        { nama: "NPSN (Nomor Pokok Sekolah Nasional)", file: `2021${org.id}345`, warning: "CEK DI DATA KEMDIKBUD", hasValidasi: true, noPreview: false },
        { nama: "Izin Operasional Sekolah", file: undefined, warning: undefined, hasValidasi: false, noPreview: true },
        { nama: "Bukti Akreditasi", file: undefined, warning: undefined, hasValidasi: false, noPreview: false },
    ]

    const currentDocs = docTab === "umum" ? dokumenUmum : docTab === "industri" ? dokumenIndustri : dokumenPendidikan

    const infoAlert = docTab === "industri"
        ? "Pastikan NIB terdaftar dan aktif di portal validasi OSS."
        : docTab === "pendidikan"
            ? "Verifikasi NPSN dan status akreditasi melalui PDDIKTI/Dapodik."
            : null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Panel — hampir memenuhi layar seperti MagangHub */}
            <div className="relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxWidth: "calc(100vw - 80px)", height: "96vh" }}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Building className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Verifikasi Organisasi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusBadge}`}>
                            {statusLabel}
                        </span>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Body (2 cols) ── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left: Org Info — lebar dan no visible scrollbar */}
                    <div
                        className="w-[370px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: 'none' }}
                    >
                        <div className="p-9">
                            {/* Avatar: bulat penuh */}
                            <div
                                className="w-[110px] h-[110px] rounded-full mx-auto mb-5 shadow-md"
                                style={{ background: `linear-gradient(135deg, ${org.gradientFrom}, ${org.gradientTo})` }}
                            />

                            {/* Name + badges */}
                            <h2 className="text-center font-bold text-gray-900 dark:text-white text-base mb-2 leading-snug">{org.nama}</h2>
                            <div className="flex flex-wrap justify-center gap-1 mb-3">
                                {org.tipe.map(t => {
                                    const conf = TIPE_CONFIG[t] ?? { cls: "bg-gray-100 text-gray-600 border border-gray-200", icon: null }
                                    return (
                                        <span key={t} className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${conf.cls}`}>
                                            {conf.icon}{t}
                                        </span>
                                    )
                                })}
                            </div>

                            {/* Description — dark gray (bukan biru) */}
                            {org.deskripsi && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-4">{org.deskripsi}</p>
                            )}

                            {/* Contact section */}
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Informasi Kontak &amp; Lokasi</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { icon: Building, label: "NAMA RESMI", value: org.namaResmi },
                                        { icon: Mail, label: "EMAIL PERUSAHAAN", value: org.email },
                                        { icon: Phone, label: "NOMOR TELEPON", value: org.telepon },
                                        { icon: MapPin, label: "ALAMAT", value: org.alamat },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-start gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <item.icon className="w-3.5 h-3.5 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{item.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {org.website && (
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Globe className="w-3.5 h-3.5 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">WEBSITE</p>
                                                <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 block hover:underline">{org.website}</a>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Koordinat */}
                                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-center">
                                    <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Peta Belum Tersedia</p>
                                    <p className="text-[10px] text-gray-400">Integrasi Maps dinonaktifkan sementara.</p>
                                    <div className="mt-2 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <span className="text-[10px] text-gray-500">Koordinat: {org.lat}, {org.lng}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Dokumen Legalitas */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-5 pb-3 flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Dokumen Legalitas</h3>
                            <p className="text-sm text-gray-400 mb-4">Periksa keabsahan dokumen yang diunggah.</p>

                            {/* Doc tabs */}
                            <div className="flex gap-2">
                                {(["umum", "industri", ...(hasPendidikan ? ["pendidikan"] : [])] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setDocTab(tab as typeof docTab)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize border transition-colors ${docTab === tab
                                            ? "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white shadow-sm"
                                            : "border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            }`}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Doc content */}
                        <div className="flex-1 overflow-y-auto px-5 pb-5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                            {/* Info alert */}
                            {infoAlert && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300 mb-4">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    {infoAlert}
                                </div>
                            )}

                            {/* Document grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {currentDocs.map((doc, i) => (
                                    <DocCard key={i} {...doc} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        ID: #{org.id.toString().padStart(3, "0")}
                    </span>
                    <div className="flex items-center gap-3">
                        {org.status !== "ditolak" && (
                            <button
                                onClick={() => { setSelectedReasons([]); setAdditionalNote(""); setShowRejectModal(true) }}
                                className="flex items-center gap-2 px-5 py-2 border-2 border-red-300 dark:border-red-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold rounded-xl transition-colors"
                            >
                                <XCircle className="w-4 h-4" /> Tolak
                            </button>
                        )}
                        {org.status !== "disetujui" && (
                            <button
                                onClick={() => { onUpdateStatus(org.id, "disetujui"); onClose() }}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Setujui
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Reject Reason Modal ── */}
                {showRejectModal && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
                        {/* Backdrop - NO BLUR */}
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowRejectModal(false)} />
                        
                        <div className="relative bg-white dark:bg-gray-900 rounded-[28px] shadow-2xl p-8 w-[600px] max-w-full animate-in fade-in zoom-in duration-200">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tolak Organisasi?</h3>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6 font-medium leading-relaxed">
                                Organisasi akan menerima notifikasi penolakan dan harus memperbaiki data.
                            </p>

                            <div className="space-y-3 mb-6">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none pl-1">Pilih Alasan (Maks. 3)</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {REJECTION_REASONS.map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => toggleReason(reason)}
                                            disabled={selectedReasons.length >= 3 && !selectedReasons.includes(reason)}
                                            className={`px-3.5 py-2 rounded-full border text-[11px] font-bold transition-all ${
                                                selectedReasons.includes(reason)
                                                    ? "bg-[#FF7070] border-[#FF7070] text-white shadow-md shadow-red-500/10"
                                                    : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                            }`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 mb-8">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 leading-none">Pesan Tambahan</span>
                                <textarea
                                    rows={3}
                                    value={additionalNote}
                                    onChange={setAdditionalNote ? e => setAdditionalNote(e.target.value) : undefined}
                                    placeholder="Contoh: Dokumen NIB buram, mohon upload ulang..."
                                    className="w-full px-4 py-3.5 text-[13px] border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all resize-none placeholder:text-gray-400"
                                />
                            </div>

                            <div className="flex gap-3 justify-end items-center">
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-100 dark:border-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    disabled={selectedReasons.length === 0 && !additionalNote.trim()}
                                    onClick={handleConfirmReject}
                                    className="px-8 py-2.5 bg-[#FF7070] hover:bg-[#FF5C5C] disabled:opacity-40 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
                                >
                                    Konfirmasi Penolakan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Filter Constants ─────────────────────────────────────────────────────────
const TIPE_OPTIONS = ["Industri", "Pendidikan"] as const
const KATEGORI_PENDIDIKAN = ["Kursus", "Lembaga Pelatihan", "Perguruan Tinggi", "Pesantren", "SMA", "SMK", "Yayasan Pendidikan"] as const
const KATEGORI_PERUSAHAAN = ["Finansial", "Kesehatan", "Konstruksi", "Kreatif", "Logistik", "Manufaktur", "Pertambangan", "Teknologi"] as const

type FilterState = {
    tipe: string[]
    kategoriPendidikan: string[]
    kategoriPerusahaan: string[]
}
const EMPTY_FILTER: FilterState = { tipe: [], kategoriPendidikan: [], kategoriPerusahaan: [] }

// ─── FilterModal Component ────────────────────────────────────────────────────
function FilterModal({
    initial,
    onApply,
    onClose,
}: {
    initial: FilterState
    onApply: (f: FilterState) => void
    onClose: () => void
}) {
    const [draft, setDraft] = useState<FilterState>({
        tipe: [...initial.tipe],
        kategoriPendidikan: [...initial.kategoriPendidikan],
        kategoriPerusahaan: [...initial.kategoriPerusahaan],
    })

    const toggle = (key: keyof FilterState, val: string) => {
        setDraft(prev => ({
            ...prev,
            [key]: prev[key].includes(val)
                ? prev[key].filter(v => v !== val)
                : [...prev[key], val],
        }))
    }

    const ChipBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${active
                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-gray-800"
                }`}
        >
            {label}
        </button>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Filter Data</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                    <p className="text-sm text-emerald-500 mb-5">tampilkan data spesifik berdasarkan kriteria.</p>

                    {/* ── Tipe Organisasi ── */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tipe Organisasi</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {TIPE_OPTIONS.map(t => (
                                <button
                                    key={t}
                                    onClick={() => toggle("tipe", t)}
                                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${draft.tipe.includes(t)
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-gray-800"
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Kategori Pendidikan ── */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Kategori Pendidikan</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {KATEGORI_PENDIDIKAN.map(k => (
                                <ChipBtn
                                    key={k}
                                    label={k}
                                    active={draft.kategoriPendidikan.includes(k)}
                                    onClick={() => toggle("kategoriPendidikan", k)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ── Kategori Perusahaan ── */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Kategori Perusahaan</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {KATEGORI_PERUSAHAAN.map(k => (
                                <ChipBtn
                                    key={k}
                                    label={k}
                                    active={draft.kategoriPerusahaan.includes(k)}
                                    onClick={() => toggle("kategoriPerusahaan", k)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setDraft(EMPTY_FILTER)}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                        </button>
                        <button
                            onClick={() => { onApply(draft); onClose() }}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function KycOrganisasiContent() {
    const [activeTab, setActiveTab] = useState<"menunggu" | "disetujui" | "ditolak" | "semua">("menunggu")
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(10)
    const [selectedOrg, setSelectedOrg] = useState<KycOrg | null>(null)
    const [showFilter, setShowFilter] = useState(false)
    const [appliedFilter, setAppliedFilter] = useState<FilterState>(EMPTY_FILTER)
    const [orgs, setOrgs] = useState<KycOrg[]>(DATA)

    // Toast state
    const [toasts, setToasts] = useState<ToastData[]>([])
    const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))
    const showToast = (message: string, type: "success" | "error") => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => removeToast(id), 3500)
    }

    const handleUpdateStatus = (id: number, status: "disetujui" | "ditolak", rejectionReason?: string) => {
        const org = orgs.find(o => o.id === id)
        setOrgs(prev => prev.map(o =>
            o.id === id
                ? {
                    ...o,
                    status,
                    ...(rejectionReason ? { rejectionReason } : {}),
                }
                : o
        ))
        setSelectedOrg(null)
        if (status === "disetujui") {
            showToast(`✓ KYC ${org?.nama ?? "Organisasi"} berhasil disetujui`, "success")
        } else {
            showToast(`✗ KYC ${org?.nama ?? "Organisasi"} telah ditolak`, "error")
        }
    }

    const filteredData = useMemo(() => {
        let data = orgs
        if (activeTab !== "semua") data = data.filter(d => d.status === activeTab)
        if (search.trim()) data = data.filter(d =>
            d.nama.toLowerCase().includes(search.toLowerCase()) ||
            d.user.toLowerCase().includes(search.toLowerCase())
        )
        // Tipe filter: Industri = non-PENDIDIKAN primary, Pendidikan = has PENDIDIKAN
        if (appliedFilter.tipe.length > 0) {
            data = data.filter(org =>
                appliedFilter.tipe.some(t =>
                    t === "Pendidikan" ? org.tipe.includes("PENDIDIKAN")
                        : t === "Industri" ? org.tipe.some(tp => tp !== "PENDIDIKAN")
                            : false
                )
            )
        }
        // Kategori filter: union of both sections
        const allKat = [...appliedFilter.kategoriPendidikan, ...appliedFilter.kategoriPerusahaan]
        if (allKat.length > 0) {
            data = data.filter(org =>
                allKat.some(k => org.kategori.toLowerCase() === k.toLowerCase())
            )
        }
        return data
    }, [activeTab, search, appliedFilter])

    const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage))
    const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage)

    const tabCounts = {
        menunggu: orgs.filter(d => d.status === "menunggu").length,
        disetujui: orgs.filter(d => d.status === "disetujui").length,
        ditolak: orgs.filter(d => d.status === "ditolak").length,
        semua: orgs.length,
    }

    const tabs: { key: typeof activeTab; label: string }[] = [
        { key: "menunggu", label: "Menunggu" },
        { key: "disetujui", label: "Disetujui" },
        { key: "ditolak", label: "Ditolak" },
        { key: "semua", label: "Semua" },
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
            {/* Toast Notifications */}
            <Toast toasts={toasts} onRemove={removeToast} />
            {/* Detail Modal */}
            {selectedOrg && (
                <KycDetailModal org={selectedOrg} onClose={() => setSelectedOrg(null)} onUpdateStatus={handleUpdateStatus} />
            )}

            {/* Filter Modal */}
            {showFilter && (
                <FilterModal
                    initial={appliedFilter}
                    onApply={f => { setAppliedFilter(f); setPage(1) }}
                    onClose={() => setShowFilter(false)}
                />
            )}

            <div className="max-w-[1600px] mx-auto">

                {/* ── Search + Filter Bar ── */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama organisasi..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Search className="w-3.5 h-3.5" /> Cari
                    </button>
                    <button
                        onClick={() => setShowFilter(true)}
                        className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${(appliedFilter.tipe.length + appliedFilter.kategoriPendidikan.length + appliedFilter.kategoriPerusahaan.length) > 0
                            ? "border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        <Filter className="w-4 h-4" /> Filter
                        {(appliedFilter.tipe.length + appliedFilter.kategoriPendidikan.length + appliedFilter.kategoriPerusahaan.length) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                {appliedFilter.tipe.length + appliedFilter.kategoriPendidikan.length + appliedFilter.kategoriPerusahaan.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-0 mb-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPage(1) }}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${activeTab === tab.key
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.key && tabCounts[tab.key] > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                                    {tabCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Table Card ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-5 py-3 w-[33%]">Organisasi</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[18%]">Tipe &amp; Kategori</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%]">User</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%]">Tgl Pengajuan</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[12%]">Status</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[7%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-20 text-gray-400 text-sm">
                                            Tidak ada data organisasi ditemukan
                                        </td>
                                    </tr>
                                ) : paginatedData.map(org => {
                                    const status = STATUS_CONFIG[org.status]
                                    const StatusIcon = status.icon
                                    return (
                                        <tr
                                            key={org.id}
                                            onClick={() => setSelectedOrg(org)}
                                            className="border-b border-gray-50 dark:border-gray-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer"
                                        >
                                            {/* Organisasi */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full ${org.avatarBg} flex items-center justify-center flex-shrink-0`}>
                                                        <span className="text-white text-xs font-bold">{org.avatar}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{org.nama}</p>
                                                        {org.singkatan && (
                                                            <p className="text-gray-400 text-xs mt-0.5">{org.singkatan}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tipe & Kategori */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {org.tipe.map(t => {
                                                        const conf = TIPE_CONFIG[t] ?? { cls: "bg-gray-100 text-gray-600 border border-gray-200", icon: null }
                                                        return (
                                                            <span key={t} className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${conf.cls}`}>
                                                                {conf.icon}{t}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                                <p className="text-xs text-gray-400">{org.kategori}</p>
                                            </td>

                                            {/* User */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{org.user}</p>
                                                    {org.userUsername && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">@{org.userUsername}</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Tgl Pengajuan */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    {org.tglPengajuan}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </span>
                                            </td>

                                            {/* Aksi */}
                                            <td className="px-4 py-4">
                                                <AksiDropdown id={org.id} onView={() => setSelectedOrg(org)} />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Pagination (OUTSIDE the card) ── */}
                <div className="flex items-center justify-between px-1 py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center flex-wrap gap-1">
                        Menampilkan{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {filteredData.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filteredData.length)}
                        </span>{" "}
                        dari <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredData.length}</span> data
                        &nbsp;
                        <span className="text-gray-400">Baris:</span>
                        <PerPageSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${page === p
                                    ? "bg-emerald-500 text-white"
                                    : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default function KycOrganisasiPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["common"]}>
                <KycOrganisasiContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
