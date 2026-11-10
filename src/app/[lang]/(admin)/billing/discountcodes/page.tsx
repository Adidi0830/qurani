"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Search, ChevronLeft, ChevronRight, Tag, Users,
    ChevronsUpDown, CheckCircle2, XCircle, Copy,
    Trash2, Plus, Pencil, Zap, Loader2,
    Download, FlaskConical,
    X, Play, PauseCircle, MoreVertical, ExternalLink, Filter,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { SmartPagination } from "@/components/ui/smart-pagination"

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
    deskripsi?: string
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
    _deleted?: boolean
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

// Analytics response
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

// Usage item
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

function mapApiToCode(d: ApiDiscountCode): DiscountCode {
    return {
        id: d.id,
        code: d.code,
        name: d.name || d.code,
        description: d.description || d.name || null,
        deskripsi: d.description || "",
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
    }
}

type FilterStatus = "all" | "active" | "inactive" | "referral"
type FilterType = "all" | "percentage" | "fixed"

export interface FilterState {
    types: string[]
    statuses: string[]
    campaignId: string
    validFrom: string
    validUntil: string
}

const EMPTY_FILTER: FilterState = {
    types: [],
    statuses: [],
    campaignId: "",
    validFrom: "",
    validUntil: "",
}
type SortField = "code" | "value" | "usageCount" | "validUntil" | "createdAt"



interface FormState {
    code: string; name: string; description: string
    type: "percentage" | "fixed"; value: string
    usageLimit: string; minOrderAmount: string; maxDiscountAmount: string
    validFrom: string; validUntil: string
    isReferral: boolean; stackable: boolean; firstTimeOnly: boolean
}

const EMPTY_FORM: FormState = {
    code: "", name: "", description: "", type: "percentage",
    value: "", usageLimit: "100", minOrderAmount: "0",
    maxDiscountAmount: "999999", validFrom: "", validUntil: "",
    isReferral: false, stackable: false, firstTimeOnly: false,
}

function genId() { return Date.now() }

// ═══════════════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: {
    open: boolean; title: string; message: string
    onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={onConfirm} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50">
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Konfirmasi
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Code Form Modal ────────────────────────────────────────────────────────────
function CodeFormModal({ open, editItem, onSave, onClose, saving }: {
    open: boolean; editItem: DiscountCode | null
    onSave: (form: FormState, isEdit: boolean) => void
    onClose: () => void; saving: boolean
}) {
    const [form, setForm] = useState<FormState>(EMPTY_FORM)

    useMemo(() => {
        if (editItem) {
            setForm({
                code: editItem.code, name: editItem.name || "",
                description: editItem.description || editItem.deskripsi || "",
                type: editItem.type as "percentage" | "fixed",
                value: String(editItem.value), usageLimit: String(editItem.usageLimit || 100),
                minOrderAmount: String(editItem.minOrderAmount || 0),
                maxDiscountAmount: String(editItem.maxDiscountAmount || 999999),
                validFrom: editItem.validFrom.slice(0, 10), validUntil: editItem.validUntil.slice(0, 10),
                isReferral: editItem.isReferral, stackable: false, firstTimeOnly: false,
            })
        } else { setForm(EMPTY_FORM) }
    }, [editItem, open])

    if (!open) return null
    function f(key: keyof FormState, val: string | boolean) { setForm(prev => ({ ...prev, [key]: val })) }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{editItem ? "Edit Kode Diskon" : "Buat Kode Diskon Baru"}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl font-light">×</button>
                </div>
                <div className="px-6 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Kode Promo *</label>
                            <input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())} placeholder="HEMAT25..." disabled={!!editItem}
                                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white disabled:opacity-60" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Promo</label>
                            <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Diskon Ramadan 2026"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                        <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2} placeholder="Deskripsi singkat..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipe Diskon *</label>
                            <select value={form.type} onChange={e => f("type", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white">
                                <option value="percentage">Persentase (%)</option>
                                <option value="fixed">Nominal (Rp)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nilai {form.type === "percentage" ? "(%)" : "(Rp)"} *</label>
                            <input type="number" value={form.value} onChange={e => f("value", e.target.value)} placeholder={form.type === "percentage" ? "15" : "50000"}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Maks. Diskon (IDR)</label>
                        <input type="number" value={form.maxDiscountAmount} onChange={e => f("maxDiscountAmount", e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Min. Pembelian (Rp)</label>
                            <input type="number" value={form.minOrderAmount} onChange={e => f("minOrderAmount", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Maks. Penggunaan</label>
                            <input type="number" value={form.usageLimit} onChange={e => f("usageLimit", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Dari *</label>
                            <input type="date" value={form.validFrom} onChange={e => f("validFrom", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Sampai *</label>
                            <input type="date" value={form.validUntil} onChange={e => f("validUntil", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {([["isReferral", "Kode Referral"], ["firstTimeOnly", "First-Time Only"], ["stackable", "Stackable"]] as [keyof FormState, string][]).map(([k, lbl]) => (
                            <label key={k} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form[k] as boolean} onChange={e => f(k, e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{lbl}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={() => onSave(form, !!editItem)} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50">
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {editItem ? "Simpan Perubahan" : "Buat Kode"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Bulk Generate Modal (uses POST /api/v1/DiscountCodes/bulk-generate) ─────────
function BulkModal({ open, onClose, onGenerate, saving }: {
    open: boolean; onClose: () => void
    onGenerate: (opts: { prefix: string; count: number; codeLength: number; type: string; value: number; validFrom: string; validUntil: string; maxUsesPerCode: number | null; campaignName: string }) => void
    saving: boolean
}) {
    const [prefix, setPrefix] = useState("BULK")
    const [count, setCount] = useState(5)
    const [codeLength, setCodeLength] = useState(8)
    const [type, setType] = useState("percentage")
    const [value, setValue] = useState(10)
    const [maxUses, setMaxUses] = useState("")
    const [campaignName, setCampaignName] = useState("")
    const now = new Date()
    const threeMonths = new Date(now); threeMonths.setMonth(threeMonths.getMonth() + 3)
    const [validFrom, setValidFrom] = useState(now.toISOString().slice(0, 10))
    const [validUntil, setValidUntil] = useState(threeMonths.toISOString().slice(0, 10))

    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Bulk Generate Kode</h3>
                        <p className="text-xs text-gray-400 mt-0.5">POST /api/v1/DiscountCodes/bulk-generate</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light">×</button>
                </div>
                <div className="px-6 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Prefix *</label>
                            <input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())}
                                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Jumlah Kode * (1–1000)</label>
                            <input type="number" min={1} max={1000} value={count} onChange={e => setCount(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipe Diskon *</label>
                            <select value={type} onChange={e => setType(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                                <option value="percentage">Persentase (%)</option>
                                <option value="fixed">Nominal (Rp)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nilai *</label>
                            <input type="number" min={0.01} value={value} onChange={e => setValue(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Panjang Kode (4–12)</label>
                            <input type="number" min={4} max={12} value={codeLength} onChange={e => setCodeLength(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Maks. Penggunaan/Kode</label>
                            <input type="number" min={1} value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Tidak terbatas"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Dari</label>
                            <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Sampai</label>
                            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Kampanye</label>
                        <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Contoh: FLASH-SALE-Q3"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                    </div>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={() => onGenerate({ prefix, count, codeLength, type, value, validFrom: validFrom + "T00:00:00Z", validUntil: validUntil + "T23:59:59Z", maxUsesPerCode: maxUses ? Number(maxUses) : null, campaignName: campaignName || "" })} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors disabled:opacity-50">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        Generate {count} Kode
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Export Modal (GET /api/v1/DiscountCodes/export) ─────────────────────────────
function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [campaignId, setCampaignId] = useState("")
    const [loading, setLoading] = useState(false)

    if (!open) return null

    async function handleExport() {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (startDate) params.set("startDate", startDate + "T00:00:00Z")
            if (endDate) params.set("endDate", endDate + "T23:59:59Z")
            if (campaignId) params.set("campaignId", campaignId)

            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes/export?${params}`, { headers: authHeaders() })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `discount-codes-export-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
            showToast({ type: "success", title: "Export berhasil", message: "File CSV telah diunduh.", endpoint: "GET /api/v1/DiscountCodes/export" })
            onClose()
        } catch {
            showToast({ type: "error", title: "Export gagal", message: "API tidak dapat diakses. Silakan coba lagi." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Download className="w-4 h-4 text-emerald-500" /> Export ke CSV
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">GET /api/v1/DiscountCodes/export</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light">×</button>
                </div>
                <div className="px-6 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tanggal Mulai</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tanggal Selesai</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Campaign ID (opsional)</label>
                        <input value={campaignId} onChange={e => setCampaignId(e.target.value)} placeholder="Contoh: CAMP-2026-RAMADAN"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Kosongkan tanggal untuk mengexport semua data.</p>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={handleExport} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50">
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Export CSV
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── A/B Test Modal (POST /api/v1/DiscountCodes/ab-test) ─────────────────────────
function AbTestModal({ open, onClose, onSave, saving }: {
    open: boolean; onClose: () => void
    onSave: (data: object) => void; saving: boolean
}) {
    const [testName, setTestName] = useState("")
    const [codePrefix, setCodePrefix] = useState("")
    const now = new Date()
    const nextMonth = new Date(now); nextMonth.setMonth(nextMonth.getMonth() + 1)
    const [validFrom, setValidFrom] = useState(now.toISOString().slice(0, 10))
    const [validUntil, setValidUntil] = useState(nextMonth.toISOString().slice(0, 10))
    const [currency] = useState("IDR")
    const [variants, setVariants] = useState([
        { name: "Variant A", type: "percentage", value: 10, weight: 50 },
        { name: "Variant B", type: "percentage", value: 15, weight: 50 },
    ])

    if (!open) return null

    function updateVariant(idx: number, key: string, val: string | number) {
        setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [key]: val } : v))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FlaskConical className="w-4 h-4 text-pink-500" /> Buat A/B Test
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">POST /api/v1/DiscountCodes/ab-test</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light">×</button>
                </div>
                <div className="px-6 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Test *</label>
                            <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="Ramadan AB Test"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Prefix Kode *</label>
                            <input value={codePrefix} onChange={e => setCodePrefix(e.target.value.toUpperCase())} placeholder="ABTEST"
                                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Dari *</label>
                            <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Sampai *</label>
                            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
                        </div>
                    </div>
                    {/* Variants */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Variants *</p>
                            <button onClick={() => setVariants(prev => [...prev, { name: `Variant ${String.fromCharCode(65 + prev.length)}`, type: "percentage", value: 10, weight: 1 }])}
                                className="text-xs text-pink-500 hover:text-pink-600 font-semibold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Tambah
                            </button>
                        </div>
                        <div className="space-y-2">
                            {variants.map((v, i) => (
                                <div key={i} className="grid grid-cols-4 gap-2 items-end p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Nama</label>
                                        <input value={v.name} onChange={e => updateVariant(i, "name", e.target.value)}
                                            className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Tipe</label>
                                        <select value={v.type} onChange={e => updateVariant(i, "type", e.target.value)}
                                            className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none">
                                            <option value="percentage">%</option>
                                            <option value="fixed">Rp</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Nilai</label>
                                        <input type="number" value={v.value} onChange={e => updateVariant(i, "value", Number(e.target.value))}
                                            className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none" />
                                    </div>
                                    <div className="flex items-end gap-1">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Bobot</label>
                                            <input type="number" min={1} value={v.weight} onChange={e => updateVariant(i, "weight", Number(e.target.value))}
                                                className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none" />
                                        </div>
                                        {variants.length > 2 && (
                                            <button onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 pb-1.5">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={() => onSave({ testName, codePrefix, variants, currency, validFrom: validFrom + "T00:00:00Z", validUntil: validUntil + "T23:59:59Z" })}
                        disabled={saving || !testName || !codePrefix}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors disabled:opacity-50">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                        Buat A/B Test
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Filter Modal ───────────────────────────────────────────────────────────────
function FilterModal({ open, initial, onClose, onApply }: {
    open: boolean; initial: FilterState
    onClose: () => void; onApply: (f: FilterState) => void
}) {
    const [draft, setDraft] = useState<FilterState>(initial)

    useEffect(() => { if (open) setDraft(initial) }, [open, initial])

    if (!open) return null

    const toggleArr = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
    const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
        <button onClick={onClick} className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${active ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 bg-white dark:bg-gray-800"}`}>
            {label}
        </button>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Filter Data</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light">×</button>
                </div>
                <div className="px-6 py-4 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Status Promo</label>
                        <div className="flex flex-wrap gap-2">
                            <Chip label="Semua" active={draft.statuses.length === 0} onClick={() => setDraft(p => ({ ...p, statuses: [] }))} />
                            {[{ id: "active", label: "Aktif" }, { id: "inactive", label: "Nonaktif" }, { id: "referral", label: "Referral" }, { id: "expired", label: "Kedaluwarsa" }].map(s => (
                                <Chip key={s.id} label={s.label} active={draft.statuses.includes(s.id)} onClick={() => setDraft(p => ({ ...p, statuses: toggleArr(p.statuses, s.id) }))} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Tipe Diskon</label>
                        <div className="flex flex-wrap gap-2">
                            <Chip label="Semua" active={draft.types.length === 0} onClick={() => setDraft(p => ({ ...p, types: [] }))} />
                            <Chip label="Persen (%)" active={draft.types.includes("percentage")} onClick={() => setDraft(p => ({ ...p, types: toggleArr(p.types, "percentage") }))} />
                            <Chip label="Nominal (Rp)" active={draft.types.includes("fixed")} onClick={() => setDraft(p => ({ ...p, types: toggleArr(p.types, "fixed") }))} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Campaign ID</label>
                        <input type="text" value={draft.campaignId} onChange={e => setDraft(p => ({ ...p, campaignId: e.target.value }))} placeholder="Masukkan ID Campaign..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Dari</label>
                            <input type="date" value={draft.validFrom} onChange={e => setDraft(p => ({ ...p, validFrom: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Sampai</label>
                            <input type="date" value={draft.validUntil} onChange={e => setDraft(p => ({ ...p, validUntil: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={() => setDraft(EMPTY_FILTER)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mr-auto">
                        Reset
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={() => onApply(draft)} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">Terapkan Filter</button>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTENT
// ═══════════════════════════════════════════════════════════════════════════════
function DiscountCodesContent() {
    const router = useRouter()
    const [codes, setCodes] = useState<DiscountCode[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [mutating, setMutating] = useState(false)
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)

    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER)
    const [sortField, setSortField] = useState<SortField>("code")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [copiedId, setCopiedId] = useState<number | null>(null)

    // Modals
    const [formOpen, setFormOpen] = useState(false)
    const [editItem, setEditItem] = useState<DiscountCode | null>(null)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState<DiscountCode | null>(null)
    const [exportOpen, setExportOpen] = useState(false)
    const [abTestOpen, setAbTestOpen] = useState(false)
    const [filterOpen, setFilterOpen] = useState(false)

    // Close action menu on click outside
    useEffect(() => {
        if (openMenuId === null) return
        function handleClick() { setOpenMenuId(null) }
        document.addEventListener("click", handleClick)
        return () => document.removeEventListener("click", handleClick)
    }, [openMenuId])

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchCodes = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({ Keyword: search, Page: "1", PageSize: "100" })
            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes?${params}`, { headers: authHeaders() })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            const raw: ApiDiscountCode[] =
                Array.isArray(json) ? json :
                Array.isArray(json?.data) ? json.data :
                Array.isArray(json?.data?.items) ? json.data.items :
                Array.isArray(json?.items) ? json.items : []
            if (raw.length > 0) { setCodes(raw.map(mapApiToCode)) }
            else { setCodes(dummyData.discountCodes as DiscountCode[]) }
        } catch {
            setCodes(dummyData.discountCodes as DiscountCode[])
        } finally { setIsLoading(false) }
    }, [search])

    useEffect(() => { fetchCodes() }, [fetchCodes])

    const liveCodes = codes.filter(c => !c._deleted)
    const stats = useMemo(() => ({
        total: liveCodes.length,
        active: liveCodes.filter(c => c.isActive).length,
        usageRate: liveCodes.length > 0 && liveCodes.some(c => c.usageLimit > 0)
            ? Math.round((liveCodes.reduce((s, c) => s + c.usageCount, 0) / Math.max(1, liveCodes.reduce((s, c) => s + c.usageLimit, 0))) * 100) : 0,
        totalUsage: liveCodes.reduce((s, c) => s + c.usageCount, 0),
    }), [liveCodes])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return liveCodes
            .filter(c => {
                const matchSearch = !q || c.code.toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q) || (c.trainerName?.toLowerCase().includes(q) ?? false)
                
                let matchStatus = true
                if (filterState.statuses.length > 0) {
                    const st = getCodeStatus(c).label.toLowerCase()
                    const isRef = c.isReferral
                    let matched = false
                    if (filterState.statuses.includes("active") && c.isActive && st !== "kedaluwarsa") matched = true
                    if (filterState.statuses.includes("inactive") && !c.isActive) matched = true
                    if (filterState.statuses.includes("referral") && isRef) matched = true
                    if (filterState.statuses.includes("expired") && st === "kedaluwarsa") matched = true
                    matchStatus = matched
                }

                const matchType = filterState.types.length === 0 || filterState.types.includes(c.type)
                
                const matchCampaign = !filterState.campaignId || (c.campaignId?.toLowerCase().includes(filterState.campaignId.toLowerCase()))
                
                let matchDate = true
                if (filterState.validFrom && c.validFrom) {
                    if (new Date(c.validFrom) < new Date(filterState.validFrom + "T00:00:00Z")) matchDate = false
                }
                if (filterState.validUntil && c.validUntil) {
                    if (new Date(c.validUntil) > new Date(filterState.validUntil + "T23:59:59Z")) matchDate = false
                }

                return matchSearch && matchStatus && matchType && matchCampaign && matchDate
            })
            .sort((a, b) => {
                let av: number | string = a.code, bv: number | string = b.code
                if (sortField === "value") { av = a.value; bv = b.value }
                else if (sortField === "usageCount") { av = a.usageCount; bv = b.usageCount }
                else if (sortField === "validUntil") { av = a.validUntil; bv = b.validUntil }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [liveCodes, search, filterState, sortField, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

    function handleSort(f: SortField) {
        if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(f); setSortDir("asc") }
        setPage(1)
    }
    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-0.5 opacity-40 inline-block" />
        return <span className="ml-0.5 text-emerald-500 inline-block">{sortDir === "asc" ? "↑" : "↓"}</span>
    }
    function handleCopy(id: number, code: string) {
        navigator.clipboard.writeText(code); setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1500)
    }
    function getCodeStatus(c: DiscountCode) {
        if (!c.isActive) return { label: "Nonaktif", color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" }
        if (isExpired(c.validUntil)) return { label: "Kedaluwarsa", color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" }
        if (isUpcoming(c.validFrom)) return { label: "Terjadwal", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" }
        if (c.usageLimit > 0 && c.usageCount >= c.usageLimit) return { label: "Habis", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" }
        return { label: "Aktif", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" }
    }

    // ── CRUD ────────────────────────────────────────────────────────────────────
    async function handleSaveForm(form: FormState, isEdit: boolean) {
        if (!form.code || !form.value || !form.validFrom || !form.validUntil) {
            showToast({ type: "info", title: "Form tidak lengkap", message: "Kode, nilai diskon, dan tanggal berlaku wajib diisi." })
            return
        }
        setMutating(true)
        const body = {
            code: form.code, name: form.name || null, description: form.description || null,
            type: form.type, value: Number(form.value), currency: "IDR",
            minPurchase: Number(form.minOrderAmount) || 0,
            maxDiscount: Number(form.maxDiscountAmount) || null,
            applicableTo: "all", trainerId: null, courseId: null, categoryId: null,
            courseIds: [], excludedCourseIds: [], userType: "",
            firstTimeOnly: form.firstTimeOnly ? 1 : 0, allowedUserIds: [], minBalance: null,
            maxUses: Number(form.usageLimit) || null, maxUsesPerUser: null,
            validFrom: form.validFrom + "T00:00:00Z", validUntil: form.validUntil + "T23:59:59Z",
            stackable: form.stackable ? 1 : 0, priority: 1,
            campaignId: null, campaignName: null, source: null,
            utmSource: null, utmMedium: null, utmCampaign: null,
            isReferral: form.isReferral ? 1 : 0, referrerUserId: null, referrerReward: null, notes: null,
        }
        try {
            const url = isEdit && editItem ? `${API_BASE}/api/v1/DiscountCodes/${editItem.id}` : `${API_BASE}/api/v1/DiscountCodes`
            const method = isEdit ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            showToast({ type: "success", title: isEdit ? "Kode berhasil diupdate" : "Kode berhasil dibuat", message: `"${form.code}" tersimpan.`, endpoint: `${method} /api/v1/DiscountCodes${isEdit && editItem ? `/${editItem.id}` : ""}` })
            await fetchCodes()
        } catch {
            if (isEdit && editItem) {
                setCodes(prev => prev.map(c => c.id === editItem.id ? { ...c, ...{ code: form.code, name: form.name, description: form.description, type: form.type, value: Number(form.value), usageLimit: Number(form.usageLimit), minOrderAmount: Number(form.minOrderAmount), maxDiscountAmount: Number(form.maxDiscountAmount), validFrom: form.validFrom, validUntil: form.validUntil, isReferral: form.isReferral } } : c))
            } else {
                if (liveCodes.find(c => c.code === form.code)) { showToast({ type: "info", title: "Kode sudah ada", message: `"${form.code}" sudah digunakan.` }); setMutating(false); return }
                setCodes(prev => [{ id: genId(), code: form.code, name: form.name, description: form.description, deskripsi: form.description, type: form.type, value: Number(form.value), usageLimit: Number(form.usageLimit), usageCount: 0, minOrderAmount: Number(form.minOrderAmount), maxDiscountAmount: Number(form.maxDiscountAmount), validFrom: form.validFrom + "T00:00:00Z", validUntil: form.validUntil + "T23:59:59Z", isReferral: form.isReferral, isActive: true, createdBy: "Admin", trainerId: null, trainerName: null, campaignId: null, createdAt: new Date().toISOString() }, ...prev])
            }
            showToast({ type: "success", title: "Disimpan (lokal)", message: `"${form.code}" diperbarui secara lokal.` })
        } finally { setMutating(false); setFormOpen(false); setEditItem(null) }
    }

    async function handleToggle(c: DiscountCode) {
        setMutating(true)
        const ep = c.isActive ? `${API_BASE}/api/v1/DiscountCodes/${c.id}/pause` : `${API_BASE}/api/v1/DiscountCodes/${c.id}/activate`
        try { const r = await fetch(ep, { method: "POST", headers: authHeaders() }); if (!r.ok) throw new Error() } catch { /* fallback */ } finally {
            const next = !c.isActive
            setCodes(prev => prev.map(x => x.id === c.id ? { ...x, isActive: next } : x))
            showToast({ type: next ? "success" : "info", title: `Kode "${c.code}" ${next ? "diaktifkan" : "dijeda"}`, endpoint: `POST /api/v1/DiscountCodes/${c.id}/${next ? "activate" : "pause"}` })
            setMutating(false)
        }
    }

    async function handleDelete(c: DiscountCode) {
        setMutating(true)
        try { const r = await fetch(`${API_BASE}/api/v1/DiscountCodes/${c.id}`, { method: "DELETE", headers: authHeaders() }); if (!r.ok) throw new Error() } catch { /* fallback */ } finally {
            setCodes(prev => prev.map(x => x.id === c.id ? { ...x, _deleted: true } : x))
            setConfirmDelete(null)
            showToast({ type: "error", title: `Kode "${c.code}" dihapus`, endpoint: `DELETE /api/v1/DiscountCodes/${c.id}` })
            setMutating(false)
        }
    }

    // Bulk generate — uses POST /api/v1/DiscountCodes/bulk-generate
    async function handleBulkGenerate(opts: { prefix: string; count: number; codeLength: number; type: string; value: number; validFrom: string; validUntil: string; maxUsesPerCode: number | null; campaignName: string }) {
        setMutating(true)
        try {
            const body = { prefix: opts.prefix, count: opts.count, codeLength: opts.codeLength, type: opts.type, value: opts.value, currency: "IDR", maxUsesPerCode: opts.maxUsesPerCode, validFrom: opts.validFrom, validUntil: opts.validUntil, campaignName: opts.campaignName || null }
            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes/bulk-generate`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            showToast({ type: "success", title: `${opts.count} kode digenerate`, message: `Prefix: ${opts.prefix}`, endpoint: "POST /api/v1/DiscountCodes/bulk-generate" })
            await fetchCodes()
        } catch {
            const now = new Date()
            const localCodes: DiscountCode[] = Array.from({ length: opts.count }, (_, i) => ({
                id: genId() + i, code: `${opts.prefix}${String(i + 1).padStart(opts.codeLength - opts.prefix.length, "0")}`,
                name: `${opts.prefix} Bulk #${i + 1}`, description: `Kode bulk generate — diskon ${opts.value}${opts.type === "percentage" ? "%" : " Rp"}`,
                deskripsi: `Bulk generate`, type: opts.type, value: opts.value,
                usageLimit: opts.maxUsesPerCode || 50, usageCount: 0,
                minOrderAmount: 0, maxDiscountAmount: 999999,
                validFrom: opts.validFrom, validUntil: opts.validUntil,
                isReferral: false, isActive: true, createdBy: "Admin (Bulk)",
                trainerId: null, trainerName: null,
                campaignId: opts.campaignName || null, createdAt: now.toISOString(),
            }))
            setCodes(prev => [...localCodes, ...prev])
            showToast({ type: "success", title: `${opts.count} kode digenerate (lokal)`, message: `Prefix: ${opts.prefix}` })
        } finally { setBulkOpen(false); setMutating(false) }
    }


    // A/B Test — POST /api/v1/DiscountCodes/ab-test
    async function handleAbTest(data: object) {
        setMutating(true)
        try {
            const res = await fetch(`${API_BASE}/api/v1/DiscountCodes/ab-test`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            showToast({ type: "success", title: "A/B Test berhasil dibuat", endpoint: "POST /api/v1/DiscountCodes/ab-test" })
            await fetchCodes()
        } catch {
            showToast({ type: "error", title: "A/B Test gagal", message: "API tidak dapat diakses." })
        } finally { setAbTestOpen(false); setMutating(false) }
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />

            {/* Page Header */}
            <div className="mb-6 px-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promo & Kupon</h1>
            </div>

            {/* All Modals */}
            <ConfirmModal open={!!confirmDelete} title={`Hapus kode "${confirmDelete?.code}"?`}
                message="Kode yang sudah dihapus tidak bisa dikembalikan." loading={mutating}
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
            <CodeFormModal open={formOpen} editItem={editItem} onSave={handleSaveForm} onClose={() => { setFormOpen(false); setEditItem(null) }} saving={mutating} />
            <BulkModal open={bulkOpen} onClose={() => setBulkOpen(false)} onGenerate={handleBulkGenerate} saving={mutating} />
            <FilterModal open={filterOpen} initial={filterState} onClose={() => setFilterOpen(false)} onApply={f => { setFilterState(f); setFilterOpen(false); setPage(1) }} />
            <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
            <AbTestModal open={abTestOpen} onClose={() => setAbTestOpen(false)} onSave={handleAbTest} saving={mutating} />

            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Kode", value: stats.total, icon: Tag, color: "violet" },
                        { label: "Aktif", value: stats.active, icon: CheckCircle2, color: "emerald" },
                        { label: "Tingkat Penggunaan", value: stats.usageRate, icon: Zap, color: "orange", isPercent: true },
                        { label: "Total Pemakaian", value: stats.totalUsage, icon: Users, color: "blue" },
                    ].map(card => {
                        const Icon = card.icon
                        const clr: Record<string, { bg: string; icon: string }> = {
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                            orange: { bg: "bg-orange-100 dark:bg-orange-900/20", icon: "text-orange-500 dark:text-orange-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                        }
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-9 h-9 rounded-lg ${clr[card.color].bg} flex items-center justify-center flex-shrink-0`}>
                                        {isLoading ? <Loader2 className={`w-4 h-4 ${clr[card.color].icon} animate-spin`} /> : <Icon className={`w-4 h-4 ${clr[card.color].icon}`} />}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {isLoading ? <span className="inline-block w-8 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : <>{card.value}{"isPercent" in card && card.isPercent ? "%" : ""}</>}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="flex items-center flex-1 min-w-[200px] md:max-w-sm h-10 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400">
                        <Search className="ml-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input type="text" placeholder="Cari kode atau nama promo..." value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1) } }}
                            className="w-full h-full px-3 text-sm bg-transparent border-0 focus:outline-none text-gray-700 dark:text-gray-200" />
                        <button onClick={() => { setSearch(searchInput); setPage(1) }}
                            className="h-full px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors flex items-center gap-2">
                            <Search className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Filter Button */}
                    <button
                        onClick={() => setFilterOpen(true)}
                        className={`flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-semibold rounded-lg transition-colors border shadow-sm ${
                            (filterState.statuses.length > 0 || filterState.types.length > 0 || filterState.campaignId || filterState.validFrom || filterState.validUntil)
                            ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
                        }`}
                    >
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        <button onClick={() => setExportOpen(true)} title="Export CSV"
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <button onClick={() => setAbTestOpen(true)} title="A/B Test"
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/30 border border-pink-200 dark:border-pink-800 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                            <FlaskConical className="w-4 h-4" /> A/B Test
                        </button>
                        <button onClick={() => setBulkOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                            <Zap className="w-4 h-4" /> Bulk
                        </button>
                        <button onClick={() => { setEditItem(null); setFormOpen(true) }}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                            <Plus className="w-4 h-4" /> Buat Promo
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("code")}>Kode Promo <SortIcon field="code" /></th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3">Nama / Deskripsi</th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("value")}>Diskon <SortIcon field="value" /></th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("usageCount")}>Penggunaan <SortIcon field="usageCount" /></th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("validUntil")}>Berlaku <SortIcon field="validUntil" /></th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            {Array.from({ length: 7 }).map((_, j) => (
                                                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : paged.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Tidak ada kode diskon ditemukan</p>
                                    </td></tr>
                                ) : paged.map(c => {
                                    const st = getCodeStatus(c)
                                    const usagePercent = c.usageLimit > 0 ? Math.min(100, Math.round((c.usageCount / c.usageLimit) * 100)) : 0
                                    const barColor = usagePercent >= 100 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer" onClick={() => router.push(`/billing/discountcodes/${c.id}`)}>
                                            {/* Kode */}
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <code className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">{c.code}</code>
                                                    <button onClick={() => handleCopy(c.id, c.code)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-emerald-500 transition-all flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                                                    {copiedId === c.id && <span className="text-[10px] text-emerald-500 font-semibold animate-pulse">Disalin!</span>}
                                                    {c.isReferral && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">REF</span>}
                                                </div>
                                                {c.campaignId && <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{c.campaignId}</p>}
                                            </td>
                                            {/* Nama */}
                                            <td className="px-4 py-3 max-w-[200px]">
                                                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                                                {(c.description || c.deskripsi) && <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.description || c.deskripsi}</p>}
                                                {c.trainerName && <p className="text-[10px] text-violet-500 mt-0.5">👤 {c.trainerName}</p>}
                                            </td>
                                            {/* Diskon */}
                                            <td className="px-4 py-3">
                                                {c.isReferral ? <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">{c.value}%</span>
                                                    : c.type === "percentage" ? <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{c.value}%</span>
                                                        : <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{formatRupiah(c.value)}</span>}
                                                {c.minOrderAmount > 0 && <p className="text-[9px] text-gray-400 mt-0.5 whitespace-nowrap">Min. {formatRupiah(c.minOrderAmount)}</p>}
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${st.color}`}>
                                                    {st.label === "Aktif" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {st.label}
                                                </span>
                                            </td>
                                            {/* Penggunaan */}
                                            <td className="px-4 py-3 min-w-[130px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{c.usageCount}{c.usageLimit > 0 ? `/${c.usageLimit}` : ""}</span>
                                                    {c.usageLimit > 0 && <span className="text-[10px] text-gray-400">{usagePercent}%</span>}
                                                </div>
                                                {c.usageLimit > 0 && <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1"><div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${usagePercent}%` }} /></div>}
                                            </td>
                                            {/* Berlaku */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">{formatDate(c.validFrom)}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">s/d {formatDate(c.validUntil)}</p>
                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3 relative" onClick={e => e.stopPropagation()}>
                                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id) }}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                {openMenuId === c.id && (
                                                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => { router.push(`/billing/discountcodes/${c.id}`); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left">
                                                            <ExternalLink className="w-3.5 h-3.5" /> Lihat Detail
                                                        </button>
                                                        <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                                        <button onClick={() => { handleToggle(c); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                                                            {c.isActive ? <PauseCircle className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                                                            {c.isActive ? "Jeda" : "Aktifkan"}
                                                        </button>
                                                        <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                                        <button onClick={() => { setEditItem(c); setFormOpen(true); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                                                            <Pencil className="w-3.5 h-3.5 text-blue-500" /> Edit
                                                        </button>
                                                        <button onClick={() => { setConfirmDelete(c); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left">
                                                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <SmartPagination
                        total={filtered.length}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
                        loading={isLoading}
                    />
                </div>
            </div>
        </div>
    )
}

// ── Page Export ────────────────────────────────────────────────────────────────
export default function DiscountCodesPage() {
    return <DiscountCodesContent />
}
