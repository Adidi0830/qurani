"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useKycOrganisasi, ApiOrg, OrgMember } from "@/hooks/use-kyc-organisasi"
import { SkeletonDetailPage } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ChevronLeft, CheckCircle2, MapPin, Calendar, Users, Building2,
    CheckCircle, Mail, Phone, Globe, FileText, XCircle, Clock,
    ShieldCheck, AlertTriangle, Download, Eye, Upload, Star,
    Hash, Tag, Landmark, Receipt, Link2, ExternalLink
} from "lucide-react"

// ─── Dummy dokumen (simulasi — belum ada di API Qurani) ───────────────────────
// 🔴 BELUM ADA DI API: field documents[] dengan tipe KTP_PENGURUS, AKTA_PENDIRIAN, dll.
const DUMMY_DOCS = [
    {
        id: 1,
        type: "KTP_PENGURUS",
        label: "KTP Pengurus / Pendiri",
        description: "Kartu Tanda Penduduk penanggung jawab organisasi",
        icon: "user",
        fileUrl: null as string | null,
        uploadedAt: "2025-10-15T08:00:00Z",
        status: "PENDING",
    },
    {
        id: 2,
        type: "AKTA_PENDIRIAN",
        label: "Akta Pendirian / Notaris",
        description: "Akta notaris pendirian organisasi yang sah",
        icon: "file",
        fileUrl: null as string | null,
        uploadedAt: "2025-10-15T08:05:00Z",
        status: "PENDING",
    },
    {
        id: 3,
        type: "SK_KEMENKUMHAM",
        label: "SK Kemenkumham",
        description: "Surat Keputusan dari Kementerian Hukum dan HAM",
        icon: "shield",
        fileUrl: null as string | null,
        uploadedAt: null,
        status: "NOT_UPLOADED",
    },
    {
        id: 4,
        type: "NPWP",
        label: "NPWP Organisasi",
        description: "Dokumen fisik NPWP atas nama organisasi",
        icon: "receipt",
        fileUrl: null as string | null,
        uploadedAt: "2025-10-15T08:10:00Z",
        status: "PENDING",
    },
    {
        id: 5,
        type: "SURAT_DOMISILI",
        label: "Surat Domisili",
        description: "Surat keterangan domisili dari kelurahan / RT setempat",
        icon: "landmark",
        fileUrl: null as string | null,
        uploadedAt: null,
        status: "NOT_UPLOADED",
    },
    {
        id: 6,
        type: "SURAT_PERNYATAAN",
        label: "Surat Pernyataan",
        description: "Surat pernyataan keabsahan data yang ditandatangani pengurus",
        icon: "file",
        fileUrl: null as string | null,
        uploadedAt: "2025-10-15T08:15:00Z",
        status: "PENDING",
    },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getVerifStatus(org: ApiOrg): "menunggu" | "terverifikasi" | "ditolak" | "aktif" {
    if (org.status) {
        const s = org.status.toLowerCase()
        if (s === "pending") return "menunggu"
        if (s === "approved" || s === "active" || s === "aktif") return "terverifikasi"
        if (s === "rejected" || s === "ditolak") return "ditolak"
    }
    if (org.isVerified === 0) return "menunggu"
    if (org.isVerified === 1) return "terverifikasi"
    if (org.isVerified === 2) return "ditolak"
    return "menunggu"
}

// ─── Document Card ────────────────────────────────────────────────────────────
function DocCard({ doc }: { doc: typeof DUMMY_DOCS[number] }) {
    const isUploaded = doc.status !== "NOT_UPLOADED"
    const IconMap: Record<string, React.ElementType> = {
        user: Users,
        file: FileText,
        shield: ShieldCheck,
        receipt: Receipt,
        landmark: Landmark,
    }
    const Icon = IconMap[doc.icon] ?? FileText

    return (
        <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all hover:shadow-sm
            ${isUploaded
                ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                : "bg-gray-50 dark:bg-gray-900/50 border-dashed border-gray-200 dark:border-gray-700"
            }`}>

            {/* Header */}
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isUploaded ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{doc.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{doc.description}</p>
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
                {isUploaded ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> Menunggu Review
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full">
                        <Upload className="w-3 h-3" /> Belum Diunggah
                    </span>
                )}
                {doc.uploadedAt && (
                    <span className="text-[10px] text-gray-400">
                        {new Date(doc.uploadedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    disabled={!isUploaded}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all
                        ${isUploaded
                            ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600 shadow-sm"
                            : "bg-gray-50 dark:bg-gray-800/50 border-transparent text-gray-300 cursor-not-allowed"
                        }`}
                >
                    <Eye className="w-3.5 h-3.5" />
                    {isUploaded ? "Lihat Dokumen" : "Belum Ada"}
                </button>
                {isUploaded && (
                    <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-emerald-600 hover:border-emerald-400 transition-all shadow-sm">
                        <Download className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{label}</p>
            <p className={`text-sm font-semibold text-gray-800 dark:text-gray-200 ${mono ? "font-mono" : ""}`}>
                {value || <span className="text-gray-400 italic font-normal">Belum diisi</span>}
            </p>
        </div>
    )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function ProfileContent() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const orgId = params?.id

    const {
        detailOrg: org,
        fetchDetail,
        detailLoading,
        orgMembers,
        orgMembersLoading,
        fetchOrgMembers,
        verifyOrg,
        rejectOrg,
    } = useKycOrganisasi()

    const [activeTab, setActiveTab] = useState<"profil" | "dokumen" | "guru" | "galeri">("profil")
    const [verifying, setVerifying] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState("")

    useEffect(() => {
        if (orgId) fetchDetail(orgId)
    }, [orgId, fetchDetail])

    useEffect(() => {
        if (activeTab === "guru" && orgId) fetchOrgMembers(orgId)
    }, [activeTab, orgId, fetchOrgMembers])

    // Update tab title with org name once loaded
    useEffect(() => {
        if (org?.name) {
            document.title = `Qurani - ${org.name} — Verifikasi`
        }
    }, [org?.name])

    const handleVerify = async () => {
        if (!org) return
        setVerifying(true)
        await verifyOrg(org.id)
        await fetchDetail(org.id)
        setVerifying(false)
    }

    const handleReject = async () => {
        if (!org || !rejectReason.trim()) return
        setVerifying(true)
        await rejectOrg(org.id, rejectReason)
        await fetchDetail(org.id)
        setVerifying(false)
        setShowRejectModal(false)
        setRejectReason("")
    }

    if (detailLoading && !org) {
        return (
            <SkeletonDetailPage showAvatar infoRows={6} />
        )
    }

    if (!org && !detailLoading) {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium text-lg">Organisasi tidak ditemukan</p>
                <button
                    onClick={() => router.push('/support/kyc-organisasi')}
                    className="flex items-center gap-2 text-emerald-500 hover:text-emerald-600 font-semibold text-sm"
                >
                    <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar
                </button>
            </div>
        )
    }

    if (!org) return null

    const verifStatus = getVerifStatus(org)
    const tglBerdiri = org.foundedDate ? new Date(org.foundedDate).getFullYear() : "-"
    const isPending = verifStatus === "menunggu"
    const isVerified = verifStatus === "terverifikasi"
    const isRejected = verifStatus === "ditolak"

    const TABS = [
        { id: "profil", label: "Profil & Legalitas", icon: Building2 },
        { id: "dokumen", label: "Dokumen", icon: FileText },
        { id: "guru", label: "Daftar Guru", icon: Users },
        { id: "galeri", label: "Galeri", icon: Globe },
    ] as const

    return (
        <div className="relative w-full bg-gray-50 dark:bg-gray-950 min-h-screen">

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Tolak Pendaftaran</h3>
                        <p className="text-sm text-gray-500 mb-4">Masukkan alasan penolakan yang akan dikirim ke organisasi.</p>
                        <textarea
                            className="w-full h-28 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm resize-none"
                            placeholder="Contoh: Dokumen akta pendirian tidak lengkap atau tidak valid..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                        />
                        <div className="flex items-center justify-end gap-3 mt-4">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason("") }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || verifying}
                                className="px-5 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {verifying ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Kirim Penolakan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Back Button */}
            <button
                onClick={() => router.push('/support/kyc-organisasi')}
                className="absolute top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-sm font-semibold rounded-full transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar
            </button>

            {/* Banner */}
            <div className="relative w-full h-56 md:h-72 bg-emerald-900 overflow-hidden flex-shrink-0">
                {org.banner ? (
                    <img src={org.banner} alt="Banner" className="w-full h-full object-cover opacity-70" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 flex items-center justify-center">
                        <span className="text-white/10 text-8xl font-black uppercase tracking-widest select-none">
                            {org.name?.slice(0, 6)}
                        </span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/10 to-transparent dark:from-gray-950 dark:via-gray-950/10" />
            </div>

            {/* Profile Header */}
            <div className="max-w-[1200px] w-full mx-auto px-6 relative -mt-20 z-10">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-5 pb-5 border-b border-gray-200 dark:border-gray-800">

                    {/* Logo */}
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl md:rounded-[28px] bg-white dark:bg-gray-900 border-4 border-white dark:border-gray-950 shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-black text-emerald-600">
                                {String(org.name || "O").charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* Title & Meta */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
                            {isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-200 dark:border-blue-800">
                                    <CheckCircle2 className="w-3 h-3 fill-blue-500 text-white" /> Terverifikasi
                                </span>
                            )}
                            {isPending && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800">
                                    <Clock className="w-3 h-3" /> Menunggu Verifikasi
                                </span>
                            )}
                            {isRejected && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full border border-red-200 dark:border-red-800">
                                    <XCircle className="w-3 h-3" /> Ditolak
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md text-[11px] font-bold uppercase tracking-wide border border-emerald-200 dark:border-emerald-800">
                                {org.categoryName || org.category || org.type || "Organisasi"}
                            </span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {org.city || "Kota tidak diketahui"}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Berdiri {tglBerdiri}</span>
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {org.memberCount ?? 0} Anggota</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-2 md:mt-0 w-full md:w-auto">
                        {isPending && (
                            <>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    disabled={verifying}
                                    className="flex-1 md:flex-none px-5 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 border border-red-200 dark:border-red-800 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" /> Tolak
                                </button>
                                <button
                                    onClick={handleVerify}
                                    disabled={verifying}
                                    className="flex-1 md:flex-none px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    {verifying
                                        ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        : <CheckCircle2 className="w-4 h-4" />
                                    }
                                    Setujui Verifikasi
                                </button>
                            </>
                        )}
                        {isVerified && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-bold">
                                <ShieldCheck className="w-4 h-4" /> Organisasi Terverifikasi
                            </div>
                        )}
                        {isRejected && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-bold">
                                <XCircle className="w-4 h-4" /> Pendaftaran Ditolak
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-[1200px] w-full mx-auto px-6 mt-5">
                <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-all border-b-2
                                ${activeTab === t.id
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
                                }`}
                        >
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[1200px] w-full mx-auto px-6 py-8">

                {/* ── TAB: PROFIL & LEGALITAS ── */}
                {activeTab === "profil" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Peringatan verifikasi */}
                            {isPending && (
                                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Organisasi Menunggu Verifikasi</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                            Periksa kelengkapan data registrasi dan dokumen, lalu klik <strong>Setujui Verifikasi</strong> atau <strong>Tolak</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Data Registrasi & Legalitas */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                                    <Landmark className="w-4 h-4 text-purple-500" /> Data Registrasi &amp; Legalitas
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <InfoRow label="Nama Legal Entitas" value={org.legalName} />
                                    <InfoRow label="Tipe Legal" value={org.legalType} />
                                    <InfoRow label="No. Registrasi / NIB" value={org.registrationNumber} mono />
                                    <InfoRow label="NPWP / Tax ID" value={org.taxId} mono />
                                </div>
                            </div>

                            {/* Info Dasar Organisasi */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                                    <Building2 className="w-4 h-4 text-emerald-500" /> Informasi Dasar
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <InfoRow label="Nama Organisasi" value={org.name} />
                                    <InfoRow label="Slug / URL" value={org.slug} mono />
                                    <InfoRow label="Tipe" value={org.type} />
                                    <InfoRow label="Kategori" value={org.categoryName || org.category} />
                                    <InfoRow label="Tanggal Berdiri" value={org.foundedDate ? new Date(org.foundedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null} />
                                    <InfoRow label="Jumlah Anggota" value={String(org.memberCount ?? 0)} />
                                </div>
                                {org.description && (
                                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Deskripsi</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{org.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Informasi Pemilik */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                                    <Users className="w-4 h-4 text-blue-500" /> Data Pemilik / Pendaftar
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <InfoRow label="Nama Pemilik" value={org.ownerName} />
                                    <InfoRow label="Username" value={org.ownerUsername ? `@${org.ownerUsername}` : null} />
                                    <InfoRow label="Email Pemilik" value={org.ownerEmail} />
                                    <InfoRow label="Tgl Pengajuan" value={org.createdAt ? new Date(org.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null} />
                                </div>
                            </div>
                        </div>

                        {/* Right */}
                        <div className="space-y-6">

                            {/* Status Verifikasi */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Status Verifikasi</h3>
                                <div className={`flex items-center gap-3 p-3 rounded-xl border
                                    ${isPending ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800" : ""}
                                    ${isVerified ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" : ""}
                                    ${isRejected ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800" : ""}
                                `}>
                                    {isPending && <><Clock className="w-5 h-5 text-amber-500 flex-shrink-0" /><div><p className="text-xs font-bold text-amber-700 dark:text-amber-300">Menunggu</p><p className="text-[10px] text-amber-600 dark:text-amber-400">Belum diproses admin</p></div></>}
                                    {isVerified && <><ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" /><div><p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Terverifikasi</p><p className="text-[10px] text-emerald-600 dark:text-emerald-400">Organisasi dapat beroperasi</p></div></>}
                                    {isRejected && <><XCircle className="w-5 h-5 text-red-500 flex-shrink-0" /><div><p className="text-xs font-bold text-red-700 dark:text-red-300">Ditolak</p><p className="text-[10px] text-red-600 dark:text-red-400">Pengajuan tidak disetujui</p></div></>}
                                </div>
                            </div>

                            {/* Lokasi */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                    <MapPin className="w-4 h-4 text-red-500" /> Lokasi
                                </h3>
                                {/* 🔴 BELUM DI API: latitude, longitude untuk embed peta real */}
                                <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3 flex items-center justify-center border border-gray-200 dark:border-gray-700 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20" />
                                    <MapPin className="w-8 h-8 text-red-400 relative z-10" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{org.city || "Kota tidak diketahui"}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{org.address || "Alamat belum diisi"}</p>
                                {org.postalCode && <p className="text-xs text-gray-400 mt-0.5">Kode Pos: {org.postalCode}</p>}
                            </div>

                            {/* Kontak */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Kontak</h3>
                                <div className="space-y-3">
                                    {org.email ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-3.5 h-3.5 text-blue-500" />
                                            </div>
                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{org.email}</span>
                                        </div>
                                    ) : null}
                                    {org.phone ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                            </div>
                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{org.phone}</span>
                                        </div>
                                    ) : null}
                                    {org.website ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                                <Globe className="w-3.5 h-3.5 text-purple-500" />
                                            </div>
                                            <a href={org.website.startsWith("http") ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer"
                                                className="text-sm text-blue-500 hover:underline font-medium flex items-center gap-1 truncate">
                                                {org.website} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            </a>
                                        </div>
                                    ) : null}
                                    {/* 🔴 BELUM DI API: socialLinks */}
                                    {!org.email && !org.phone && !org.website && (
                                        <p className="text-sm text-gray-400 italic">Informasi kontak belum diisi.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB: DOKUMEN ── */}
                {activeTab === "dokumen" && (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Dokumen Pendukung</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {DUMMY_DOCS.filter(d => d.status !== "NOT_UPLOADED").length} dari {DUMMY_DOCS.length} dokumen telah diunggah
                                </p>
                            </div>
                            {/* 🔴 BELUM DI API: progress upload dokumen */}
                            <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                        style={{ width: `${(DUMMY_DOCS.filter(d => d.status !== "NOT_UPLOADED").length / DUMMY_DOCS.length) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-gray-500">
                                    {Math.round((DUMMY_DOCS.filter(d => d.status !== "NOT_UPLOADED").length / DUMMY_DOCS.length) * 100)}%
                                </span>
                            </div>
                        </div>

                        {/* Catatan dummy */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl mb-6">
                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                                <strong>Simulasi:</strong> Tampilan dokumen ini menggunakan data dummy. Field dokumen (KTP, Akta, SK, NPWP, dll.) <strong>belum ada di API Qurani</strong> dan perlu ditambahkan. Lihat daftar field yang dibutuhkan di bawah ini.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {DUMMY_DOCS.map(doc => (
                                <DocCard key={doc.id} doc={doc} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── TAB: DAFTAR GURU ── */}
                {activeTab === "guru" && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 min-h-[400px]">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Daftar Pengajar</h3>
                        {orgMembersLoading ? (
                            <div className="space-y-3 py-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 animate-pulse">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                                    </div>
                                ))}
                            </div>
                        ) : orgMembers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                                <Users className="w-12 h-12 text-gray-200" />
                                <p className="text-sm">Belum ada pengajar yang terdaftar.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {orgMembers.map((member, idx) => (
                                    <div key={member.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors
                                        ${idx === 0 ? "border-emerald-300 bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-800" : "border-gray-100 dark:border-gray-800 hover:border-emerald-200"}`}>
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex flex-shrink-0 items-center justify-center text-emerald-600 font-bold">
                                            {member.userName?.charAt(0).toUpperCase() || "U"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">{member.role || "Pengajar"}</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{member.userName || "Tanpa Nama"}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Bergabung: {new Date(member.joinedAt).toLocaleDateString("id-ID")}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: GALERI ── */}
                {activeTab === "galeri" && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Galeri Aktivitas</h3>
                        {/* 🔴 BELUM DI API: endpoint galeri/foto organisasi */}
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                            <Star className="w-12 h-12 text-gray-200" />
                            <p className="text-sm text-center">Belum ada foto atau media yang diunggah.<br />
                                <span className="text-xs text-gray-400">(API galeri organisasi belum tersedia)</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function ProfileOrganisasiPage() {
    return <ProfileContent />
}
