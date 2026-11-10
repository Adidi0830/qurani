"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Search, ChevronLeft, ChevronRight, Receipt, Plus, Pencil, Trash2,
    CheckCircle2, XCircle, ChevronsUpDown, Globe, Percent,
    ToggleLeft, ToggleRight, BookOpen, Filter, Loader2, RefreshCw,
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── API Base URL ─────────────────────────────────────────────────────────────────
const API_BASE = "https://api.myqurani.com/api/v1/TaxRates"

// ── Auth Token (same pattern as other pages in this project) ─────────────────────
function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? null
}

function authHeaders(): HeadersInit {
    const token = getClientToken()
    return token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" }
}

// ── Dummy Data (digunakan sebagai fallback jika API belum bisa diakses) ──────────
const DUMMY_TAX_RATES: TaxRateAPI[] = [
    { id: 1, code: "PPN-ID-11", name: "PPN Indonesia 11%", description: "Pajak Pertambahan Nilai Indonesia", countryId: null, countryCode: "ID", countryName: "Indonesia", stateId: null, stateCode: null, stateName: null, cityId: null, cityName: null, postalCodePattern: null, taxType: "vat", rate: 11, method: "percentage", isCompound: 1, priority: 1, minAmount: null, maxAmount: null, fixedAmount: null, appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1, validFrom: null, validUntil: null, taxRegistrationNumber: null, authorityName: null, authorityCode: null, reportingRequired: 1, isActive: 1, isDefault: 1, notes: null, referenceUrl: null, createdAt: "2025-01-01T00:00:00Z" },
    { id: 2, code: "PPH-ID-2.5", name: "PPh Final 2.5%", description: "Pajak Penghasilan Final untuk guru/pelatih", countryId: null, countryCode: "ID", countryName: "Indonesia", stateId: null, stateCode: null, stateName: null, cityId: null, cityName: null, postalCodePattern: null, taxType: "income", rate: 2.5, method: "percentage", isCompound: 0, priority: 2, minAmount: null, maxAmount: null, fixedAmount: null, appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1, validFrom: null, validUntil: null, taxRegistrationNumber: null, authorityName: null, authorityCode: null, reportingRequired: 1, isActive: 1, isDefault: 0, notes: null, referenceUrl: null, createdAt: "2025-01-01T00:00:00Z" },
    { id: 3, code: "GST-MY-6", name: "GST Malaysia 6%", description: "Goods and Services Tax Malaysia", countryId: null, countryCode: "MY", countryName: "Malaysia", stateId: null, stateCode: null, stateName: null, cityId: null, cityName: null, postalCodePattern: null, taxType: "gst", rate: 6, method: "percentage", isCompound: 1, priority: 1, minAmount: null, maxAmount: null, fixedAmount: null, appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1, validFrom: null, validUntil: null, taxRegistrationNumber: null, authorityName: null, authorityCode: null, reportingRequired: 1, isActive: 1, isDefault: 1, notes: null, referenceUrl: null, createdAt: "2025-03-01T00:00:00Z" },
    { id: 4, code: "VAT-EG-14", name: "VAT Egypt 14%", description: "Value Added Tax Egypt", countryId: null, countryCode: "EG", countryName: "Egypt", stateId: null, stateCode: null, stateName: null, cityId: null, cityName: null, postalCodePattern: null, taxType: "vat", rate: 14, method: "percentage", isCompound: 1, priority: 1, minAmount: null, maxAmount: null, fixedAmount: null, appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1, validFrom: null, validUntil: null, taxRegistrationNumber: null, authorityName: null, authorityCode: null, reportingRequired: 1, isActive: 1, isDefault: 1, notes: null, referenceUrl: null, createdAt: "2025-04-01T00:00:00Z" },
    { id: 5, code: "GST-SG-9", name: "GST Singapore 9%", description: "GST rate Singapore (inactive)", countryId: null, countryCode: "SG", countryName: "Singapore", stateId: null, stateCode: null, stateName: null, cityId: null, cityName: null, postalCodePattern: null, taxType: "gst", rate: 9, method: "percentage", isCompound: 1, priority: 1, minAmount: null, maxAmount: null, fixedAmount: null, appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1, validFrom: null, validUntil: null, taxRegistrationNumber: null, authorityName: null, authorityCode: null, reportingRequired: 1, isActive: 0, isDefault: 1, notes: null, referenceUrl: null, createdAt: "2025-06-01T00:00:00Z" },
    { id: 6, code: "VAT-SA-15", name: "VAT Saudi Arabia 15%", description: "VAT Saudi Arabia - zakat exemption applies", countryId: null, countryCode: "SA", countryName: "Saudi Arabia", stateId: null, stateCode: null, stateName: null, cityId: null, cityName: null, postalCodePattern: null, taxType: "vat", rate: 15, method: "percentage", isCompound: 1, priority: 1, minAmount: null, maxAmount: null, fixedAmount: null, appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1, validFrom: null, validUntil: null, taxRegistrationNumber: null, authorityName: null, authorityCode: null, reportingRequired: 1, isActive: 1, isDefault: 1, notes: null, referenceUrl: null, createdAt: "2025-07-01T00:00:00Z" },
    { id: 7, code: "ZERO-ID", name: "Zero Rate (Exempt)", description: "Bebas pajak - layanan pendidikan Al-Quran", countryId: null, countryCode: "ID", countryName: "Indonesia", stateId: null, stateCode: null, stateName: null, cityId: null, cityName: null, postalCodePattern: null, taxType: "exempt", rate: 0, method: "percentage", isCompound: 0, priority: 3, minAmount: null, maxAmount: null, fixedAmount: null, appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1, validFrom: null, validUntil: null, taxRegistrationNumber: null, authorityName: null, authorityCode: null, reportingRequired: 0, isActive: 1, isDefault: 0, notes: null, referenceUrl: null, createdAt: "2025-01-15T00:00:00Z" },
    { id: 8, code: "VAT-TR-20", name: "VAT Turkey 20%", description: "Value Added Tax Turkey", countryId: null, countryCode: "TR", countryName: "Turkey", stateId: null, stateCode: null, stateName: null, cityId: null, cityName: null, postalCodePattern: null, taxType: "vat", rate: 20, method: "percentage", isCompound: 1, priority: 1, minAmount: null, maxAmount: null, fixedAmount: null, appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1, validFrom: null, validUntil: null, taxRegistrationNumber: null, authorityName: null, authorityCode: null, reportingRequired: 1, isActive: 1, isDefault: 1, notes: null, referenceUrl: null, createdAt: "2025-09-01T00:00:00Z" },
]

// ── Types ────────────────────────────────────────────────────────────────────────
type TaxType = "all" | "vat" | "gst" | "income" | "exempt"
type SortField = "code" | "rate" | "countryName" | "createdAt"

// Shape returned by GET /api/v1/TaxRates
interface TaxRateAPI {
    id: number
    code: string
    name: string
    description: string | null
    countryId: number | null
    countryCode: string
    countryName: string
    stateId: number | null
    stateCode: string | null
    stateName: string | null
    cityId: number | null
    cityName: string | null
    postalCodePattern: string | null
    taxType: string          // "vat" | "gst" | "income" | "exempt"
    rate: number
    method: string | null
    isCompound: number
    priority: number
    minAmount: number | null
    maxAmount: number | null
    fixedAmount: number | null
    appliesToB2C: number
    appliesToB2B: number
    appliesToDigital: number
    validFrom: string | null
    validUntil: string | null
    taxRegistrationNumber: string | null
    authorityName: string | null
    authorityCode: string | null
    reportingRequired: number
    isActive: number
    isDefault: number
    notes: string | null
    referenceUrl: string | null
    createdAt: string
}

interface TaxFormState {
    code: string
    name: string
    countryCode: string
    countryName: string
    taxType: string
    rate: string
    isActive: boolean
    description: string
}

const EMPTY_FORM: TaxFormState = {
    code: "", name: "", countryCode: "", countryName: "", taxType: "vat",
    rate: "", isActive: true, description: ""
}

const PAGE_SIZE_DEFAULT = 10

function formatDate(iso: string | null | undefined) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

// ── Tax Form Modal ─────────────────────────────────────────────────────────────
function TaxFormModal({ open, editItem, onSave, onClose, saving }: {
    open: boolean
    editItem: TaxRateAPI | null
    onSave: (form: TaxFormState, isEdit: boolean) => void
    onClose: () => void
    saving: boolean
}) {
    const [form, setForm] = useState<TaxFormState>(EMPTY_FORM)

    useEffect(() => {
        if (editItem) {
            setForm({
                code: editItem.code,
                name: editItem.name,
                countryCode: editItem.countryCode,
                countryName: editItem.countryName,
                taxType: editItem.taxType,
                rate: String(editItem.rate),
                isActive: editItem.isActive === 1,
                description: editItem.description || "",
            })
        } else {
            setForm(EMPTY_FORM)
        }
    }, [editItem, open])

    if (!open) return null
    function f(k: keyof TaxFormState, v: string | boolean) { setForm(p => ({ ...p, [k]: v })) }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {editItem ? "Edit Tax Rate" : "Tambah Tax Rate Baru"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light">×</button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Kode Pajak *</label>
                            <input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())}
                                placeholder="PPN-ID-11"
                                disabled={!!editItem}
                                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white disabled:opacity-60" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipe Pajak *</label>
                            <select value={form.taxType} onChange={e => f("taxType", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white">
                                <option value="vat">VAT (PPn)</option>
                                <option value="gst">GST</option>
                                <option value="income">PPh (Income)</option>
                                <option value="exempt">Exempt (0%)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Tax Rate *</label>
                        <input value={form.name} onChange={e => f("name", e.target.value)}
                            placeholder="PPN Indonesia 11%"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Kode Negara *</label>
                            <input value={form.countryCode} onChange={e => f("countryCode", e.target.value.toUpperCase())}
                                placeholder="ID, MY, SG..."
                                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Negara *</label>
                            <input value={form.countryName} onChange={e => f("countryName", e.target.value)}
                                placeholder="Indonesia, Malaysia..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tarif Pajak (%) *</label>
                        <div className="relative">
                            <input type="number" step="0.1" min="0" max="100" value={form.rate} onChange={e => f("rate", e.target.value)}
                                placeholder="11"
                                className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                        <textarea value={form.description} onChange={e => f("description", e.target.value)}
                            rows={2} placeholder="Keterangan pajak..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white resize-none" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => f("isActive", !form.isActive)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Aktif</span>
                    </div>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={() => onSave(form, !!editItem)} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-60">
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {editItem ? "Simpan Perubahan" : "Tambah Tax Rate"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Confirm Modal ───────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: {
    open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{message}</p>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Batal</button>
                    <button onClick={onConfirm} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60">
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Content ────────────────────────────────────────────────────────────────
function TaxRatesContent() {
    const [rates, setRates] = useState<TaxRateAPI[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [typeFilter, setTypeFilter] = useState<TaxType>("all")
    const [showInactive, setShowInactive] = useState(false)
    const [sortField, setSortField] = useState<SortField>("countryName")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT)

    const [formOpen, setFormOpen] = useState(false)
    const [editItem, setEditItem] = useState<TaxRateAPI | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<TaxRateAPI | null>(null)

    // ── Fetch from API ───────────────────────────────────────────────────────
    const fetchRates = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (typeFilter !== "all") params.set("TaxType", typeFilter)
            if (!showInactive) params.set("IsActive", "1")
            params.set("PageSize", "200")

            const res = await fetch(`${API_BASE}?${params.toString()}`, {
                headers: authHeaders(),
            })

            if (res.status === 401) {
                // Token belum tersedia atau belum login — tampilkan data dummy sebagai preview
                console.warn("API 401: Menampilkan data dummy sebagai fallback.")
                showToast({ type: "info", title: "Mode Preview", message: "Data dummy ditampilkan. Login untuk memuat data asli dari API." })
                setRates(DUMMY_TAX_RATES)
                return
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()

            // Handle both array response and paginated { data: [], total: n }
            const list: TaxRateAPI[] = Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])

            // Jika API mengembalikan data kosong, pakai dummy sebagai fallback
            setRates(list.length > 0 ? list : DUMMY_TAX_RATES)
        } catch (err) {
            console.error("Fetch error:", err)
            showToast({ type: "info", title: "Mode Preview", message: "Tidak dapat terhubung ke API. Menampilkan data dummy." })
            setRates(DUMMY_TAX_RATES)
        } finally {
            setLoading(false)
        }
    }, [typeFilter, showInactive])

    useEffect(() => {
        fetchRates()
    }, [fetchRates])

    // ── Stats ────────────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total: rates.length,
        active: rates.filter(r => r.isActive === 1).length,
        countries: new Set(rates.map(r => r.countryCode)).size,
    }), [rates])

    // ── Client-side filter + sort ────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return rates
            .filter(r => {
                const matchSearch = !q
                    || r.code.toLowerCase().includes(q)
                    || r.name.toLowerCase().includes(q)
                    || r.countryName.toLowerCase().includes(q)
                    || r.countryCode.toLowerCase().includes(q)
                const matchType = typeFilter === "all" || r.taxType === typeFilter
                const matchActive = showInactive ? true : r.isActive === 1
                return matchSearch && matchType && matchActive
            })
            .sort((a, b) => {
                let av: string | number = a.countryName
                let bv: string | number = b.countryName
                if (sortField === "code") { av = a.code; bv = b.code }
                else if (sortField === "rate") { av = a.rate; bv = b.rate }
                else if (sortField === "createdAt") { av = a.createdAt; bv = b.createdAt }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? av - (bv as number) : (bv as number) - av
            })
    }, [rates, search, typeFilter, showInactive, sortField, sortDir])

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

    const typeColorMap: Record<string, string> = {
        vat: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        gst: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
        income: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        exempt: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    }
    const typeLabelMap: Record<string, string> = { vat: "VAT", gst: "GST", income: "PPh", exempt: "Exempt" }

    // ── Create / Update ──────────────────────────────────────────────────────
    async function handleSaveForm(form: TaxFormState, isEdit: boolean) {
        if (!form.code || !form.name || !form.countryCode || !form.countryName || form.rate === "") {
            showToast({ type: "info", title: "Form tidak lengkap", message: "Semua field bertanda * wajib diisi." })
            return
        }

        const payload = {
            code: form.code,
            name: form.name,
            description: form.description || null,
            countryCode: form.countryCode,
            countryName: form.countryName,
            taxType: form.taxType,
            rate: Number(form.rate),
            isActive: form.isActive ? 1 : 0,
            // Fields not in UI — sent as API defaults
            countryId: null,
            stateId: null, stateCode: null, stateName: null,
            cityId: null, cityName: null,
            postalCodePattern: null,
            method: "percentage",
            isCompound: 1, priority: 1,
            minAmount: null, maxAmount: null, fixedAmount: null,
            appliesToB2C: 1, appliesToB2B: 1, appliesToDigital: 1,
            categoryIds: [], excludedCategoryIds: [],
            validFrom: null, validUntil: null,
            taxRegistrationNumber: null,
            authorityName: null, authorityCode: null,
            reportingRequired: 1, isDefault: 0,
            notes: null, referenceUrl: null,
        }

        setSaving(true)
        try {
            if (isEdit && editItem) {
                const res = await fetch(`${API_BASE}/${editItem.id}`, {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                showToast({ type: "success", title: "Tax rate diupdate", message: `${form.code} berhasil diperbarui.`, endpoint: `PUT /api/v1/TaxRates/${editItem.id}` })
            } else {
                const res = await fetch(API_BASE, {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                showToast({ type: "success", title: "Tax rate ditambahkan", message: `${form.code} — ${form.rate}% berhasil ditambahkan.`, endpoint: "POST /api/v1/TaxRates" })
            }
            setFormOpen(false)
            setEditItem(null)
            await fetchRates()
        } catch (err) {
            showToast({ type: "error", title: "Gagal menyimpan", message: "Terjadi kesalahan saat menghubungi server." })
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    // ── Toggle Active ────────────────────────────────────────────────────────
    async function handleToggleActive(r: TaxRateAPI) {
        const next = r.isActive !== 1
        const endpoint = next ? `${API_BASE}/${r.id}/activate` : `${API_BASE}/${r.id}/deactivate`
        try {
            const res = await fetch(endpoint, { method: "POST", headers: authHeaders() })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            // Optimistic update
            setRates(prev => prev.map(x => x.id === r.id ? { ...x, isActive: next ? 1 : 0 } : x))
            showToast({
                type: next ? "success" : "info",
                title: next ? `"${r.code}" diaktifkan` : `"${r.code}" dinonaktifkan`,
                endpoint: next ? `POST /api/v1/TaxRates/${r.id}/activate` : `POST /api/v1/TaxRates/${r.id}/deactivate`
            })
        } catch {
            showToast({ type: "error", title: "Gagal memproses", message: "Terjadi kesalahan saat menghubungi server." })
        }
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    async function handleDelete(r: TaxRateAPI) {
        setDeletingId(r.id)
        try {
            const res = await fetch(`${API_BASE}/${r.id}`, { method: "DELETE", headers: authHeaders() })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setConfirmDelete(null)
            showToast({ type: "error", title: `"${r.code}" dihapus`, message: "Tax rate telah dihapus dari sistem.", endpoint: `DELETE /api/v1/TaxRates/${r.id}` })
            await fetchRates() // refresh dari API
        } catch {
            showToast({ type: "error", title: "Gagal menghapus", message: "Terjadi kesalahan saat menghubungi server." })
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />
            <TaxFormModal open={formOpen} editItem={editItem} onSave={handleSaveForm} onClose={() => { setFormOpen(false); setEditItem(null) }} saving={saving} />
            <ConfirmModal
                open={!!confirmDelete}
                title={`Hapus tax rate "${confirmDelete?.code}"?`}
                message={`Tax rate ${confirmDelete?.name} akan dihapus permanen. Transaksi yang sudah ada tidak akan terpengaruh.`}
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
                onCancel={() => setConfirmDelete(null)}
                loading={deletingId !== null}
            />

            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Receipt className="w-6 h-6 text-emerald-500" /> Tax Rates
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchRates} disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                        <button onClick={() => { setEditItem(null); setFormOpen(true) }}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Tambah Tax Rate
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Tax Rate", value: stats.total, icon: Receipt, color: "emerald" },
                        { label: "Aktif", value: stats.active, icon: CheckCircle2, color: "blue" },
                        { label: "Negara", value: stats.countries, icon: Globe, color: "violet" },
                    ].map(card => {
                        const Icon = card.icon
                        const clr: Record<string, { bg: string; icon: string }> = {
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
                        }
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-9 h-9 rounded-lg ${clr[card.color].bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${clr[card.color].icon}`} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {loading ? <span className="inline-block w-6 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : card.value}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
                    {/* Left: Search + Filter */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:min-w-[300px] flex">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari kode, nama, negara..."
                                    value={searchInput}
                                    onChange={e => setSearchInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                                    className="w-full pl-9 pr-4 h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-700 dark:text-gray-200"
                                />
                            </div>
                            <button
                                onClick={() => { setSearch(searchInput); setPage(1); }}
                                className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-r-md transition-colors flex items-center gap-2 border border-emerald-500 border-l-0"
                            >
                                <Search className="w-4 h-4" /> <span className="hidden sm:inline">Search</span>
                            </button>
                        </div>

                        {/* Type filter pills */}
                        <div className="flex items-center gap-1 flex-wrap">
                            {(["all", "vat", "gst", "income", "exempt"] as TaxType[]).map(t => (
                                <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all h-10 ${
                                        typeFilter === t
                                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                            : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400"
                                    }`}>
                                    {t === "all" ? "Semua" : typeLabelMap[t]}
                                </button>
                            ))}
                            <button onClick={() => { setShowInactive(s => !s); setPage(1) }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 h-10 rounded-lg text-xs font-semibold border transition-all ${
                                    showInactive
                                        ? "bg-gray-800 text-white border-gray-700"
                                        : "bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700"
                                }`}>
                                <Filter className="w-3 h-3" /> {showInactive ? "Sembunyikan Nonaktif" : "Tampilkan Nonaktif"}
                            </button>
                        </div>
                    </div>

                    {/* Right: Refresh + Create */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button onClick={fetchRates} disabled={loading}
                            className="flex items-center gap-1.5 px-3 h-10 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                        <button onClick={() => { setEditItem(null); setFormOpen(true) }}
                            className="flex items-center gap-1.5 px-4 h-10 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Create
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("code")}>
                                        Kode <SortIcon field="code" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Tipe</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("countryName")}>
                                        Negara <SortIcon field="countryName" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("rate")}>
                                        Tarif <SortIcon field="rate" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("createdAt")}>
                                        Tgl Dibuat <SortIcon field="createdAt" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    // Loading skeleton
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" /></td>
                                            <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                                            <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                                            <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10" /></td>
                                            <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                                            <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14" /></td>
                                            <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                                        </tr>
                                    ))
                                ) : paged.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p>Tidak ada tax rate ditemukan</p>
                                    </td></tr>
                                ) : paged.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        {/* Kode */}
                                        <td className="px-4 py-3">
                                            <code className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">{r.code}</code>
                                            <p className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] truncate">{r.description || r.name}</p>
                                        </td>
                                        {/* Tipe */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColorMap[r.taxType] ?? "bg-gray-100 text-gray-600"}`}>
                                                <BookOpen className="w-2.5 h-2.5" />
                                                {typeLabelMap[r.taxType] ?? r.taxType?.toUpperCase()}
                                            </span>
                                        </td>
                                        {/* Negara */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center justify-center w-6 h-4 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">{r.countryCode}</span>
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.countryName}</p>
                                            </div>
                                        </td>
                                        {/* Tarif */}
                                        <td className="px-4 py-3">
                                            <span className="text-base font-bold text-gray-900 dark:text-white">{r.rate}%</span>
                                        </td>
                                        {/* Tgl Dibuat */}
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.isActive === 1 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                                {r.isActive === 1 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {r.isActive === 1 ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        {/* Aksi */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditItem(r); setFormOpen(true) }}
                                                    className="text-blue-500 hover:text-blue-600 transition-colors" title="Edit">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="text-gray-200 dark:text-gray-700">|</span>
                                                <button onClick={() => handleToggleActive(r)}
                                                    className={`transition-colors ${r.isActive === 1 ? "text-orange-500 hover:text-orange-600" : "text-emerald-500 hover:text-emerald-600"}`}
                                                    title={r.isActive === 1 ? "Nonaktifkan" : "Aktifkan"}>
                                                    {r.isActive === 1 ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                </button>
                                                <span className="text-gray-200 dark:text-gray-700">|</span>
                                                <button onClick={() => setConfirmDelete(r)}
                                                    className="text-red-500 hover:text-red-600 transition-colors" title="Hapus">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pb-4">
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap justify-center sm:justify-start">
                            <span>
                                Menampilkan <span className="font-bold text-emerald-600">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, filtered.length)}</span> dari <span className="font-bold text-gray-700 dark:text-gray-200">{filtered.length}</span> data
                            </span>
                            <div className="flex items-center gap-2">
                                <span>Baris:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                    className="h-8 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-2 outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number
                                    if (totalPages <= 5) pageNum = i + 1
                                    else if (page <= 3) pageNum = i + 1
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                                    else pageNum = page - 2 + i
                                    return (
                                        <button key={pageNum} onClick={() => setPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-sm font-medium border transition-colors ${
                                                page === pageNum
                                                    ? "bg-emerald-500 text-white shadow-sm border-emerald-500"
                                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}>
                                            {pageNum}
                                        </button>
                                    )
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

export default function TaxRatesPage() {
    return (
                <TaxRatesContent />
    )
}
