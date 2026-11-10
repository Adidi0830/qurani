"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Search, Filter, MoreHorizontal, Calendar,
    ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
    Building2, Users, ChevronDown, Check,
    X, FileText, Mail, Phone, MapPin, Globe,
    Building, AlertCircle, CheckCircle, Eye, RotateCcw,
    ArrowDown, ArrowUp, ArrowUpDown
} from "lucide-react"
import { useKycOrganisasi, ApiOrg, FilterState, EMPTY_FILTER } from "@/hooks/use-kyc-organisasi"

// ─── Tipe badge config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
    semua: { label: "Semua", cls: "bg-gray-50 text-gray-600 border border-gray-200", icon: Building },
    menunggu: { label: "Menunggu", cls: "bg-orange-50 text-orange-600 border border-orange-200", icon: Clock },
    aktif: { label: "Aktif", cls: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: CheckCircle2 },
    nonaktif: { label: "Nonaktif", cls: "bg-red-50 text-red-600 border border-red-200", icon: XCircle },
    ditolak: { label: "Ditolak", cls: "bg-red-50 text-red-600 border border-red-200", icon: AlertCircle },
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
function AksiDropdown({ org, onToggle, onDetail }: { org: ApiOrg; onToggle: (id: number | string, currentStatus: string) => void; onDetail: (id: number | string) => void }) {
    const [open, setOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [isBottom, setIsBottom] = useState(false)
    const statusStr = org.status ? org.status.toLowerCase() : "";
    const isAktif = statusStr === "active" || statusStr === "aktif" || statusStr === "approved" || (!org.status && org.isVerified === 1 && org.isActive);

    const currentStatus = isAktif ? "ACTIVE" : "INACTIVE"
    const nextLabel = isAktif ? "Nonaktifkan" : "Aktifkan"

    const toggleOpen = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setIsBottom(window.innerHeight - rect.bottom < 150)
        }
        setOpen(o => !o)
    }

    return (
        <div className="relative" onClick={e => e.stopPropagation()}>
            <button
                ref={buttonRef}
                onClick={toggleOpen}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {open && (
                <div
                    className={`absolute right-0 ${isBottom ? 'bottom-full mb-1' : 'top-full mt-1'} w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden`}
                    onMouseLeave={() => setOpen(false)}
                >
                    <button
                        onClick={() => { setOpen(false); onDetail(org.id) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                    >
                        Lihat &amp; Verifikasi
                    </button>
                    <button
                        onClick={() => { setOpen(false); onToggle(org.id, currentStatus) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        {nextLabel}
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
    onVerify,
    onReject,
    orgMembers,
    orgMembersLoading,
    fetchOrgMembers,
}: {
    org: ApiOrg
    onClose: () => void
    onVerify: (id: number | string) => Promise<void>
    onReject: (id: number | string, reason: string) => Promise<void>
    orgMembers: any[]
    orgMembersLoading: boolean
    fetchOrgMembers: (id: number | string) => Promise<void>
}) {
    const [activeTab, setActiveTab] = useState<"profil" | "dokumen" | "guru" | "galeri">("profil")
    const [verifying, setVerifying] = useState(false)
    const [showReject, setShowReject] = useState(false)
    const [rejectReason, setRejectReason] = useState("")

    useEffect(() => {
        if (activeTab === "guru") {
            fetchOrgMembers(org.id)
        }
    }, [activeTab, org.id, fetchOrgMembers])

    const handleVerify = async () => {
        setVerifying(true)
        await onVerify(org.id)
        setVerifying(false)
    }

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        setVerifying(true)
        await onReject(org.id, rejectReason)
        setVerifying(false)
        setShowReject(false)
    }

    const tglBerdiri = org.foundedDate ? new Date(org.foundedDate).getFullYear() : "-"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Tolak */}
            {showReject && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tolak Pendaftaran</h3>
                        <p className="text-sm text-gray-500 mb-4">Silakan masukkan alasan penolakan. Alasan ini akan dikirimkan kepada pendaftar.</p>
                        <textarea
                            className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            placeholder="Contoh: Dokumen legalitas tidak lengkap..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setShowReject(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                            <button onClick={handleReject} disabled={!rejectReason.trim() || verifying} className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">Kirim Penolakan</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative w-full h-full bg-gray-50 dark:bg-gray-950 flex flex-col overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">

                {/* BACK BUTTON */}
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-sm font-semibold rounded-full transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar
                </button>

                {/* BANNER SECTION */}
                <div className="relative w-full h-64 md:h-80 bg-emerald-900 overflow-hidden flex-shrink-0">
                    {org.banner ? (
                        <img src={org.banner} alt="Banner" className="w-full h-full object-cover opacity-60" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-emerald-800 to-teal-900 opacity-90 flex items-center justify-center">
                            <span className="text-white/20 text-6xl font-bold">QURANI</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* PROFILE HEADER & INFO */}
                <div className="max-w-[1200px] w-full mx-auto px-6 relative -mt-20 z-10 flex-shrink-0">
                    <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                        {/* Logo */}
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl md:rounded-[32px] bg-white dark:bg-gray-900 border-4 border-white dark:border-gray-950 shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                            {org.logo ? (
                                <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-5xl font-black text-emerald-600">{String(org.name || "O").charAt(0).toUpperCase()}</span>
                            )}
                        </div>

                        {/* Title Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{org.name}</h1>
                                {org.isVerified === 1 && (
                                    <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-100 dark:fill-blue-900" />
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300 font-medium mb-4">
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wide">
                                    {org.categoryName || org.category || org.type || "Organisasi"}
                                </span>
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {org.city || "Kota Tidak Diketahui"}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /> Berdiri {tglBerdiri}</span>
                                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" /> {org.memberCount || 0} Anggota</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 mt-4 md:mt-0 w-full md:w-auto">
                            {org.isVerified !== 1 && (
                                <>
                                    <button
                                        onClick={() => setShowReject(true)}
                                        disabled={verifying}
                                        className="flex-1 md:flex-none px-6 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 border border-red-200 dark:border-red-800 disabled:opacity-50 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" /> Tolak
                                    </button>
                                    <button
                                        onClick={handleVerify}
                                        disabled={verifying}
                                        className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Setujui
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="max-w-[1200px] w-full mx-auto px-6 mt-6 flex-shrink-0">
                    <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-px overflow-x-auto">
                        {[
                            { id: "profil", label: "Profil & Legalitas", icon: Building },
                            { id: "dokumen", label: "Dokumen", icon: FileText },
                            { id: "guru", label: "Daftar Guru", icon: Users },
                            { id: "galeri", label: "Galeri", icon: Globe },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-xl transition-all border-b-2 ${activeTab === t.id
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                    }`}
                            >
                                <t.icon className="w-4 h-4" /> {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="max-w-[1200px] w-full mx-auto px-6 py-8 flex-1">

                    {/* TAB: PROFIL */}
                    {activeTab === "profil" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Left Column */}
                            <div className="lg:col-span-2 space-y-8">

                                {/* Data Legalitas */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                        <FileText className="w-4 h-4 text-purple-500" /> Data Registrasi & Legalitas
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nama Legal Entitas</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{org.legalName || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipe Legal</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{org.legalType || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">No. Registrasi / NIB</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{org.registrationNumber || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">NPWP / Tax ID</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{org.taxId || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Deskripsi */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                        <Building2 className="w-4 h-4 text-emerald-500" /> Tentang Organisasi
                                    </h3>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                        {org.description || "Belum ada deskripsi yang ditambahkan untuk organisasi ini."}
                                    </p>
                                </div>

                                {/* Visi & Misi */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                            <CheckCircle className="w-4 h-4 text-orange-500" /> Visi
                                        </h3>
                                        <p className="text-sm italic text-gray-700 dark:text-gray-300">
                                            "Menghadirkan pesona Al-Qur'an di setiap keluarga Muslim Indonesia." (Contoh Visi)
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                            <CheckCircle className="w-4 h-4 text-blue-500" /> Misi
                                        </h3>
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                                            <li>Mensosialisasikan pentingnya membaca Al-Qur'an.</li>
                                            <li>Menyelenggarakan kelas tahsin dan tahfidz.</li>
                                            <li>Membina komunitas pecinta Al-Qur'an.</li>
                                            <li>Mengembangkan metode pembelajaran inovatif.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Lokasi */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-red-500" /> Lokasi Organisasi
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">Kunjungi kami untuk informasi lebih lanjut.</p>
                                    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4 flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Bandung&zoom=13&size=400x200&sensor=false')] bg-cover bg-center opacity-50 grayscale" />
                                        <MapPin className="w-8 h-8 text-red-500 relative z-10" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{org.city || "Alamat Tidak Diketahui"}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{org.address || "Belum ada detail alamat lengkap."}</p>
                                </div>

                                {/* Kontak */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Informasi Kontak</h3>
                                    <div className="space-y-4">
                                        {org.email && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center"><Mail className="w-4 h-4 text-blue-500" /></div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{org.email}</span>
                                            </div>
                                        )}
                                        {org.phone && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center"><Phone className="w-4 h-4 text-emerald-500" /></div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{org.phone}</span>
                                            </div>
                                        )}
                                        {org.website && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center"><Globe className="w-4 h-4 text-purple-500" /></div>
                                                <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline font-medium">{org.website}</a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: DOKUMEN */}
                    {activeTab === "dokumen" && (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 min-h-[400px]">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Dokumen Pendukung</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {org.verificationDocs ? (
                                    <DocCard nama="Dokumen Legalitas" file={org.verificationDocs} iconType="doc" />
                                ) : (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                                        <FileText className="w-12 h-12 mb-3 text-gray-300" />
                                        <p>Organisasi ini belum mengunggah dokumen apapun.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: GURU */}
                    {activeTab === "guru" && (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 min-h-[400px]">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Daftar Pengajar</h3>
                            {orgMembersLoading ? (
                                <div className="flex justify-center py-20 text-emerald-500">Memuat data pengajar...</div>
                            ) : orgMembers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Users className="w-12 h-12 mb-3 text-gray-300" />
                                    <p>Belum ada pengajar yang terdaftar.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {orgMembers.map(member => (
                                        <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                                            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex flex-shrink-0 items-center justify-center text-emerald-600 font-bold text-lg">
                                                {member.userName?.charAt(0).toUpperCase() || "U"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{member.role || "Pengajar"}</p>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{member.userName}</p>
                                                <p className="text-xs text-gray-500 mt-1">Bergabung: {new Date(member.joinedAt).toLocaleDateString("id-ID")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: GALERI */}
                    {activeTab === "galeri" && (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Galeri Aktivitas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="aspect-[4/3] rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-xs border border-gray-200 dark:border-gray-700">
                                        Foto/Media {i}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

// ─── Filter Constants ─────────────────────────────────────────────────────────
const TIPE_OPTIONS = ["public", "private"] as const
const KATEGORI_OPTIONS = [
    { id: "Pendidikan", label: "Pendidikan" },
    { id: "Pesantren", label: "Pesantren" },
    { id: "Company", label: "Company" },
    { id: "Yayasan", label: "Yayasan" },
    { id: "Komunitas", label: "Komunitas" },
    { id: "Masjid", label: "Masjid" },
    { id: "Umum", label: "Umum" }
]


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
    const [draft, setDraft] = useState<FilterState>(initial)

    const setVal = (key: keyof FilterState, val: any) => {
        setDraft(prev => ({ ...prev, [key]: val }))
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
                        <div className="flex flex-wrap gap-2">
                            <ChipBtn label="Semua" active={!draft.type} onClick={() => setVal("type", "")} />
                            {TIPE_OPTIONS.map(t => (
                                <ChipBtn
                                    key={t}
                                    label={t}
                                    active={draft.type === t}
                                    onClick={() => setVal("type", t)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ── Kategori Organisasi ── */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Kategori Organisasi</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <ChipBtn label="Semua" active={draft.categoryIds.length === 0} onClick={() => setVal("categoryIds", [])} />
                            {KATEGORI_OPTIONS.map(k => (
                                <ChipBtn
                                    key={k.id}
                                    label={k.label}
                                    active={draft.categoryIds.includes(k.id)}
                                    onClick={() => {
                                        const newCategories = draft.categoryIds.includes(k.id) 
                                            ? draft.categoryIds.filter(id => id !== k.id) 
                                            : [...draft.categoryIds, k.id]
                                        setVal("categoryIds", newCategories)
                                    }}
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
    const {
        orgs: filteredData,
        loading,
        totalCount,
        page,
        perPage,
        tabCounts,
        activeTab,
        search,
        filter: appliedFilter,
        setPage,
        setPerPage,
        setActiveTab,
        setSearch,
        setFilter: setAppliedFilter,
        sortOrder,
        setSortOrder,
        verifyOrg,
        rejectOrg,
        toggleActive,
        toasts,
        removeToast,
    } = useKycOrganisasi()

    const router = useRouter()

    const [showFilter, setShowFilter] = useState(false)
    const [searchInput, setSearchInput] = useState(search)

    const totalPages = Math.max(1, Math.ceil(totalCount / perPage))

    const activeFiltersCount = (appliedFilter.type ? 1 : 0) + (appliedFilter.isActive ? 1 : 0) + (appliedFilter.categoryIds.length > 0 ? 1 : 0) + (appliedFilter.dateFrom ? 1 : 0) + (appliedFilter.dateTo ? 1 : 0)



    const tabs: { key: typeof activeTab; label: string }[] = [
        { key: "semua", label: "Semua" },
        { key: "menunggu", label: "Menunggu" },
        { key: "aktif", label: "Aktif" },
        { key: "nonaktif", label: "Nonaktif" },
        { key: "ditolak", label: "Ditolak" },
    ]

    const getVisiblePages = () => {
        if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (page <= 3) return [1, 2, 3, 4, 5];
        if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [page - 2, page - 1, page, page + 1, page + 2];
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
            <Toast toasts={toasts} onRemove={removeToast} />

            {/* Filter Modal */}
            {showFilter && (
                <FilterModal
                    initial={appliedFilter}
                    onApply={f => { setAppliedFilter(f); setPage(1) }}
                    onClose={() => setShowFilter(false)}
                />
            )}



            <div className="max-w-[1600px] mx-auto">
                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">KYC Organisasi</h1>
                    </div>
                </div>

                {/* ── Search + Filter Bar ── */}
                <div className="flex flex-wrap items-center gap-2 w-full mb-3">
                    {/* Search Bar */}
                    <div className="flex items-center flex-1 min-w-[140px]">
                        <div className="flex w-full rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                            <input
                                type="text"
                                placeholder="Cari nama organisasi"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        setSearch(searchInput)
                                        setPage(1)
                                    }
                                }}
                                className="w-full pl-3 pr-2 h-9 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
                            />
                            <button
                                onClick={() => { setSearch(searchInput); setPage(1) }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 w-10 flex items-center justify-center shrink-0"
                            >
                                <Search className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    {/* Filter Button - icon only on mobile */}
                    <button
                        onClick={() => setShowFilter(true)}
                        className={`relative flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 text-xs font-medium rounded-lg transition-colors border ${activeFiltersCount > 0
                            ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                            : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
                            }`}
                    >
                        <Filter className="w-4 h-4" /> 
                        <span className="hidden sm:inline">Filter</span>
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-0 mb-0 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPage(1) }}
                            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${activeTab === tab.key
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.key && tabCounts[tab.key] > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                                    {tabCounts[tab.key] > 99 ? "99+" : tabCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Mobile Card View ── */}
                <div className="block md:hidden space-y-3 mb-4">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400 text-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                            Memuat data organisasi...
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                            Tidak ada data organisasi ditemukan
                        </div>
                    ) : filteredData.map(org => {
                        let orgStatus = "nonaktif";
                        const statusStr = org.status ? org.status.toLowerCase() : "";
                        if (statusStr === "pending") orgStatus = "menunggu";
                        else if (statusStr === "active" || statusStr === "aktif" || statusStr === "approved") orgStatus = "aktif";
                        else if (statusStr === "inactive" || statusStr === "nonaktif") orgStatus = "nonaktif";
                        else if (statusStr === "rejected" || statusStr === "ditolak") orgStatus = "ditolak";
                        else if (org.isVerified === 0) orgStatus = "menunggu";
                        else if (org.isVerified === 2) orgStatus = "ditolak";
                        else if (org.isActive) orgStatus = "aktif";

                        const status = STATUS_CONFIG[orgStatus]
                        const StatusIcon = status.icon
                        const tglPengajuan = new Date(org.createdAt || Date.now()).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", year: "numeric"
                        })
                        return (
                            <div 
                                key={org.id} 
                                onClick={() => router.push(`/support/kyc-organisasi/${org.id}`)}
                                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm cursor-pointer hover:border-emerald-400 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-emerald-700 text-xs font-bold">
                                                {String(org.name || "O").charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{org.name}</p>
                                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 mt-1 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                                {org.type || "Organisasi"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <AksiDropdown org={org} onToggle={toggleActive} onDetail={(id) => router.push(`/support/kyc-organisasi/${id}`)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Kategori</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-300 truncate">{org.categoryName || org.category || "Umum"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">User</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-300 truncate">{org.ownerName || (org as any).user || org.ownerUsername || "-"}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">@{org.ownerUsername || (org as any).userUsername || "-"}</p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        {tglPengajuan}
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${status.cls}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {status.label}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Desktop Table View ── */}
                <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-5 py-3 w-[28%]">Organisasi</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[10%]">Tipe</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%]">Kategori</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%]">User</th>
                                    <th
                                        className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors select-none"
                                        onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Tgl Pengajuan
                                            {sortOrder === "newest" ? (
                                                <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : sortOrder === "oldest" ? (
                                                <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[10%]">Status</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[7%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-20 text-gray-400 text-sm">
                                            Memuat data organisasi...
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-20 text-gray-400 text-sm">
                                            Tidak ada data organisasi ditemukan
                                        </td>
                                    </tr>
                                ) : filteredData.map(org => {
                                    let orgStatus = "nonaktif";
                                    const statusStr = org.status ? org.status.toLowerCase() : "";
                                    if (statusStr === "pending") orgStatus = "menunggu";
                                    else if (statusStr === "active" || statusStr === "aktif" || statusStr === "approved") orgStatus = "aktif";
                                    else if (statusStr === "inactive" || statusStr === "nonaktif") orgStatus = "nonaktif";
                                    else if (statusStr === "rejected" || statusStr === "ditolak") orgStatus = "ditolak";
                                    else if (org.isVerified === 0) orgStatus = "menunggu";
                                    else if (org.isVerified === 2) orgStatus = "ditolak";
                                    else if (org.isActive) orgStatus = "aktif";

                                    const status = STATUS_CONFIG[orgStatus]
                                    const StatusIcon = status.icon
                                    const tglPengajuan = new Date(org.createdAt || Date.now()).toLocaleDateString("id-ID", {
                                        day: "numeric", month: "short", year: "numeric"
                                    })
                                    return (
                                        <tr
                                            key={org.id}
                                            onClick={() => router.push(`/support/kyc-organisasi/${org.id}`)}
                                            className="border-b border-gray-50 dark:border-gray-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-emerald-700 text-xs font-bold">
                                                            {String(org.name || "O").charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{org.name}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tipe */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                                        {org.type || "Organisasi"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Kategori */}
                                            <td className="px-4 py-4">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{org.categoryName || org.category || "Umum"}</p>
                                            </td>

                                            {/* User */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{org.ownerName || (org as any).user || org.ownerUsername || "-"}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">@{org.ownerUsername || (org as any).userUsername || "-"}</p>
                                                </div>
                                            </td>

                                            {/* Tgl Pengajuan */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    {tglPengajuan}
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
                                                <AksiDropdown org={org} onToggle={toggleActive} onDetail={(id) => router.push(`/support/kyc-organisasi/${id}`)} />
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
                            {totalCount === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, totalCount)}
                        </span>{" "}
                        dari <span className="font-semibold text-gray-700 dark:text-gray-300">{totalCount}</span> data
                        &nbsp;
                        <span className="text-gray-400">Baris:</span>
                        <PerPageSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {getVisiblePages().map(p => (
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
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
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
    return <KycOrganisasiContent />
}
