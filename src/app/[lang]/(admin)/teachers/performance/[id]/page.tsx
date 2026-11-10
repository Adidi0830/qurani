"use client"

import { useMemo, useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
    Star, ChevronLeft, CheckCircle2, Clock, RefreshCw, XCircle,
    BarChart3, User, Mail, Layers, Calendar, ExternalLink, Award,
    ChevronRight, AtSign, Filter
} from "lucide-react"

import scheduleDataRaw from "@/data/seleksi-schedule-dummy.json"
import seleksiTeam from "@/data/seleksi-team.json"
import { CustomSelect } from "@/components/ui/custom-select"

export default function PerformanceDetailPage() {
    return (
                <PerformanceDetailContent />
    )
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    done: {
        label: "Selesai",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        icon: CheckCircle2,
    },
    scheduled: {
        label: "Terjadwal",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        icon: Clock,
    },
    ongoing: {
        label: "Berlangsung",
        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
        icon: Clock,
    },
    reschedule: {
        label: "Reschedule",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        icon: RefreshCw,
    },
    cancelled: {
        label: "Dibatalkan",
        color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        icon: XCircle,
    },
}

const PAGE_SIZE = 5

function PerformanceDetailContent() {
    const params = useParams()
    const rawId = params ? (Array.isArray(params.id) ? params.id[0] : params.id) : "0"
    const id = parseInt(rawId ?? "0")

    const [sessionSchedules, setSessionSchedules] = useState<any[]>([])
    const [filterStatus, setFilterStatus] = useState("")
    const [filterMethod, setFilterMethod] = useState("")
    const [page, setPage] = useState(1)
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const filterRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    useEffect(() => {
        const loadSchedules = () => {
            try {
                const stored = sessionStorage.getItem("pengajuanGuruSeleksi")
                if (stored) {
                    const parsed = JSON.parse(stored)
                    const list = Object.entries(parsed).map(([trainerId, item]: [string, any]) => ({
                        id: item.id || `session-${trainerId}`,
                        trainerId: parseInt(trainerId),
                        trainerName: item.trainerName || "Calon Guru",
                        trainerEmail: item.trainerEmail || "",
                        pengujiId: item.pengujiId,
                        date: item.date,
                        time: item.time,
                        timeEnd: item.timeEnd || "",
                        method: item.method || "online",
                        link: item.link || "",
                        notes: item.notes || "",
                        status: item.status || "scheduled",
                    }))
                    setSessionSchedules(list)
                }
            } catch (e) {
                console.error("Failed to load session schedules:", e)
            }
        }
        loadSchedules()
        window.addEventListener("focus", loadSchedules)
        return () => window.removeEventListener("focus", loadSchedules)
    }, [])

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1) }, [filterStatus, filterMethod])

    const penyeleksi = useMemo(() => {
        return (seleksiTeam as any[]).find(t => t.id === id) || null
    }, [id])

    const allSchedules = useMemo(() => {
        const sessionIds = new Set(sessionSchedules.map(s => s.trainerId))
        const filteredRaw = (scheduleDataRaw as any[]).filter(s => !sessionIds.has(s.trainerId))
        const combined = [...sessionSchedules, ...filteredRaw]
        const now = new Date()
        return combined.map(s => {
            const scheduleDate = new Date(`${s.date}T${s.timeEnd || s.time || "00:00"}:00`)
            if (scheduleDate < now && (s.status === "scheduled" || s.status === "ongoing")) {
                return { ...s, status: "done" }
            }
            return s
        })
    }, [sessionSchedules])

    const mySchedules = useMemo(() => {
        return allSchedules
            .filter(s => s.pengujiId === id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [allSchedules, id])

    const filteredSchedules = useMemo(() => {
        let list = mySchedules
        if (filterStatus) list = list.filter(s => s.status === filterStatus)
        if (filterMethod) list = list.filter(s => s.method === filterMethod)
        return list
    }, [mySchedules, filterStatus, filterMethod])

    const totalPages = Math.ceil(filteredSchedules.length / PAGE_SIZE)
    const pagedSchedules = filteredSchedules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const stats = useMemo(() => {
        const done = mySchedules.filter(s => s.status === "done").length
        const scheduled = mySchedules.filter(s => ["scheduled", "ongoing"].includes(s.status)).length
        const cancelled = mySchedules.filter(s => s.status === "cancelled").length
        const reschedule = mySchedules.filter(s => s.status === "reschedule").length
        const total = done + scheduled + cancelled + reschedule
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
        return { done, scheduled, cancelled, reschedule, total, completionRate }
    }, [mySchedules])

    if (!penyeleksi) {
        return (
            <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">Penyeleksi tidak ditemukan.</p>
                    <Link href="/teachers/performance" className="mt-4 inline-flex items-center gap-2 text-emerald-600 hover:underline text-sm font-medium">
                        <ChevronLeft className="w-4 h-4" /> Kembali ke Performa
                    </Link>
                </div>
            </div>
        )
    }

    const avatarColors = [
        "from-violet-400 to-purple-600",
        "from-emerald-400 to-teal-600",
        "from-blue-400 to-indigo-600",
        "from-amber-400 to-orange-600",
        "from-rose-400 to-pink-600",
    ]
    const avatarColor = avatarColors[penyeleksi.id % avatarColors.length]

    const statCards = [
        { label: "Total Sesi", value: stats.total, color: "text-gray-700 dark:text-gray-200", bg: "bg-gray-100 dark:bg-gray-800", icon: Layers },
        { label: "Selesai", value: stats.done, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: CheckCircle2 },
        { label: "Terjadwal", value: stats.scheduled, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", icon: Clock },
        { label: "Reschedule", value: stats.reschedule, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", icon: RefreshCw },
        { label: "Dibatalkan", value: stats.cancelled, color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20", icon: XCircle },
    ]

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
            <div className="max-w-[1200px] mx-auto space-y-6">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Link href="/teachers/performance" className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
                        <ChevronLeft className="w-4 h-4" />
                        Performa Penyeleksi
                    </Link>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{penyeleksi.name}</span>
                </div>

                {/* Profile Card Refactored */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative mb-12">
                    {/* Banner Gradient */}
                    <div className="h-32 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 dark:from-emerald-600/50 dark:via-teal-600/30 dark:to-emerald-500/20 rounded-t-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 dark:bg-black/20 mix-blend-overlay"></div>
                    </div>
                    
                    <div className="px-6 sm:px-10 pb-8">
                        {/* Avatar & Rating Row */}
                        <div className="flex justify-between items-start -mt-12 mb-4 relative z-10">
                            <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-4xl font-extrabold shadow-xl ring-4 ring-white dark:ring-gray-900 flex-shrink-0`}>
                                {penyeleksi.avatar}
                            </div>
                            
                            {/* Skills and Rating on top right */}
                            <div className="mt-14 flex flex-col items-end gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{penyeleksi.rating}</span>
                                    <span className="text-xs text-amber-600 dark:text-amber-400">/ 5.0</span>
                                </div>
                                <div className="hidden sm:flex flex-wrap justify-end gap-1.5">
                                    {(penyeleksi.skills as string[]).map((skill: string) => (
                                        <span key={skill} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Name and Info Stack */}
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{penyeleksi.name}</h1>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-medium">
                                    <AtSign className="w-3.5 h-3.5" />
                                    {penyeleksi.username}
                                </span>
                                <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                    {penyeleksi.role}
                                </span>
                            </div>
                        </div>

                        {/* Links/Contact Row */}
                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4 sm:gap-8">
                            <a href={`mailto:${penyeleksi.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400 transition-colors font-medium">
                                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                </div>
                                {penyeleksi.email}
                            </a>
                            <a href={penyeleksi.zoomLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-medium">
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center">
                                    <ExternalLink className="w-4 h-4 text-blue-500" />
                                </div>
                                Link Zoom Meeting
                            </a>
                        </div>
                        
                        {/* Mobile Skills View */}
                        <div className="mt-5 flex sm:hidden flex-wrap gap-1.5">
                            {(penyeleksi.skills as string[]).map((skill: string) => (
                                <span key={skill} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {statCards.map((card, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{card.label}</p>
                        </div>
                    ))}
                </div>

                {/* Completion Rate */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Tingkat Penyelesaian</span>
                        </div>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                            style={{ width: `${stats.completionRate}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {stats.done} dari {stats.total} sesi berhasil diselesaikan
                    </p>
                </div>

                {/* Sessions Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    {/* Table Header + Filters */}
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                            <User className="w-4 h-4 text-emerald-500" />
                            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Data Calon Guru yang Diseleksi</h2>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                {filteredSchedules.length} calon
                            </span>
                        </div>
                        {/* Filter Button Dropdown */}
                        <div className="relative" ref={filterRef}>
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                    filterStatus || filterMethod 
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" 
                                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Filter Data
                                {(filterStatus || filterMethod) && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">
                                        {(filterStatus ? 1 : 0) + (filterMethod ? 1 : 0)}
                                    </span>
                                )}
                            </button>

                            {isFilterOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-4 transform origin-top-right transition-all">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5 z-[60] relative">
                                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status Seleksi</label>
                                            <CustomSelect
                                                value={filterStatus}
                                                onChange={setFilterStatus}
                                                options={[
                                                    { value: "", label: "Semua Status" },
                                                    { value: "done", label: "Selesai" },
                                                    { value: "scheduled", label: "Terjadwal" },
                                                    { value: "ongoing", label: "Berlangsung" },
                                                    { value: "reschedule", label: "Reschedule" },
                                                    { value: "cancelled", label: "Dibatalkan" }
                                                ]}
                                            />
                                        </div>
                                        <div className="space-y-1.5 z-[50] relative">
                                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Metode Seleksi</label>
                                            <CustomSelect
                                                value={filterMethod}
                                                onChange={setFilterMethod}
                                                options={[
                                                    { value: "", label: "Semua Metode" },
                                                    { value: "online", label: "Online" },
                                                    { value: "offline", label: "Offline" }
                                                ]}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                        <button 
                                            onClick={() => { setFilterStatus(""); setFilterMethod(""); setIsFilterOpen(false); }}
                                            className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                        >
                                            Reset Filter
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {filteredSchedules.length === 0 ? (
                        <div className="py-16 text-center text-gray-400 dark:text-gray-500">
                            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Tidak ada data sesi yang cocok dengan filter.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                            <th className="text-left text-xs font-bold text-gray-500 px-5 py-3">Calon Guru</th>
                                            <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Tanggal</th>
                                            <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Waktu</th>
                                            <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Metode</th>
                                            <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Status</th>
                                            <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {pagedSchedules.map((s, i) => {
                                            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.scheduled
                                            const StatusIcon = cfg.icon
                                            const isDone = s.status === "done"
                                            const globalIndex = (page - 1) * PAGE_SIZE + i
                                            const sessionRating = isDone
                                                ? (4 + Math.abs(Math.sin(globalIndex * 13.7)) * 1).toFixed(1)
                                                : null

                                            return (
                                                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.trainerName}</p>
                                                            <p className="text-[11px] text-gray-400 mt-0.5">@{s.trainerUsername}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span className="text-xs font-medium">
                                                                {new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                            {s.time}{s.timeEnd ? ` – ${s.timeEnd}` : ""}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.method === "online"
                                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                                            : "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                                                            }`}>
                                                            {s.method === "online" ? "Online" : "Offline"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.color}`}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        {sessionRating ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{sessionRating}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                                    Menampilkan {filteredSchedules.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredSchedules.length)} dari {filteredSchedules.length} data
                                </p>
                                <div className="flex items-center gap-3 sm:ml-auto">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                        Halaman {page} dari {Math.max(1, totalPages)}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}
