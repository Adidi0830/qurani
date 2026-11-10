"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getStoredAuth } from "@/lib/api"
import { useTranslation } from "@/hooks/use-translation"
import {
    Search, Plus, Pencil, Trash2, Tags, Loader2, RefreshCw,
    CheckCircle2, XCircle, ChevronLeft, ChevronRight, ChevronDown, X,
    Calendar, Hash, Filter, Star, Layers, ArrowUpDown,
    ToggleLeft, ToggleRight, FileText, Image, Palette,
    Link as LinkIcon, AlignLeft, Save,
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── API ───────────────────────────────────────────────────────────────────────
const API_BASE = "https://api.myqurani.com/api/v1/Categories"

/**
 * Mengambil token dari localStorage["myqurani_auth"].accessToken
 * Ini adalah key yang benar sesuai dengan auth-provider.tsx dan lib/api.ts
 */
function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    const auth = getStoredAuth()
    return auth?.accessToken ?? null
}

function authHeaders(): HeadersInit {
    const token = getClientToken()
    return token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" }
}


// ── Types ─────────────────────────────────────────────────────────────────────
interface Category {
    id: number
    name: string
    slug: string
    description: string | null
    icon: string | null
    image: string | null
    coverImage: string | null
    color: string | null
    metaTitle: string | null
    metaDescription: string | null
    parentId: number | null
    sortOrder: number
    isFeatured: number
    isActive: number
    createdAt: string
    updatedAt: string
}

interface ApiListResponse {
    success: boolean
    data: Category[] | {
        items: Category[]
        pagination?: {
            totalCount: number
            pageSize: number
            page?: number
        }
    }
    message: string | null
    correlationId: string | null
    elapsedInMs: number
}

interface FormData {
    name: string
    slug: string
    description: string
    icon: string
    image: string
    coverImage: string
    color: string
    metaTitle: string
    metaDescription: string
    parentId: string
    sortOrder: number
    isFeatured: number
    isActive: number
}

// ── Dummy Data ────────────────────────────────────────────────────────────────
const DUMMY: Category[] = [
    { id: 1, name: "Al-Quran", slug: "al-quran", description: "Kategori tilawah Al-Quran", icon: "📖", image: null, coverImage: null, color: "#10b981", metaTitle: null, metaDescription: null, parentId: null, sortOrder: 1, isFeatured: 1, isActive: 1, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
    { id: 2, name: "Tajwid", slug: "tajwid", description: "Ilmu tajwid dan cara baca Quran", icon: "🎵", image: null, coverImage: null, color: "#6366f1", metaTitle: null, metaDescription: null, parentId: 1, sortOrder: 2, isFeatured: 0, isActive: 1, createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-02-01T00:00:00Z" },
    { id: 3, name: "Tahsin", slug: "tahsin", description: "Perbaikan bacaan Quran", icon: "✨", image: null, coverImage: null, color: "#f59e0b", metaTitle: null, metaDescription: null, parentId: 1, sortOrder: 3, isFeatured: 1, isActive: 1, createdAt: "2025-02-15T00:00:00Z", updatedAt: "2025-02-15T00:00:00Z" },
    { id: 4, name: "Tahfidz", slug: "tahfidz", description: "Hafalan Al-Quran", icon: "🧠", image: null, coverImage: null, color: "#ec4899", metaTitle: null, metaDescription: null, parentId: null, sortOrder: 4, isFeatured: 1, isActive: 1, createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z" },
    { id: 5, name: "Bahasa Arab", slug: "bahasa-arab", description: "Belajar bahasa Arab", icon: "🌍", image: null, coverImage: null, color: "#3b82f6", metaTitle: null, metaDescription: null, parentId: null, sortOrder: 5, isFeatured: 0, isActive: 1, createdAt: "2025-04-01T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z" },
    { id: 6, name: "Fiqih", slug: "fiqih", description: "Ilmu fiqih Islam", icon: "⚖️", image: null, coverImage: null, color: "#8b5cf6", metaTitle: null, metaDescription: null, parentId: null, sortOrder: 6, isFeatured: 0, isActive: 0, createdAt: "2025-05-01T00:00:00Z", updatedAt: "2025-05-01T00:00:00Z" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

const EMPTY_FORM: FormData = {
    name: "", slug: "", description: "", icon: "", image: "", coverImage: "",
    color: "", metaTitle: "", metaDescription: "", parentId: "",
    sortOrder: 0, isFeatured: 0, isActive: 1,
}

// ══════════════════════════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function CategoriesManager() {
    const { t } = useTranslation(["masterdata"])

    // ── State ─────────────────────────────────────────────────────────────────
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const [usingDummy, setUsingDummy] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)

    // Token debug info
    const tokenInfo = useMemo(() => {
        if (typeof window === "undefined") return null
        const auth = getStoredAuth()
        if (!auth) return { hasToken: false, roles: [], isAdmin: false }
        const roles: string[] = auth.roles || []
        const isAdmin = roles.some(r => r.toLowerCase() === "admin")
        return { hasToken: true, roles, isAdmin, username: auth.username }
    }, [])

    // Search & filter
    const [searchInput, setSearchInput] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")
    const [filterFeatured, setFilterFeatured] = useState<"all" | "featured" | "regular">("all")
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [pageSize, setPageSize] = useState(10)

    // CRUD modals
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

    // Form
    const [form, setForm] = useState<FormData>(EMPTY_FORM)
    const [formSubmitting, setFormSubmitting] = useState(false)
    const [slugManual, setSlugManual] = useState(false)

    // ── Fetch ─────────────────────────────────────────────────────────────────
    // GET /api/v1/Categories adalah endpoint PUBLIC — tidak butuh token
    // Namun tetap kirim token jika ada (untuk data yang mungkin tergantung role)
    const fetchCategories = useCallback(async () => {
        setLoading(true)
        setApiError(null)
        try {
            // Coba dengan token dulu (jika ada), GET ini sebenarnya public
            const headers: HeadersInit = { "Content-Type": "application/json" }
            const token = getClientToken()
            if (token) headers["Authorization"] = `Bearer ${token}`

            const res = await fetch(API_BASE, { headers })

            // Tangani error secara spesifik
            if (res.status === 401) {
                setApiError("401")
                throw new Error("UNAUTHORIZED")
            }
            if (res.status === 403) {
                setApiError("403")
                throw new Error("FORBIDDEN")
            }
            if (!res.ok) {
                const errText = await res.text().catch(() => "")
                setApiError(`HTTP_${res.status}`)
                throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`)
            }

            const json = await res.json()
            let items: Category[] = []
            let count = 0

            // Deteksi berbagai format response yang mungkin
            if (Array.isArray(json)) {
                items = json
                count = items.length
            } else if (json.data && Array.isArray(json.data)) {
                items = json.data
                count = json.pagination?.totalCount ?? items.length
            } else if (json.items && Array.isArray(json.items)) {
                items = json.items
                count = json.pagination?.totalCount ?? items.length
            } else if (json.success && Array.isArray(json.data)) {
                items = json.data
                count = items.length
            } else {
                const errMsg = json.message || json.title || "Format response API tidak dikenali"
                setApiError("API_ERROR")
                throw new Error(errMsg)
            }

            setCategories(items)
            setTotalCount(count)
            setUsingDummy(false)
            setApiError(null)
            
            if (items.length === 0) {
                showToast({ title: "Belum ada kategori — silakan tambah kategori baru", type: "info" })
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)

            if (msg === "UNAUTHORIZED") {
                showToast({ title: "❌ 401 — Token tidak valid atau sudah expired", type: "error" })
                // Coba ulang tanpa token (GET ini public)
                try {
                    const res2 = await fetch(API_BASE)
                    if (res2.ok) {
                        const json2 = await res2.json()
                        let items2: Category[] = []
                        if (Array.isArray(json2)) items2 = json2
                        else if (json2.data && Array.isArray(json2.data)) items2 = json2.data
                        
                        if (items2.length > 0) {
                            setCategories(items2)
                            setTotalCount(items2.length)
                            setUsingDummy(false)
                            setApiError(null)
                            showToast({ title: "✅ Berhasil load tanpa token (endpoint public)", type: "success" })
                            return
                        }
                    }
                } catch { /* ignore */ }
                
                showToast({ title: "⚠️ Menggunakan data testing (Gagal load API)", type: "error" })
                setCategories(DUMMY)
                setTotalCount(DUMMY.length)
                setUsingDummy(true)
            } else if (msg === "FORBIDDEN") {
                showToast({ title: "🚫 403 — Akses ditolak. Butuh role Admin", type: "error" })
                setCategories(DUMMY)
                setTotalCount(DUMMY.length)
                setUsingDummy(true)
            } else {
                showToast({ title: `⚠️ Gagal load API, menggunakan data testing statis.`, type: "error" })
                setCategories(DUMMY)
                setTotalCount(DUMMY.length)
                setUsingDummy(true)
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchCategories() }, [fetchCategories])

    // ── Auto-slug ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!slugManual) {
            setForm(f => ({ ...f, slug: slugify(f.name) }))
        }
    }, [form.name, slugManual])

    // ── Create ────────────────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!form.name.trim()) { showToast({ title: "Nama kategori wajib diisi", type: "error" }); return }
        if (!form.slug.trim()) { showToast({ title: "Slug wajib diisi", type: "error" }); return }
        setFormSubmitting(true)
        try {
            const body = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                description: form.description.trim() || null,
                icon: form.icon.trim() || null,
                image: form.image.trim() || null,
                coverImage: form.coverImage.trim() || null,
                color: form.color.trim() || null,
                metaTitle: form.metaTitle.trim() || null,
                metaDescription: form.metaDescription.trim() || null,
                parentId: form.parentId ? Number(form.parentId) : null,
                sortOrder: form.sortOrder,
                isFeatured: form.isFeatured,
            }
            const res = await fetch(API_BASE, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const errBody = await res.text()
                throw new Error(errBody || `HTTP ${res.status}`)
            }
            showToast({ title: "Kategori berhasil dibuat!", type: "success" })
            setShowCreateModal(false)
            setForm(EMPTY_FORM)
            setSlugManual(false)
            fetchCategories()
        } catch (err: unknown) {
            showToast({ title: `Gagal membuat: ${err instanceof Error ? err.message : "Unknown error"}`, type: "error" })
        } finally {
            setFormSubmitting(false)
        }
    }

    // ── Update ────────────────────────────────────────────────────────────────
    const handleUpdate = async () => {
        if (!selectedCategory) return
        if (!form.name.trim()) { showToast({ title: "Nama kategori wajib diisi", type: "error" }); return }
        if (!form.slug.trim()) { showToast({ title: "Slug wajib diisi", type: "error" }); return }
        setFormSubmitting(true)
        try {
            const body = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                description: form.description.trim() || null,
                icon: form.icon.trim() || null,
                image: form.image.trim() || null,
                coverImage: form.coverImage.trim() || null,
                color: form.color.trim() || null,
                metaTitle: form.metaTitle.trim() || null,
                metaDescription: form.metaDescription.trim() || null,
                parentId: form.parentId ? Number(form.parentId) : null,
                sortOrder: form.sortOrder,
                isFeatured: form.isFeatured,
                isActive: form.isActive,
            }
            const res = await fetch(`${API_BASE}/${selectedCategory.id}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify(body),
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

    // ── Delete ────────────────────────────────────────────────────────────────
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

    // ── Derived / Filter ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = [...categories]
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.slug.toLowerCase().includes(q) ||
                (c.description?.toLowerCase().includes(q))
            )
        }
        if (filterActive === "active") list = list.filter(c => c.isActive === 1)
        if (filterActive === "inactive") list = list.filter(c => c.isActive !== 1)
        if (filterFeatured === "featured") list = list.filter(c => c.isFeatured === 1)
        if (filterFeatured === "regular") list = list.filter(c => c.isFeatured !== 1)
        // Default: sort by name A–Z
        list.sort((a, b) => a.name.localeCompare(b.name, "id"))
        return list
    }, [categories, searchQuery, filterActive, filterFeatured])

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize
        return filtered.slice(start, start + pageSize)
    }, [filtered, page])

    const stats = useMemo(() => {
        const active = categories.filter(c => c.isActive === 1).length
        const featured = categories.filter(c => c.isFeatured === 1).length
        const parents = categories.filter(c => !c.parentId).length
        return { total: categories.length, active, featured, parents }
    }, [categories])

    // ── Open Edit Modal ───────────────────────────────────────────────────────
    const openEdit = (cat: Category) => {
        setSelectedCategory(cat)
        setForm({
            name: cat.name,
            slug: cat.slug,
            description: cat.description ?? "",
            icon: cat.icon ?? "",
            image: cat.image ?? "",
            coverImage: cat.coverImage ?? "",
            color: cat.color ?? "",
            metaTitle: cat.metaTitle ?? "",
            metaDescription: cat.metaDescription ?? "",
            parentId: cat.parentId ? String(cat.parentId) : "",
            sortOrder: cat.sortOrder,
            isFeatured: cat.isFeatured,
            isActive: cat.isActive,
        })
        setSlugManual(true)
        setShowEditModal(true)
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen">
            <ToastContainer />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Tags className="w-6 h-6 text-emerald-500" />
                            {t("masterdata.categories.title", "Categories")}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {usingDummy && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium border border-amber-200">
                                Menggunakan Data Dummy
                            </span>
                        )}
                        <button
                            onClick={fetchCategories}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> {t("masterdata.categories.btn_refresh", "Refresh")}
                        </button>
                        <button
                            onClick={() => { setForm(EMPTY_FORM); setSlugManual(false); setShowCreateModal(true) }}
                            className="flex items-center gap-1.5 px-4 py-2 w-full sm:w-auto justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.02]"
                        >
                            <Plus className="w-4 h-4" /> {t("masterdata.categories.btn_add", "Tambah Kategori")}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stat Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: t("masterdata.categories.stat_total", "Total"), value: usingDummy ? stats.total : totalCount, icon: Tags, color: "from-blue-500 to-indigo-500", bg: "bg-blue-50 dark:bg-blue-900/20", iconColor: "#6366f1" },
                    { label: t("masterdata.categories.stat_active", "Aktif"), value: stats.active, icon: CheckCircle2, color: "from-emerald-500 to-green-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", iconColor: "#10b981" },
                    { label: t("masterdata.categories.stat_featured", "Featured"), value: stats.featured, icon: Star, color: "from-amber-400 to-orange-500", bg: "bg-amber-50 dark:bg-amber-900/20", iconColor: "#f59e0b" },
                    { label: t("masterdata.categories.stat_root", "Root"), value: stats.parents, icon: Layers, color: "from-violet-500 to-purple-500", bg: "bg-violet-50 dark:bg-violet-900/20", iconColor: "#8b5cf6" },
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

            {/* ── Table & Toolbar ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                    {/* Kiri: Search & Filter */}
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                        {/* Search */}
                        <div className="flex flex-1 sm:flex-none sm:w-64 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                            <div className="relative flex-1 bg-gray-50 dark:bg-gray-800">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t("masterdata.categories.search_placeholder", "Cari kategori, slug...")}
                                    value={searchInput}
                                    onChange={e => setSearchInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") { setSearchQuery(searchInput); setPage(1); } }}
                                    className="w-full pl-9 pr-8 py-2 text-sm bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white"
                                />
                                {searchInput && (
                                    <button onClick={() => { setSearchInput(""); setSearchQuery(""); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => { setSearchQuery(searchInput); setPage(1) }}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors flex-shrink-0"
                            >
                                {t("masterdata.categories.search", "Search")}
                            </button>
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setFilterDropdownOpen(o => !o)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border flex-shrink-0 ${
                                    filterActive !== "all" || filterFeatured !== "all"
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                        : "bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                            >
                                <Filter className="w-4 h-4" /> 
                                <span className="hidden sm:inline">Filter</span>
                                {(filterActive !== "all" || filterFeatured !== "all") && (
                                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                                        {[filterActive !== "all", filterFeatured !== "all"].filter(Boolean).length}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown Panel */}
                            {filterDropdownOpen && (
                                <>
                                    {/* Backdrop */}
                                    <div className="fixed inset-0 z-10" onClick={() => setFilterDropdownOpen(false)} />
                                    <div className="absolute left-0 mt-2 z-20 w-52 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
                                        {/* Semua */}
                                        <button
                                            onClick={() => { setFilterActive("all"); setFilterFeatured("all"); setPage(1); setFilterDropdownOpen(false) }}
                                            className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors ${
                                                filterActive === "all" && filterFeatured === "all"
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}
                                        >
                                            {t("masterdata.categories.filter_all", "Semua")}
                                        </button>

                                        {/* Divider + Status */}
                                        <div className="px-4 pt-2 pb-1">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("masterdata.categories.filter_group_status", "STATUS")}</p>
                                        </div>
                                        {(["active", "inactive"] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => { setFilterActive(f === filterActive ? "all" : f); setPage(1); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                                                    filterActive === f
                                                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium"
                                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                    f === "active" ? "bg-emerald-400" : "bg-red-400"
                                                }`} />
                                                {f === "active" ? t("masterdata.categories.filter_active", "Aktif") : t("masterdata.categories.filter_inactive", "Nonaktif")}
                                            </button>
                                        ))}

                                        {/* Divider + Featured */}
                                        <div className="px-4 pt-3 pb-1">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("masterdata.categories.filter_group_featured", "FEATURED")}</p>
                                        </div>
                                        {(["featured", "regular"] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => { setFilterFeatured(f === filterFeatured ? "all" : f); setPage(1); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                                                    filterFeatured === f
                                                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium"
                                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                }`}
                                            >
                                                {f === "featured"
                                                    ? <Star className={`w-3.5 h-3.5 shrink-0 ${filterFeatured === "featured" ? "fill-current" : ""}`} />
                                                    : <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-gray-400">—</span>
                                                }
                                                {f === "featured" ? t("masterdata.categories.filter_featured", "Featured") : t("masterdata.categories.filter_regular", "Regular")}
                                            </button>
                                        ))}

                                        {/* Reset if any filter is active */}
                                        {(filterActive !== "all" || filterFeatured !== "all") && (
                                            <div className="p-3 border-t border-gray-100 dark:border-gray-800">
                                                <button
                                                    onClick={() => { setFilterActive("all"); setFilterFeatured("all"); setPage(1); setFilterDropdownOpen(false) }}
                                                    className="w-full text-xs text-center text-red-500 hover:text-red-600 font-medium py-1"
                                                >
                                                    {t("masterdata.categories.filter_reset", "Reset Filter")}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        <span className="ml-3 text-gray-500 dark:text-gray-400">Memuat data...</span>
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
                        <Tags className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg font-medium">{t("masterdata.categories.empty_title", "Tidak ada kategori ditemukan")}</p>
                        <p className="text-sm mt-1">{t("masterdata.categories.empty_desc", "Coba ubah pencarian atau tambah kategori baru")}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                    <th className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> {t("masterdata.categories.col_id", "ID")}</div>
                                    </th>
                                    <th className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1.5"><Tags className="w-3.5 h-3.5" /> {t("masterdata.categories.col_name", "Nama")}</div>
                                    </th>
                                    <th className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> {t("masterdata.categories.col_slug", "Slug")}</div>
                                    </th>
                                    <th className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" /> {t("masterdata.categories.col_desc", "Deskripsi")}</div>
                                    </th>
                                    <th className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> {t("masterdata.categories.col_featured", "Featured")}</div>
                                    </th>
                                    <th className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> {t("masterdata.categories.col_status", "Status")}</div>
                                    </th>
                                    <th className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {t("masterdata.categories.col_created", "Dibuat")}</div>
                                    </th>
                                    <th className="text-center px-4 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap">
                                        {t("masterdata.categories.col_actions", "Aksi")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {paginated.map((cat) => (
                                    <tr key={cat.id}
                                        className="group hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer"
                                        onClick={() => { setSelectedCategory(cat); setShowDetailModal(true) }}
                                    >
                                        {/* ID */}
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                {cat.id}
                                            </span>
                                        </td>

                                        {/* Name */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
                                                    style={{ background: cat.color || "linear-gradient(135deg, #10b981, #0d9488)" }}
                                                >
                                                    {cat.icon ? (
                                                        <span className="text-base">{cat.icon}</span>
                                                    ) : (
                                                        cat.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{cat.name}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Slug */}
                                        <td className="px-4 py-4">
                                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                                                {cat.slug}
                                            </span>
                                        </td>

                                        {/* Description */}
                                        <td className="px-4 py-4 max-w-[200px]">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {cat.description || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
                                            </p>
                                        </td>


                                        {/* Featured */}
                                        <td className="px-4 py-4">
                                            {cat.isFeatured === 1 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                    <Star className="w-3 h-3 fill-current" /> Featured
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {cat.isActive === 1 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> {t("masterdata.categories.status_active", "Aktif")}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                    <XCircle className="w-3.5 h-3.5" /> {t("masterdata.categories.status_inactive", "Nonaktif")}
                                                </span>
                                            )}
                                        </td>

                                        {/* Created At */}
                                        <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                            {formatDate(cat.createdAt)}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => openEdit(cat)}
                                                    className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedCategory(cat); setShowDeleteModal(true) }}
                                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Hapus"
                                                >
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
                {!loading && filtered.length > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap justify-center sm:justify-start">
                            <span>{t("masterdata.categories.pagination_showing", "Menampilkan")} <span className="font-bold text-emerald-600">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)}</span> {t("masterdata.categories.pagination_of", "dari")} <span className="font-bold text-gray-700 dark:text-gray-200">{filtered.length}</span> {t("masterdata.categories.pagination_categories", "data")}</span>
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
                                <button 
                                    onClick={() => setPage(Math.max(1, page - 1))} 
                                    disabled={page <= 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                
                                {/* Page Numbers */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number
                                    if (totalPages <= 5) {
                                        pageNum = i + 1
                                    } else if (page <= 3) {
                                        pageNum = i + 1
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i
                                    } else {
                                        pageNum = page - 2 + i
                                    }
                                    return (
                                        <button 
                                            key={pageNum} 
                                            onClick={() => setPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors border ${
                                                page === pageNum
                                                    ? "bg-emerald-500 text-white shadow-sm border-emerald-500"
                                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                })}

                                <button 
                                    onClick={() => setPage(Math.min(totalPages, page + 1))} 
                                    disabled={page >= totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ══════════════════ MODALS ══════════════════ */}

            {/* ── Create Modal ───────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{t("masterdata.categories.modal_add_title", "Tambah Kategori")}</h2>
                                        <p className="text-sm text-emerald-100">{t("masterdata.categories.modal_add_desc", "Buat kategori baru untuk platform")}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <CategoryForm form={form} setForm={setForm} slugManual={slugManual} setSlugManual={setSlugManual} categories={categories} isEdit={false} />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                {t("masterdata.categories.btn_cancel", "Batal")}
                            </button>
                            <button onClick={handleCreate} disabled={formSubmitting || !form.name.trim() || !form.slug.trim()}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {formSubmitting ? "Menyimpan..." : t("masterdata.categories.btn_create", "Buat Kategori")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ─────────────────────────────────────────────── */}
            {showEditModal && selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Pencil className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{t("masterdata.categories.modal_edit_title", "Edit Kategori")}</h2>
                                        <p className="text-sm text-blue-100">ID: {selectedCategory.id} — {selectedCategory.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <CategoryForm form={form} setForm={setForm} slugManual={slugManual} setSlugManual={setSlugManual} categories={categories.filter(c => c.id !== selectedCategory.id)} isEdit={true} />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
                            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                {t("masterdata.categories.btn_cancel", "Batal")}
                            </button>
                            <button onClick={handleUpdate} disabled={formSubmitting || !form.name.trim() || !form.slug.trim()}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {formSubmitting ? "Menyimpan..." : t("masterdata.categories.btn_save", "Simpan Perubahan")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ───────────────────────────────────────────── */}
            {showDeleteModal && selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("masterdata.categories.modal_delete_title", "Hapus Kategori?")}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("masterdata.categories.modal_delete_desc", "Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan.", { name: selectedCategory.name })}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 px-6 pb-6">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                {t("masterdata.categories.btn_cancel", "Batal")}
                            </button>
                            <button onClick={handleDelete} disabled={formSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50">
                                {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {formSubmitting ? "Menghapus..." : t("masterdata.categories.btn_delete", "Ya, Hapus")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Detail Modal ───────────────────────────────────────────── */}
            {showDetailModal && selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div
                            className="px-6 py-5"
                            style={{ background: selectedCategory.color ? `linear-gradient(135deg, ${selectedCategory.color}cc, ${selectedCategory.color}88)` : "linear-gradient(135deg, #10b981, #0d9488)" }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                                        {selectedCategory.icon || selectedCategory.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{selectedCategory.name}</h2>
                                        <p className="text-sm text-white/80 font-mono">{selectedCategory.slug}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 space-y-3">
                            {[
                                { label: t("masterdata.categories.col_id", "ID"), value: selectedCategory.id },
                                { label: t("masterdata.categories.col_desc", "Deskripsi"), value: selectedCategory.description || "—" },
                                { label: "Parent ID", value: selectedCategory.parentId ?? "Root" },
                                { label: t("masterdata.categories.col_sort", "Sort Order"), value: selectedCategory.sortOrder },
                                { label: t("masterdata.categories.col_featured", "Featured"), value: selectedCategory.isFeatured === 1 ? `⭐ ${t("masterdata.categories.label_yes", "Ya")}` : t("masterdata.categories.label_no", "Tidak") },
                                { label: t("masterdata.categories.col_status", "Status"), value: selectedCategory.isActive === 1 ? `✅ ${t("masterdata.categories.status_active", "Aktif")}` : `❌ ${t("masterdata.categories.status_inactive", "Nonaktif")}` },
                                { label: "Warna", value: selectedCategory.color || "—" },
                                { label: t("masterdata.categories.col_created", "Dibuat"), value: formatDate(selectedCategory.createdAt) },
                                { label: "Diperbarui", value: formatDate(selectedCategory.updatedAt) },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</span>
                                    <span className="text-sm text-gray-900 dark:text-white font-medium">{String(item.value)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 px-6 pb-6">
                            <button
                                onClick={() => { setShowDetailModal(false); openEdit(selectedCategory) }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                                <Pencil className="w-4 h-4" /> {t("masterdata.categories.btn_edit", "Edit")}
                            </button>
                            <button onClick={() => setShowDetailModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                {t("masterdata.categories.btn_close", "Tutup")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ══════════════════════════════════════════════════════════════════════════════
//  CATEGORY FORM (reused in Create & Edit modals)
// ══════════════════════════════════════════════════════════════════════════════
interface CategoryFormProps {
    form: FormData
    setForm: React.Dispatch<React.SetStateAction<FormData>>
    slugManual: boolean
    setSlugManual: (v: boolean) => void
    categories: Category[]
    isEdit: boolean
}

function CategoryForm({ form, setForm, slugManual, setSlugManual, categories, isEdit }: CategoryFormProps) {
    const { t } = useTranslation(["masterdata"])
    const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
    const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"

    return (
        <div className="space-y-4">
            {/* Row: Name + Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>{t("masterdata.categories.form_name", "Nama Kategori")} *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Contoh: Al-Quran"
                        className={inputCls}
                        maxLength={100}
                        autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1">{form.name.length}/100</p>
                </div>
                <div>
                    <label className={labelCls}>{t("masterdata.categories.form_slug", "Slug")} *</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={form.slug}
                            onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })) }}
                            placeholder="al-quran"
                            className={inputCls}
                            maxLength={120}
                        />
                        {slugManual && (
                            <button
                                type="button"
                                onClick={() => setSlugManual(false)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                                title="Reset ke auto-generate"
                            >
                                auto
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">URL-friendly identifier</p>
                </div>
            </div>

            {/* Description */}
            <div>
                <label className={labelCls}>
                    <FileText className="w-3 h-3 inline mr-1" />{t("masterdata.categories.form_desc", "Deskripsi")}
                </label>
                <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Deskripsi singkat tentang kategori ini..."
                    className={`${inputCls} resize-none`}
                    rows={3}
                    maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1">{form.description.length}/500</p>
            </div>

            {/* Row: Icon + Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>
                        <Image className="w-3 h-3 inline mr-1" />{t("masterdata.categories.form_icon", "Icon (emoji/text)")}
                    </label>
                    <input
                        type="text"
                        value={form.icon}
                        onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                        placeholder="📖"
                        className={inputCls}
                        maxLength={50}
                    />
                </div>
                <div>
                    <label className={labelCls}>
                        <Palette className="w-3 h-3 inline mr-1" />{t("masterdata.categories.form_color", "Warna")}
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={form.color || "#10b981"}
                            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                            className="h-10 w-12 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer bg-transparent p-1"
                        />
                        <input
                            type="text"
                            value={form.color}
                            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                            placeholder="#10b981"
                            className={`${inputCls} flex-1`}
                            maxLength={20}
                        />
                    </div>
                </div>
            </div>

            {/* Row: Image + Cover Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>
                        <Image className="w-3 h-3 inline mr-1" />{t("masterdata.categories.form_image", "Image URL")}
                    </label>
                    <input
                        type="url"
                        value={form.image}
                        onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                        placeholder="https://..."
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className={labelCls}>
                        <Image className="w-3 h-3 inline mr-1" />{t("masterdata.categories.form_cover", "Cover Image URL")}
                    </label>
                    <input
                        type="url"
                        value={form.coverImage}
                        onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                        placeholder="https://..."
                        className={inputCls}
                    />
                </div>
            </div>

            {/* Row: Parent + Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>
                        <Layers className="w-3 h-3 inline mr-1" />{t("masterdata.categories.form_parent", "Parent Kategori")}
                    </label>
                    <select
                        value={form.parentId}
                        onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                        className={inputCls}
                    >
                        <option value="">— Root (Tidak ada parent) —</option>
                        {categories.filter(c => !c.parentId).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>
                        <ArrowUpDown className="w-3 h-3 inline mr-1" />{t("masterdata.categories.form_sort", "Sort Order")}
                    </label>
                    <input
                        type="number"
                        value={form.sortOrder}
                        onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                        min={0}
                        max={9999}
                        className={inputCls}
                    />
                </div>
            </div>

            {/* Meta Title + Meta Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>{t("masterdata.categories.form_meta_title", "Meta Title")}</label>
                    <input
                        type="text"
                        value={form.metaTitle}
                        onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))}
                        placeholder="SEO meta title..."
                        className={inputCls}
                        maxLength={160}
                    />
                </div>
                <div>
                    <label className={labelCls}>{t("masterdata.categories.form_meta_desc", "Meta Description")}</label>
                    <input
                        type="text"
                        value={form.metaDescription}
                        onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))}
                        placeholder="SEO meta description..."
                        className={inputCls}
                        maxLength={300}
                    />
                </div>
            </div>

            {/* Toggles: Featured + Status (isActive only for edit) */}
            <div className={`grid grid-cols-1 ${isEdit ? "sm:grid-cols-2" : "sm:grid-cols-1"} gap-4`}>
                <div>
                    <label className={labelCls}>
                        <Star className="w-3 h-3 inline mr-1" />{t("masterdata.categories.form_featured", "Featured")}
                    </label>
                    <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, isFeatured: f.isFeatured === 1 ? 0 : 1 }))}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all ${form.isFeatured === 1
                            ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                            }`}
                    >
                        {form.isFeatured === 1
                            ? <ToggleRight className="w-6 h-6 text-amber-500" />
                            : <ToggleLeft className="w-6 h-6 text-gray-400" />
                        }
                        <span className={`text-sm font-medium ${form.isFeatured === 1 ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
                            {form.isFeatured === 1 ? `⭐ ${t("masterdata.categories.label_yes", "Ya")}` : t("masterdata.categories.label_no", "Tidak")}
                        </span>
                    </button>
                </div>

                {isEdit && (
                    <div>
                        <label className={labelCls}>{t("masterdata.categories.form_status", "Status")}</label>
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, isActive: f.isActive === 1 ? 0 : 1 }))}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all ${form.isActive === 1
                                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
                                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                                }`}
                        >
                            {form.isActive === 1
                                ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                                : <ToggleLeft className="w-6 h-6 text-gray-400" />
                            }
                            <span className={`text-sm font-medium ${form.isActive === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                                {form.isActive === 1 ? t("masterdata.categories.status_active", "Aktif") : t("masterdata.categories.status_inactive", "Nonaktif")}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
