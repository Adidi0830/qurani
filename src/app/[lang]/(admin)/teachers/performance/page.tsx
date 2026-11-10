"use client"

import { useMemo, useEffect, useState } from "react"
import { Star, TrendingUp, Users, CheckCircle2, RefreshCw, XCircle, BarChart3, Search, Calendar as CalendarIcon, Filter, ChevronRight, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import scheduleDataRaw from "@/data/seleksi-schedule-dummy.json"
import seleksiTeam from "@/data/seleksi-team.json"

export default function PerformancePage() {
    return <PerformanceContent />
}

function PerformanceContent() {
    const [sessionSchedules, setSessionSchedules] = useState<any[]>([])
    const [searchInput, setSearchInput] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: "", end: "" })
    const [tempDateRange, setTempDateRange] = useState<{ start: string, end: string }>({ start: "", end: "" })
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 10

    const handleQuickSelect = (type: string) => {
        const now = new Date();
        let start = "";
        let end = "";
        const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        if (type === "Bulan Ini") {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = formatDate(firstDay);
            end = formatDate(lastDay);
        } else if (type === "3 Bulan Terakhir") {
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = formatDate(firstDay);
            end = formatDate(lastDay);
        } else if (type === "6 Bulan Terakhir") {
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = formatDate(firstDay);
            end = formatDate(lastDay);
        } else if (type === "Tahun Lalu") {
            const firstDay = new Date(now.getFullYear() - 1, 0, 1);
            const lastDay = new Date(now.getFullYear() - 1, 11, 31);
            start = formatDate(firstDay);
            end = formatDate(lastDay);
        }
        setTempDateRange({ start, end });
    }

    const handleApplyFilter = () => {
        setDateRange(tempDateRange);
        setIsPopoverOpen(false);
    }

    const handleClearFilter = () => {
        setTempDateRange({ start: "", end: "" });
        setDateRange({ start: "", end: "" });
        setIsPopoverOpen(false);
    }

    const handleOpenChange = (open: boolean) => {
        setIsPopoverOpen(open);
        if (open) {
            setTempDateRange(dateRange);
        }
    }

    useEffect(() => {
        const loadSchedules = () => {
            try {
                const stored = sessionStorage.getItem("pengajuanGuruSeleksi")
                if (stored) {
                    const parsed = JSON.parse(stored)
                    const list = Object.entries(parsed).map(([trainerId, item]: [string, any]) => ({
                        id: item.id || `session-${trainerId}`,
                        trainerId: parseInt(trainerId),
                        pengujiId: item.pengujiId,
                        date: item.date,
                        time: item.time,
                        timeEnd: item.timeEnd || "",
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
        window.addEventListener("sessionStorageChanged", loadSchedules)
        return () => {
            window.removeEventListener("focus", loadSchedules)
            window.removeEventListener("sessionStorageChanged", loadSchedules)
        }
    }, [])

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

    const baseTeamPerformance = useMemo(() => {
        return (seleksiTeam as any[]).map(t => {
            let ts = allSchedules.filter(s => s.pengujiId === t.id)
            if (dateRange.start || dateRange.end) {
                ts = ts.filter(s => {
                    const sd = new Date(`${s.date}T00:00:00`).getTime();
                    const start = dateRange.start ? new Date(`${dateRange.start}T00:00:00`).getTime() : 0;
                    const end = dateRange.end ? new Date(`${dateRange.end}T23:59:59`).getTime() : Infinity;
                    return sd >= start && sd <= end;
                });
            }
            const done = ts.filter(s => s.status === "done").length
            const scheduled = ts.filter(s => ["scheduled", "ongoing"].includes(s.status)).length
            const cancelled = ts.filter(s => s.status === "cancelled").length
            const reschedule = ts.filter(s => s.status === "reschedule").length
            const total = done + scheduled + cancelled + reschedule

            const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

            return { ...t, stats: { done, scheduled, cancelled, reschedule, total }, completionRate }
        });
    }, [allSchedules, dateRange])

    const teamPerformance = useMemo(() => {
        let list = baseTeamPerformance;
        if (searchQuery) {
            list = list.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || (t.skills as string[]).some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
        }
        return list;
    }, [baseTeamPerformance, searchQuery])

    // Reset pagination when search changes
    useEffect(() => { setPage(1) }, [searchQuery, dateRange])

    const totalPages = Math.ceil(teamPerformance.length / PAGE_SIZE)
    const pagedTeamPerformance = teamPerformance.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const totalDone = baseTeamPerformance.reduce((sum, t) => sum + t.stats.done, 0)
    const totalScheduled = baseTeamPerformance.reduce((sum, t) => sum + t.stats.scheduled, 0)
    const totalReschedule = baseTeamPerformance.reduce((sum, t) => sum + t.stats.reschedule, 0)
    const totalCancelled = baseTeamPerformance.reduce((sum, t) => sum + t.stats.cancelled, 0)
    const avgRating = baseTeamPerformance.length > 0
        ? (baseTeamPerformance.reduce((sum, t) => sum + (parseFloat(t.rating) || 0), 0) / baseTeamPerformance.length).toFixed(1)
        : "0.0"

    const summaryCards = [
        { label: "Tim Penyeleksi", value: baseTeamPerformance.length, Icon: Users, textColor: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
        { label: "Selesai", value: totalDone, Icon: CheckCircle2, textColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        { label: "Terjadwal", value: totalScheduled, Icon: TrendingUp, textColor: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
        { label: "Reschedule", value: totalReschedule, Icon: RefreshCw, textColor: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
        { label: "Dibatalkan", value: totalCancelled, Icon: XCircle, textColor: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
    ]

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
            <div className="max-w-[1400px] mx-auto space-y-6">

                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-emerald-500" />
                        Performa Penyeleksi
                    </h1>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {summaryCards.map((card, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                                <card.Icon className={`w-5 h-5 ${card.textColor}`} />
                            </div>
                            <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{card.label}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col md:flex-row md:items-center justify-end gap-4">
                        {/* Filters & Search */}
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <Popover open={isPopoverOpen} onOpenChange={handleOpenChange}>
                                    <PopoverTrigger asChild>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors outline-none focus:ring-2 focus:ring-emerald-500">
                                            <CalendarIcon className="w-4 h-4 text-emerald-600" />
                                            <span>Rentang Tanggal</span>
                                            <Filter className="w-4 h-4 text-gray-400 ml-2" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[320px] p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg" align="end">
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            <button onClick={() => handleQuickSelect("Bulan Ini")} className="px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 transition-colors">Bulan Ini</button>
                                            <button onClick={() => handleQuickSelect("3 Bulan Terakhir")} className="px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 transition-colors">3 Bulan Terakhir</button>
                                            <button onClick={() => handleQuickSelect("6 Bulan Terakhir")} className="px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 transition-colors">6 Bulan Terakhir</button>
                                            <button onClick={() => handleQuickSelect("Tahun Lalu")} className="px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 transition-colors">Tahun Lalu</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-5">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">MULAI</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={tempDateRange.start}
                                                        onChange={(e) => setTempDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                        className="w-full pl-3 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-transparent dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">SELESAI</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={tempDateRange.end}
                                                        onChange={(e) => setTempDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                        className="w-full pl-3 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-transparent dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={handleClearFilter} className="flex-1 px-4 py-2 text-sm font-bold text-rose-500 bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                                                Hapus
                                            </button>
                                            <button onClick={handleApplyFilter} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
                                                Terapkan
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Search Bar */}
                            <div className="flex w-full md:w-[320px] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                                <div className="flex items-center pl-3">
                                    <Search className="w-4 h-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") setSearchQuery(searchInput) }}
                                    placeholder="Cari nama penyeleksi..."
                                    className="w-full px-3 py-2 bg-transparent text-sm outline-none"
                                />
                                <button
                                    onClick={() => setSearchQuery(searchInput)}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors"
                                >
                                    Cari
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-left text-xs font-bold text-gray-500 px-5 py-3">Nama Penyeleksi</th>
                                    <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Selesai</th>
                                    <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Terjadwal</th>
                                    <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Reschedule</th>
                                    <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Dibatalkan</th>
                                    <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Penyelesaian</th>
                                    <th className="text-center text-xs font-bold text-gray-500 px-4 py-3">Rating</th>
                                    <th className="text-center text-xs font-bold text-gray-500 px-4 py-3"></th>
                                </tr>
                            </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {pagedTeamPerformance.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="px-5 py-4">
                                                <Link href={`/teachers/performance/${t.id}`} className="flex items-center gap-3 group">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 group-hover:ring-2 group-hover:ring-emerald-400 transition-all">
                                                        {t.avatar}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-emerald-600 transition-colors">{t.name}</p>
                                                        <p className="text-[11px] text-gray-500">@{t.username}</p>
                                                    </div>
                                                </Link>
                                            </td>
                                        <td className="px-4 py-4 text-center font-bold text-emerald-600">{t.stats.done}</td>
                                        <td className="px-4 py-4 text-center font-bold text-blue-600">{t.stats.scheduled}</td>
                                        <td className="px-4 py-4 text-center font-bold text-orange-500">{t.stats.reschedule}</td>
                                        <td className="px-4 py-4 text-center font-bold text-rose-500">{t.stats.cancelled}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                                        style={{ width: `${t.completionRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-9 text-right">
                                                    {t.completionRate}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.rating}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                                <Link
                                                    href={`/teachers/performance/${t.id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                                >
                                                    Detail
                                                    <ChevronRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                                Menampilkan {teamPerformance.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, teamPerformance.length)} dari {teamPerformance.length} data
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
                </div>

            </div>
        </div>
    )
}