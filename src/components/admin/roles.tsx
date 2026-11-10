"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Loader2, Shield, CreditCard, Users, Headphones, Star, ShieldCheck,
    RefreshCw, Edit, X, Check, Eye, ChevronRight, ChevronLeft,
    ToggleLeft, ToggleRight, Save, ArrowUpRight, Search, KeyRound,
} from "lucide-react"
import { rolesApi, usersApi } from "@/lib/api"
import { toast } from "sonner"
import { ALL_PAGES, getRoleMetaBase, getSavedRolePages } from "@/lib/role-utils"

// ── Page Groups for Hak Akses step ─────────────────────────────────────────
const PAGE_GROUPS: { label: string; pages: string[] }[] = [
    { label: "Umum",         pages: ["Dashboard", "Notifications", "Settings", "Profile"] },
    { label: "Billing",      pages: ["Billing"] },
    { label: "Konten",       pages: ["My Qurani", "Groups"] },
    { label: "Dukungan",     pages: ["Support"] },
    { label: "Administrator",pages: ["Administrator", "Master Data"] },
]

// ── Icon helper ─────────────────────────────────────────────────────────────
function getRoleMeta(name: string) {
    const base = getRoleMetaBase(name)
    const key = name?.toLowerCase()?.trim()
    let icon = <Shield className="w-5 h-5" />
    if (key === "admin")   icon = <ShieldCheck className="w-5 h-5" />
    else if (key === "billing") icon = <CreditCard className="w-5 h-5" />
    else if (key === "member")  icon = <Users className="w-5 h-5" />
    else if (key === "support") icon = <Headphones className="w-5 h-5" />
    return { ...base, icon }
}

// ── Color options for Profil Role step ─────────────────────────────────────
const IDENTITY_COLORS = [
    { label: "Oranye", gradient: "from-orange-400 to-red-500",    hex: "#f97316" },
    { label: "Hijau",  gradient: "from-emerald-400 to-teal-500",  hex: "#10b981" },
    { label: "Biru",   gradient: "from-blue-400 to-indigo-500",   hex: "#3b82f6" },
    { label: "Ungu",   gradient: "from-purple-400 to-violet-500", hex: "#8b5cf6" },
    { label: "Abu",    gradient: "from-gray-400 to-slate-500",    hex: "#6b7280" },
    { label: "Pink",   gradient: "from-pink-400 to-rose-500",     hex: "#ec4899" },
    { label: "Kuning", gradient: "from-amber-400 to-yellow-500",  hex: "#f59e0b" },
]



// ── Role Card ───────────────────────────────────────────────────────────────
function RoleCard({
    role, isDefault, accessiblePages, userCount,
    onEdit, onViewUsers,
}: {
    role: any; isDefault: boolean; accessiblePages: string[]; userCount: number;
    onEdit: () => void; onViewUsers: () => void;
}) {
    const meta      = getRoleMeta(role.name)
    const accessible = accessiblePages.length
    const TOTAL     = ALL_PAGES.length
    const pct       = Math.round((accessible / TOTAL) * 100)
    const isSystem  = getRoleMetaBase(role.name?.toLowerCase()?.trim())?.isSystem

    // bar colour from gradient
    const barColorMap: Record<string, string> = {
        "from-orange-400 to-red-500":    "bg-orange-500",
        "from-emerald-400 to-teal-500":  "bg-emerald-500",
        "from-blue-400 to-indigo-500":   "bg-blue-500",
        "from-purple-400 to-violet-500": "bg-purple-500",
        "from-gray-400 to-slate-500":    "bg-gray-500",
        "from-pink-400 to-rose-500":     "bg-pink-500",
        "from-amber-400 to-yellow-500":  "bg-amber-500",
    }
    const barColor = barColorMap[meta.gradient] ?? "bg-gray-500"

    return (
        <div className={`relative bg-white dark:bg-gray-900 rounded-2xl border ${isDefault ? "border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-900/50" : "border-gray-200 dark:border-gray-700"} p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}>
            {/* Top row: Icon + Badges */}
            <div className="flex items-start justify-between gap-2">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                    {meta.icon}
                </div>
                <div className="flex flex-col items-end gap-1">
                    {isSystem && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 tracking-wide">
                            SISTEM
                        </span>
                    )}
                    {isDefault && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 tracking-wide flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-current" /> DEFAULT
                        </span>
                    )}
                    {!isSystem && !isDefault && (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${meta.badgeColor} tracking-wide`}>
                            CUSTOM
                        </span>
                    )}
                </div>
            </div>

            {/* Name & Description */}
            <div>
                <h3 className={`text-base font-bold leading-tight ${isDefault ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>{role.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
                    {role.description || "Role pengguna sistem"}
                </p>
            </div>

            {/* Stats: Pengguna + Izin Akses */}
            <div className="flex items-center gap-6">
                <button onClick={onViewUsers} className="group/u flex flex-col items-start hover:opacity-80 transition-opacity">
                    <p className="text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Pengguna
                    </p>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover/u:text-blue-500 transition-colors">{userCount}</span>
                </button>
                <div className="flex flex-col items-start">
                    <p className="text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Izin Akses
                    </p>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{accessible}</span>
                </div>
            </div>

            {/* Capacity bar */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Kapasitas Akses</p>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
            </div>

            {/* Footer: ID + action button */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-600">
                    ID: #{role.roleId || role.id} · {isSystem ? "System Role" : "Custom Role"}
                </span>
                <button
                    onClick={onEdit}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        isSystem
                            ? "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            : "border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    }`}
                >
                    <Edit className="w-3.5 h-3.5" />
                    {isSystem ? "Lihat Akses" : "Edit Role"}
                </button>
            </div>
        </div>
    )
}

// ── User Panel (slide-in from right) ─────────────────────────────────────
function UserPanel({ role, onClose }: { role: any; onClose: () => void }) {
    const [search, setSearch]   = useState("")
    const [users, setUsers]     = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState<string | null>(null)

    useEffect(() => {
        if (!role?.name) return
        setLoading(true)
        setError(null)
        usersApi.search({ role: role.name, pageSize: 50 })
            .then((res: any) => {
                const data = res?.data ?? res
                const list = Array.isArray(data?.items) ? data.items
                    : Array.isArray(data?.data) ? data.data
                    : Array.isArray(data) ? data
                    : []
                setUsers(list)
            })
            .catch((e: any) => {
                console.warn("[UserPanel] fetch error:", e.message)
                setError("Gagal memuat daftar pengguna")
            })
            .finally(() => setLoading(false))
    }, [role?.name])

    const filtered = users.filter(u => {
        const q = search.toLowerCase()
        return !q ||
            (u.name || u.username || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.username || "").toLowerCase().includes(q)
    })

    const meta = getRoleMeta(role?.name ?? "")

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                            {meta.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{role?.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {loading ? "Memuat..." : `${users.length} pengguna menggunakan role ini`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari nama, email, username..."
                            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto py-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <p className="text-sm">Memuat pengguna...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
                            <Users className="w-8 h-8 opacity-40" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
                            <Users className="w-8 h-8 opacity-40" />
                            <p className="text-sm">{search ? "Tidak ada hasil pencarian" : "Belum ada pengguna dengan role ini"}</p>
                        </div>
                    ) : filtered.map((u, i) => {
                        const displayName = u.name || u.username || `User #${u.userId || u.id}`
                        const isBlocked   = u.isBlocked === true
                        const joinDate    = u.createdAt || u.created || ""
                        return (
                            <div key={u.userId || u.id || i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                                    {u.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={u.image} alt={displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        displayName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight truncate">{displayName}</p>
                                    <p className="text-[11px] text-gray-400 truncate">@{u.username || "—"} · {u.email || "—"}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isBlocked
                                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    }`}>
                                        {isBlocked ? "Blocked" : "Active"}
                                    </span>
                                    {joinDate && (
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(joinDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <a
                        href="/admin/users"
                        className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Kelola di Halaman Users (Administrator)
                    </a>
                </div>
            </div>
        </div>
    )
}

// ── Edit Modal (3 steps) ──────────────────────────────────────────────────
function EditRoleModal({
    role, currentPages,
    onClose, onSave,
}: {
    role: any; currentPages: string[];
    onClose: () => void;
    onSave: (pages: string[], name: string, description: string) => void;
}) {
    const meta     = getRoleMeta(role?.name ?? "")
    const isSystem = getRoleMetaBase(role?.name?.toLowerCase()?.trim())?.isSystem

    const [step, setStep]           = useState(1)
    const [roleName, setRoleName]   = useState(role?.name ?? "")
    const [roleDesc, setRoleDesc]   = useState(role?.description ?? "")
    const [selColor, setSelColor]   = useState(meta.gradient)
    const [pages, setPages]         = useState<string[]>(currentPages)

    const TOTAL_PAGES = ALL_PAGES.length
    const pct         = Math.round((pages.length / TOTAL_PAGES) * 100)
    const selGrad     = IDENTITY_COLORS.find(c => c.gradient === selColor)?.gradient ?? meta.gradient

    function togglePage(p: string) {
        setPages(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
    }
    function toggleGroup(groupPages: string[]) {
        const allOn = groupPages.every(p => pages.includes(p))
        if (allOn) setPages(prev => prev.filter(x => !groupPages.includes(x)))
        else       setPages(prev => Array.from(new Set([...prev, ...groupPages])))
    }

    const stepLabels = ["Profil Role", "Hak Akses", "Review"]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {isSystem ? "Lihat Akses" : "Edit Role Custom"}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {isSystem ? "Hak akses untuk role sistem ini." : "Kelola preferensi dan izin akses untuk role ini."}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                        <div
                            className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>

                    {/* Step tabs */}
                    <div className="flex gap-1">
                        {stepLabels.map((label, idx) => {
                            const sn = idx + 1
                            const done   = step > sn
                            const active = step === sn
                            return (
                                <button
                                    key={label}
                                    onClick={() => sn < step && setStep(sn)}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                        active ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                                        : done  ? "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                                        : "text-gray-400 dark:text-gray-600 cursor-default"
                                    }`}
                                >
                                    {done && <Check className="w-3 h-3 inline mr-1 text-emerald-500" />}
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ── Step 1: Profil Role ── */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Nama Role *</label>
                                <input
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    disabled={isSystem}
                                    placeholder="Nama yang akan ditampilkan ke pengguna"
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-500"
                                />
                                <p className="text-xs text-gray-400 mt-1">Nama yang akan ditampilkan kepada pengguna.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Warna Identitas</label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {IDENTITY_COLORS.map(c => (
                                        <button
                                            key={c.gradient}
                                            onClick={() => setSelColor(c.gradient)}
                                            title={c.label}
                                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.gradient} transition-all ${selColor === c.gradient ? "ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300 scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"}`}
                                        >
                                            {selColor === c.gradient && <Check className="w-4 h-4 text-white mx-auto" />}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Pilih warna untuk membedakan role ini.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Deskripsi</label>
                                <textarea
                                    value={roleDesc}
                                    onChange={e => setRoleDesc(e.target.value)}
                                    disabled={isSystem}
                                    rows={3}
                                    placeholder="Deskripsi singkat tentang fungsi role ini..."
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 resize-none disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-500"
                                />
                            </div>
                            {/* Preview card */}
                            <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/40">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Preview</p>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selGrad} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                                        {roleName?.charAt(0)?.toUpperCase() || "R"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{roleName || "Nama Role"}</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[280px]">{roleDesc || "Deskripsi role..."}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Hak Akses ── */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Pilih halaman yang dapat diakses oleh role <strong className="text-gray-700 dark:text-gray-200">{roleName}</strong>.
                                Saat ini <strong>{pages.length}</strong> dari {TOTAL_PAGES} halaman dipilih ({pct}%).
                            </p>

                            {/* Progress mini bar */}
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-orange-500" : pct >= 40 ? "bg-blue-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {PAGE_GROUPS.map(group => {
                                    const allOn = group.pages.every(p => pages.includes(p))
                                    const someOn = !allOn && group.pages.some(p => pages.includes(p))
                                    return (
                                        <div key={group.label} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                            {/* Group header */}
                                            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{group.label}</p>
                                                    <p className="text-[10px] text-gray-400">Hak akses untuk Bagian {group.label}</p>
                                                </div>
                                                <button
                                                    onClick={() => toggleGroup(group.pages)}
                                                    disabled={isSystem}
                                                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {allOn ? "HAPUS SEMUA" : "PILIH SEMUA"}
                                                </button>
                                            </div>
                                            {/* Page rows */}
                                            {group.pages.map(page => {
                                                const isOn = pages.includes(page)
                                                return (
                                                    <div
                                                        key={page}
                                                        onClick={() => !isSystem && togglePage(page)}
                                                        className={`flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 border-gray-100 dark:border-gray-800 ${!isSystem ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40" : ""} transition-colors`}
                                                    >
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{page}</p>
                                                            <p className="text-[10px] text-gray-400">Mengizinkan akses ke halaman {page}</p>
                                                        </div>
                                                        {isOn
                                                            ? <ToggleRight className="w-7 h-7 text-blue-500 flex-shrink-0" />
                                                            : <ToggleLeft className="w-7 h-7 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                        }
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Review ── */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div className={`rounded-xl p-4 bg-gradient-to-br ${selGrad} text-white shadow-sm`}>
                                <p className="text-xs font-semibold uppercase opacity-80 mb-1">Preview Role</p>
                                <p className="text-lg font-bold">{roleName}</p>
                                <p className="text-sm opacity-80 mt-0.5">{roleDesc || "—"}</p>
                                <div className="flex gap-4 mt-3">
                                    <div>
                                        <p className="text-[10px] opacity-70">IZIN AKSES</p>
                                        <p className="text-sm font-bold">{pages.length} halaman</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] opacity-70">KAPASITAS</p>
                                        <p className="text-sm font-bold">{pct}%</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Halaman yang Dapat Diakses ({pages.length})</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {pages.map(p => (
                                        <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                            {p}
                                        </span>
                                    ))}
                                    {pages.length === 0 && <span className="text-sm text-gray-400 italic">Tidak ada halaman dipilih</span>}
                                </div>
                            </div>

                            {!isSystem && (
                                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                    <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        Perubahan ini akan diterapkan segera. Pengguna dengan role ini akan mendapatkan akses baru setelah disimpan.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <ChevronLeft className="w-4 h-4" /> Kembali
                            </button>
                        )}
                        {step === 1 && (
                            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                Batal
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">Langkah {step} dari 3</span>
                        {step < 3 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-sm"
                            >
                                Lanjut <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => onSave(pages, roleName, roleDesc)}
                                disabled={isSystem}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                {isSystem ? "Sistem Role (Tidak dapat diubah)" : "Simpan Perubahan"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Main Roles Component ────────────────────────────────────────────────────
export default function Roles() {
    const [roles, setRoles]                 = useState<any[]>([])
    const [isLoading, setIsLoading]         = useState(true)
    const [error, setError]                 = useState<string | null>(null)
    const [rolePagesConfig, setRolePagesConfig] = useState<Record<string, string[]>>({})
    const [editModal, setEditModal]         = useState<{ open: boolean; role: any; pages: string[] }>({ open: false, role: null, pages: [] })
    const [userPanel, setUserPanel]         = useState<{ open: boolean; role: any }>({ open: false, role: null })
    const [userCounts, setUserCounts]       = useState<Record<string, number>>({})

    const fetchRoles = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await rolesApi.getAll()
            if (response?.success) {
                setRoles(response.data || [])
            } else {
                setError(response?.message || "Gagal memuat data roles")
                toast.error(response?.message || "Gagal memuat data roles")
            }
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan saat memuat roles")
            toast.error("Terjadi kesalahan saat memuat roles")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchRoles() }, [fetchRoles])

    useEffect(() => {
        const config: Record<string, string[]> = {}
        roles.forEach(r => { config[r.name] = getSavedRolePages(r.name, getRoleMeta(r.name).pages) })
        setRolePagesConfig(config)

        // Fetch user counts per role
        roles.forEach(async (r) => {
            try {
                const res = await usersApi.search({ role: r.name, pageSize: 1 })
                const data = res?.data ?? res
                const total = data?.totalItems ?? data?.total ?? data?.totalCount
                    ?? (Array.isArray(data?.items) ? data.items.length
                    : Array.isArray(data?.data) ? data.data.length
                    : Array.isArray(data) ? data.length : 0)
                setUserCounts(prev => ({ ...prev, [r.name]: typeof total === "number" ? total : 0 }))
            } catch {
                setUserCounts(prev => ({ ...prev, [r.name]: 0 }))
            }
        })
    }, [roles])

    const systemRoles = roles.filter(r => getRoleMetaBase(r.name?.toLowerCase()?.trim())?.isSystem)
    const customRoles  = roles.filter(r => !getRoleMetaBase(r.name?.toLowerCase()?.trim())?.isSystem)

    function handleSave(pages: string[], name: string, desc: string) {
        const roleName = editModal.role?.name
        if (!roleName) return
        const key = `role_pages_${roleName.toLowerCase().trim()}`
        localStorage.setItem(key, JSON.stringify(pages))
        setRolePagesConfig(prev => ({ ...prev, [roleName]: pages }))
        setEditModal({ open: false, role: null, pages: [] })
        toast.success(`Hak akses untuk role ${roleName} berhasil disimpan.`)
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1600px] mx-auto space-y-5">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Role</h1>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-semibold text-gray-800 dark:text-gray-200 shadow-sm">
                            {roles.length} Role
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-semibold text-amber-600 dark:text-amber-400 shadow-sm">
                            {systemRoles.length} Sistem
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-semibold text-blue-600 dark:text-blue-400 shadow-sm">
                            {customRoles.length} Custom
                        </span>
                        <a
                            href="/admin/permissions"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
                        >
                            <KeyRound className="w-3.5 h-3.5" />
                            Permissions
                        </a>
                        <button
                            onClick={fetchRoles}
                            disabled={isLoading}
                            className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* States */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Memuat data roles...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-full">
                            <Shield className="w-10 h-10 text-red-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Gagal Memuat Roles</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                        </div>
                        <button onClick={fetchRoles} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors">
                            Coba Lagi
                        </button>
                    </div>
                ) : roles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="p-5 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <Shield className="w-10 h-10 text-gray-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Belum Ada Role</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[280px]">
                                API tidak mengembalikan data role. Pastikan Anda sudah login dan memiliki akses admin.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {roles.map((role: any) => (
                            <RoleCard
                                key={role.roleId || role.id || role.name}
                                role={role}
                                isDefault={role.name?.toLowerCase()?.trim() === "member"}
                                accessiblePages={rolePagesConfig[role.name] || getRoleMeta(role.name).pages}
                                userCount={userCounts[role.name] ?? 0}
                                onEdit={() => setEditModal({
                                    open: true,
                                    role,
                                    pages: rolePagesConfig[role.name] || getRoleMeta(role.name).pages,
                                })}
                                onViewUsers={() => setUserPanel({ open: true, role })}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editModal.open && editModal.role && (
                <EditRoleModal
                    role={editModal.role}
                    currentPages={editModal.pages}
                    onClose={() => setEditModal({ open: false, role: null, pages: [] })}
                    onSave={handleSave}
                />
            )}

            {/* User Panel */}
            {userPanel.open && userPanel.role && (
                <UserPanel
                    role={userPanel.role}
                    onClose={() => setUserPanel({ open: false, role: null })}
                />
            )}
        </div>
    )
}
