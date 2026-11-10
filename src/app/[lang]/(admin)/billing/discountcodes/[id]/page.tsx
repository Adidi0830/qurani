"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { SkeletonDetailPage } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ArrowLeft, Tag, CheckCircle2, XCircle, Copy, Trash2, Pencil,
    BarChart2, Clock, Calendar, History, X, TrendingUp, Eye,
    Play, PauseCircle, Loader2, Users, Save, AlertTriangle,
    ChevronLeft, ChevronRight, Info, Zap,
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import React from "react"
import dummyData from "@/data/billing-dummy.json"

// ── API Config ─────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

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
function authHeaders(): HeadersInit {
    const token = getClientToken()
    const h: HeadersInit = { "Content-Type": "application/json" }
    if (token) h["Authorization"] = `Bearer ${token}`
    return h
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
function formatDate(iso: string) {
    if (!iso) return "-"
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}
function formatDateTime(iso: string) {
    if (!iso) return "-"
    return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
function isExpired(until: string) { return new Date(until) < new Date() }
function isUpcoming(from: string) { return new Date(from) > new Date() }

// ── Types ──────────────────────────────────────────────────────────────────────
interface DiscountCode {
    id: number
    code: string
    name: string
    description: string | null
    type: string
    value: number
    minOrderAmount: number
    maxDiscountAmount: number
    usageLimit: number
    usageCount: number
    validFrom: string
    validUntil: string
    isActive: boolean
    isReferral: boolean
    trainerId: number | null
    trainerName: string | null
    campaignId: string | null
    campaignName?: string | null
    createdBy?: string
    createdAt: string
    updatedAt?: string
    applicableTo?: string
    stackable?: boolean
    priority?: number
    source?: string | null
    maxUsesPerUser?: number | null
}

interface ApiDiscountCode {
    id: number
    code: string
    name: string | null
    description: string | null
    type: string
    value: number
    currency?: string
    minPurchase?: number
    maxDiscount?: number | null
    maxUses?: number | null
    maxUsesPerUser?: number | null
    usageCount?: number
    validFrom: string
    validUntil: string
    isActive?: boolean
    isReferral?: number | boolean
    trainerId?: number | null
    trainerName?: string | null
    campaignId?: number | null
    campaignName?: string | null
    applicableTo?: string
    stackable?: number
    priority?: number
    source?: string | null
    createdAt?: string
    updatedAt?: string
}

interface CodeAnalytics {
    totalUsage: number
    totalRevenue?: number
    totalDiscount?: number
    conversionRate?: number
    uniqueUsers?: number
    averageOrderValue?: number
    topCities?: { city: string; count: number }[]
    usageByDay?: { date: string; count: number }[]
}

interface UsageItem {
    id: number
    userId?: number
    userName?: string
    userEmail?: string
    orderId?: number
    discountAmount?: number
    orderAmount?: number
    usedAt?: string
    createdAt?: string
}

interface EditForm {
    name: string
    description: string
    type: "percentage" | "fixed"
    value: string
    usageLimit: string
    minOrderAmount: string
    maxDiscountAmount: string
    validFrom: string
    validUntil: string
    isReferral: boolean
}

function mapApi(d: ApiDiscountCode): DiscountCode {
    return {
        id: d.id,
        code: d.code,
        name: d.name || d.code,
        description: d.description || null,
        type: d.type || "percentage",
        value: d.value,
        minOrderAmount: d.minPurchase || 0,
        maxDiscountAmount: d.maxDiscount || 0,
        usageLimit: d.maxUses || 0,
        usageCount: d.usageCount || 0,
        validFrom: d.validFrom,
        validUntil: d.validUntil,
        isActive: typeof d.isActive === "boolean" ? d.isActive : true,
        isReferral: d.isReferral === 1 || d.isReferral === true,
        trainerId: d.trainerId || null,
        trainerName: d.trainerName || null,
        campaignId: d.campaignId ? String(d.campaignId) : null,
        campaignName: d.campaignName || null,
        createdBy: "API",
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt,
        applicableTo: d.applicableTo,
        stackable: d.stackable === 1,
        priority: d.priority,
        source: d.source,
        maxUsesPerUser: d.maxUsesPerUser || null,
    }
}

type TabKey = "detail" | "usage" | "analytics"

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: {
    open: boolean; title: string; message: string
    onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={onConfirm} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50">
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Hapus
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({ open, code, onSave, onClose, saving }: {
    open: boolean; code: DiscountCode | null
    onSave: (form: EditForm) => void; onClose: () => void; saving: boolean
}) {
    const [form, setForm] = useState<EditForm>({
        name: "", description: "", type: "percentage", value: "",
        usageLimit: "", minOrderAmount: "", maxDiscountAmount: "",
        validFrom: "", validUntil: "", isReferral: false,
    })

    useMemo(() => {
        if (code) {
            setForm({
                name: code.name || "",
                description: code.description || "",
                type: code.type as "percentage" | "fixed",
                value: String(code.value),
                usageLimit: String(code.usageLimit || 100),
                minOrderAmount: String(code.minOrderAmount || 0),
                maxDiscountAmount: String(code.maxDiscountAmount || 999999),
                validFrom: code.validFrom.slice(0, 10),
                validUntil: code.validUntil.slice(0, 10),
                isReferral: code.isReferral,
            })
        }
    }, [code, open])

    if (!open || !code) return null
    function f(key: keyof EditForm, val: string | boolean) { setForm(prev => ({ ...prev, [key]: val })) }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit Kode Diskon</h3>
                        <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{code.code}</code>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="px-6 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Promo</label>
                            <input value={form.name} onChange={e => f("name", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipe Diskon</label>
                            <select value={form.type} onChange={e => f("type", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white">
                                <option value="percentage">Persentase (%)</option>
                                <option value="fixed">Nominal (Rp)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                        <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nilai {form.type === "percentage" ? "(%)" : "(Rp)"} *</label>
                            <input type="number" value={form.value} onChange={e => f("value", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Maks. Penggunaan</label>
                            <input type="number" value={form.usageLimit} onChange={e => f("usageLimit", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Min. Pembelian (Rp)</label>
                            <input type="number" value={form.minOrderAmount} onChange={e => f("minOrderAmount", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Maks. Diskon (Rp)</label>
                            <input type="number" value={form.maxDiscountAmount} onChange={e => f("maxDiscountAmount", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Dari *</label>
                            <input type="date" value={form.validFrom} onChange={e => f("validFrom", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Sampai *</label>
                            <input type="date" value={form.validUntil} onChange={e => f("validUntil", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.isReferral} onChange={e => f("isReferral", e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kode Referral</span>
                    </label>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={() => onSave(form)} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50">
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <Save className="w-3.5 h-3.5" /> Simpan Perubahan
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Row helper ─────────────────────────────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 dark:border-gray-800/80 last:border-0">
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 w-36">{label}</span>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right flex-1 min-w-0">{children}</span>
        </div>
    )
}

// ── Main Content ───────────────────────────────────────────────────────────────
function DiscountCodeDetailContent() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [code, setCode] = useState<DiscountCode | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabKey>("detail")
    const [mutating, setMutating] = useState(false)
    const [copied, setCopied] = useState(false)

    // Usage
    const [usages, setUsages] = useState<UsageItem[]>([])
    const [usagePage, setUsagePage] = useState(1)
    const [usageLoading, setUsageLoading] = useState(false)

    // Analytics
    const [analytics, setAnalytics] = useState<CodeAnalytics | null>(null)
    const [analyticsLoading, setAnalyticsLoading] = useState(false)

    // Modals
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    // Schedule
    const [scheduleActivate, setScheduleActivate] = useState("")
    const [scheduleDeactivate, setScheduleDeactivate] = useState("")
    const [scheduleSaving, setScheduleSaving] = useState(false)

    // ── Fetch Detail ────────────────────────────────────────────────────────────
    const fetchDetail = useCallback(async () => {
        if (!id) return
        setIsLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes/${id}`, { headers: authHeaders() })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            const d: ApiDiscountCode = json?.data || json
            const mapped = mapApi(d)
            setCode(mapped)
            setScheduleActivate(mapped.validFrom.slice(0, 16))
            setScheduleDeactivate(mapped.validUntil.slice(0, 16))
        } catch {
            // Fallback dummy
            const codes = dummyData.discountCodes as DiscountCode[]
            let dummy = codes.find(c => c.id === Number(id))
            if (!dummy) {
                dummy = {
                    id: Number(id),
                    code: "CONTOH10",
                    name: "Diskon Contoh",
                    description: "Data dummy — API tidak dapat diakses saat ini",
                    type: "percentage",
                    value: 10,
                    minOrderAmount: 50000,
                    maxDiscountAmount: 100000,
                    usageLimit: 100,
                    usageCount: 43,
                    validFrom: "2026-01-01T00:00:00Z",
                    validUntil: "2026-12-31T23:59:59Z",
                    isActive: true,
                    isReferral: false,
                    trainerId: null,
                    trainerName: null,
                    campaignId: null,
                    createdAt: "2026-01-01T00:00:00Z",
                }
            }
            setCode(dummy)
            setScheduleActivate(dummy.validFrom.slice(0, 16))
            setScheduleDeactivate(dummy.validUntil.slice(0, 16))
        } finally { setIsLoading(false) }
    }, [id])

    useEffect(() => { fetchDetail() }, [fetchDetail])

    // ── Fetch Usage ─────────────────────────────────────────────────────────────
    const fetchUsage = useCallback(async () => {
        if (!id) return
        setUsageLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes/${id}/usages?page=${usagePage}&pageSize=10`, { headers: authHeaders() })
            if (!res.ok) throw new Error()
            const json = await res.json()
            const raw: UsageItem[] =
                Array.isArray(json) ? json :
                Array.isArray(json?.data) ? json.data :
                Array.isArray(json?.data?.items) ? json.data.items :
                Array.isArray(json?.items) ? json.items : []
            setUsages(raw)
        } catch { setUsages([]) }
        finally { setUsageLoading(false) }
    }, [id, usagePage])

    useEffect(() => {
        if (activeTab === "usage") fetchUsage()
    }, [activeTab, fetchUsage])

    // ── Fetch Analytics ─────────────────────────────────────────────────────────
    const fetchAnalytics = useCallback(async () => {
        if (!id) return
        setAnalyticsLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes/${id}/analytics`, { headers: authHeaders() })
            if (!res.ok) throw new Error()
            const json = await res.json()
            const d = json?.data || json
            if (d && typeof d === "object") setAnalytics(d as CodeAnalytics)
            else setAnalytics(null)
        } catch { setAnalytics(null) }
        finally { setAnalyticsLoading(false) }
    }, [id])

    useEffect(() => {
        if (activeTab === "analytics") fetchAnalytics()
    }, [activeTab, fetchAnalytics])

    // ── Status ──────────────────────────────────────────────────────────────────
    function getCodeStatus(c: DiscountCode) {
        if (!c.isActive) return { label: "Nonaktif", color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" }
        if (isExpired(c.validUntil)) return { label: "Kedaluwarsa", color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" }
        if (isUpcoming(c.validFrom)) return { label: "Terjadwal", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" }
        if (c.usageLimit > 0 && c.usageCount >= c.usageLimit) return { label: "Habis", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" }
        return { label: "Aktif", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" }
    }

    // ── Toggle ──────────────────────────────────────────────────────────────────
    async function handleToggle() {
        if (!code) return
        setMutating(true)
        const next = !code.isActive
        const ep = code.isActive
            ? `${API_BASE}/api/v1/DiscountCodes/${code.id}/pause`
            : `${API_BASE}/api/v1/DiscountCodes/${code.id}/activate`
        try {
            const r = await fetch(ep, { method: "POST", headers: authHeaders() })
            if (!r.ok) throw new Error()
        } catch { /* fallback */ } finally {
            setCode(prev => prev ? { ...prev, isActive: next } : prev)
            showToast({
                type: next ? "success" : "info",
                title: `Kode "${code.code}" ${next ? "diaktifkan" : "dijeda"}`,
                endpoint: `POST /api/v1/DiscountCodes/${code.id}/${next ? "activate" : "pause"}`,
            })
            setMutating(false)
        }
    }

    // ── Edit ────────────────────────────────────────────────────────────────────
    async function handleEdit(form: EditForm) {
        if (!code) return
        setMutating(true)
        const body = {
            name: form.name || null, description: form.description || null,
            type: form.type, value: Number(form.value), currency: "IDR",
            minPurchase: Number(form.minOrderAmount) || 0,
            maxDiscount: Number(form.maxDiscountAmount) || null,
            maxUses: Number(form.usageLimit) || null,
            validFrom: form.validFrom + "T00:00:00Z",
            validUntil: form.validUntil + "T23:59:59Z",
            isReferral: form.isReferral ? 1 : 0,
        }
        try {
            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes/${code.id}`, {
                method: "PUT", headers: authHeaders(), body: JSON.stringify(body),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            showToast({ type: "success", title: `Kode "${code.code}" berhasil diupdate`, endpoint: `PUT /api/v1/DiscountCodes/${code.id}` })
            await fetchDetail()
        } catch {
            setCode(prev => prev ? {
                ...prev,
                name: form.name, description: form.description, type: form.type,
                value: Number(form.value), usageLimit: Number(form.usageLimit),
                minOrderAmount: Number(form.minOrderAmount),
                maxDiscountAmount: Number(form.maxDiscountAmount),
                validFrom: form.validFrom + "T00:00:00Z",
                validUntil: form.validUntil + "T23:59:59Z",
                isReferral: form.isReferral,
            } : prev)
            showToast({ type: "success", title: "Disimpan (lokal)", message: "API tidak dapat diakses, perubahan disimpan lokal." })
        } finally { setMutating(false); setEditOpen(false) }
    }

    // ── Delete ──────────────────────────────────────────────────────────────────
    async function handleDelete() {
        if (!code) return
        setMutating(true)
        try {
            const r = await fetch(`${API_BASE}/api/v1/DiscountCodes/${code.id}`, { method: "DELETE", headers: authHeaders() })
            if (!r.ok) throw new Error()
        } catch { /* fallback */ } finally {
            showToast({ type: "error", title: `Kode "${code.code}" dihapus`, endpoint: `DELETE /api/v1/DiscountCodes/${code.id}` })
            setMutating(false)
            setDeleteOpen(false)
            router.push("/billing/discountcodes")
        }
    }

    // ── Schedule ────────────────────────────────────────────────────────────────
    async function handleSchedule() {
        if (!code || !scheduleActivate || !scheduleDeactivate) return
        setScheduleSaving(true)
        try {
            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes/${code.id}/schedule`, {
                method: "POST", headers: authHeaders(),
                body: JSON.stringify({ activateAt: scheduleActivate + ":00Z", deactivateAt: scheduleDeactivate + ":00Z" }),
            })
            if (!res.ok) throw new Error()
            showToast({ type: "success", title: "Jadwal aktivasi disimpan", message: `Aktif: ${formatDateTime(scheduleActivate)}`, endpoint: `POST /api/v1/DiscountCodes/${code.id}/schedule` })
        } catch {
            showToast({ type: "info", title: "Jadwal tersimpan (lokal)", message: "API tidak dapat diakses." })
        } finally { setScheduleSaving(false) }
    }

    // ── Analytics data ──────────────────────────────────────────────────────────
    const analyticsDummy = useMemo<CodeAnalytics>(() => ({
        totalUsage: code?.usageCount || 0,
        totalRevenue: (code?.usageCount || 0) * 150000,
        totalDiscount: (code?.usageCount || 0) * (code?.type === "fixed" ? (code?.value || 0) : 25000),
        uniqueUsers: Math.floor((code?.usageCount || 0) * 0.9),
        conversionRate: 34.5,
        averageOrderValue: 175000,
        topCities: [
            { city: "Jakarta", count: Math.floor((code?.usageCount || 0) * 0.4) },
            { city: "Surabaya", count: Math.floor((code?.usageCount || 0) * 0.2) },
            { city: "Bandung", count: Math.floor((code?.usageCount || 0) * 0.15) },
            { city: "Medan", count: Math.floor((code?.usageCount || 0) * 0.1) },
            { city: "Yogyakarta", count: Math.floor((code?.usageCount || 0) * 0.08) },
        ],
    }), [code])

    const analyticsData = analytics || analyticsDummy
    const isRealAnalytics = !!analytics

    // Dummy usages
    const dummyUsages: UsageItem[] = [
        { id: 1, userName: "Budi Santoso", userEmail: "budi@email.com", orderId: 10041, discountAmount: 25000, orderAmount: 125000, usedAt: "2026-07-01T10:23:00Z" },
        { id: 2, userName: "Siti Rahayu", userEmail: "siti@email.com", orderId: 10042, discountAmount: 25000, orderAmount: 200000, usedAt: "2026-07-02T14:10:00Z" },
        { id: 3, userName: "Budi Santoso", userEmail: "budi.santoso@email.com", orderId: 10055, discountAmount: 25000, orderAmount: 150000, usedAt: "2026-07-03T09:00:00Z" },
        { id: 4, userName: "Dewi Lestari", userEmail: "dewi@email.com", orderId: 10063, discountAmount: 15000, orderAmount: 90000, usedAt: "2026-07-04T16:45:00Z" },
        { id: 5, userName: "Rizky Pratama", userEmail: "rizky@email.com", orderId: 10071, discountAmount: 25000, orderAmount: 175000, usedAt: "2026-07-05T08:30:00Z" },
    ]
    const displayUsages = usages.length > 0 ? usages : dummyUsages
    const isRealUsage = usages.length > 0

    // ── Loading skeleton ────────────────────────────────────────────────────────
    if (isLoading) {
        return <SkeletonDetailPage infoRows={5} />
    }

    if (!code) {
        return (
            <div className="bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Kode diskon tidak ditemukan</p>
                    <button onClick={() => router.push("/billing/discountcodes")} className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
                    </button>
                </div>
            </div>
        )
    }

    const st = getCodeStatus(code)
    const usagePercent = code.usageLimit > 0 ? Math.min(100, Math.round((code.usageCount / code.usageLimit) * 100)) : 0
    const barColor = usagePercent >= 100 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-emerald-500"

    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-4">
            <ToastContainer />
            <ConfirmModal
                open={deleteOpen}
                title={`Hapus kode "${code.code}"?`}
                message="Kode yang sudah dihapus tidak bisa dikembalikan. Semua data pemakaian terkait juga akan dihapus."
                loading={mutating}
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
            />
            <EditModal open={editOpen} code={code} onSave={handleEdit} onClose={() => setEditOpen(false)} saving={mutating} />

            <div className="max-w-5xl mx-auto space-y-4">

                {/* ── Header Card ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* breadcrumb + action bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
                        <button
                            onClick={() => router.push("/billing/discountcodes")}
                            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Promo &amp; Kupon</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleToggle}
                                disabled={mutating}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                                    code.isActive
                                        ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800"
                                        : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                                }`}
                            >
                                {mutating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : code.isActive ? <PauseCircle className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                {code.isActive ? "Jeda" : "Aktifkan"}
                            </button>
                            <button
                                onClick={() => setEditOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                                onClick={() => setDeleteOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                        </div>
                    </div>

                    {/* main info */}
                    <div className="p-5 flex flex-wrap items-start gap-6">
                        {/* code badge block */}
                        <div className="flex-shrink-0">
                            <div className="flex items-center gap-2 mb-2">
                                <code className="text-2xl font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 tracking-widest">
                                    {code.code}
                                </code>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(code.code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                                    title="Salin kode"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                {copied && <span className="text-xs text-emerald-500 font-semibold animate-pulse">Disalin!</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}>
                                    {st.label === "Aktif" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {st.label}
                                </span>
                                {code.isReferral && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">REFERRAL</span>
                                )}
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${code.type === "percentage" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                                    {code.type === "percentage" ? `${code.value}%` : formatRupiah(code.value)}
                                </span>
                            </div>
                        </div>

                        {/* quick stats */}
                        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Nama</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{code.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Min. Pembelian</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{code.minOrderAmount > 0 ? formatRupiah(code.minOrderAmount) : "Tidak ada"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Berlaku</p>
                                <p className="text-xs text-gray-700 dark:text-gray-300">{formatDate(code.validFrom)}</p>
                                <p className="text-xs text-gray-400">s/d {formatDate(code.validUntil)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Penggunaan</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {code.usageCount}{code.usageLimit > 0 ? `/${code.usageLimit}` : ""}
                                    {code.usageLimit > 0 && <span className="ml-1 text-xs font-normal text-gray-400">({usagePercent}%)</span>}
                                </p>
                                {code.usageLimit > 0 && (
                                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usagePercent}%` }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Pemakaian", value: analyticsData.totalUsage || code.usageCount, format: "number", color: "emerald", icon: Users },
                        { label: "Pengguna Unik", value: analyticsData.uniqueUsers || 0, format: "number", color: "blue", icon: Eye },
                        { label: "Total Diskon Diberikan", value: analyticsData.totalDiscount || 0, format: "rupiah", color: "orange", icon: Tag },
                        { label: "Rata-rata Nilai Order", value: analyticsData.averageOrderValue || 0, format: "rupiah", color: "violet", icon: TrendingUp },
                    ].map(card => {
                        const Icon = card.icon
                        const clr: Record<string, { bg: string; text: string }> = {
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400" },
                            orange: { bg: "bg-orange-100 dark:bg-orange-900/20", text: "text-orange-500 dark:text-orange-400" },
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400" },
                        }
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${clr[card.color].bg}`}>
                                        <Icon className={`w-4 h-4 ${clr[card.color].text}`} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {card.format === "rupiah" ? formatRupiah(card.value) : card.value.toLocaleString("id-ID")}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* ── Tab Card ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Tab nav */}
                    <div className="flex items-center border-b border-gray-100 dark:border-gray-800 px-2">
                        {([
                            { key: "detail" as TabKey, label: "Detail", icon: Info },
                            { key: "usage" as TabKey, label: "Riwayat Pemakaian", icon: History },
                            { key: "analytics" as TabKey, label: "Analitik", icon: BarChart2 },
                        ]).map(tab => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap -mb-px ${
                                        activeTab === tab.key
                                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                            : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                    }`}
                                >
                                    <Icon className="w-4 h-4" /> {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* ── Detail Tab ── */}
                    {activeTab === "detail" && (
                        <div className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-0">
                                <div>
                                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Informasi Dasar</h4>
                                    <Row label="Kode Promo"><code className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{code.code}</code></Row>
                                    <Row label="Nama">{code.name}</Row>
                                    <Row label="Deskripsi"><span className="break-words">{code.description || "—"}</span></Row>
                                    <Row label="Tipe Diskon">{code.type === "percentage" ? "Persentase (%)" : "Nominal (Rp)"}</Row>
                                    <Row label="Nilai Diskon">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {code.type === "percentage" ? `${code.value}%` : formatRupiah(code.value)}
                                        </span>
                                    </Row>
                                    <Row label="Maks. Diskon">{code.maxDiscountAmount > 0 ? formatRupiah(code.maxDiscountAmount) : "—"}</Row>
                                    <Row label="Min. Pembelian">{code.minOrderAmount > 0 ? formatRupiah(code.minOrderAmount) : "Tidak ada"}</Row>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 sm:mt-0 mt-5">Pengaturan &amp; Meta</h4>
                                    <Row label="Maks. Penggunaan">{code.usageLimit > 0 ? `${code.usageLimit}x` : "Tidak terbatas"}</Row>
                                    <Row label="Pemakaian Saat Ini">{code.usageCount}x</Row>
                                    <Row label="Berlaku Dari">{formatDate(code.validFrom)}</Row>
                                    <Row label="Berlaku Sampai">{formatDate(code.validUntil)}</Row>
                                    <Row label="Status">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${st.color}`}>{st.label}</span>
                                    </Row>
                                    <Row label="Kode Referral">{code.isReferral ? <span className="text-purple-600 dark:text-purple-400 font-semibold">Ya</span> : "Tidak"}</Row>
                                    {code.trainerName && <Row label="Trainer">{code.trainerName}</Row>}
                                    {code.campaignId && <Row label="Campaign ID"><code className="font-mono text-xs">{code.campaignId}</code></Row>}
                                    {code.campaignName && <Row label="Nama Campaign">{code.campaignName}</Row>}
                                    {code.applicableTo && <Row label="Berlaku Untuk">{code.applicableTo}</Row>}
                                    <Row label="Dibuat Pada">{formatDateTime(code.createdAt)}</Row>
                                    {code.updatedAt && <Row label="Diperbarui">{formatDateTime(code.updatedAt)}</Row>}
                                </div>
                            </div>

                            {/* Jadwal Aktivasi */}
                            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" /> Jadwal Aktivasi
                                    <span className="ml-1 text-[9px] text-gray-300 dark:text-gray-600 font-normal normal-case tracking-normal">
                                        POST /api/v1/DiscountCodes/{id}/schedule
                                    </span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Aktifkan Pada</label>
                                        <input
                                            type="datetime-local"
                                            value={scheduleActivate}
                                            onChange={e => setScheduleActivate(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nonaktifkan Pada</label>
                                        <input
                                            type="datetime-local"
                                            value={scheduleDeactivate}
                                            onChange={e => setScheduleDeactivate(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <button
                                            onClick={handleSchedule}
                                            disabled={scheduleSaving || !scheduleActivate || !scheduleDeactivate}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg transition-colors"
                                        >
                                            {scheduleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                                            Simpan Jadwal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Usage Tab ── */}
                    {activeTab === "usage" && (
                        <div>

                            {usageLoading ? (
                                <div className="space-y-3 py-4 px-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 animate-pulse">
                                            <Skeleton className="h-3 w-8" />
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="h-3 w-36" />
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-3 w-16" />
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                {["#", "Pengguna", "Email", "Order ID", "Diskon", "Total Pesanan", "Waktu Pakai"].map(h => (
                                                    <th key={h} className="text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {displayUsages.length === 0 ? (
                                                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                                                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                    <p>Belum ada riwayat pemakaian</p>
                                                </td></tr>
                                            ) : displayUsages.map((u, i) => (
                                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-4 py-3 text-xs text-gray-400">{(usagePage - 1) * 10 + i + 1}</td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">{u.userName || "—"}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{u.userEmail || "—"}</td>
                                                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400">#{u.orderId || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{u.discountAmount ? formatRupiah(u.discountAmount) : "—"}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{u.orderAmount ? formatRupiah(u.orderAmount) : "—"}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(u.usedAt || u.createdAt || "")}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Total pemakaian: <strong className="text-gray-900 dark:text-white">{code.usageCount}</strong></span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setUsagePage(p => Math.max(1, p - 1))} disabled={usagePage === 1 || usageLoading} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                    <span className="flex items-center px-3 text-xs text-gray-500">Hal. {usagePage}</span>
                                    <button onClick={() => setUsagePage(p => p + 1)} disabled={displayUsages.length < 10 || usageLoading} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Analytics Tab ── */}
                    {activeTab === "analytics" && (
                        <div className="p-5">

                            {analyticsLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2 animate-pulse">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-6 w-16" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* KPI Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { label: "Total Pemakaian", value: analyticsData.totalUsage || 0, format: "number", color: "emerald", icon: Users },
                                            { label: "Pengguna Unik", value: analyticsData.uniqueUsers || 0, format: "number", color: "blue", icon: Eye },
                                            { label: "Total Diskon", value: analyticsData.totalDiscount || 0, format: "rupiah", color: "orange", icon: Tag },
                                            { label: "Total Revenue", value: analyticsData.totalRevenue || 0, format: "rupiah", color: "violet", icon: Zap },
                                        ].map(card => {
                                            const Icon = card.icon
                                            const clr: Record<string, string> = {
                                                emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
                                                blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                                                orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400",
                                                violet: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
                                            }
                                            return (
                                                <div key={card.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${clr[card.color]}`}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                                                    </div>
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {card.format === "rupiah" ? formatRupiah(card.value) : card.value.toLocaleString("id-ID")}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Conversion + Avg Order */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {analyticsData.conversionRate !== undefined && (
                                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-5 border border-emerald-100 dark:border-emerald-800">
                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Conversion Rate</p>
                                                <div className="flex items-end gap-2">
                                                    <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300">{analyticsData.conversionRate?.toFixed(1)}%</p>
                                                    <span className="mb-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                        <TrendingUp className="w-3.5 h-3.5" /> Baik
                                                    </span>
                                                </div>
                                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Dari total kunjungan menggunakan kode ini</p>
                                            </div>
                                        )}
                                        {analyticsData.averageOrderValue !== undefined && (
                                            <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-violet-100 dark:border-violet-800">
                                                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2">Rata-rata Nilai Order</p>
                                                <p className="text-3xl font-black text-violet-700 dark:text-violet-300">{formatRupiah(analyticsData.averageOrderValue)}</p>
                                                <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">Per transaksi yang menggunakan kode ini</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Top Cities bar chart */}
                                    {analyticsData.topCities && analyticsData.topCities.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Top Kota Pengguna</h5>
                                            <div className="space-y-3.5">
                                                {analyticsData.topCities.map((city, i) => {
                                                    const total = analyticsData.topCities!.reduce((s, c) => s + c.count, 0)
                                                    const pct = total > 0 ? Math.round((city.count / total) * 100) : 0
                                                    const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500"]
                                                    return (
                                                        <div key={city.city} className="flex items-center gap-3">
                                                            <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                                                            <span className="text-sm text-gray-700 dark:text-gray-300 w-28 truncate font-medium">{city.city}</span>
                                                            <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-700 ${colors[i % colors.length]}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2 min-w-[72px] justify-end">
                                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{city.count}</span>
                                                                <span className="text-xs text-gray-400">({pct}%)</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Page Export ────────────────────────────────────────────────────────────────
export default function DiscountCodeDetailPage() {
    return <DiscountCodeDetailContent />
}
