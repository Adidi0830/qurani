"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useI18n } from "@/components/providers/i18n-provider"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Search, Filter, Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle2,
    XCircle, CreditCard, RefreshCw, Check, X, Phone, MapPin, User, Hash,
    Shield, RotateCcw, FileText, Eye, ChevronDown, AlertCircle, Loader2,
    PlayCircle, Flag, Database, MoreHorizontal
} from "lucide-react"
import dummyRaw from "@/data/kyc-dummy.json"
import { KycSubmission } from "@/utils/api/kyc/fetch"
import { getKycAll, startKycReview, reviewKyc } from "@/utils/api/kyc/fetch"

// ─── Dummy Fallback Data ───────────────────────────────────────────────────────
const DUMMY_DATA: KycSubmission[] = (dummyRaw as any).kyc_member_api_dummy as KycSubmission[]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function val(v: string | null | undefined, fallback = "-"): string {
    if (!v || v.trim() === "") return fallback
    return v
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "-"
    try {
        return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    } catch { return iso }
}

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    try {
        const d = new Date(iso)
        return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
            ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    } catch { return iso }
}

function getInitials(name: string | null | undefined): string {
    if (!name) return "?"
    return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

function getAvatarColor(id: number): string {
    const colors = [
        "bg-emerald-500", "bg-teal-500", "bg-blue-500", "bg-indigo-500",
        "bg-purple-500", "bg-pink-500", "bg-rose-500", "bg-orange-500",
        "bg-amber-500", "bg-cyan-500"
    ]
    return colors[id % colors.length]
}

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const s = localStorage.getItem("myqurani_auth")
        if (!s) return null
        return JSON.parse(s)?.accessToken || null
    } catch { return null }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = "semua" | "pending" | "in_review" | "approved" | "rejected"

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastItem = { id: number; message: string; type: "success" | "error" | "info" }

function Toast({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) {
    return (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto
                        animate-in slide-in-from-right-5 duration-300
                        ${t.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                            : t.type === "info"
                                ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300"
                                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                        }`}>
                    {t.type === "success"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : t.type === "info"
                            ? <Database className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <span>{t.message}</span>
                    <button onClick={() => onRemove(t.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    )
}

// ─── Per Page Select ───────────────────────────────────────────────────────────
const PER_PAGE_OPTIONS = [10, 25, 50]

function PerPageSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative inline-block ml-2">
            <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {value} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {open && (
                <div className="absolute bottom-full left-0 mb-1 w-24 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1"
                    onMouseLeave={() => setOpen(false)}>
                    {PER_PAGE_OPTIONS.map(n => (
                        <button key={n} onClick={() => { onChange(n); setOpen(false) }}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${value === n ? "bg-emerald-50 dark:bg-emerald-900/20 text-gray-900 dark:text-white font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                            {n}{value === n && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Status Config ─────────────────────────────────────────────────────────────
function useStatusConfig(t: (key: string) => string) {
    return useMemo(() => ({
        0: { label: t("kyc_member.status_pending"), cls: "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800", icon: Clock },
        1: { label: t("kyc_member.status_in_review"), cls: "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", icon: Eye },
        2: { label: t("kyc_member.status_approved"), cls: "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", icon: CheckCircle2 },
        3: { label: t("kyc_member.status_rejected"), cls: "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800", icon: XCircle },
    }), [t])
}

function useDocLabel(t: (key: string) => string) {
    return useCallback((docType: string | null) => {
        const map: Record<string, string> = {
            NATIONAL_ID: t("kyc_member.doc_national_id"),
            PASSPORT: t("kyc_member.doc_passport"),
            DRIVING_LICENSE: t("kyc_member.doc_driving_license"),
            STUDENT_CARD: t("kyc_member.doc_student_card"),
            RESIDENCE_PERMIT: t("kyc_member.doc_residence_permit"),
        }
        return docType ? (map[docType] || docType) : t("kyc_member.doc_unknown")
    }, [t])
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function KycDetailModal({
    member, onClose, onStartReview, onApprove, onReject, isProcessing
}: {
    member: KycSubmission
    onClose: () => void
    onStartReview: (id: number) => void
    onApprove: (id: number, notes: string, riskLevel: string) => void
    onReject: (id: number, reason: string, notes: string) => void
    isProcessing: boolean
}) {
    const { t } = useI18n()
    const statusConfig = useStatusConfig(t)
    const getDocLabel = useDocLabel(t)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [selectedReasons, setSelectedReasons] = useState<string[]>([])
    const [additionalNote, setAdditionalNote] = useState("")
    const [showStartReviewConfirm, setShowStartReviewConfirm] = useState(false)
    const [showApproveModal, setShowApproveModal] = useState(false)
    const [approveNotes, setApproveNotes] = useState("")
    const [approveRisk, setApproveRisk] = useState("low")

    const statusInfo = statusConfig[member.status as 0 | 1 | 2 | 3] ?? { label: t("kyc_member.status_unknown"), cls: "bg-gray-100 text-gray-500 border border-gray-200", icon: AlertCircle }
    const StatusIcon = statusInfo.icon

    const REJECTION_REASONS = [
        t("kyc_member.reject_reason_1"),
        t("kyc_member.reject_reason_2"),
        t("kyc_member.reject_reason_3"),
        t("kyc_member.reject_reason_4"),
        t("kyc_member.reject_reason_5"),
        t("kyc_member.reject_reason_6"),
    ]

    const toggleReason = (r: string) =>
        setSelectedReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

    const handleConfirmReject = () => {
        const fullReason = [...selectedReasons, ...(additionalNote.trim() ? [additionalNote] : [])].join(". ")
        onReject(member.id, fullReason, additionalNote)
        setShowRejectModal(false)
        onClose()
    }

    const handleConfirmApprove = () => {
        onApprove(member.id, approveNotes, approveRisk)
        setShowApproveModal(false)
        onClose()
    }

    const displayName = val(member.fullName, val(member.username, `User #${member.userId}`))
    const initials = getInitials(member.fullName || member.username)
    const avatarBg = getAvatarColor(member.id)

    const genderLabel = member.gender === "male" ? t("kyc_member.detail_gender_male")
        : member.gender === "female" ? t("kyc_member.detail_gender_female")
            : val(member.gender)

    const riskLabel = member.riskLevel === "low" ? t("kyc_member.detail_risk_low")
        : member.riskLevel === "medium" ? t("kyc_member.detail_risk_medium")
            : member.riskLevel === "high" ? t("kyc_member.detail_risk_high")
                : val(member.riskLevel)

    const riskColor = member.riskLevel === "low" ? "text-emerald-600 bg-emerald-50 border-emerald-200"
        : member.riskLevel === "medium" ? "text-amber-600 bg-amber-50 border-amber-200"
            : member.riskLevel === "high" ? "text-red-600 bg-red-50 border-red-200"
                : "text-gray-500"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ maxWidth: "calc(100vw - 24px)", maxHeight: "95vh", width: "1100px" }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white text-sm font-bold">{initials}</span>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-base">{displayName}</p>
                            {member.username && <p className="text-xs text-gray-400 mt-0.5">@{member.username}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("kyc_member.detail_submission_status")}</p>
                            <div className="flex items-center gap-2 justify-end mt-0.5">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(member.createdAt)}</p>
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${statusInfo.cls}`}>
                                    <StatusIcon className="w-3 h-3" />{statusInfo.label}
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Body — scrollable */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                    {/* LEFT — User Info */}
                    <div className="w-full lg:w-[340px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                        <div className="p-4 sm:p-6 space-y-5">

                            {/* Personal Info */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("kyc_member.detail_user_info")}</span>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    {[
                                        [t("kyc_member.detail_full_name"), val(member.fullName)],
                                        [t("kyc_member.detail_username"), member.username ? `@${member.username}` : "-"],
                                        [t("kyc_member.detail_phone"), val(member.phone)],
                                        [t("kyc_member.detail_gender"), genderLabel],
                                        [t("kyc_member.detail_nationality"), val(member.nationality)],
                                    ].map(([label, value], i) => (
                                        <div key={label} className={`px-4 py-3 ${i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                                            <p className="text-sm font-medium text-gray-800 dark:text-white break-all">{value}</p>
                                        </div>
                                    ))}
                                    {/* DOB + POB */}
                                    <div className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-800">
                                        <div className="px-4 py-3 border-r border-gray-100 dark:border-gray-800">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t("kyc_member.detail_pob")}</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{val(member.placeOfBirth)}</p>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t("kyc_member.detail_dob")}</p>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-gray-400" />
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(member.dateOfBirth)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Address */}
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("kyc_member.detail_address")}</p>
                                        <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {[member.address, member.city, member.province, member.postalCode, member.country]
                                                    .filter(Boolean).join(", ") || "-"}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Document */}
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t("kyc_member.detail_doc_type")}</p>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                            <p className="text-sm font-bold text-gray-800 dark:text-white">{getDocLabel(member.documentType)}</p>
                                        </div>
                                    </div>
                                    {/* Doc Number */}
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("kyc_member.detail_doc_number")}</p>
                                        {member.documentNumber ? (
                                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
                                                <Hash className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-wide">{member.documentNumber}</p>
                                            </div>
                                        ) : <p className="text-sm text-gray-400">-</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Review Info */}
                            {(member.reviewedBy || member.riskLevel || member.reviewNotes || member.rejectionReason) && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Shield className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("kyc_member.detail_review_info")}</span>
                                    </div>
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden space-y-0">
                                        {member.reviewedBy && (
                                            <div className="px-4 py-3">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t("kyc_member.detail_reviewed_by")}</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{member.reviewedBy}</p>
                                            </div>
                                        )}
                                        {member.reviewedAt && (
                                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t("kyc_member.detail_reviewed_at")}</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(member.reviewedAt)}</p>
                                            </div>
                                        )}
                                        {member.riskLevel && (
                                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("kyc_member.detail_risk_level")}</p>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${riskColor}`}>{riskLabel}</span>
                                            </div>
                                        )}
                                        {member.reviewNotes && (
                                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t("kyc_member.detail_review_notes")}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{member.reviewNotes}</p>
                                            </div>
                                        )}
                                        {member.rejectionReason && (
                                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-red-50/50 dark:bg-red-900/10">
                                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">{t("kyc_member.detail_rejection_reason")}</p>
                                                <p className="text-sm text-red-600 dark:text-red-400">{member.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Verification Status Card */}
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${statusInfo.cls}`}>
                                <StatusIcon className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold">{statusInfo.label}</p>
                                    <p className="text-xs opacity-70">{t("kyc_member.detail_submission_status")}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — Document Images */}
                    <div className="flex-1 flex flex-col sm:flex-row gap-4 p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                        {/* Doc Image */}
                        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-[220px]">
                            <div className="flex items-center gap-2 bg-gray-800 dark:bg-gray-950 text-white text-xs font-semibold px-3 py-1.5 rounded-lg w-fit">
                                <CreditCard className="w-3.5 h-3.5" />{t("kyc_member.detail_doc_image")}
                            </div>
                            <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-50 dark:bg-gray-800 flex items-center justify-center min-h-[200px]">
                                {(member.documentImageUrl || member._dummyDocImage) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={member.documentImageUrl || member._dummyDocImage} alt="Document" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-gray-400 p-8">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <CreditCard className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <p className="text-sm text-center">{t("kyc_member.detail_no_image")}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selfie */}
                        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-[220px]">
                            <div className="flex items-center gap-2 bg-gray-800 dark:bg-gray-950 text-white text-xs font-semibold px-3 py-1.5 rounded-lg w-fit">
                                <User className="w-3.5 h-3.5" />{t("kyc_member.detail_selfie")}
                            </div>
                            <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-50 dark:bg-gray-800 flex items-center justify-center min-h-[200px]">
                                {(member.selfieImageUrl || member._dummySelfieImage) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={member.selfieImageUrl || member._dummySelfieImage} alt="Selfie" className="w-full h-full object-cover object-top" />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-gray-400 p-8">
                                        <div className={`w-24 h-24 rounded-full ${avatarBg} flex items-center justify-center`}>
                                            <span className="text-white text-3xl font-bold">{initials}</span>
                                        </div>
                                        <p className="text-sm text-center">{t("kyc_member.detail_no_image")}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        {t("kyc_member.detail_id")}: #{member.id}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Start Review */}
                        {member.status === 0 && (
                            <button
                                disabled={isProcessing}
                                onClick={() => setShowStartReviewConfirm(true)}
                                className="flex items-center gap-2 px-4 py-1.5 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                <span className="hidden sm:inline">{t("kyc_member.action_start_review")}</span>
                            </button>
                        )}

                        {/* Reject */}
                        {(member.status === 0 || member.status === 1) && (
                            <button
                                disabled={isProcessing}
                                onClick={() => { setSelectedReasons([]); setAdditionalNote(""); setShowRejectModal(true) }}
                                className="flex items-center gap-2 px-4 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                <span className="hidden sm:inline">{t("kyc_member.action_reject")}</span>
                            </button>
                        )}

                        {/* Approve */}
                        {(member.status === 0 || member.status === 1) && (
                            <button
                                disabled={isProcessing}
                                onClick={() => { setApproveNotes(""); setApproveRisk("low"); setShowApproveModal(true) }}
                                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                <span className="hidden sm:inline">{t("kyc_member.action_approve")}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Start Review Confirm */}
            {showStartReviewConfirm && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowStartReviewConfirm(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-[400px] max-w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <PlayCircle className="w-5 h-5 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("kyc_member.start_review_confirm")}</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 pl-11">{t("kyc_member.start_review_confirm_sub")}</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowStartReviewConfirm(false)} className="px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("kyc_member.btn_cancel")}</button>
                            <button
                                disabled={isProcessing}
                                onClick={() => { onStartReview(member.id); setShowStartReviewConfirm(false); onClose() }}
                                className="px-5 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
                                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t("kyc_member.btn_confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowApproveModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-[520px] max-w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Setujui Verifikasi?</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 pl-11">Pilih tingkat risiko dan tambahkan catatan persetujuan.</p>
                        <div className="space-y-3 mb-4">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tingkat Risiko (Risk Level)</span>
                            <div className="flex gap-3">
                                {["low", "medium", "high"].map((risk) => (
                                    <label key={risk} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${approveRisk === risk ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-200'}`}>
                                        <input type="radio" name="risk" value={risk} checked={approveRisk === risk} onChange={(e) => setApproveRisk(e.target.value)} className="hidden" />
                                        <span className={`text-sm font-medium capitalize ${approveRisk === risk ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>{risk}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1 mb-5">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Catatan Review (Opsional)</span>
                            <textarea rows={3} value={approveNotes} onChange={e => setApproveNotes(e.target.value)}
                                placeholder="Masukkan catatan persetujuan jika ada..."
                                className="w-full px-4 py-3 text-sm border border-gray-100 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none placeholder:text-gray-400" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowApproveModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">Batal</button>
                            <button
                                onClick={handleConfirmApprove}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all">
                                <CheckCircle2 className="w-4 h-4" />Konfirmasi Setujui
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowRejectModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-[520px] max-w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t("kyc_member.reject_modal_title")}</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 pl-11">{t("kyc_member.reject_modal_sub")}</p>
                        <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("kyc_member.reject_reasons_label")}</span>
                                <span className="text-[10px] font-bold bg-gray-50 dark:bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{selectedReasons.length}/3</span>
                            </div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {REJECTION_REASONS.map(r => (
                                    <label key={r}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${selectedReasons.includes(r) ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800" : "border-gray-100 dark:border-gray-800 hover:border-gray-200"}`}>
                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${selectedReasons.includes(r) ? "bg-red-500 border-red-500" : "border-gray-300 dark:border-gray-600"}`}>
                                            {selectedReasons.includes(r) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={selectedReasons.includes(r)} onChange={() => toggleReason(r)} disabled={selectedReasons.length >= 3 && !selectedReasons.includes(r)} />
                                        <span className={`text-sm transition-colors ${selectedReasons.includes(r) ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-300"}`}>{r}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1 mb-5">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t("kyc_member.reject_note_label")}</span>
                            <textarea rows={3} value={additionalNote} onChange={e => setAdditionalNote(e.target.value)}
                                placeholder={t("kyc_member.reject_note_placeholder")}
                                className="w-full px-4 py-3 text-sm border border-gray-100 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-400 resize-none placeholder:text-gray-400" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowRejectModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">{t("kyc_member.reject_btn_cancel")}</button>
                            <button
                                disabled={selectedReasons.length === 0 && !additionalNote.trim()}
                                onClick={handleConfirmReject}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all">
                                <XCircle className="w-4 h-4" />{t("kyc_member.reject_btn_confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Action Dropdown (titik tiga) per baris tabel ───────────────────────────
function KycActionDropdown({
    member, onView, onStartReview, isProcessing
}: {
    member: KycSubmission
    onView: () => void
    onStartReview: (id: number) => void
    isProcessing: boolean
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 transition-colors"
            >
                <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {open && (
                <div
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-9 z-40 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1.5 overflow-hidden"
                >
                    {/* Lihat Detail */}
                    <button
                        onClick={() => { setOpen(false); onView() }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        Lihat Detail
                    </button>
                    {/* Sedang Direview — hanya muncul jika status Pending */}
                    {member.status === 0 && (
                        <>
                            <div className="my-1 h-px bg-gray-100 dark:bg-gray-800 mx-3" />
                            <button
                                onClick={() => { setOpen(false); onStartReview(member.id) }}
                                disabled={isProcessing}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                <PlayCircle className="w-3.5 h-3.5" />
                                Sedang Direview
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function KycMemberContent() {
    const { t } = useI18n()
    const statusConfig = useStatusConfig(t)
    const getDocLabel = useDocLabel(t)

    // Data
    const [items, setItems] = useState<KycSubmission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isApiData, setIsApiData] = useState(false)
    const [totalCount, setTotalCount] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)

    // Dummy image mapping (id => doc & selfie image path)
    const DUMMY_IMG_MAP: Record<number, { doc: string; selfie: string }> = {
        1001: { doc: "/dummy-member/3.webp", selfie: "/dummy-member/1.webp" },
        1002: { doc: "/dummy-member/4.webp", selfie: "/dummy-member/5.webp" },
        1003: { doc: "/dummy-member/2.webp", selfie: "/dummy-member/8.png" },
        1004: { doc: "/dummy-member/3.webp", selfie: "/dummy-member/6.webp" },
    }

    // UI State
    const [activeTab, setActiveTab] = useState<TabKey>("semua")
    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(10)
    const [selectedMember, setSelectedMember] = useState<KycSubmission | null>(null)
    const [showFilter, setShowFilter] = useState(false)
    const [filterDocTypes, setFilterDocTypes] = useState<string[]>([])
    const [filterStatuses, setFilterStatuses] = useState<number[]>([])
    const [tempFilterDocTypes, setTempFilterDocTypes] = useState<string[]>([])
    const [tempFilterStatuses, setTempFilterStatuses] = useState<number[]>([])
    const [toasts, setToasts] = useState<ToastItem[]>([])

    // Toast helpers
    const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])
    const addToast = useCallback((message: string, type: "success" | "error") => {
        const id = Date.now()
        setToasts(p => [...p, { id, message, type }])
        setTimeout(() => removeToast(id), 4000)
    }, [removeToast])

    // Fetch data
    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const clientToken = getClientToken()
            const res = await getKycAll(1, 100, undefined, clientToken || undefined)
            if (res.success && res.data.length > 0) {
                setItems(res.data)
                setTotalCount(res.totalCount)
                setIsApiData(true)
            } else {
                // fallback to dummy — attach placeholder images
                const withImages = DUMMY_DATA.map(d => ({
                    ...d,
                    _dummyDocImage: DUMMY_IMG_MAP[d.id]?.doc,
                    _dummySelfieImage: DUMMY_IMG_MAP[d.id]?.selfie,
                }))
                setItems(withImages)
                setTotalCount(DUMMY_DATA.length)
                setIsApiData(false)
            }
        } catch {
            const withImages = DUMMY_DATA.map(d => ({
                ...d,
                _dummyDocImage: DUMMY_IMG_MAP[d.id]?.doc,
                _dummySelfieImage: DUMMY_IMG_MAP[d.id]?.selfie,
            }))
            setItems(withImages as any)
            setTotalCount(DUMMY_DATA.length)
            setIsApiData(false)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // Tab counts
    const tabCounts = useMemo(() => ({
        semua: items.length,
        pending: items.filter(x => x.status === 0).length,
        in_review: items.filter(x => x.status === 1).length,
        approved: items.filter(x => x.status === 2).length,
        rejected: items.filter(x => x.status === 3).length,
    }), [items])

    const tabs: { key: TabKey; label: string }[] = [
        { key: "semua", label: t("kyc_member.tab_all") },
        { key: "pending", label: t("kyc_member.tab_pending") },
        { key: "in_review", label: t("kyc_member.tab_in_review") },
        { key: "approved", label: t("kyc_member.tab_approved") },
        { key: "rejected", label: t("kyc_member.tab_rejected") },
    ]

    const tabStatusMap: Record<TabKey, number | null> = {
        semua: null, pending: 0, in_review: 1, approved: 2, rejected: 3
    }

    // Filter & paginate
    const filteredData = useMemo(() => {
        let data = [...items]
        const tabStatus = tabStatusMap[activeTab]
        if (tabStatus !== null) data = data.filter(x => x.status === tabStatus)
        if (search.trim()) {
            const q = search.toLowerCase()
            data = data.filter(x =>
                (x.fullName?.toLowerCase().includes(q)) ||
                (x.username?.toLowerCase().includes(q)) ||
                (x.email?.toLowerCase().includes(q))
            )
        }
        if (filterStatuses.length > 0) {
            data = data.filter(x => filterStatuses.includes(x.status))
        }
        if (filterDocTypes.length > 0) {
            data = data.filter(x => x.documentType ? filterDocTypes.includes(x.documentType) : false)
        }
        return data
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, activeTab, search, filterDocTypes, filterStatuses])

    const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage))
    const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage)

    // Actions
    const handleStartReview = async (id: number) => {
        setIsProcessing(true)
        try {
            if (!isApiData) {
                // Dummy mode: update local state only
                const name = items.find(x => x.id === id)?.fullName || `#${id}`
                await new Promise(r => setTimeout(r, 500))
                setItems(prev => prev.map(x => x.id === id ? { ...x, status: 1 as const } : x))
                addToast(t("kyc_member.toast_start_review_ok").replace("{name}", name), "success")
                return
            }
            const token = getClientToken()
            const res = await startKycReview(id, token || undefined)
            if (res.success) {
                const name = items.find(x => x.id === id)?.fullName || `#${id}`
                addToast(t("kyc_member.toast_start_review_ok").replace("{name}", name), "success")
                setItems(prev => prev.map(x => x.id === id ? { ...x, status: 1 as const } : x))
            } else {
                addToast(t("kyc_member.toast_start_review_err").replace("{msg}", res.message), "error")
            }
        } catch (e: any) {
            addToast(t("kyc_member.toast_start_review_err").replace("{msg}", e?.message || ""), "error")
        } finally {
            setIsProcessing(false)
        }
    }

    const handleApprove = async (id: number, notes: string = "", riskLevel: string = "low") => {
        setIsProcessing(true)
        try {
            if (!isApiData) {
                // Dummy mode: update local state only
                const name = items.find(x => x.id === id)?.fullName || `#${id}`
                await new Promise(r => setTimeout(r, 500))
                setItems(prev => prev.map(x => x.id === id ? { ...x, status: 2 as const, reviewNotes: notes, riskLevel: riskLevel } : x))
                addToast(t("kyc_member.toast_approve_ok").replace("{name}", name), "success")
                return
            }
            const token = getClientToken()
            const res = await reviewKyc(id, true, null, notes, riskLevel, token || undefined)
            const name = items.find(x => x.id === id)?.fullName || `#${id}`
            if (res.success) {
                addToast(t("kyc_member.toast_approve_ok").replace("{name}", name), "success")
                setItems(prev => prev.map(x => x.id === id ? { ...x, status: 2 as const, reviewNotes: notes, riskLevel: riskLevel } : x))
            } else {
                addToast(t("kyc_member.toast_approve_err").replace("{msg}", res.message), "error")
            }
        } catch (e: any) {
            addToast(t("kyc_member.toast_approve_err").replace("{msg}", e?.message || ""), "error")
        } finally {
            setIsProcessing(false)
        }
    }

    const handleReject = async (id: number, reason: string, notes: string) => {
        setIsProcessing(true)
        try {
            if (!isApiData) {
                // Dummy mode: update local state only
                const name = items.find(x => x.id === id)?.fullName || `#${id}`
                await new Promise(r => setTimeout(r, 500))
                setItems(prev => prev.map(x => x.id === id ? { ...x, status: 3 as const, rejectionReason: reason } : x))
                addToast(t("kyc_member.toast_reject_ok").replace("{name}", name), "success")
                return
            }
            const token = getClientToken()
            const res = await reviewKyc(id, false, reason, notes, null, token || undefined)
            const name = items.find(x => x.id === id)?.fullName || `#${id}`
            if (res.success) {
                addToast(t("kyc_member.toast_reject_ok").replace("{name}", name), "success")
                setItems(prev => prev.map(x => x.id === id ? { ...x, status: 3 as const, rejectionReason: reason } : x))
            } else {
                addToast(t("kyc_member.toast_reject_err").replace("{msg}", res.message), "error")
            }
        } catch (e: any) {
            addToast(t("kyc_member.toast_reject_err").replace("{msg}", e?.message || ""), "error")
        } finally {
            setIsProcessing(false)
        }
    }

    const DOC_TYPES = ["NATIONAL_ID", "PASSPORT", "DRIVING_LICENSE", "STUDENT_CARD", "RESIDENCE_PERMIT"]

    // Show dummy-mode info toast once on mount
    useEffect(() => {
        if (!isLoading && !isApiData) {
            const id = Date.now()
            setToasts(p => [...p, { id, message: "Mode demo aktif — data dummy, API belum tersedia", type: "info" }])
            setTimeout(() => removeToast(id), 6000)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-5">
            <Toast toasts={toasts} onRemove={removeToast} />

            {selectedMember && (
                <KycDetailModal
                    member={selectedMember}
                    onClose={() => setSelectedMember(null)}
                    onStartReview={handleStartReview}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isProcessing={isProcessing}
                />
            )}

            {/* Filter Drawer */}
            {showFilter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilter(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[400px] max-w-[calc(100vw-24px)] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-500" />
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">{t("kyc_member.filter")}</h2>
                            </div>
                            <button onClick={() => setShowFilter(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        {/* Status Filter */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Status</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setTempFilterStatuses([])}
                                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${tempFilterStatuses.length === 0 ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 bg-white dark:bg-gray-800"}`}>
                                    Semua Status
                                </button>
                                {[0, 1, 2, 3].map(s => {
                                    const stInfo = statusConfig[s as 0 | 1 | 2 | 3]
                                    return (
                                        <button key={s} onClick={() => setTempFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 ${tempFilterStatuses.includes(s) ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 bg-white dark:bg-gray-800"}`}>
                                            <stInfo.icon className="w-3 h-3" />
                                            {stInfo.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Doc Type Filter */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t("kyc_member.filter_doc_type")}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setTempFilterDocTypes([])}
                                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${tempFilterDocTypes.length === 0 ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 bg-white dark:bg-gray-800"}`}>
                                    {t("kyc_member.filter_doc_all")}
                                </button>
                                {DOC_TYPES.map(d => (
                                    <button key={d} onClick={() => setTempFilterDocTypes(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${tempFilterDocTypes.includes(d) ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 bg-white dark:bg-gray-800"}`}>
                                        {getDocLabel(d)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={() => { 
                                setTempFilterDocTypes([]); 
                                setTempFilterStatuses([]);
                            }}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                <RotateCcw className="w-3.5 h-3.5" />{t("kyc_member.filter_reset")}
                            </button>
                            <button onClick={() => {
                                setFilterDocTypes(tempFilterDocTypes);
                                setFilterStatuses(tempFilterStatuses);
                                setShowFilter(false);
                                setPage(1);
                            }}
                                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors">
                                {t("kyc_member.filter_apply")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1600px] mx-auto">

                {/* Header */}
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t("kyc_member.page_title")}</h1>
                    </div>
                    {/* Refresh Button - compact icon-only on mobile */}
                    <button onClick={fetchData} disabled={isLoading}
                        className="flex items-center justify-center gap-2 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 absolute right-4 sm:relative sm:right-auto">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">{t("kyc_member.refresh")}</span>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 w-full mb-3">
                    {/* Search Bar */}
                    <div className="flex items-center flex-1 min-w-[140px]">
                        <div className="flex w-full rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1) } }}
                                placeholder={t("kyc_member.search_placeholder")}
                                className="w-full pl-3 pr-2 h-9 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
                            />
                            <button onClick={() => { setSearch(searchInput); setPage(1) }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 w-10 flex items-center justify-center shrink-0">
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {/* Filter Button - icon only on mobile */}
                    <button onClick={() => {
                        setTempFilterDocTypes(filterDocTypes);
                        setTempFilterStatuses(filterStatuses);
                        setShowFilter(true);
                    }}
                        className={`relative flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 text-xs font-medium rounded-lg transition-colors border ${(filterDocTypes.length > 0 || filterStatuses.length > 0) ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"}`}>
                        <Filter className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t("kyc_member.filter")}</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 mb-0 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                    {tabs.map(tab => (
                        <button key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPage(1) }}
                            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${activeTab === tab.key ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                            {tab.label}
                            {tabCounts[tab.key] > 0 && (
                                <span className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full ${activeTab === tab.key ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                                    {tabCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Table Card */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-800">
                                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 w-[28%]">{t("kyc_member.col_user")}</th>
                                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-[16%]">{t("kyc_member.col_document")}</th>
                                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-[15%]">{t("kyc_member.col_submitted")}</th>
                                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-[16%]">{t("kyc_member.col_status")}</th>
                                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{t("kyc_member.col_action")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                                    <AlertCircle className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                                                    <p className="text-sm font-medium">{t("kyc_member.no_data")}</p>
                                                    <p className="text-xs text-gray-400">{t("kyc_member.no_data_sub")}</p>
                                                </div>
                                            </td></tr>
                                        ) : paginatedData.map(member => {
                                            const st = statusConfig[member.status as 0 | 1 | 2 | 3] ?? statusConfig[0]
                                            const StIcon = st.icon
                                            const initials = getInitials(member.fullName || member.username)
                                            const avatarBg = getAvatarColor(member.id)
                                            const displayName = val(member.fullName, val(member.username, `User #${member.userId}`))
                                            return (
                                                <tr key={member.id}
                                                    onClick={() => setSelectedMember(member)}
                                                    className="border-b border-gray-50 dark:border-gray-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer">
                                                    {/* User */}
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center flex-shrink-0`}>
                                                                <span className="text-white text-xs font-bold">{initials}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900 dark:text-white text-sm">{displayName}</p>
                                                                {member.username && <p className="text-xs text-gray-400 mt-0.5">@{member.username}</p>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Document */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                            <CreditCard className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                            {getDocLabel(member.documentType)}
                                                        </div>
                                                        {member.documentNumber && (
                                                            <p className="text-xs text-gray-400 mt-0.5 ml-5">{member.documentNumber}</p>
                                                        )}
                                                    </td>
                                                    {/* Date */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                            {formatDate(member.createdAt)}
                                                        </div>
                                                    </td>
                                                    {/* Status */}
                                                    <td className="px-4 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>
                                                            <StIcon className="w-3 h-3" />{st.label}
                                                        </span>
                                                    </td>
                                                    {/* Action — titik tiga dropdown */}
                                                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                                        <KycActionDropdown
                                                            member={member}
                                                            onView={() => setSelectedMember(member)}
                                                            onStartReview={handleStartReview}
                                                            isProcessing={isProcessing}
                                                        />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                                {paginatedData.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-16 text-gray-400 px-4">
                                        <AlertCircle className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                                        <p className="text-sm font-medium text-center">{t("kyc_member.no_data")}</p>
                                    </div>
                                ) : paginatedData.map(member => {
                                    const st = statusConfig[member.status as 0 | 1 | 2 | 3] ?? statusConfig[0]
                                    const StIcon = st.icon
                                    const initials = getInitials(member.fullName || member.username)
                                    const avatarBg = getAvatarColor(member.id)
                                    const displayName = val(member.fullName, val(member.username, `User #${member.userId}`))
                                    return (
                                        <div key={member.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => setSelectedMember(member)}>
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                    <span className="text-white text-xs font-bold">{initials}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{displayName}</p>
                                                            {member.username && <p className="text-xs text-gray-400">@{member.username}</p>}
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.cls}`}>
                                                            <StIcon className="w-2.5 h-2.5" />{st.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <CreditCard className="w-3 h-3" />
                                                            {getDocLabel(member.documentType)}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(member.createdAt)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => setSelectedMember(member)}
                                                            className="flex-1 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1">
                                                            <Eye className="w-3.5 h-3.5" />{t("kyc_member.action_view")}
                                                        </button>
                                                        {(member.status === 0 || member.status === 1) && (
                                                            <button onClick={() => { 
                                                                handleApprove(member.id, "", "low") 
                                                            }} disabled={isProcessing}
                                                                className="flex-1 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />{t("kyc_member.action_approve")}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center flex-wrap gap-1">
                            {t("kyc_member.showing")}{" "}
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {filteredData.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filteredData.length)}
                            </span>{" "}
                            {t("kyc_member.of")}{" "}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredData.length}</span>{" "}
                            {t("kyc_member.data")}
                            &nbsp;<span className="text-gray-400">{t("kyc_member.per_page")}</span>
                            <PerPageSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let p = i + 1
                                if (totalPages > 5) {
                                    if (page <= 3) p = i + 1
                                    else if (page >= totalPages - 2) p = totalPages - 4 + i
                                    else p = page - 2 + i
                                }
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${page === p ? "bg-emerald-500 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                                        {p}
                                    </button>
                                )
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function KycMemberPage() {
    return <KycMemberContent />
}
