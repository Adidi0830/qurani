"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Search, Plus, Pencil, Trash2, Tags, Loader2, RefreshCw,
    CheckCircle2, XCircle, ChevronLeft, ChevronRight, X,
    Calendar, Hash, ToggleLeft, ToggleRight, Filter,
    Languages, Save, Globe,
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── API ──────────────────────────────────────────────────────────────────────────
const API_BASE = "https://api.myqurani.com/api/v1/GroupCategories"

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

// ── Types ────────────────────────────────────────────────────────────────────────
interface GroupCategory {
    id: number
    name: string
    translations: Record<string, string> | null
    isActive: number // 1 = active, 0 = inactive
    createdAt: string
    updatedAt: string
}

// Search API response: data → { items[], pagination{} }
interface SearchApiResponse {
    success: boolean
    data: {
        items: GroupCategory[]
        pagination: {
            totalCount: number
            pageSize: number
            page?: number
        }
    }
    message: string | null
    correlationId: string | null
    elapsedInMs: number
}

// Supported languages for translations
const SUPPORTED_LANGUAGES = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
    { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
    { code: "ur", label: "اردو", flag: "🇵🇰" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "bn", label: "বাংলা", flag: "🇧🇩" },
]

// ── Dummy Data ──────────────────────────────────────────────────────────────────
const DUMMY_CATEGORIES: GroupCategory[] = [
    { id: 1, name: "Sekolah", translations: { en: "School", ar: "مدرسة" }, isActive: 1, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
    { id: 2, name: "Pesantren", translations: { en: "Islamic Boarding School" }, isActive: 1, createdAt: "2025-01-05T00:00:00Z", updatedAt: "2025-01-05T00:00:00Z" },
    { id: 3, name: "Masjid", translations: { en: "Mosque", ar: "مسجد" }, isActive: 1, createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-02-01T00:00:00Z" },
    { id: 4, name: "Kantor", translations: { en: "Office" }, isActive: 1, createdAt: "2025-02-15T00:00:00Z", updatedAt: "2025-02-15T00:00:00Z" },
    { id: 5, name: "Keluarga", translations: null, isActive: 1, createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z" },
    { id: 6, name: "Komunitas", translations: null, isActive: 1, createdAt: "2025-04-01T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z" },
    { id: 7, name: "Umum", translations: null, isActive: 1, createdAt: "2025-05-01T00:00:00Z", updatedAt: "2025-05-01T00:00:00Z" },
    { id: 8, name: "Lainnya", translations: null, isActive: 0, createdAt: "2025-06-01T00:00:00Z", updatedAt: "2025-06-01T00:00:00Z" },
]

// ── Helpers ──────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// ══════════════════════════════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════════════════════════════
function GroupCategoriesContent() {
    // ── State ────────────────────────────────────────────────────────────────
    const [categories, setCategories] = useState<GroupCategory[]>([])
    const [loading, setLoading] = useState(false)
    const [usingDummy, setUsingDummy] = useState(false)

    // Search & filter
    const [search, setSearch] = useState("")
    const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")

    // Pagination
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 10

    // CRUD modals
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<GroupCategory | null>(null)

    // Form data
    const [formName, setFormName] = useState("")
    const [formIsActive, setFormIsActive] = useState(1)
    const [formSubmitting, setFormSubmitting] = useState(false)

    // Translation modal
    const [showTranslationModal, setShowTranslationModal] = useState(false)
    const [translationCategory, setTranslationCategory] = useState<GroupCategory | null>(null)
    const [translations, setTranslations] = useState<Record<string, string>>({})
    const [translationsLoading, setTranslationsLoading] = useState(false)
    const [savingLang, setSavingLang] = useState<string | null>(null)

    // ── Fetch categories (search endpoint) ───────────────────────────────────
    const fetchCategories = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search.trim()) params.set("Keyword", search.trim())
            params.set("Page", String(page))
            params.set("PageSize", String(pageSize))
            if (filterActive === "active") params.set("IsActive", "1")
            else if (filterActive === "inactive") params.set("IsActive", "0")

            const res = await fetch(`${API_BASE}/search?${params}`, { headers: authHeaders() })
            if (res.status === 401) throw new Error("AUTH")
            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            const json: SearchApiResponse = await res.json()
            if (json.success && json.data?.items && Array.isArray(json.data.items)) {
                setCategories(json.data.items)
                setTotalCount(json.data.pagination?.totalCount ?? json.data.items.length)
                setUsingDummy(false)
            } else {
                throw new Error("Invalid response")
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : ""
            if (msg === "AUTH") {
                showToast({ title: "Belum login — menampilkan data contoh", type: "info" })
            } else {
                showToast({ title: "Gagal memuat data — menampilkan data contoh", type: "info" })
            }
            setCategories(DUMMY_CATEGORIES)
            setTotalCount(DUMMY_CATEGORIES.length)
            setUsingDummy(true)
        } finally {
            setLoading(false)
        }
    }, [search, page, filterActive])

    useEffect(() => { fetchCategories() }, [fetchCategories])

    // ── Create ───────────────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!formName.trim()) { showToast({ title: "Nama kategori tidak boleh kosong", type: "error" }); return }
        if (formName.trim().length < 2 || formName.trim().length > 50) { showToast({ title: "Nama kategori harus 2-50 karakter", type: "error" }); return }
        setFormSubmitting(true)
        try {
            const res = await fetch(API_BASE, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ name: formName.trim(), translations: null, isActive: formIsActive }),
            })
            if (!res.ok) {
                const errBody = await res.text()
                throw new Error(errBody || `HTTP ${res.status}`)
            }
            showToast({ title: "Kategori berhasil dibuat!", type: "success" })
            setShowCreateModal(false)
            setFormName("")
            setFormIsActive(1)
            fetchCategories()
        } catch (err: unknown) {
            showToast({ title: `Gagal membuat kategori: ${err instanceof Error ? err.message : "Unknown error"}`, type: "error" })
        } finally {
            setFormSubmitting(false)
        }
    }

    // ── Update ───────────────────────────────────────────────────────────────
    const handleUpdate = async () => {
        if (!selectedCategory) return
        if (!formName.trim()) { showToast({ title: "Nama kategori tidak boleh kosong", type: "error" }); return }
        if (formName.trim().length < 2 || formName.trim().length > 50) { showToast({ title: "Nama kategori harus 2-50 karakter", type: "error" }); return }
        setFormSubmitting(true)
        try {
            const res = await fetch(`${API_BASE}/${selectedCategory.id}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ name: formName.trim(), translations: null, isActive: formIsActive }),
            })
            if (!res.ok) {
                const errBody = await res.text()
                throw new Error(errBody || `HTTP ${res.status}`)
            }
            showToast({ title: "Kategori berhasil diperbarui!", type: "success" })
            setShowEditModal(false)
            setSelectedCategory(null)
            fetchCategories()
        } catch (err: unknown) {
            showToast({ title: `Gagal memperbarui: ${err instanceof Error ? err.message : "Unknown error"}`, type: "error" })
        } finally {
            setFormSubmitting(false)
        }
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!selectedCategory) return
        setFormSubmitting(true)
        try {
            const res = await fetch(`${API_BASE}/${selectedCategory.id}`, {
                method: "DELETE",
                headers: authHeaders(),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            showToast({ title: "Kategori berhasil dihapus!", type: "success" })
            setShowDeleteModal(false)
            setSelectedCategory(null)
            fetchCategories()
        } catch (err: unknown) {
            showToast({ title: `Gagal menghapus: ${err instanceof Error ? err.message : "Unknown error"}`, type: "error" })
        } finally {
            setFormSubmitting(false)
        }
    }

    // ── Fetch Translations ───────────────────────────────────────────────────
    // GET /api/v1/GroupCategories/{id}/translations
    const fetchTranslations = useCallback(async (cat: GroupCategory) => {
        setTranslationCategory(cat)
        setShowTranslationModal(true)
        setTranslationsLoading(true)
        // Pre-populate from existing translations on the category object
        setTranslations(cat.translations ? { ...cat.translations } : {})
        try {
            const res = await fetch(`${API_BASE}/${cat.id}/translations`, { headers: authHeaders() })
            if (res.status === 401) throw new Error("AUTH")
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            if (json.success && json.data && typeof json.data === "object") {
                setTranslations(json.data)
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : ""
            if (msg === "AUTH") {
                showToast({ title: "Belum login — menggunakan data lokal", type: "info" })
            } else {
                showToast({ title: "Gagal memuat terjemahan — menggunakan data lokal", type: "info" })
            }
        } finally {
            setTranslationsLoading(false)
        }
    }, [])

    // ── Save Single Translation ──────────────────────────────────────────────
    // PUT /api/v1/GroupCategories/{id}/translations/{lang}
    const saveTranslation = async (lang: string) => {
        if (!translationCategory) return
        const value = translations[lang]?.trim()
        if (!value) { showToast({ title: "Terjemahan tidak boleh kosong", type: "error" }); return }
        if (value.length > 50) { showToast({ title: "Terjemahan maksimal 50 karakter", type: "error" }); return }
        setSavingLang(lang)
        try {
            const res = await fetch(`${API_BASE}/${translationCategory.id}/translations/${lang}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ value }),
            })
            if (!res.ok) {
                const errBody = await res.text()
                throw new Error(errBody || `HTTP ${res.status}`)
            }
            showToast({ title: `Terjemahan ${lang.toUpperCase()} berhasil disimpan!`, type: "success" })
        } catch (err: unknown) {
            showToast({ title: `Gagal menyimpan: ${err instanceof Error ? err.message : "Unknown error"}`, type: "error" })
        } finally {
            setSavingLang(null)
        }
    }

    // ── Derived ──────────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const stats = useMemo(() => {
        const all = categories.length
        const active = categories.filter(c => c.isActive === 1).length
        const inactive = all - active
        return { all, active, inactive }
    }, [categories])

    // Count how many translations a category has
    const translationCount = (cat: GroupCategory) => {
        if (!cat.translations) return 0
        return Object.keys(cat.translations).filter(k => cat.translations![k]?.trim()).length
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen">
            <ToastContainer />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Tags className="w-6 h-6 text-emerald-500" /> Group Categories
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchCategories} disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                        <button onClick={() => { setFormName(""); setFormIsActive(1); setShowCreateModal(true) }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.02]">
                            <Plus className="w-4 h-4" /> Tambah Kategori
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stat Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: "Total Kategori", value: usingDummy ? stats.all : totalCount, icon: Tags, color: "from-blue-500 to-indigo-500", bg: "bg-blue-50 dark:bg-blue-900/20", iconColor: "#6366f1" },
                    { label: "Aktif", value: stats.active, icon: CheckCircle2, color: "from-emerald-500 to-green-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", iconColor: "#10b981" },
                    { label: "Nonaktif", value: stats.inactive, icon: XCircle, color: "from-red-400 to-rose-500", bg: "bg-red-50 dark:bg-red-900/20", iconColor: "#f87171" },
                ].map(s => (
                    <div key={s.label} className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                            </div>
                            <div className={`${s.bg} p-3 rounded-xl`}>
                                <s.icon className="w-6 h-6" style={{ color: s.iconColor }} />
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${s.color}`} />
                    </div>
                ))}
            </div>

            {/* ── Search & Filter Bar ─────────────────────────────────────── */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari kategori..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                    {search && (
                        <button onClick={() => { setSearch(""); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                    {(["all", "active", "inactive"] as const).map(f => (
                        <button key={f} onClick={() => { setFilterActive(f); setPage(1) }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterActive === f
                                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}>
                            {f === "all" ? "Semua" : f === "active" ? "Aktif" : "Nonaktif"}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
                        <Tags className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg font-medium">Tidak ada kategori ditemukan</p>
                        <p className="text-sm mt-1">Coba ubah pencarian atau tambah kategori baru</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> ID</div>
                                    </th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5"><Tags className="w-3.5 h-3.5" /> Nama</div>
                                    </th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Status</div>
                                    </th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5"><Languages className="w-3.5 h-3.5" /> Translations</div>
                                    </th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Dibuat</div>
                                    </th>
                                    <th className="text-center px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {categories.map((cat) => (
                                    <tr key={cat.id}
                                        className="group hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer"
                                        onClick={() => { setSelectedCategory(cat); setShowDetailModal(true) }}
                                    >
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                {cat.id}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/20">
                                                    {cat.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {cat.isActive === 1 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                    <XCircle className="w-3.5 h-3.5" /> Nonaktif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => fetchTranslations(cat)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors">
                                                <Globe className="w-3.5 h-3.5" />
                                                {translationCount(cat) > 0 ? `${translationCount(cat)} bahasa` : "Belum ada"}
                                            </button>
                                        </td>
                                        <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">
                                            {formatDate(cat.createdAt)}
                                        </td>
                                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => fetchTranslations(cat)}
                                                    className="p-2 rounded-lg text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors" title="Terjemahan">
                                                    <Languages className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => {
                                                    setSelectedCategory(cat); setFormName(cat.name); setFormIsActive(cat.isActive); setShowEditModal(true)
                                                }}
                                                    className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setSelectedCategory(cat); setShowDeleteModal(true) }}
                                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Hapus">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && categories.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan <span className="font-semibold text-gray-700 dark:text-gray-300">{categories.length}</span> dari <span className="font-semibold text-gray-700 dark:text-gray-300">{totalCount}</span> kategori
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${p === page
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════ MODALS ══════════════════ */}

            {/* ── Create Modal ──────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Tambah Kategori</h2>
                                        <p className="text-sm text-emerald-100">Buat kategori grup baru</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nama Kategori *</label>
                                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: Sekolah"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    maxLength={50} autoFocus />
                                <p className="text-xs text-gray-400 mt-1">{formName.length}/50 karakter (min. 2)</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                                <button onClick={() => setFormIsActive(formIsActive === 1 ? 0 : 1)}
                                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all ${formIsActive === 1
                                        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
                                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                                        }`}>
                                    {formIsActive === 1
                                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                                        : <ToggleLeft className="w-6 h-6 text-gray-400" />
                                    }
                                    <span className={`text-sm font-medium ${formIsActive === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                                        {formIsActive === 1 ? "Aktif" : "Nonaktif"}
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                Batal
                            </button>
                            <button onClick={handleCreate} disabled={formSubmitting || !formName.trim()}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {formSubmitting ? "Menyimpan..." : "Buat Kategori"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────────────────── */}
            {showEditModal && selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Pencil className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Edit Kategori</h2>
                                        <p className="text-sm text-blue-100">ID: {selectedCategory.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nama Kategori *</label>
                                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nama kategori"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    maxLength={50} autoFocus />
                                <p className="text-xs text-gray-400 mt-1">{formName.length}/50 karakter (min. 2)</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                                <button onClick={() => setFormIsActive(formIsActive === 1 ? 0 : 1)}
                                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all ${formIsActive === 1
                                        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
                                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                                        }`}>
                                    {formIsActive === 1
                                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                                        : <ToggleLeft className="w-6 h-6 text-gray-400" />
                                    }
                                    <span className={`text-sm font-medium ${formIsActive === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                                        {formIsActive === 1 ? "Aktif" : "Nonaktif"}
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                Batal
                            </button>
                            <button onClick={handleUpdate} disabled={formSubmitting || !formName.trim()}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                {formSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ──────────────────────────────── */}
            {showDeleteModal && selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hapus Kategori?</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Apakah Anda yakin ingin menghapus kategori <span className="font-semibold text-gray-700 dark:text-gray-300">&quot;{selectedCategory.name}&quot;</span>? Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                Batal
                            </button>
                            <button onClick={handleDelete} disabled={formSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all disabled:opacity-50">
                                {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {formSubmitting ? "Menghapus..." : "Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Detail Modal ──────────────────────────────────────────── */}
            {showDetailModal && selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl">
                                        {selectedCategory.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{selectedCategory.name}</h2>
                                        <p className="text-sm text-emerald-100">ID: {selectedCategory.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {[
                                { label: "ID", value: String(selectedCategory.id) },
                                { label: "Nama", value: selectedCategory.name },
                                { label: "Status", value: selectedCategory.isActive === 1 ? "✅ Aktif" : "❌ Nonaktif" },
                                { label: "Translations", value: translationCount(selectedCategory) > 0 ? `${translationCount(selectedCategory)} bahasa` : "Belum ada terjemahan" },
                                { label: "Dibuat", value: formatDateTime(selectedCategory.createdAt) },
                                { label: "Diperbarui", value: formatDateTime(selectedCategory.updatedAt) },
                            ].map(row => (
                                <div key={row.label} className="flex items-start justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{row.label}</span>
                                    <span className="text-sm text-gray-900 dark:text-white text-right max-w-[60%] break-words">{row.value}</span>
                                </div>
                            ))}

                            {/* Translation preview */}
                            {selectedCategory.translations && Object.keys(selectedCategory.translations).length > 0 && (
                                <div className="mt-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5" /> Daftar Terjemahan
                                    </p>
                                    <div className="space-y-1.5">
                                        {Object.entries(selectedCategory.translations).map(([lang, val]) => {
                                            const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang)
                                            return (
                                                <div key={lang} className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        {langInfo?.flag || "🌐"} {langInfo?.label || lang.toUpperCase()}
                                                    </span>
                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{val}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <button onClick={() => {
                                setShowDetailModal(false)
                                fetchTranslations(selectedCategory)
                            }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                                <Languages className="w-3.5 h-3.5" /> Terjemahan
                            </button>
                            <button onClick={() => {
                                setShowDetailModal(false)
                                setFormName(selectedCategory.name)
                                setFormIsActive(selectedCategory.isActive)
                                setShowEditModal(true)
                            }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Translation Modal ─────────────────────────────────────── */}
            {showTranslationModal && translationCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTranslationModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Languages className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Terjemahan Kategori</h2>
                                        <p className="text-sm text-violet-100">&quot;{translationCategory.name}&quot; — ID: {translationCategory.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowTranslationModal(false)} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {translationsLoading ? (
                                <div className="space-y-3 py-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 animate-pulse">
                                            <Skeleton className="h-6 w-16 rounded-full" />
                                            <Skeleton className="h-4 w-48" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Info */}
                                    <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                                        <p className="text-xs text-violet-600 dark:text-violet-400">
                                            <strong>Nama asli:</strong> {translationCategory.name} <br />
                                            Masukkan terjemahan untuk setiap bahasa, lalu klik tombol <strong>Simpan</strong> di sebelah kanan untuk menyimpan per bahasa.
                                        </p>
                                    </div>

                                    {/* Language rows */}
                                    {SUPPORTED_LANGUAGES.map(lang => (
                                        <div key={lang.code} className="group rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">{lang.flag}</span>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang.label}</span>
                                                <span className="text-xs text-gray-400 uppercase">({lang.code})</span>
                                                {translations[lang.code]?.trim() && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={translations[lang.code] || ""}
                                                    onChange={e => setTranslations(prev => ({ ...prev, [lang.code]: e.target.value }))}
                                                    placeholder={`Terjemahan dalam ${lang.label}...`}
                                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                                                    maxLength={50}
                                                    dir={lang.code === "ar" || lang.code === "ur" ? "rtl" : "ltr"}
                                                />
                                                <button
                                                    onClick={() => saveTranslation(lang.code)}
                                                    disabled={savingLang === lang.code || !translations[lang.code]?.trim()}
                                                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                                >
                                                    {savingLang === lang.code ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    Simpan
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
                            <button onClick={() => { setShowTranslationModal(false); fetchCategories() }}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all">
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ══════════════════════════════════════════════════════════════════════════════════
//  PAGE
// ══════════════════════════════════════════════════════════════════════════════════
export default function GroupCategoriesPage() {
    return <GroupCategoriesContent />
}
