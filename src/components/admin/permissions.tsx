"use client"

import { useState, useEffect, useCallback } from "react"
import {
    KeyRound, Shield, Users, RefreshCw, Plus, X, Save,
    ToggleLeft, ToggleRight, Loader2, Search, Check,
    ChevronDown, ArrowRight, Lock, Unlock, AlertTriangle, Eye,
} from "lucide-react"
import { permissionsApi, rolesApi } from "@/lib/api"
import { toast } from "sonner"

// ── Types ───────────────────────────────────────────────────────────────────
interface Permission {
    id: number
    name: string
    displayName?: string | null
    description?: string | null
    category: string
}

interface Role {
    id?: number
    roleId?: number
    name: string
    description?: string
}

// ── Category helpers ─────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { gradient: string; color: string; bg: string; border: string }> = {
    users:    { gradient: "from-blue-400 to-indigo-500",    color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-200 dark:border-blue-800" },
    content:  { gradient: "from-emerald-400 to-teal-500",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
    billing:  { gradient: "from-amber-400 to-orange-500",   color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800" },
    admin:    { gradient: "from-red-400 to-rose-500",       color: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-800" },
    roles:    { gradient: "from-purple-400 to-violet-500",  color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800" },
    settings: { gradient: "from-slate-400 to-gray-500",     color: "text-slate-600 dark:text-slate-400",   bg: "bg-slate-50 dark:bg-slate-900/20",   border: "border-slate-200 dark:border-slate-800" },
    kyc:      { gradient: "from-cyan-400 to-sky-500",       color: "text-cyan-600 dark:text-cyan-400",     bg: "bg-cyan-50 dark:bg-cyan-900/20",     border: "border-cyan-200 dark:border-cyan-800" },
}
const DEFAULT_CAT_META = { gradient: "from-gray-400 to-slate-500", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-900/20", border: "border-gray-200 dark:border-gray-800" }

function getCatMeta(category: string) {
    const key = category?.toLowerCase()?.trim()
    // try exact, then try starts-with
    return CATEGORY_META[key]
        ?? Object.entries(CATEGORY_META).find(([k]) => key?.includes(k))?.[1]
        ?? DEFAULT_CAT_META
}

// ── Permission Category Card ─────────────────────────────────────────────────
function PermissionCategoryCard({
    category, permissions, onManage,
}: {
    category: string
    permissions: Permission[]
    onManage: () => void
}) {
    const meta = getCatMeta(category)
    const count = permissions.length

    return (
        <div className={`relative bg-white dark:bg-gray-900 rounded-2xl border ${meta.border} p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}>
            {/* Top */}
            <div className="flex items-start justify-between gap-2">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                    <KeyRound className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${meta.bg} ${meta.color} tracking-wide`}>
                    {count} Izin
                </span>
            </div>

            {/* Name */}
            <div>
                <h3 className="text-base font-bold leading-tight text-gray-900 dark:text-white capitalize">
                    {category || "Umum"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Kelola izin API untuk kategori <strong>{category}</strong>
                </p>
            </div>

            {/* Permission list preview */}
            <div className="flex flex-col gap-1">
                {permissions.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${meta.gradient} flex-shrink-0`} />
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                            {p.displayName || p.name}
                        </span>
                    </div>
                ))}
                {count > 3 && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-600 pl-3">
                        +{count - 3} lainnya...
                    </span>
                )}
            </div>

            {/* Progress bar */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Izin</p>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${meta.gradient} transition-all duration-700`}
                        style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 dark:text-gray-600">Kategori: {category}</span>
                <button
                    onClick={onManage}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${meta.border} ${meta.color} hover:${meta.bg}`}
                >
                    <Eye className="w-3.5 h-3.5" />
                    Kelola
                </button>
            </div>
        </div>
    )
}

// ── Manage Permissions Modal ─────────────────────────────────────────────────
function ManagePermissionsModal({
    category,
    allPermissions,
    roles,
    onClose,
}: {
    category: string
    allPermissions: Permission[]
    roles: Role[]
    onClose: () => void
}) {
    const [selectedRole, setSelectedRole] = useState<Role | null>(roles[0] ?? null)
    const [rolePermissions, setRolePermissions] = useState<Permission[]>([])
    const [loadingRole, setLoadingRole] = useState(false)
    const [saving, setSaving] = useState<number | null>(null) // permissionId being saved
    const [search, setSearch] = useState("")

    const meta = getCatMeta(category)
    const categoryPerms = allPermissions.filter(p =>
        p.category?.toLowerCase() === category?.toLowerCase()
    )
    const filtered = categoryPerms.filter(p => {
        const q = search.toLowerCase()
        return !q || (p.displayName || p.name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)
    })

    // Load role permissions
    const loadRolePermissions = useCallback(async (role: Role) => {
        const rid = role.id ?? role.roleId
        if (!rid) return
        setLoadingRole(true)
        try {
            const res = await permissionsApi.getForRole(rid)
            const data = res?.data ?? res
            const list = Array.isArray(data) ? data : []
            setRolePermissions(list)
        } catch {
            toast.error("Gagal memuat permissions untuk role ini")
            setRolePermissions([])
        } finally {
            setLoadingRole(false)
        }
    }, [])

    useEffect(() => {
        if (selectedRole) loadRolePermissions(selectedRole)
    }, [selectedRole, loadRolePermissions])

    const isActive = (perm: Permission) => rolePermissions.some(rp => rp.id === perm.id)

    async function togglePermission(perm: Permission) {
        const role = selectedRole
        if (!role) return
        const rid = role.id ?? role.roleId
        if (!rid) return
        const currently = isActive(perm)
        setSaving(perm.id)
        try {
            if (currently) {
                await permissionsApi.removeFromRole(rid, perm.id)
                setRolePermissions(prev => prev.filter(p => p.id !== perm.id))
                toast.success(`Izin "${perm.displayName || perm.name}" dihapus dari ${role.name}`)
            } else {
                await permissionsApi.assignToRole(rid, perm.id)
                setRolePermissions(prev => [...prev, perm])
                toast.success(`Izin "${perm.displayName || perm.name}" ditambahkan ke ${role.name}`)
            }
        } catch {
            toast.error("Gagal memperbarui permission")
        } finally {
            setSaving(null)
        }
    }

    // Toggle all in category
    async function toggleAll() {
        if (!selectedRole) return
        const rid = selectedRole.id ?? selectedRole.roleId
        if (!rid) return
        const allActive = filtered.every(p => isActive(p))
        setSaving(-1) // use -1 as "bulk" indicator
        try {
            if (allActive) {
                // remove all
                await Promise.all(filtered.map(p => permissionsApi.removeFromRole(rid, p.id)))
                setRolePermissions(prev => prev.filter(p => !filtered.some(fp => fp.id === p.id)))
                toast.success(`Semua izin kategori ${category} dihapus dari ${selectedRole.name}`)
            } else {
                // add missing
                const missing = filtered.filter(p => !isActive(p))
                await Promise.all(missing.map(p => permissionsApi.assignToRole(rid, p.id)))
                setRolePermissions(prev => [...prev, ...missing])
                toast.success(`Semua izin kategori ${category} ditambahkan ke ${selectedRole.name}`)
            }
        } catch {
            toast.error("Gagal memperbarui permissions")
        } finally {
            setSaving(null)
        }
    }

    const allActive = filtered.length > 0 && filtered.every(p => isActive(p))
    const activeCount = filtered.filter(p => isActive(p)).length
    const pct = filtered.length > 0 ? Math.round((activeCount / filtered.length) * 100) : 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white`}>
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white capitalize">
                                    Kelola Permissions: {category}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {filtered.length} izin dalam kategori ini
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Role selector */}
                    <div className="flex items-center gap-3 mb-4">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">Pilih Role:</label>
                        <div className="relative flex-1 max-w-xs">
                            <select
                                value={selectedRole?.name ?? ""}
                                onChange={e => {
                                    const r = roles.find(r => r.name === e.target.value)
                                    if (r) setSelectedRole(r)
                                }}
                                className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                            >
                                {roles.map(r => (
                                    <option key={r.name} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Stats + progress */}
                    {selectedRole && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    {loadingRole ? "Memuat..." : `${activeCount} dari ${filtered.length} izin aktif`}
                                </span>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${meta.gradient}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari permission..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                    <button
                        onClick={toggleAll}
                        disabled={saving !== null || loadingRole}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {allActive ? "HAPUS SEMUA" : "PILIH SEMUA"}
                    </button>
                </div>

                {/* Permission list */}
                <div className="flex-1 overflow-y-auto">
                    {loadingRole ? (
                        <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Memuat permissions role...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
                            <KeyRound className="w-8 h-8 opacity-40" />
                            <p className="text-sm">{search ? "Tidak ada hasil pencarian" : "Belum ada permission di kategori ini"}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filtered.map(perm => {
                                const active = isActive(perm)
                                const isSaving = saving === perm.id || saving === -1
                                return (
                                    <div
                                        key={perm.id}
                                        onClick={() => !isSaving && togglePermission(perm)}
                                        className={`flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${isSaving ? "opacity-60 pointer-events-none" : ""}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                                                {perm.displayName || perm.name}
                                            </p>
                                            <p className="text-[11px] text-gray-400 truncate font-mono">
                                                {perm.name}
                                                {perm.description && <span className="font-sans ml-2 not-italic">· {perm.description}</span>}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 ml-4">
                                            {isSaving ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                                            ) : active ? (
                                                <ToggleRight className="w-7 h-7 text-blue-500" />
                                            ) : (
                                                <ToggleLeft className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                        Perubahan tersimpan otomatis saat toggle
                    </p>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors shadow-sm"
                    >
                        <Check className="w-4 h-4" />
                        Selesai
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Create Permission Modal ───────────────────────────────────────────────────
function CreatePermissionModal({
    categories,
    onClose,
    onCreated,
}: {
    categories: string[]
    onClose: () => void
    onCreated: (perm: Permission) => void
}) {
    const [name, setName] = useState("")
    const [displayName, setDisplayName] = useState("")
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState(categories[0] ?? "")
    const [customCategory, setCustomCategory] = useState("")
    const [saving, setSaving] = useState(false)

    async function handleSubmit() {
        if (!name.trim()) { toast.error("Nama permission wajib diisi"); return }
        setSaving(true)
        try {
            const res = await permissionsApi.create({
                name: name.trim(),
                displayName: displayName.trim() || null,
                description: description.trim() || null,
                category: (customCategory.trim() || category || null),
            })
            if (res?.success) {
                toast.success("Permission berhasil dibuat!")
                onCreated(res.data)
            } else {
                toast.error(res?.message || "Gagal membuat permission")
            }
        } catch {
            toast.error("Terjadi kesalahan saat membuat permission")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Tambah Permission Baru</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Hanya Admin yang dapat membuat permission baru.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Nama Permission *</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="contoh: users.read, content.publish"
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 font-mono"
                        />
                        <p className="text-xs text-gray-400 mt-1">Gunakan format dot-notation, contoh: resource.action</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Nama Tampilan</label>
                        <input
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Nama yang ditampilkan ke user"
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Kategori</label>
                        <div className="relative">
                            <select
                                value={category}
                                onChange={e => { setCategory(e.target.value); setCustomCategory("") }}
                                className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="__custom">+ Kategori Baru...</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {category === "__custom" && (
                            <input
                                value={customCategory}
                                onChange={e => setCustomCategory(e.target.value)}
                                placeholder="Nama kategori baru"
                                className="mt-2 w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Deskripsi</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Deskripsi singkat fungsi permission ini..."
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !name.trim()}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Buat Permission
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Permissions Component ───────────────────────────────────────────────
export default function Permissions() {
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [manageModal, setManageModal] = useState<{ open: boolean; category: string } | null>(null)
    const [createModal, setCreateModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [permsRes, rolesRes] = await Promise.all([
                permissionsApi.getAll(),
                rolesApi.getAll(),
            ])

            // Permissions
            const permsData = permsRes?.data ?? permsRes
            const permsList: Permission[] = Array.isArray(permsData) ? permsData : []
            setPermissions(permsList)

            // Derive categories from permissions
            const cats = Array.from(new Set(permsList.map(p => p.category).filter(Boolean)))
            setCategories(cats)

            // Roles
            const rolesData = rolesRes?.data ?? rolesRes
            const rolesList: Role[] = Array.isArray(rolesData) ? rolesData : []
            setRoles(rolesList)

        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan saat memuat data")
            toast.error("Gagal memuat data permissions")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // Group permissions by category
    const grouped = categories.reduce<Record<string, Permission[]>>((acc, cat) => {
        acc[cat] = permissions.filter(p => p.category?.toLowerCase() === cat?.toLowerCase())
        return acc
    }, {})

    // Also group ungrouped
    const uncategorized = permissions.filter(p => !p.category || !categories.includes(p.category))
    if (uncategorized.length > 0) {
        grouped["Lainnya"] = uncategorized
    }

    // Filter by search
    const filteredCategories = Object.entries(grouped).filter(([cat, perms]) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return cat.toLowerCase().includes(q) || perms.some(p =>
            (p.displayName || p.name || "").toLowerCase().includes(q)
        )
    })

    const totalPerms = permissions.length
    const totalCats = Object.keys(grouped).length

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1600px] mx-auto space-y-5">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Permissions
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-semibold text-gray-800 dark:text-gray-200 shadow-sm text-sm">
                            {totalPerms} Izin
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-semibold text-blue-600 dark:text-blue-400 shadow-sm text-sm">
                            {totalCats} Kategori
                        </span>
                        <button
                            onClick={() => setCreateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah
                        </button>
                        <button
                            onClick={fetchData}
                            disabled={isLoading}
                            className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                {!isLoading && !error && totalPerms > 0 && (
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari kategori atau permission..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                )}

                {/* Info banner — link to Roles */}
                {!isLoading && !error && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">
                            Permissions di sini mengatur izin akses API per role. Untuk mengatur akses halaman, pergi ke
                        </p>
                        <a
                            href="/admin/roles"
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                        >
                            Halaman Roles <ArrowRight className="w-3 h-3" />
                        </a>
                    </div>
                )}

                {/* States */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Memuat data permissions...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-full">
                            <AlertTriangle className="w-10 h-10 text-red-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Gagal Memuat Permissions</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                        </div>
                        <button onClick={fetchData} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors">
                            Coba Lagi
                        </button>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="p-5 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <KeyRound className="w-10 h-10 text-gray-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                {searchQuery ? "Tidak Ada Hasil" : "Belum Ada Permissions"}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[280px]">
                                {searchQuery
                                    ? `Tidak ada permission yang cocok dengan "${searchQuery}"`
                                    : "API tidak mengembalikan data permissions. Pastikan Anda sudah login sebagai Admin."}
                            </p>
                        </div>
                        {!searchQuery && (
                            <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors">
                                <Plus className="w-4 h-4" />
                                Tambah Permission Pertama
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredCategories.map(([cat, perms]) => (
                            <PermissionCategoryCard
                                key={cat}
                                category={cat}
                                permissions={perms}
                                onManage={() => setManageModal({ open: true, category: cat })}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Manage Modal */}
            {manageModal?.open && (
                <ManagePermissionsModal
                    category={manageModal.category}
                    allPermissions={permissions}
                    roles={roles}
                    onClose={() => setManageModal(null)}
                />
            )}

            {/* Create Modal */}
            {createModal && (
                <CreatePermissionModal
                    categories={categories}
                    onClose={() => setCreateModal(false)}
                    onCreated={(perm) => {
                        setPermissions(prev => [...prev, perm])
                        if (!categories.includes(perm.category)) {
                            setCategories(prev => [...prev, perm.category])
                        }
                        setCreateModal(false)
                    }}
                />
            )}
        </div>
    )
}
