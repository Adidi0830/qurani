"use client"

import { useState, useMemo, useEffect, Suspense, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import {
    Search, ChevronLeft, ChevronRight, Star, Eye, Users,
    ChevronsUpDown, BadgeCheck, ShieldOff, ShieldCheck, XCircle, AlertTriangle,
    Filter, X, Plus, RotateCcw, ChevronDown, Calendar, Tag, Check, HelpCircle,
    MoreVertical, Zap, ZapOff,
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

function formatDate(dateStr: string) {
    if (!dateStr) return "—"
    try {
        return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    } catch { return "—" }
}

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const stored = localStorage.getItem("myqurani_auth")
        if (stored) { const auth = JSON.parse(stored); return auth.accessToken || null }
    } catch { return null }
    return null
}

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
    verified:  { label: "Aktif",      bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", icon: BadgeCheck },
    suspended: { label: "Tidak Aktif",bg: "bg-red-100 dark:bg-red-900/30",         text: "text-red-700 dark:text-red-400",         dot: "bg-red-500",     icon: ShieldOff  },
    rejected:  { label: "Ditolak",    bg: "bg-rose-100 dark:bg-rose-900/30",       text: "text-rose-700 dark:text-rose-400",       dot: "bg-rose-500",    icon: ShieldOff  },
} as const

// ── Label System ──────────────────────────────────────────────────────────────
type LabelCategory = "publik" | "tier" | "flag" | "custom"

interface AdminLabel {
    id: string
    name: string
    category: LabelCategory
    bg: string
    text: string
    dot: string
    description?: string
    isPublic?: boolean
    isCustom?: boolean
}

const ADMIN_LABELS: AdminLabel[] = [
    // ── Publik (Marketplace visible) ─────────────────────────────────────
    {
        id: "ambassador", name: "Ambassador", category: "publik", isPublic: true,
        description: "Guru representasi platform dengan rekam jejak luar biasa dan kontribusi komunitas yang tinggi.",
        bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500",
    },
    {
        id: "super_teacher", name: "Super Teacher", category: "publik", isPublic: true,
        description: "Guru dengan performa pengajaran tertinggi — rating konsisten ≥4.8 dan ratusan murid aktif.",
        bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-400", dot: "bg-teal-500",
    },
    {
        id: "recommended", name: "Recommended", category: "publik", isPublic: true,
        description: "Guru yang direkomendasikan platform berdasarkan kualitas dan relevansi metode pengajarannya.",
        bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-400",
    },
    // ── Tier Performa (Internal) ─────────────────────────────────────────
    { id: "tier_a", name: "Tier A", category: "tier", bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-300", dot: "bg-emerald-500" },
    { id: "tier_b", name: "Tier B", category: "tier", bg: "bg-sky-100 dark:bg-sky-900/30",         text: "text-sky-700 dark:text-sky-400",         dot: "bg-sky-500"     },
    { id: "tier_c", name: "Tier C", category: "tier", bg: "bg-gray-100 dark:bg-gray-800",          text: "text-gray-600 dark:text-gray-400",       dot: "bg-gray-400"    },
    // ── Flag Review (Internal) ───────────────────────────────────────────
    { id: "perlu_review",     name: "Perlu Review",     category: "flag", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
    { id: "laporan_masuk",    name: "Laporan Masuk",    category: "flag", bg: "bg-red-100 dark:bg-red-900/30",       text: "text-red-700 dark:text-red-400",       dot: "bg-red-500"    },
    { id: "verifikasi_ulang", name: "Verifikasi Ulang", category: "flag", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-500", dot: "bg-yellow-400" },
]

const LABEL_CATEGORY_NAMES: Record<LabelCategory, string> = {
    publik: "Label Publik",
    tier:   "Tier Performa",
    flag:   "Flag Review",
    custom: "Label Kustom",
}

// Palette warna untuk label kustom
const CUSTOM_COLORS = [
    { bg: "bg-violet-100 dark:bg-violet-900/30",  text: "text-violet-700 dark:text-violet-400",  dot: "bg-violet-500" },
    { bg: "bg-pink-100 dark:bg-pink-900/30",      text: "text-pink-700 dark:text-pink-400",      dot: "bg-pink-500"   },
    { bg: "bg-cyan-100 dark:bg-cyan-900/30",      text: "text-cyan-700 dark:text-cyan-400",      dot: "bg-cyan-500"   },
    { bg: "bg-lime-100 dark:bg-lime-900/30",      text: "text-lime-700 dark:text-lime-400",      dot: "bg-lime-500"   },
    { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",text: "text-fuchsia-700 dark:text-fuchsia-400",dot: "bg-fuchsia-500"},
    { bg: "bg-rose-100 dark:bg-rose-900/30",      text: "text-rose-700 dark:text-rose-400",      dot: "bg-rose-500"   },
    { bg: "bg-amber-100 dark:bg-amber-900/30",    text: "text-amber-700 dark:text-amber-400",    dot: "bg-amber-500"  },
    { bg: "bg-blue-100 dark:bg-blue-900/30",      text: "text-blue-700 dark:text-blue-400",      dot: "bg-blue-400"   },
]

const PAGE_SIZE = 10
const SKILL_OPTIONS = ["Tahsin", "Tajwid", "Tahfidz", "Tartil", "Makhraj", "Fiqih", "Tafsir"]
const METODE_PENGAJARAN_OPTIONS = ["Ummi", "Qiraati", "Tilawati", "Al-Baghdadi", "Metode Iqra", "Yanbu'a"]

// ── Tooltip Component ─────────────────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
    return (
        <span className="relative group/tooltip inline-flex items-center">
            {children}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover/tooltip:block w-52 bg-gray-900 dark:bg-gray-800 text-white text-[10px] leading-snug rounded-lg px-2.5 py-2 shadow-xl pointer-events-none">
                {text}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
            </span>
        </span>
    )
}

// ── LabelDropdown (per-row in table) ─────────────────────────────────────────
function LabelDropdown({
    guruId, activeLabels, onToggle, allLabels, onCreateLabel,
}: {
    guruId: number
    activeLabels: string[]
    onToggle: (guruId: number, labelId: string) => void
    allLabels: AdminLabel[]
    onCreateLabel: (name: string, colorIdx: number) => void
}) {
    const [open, setOpen] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [colorIdx, setColorIdx] = useState(0)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setShowCreate(false) }
        }
        if (open) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open])

    const categories: LabelCategory[] = ["publik", "tier", "flag", "custom"]
    const visibleCats = categories.filter(c => allLabels.some(l => l.category === c))

    function handleCreate() {
        if (!newName.trim()) return
        onCreateLabel(newName.trim(), colorIdx)
        setNewName(""); setColorIdx(0); setShowCreate(false)
    }

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={() => setOpen(v => !v)}
                className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex-shrink-0"
                title="Tambah Label"
            >
                <Plus className="w-3 h-3" />
                <span className="text-[9px] font-bold">Label</span>
            </button>
            {open && (
                <div className="absolute z-50 left-0 top-7 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Label Admin</p>
                        <button onClick={() => setShowCreate(v => !v)} className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5">
                            <Plus className="w-2.5 h-2.5" /> Buat
                        </button>
                    </div>

                    {/* Create form */}
                    {showCreate && (
                        <div className="px-3 py-2 border-b border-dashed border-gray-200 dark:border-gray-700 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
                            <input
                                autoFocus
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleCreate()}
                                placeholder="Nama label..."
                                className="w-full px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <div className="flex items-center gap-1 flex-wrap">
                                {CUSTOM_COLORS.map((c, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setColorIdx(i)}
                                        className={`w-5 h-5 rounded-full ${c.dot} transition-transform ${colorIdx === i ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : "hover:scale-110"}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={!newName.trim()}
                                className="w-full py-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-md transition-colors"
                            >
                                Simpan Label
                            </button>
                        </div>
                    )}

                    {/* Label list */}
                    <div className="max-h-60 overflow-y-auto py-1">
                        {visibleCats.map(cat => (
                            <div key={cat}>
                                <div className="px-3 pt-2 pb-0.5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 flex items-center gap-1">
                                        {cat === "publik" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
                                        {LABEL_CATEGORY_NAMES[cat]}
                                        {cat === "publik" && <span className="text-[8px] text-emerald-500 normal-case font-normal">(tampil marketplace)</span>}
                                    </p>
                                </div>
                                {allLabels.filter(l => l.category === cat).map(label => {
                                    const isActive = activeLabels.includes(label.id)
                                    return (
                                        <button
                                            key={label.id}
                                            onClick={() => { onToggle(guruId, label.id); setOpen(false) }}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${isActive ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${label.dot}`} />
                                            <span className={`font-semibold flex-1 text-left ${label.text}`}>{label.name}</span>
                                            {isActive && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                                        </button>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── LabelBadges (table cell display) ─────────────────────────────────────────
function LabelBadges({
    labelIds, guruId, onRemove, onAdd, allLabels, onCreateLabel,
}: {
    labelIds: string[]
    guruId: number
    onRemove: (guruId: number, labelId: string) => void
    onAdd: (guruId: number, labelId: string) => void
    allLabels: AdminLabel[]
    onCreateLabel: (name: string, colorIdx: number) => void
}) {
    const getLabelById = (id: string) => allLabels.find(l => l.id === id)
    return (
        <div className="flex items-center gap-1 flex-wrap min-w-0">
            {labelIds.map(id => {
                const label = getLabelById(id)
                if (!label) return null
                const badge = (
                    <span
                        key={id}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${label.bg} ${label.text} group/badge`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${label.dot}`} />
                        {label.name}
                        {label.isPublic && <HelpCircle className="w-2.5 h-2.5 opacity-50" />}
                        <button
                            onClick={() => onRemove(guruId, id)}
                            className="ml-0.5 opacity-0 group-hover/badge:opacity-100 transition-opacity hover:text-red-500"
                        >
                            <X className="w-2.5 h-2.5" />
                        </button>
                    </span>
                )
                if (label.isPublic && label.description) {
                    return <Tooltip key={id} text={label.description}>{badge}</Tooltip>
                }
                return badge
            })}
            <LabelDropdown guruId={guruId} activeLabels={labelIds} onToggle={onAdd} allLabels={allLabels} onCreateLabel={onCreateLabel} />
        </div>
    )
}

// ── Label Filter Dropdown (Action Bar) ───────────────────────────────────────
function LabelFilterDropdown({
    value, onChange, allLabels,
}: {
    value: string
    onChange: (v: string) => void
    allLabels: AdminLabel[]
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open])

    const isActive = value !== "all"
    const activeLabel = isActive ? allLabels.find(l => l.id === value) : null
    const categories: LabelCategory[] = ["publik", "tier", "flag", "custom"]
    const visibleCats = categories.filter(c => allLabels.some(l => l.category === c))

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${isActive
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400"}`}
            >
                {activeLabel
                    ? <><span className={`w-2 h-2 rounded-full ${activeLabel.dot}`} />{activeLabel.name}</>
                    : <><Tag className="w-3.5 h-3.5 text-gray-400" />Semua Label</>
                }
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute top-10 left-0 z-50 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Filter berdasarkan Label</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                        <button
                            onClick={() => { onChange("all"); setOpen(false) }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${value === "all" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400"}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                            Semua Label
                            {value === "all" && <Check className="w-3 h-3 ml-auto text-emerald-500" />}
                        </button>
                        {visibleCats.map(cat => (
                            <div key={cat}>
                                <div className="px-3 pt-2 pb-0.5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 flex items-center gap-1">
                                        {cat === "publik" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
                                        {LABEL_CATEGORY_NAMES[cat]}
                                    </p>
                                </div>
                                {allLabels.filter(l => l.category === cat).map(label => (
                                    <button
                                        key={label.id}
                                        onClick={() => { onChange(label.id); setOpen(false) }}
                                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${value === label.id ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""}`}
                                    >
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${label.dot}`} />
                                        <span className={`font-semibold flex-1 text-left ${label.text}`}>{label.name}</span>
                                        {value === label.id && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Date Range Filter (Standalone) ───────────────────────────────────────────
function DateRangeFilter({
    startDate, endDate, onChange, onClear,
}: {
    startDate: string
    endDate: string
    onChange: (start: string, end: string) => void
    onClear: () => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const isActive = startDate !== "" || endDate !== ""

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open])

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${isActive
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400"}`}
            >
                <Calendar className={`w-3.5 h-3.5 ${isActive ? "text-emerald-500" : "text-gray-400"}`} />
                {isActive
                    ? `${startDate ? formatDate(startDate) : "…"} – ${endDate ? formatDate(endDate) : "…"}`
                    : "Rentang Tanggal"
                }
                {isActive
                    ? <button onClick={e => { e.stopPropagation(); onClear() }} className="ml-1 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                    : <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
                }
            </button>

            {open && (
                <div className="absolute top-10 left-0 z-50 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Rentang Tgl Bergabung</p>
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Dari</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => onChange(e.target.value, endDate)}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sampai</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => onChange(startDate, e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => { onClear(); setOpen(false) }} className="flex-1 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Reset</button>
                        <button onClick={() => setOpen(false)} className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">Terapkan</button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Filter Popover (Premium) ──────────────────────────────────────────────────
function FilterPopover({
    open, onClose,
    filterStatus, setFilterStatus,
    filterMetode, setFilterMetode,
    filterSkill, setFilterSkill,
    filterMetodePengajaran, setFilterMetodePengajaran,
    availableSkills
}: any) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        if (open) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open, onClose])

    if (!open) return null

    function PillSelector({ label, options, value, onChange }: {
        label: string
        options: { value: string; label: string }[]
        value: string
        onChange: (v: string) => void
    }) {
        return (
            <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
                <div className="flex flex-wrap gap-1.5">
                    {[{ value: "all", label: "Semua" }, ...options].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${value === opt.value
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:text-emerald-600"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    function NativeSelect({ label, options, value, onChange }: {
        label: string
        options: { value: string; label: string }[]
        value: string
        onChange: (v: string) => void
    }) {
        return (
            <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
                <div className="relative">
                    <select
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className={`w-full appearance-none pl-3 pr-7 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${value !== "all"
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 dark:text-emerald-400"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}
                    >
                        <option value="all">Semua</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-gray-400" />
                </div>
            </div>
        )
    }

    const hasActive = filterStatus !== "all" || filterMetode !== "all" || filterSkill !== "all" || filterMetodePengajaran !== "all"

    return (
        <div ref={ref} className="absolute top-12 left-0 z-50 w-80 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Filter Lanjutan</span>
                    {hasActive && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">Aktif</span>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Filters */}
            <div className="p-4 space-y-4">
                <PillSelector
                    label="Status"
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={[{ value: "verified", label: "Aktif" }, { value: "suspended", label: "Tidak Aktif" }, { value: "rejected", label: "Ditolak" }]}
                />
                <PillSelector
                    label="Metode Mengajar"
                    value={filterMetode}
                    onChange={setFilterMetode}
                    options={[{ value: "Online", label: "Online" }, { value: "Offline", label: "Offline" }, { value: "Online & Offline", label: "Online & Offline" }]}
                />
                <NativeSelect
                    label="Skill / Keahlian"
                    value={filterSkill}
                    onChange={setFilterSkill}
                    options={availableSkills.map((s: string) => ({ value: s, label: s }))}
                />
                <NativeSelect
                    label="Metode Pengajaran"
                    value={filterMetodePengajaran}
                    onChange={setFilterMetodePengajaran}
                    options={METODE_PENGAJARAN_OPTIONS.map(s => ({ value: s, label: s }))}
                />
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 flex justify-between items-center">
                <button
                    onClick={() => { setFilterStatus("all"); setFilterMetode("all"); setFilterSkill("all"); setFilterMetodePengajaran("all") }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                    <RotateCcw className="w-3 h-3" /> Reset filter
                </button>
                <button onClick={onClose} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors">
                    Terapkan
                </button>
            </div>
        </div>
    )
}

// ── ActionMenu (three-dot dropdown per row) ───────────────────────────────────
function ActionMenu({
    guru, isFeatured, isAdminVerified,
    onSuspend, onUnsuspend, onVerify, onFeature,
}: {
    guru: any
    isFeatured: boolean
    isAdminVerified: boolean
    onSuspend: () => void
    onUnsuspend: () => void
    onVerify: (v: boolean) => void
    onFeature: (f: boolean) => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open])

    type MenuItem = {
        icon: React.ReactNode
        label: string
        onClick: () => void
        className: string
        divider?: boolean
    }

    const items: MenuItem[] = [
        {
            icon: <Eye className="w-3.5 h-3.5" />,
            label: "Lihat Profil",
            onClick: () => { window.location.href = `/en/teachers/manage/${guru.id}` },
            className: "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
        },
        {
            icon: isAdminVerified ? <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" /> : <BadgeCheck className="w-3.5 h-3.5" />,
            label: isAdminVerified ? "Batalkan Verifikasi" : "Verifikasi Guru",
            onClick: () => { onVerify(!isAdminVerified); setOpen(false) },
            className: isAdminVerified
                ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
        },
        {
            icon: isFeatured ? <ZapOff className="w-3.5 h-3.5 text-amber-500" /> : <Zap className="w-3.5 h-3.5" />,
            label: isFeatured ? "Hapus dari Unggulan" : "Jadikan Unggulan",
            onClick: () => { onFeature(!isFeatured); setOpen(false) },
            className: isFeatured
                ? "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
            divider: true,
        },
        ...(guru.status === "verified" ? [{
            icon: <ShieldOff className="w-3.5 h-3.5" />,
            label: "Nonaktifkan",
            onClick: () => { onSuspend(); setOpen(false) },
            className: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
        }] : []),
        ...(guru.status === "suspended" ? [{
            icon: <ShieldCheck className="w-3.5 h-3.5" />,
            label: "Aktifkan Kembali",
            onClick: () => { onUnsuspend(); setOpen(false) },
            className: "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",
        }] : []),
    ]

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                title="Aksi"
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            {open && (
                <div className="absolute right-0 top-9 z-50 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1">
                    {items.map((item, idx) => (
                        <div key={idx}>
                            {item.divider && <div className="my-1 border-t border-gray-100 dark:border-gray-800" />}
                            <button
                                onClick={item.onClick}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors ${item.className}`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Main Content ──────────────────────────────────────────────────────────────
function GuruContent() {
    const [apiGurus, setApiGurus] = useState<any[]>([])
    const [guruStatuses, setGuruStatuses] = useState<Record<number, "verified" | "suspended" | "rejected">>({})
    const [deactivateModal, setDeactivateModal] = useState<{ open: boolean; guruId: number | null; guruName: string }>({ open: false, guruId: null, guruName: "" })
    const [deactivateReason, setDeactivateReason] = useState("")
    const [deactivateDuration, setDeactivateDuration] = useState("")
    const [isSuspending, setIsSuspending] = useState(false)
    const [reactivateModal, setReactivateModal] = useState<{ open: boolean; guruId: number | null; guruName: string; guruUsername: string }>({ open: false, guruId: null, guruName: "", guruUsername: "" })

    // ── Featured & Verified state (local optimistic) ──────────────────────
    const [guruFeatured, setGuruFeatured] = useState<Record<number, boolean>>({})
    const [guruVerified, setGuruVerified] = useState<Record<number, boolean>>({})

    // ── Admin Labels state ────────────────────────────────────────────────
    const [guruLabels, setGuruLabels] = useState<Record<number, string[]>>({})
    const [customLabels, setCustomLabels] = useState<AdminLabel[]>([])

    useEffect(() => {
        try {
            const stored = localStorage.getItem("guruAdminLabels")
            if (stored) setGuruLabels(JSON.parse(stored))
        } catch {}
        try {
            const stored = localStorage.getItem("customAdminLabels")
            if (stored) setCustomLabels(JSON.parse(stored))
        } catch {}
    }, [])

    const allLabels = useMemo(() => [...ADMIN_LABELS, ...customLabels], [customLabels])

    function createCustomLabel(name: string, colorIdx: number) {
        const color = CUSTOM_COLORS[colorIdx] || CUSTOM_COLORS[0]
        const id = `custom_${Date.now()}`
        const newLabel: AdminLabel = { id, name, category: "custom", isCustom: true, ...color }
        const updated = [...customLabels, newLabel]
        setCustomLabels(updated)
        try { localStorage.setItem("customAdminLabels", JSON.stringify(updated)) } catch {}
    }

    function toggleLabel(guruId: number, labelId: string) {
        setGuruLabels(prev => {
            const current = prev[guruId] || []
            const next = current.includes(labelId) ? current.filter(id => id !== labelId) : [...current, labelId]
            const updated = { ...prev, [guruId]: next }
            try { localStorage.setItem("guruAdminLabels", JSON.stringify(updated)) } catch {}
            return updated
        })
    }

    function removeLabel(guruId: number, labelId: string) {
        setGuruLabels(prev => {
            const next = (prev[guruId] || []).filter(id => id !== labelId)
            const updated = { ...prev, [guruId]: next }
            try { localStorage.setItem("guruAdminLabels", JSON.stringify(updated)) } catch {}
            return updated
        })
    }

    // ── Data Fetching ─────────────────────────────────────────────────────
    useEffect(() => {
        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

        const mapData = (d: any) => {
            const rawStatus = String(d.status || "verified").toLowerCase()
            const validStatus = (rawStatus === "active" || rawStatus === "verified") ? "verified" : rawStatus === "suspended" ? "suspended" : rawStatus === "rejected" ? "rejected" : "verified"
            const name = d.userName || d.name || `Guru #${d.id}`
            const mockDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 3600 * 1000).toISOString()
            const createdAt = d.createdAt || mockDate
            return {
                id: d.id, name, email: d.email || "",
                username: d.username || d.userUsername || name.toLowerCase().replace(/\s+/g, ""),
                specialization: d.expertise?.join?.(" & ") || d.headline || "Pengajar Al-Qur'an",
                expertise: Array.isArray(d.expertise) ? d.expertise : (d.expertise ? [d.expertise] : []),
                avatar: d.userImage || d.avatar || "",
                rating: d.averageRating || d.rating || 0,
                status: validStatus,
                teachingMethod: (d.isOnline && d.isOffline) ? "Online & Offline" : d.isOnline ? "Online" : d.isOffline ? "Offline" : "Online & Offline",
                cityName: d.cityName || "", stateName: d.stateName || "", countryName: d.countryName || "Indonesia",
                createdAt,
                stats: { totalStudents: d.totalStudents || 0, totalSessions: d.totalCourses || 0, totalRevenue: d.totalRevenue || 0, activeBookings: 0 }
            }
        }

        fetch(`${API_BASE_URL}/api/v1/Trainers`, { headers })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const trainers = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
                const realTrainers = trainers.filter((d: any) => { const uname = d.username || d.userName || ""; return uname && uname.trim() !== "" })
                setApiGurus(realTrainers.map((d: any) => mapData(d)))

                try {
                    const pengajuanStatuses = JSON.parse(sessionStorage.getItem("pengajuanGuruStatuses") || "{}")
                    const acceptedIds = Object.keys(pengajuanStatuses).filter(id => pengajuanStatuses[id] === "diterima").map(String)

                    import("@/data/sim-dummy-users").then(({ SIM_TRAINERS, SIM_USERS }) => {
                        const billingGurus = Object.values(SIM_TRAINERS).map((d: any) => {
                            const userProfile = d.userId ? (SIM_USERS as any)[d.userId] : null
                            return {
                                id: d.id, name: d.name || `Guru #${d.id}`, email: d.email || "",
                                username: d.username || (d.name || "guru").toLowerCase().replace(/\s+/g, ""),
                                specialization: d.specialty || "Pengajar Al-Qur'an",
                                expertise: d.specialty ? d.specialty.split(/[&,]/).map((s: string) => s.trim()).filter(Boolean) : [],
                                avatar: d.avatar || "", rating: 4.8 + Math.random() * 0.2, status: "verified", teachingMethod: "Online & Offline",
                                cityName: userProfile?.cityName || "", stateName: userProfile?.stateName || "", countryName: userProfile?.countryName || "Indonesia",
                                createdAt: new Date(Date.now() - d.id * 10 * 24 * 3600 * 1000).toISOString(),
                                stats: { totalStudents: 20 + Math.floor(Math.random() * 50), totalSessions: 0, totalRevenue: 1000000 + Math.floor(Math.random() * 5000000), activeBookings: 0 }
                            }
                        })
                        setApiGurus(prev => { const currentIds = new Set(prev.map(g => g.id)); return [...prev, ...billingGurus.filter(g => !currentIds.has(g.id))] })
                    })

                    if (acceptedIds.length > 0) {
                        import("@/data/pending-trainers-list.json").then(dummies => {
                            const newGurus = dummies.default.filter(d => acceptedIds.includes(String(d.id))).map((d: any) => ({
                                id: d.id, name: d.userName || d.name || `Guru #${d.id}`, email: d.email || "",
                                username: d.username || d.userUsername || (d.userName || d.name || "guru").toLowerCase().replace(/\s+/g, ""),
                                specialization: d.headline || (Array.isArray(d.expertise) ? d.expertise.join(" & ") : "Pengajar Al-Qur'an"),
                                expertise: Array.isArray(d.expertise) ? d.expertise : [], avatar: d.userImage || d.avatar || "",
                                rating: 0, status: "verified", teachingMethod: d.isOnline && d.isOffline ? "Online & Offline" : d.isOnline ? "Online" : "Offline",
                                cityName: "", stateName: "", countryName: "Indonesia",
                                createdAt: d.createdAt || new Date().toISOString(),
                                stats: { totalStudents: 0, totalSessions: 0, totalRevenue: 0, activeBookings: 0 }
                            }))
                            setApiGurus(prev => { const currentIds = new Set(prev.map(g => g.id)); return [...prev, ...newGurus.filter(g => !currentIds.has(g.id))] })
                        })
                    }
                } catch (e) {}
            }).catch(console.error)
    }, [])

    const [suspendReasons, setSuspendReasons] = useState<Record<number, string>>({})
    useEffect(() => {
        try { const r = sessionStorage.getItem("guruSuspendReasons"); if (r) setSuspendReasons(JSON.parse(r)) } catch {}
    }, [])

    const effectiveApiGurus = useMemo(() => apiGurus.map(g => ({ ...g, status: guruStatuses[g.id] ?? g.status })), [apiGurus, guruStatuses])

    useEffect(() => {
        try { const s = sessionStorage.getItem("guruStatuses"); if (s) setGuruStatuses(JSON.parse(s)) } catch {}
    }, [])

    function openDeactivateModal(guruId: number, guruName: string) {
        setDeactivateReason("")
        setDeactivateModal({ open: true, guruId, guruName })
    }

    async function confirmDeactivate() {
        if (!deactivateModal.guruId) return
        const { guruId, guruName } = deactivateModal
        setIsSuspending(true)
        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        try { const res = await fetch(`${API_BASE_URL}/api/v1/Trainers/${guruId}/suspend`, { method: "POST", headers, body: JSON.stringify({ reason: deactivateReason, until: deactivateDuration || null }) }); if (!res.ok) throw new Error() } catch {}
        finally {
            setGuruStatuses(prev => { const u: Record<number, "verified" | "suspended" | "rejected"> = { ...prev, [guruId]: "suspended" }; try { sessionStorage.setItem("guruStatuses", JSON.stringify(u)) } catch {}; return u })
            setSuspendReasons(prev => { const payload = JSON.stringify({ reason: deactivateReason, duration: deactivateDuration || "Tidak ditentukan", date: new Date().toISOString() }); const u = { ...prev, [guruId]: payload }; try { sessionStorage.setItem("guruSuspendReasons", JSON.stringify(u)) } catch {}; return u })
            showToast({ type: "info", title: `${guruName} dinonaktifkan`, message: deactivateReason ? `Alasan: ${deactivateReason}` : "Guru tidak dapat menerima pesanan baru.", endpoint: `POST /api/v1/Trainers/${guruId}/suspend` })
            setIsSuspending(false)
            setDeactivateModal({ open: false, guruId: null, guruName: "" })
            setDeactivateReason(""); setDeactivateDuration("")
        }
    }

    async function handleReactivate(guruId: number, guruName: string) {
        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        try { const res = await fetch(`${API_BASE_URL}/api/v1/Trainers/${guruId}/unsuspend`, { method: "POST", headers }); if (!res.ok) throw new Error() } catch {}
        finally {
            setGuruStatuses(prev => { const u: Record<number, "verified" | "suspended" | "rejected"> = { ...prev, [guruId]: "verified" }; try { sessionStorage.setItem("guruStatuses", JSON.stringify(u)) } catch {}; return u })
            showToast({ type: "success", title: `${guruName} diaktifkan kembali`, message: "Status guru dikembalikan menjadi Aktif.", endpoint: `POST /api/v1/Trainers/${guruId}/unsuspend` })
        }
    }

    async function handleVerifyTrainer(guruId: number, guruName: string, isVerified: boolean) {
        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        try { await fetch(`${API_BASE_URL}/api/v1/Trainers/${guruId}/verify`, { method: "POST", headers, body: JSON.stringify({ isVerified: isVerified ? 1 : 0, verificationLevel: isVerified ? 1 : null }) }) } catch {}
        finally {
            setGuruVerified(prev => ({ ...prev, [guruId]: isVerified }))
            showToast({ type: isVerified ? "success" : "info", title: isVerified ? `${guruName} diverifikasi` : `Verifikasi ${guruName} dibatalkan`, message: isVerified ? "Guru telah mendapatkan status terverifikasi admin." : "Status verifikasi admin dicabut.", endpoint: `POST /api/v1/Trainers/${guruId}/verify` })
        }
    }

    async function handleFeatureTrainer(guruId: number, guruName: string, isFeatured: boolean) {
        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        try { await fetch(`${API_BASE_URL}/api/v1/Trainers/${guruId}/feature`, { method: "POST", headers, body: JSON.stringify({ isFeatured: isFeatured ? 1 : 0 }) }) } catch {}
        finally {
            setGuruFeatured(prev => ({ ...prev, [guruId]: isFeatured }))
            showToast({ type: isFeatured ? "success" : "info", title: isFeatured ? `${guruName} dijadikan Unggulan` : `${guruName} dihapus dari Unggulan`, message: isFeatured ? "Guru akan tampil di halaman utama marketplace." : "Guru tidak lagi tampil sebagai guru unggulan.", endpoint: `POST /api/v1/Trainers/${guruId}/feature` })
        }
    }

    // ── Filter State ──────────────────────────────────────────────────────
    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [filterLabel, setFilterLabel] = useState("all")
    const [showFilterModal, setShowFilterModal] = useState(false)
    const [filterStatus, setFilterStatus] = useState<"all" | "verified" | "suspended" | "rejected">("all")
    const [filterMetode, setFilterMetode] = useState("all")
    const [filterSkill, setFilterSkill] = useState("all")
    const [filterMetodePengajaran, setFilterMetodePengajaran] = useState("all")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [sortField, setSortField] = useState<"name" | "rating" | "totalStudents" | "totalRevenue" | "createdAt">("name")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)

    const handleSearch = () => { setSearch(searchInput); setPage(1) }
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleSearch() }

    function resetFilters() {
        setSearch(""); setSearchInput(""); setFilterLabel("all"); setFilterStatus("all")
        setFilterMetode("all"); setFilterSkill("all"); setFilterMetodePengajaran("all")
        setStartDate(""); setEndDate(""); setPage(1)
    }

    const availableSkills = useMemo(() => {
        const skillSet = new Set<string>(SKILL_OPTIONS)
        effectiveApiGurus.forEach(g => { (g.expertise || []).forEach((s: string) => { if (s) skillSet.add(s) }) })
        return Array.from(skillSet).sort()
    }, [effectiveApiGurus])

    const activeFilterCount = [
        filterStatus !== "all", filterMetode !== "all", filterSkill !== "all",
        filterMetodePengajaran !== "all", filterLabel !== "all", startDate !== "", endDate !== "", search !== "",
    ].filter(Boolean).length

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return effectiveApiGurus
            .filter(g => {
                const matchSearch = !q || g.name.toLowerCase().includes(q) || g.specialization.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
                const matchStatus = filterStatus === "all" || g.status === filterStatus
                const matchMetode = filterMetode === "all" || g.teachingMethod.toLowerCase().includes(filterMetode.toLowerCase())
                const matchSkill = filterSkill === "all" || (g.expertise || []).some((s: string) => s.toLowerCase() === filterSkill.toLowerCase()) || g.specialization.toLowerCase().includes(filterSkill.toLowerCase())
                const matchMetodePengajaran = filterMetodePengajaran === "all" || g.specialization.toLowerCase().includes(filterMetodePengajaran.toLowerCase())
                const myLabels = guruLabels[g.id] || []
                const matchLabel = filterLabel === "all" || myLabels.includes(filterLabel)
                let matchDate = true
                if (startDate || endDate) {
                    const gDate = new Date(g.createdAt).getTime()
                    const sDate = startDate ? new Date(startDate).getTime() : 0
                    if (endDate) { const temp = new Date(endDate); temp.setHours(23, 59, 59, 999); matchDate = gDate >= sDate && gDate <= temp.getTime() }
                    else matchDate = gDate >= sDate
                }
                return matchSearch && matchStatus && matchMetode && matchSkill && matchMetodePengajaran && matchLabel && matchDate
            })
            .sort((a, b) => {
                let av: number | string = a.name, bv: number | string = b.name
                if (sortField === "rating") { av = a.rating; bv = b.rating }
                else if (sortField === "totalStudents") { av = a.stats.totalStudents; bv = b.stats.totalStudents }
                else if (sortField === "totalRevenue") { av = a.stats.totalRevenue; bv = b.stats.totalRevenue }
                else if (sortField === "createdAt") { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime() }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [effectiveApiGurus, search, filterStatus, filterMetode, filterSkill, filterMetodePengajaran, filterLabel, guruLabels, sortField, sortDir, startDate, endDate])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function handleSort(f: typeof sortField) {
        if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(f); setSortDir("asc") }
        setPage(1)
    }

    function SortIcon({ field }: { field: typeof sortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-0.5 opacity-40 inline-block" />
        return <span className="ml-0.5 text-emerald-500 inline-block">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
            <ToastContainer />
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guru</h1>
                </div>

                {/* ── Action Bar ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative flex min-w-[220px] max-w-[340px] flex-1">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Cari nama, email..."
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-l-lg border border-r-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                            />
                        </div>
                        <button onClick={handleSearch} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-r-lg border border-emerald-500 transition-colors flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5" /> Cari
                        </button>
                    </div>

                    {/* Filter Popup trigger */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterModal(!showFilterModal)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${(filterStatus !== "all" || filterMetode !== "all" || filterSkill !== "all" || filterMetodePengajaran !== "all")
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400"}`}
                        >
                            <Filter className="w-3.5 h-3.5" /> Filter
                            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterModal ? "rotate-180" : ""}`} />
                        </button>
                        <FilterPopover
                            open={showFilterModal} onClose={() => setShowFilterModal(false)}
                            filterStatus={filterStatus} setFilterStatus={(v: string) => { setFilterStatus(v as any); setPage(1) }}
                            filterMetode={filterMetode} setFilterMetode={(v: string) => { setFilterMetode(v); setPage(1) }}
                            filterSkill={filterSkill} setFilterSkill={(v: string) => { setFilterSkill(v); setPage(1) }}
                            filterMetodePengajaran={filterMetodePengajaran} setFilterMetodePengajaran={(v: string) => { setFilterMetodePengajaran(v); setPage(1) }}
                            availableSkills={availableSkills}
                        />
                    </div>

                    {/* Label Filter */}
                    <LabelFilterDropdown value={filterLabel} onChange={v => { setFilterLabel(v); setPage(1) }} allLabels={allLabels} />

                    {/* Date Range */}
                    <DateRangeFilter
                        startDate={startDate} endDate={endDate}
                        onChange={(s, e) => { setStartDate(s); setEndDate(e); setPage(1) }}
                        onClear={() => { setStartDate(""); setEndDate(""); setPage(1) }}
                    />

                    {/* Reset */}
                    {activeFilterCount > 0 && (
                        <button onClick={resetFilters} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> Reset ({activeFilterCount})
                        </button>
                    )}
                </div>

                {activeFilterCount > 0 && (
                    <div className="px-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" /> Menampilkan <span className="font-bold text-emerald-600">{filtered.length}</span> dari <span className="font-bold text-emerald-600">{effectiveApiGurus.length}</span> guru.
                    </div>
                )}

                {/* ── Desktop Table ── */}
                <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Guru</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Metode</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Lokasi</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap hover:text-emerald-600 transition-colors" onClick={() => handleSort("totalStudents")}>Murid <SortIcon field="totalStudents" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap hover:text-emerald-600 transition-colors" onClick={() => handleSort("rating")}>Rating <SortIcon field="rating" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap hover:text-emerald-600 transition-colors" onClick={() => handleSort("totalRevenue")}>Revenue <SortIcon field="totalRevenue" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Unggulan</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap hover:text-emerald-600 transition-colors" onClick={() => handleSort("createdAt")}>Tgl Bergabung <SortIcon field="createdAt" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada data yang ditemukan</p>
                                            {activeFilterCount > 0 && <button onClick={resetFilters} className="mt-2 text-xs text-emerald-500 hover:underline">Reset semua filter</button>}
                                        </td>
                                    </tr>
                                ) : paged.map(guru => {
                                    const st = STATUS_CFG[guru.status as keyof typeof STATUS_CFG]
                                    const myLabels = guruLabels[guru.id] || []
                                    return (
                                        <tr key={guru.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Link href={`/en/teachers/manage/${guru.id}`} className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/30 hover:ring-emerald-400 dark:hover:ring-emerald-500 transition-all hover:scale-110">
                                                        {guru.avatar ? <Image src={guru.avatar} alt={guru.name} fill className="object-cover" unoptimized /> : <div className="w-full h-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 flex items-center justify-center font-bold">{guru.name.charAt(0).toUpperCase()}</div>}
                                                    </Link>
                                                    <div>
                                                        <Link href={`/en/teachers/manage/${guru.id}`} className="font-bold text-gray-900 dark:text-white text-xs leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors">{guru.name}</Link>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[140px]">@{guru.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs italic font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{guru.teachingMethod}</td>
                                            <td className="px-4 py-3">
                                                {(guru.cityName || guru.stateName || guru.countryName) ? (
                                                    <div className="text-xs text-gray-700 dark:text-gray-300">
                                                        <p className="font-semibold">{guru.cityName || guru.stateName || guru.countryName}</p>
                                                        {guru.stateName && guru.cityName && <p className="text-[10px] text-gray-400 mt-0.5">{guru.stateName}</p>}
                                                    </div>
                                                ) : <span className="text-xs text-gray-400">&#8212;</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{guru.status === "verified" ? <>{guru.stats.totalStudents} murid</> : <span className="text-gray-400 dark:text-gray-600">&#8212;</span>}</td>
                                            <td className="px-4 py-3">
                                                {guru.rating > 0 ? <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="text-xs font-bold text-gray-900 dark:text-white">{guru.rating.toFixed(1)}</span></div> : <span className="text-xs text-gray-400 dark:text-gray-600">&#8212;</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{guru.status === "verified" ? formatRupiah(guru.stats.totalRevenue) : <span className="text-gray-400 dark:text-gray-600">&#8212;</span>}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st?.bg ?? ""} ${st?.text ?? ""}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st?.dot ?? ""}`} />{st?.label ?? guru.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-[220px]">
                                                {guruFeatured[guru.id] ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2.5 py-1 text-[10px] font-bold border border-amber-200/50 dark:border-amber-800/50">
                                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Unggulan
                                                    </span>
                                                ) : <span className="text-gray-400 dark:text-gray-600 text-xs font-bold px-3">-</span>}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {formatDate(guru.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ActionMenu
                                                    guru={guru}
                                                    isFeatured={guruFeatured[guru.id] ?? false}
                                                    isAdminVerified={guruVerified[guru.id] ?? false}
                                                    onSuspend={() => openDeactivateModal(guru.id, guru.name)}
                                                    onUnsuspend={() => setReactivateModal({ open: true, guruId: guru.id, guruName: guru.name, guruUsername: guru.username })}
                                                    onVerify={(v) => handleVerifyTrainer(guru.id, guru.name, v)}
                                                    onFeature={(f) => handleFeatureTrainer(guru.id, guru.name, f)}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Mobile Cards ── */}
                <div className="block md:hidden space-y-3">
                    {paged.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm text-gray-400">Tidak ada data</p>
                            {activeFilterCount > 0 && <button onClick={resetFilters} className="mt-2 text-xs text-emerald-500 hover:underline">Reset filter</button>}
                        </div>
                    ) : paged.map(guru => {
                        const st = STATUS_CFG[guru.status as keyof typeof STATUS_CFG]
                        const myLabels = guruLabels[guru.id] || []
                        return (
                            <div key={guru.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Link href={`/en/teachers/manage/${guru.id}`} className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/30">
                                            {guru.avatar ? <Image src={guru.avatar} alt={guru.name} fill className="object-cover" unoptimized /> : <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">{guru.name.charAt(0).toUpperCase()}</div>}
                                        </Link>
                                        <div className="min-w-0">
                                            <Link href={`/en/teachers/manage/${guru.id}`} className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate block hover:text-emerald-600 transition-colors">{guru.name}</Link>
                                            <p className="text-[11px] text-gray-400 truncate">@{guru.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                {guruFeatured[guru.id] && (
                                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[9px] font-bold border border-amber-200/50 dark:border-amber-800/50" title="Guru Unggulan">
                                                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                                    </span>
                                                )}
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st?.bg ?? ""} ${st?.text ?? ""}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${st?.dot ?? ""}`} />{st?.label ?? guru.status}
                                        </span>
                                        <ActionMenu
                                            guru={guru}
                                            isFeatured={guruFeatured[guru.id] ?? false}
                                            isAdminVerified={guruVerified[guru.id] ?? false}
                                            onSuspend={() => openDeactivateModal(guru.id, guru.name)}
                                            onUnsuspend={() => setReactivateModal({ open: true, guruId: guru.id, guruName: guru.name, guruUsername: guru.username })}
                                            onVerify={(v) => handleVerifyTrainer(guru.id, guru.name, v)}
                                            onFeature={(f) => handleFeatureTrainer(guru.id, guru.name, f)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Metode</p><p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{guru.teachingMethod}</p></div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Tgl Bergabung</p><p className="font-semibold text-gray-700 dark:text-gray-300 truncate flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{formatDate(guru.createdAt)}</p></div>
                                    {guru.status === "verified" ? (<>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Murid</p><p className="font-bold text-emerald-600 dark:text-emerald-400">{guru.stats.totalStudents}</p></div>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Revenue</p><p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(guru.stats.totalRevenue)}</p></div>
                                    </>) : (
                                        <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5"><p className="text-gray-500 italic text-xs">Data tidak tersedia untuk guru non-aktif</p></div>
                                    )}
                                </div>

                            </div>
                        )
                    })}
                </div>

                {/* ── Pagination ── */}
                <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {filtered.length === 0 ? "Tidak ada data" : `Menampilkan ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}\u2013${Math.min(page * PAGE_SIZE, filtered.length)} dari ${filtered.length} data`}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>{p}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* ── Reactivate Modal ── */}
            {reactivateModal.open && (() => {
                const rawReason = reactivateModal.guruId ? suspendReasons[reactivateModal.guruId] : null
                let reasonText = "Alasan tidak dicantumkan.", dateText = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }), durationText = "Tidak ditentukan"
                if (rawReason) { try { const p = JSON.parse(rawReason); reasonText = p.reason || reasonText; durationText = p.duration || durationText; if (p.date) dateText = new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) } catch { reasonText = rawReason } }
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-emerald-100 dark:border-emerald-900/50 overflow-hidden">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 flex items-start gap-4 border-b border-emerald-100 dark:border-emerald-800">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0"><ShieldOff className="w-5 h-5" /></div>
                                <div><h2 className="text-base font-bold text-gray-900 dark:text-white">Guru dinonaktifkan</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{reactivateModal.guruName} &bull; @{reactivateModal.guruUsername}</p></div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2"><AlertTriangle className="w-4 h-4 text-emerald-500" /> Alasan</h3><p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">{reasonText}</p></div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800">
                                    <div><p className="text-[11px] font-semibold text-gray-400 mb-1">Dinonaktifkan sejak</p><p className="text-sm font-bold text-gray-700 dark:text-gray-300">{dateText}</p></div>
                                    <div><p className="text-[11px] font-semibold text-gray-400 mb-1">Durasi</p><p className="text-sm font-bold text-gray-700 dark:text-gray-300">{durationText}</p></div>
                                </div>
                            </div>
                            <div className="p-5 flex items-center gap-3 border-t border-gray-100 dark:border-gray-800">
                                <button onClick={() => setReactivateModal({ open: false, guruId: null, guruName: "", guruUsername: "" })} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Tutup</button>
                                <button onClick={() => { if (reactivateModal.guruId) { handleReactivate(reactivateModal.guruId, reactivateModal.guruName); setReactivateModal({ open: false, guruId: null, guruName: "", guruUsername: "" }) } }} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-sm font-bold text-white transition-colors">Aktifkan kembali</button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* ── Deactivate Modal ── */}
            {deactivateModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-red-50 dark:bg-red-900/20 rounded-t-2xl">
                            <div className="flex items-center gap-2"><ShieldOff className="w-5 h-5 text-red-500" /><h2 className="text-base font-bold text-gray-900 dark:text-white">Nonaktifkan Guru</h2></div>
                            <button onClick={() => setDeactivateModal({ open: false, guruId: null, guruName: "" })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"><XCircle className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-400">Guru <span className="font-bold">{deactivateModal.guruName}</span> akan dinonaktifkan dan tidak dapat menerima pesanan baru.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Alasan Penonaktifan</label>
                                <textarea value={deactivateReason} onChange={e => setDeactivateReason(e.target.value)} placeholder="Contoh: Melanggar ketentuan platform..." rows={3} className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Durasi Penonaktifan</label>
                                <input value={deactivateDuration} onChange={e => setDeactivateDuration(e.target.value)} placeholder="Contoh: 10 Hari, Permanen..." className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400" />
                            </div>
                        </div>
                        <div className="flex gap-2 px-5 pb-5">
                            <button onClick={() => setDeactivateModal({ open: false, guruId: null, guruName: "" })} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                            <button onClick={confirmDeactivate} disabled={isSuspending} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60">
                                <ShieldOff className="w-4 h-4" />{isSuspending ? "Memproses..." : "Ya, Nonaktifkan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function GuruPage() {
    return (
        <Suspense fallback={<div className="p-4 text-gray-500">Memuat data...</div>}>
            <GuruContent />
        </Suspense>
    )
}
