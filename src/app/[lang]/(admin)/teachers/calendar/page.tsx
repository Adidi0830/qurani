"use client"

import { useState, useMemo, useEffect } from "react"
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    Clock, MapPin, Video, User, Star, UserX, UserCheck,
    Info, AlertCircle, RefreshCw, CheckCircle2, Filter, X,
    FileText, Camera, Shield, Award, CalendarDays
} from "lucide-react"
import {
    addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay,
    addDays, format, isToday
} from "date-fns"
import { id as idLocale, arSA as arLocale, enUS as enLocale } from "date-fns/locale"
import { useParams } from "next/navigation"

import scheduleDataRaw from "@/data/seleksi-schedule-dummy.json"
import seleksiTeam from "@/data/seleksi-team.json"
import { CustomSelect } from "@/components/ui/custom-select"
import { useI18n } from "@/components/providers/i18n-provider"

type ScheduleStatus = "scheduled" | "ongoing" | "done" | "cancelled" | "reschedule"

const STATUS_CFG: Record<ScheduleStatus, {
    labelKey: string; defaultLabel: string; bg: string; text: string; dot: string; border: string; cellBg: string; cellText: string; cellBorder: string
}> = {
    scheduled: {
        labelKey: "scheduled", defaultLabel: "Scheduled", dot: "bg-blue-500",
        bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800",
        cellBg: "bg-blue-50 dark:bg-blue-900/20", cellText: "text-blue-700 dark:text-blue-400", cellBorder: "border-blue-200 dark:border-blue-800",
    },
    ongoing: {
        labelKey: "ongoing", defaultLabel: "Ongoing", dot: "bg-amber-500",
        bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800",
        cellBg: "bg-amber-50 dark:bg-amber-900/20", cellText: "text-amber-700 dark:text-amber-400", cellBorder: "border-amber-200 dark:border-amber-800",
    },
    done: {
        labelKey: "done", defaultLabel: "Completed", dot: "bg-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800",
        cellBg: "bg-emerald-50 dark:bg-emerald-900/20", cellText: "text-emerald-700 dark:text-emerald-400", cellBorder: "border-emerald-200 dark:border-emerald-800",
    },
    cancelled: {
        labelKey: "cancelled", defaultLabel: "Cancelled", dot: "bg-rose-500",
        bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800",
        cellBg: "bg-rose-50 dark:bg-rose-900/20", cellText: "text-rose-700 dark:text-rose-400", cellBorder: "border-rose-200 dark:border-rose-800",
    },
    reschedule: {
        labelKey: "reschedule", defaultLabel: "Reschedule", dot: "bg-orange-500",
        bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800",
        cellBg: "bg-orange-50 dark:bg-orange-900/20", cellText: "text-orange-700 dark:text-orange-400", cellBorder: "border-orange-200 dark:border-orange-800",
    },
}

const DAY_KEYS = [
    { key: "mon", default: "Mon" },
    { key: "tue", default: "Tue" },
    { key: "wed", default: "Wed" },
    { key: "thu", default: "Thu" },
    { key: "fri", default: "Fri" },
    { key: "sat", default: "Sat" },
    { key: "sun", default: "Sun" },
]

export default function CalendarPage() {
    return <CalendarContent />
}

function CalendarContent() {
    const { t } = useI18n()
    const params = useParams()
    const lang = (params?.lang as string) || "en"
    const locale = lang === "id" ? idLocale : lang === "ar" ? arLocale : enLocale

    const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()))
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date())
    
    // Filters state
    const [selectedPenguji, setSelectedPenguji] = useState<string>("all")
    const [selectedStatus, setSelectedStatus] = useState<string>("all")
    const [selectedMetode, setSelectedMetode] = useState<string>("all")
    const [selectedWaktu, setSelectedWaktu] = useState<string>("all")

    // Session schedules
    const [sessionSchedules, setSessionSchedules] = useState<any[]>([])

    // Detail Modal state
    const [activeDetail, setActiveDetail] = useState<any | null>(null)
    const [showFilterPopup, setShowFilterPopup] = useState(false)

    // Close modals on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setActiveDetail(null)
                setShowFilterPopup(false)
            }
        }
        window.addEventListener("keydown", handleEsc)
        return () => window.removeEventListener("keydown", handleEsc)
    }, [])

    // Load from sessionStorage
    useEffect(() => {
        const loadSchedules = () => {
            try {
                const stored = sessionStorage.getItem("pengajuanGuruSeleksi")
                if (stored) {
                    const parsed = JSON.parse(stored)
                    const list = Object.entries(parsed).map(([trainerId, item]: [string, any]) => {
                        return {
                            id: item.id || `session-${trainerId}`,
                            trainerId: parseInt(trainerId),
                            trainerName: item.trainerName || `Calon Guru #${trainerId}`,
                            trainerEmail: item.trainerEmail || "",
                            pengujiId: item.pengujiId,
                            pengujiName: item.pengujiName || item.penguji || "Ustadz Hamid Al-Hafidz",
                            pengujiSpecialty: item.pengujiSpecialty || "Tahfidz & Tajwid",
                            date: item.date,
                            time: item.time,
                            timeEnd: item.timeEnd || "",
                            timezone: item.timezone || "WIB",
                            method: item.method || "online",
                            link: item.link || "",
                            notes: item.notes || "",
                            status: item.status || "scheduled",
                            trainerResponse: item.trainerResponse || null
                        }
                    })
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

    // Combine static raw dummy with session storage
    const allSchedules = useMemo(() => {
        // filter out static schedules that are replaced by session schedules with same trainerId
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

    // Apply multiple filters
    const filteredSchedules = useMemo(() => {
        return allSchedules.filter(s => {
            // Filter Penguji
            if (selectedPenguji !== "all" && s.pengujiId.toString() !== selectedPenguji) return false
            // Filter Status
            if (selectedStatus !== "all" && s.status !== selectedStatus) return false
            // Filter Metode
            if (selectedMetode !== "all" && s.method !== selectedMetode) return false
            // Filter Waktu
            if (selectedWaktu !== "all") {
                const hour = parseInt(s.time.split(":")[0]) || 0
                if (selectedWaktu === "pagi" && hour >= 12) return false
                if (selectedWaktu === "siang-sore" && hour < 12) return false
            }
            return true
        })
    }, [allSchedules, selectedPenguji, selectedStatus, selectedMetode, selectedWaktu])

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const mStart = startOfMonth(currentDate)
        const mEnd   = endOfMonth(mStart)
        const sDate  = startOfWeek(mStart, { weekStartsOn: 1 })
        const eDate  = endOfWeek(mEnd,     { weekStartsOn: 1 })
        const days: Date[] = []
        let day = sDate
        while (day <= eDate) { days.push(day); day = addDays(day, 1) }
        return days
    }, [currentDate])

    const totalCols = 7

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const goToToday = () => {
        const today = new Date()
        setCurrentDate(startOfMonth(today))
        setSelectedDate(today)
    }

    const getSchedulesForDate = (date: Date) =>
        filteredSchedules.filter(s => s.date === format(date, "yyyy-MM-dd"))

    const selectedSchedules = selectedDate ? getSchedulesForDate(selectedDate) : []

    // Performa tim
    const teamPerformance = useMemo(() => {
        return (seleksiTeam as any[]).map(tItem => {
            const ts = allSchedules.filter(s => s.pengujiId === tItem.id)
            const done      = ts.filter(s => s.status === "done").length
            const scheduled = ts.filter(s => ["scheduled", "ongoing"].includes(s.status)).length
            const cancelled = ts.filter(s => s.status === "cancelled").length
            const reschedule = ts.filter(s => s.status === "reschedule").length
            let status = "Tersedia"; let statusColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            if (scheduled >= 3) { status = "Sangat Sibuk"; statusColor = "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" }
            else if (scheduled >= 1) { status = "Sibuk"; statusColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
            if (done > 0) { status = "Aktif"; statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
            return { ...tItem, stats: { done, scheduled, cancelled, reschedule }, status, statusColor }
        })
    }, [allSchedules])

    // Mock/generate photo and document proof details when checking detail
    const handleOpenDetailModal = (item: any) => {
        const noSurat = `SELEKSI/QURANI/2026/0${item.trainerId || 7001}`
        
        let storedScores: any = null
        let storedPhoto: string | null = null
        try {
            const pen = sessionStorage.getItem("pengajuanGuruPenilaian")
            if (pen) {
                const parsed = JSON.parse(pen)
                const data = parsed[item.trainerId]
                if (data && data.decision) {
                    storedScores = data.scores
                    storedPhoto = data.photoUrl || null
                    if (!item.status || item.status === "scheduled") item.status = "done"
                }
            }
        } catch {}

        const scores = storedScores ? {
            kelancaran: storedScores.fluency,
            tajwid: storedScores.tajweed,
            intonasi: storedScores.intonation,
            penampilan: storedScores.appearance,
            pengalaman: storedScores.experience,
        } : {
            kelancaran: item.status === "done" ? (item.trainerId % 2 === 0 ? 7 : 8) : null,
            tajwid: item.status === "done" ? (item.trainerId % 2 === 0 ? 6 : 8) : null,
            intonasi: item.status === "done" ? (item.trainerId % 2 === 0 ? 7 : 9) : null,
            penampilan: item.status === "done" ? (item.trainerId % 2 === 0 ? 8 : 8) : null,
            pengalaman: item.status === "done" ? (item.trainerId % 2 === 0 ? 6 : 7) : null,
        }

        const rekomendasiKey = item.status === "done" 
            ? (scores.kelancaran! >= 7 ? "highly_recommended" : "eligible")
            : "not_evaluated"
        
        setActiveDetail({
            ...item,
            noSurat,
            scores,
            photoUrl: storedPhoto,
            rekomendasiKey,
            rekomendasi: item.status === "done" 
                ? (scores.kelancaran! >= 7 ? "Sangat Direkomendasikan (Mengajar Level Dewasa/Tahfidz)" : "Rekomendasi Layak Mengajar (Level Anak-anak)")
                : "Belum dinilai (Seleksi belum selesai)"
        })
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header with inline Filter ── */}
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-emerald-500" />
                        {t("calendar.title", "Kalender")}
                    </h1>

                    {/* Filter Jadwal - sejajar header di kanan */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowFilterPopup(!showFilterPopup)}
                            className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative"
                        >
                            <Filter className="w-4 h-4 text-emerald-500" />
                            {t("calendar.filter_button", "Filter Jadwal")}
                            {(selectedPenguji !== "all" || selectedStatus !== "all" || selectedMetode !== "all" || selectedWaktu !== "all") && (
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-gray-900 absolute -top-1 -right-1" />
                            )}
                        </button>

                        {/* Filter Popup */}
                        {showFilterPopup && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-40">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white">{t("calendar.filter.title", "Filter")}</h3>
                                    <button onClick={() => setShowFilterPopup(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {/* Filter Penguji */}
                                    <div className="space-y-1.5 z-[60] relative">
                                        <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                            <User className="w-3.5 h-3.5" /> {t("calendar.filter.examiner", "Penguji")}
                                        </label>
                                        <CustomSelect
                                            value={selectedPenguji}
                                            onChange={setSelectedPenguji}
                                            options={[
                                                { value: "all", label: t("calendar.filter.all_examiners", "Semua Penguji") },
                                                ...(seleksiTeam as any[]).map(item => ({ value: item.id.toString(), label: item.name }))
                                            ]}
                                        />
                                    </div>

                                    {/* Filter Status */}
                                    <div className="space-y-1.5 z-[50] relative">
                                        <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t("calendar.filter.status", "Status")}
                                        </label>
                                        <CustomSelect
                                            value={selectedStatus}
                                            onChange={setSelectedStatus}
                                            options={[
                                                { value: "all", label: t("calendar.filter.all_statuses", "Semua Status") },
                                                { value: "scheduled", label: t("calendar.statuses.scheduled", "Terjadwal") },
                                                { value: "ongoing", label: t("calendar.statuses.ongoing", "Berlangsung") },
                                                { value: "done", label: t("calendar.statuses.done", "Selesai") },
                                                { value: "reschedule", label: t("calendar.statuses.reschedule", "Reschedule") },
                                                { value: "cancelled", label: t("calendar.statuses.cancelled", "Dibatalkan") }
                                            ]}
                                        />
                                    </div>

                                    {/* Filter Metode */}
                                    <div className="space-y-1.5 z-[40] relative">
                                        <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                            <Video className="w-3.5 h-3.5" /> {t("calendar.filter.method", "Metode")}
                                        </label>
                                        <CustomSelect
                                            value={selectedMetode}
                                            onChange={setSelectedMetode}
                                            options={[
                                                { value: "all", label: t("calendar.filter.all_methods", "Semua Metode") },
                                                { value: "online", label: t("calendar.filter.online", "Online") },
                                                { value: "offline", label: t("calendar.filter.offline", "Offline") }
                                            ]}
                                        />
                                    </div>

                                    {/* Filter Waktu */}
                                    <div className="space-y-1.5 z-[30] relative">
                                        <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> {t("calendar.filter.time", "Waktu")}
                                        </label>
                                        <CustomSelect
                                            value={selectedWaktu}
                                            onChange={setSelectedWaktu}
                                            options={[
                                                { value: "all", label: t("calendar.filter.all_times", "Semua Waktu") },
                                                { value: "pagi", label: t("calendar.filter.morning", "Pagi (< 12:00)") },
                                                { value: "siang-sore", label: t("calendar.filter.afternoon_evening", "Siang/Sore (>= 12:00)") }
                                            ]}
                                        />
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                {(selectedPenguji !== "all" || selectedStatus !== "all" || selectedMetode !== "all" || selectedWaktu !== "all") && (
                                    <button onClick={() => {
                                        setSelectedPenguji("all"); setSelectedStatus("all"); setSelectedMetode("all"); setSelectedWaktu("all")
                                    }}
                                        className="w-full mt-4 py-2 text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 rounded-xl transition-colors">
                                        {t("calendar.filter.reset", "Reset Filter")}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                    {/* ── Kolom Kiri: Kalender ── */}
                    <div className="lg:col-span-2 xl:col-span-3 space-y-4">

                        {/* Kalender Card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">

                            {/* Navigasi bulan */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                                        {format(currentDate, "MMMM yyyy", { locale })}
                                    </h2>
                                    <button onClick={goToToday}
                                        className="px-2.5 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-lg transition-colors">
                                        {t("calendar.today", "Hari Ini")}
                                    </button>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    </button>
                                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Grid kalender – border approach agar garis solid */}
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                                {/* Header hari */}
                                <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">
                                    {DAY_KEYS.map((d, i) => (
                                        <div key={d.key} className={`py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400
                                            ${i < totalCols - 1 ? "border-r border-gray-200 dark:border-gray-700" : ""}`}>
                                            {t(`calendar.days.${d.key}`, d.default)}
                                        </div>
                                    ))}
                                </div>

                                {/* Baris hari */}
                                <div className="grid grid-cols-7">
                                    {calendarDays.map((day, idx) => {
                                        const dateStr      = format(day, "yyyy-MM-dd")
                                        const daySchedules = getSchedulesForDate(day)
                                        const isSelected   = !!(selectedDate && isSameDay(day, selectedDate))
                                        const inMonth      = isSameMonth(day, currentDate)
                                        const isTodayDay   = isToday(day)
                                        const isLastRow    = idx >= calendarDays.length - totalCols
                                        const isLastCol    = (idx + 1) % totalCols === 0

                                        return (
                                            <div key={dateStr} onClick={() => setSelectedDate(day)}
                                                className={[
                                                    "min-h-[90px] p-1.5 cursor-pointer transition-colors",
                                                    !isLastRow  ? "border-b border-gray-200 dark:border-gray-700" : "",
                                                    !isLastCol  ? "border-r border-gray-200 dark:border-gray-700" : "",
                                                    !inMonth    ? "bg-gray-50/60 dark:bg-gray-800/20" : "bg-white dark:bg-gray-900",
                                                    isSelected
                                                        ? "ring-2 ring-inset ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/15"
                                                        : "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                                ].join(" ")}
                                            >
                                                {/* Nomor tanggal */}
                                                <div className="flex justify-center mb-1">
                                                    <span className={[
                                                        "w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold",
                                                        isTodayDay  ? "bg-emerald-500 text-white" : "",
                                                        !isTodayDay && inMonth  ? "text-gray-700 dark:text-gray-200" : "",
                                                        !inMonth    ? "text-gray-400 dark:text-gray-600" : "",
                                                    ].join(" ")}>
                                                        {format(day, "d")}
                                                    </span>
                                                </div>

                                                {/* Event badges */}
                                                <div className="space-y-0.5">
                                                    {daySchedules.slice(0, 2).map(s => {
                                                        const st = (s.status || "scheduled") as ScheduleStatus
                                                        const cfg = STATUS_CFG[st] ?? STATUS_CFG.scheduled
                                                        return (
                                                            <div key={s.id}
                                                                className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate border
                                                                    ${cfg.cellBg} ${cfg.cellText} ${cfg.cellBorder}`}>
                                                                {s.time} · {s.trainerName.split(" ").at(-1)}
                                                            </div>
                                                        )
                                                    })}
                                                    {daySchedules.length > 2 && (
                                                        <div className="text-[9px] font-bold text-center text-gray-500 dark:text-gray-400">
                                                            {t("calendar.more_schedules", `+${daySchedules.length - 2} lainnya`, { count: daySchedules.length - 2 })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-4">
                                {(Object.entries(STATUS_CFG) as [ScheduleStatus, typeof STATUS_CFG[ScheduleStatus]][]).map(([key, cfg]) => (
                                    <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                        {t(`calendar.statuses.${cfg.labelKey}`, cfg.defaultLabel)}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* ── Kolom Kanan: Detail Tanggal ── */}
                    <div>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm sticky top-4 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-emerald-500" />
                                    {selectedDate
                                        ? format(selectedDate, "EEEE, d MMMM yyyy", { locale })
                                        : t("calendar.selected_date.select_date_prompt", "Pilih tanggal")}
                                </h3>
                                {selectedDate && selectedSchedules.length > 0 && (
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        {t("calendar.selected_date.schedules_count", `${selectedSchedules.length} jadwal seleksi`, { count: selectedSchedules.length })}
                                    </p>
                                )}
                            </div>

                            <div className="p-4">
                                {!selectedDate ? (
                                    <div className="py-10 text-center text-gray-400">
                                        <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">{t("calendar.selected_date.click_calendar_hint", "Klik tanggal di kalender")}</p>
                                    </div>
                                ) : selectedSchedules.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <UserX className="w-10 h-10 mx-auto mb-2 text-emerald-300 dark:text-emerald-800" />
                                        <p className="text-sm text-gray-500">{t("calendar.selected_date.empty_title", "Tidak ada jadwal seleksi")}</p>
                                        <p className="text-xs text-gray-400 mt-1">{t("calendar.selected_date.empty_desc", "di tanggal ini")}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                                        {selectedSchedules.map(s => {
                                            const st  = (s.status || "scheduled") as ScheduleStatus
                                            const cfg = STATUS_CFG[st] ?? STATUS_CFG.scheduled
                                            return (
                                                <div key={s.id} 
                                                    onClick={() => handleOpenDetailModal(s)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${cfg.bg} ${cfg.border} group`}>
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`font-bold text-sm truncate group-hover:underline ${cfg.text}`}>{s.trainerName}</p>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-white/60 dark:bg-black/20 ${cfg.text}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                                    {t(`calendar.statuses.${cfg.labelKey}`, cfg.defaultLabel)}
                                                                </span>
                                                                <span className={`text-[10px] font-semibold flex items-center gap-1 ${cfg.text}`}>
                                                                    <Clock className="w-3 h-3" />
                                                                    {s.time}{s.timeEnd ? ` – ${s.timeEnd}` : ""} {s.timezone || "WIB"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className={`flex-shrink-0 p-1.5 rounded-lg bg-white/60 dark:bg-black/20`}>
                                                            {s.method === "online"
                                                                ? <Video className={`w-3.5 h-3.5 ${cfg.text}`} />
                                                                : <MapPin className={`w-3.5 h-3.5 ${cfg.text}`} />
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 pt-2 border-t border-white/40 dark:border-black/15">
                                                        <div className="flex items-start gap-2">
                                                            <UserCheck className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                                                            <div>
                                                                <span className={`text-xs font-bold ${cfg.text}`}>{s.pengujiName}</span>
                                                                <p className={`text-[10px] opacity-75 ${cfg.text}`}>{s.pengujiSpecialty}</p>
                                                            </div>
                                                        </div>
                                                        {s.notes && (
                                                            <p className={`text-[10px] italic pl-5 ${cfg.text} opacity-70`}>"{s.notes}"</p>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Call to click detail */}
                                                    <div className="mt-2 text-right">
                                                        <span className="text-[9px] font-bold hover:underline opacity-80 flex items-center justify-end gap-1">
                                                            <FileText className="w-3 h-3" /> {t("calendar.selected_date.detail_link", "Detail →")}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ─── Modal Detail & Bukti Seleksi ─── */}
            {activeDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-emerald-50 dark:bg-emerald-950/30 rounded-t-3xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                        {t("calendar.modal.title", "Dokumen Bukti & Hasil Seleksi")}
                                    </h2>
                                    <p className="text-xs text-gray-500">{activeDetail.noSurat || "—"}</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveDetail(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6" style={{ scrollbarWidth: "none" }}>
                            
                            {/* Grid 2 Column: Info & Score */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {t("calendar.modal.selection_data_title", "Data Seleksi")}
                                    </h4>
                                    
                                    <div className="text-sm space-y-2">
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">{t("calendar.modal.applicant_name", "Nama Calon Guru")}</span>
                                            <span className="font-semibold text-gray-800 dark:text-white">{activeDetail.trainerName}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">{t("calendar.modal.email", "Email")}</span>
                                            <span className="text-gray-600 dark:text-gray-300">{activeDetail.trainerEmail || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">{t("calendar.modal.schedule_datetime", "Tanggal / Jam Seleksi")}</span>
                                            <span className="font-semibold text-gray-800 dark:text-white">{activeDetail.date} · {activeDetail.time}{activeDetail.timeEnd ? ` - ${activeDetail.timeEnd}` : ""} {activeDetail.timezone || "WIB"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">{t("calendar.modal.method", "Metode")}</span>
                                            <span className="capitalize font-semibold text-emerald-600">{activeDetail.method}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">{t("calendar.modal.examiner", "Penguji")}</span>
                                            <span className="font-semibold text-gray-800 dark:text-white">{activeDetail.pengujiName}</span>
                                            <span className="text-xs text-gray-500 block">({activeDetail.pengujiSpecialty})</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/40 dark:border-emerald-800/20">
                                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                        <Award className="w-3.5 h-3.5" />
                                        {t("calendar.modal.qualification_title", "Nilai & Kualifikasi")}
                                    </h4>

                                    {activeDetail.status === "done" ? (
                                        <div className="space-y-3">
                                            {/* Score indicators */}
                                            <div className="space-y-2">
                                                {[
                                                    { label: t("calendar.modal.criteria.fluency", "Kelancaran Baca"), val: activeDetail.scores?.kelancaran || 8 },
                                                    { label: t("calendar.modal.criteria.tajweed", "Tajwid & Makhraj"), val: activeDetail.scores?.tajwid || 8 },
                                                    { label: t("calendar.modal.criteria.intonation", "Intonasi Suara"), val: activeDetail.scores?.intonasi || 8 },
                                                    { label: t("calendar.modal.criteria.appearance", "Penampilan"), val: activeDetail.scores?.penampilan || 8 },
                                                    { label: t("calendar.modal.criteria.experience", "Pengalaman"), val: activeDetail.scores?.pengalaman || 7 },
                                                ].map((scoreItem, idx) => (
                                                    <div key={idx}>
                                                        <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                                            <span>{scoreItem.label}</span>
                                                            <span className="font-bold text-emerald-600">{scoreItem.val} / 9</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(scoreItem.val / 9) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-2 border-t border-emerald-100/50">
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                                                    {t("calendar.modal.result_recommendation", "Rekomendasi Hasil")}
                                                </span>
                                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 leading-normal">
                                                    {activeDetail.rekomendasiKey
                                                        ? t(`calendar.modal.recommendations.${activeDetail.rekomendasiKey}`, activeDetail.rekomendasi)
                                                        : activeDetail.rekomendasi}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center text-gray-400 dark:text-gray-500">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                                            <p className="text-xs font-bold text-amber-600">
                                                {t("calendar.modal.not_graded_title", "Proses Belum Dinilai")}
                                            </p>
                                            <p className="text-[11px] mt-1 leading-normal">
                                                {t("calendar.modal.not_graded_desc", "Nilai kualifikasi, skor kemampuan tajwid & kelayakan mengajar akan tampil setelah status seleksi diselesaikan oleh penguji.")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Foto Penyeleksian */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Camera className="w-4 h-4 text-gray-400" />
                                    {t("calendar.modal.documentation_title", "Foto / Dokumentasi Penyeleksian")}
                                </h4>
                                
                                {activeDetail.photoUrl ? (
                                    <div className="w-full aspect-[16/9] rounded-2xl relative overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                        <img src={activeDetail.photoUrl} alt="Bukti Seleksi" className="w-full h-full object-cover" />
                                    </div>
                                ) : activeDetail.method === "online" ? (
                                    <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 text-center p-6">
                                        <div className="space-y-2">
                                            <Camera className="w-10 h-10 mx-auto text-gray-400" />
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                {t("calendar.modal.no_photo_title", "Tidak Ada Foto Dokumentasi")}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                                                {t("calendar.modal.no_photo_desc", "Tangkapan layar atau rekaman seleksi online belum diunggah.")}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 text-center p-6">
                                        <div className="space-y-2">
                                            <MapPin className="w-10 h-10 mx-auto text-rose-400" />
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                {t("calendar.modal.offline_meeting_title", "Pertemuan dengan calon guru secara langsung")}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                                                {t("calendar.modal.offline_meeting_desc", `Metode tatap muka. Absensi fisik dan dokumen cetak diverifikasi langsung oleh ${activeDetail.pengujiName}.`, { examiner: activeDetail.pengujiName })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-3xl flex justify-end">
                            <button onClick={() => setActiveDetail(null)}
                                className="px-5 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all">
                                {t("calendar.modal.close", "Tutup Dokumen")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
