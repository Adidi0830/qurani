"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, ChevronLeft, ChevronRight, CheckCircle, Minus, ExternalLink } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/components/providers/i18n-provider"
import { getRecapAllAdmin } from "@/utils/api/recaps/fetch"
import { IRecap } from "@/types/recap"
import { getSimSetoransByUser } from "@/data/sim-setoran"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatTimeAgo, formatTooltipDate, formatDateShort } from "@/lib/date-utils"

const PAGE_SIZE = 10

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const stored = localStorage.getItem("myqurani_auth")
        if (!stored) return null
        const auth = JSON.parse(stored)
        return auth?.accessToken || null
    } catch {
        return null
    }
}

function formatMemorizationDisplay(memorization: string, recitationType: string) {
    const parts = memorization.split(" - ")
    if (parts.length === 2) {
        const start = parts[0].split(":")
        const end = parts[1].split(":")
        if (start.length === 2 && end.length === 2) {
            const startSurah = start[0].trim()
            const startVerse = start[1].trim()
            const endSurah = end[0].trim()
            const endVerse = end[1].trim()
            if (startSurah === endSurah) {
                return `${recitationType} ${startSurah} ${startVerse}-${endVerse}`
            }
            return `${recitationType} ${memorization}`
        }
    }
    return `${recitationType} ${memorization}`
}

function getResultFromConclusion(conclusion: string | undefined, mistakesCount: number) {
    switch (conclusion?.toLowerCase()) {
        case "excellent":
            return { key: "excellent", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
        case "very_good":
        case "very good":
            return { key: "very_good", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
        case "good":
            return { key: "good", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
        case "pass":
            return { key: "pass", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" }
        case "weak":
            return { key: "weak", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" }
        case "not_pass":
        case "not pass":
            return { key: "not_pass", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
        default:
            if (mistakesCount === 0) return { key: "excellent", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
            if (mistakesCount <= 2) return { key: "very_good", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
            if (mistakesCount <= 4) return { key: "good", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
            if (mistakesCount <= 6) return { key: "pass", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" }
            if (mistakesCount <= 8) return { key: "weak", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" }
            return { key: "not_pass", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
    }
}

interface UserSetoranProps {
    userId: string
    isMock?: boolean
    /** Preview mode: hanya tampilkan 10 data terbaru tanpa paginasi penuh */
    preview?: boolean
}

export function UserSetoran({ userId, isMock, preview = true }: UserSetoranProps) {
    const router = useRouter()
    const { t, locale } = useI18n()
    const lang = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en"
    const [recaps, setRecaps] = useState<IRecap[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        let cancelled = false
        setIsLoading(true)

        const load = async () => {
            const clientToken = getClientToken()
            let apiRecaps: IRecap[] = []
            try {
                const res = await getRecapAllAdmin(PAGE_SIZE * 3, 0, clientToken || undefined)
                if (res.success && Array.isArray(res.data)) {
                    apiRecaps = (res.data as IRecap[]).filter(
                        (r) => r.reciter_id === String(userId)
                    )
                }
            } catch {
                apiRecaps = []
            }

            if (cancelled) return

            const simRecaps = isMock ? getSimSetoransByUser(userId) : []

            const merged = [...apiRecaps, ...simRecaps]
            merged.sort((a, b) =>
                new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
            )

            setRecaps(merged)
            setIsLoading(false)
        }

        load()

        return () => {
            cancelled = true
        }
    }, [userId, isMock])

    const totalPages = Math.max(1, Math.ceil(recaps.length / PAGE_SIZE))

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages)
    }, [currentPage, totalPages])

    // Preview mode: only first 10, no pagination
    // Full mode: paginate normally
    const displayedData = preview
        ? recaps.slice(0, PAGE_SIZE)
        : recaps.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const hasMore = preview && recaps.length > 0

    if (isLoading) {
        return (
            <div className="space-y-3 py-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse" />
                ))}
            </div>
        )
    }

    if (recaps.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-base font-medium text-gray-600 dark:text-gray-400">{t("user_detail.setoran.empty", "Belum ada setoran untuk pengguna ini")}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {t("user_detail.setoran.history_title", "Riwayat Setoran")}
                </h4>
                {hasMore && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/${lang}/users/manage/${userId}/setorans`)}
                        className="gap-2 text-xs h-8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-400"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t("user_detail.setoran.view_all_count", "Lihat Semua ({{count}} Setoran)").replace("{{count}}", String(recaps.length))}
                    </Button>
                )}
            </div>

            {/* Preview notice */}
            {preview && recaps.length > PAGE_SIZE && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                    {t("user_detail.setoran.showing_preview", "Menampilkan 10 setoran terbaru")}
                </p>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.setoran.columns.penyetor", "Penyetor")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.setoran.columns.penerima", "Penerima")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.setoran.columns.recitation", "Bacaan")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.setoran.columns.result", "Hasil")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50 text-center">{t("user_detail.setoran.columns.paraf", "Paraf")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.setoran.columns.time", "Waktu")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedData.map((row) => {
                            const result = getResultFromConclusion(row.conclusion, row.mistakes?.length || 0)
                            return (
                                <TableRow
                                    key={row.id}
                                    onClick={() => row.id && router.push(`/setoran/recap/${row.id}`)}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                >
                                    <TableCell>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">
                                            {row.reciter?.nickname ? `${row.reciter.nickname} - ${row.reciter.name}` : row.reciter?.name}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">
                                            {row.examiner?.nickname ? `${row.examiner.nickname} - ${row.examiner.name}` : row.examiner?.name}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-700 dark:text-gray-200 capitalize">
                                            {formatMemorizationDisplay(row.memorization || "", row.recitation_type)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${result.color} border-0 font-medium w-fit`}>
                                            {t(`user_detail.setoran.scores.${result.key}`, result.key)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            {row.paraf ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <Minus className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-help border-b border-dashed border-gray-400">
                                                        {formatTimeAgo(row.created_at, locale)}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{formatTooltipDate(row.created_at)}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {displayedData.map((row) => {
                    const result = getResultFromConclusion(row.conclusion, row.mistakes?.length || 0)
                    return (
                        <div
                            key={row.id}
                            onClick={() => row.id && router.push(`/setoran/recap/${row.id}`)}
                            className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{formatDateShort(row.created_at, locale)}</span>
                                {row.paraf
                                    ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    : <Minus className="h-5 w-5 text-gray-300 dark:text-gray-600" />}
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="font-medium text-gray-900 dark:text-white capitalize">
                                    {formatMemorizationDisplay(row.memorization || "", row.recitation_type)}
                                </p>
                                <p className="text-gray-500">
                                    {t("user_detail.setoran.penyetor_label", "Penyetor")}: {row.reciter?.nickname ? `${row.reciter.nickname} - ${row.reciter.name}` : row.reciter?.name}
                                </p>
                                <p className="text-gray-500">
                                    {t("user_detail.setoran.penerima_label", "Penerima")}: {row.examiner?.nickname ? `${row.examiner.nickname} - ${row.examiner.name}` : row.examiner?.name}
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                <Badge className={`${result.color} border-0 font-medium`}>{t(`user_detail.setoran.scores.${result.key}`, result.key)}</Badge>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* View All Button (preview mode with hasMore) */}
            {hasMore && (
                <button
                    onClick={() => router.push(`/${lang}/users/manage/${userId}/setorans`)}
                    className="w-full py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <ExternalLink className="w-4 h-4" />
                    {t("user_detail.setoran.view_all_count", "Lihat Semua ({{count}} Setoran)").replace("{{count}}", String(recaps.length))}
                </button>
            )}

            {/* Pagination (full mode only) */}
            {!preview && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("user_detail.setoran.pagination", "Menampilkan {{from}}-{{to}} dari {{total}} setoran", {
                            from: (currentPage - 1) * PAGE_SIZE + 1,
                            to: Math.min(currentPage * PAGE_SIZE, recaps.length),
                            total: recaps.length,
                        })}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[60px] text-center">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}