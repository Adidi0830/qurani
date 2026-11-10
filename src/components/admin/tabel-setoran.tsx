"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import useSWRInfinite from "swr/infinite"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarUi } from "@/components/ui/calendar"
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Check, Search, Filter, RotateCcw, BookOpen, CheckCircle, Loader2, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { getRecapAllAdmin } from "@/utils/api/recaps/fetch"
import { toast } from "sonner"
import { IRecap } from "@/types/recap"
import { SIM_SETORANS } from "@/data/sim-setoran"
import { useRouter } from "next/navigation"
import { useI18n } from "../providers/i18n-provider"
import Link from "next/link"
import { UserAvatar } from "@/components/ui/user-avatar"
import { updateRecapParaf } from "@/utils/api/recaps/insert"
import { useParafStore } from "@/stores/parafStore"
// Removed useAuth import - admin can view all data

// Types
interface HasilSetoranRow {
    id: string
    waktu: string // ISO string
    penyetor: string // full name of group member/friend
    penerima: string // full name of logged in user (placeholder for now)
    setoran: string // example: "Tahsin Juz 5" / "Tahfidz Page 600"
    type: "group" | "friend"
    memorization_type: "surah" | "juz" | "page"
}


function isValidDate(date: Date | undefined) {
    if (!date) {
        return false
    }
    return !isNaN(date.getTime())
}

function formatForDb(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export function HasilSetoranTableContent() {
    const { t, locale } = useI18n()

    // Format date helper - Indonesian format (DD MMM YYYY)
    function formatDate(date: Date | undefined) {
        if (!date) {
            return ""
        }
        if (Number.isNaN(date.getTime())) return ""
        const day = date.getDate().toString().padStart(2, "0")
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        const month = months[date.getMonth()]
        const year = date.getFullYear()
        return `${day} ${month} ${year}`
    }

    const [openStartDate, setOpenStartDate] = useState(false)
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [startMonth, setStartMonth] = useState<Date | undefined>(undefined)
    const [startDateValue, setStartDateValue] = useState(formatDate(startDate))
    const [openEndDate, setOpenEndDate] = useState(false)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
    const [endMonth, setEndMonth] = useState<Date | undefined>(undefined)
    const [endDateValue, setEndDateValue] = useState(formatDate(endDate))
    const [isUpdatingParaf, setIsUpdatingParaf] = useState<boolean>(false)

    // Helper function to get result from conclusion (moved outside render for performance)
    const getResultFromConclusion = useCallback((conclusion?: string, mistakesCount: number = 0) => {
        switch (conclusion?.toLowerCase()) {
            case 'excellent':
                return { text: t("hasil-setoran.excellent"), color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
            case 'very_good':
            case 'very good':
                return { text: t("hasil-setoran.very_good"), color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
            case 'good':
                return { text: t("hasil-setoran.good"), color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
            case 'pass':
                return { text: t("hasil-setoran.pass"), color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" }
            case 'weak':
                return { text: t("hasil-setoran.weak"), color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" }
            case 'not_pass':
            case 'not pass':
                return { text: t("hasil-setoran.not_pass"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
            default:
                // Fallback: if no conclusion, determine by mistakes count
                if (mistakesCount === 0) return { text: t("hasil-setoran.excellent"), color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
                if (mistakesCount <= 2) return { text: t("hasil-setoran.very_good"), color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
                if (mistakesCount <= 4) return { text: t("hasil-setoran.good"), color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
                if (mistakesCount <= 6) return { text: t("hasil-setoran.pass"), color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" }
                if (mistakesCount <= 8) return { text: t("hasil-setoran.weak"), color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" }
                return { text: t("hasil-setoran.not_pass"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
        }
    }, [t])

    // Filters state
    const [tanggalDari, setTanggalDari] = useState<string>("")
    const [tanggalSampai, setTanggalSampai] = useState<string>("")
    const [filterPenyetor, setFilterPenyetor] = useState<string>("")
    const [filterType, setFilterType] = useState<"all" | HasilSetoranRow["type"]>("all")
    const [filterMemorizationType, setFilterMemorizationType] = useState<"all" | HasilSetoranRow["memorization_type"]>("all")
    // const viewMode = "all" // Fixed to "all" mode only
    const router = useRouter()

    // Constants for pagination
    const PAGE_SIZE = 10

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)

    // Reset pagination when filters change or data is loaded
    useEffect(() => {
        // We do not reset to page 1 merely on recapsData.length change unless it's a filter change,
        // but to ensure consistency, if data shrinks, we reset.
        if (currentPage > 1) {
            // Check if current page is still valid
            const maxPage = Math.max(1, Math.ceil(filtered ? filtered.length / PAGE_SIZE : 1));
            if (currentPage > maxPage) setCurrentPage(maxPage);
        }
    }, [tanggalDari, tanggalSampai, filterPenyetor, filterType, filterMemorizationType]);

    // Helper to get token from localStorage
    const getClientToken = (): string | null => {
        if (typeof window === 'undefined') return null
        try {
            const stored = localStorage.getItem('myqurani_auth')
            if (!stored) return null
            const auth = JSON.parse(stored)
            return auth?.accessToken || null
        } catch {
            return null
        }
    }

    // Fetcher function for infinite scroll - fetch ALL data for admin
    const fetchRecaps = useCallback(async (limit: number, offset: number) => {
        try {
            // Get token from localStorage to pass to server action
            const clientToken = getClientToken()
            console.log('[fetchRecaps] Calling getRecapAllAdmin with limit:', limit, 'offset:', offset, 'hasToken:', !!clientToken)

            // Use admin function to get ALL data without user filtering
            const res = await getRecapAllAdmin(limit, offset, clientToken || undefined)
            console.log('[fetchRecaps] Response:', res.success, res.message)

            if (!res.success) {
                console.error('[fetchRecaps] Failed:', res.message)
                toast.error(res.message || "Gagal memuat data")
                // Return empty data instead of throwing to prevent UI crash
                return {
                    data: [] as IRecap[],
                    count: 0
                }
            }

            console.log('[fetchRecaps] Got', res.data?.length, 'items')
            return {
                data: res.data as IRecap[],
                count: res.count || 0
            }
        } catch (error) {
            console.error("Error fetching recaps:", error)
            toast.error("Gagal memuat data hasil setoran")
            // Return empty data instead of throwing
            return {
                data: [] as IRecap[],
                count: 0
            }
        }
    }, [])

    // SWR Infinite for pagination
    const getKey = useCallback((pageIndex: number, previousPageData: { data: IRecap[], count: number } | null) => {
        // Stop if reached the end
        if (previousPageData && !previousPageData.data.length) return null

        // Return key with pagination info (admin view all data)
        return [`recaps-admin-all`, pageIndex, PAGE_SIZE]
    }, [])

    const {
        data,
        error: recapsError,
        size,
        setSize,
        mutate,
    } = useSWRInfinite(
        getKey,
        ([, pageIndex, pageSize]) => {
            const actualPageIndex = pageIndex as number
            const actualPageSize = pageSize as number
            return fetchRecaps(actualPageSize, actualPageIndex * actualPageSize)
        },
        {
            revalidateFirstPage: false,
            revalidateAll: false,
            parallel: false,
            keepPreviousData: true,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false
        }
    )

    // Aggregate all pages data
    const recapsData = useMemo(() => {
        if (!data) return [...SIM_SETORANS]
        const apiRows = data.flatMap(page => page?.data || [])
        return [...apiRows, ...SIM_SETORANS]
    }, [data])

    // Check if there's more data
    const hasMore = useMemo(() => {
        if (!data || data.length === 0) return true
        const lastPage = data[data.length - 1]
        const expectedPageSize = PAGE_SIZE
        return lastPage?.data?.length === expectedPageSize
    }, [data])

    // Loading states
    const isLoadingInitialData = !data && !recapsError
    const isLoadingMore = isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === "undefined")
    const isReachingEnd = !hasMore
    const isLoading = isLoadingInitialData


    // Function to format memorization display
    const formatMemorizationDisplay = (memorization: string, recitationType: string) => {
        // Determine the display type based on memorization_type or recitation_type
        let displayType = ""

        displayType = recitationType

        console.log("displayType:", displayType)

        // Parse memorization string (example: "Al-Fatihah:1 - Al-Fatihah:7")
        if (memorization) {
            const parts = memorization.split(' - ')
            if (parts.length === 2) {
                const start = parts[0].split(':')
                const end = parts[1].split(':')

                if (start.length === 2 && end.length === 2) {
                    const startSurah = start[0].trim()
                    const startVerse = start[1].trim()
                    const endSurah = end[0].trim()
                    const endVerse = end[1].trim()

                    // Check if same surah - format: "Tahsin: Yasin 1-25"
                    if (startSurah === endSurah) {
                        return `${displayType} ${startSurah} ${startVerse}-${endVerse}`
                    } else {
                        // Different surahs - format: "Tahsin: Al-Fatihah:1 - An-Nas:6"
                        return `${displayType} ${memorization}`
                    }
                }
            }

            // Single format or other patterns - format: "Tahsin: [memorization]"
            return `${displayType} ${memorization}`
        }

        // Fallback if no memorization data
        return displayType
    }

    // Function to handle click on recite text and navigate to detail
    const handleReciteClick = useCallback((recapId: string) => {
        router.push(`/setoran/recap/${recapId}`)
    }, [router])

    // Paraf dialog state
    const [isParafDialogOpen, setIsParafDialogOpen] = useState(false)
    const [selectedRecapForParaf, setSelectedRecapForParaf] = useState<string | null>(null)
    const { parafStatuses, loadParafStatuses } = useParafStore()

    // Load paraf statuses from database when recaps are fetched
    useEffect(() => {
        if (recapsData && recapsData.length > 0) {
            const statusesFromDB: { [key: string]: boolean } = {}
            recapsData.forEach(recap => {
                if (recap.id) {
                    statusesFromDB[recap.id] = recap.paraf || false
                }
            })
            loadParafStatuses(statusesFromDB)
        }
    }, [recapsData, loadParafStatuses])

    // Dialog state
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

    // Temporary filter state (for dialog)
    const [tempTanggalDari, setTempTanggalDari] = useState<string>("")
    const [tempTanggalSampai, setTempTanggalSampai] = useState<string>("")
    const [tempFilterPenyetor, setTempFilterPenyetor] = useState<string>("")
    const [tempFilterType, setTempFilterType] = useState<"all" | HasilSetoranRow["type"]>("all")
    const [tempFilterMemorizationType, setTempFilterMemorizationType] = useState<"all" | HasilSetoranRow["memorization_type"]>("all")

    // Load more function for server data
    const loadMoreServerData = useCallback(() => {
        if (!isLoadingMore && !isReachingEnd && hasMore) {
            setSize(size + 1)
        }
    }, [isLoadingMore, isReachingEnd, hasMore, setSize, size])

    // Paraf functions
    const handleParafClick = (recapId: string, currentParafStatus: boolean) => {
        // Only allow giving paraf if not already given
        if (currentParafStatus) return

        setSelectedRecapForParaf(recapId)
        setIsParafDialogOpen(true)
    }

    const handleParafConfirm = async () => {
        if (!selectedRecapForParaf) return
        setIsUpdatingParaf(true)

        try {
            // For admin, use empty string or admin ID (modify API if needed)
            await updateRecapParaf(selectedRecapForParaf, true, "admin")

            // Revalidate dari server untuk pastikan data sinkron
            await mutate()
        } catch (error) {
            console.error("Gagal memperbarui paraf:", error)
            toast.error("Gagal memberikan paraf")
        } finally {
            setIsParafDialogOpen(false)
            setIsUpdatingParaf(false)
        }
    }

    const handleParafCancel = () => {
        setIsParafDialogOpen(false)
        setSelectedRecapForParaf(null)
    }

    const filtered = useMemo(() => {
        // Early return if no data to avoid unnecessary processing
        if (!recapsData || recapsData.length === 0) return []

        let data = [...recapsData]

        // Client-side filtering (for now - can be moved to server later)
        // Filter by date range
        if (tanggalDari || tanggalSampai) {
            data = data.filter((d) => {
                const dataDateRecap = new Date(d.created_at || '')

                // If only "dari" is set, show data from that date onwards
                if (tanggalDari && !tanggalSampai) {
                    const fromDate = new Date(tanggalDari)
                    fromDate.setHours(0, 0, 0, 0) // Start of day
                    return fromDate <= dataDateRecap
                }

                // If only "sampai" is set, show data up to that date
                if (!tanggalDari && tanggalSampai) {
                    const toDate = new Date(tanggalSampai)
                    toDate.setHours(23, 59, 59, 999) // End of day
                    return dataDateRecap <= toDate
                }

                // If both are set, show data in range
                if (tanggalDari && tanggalSampai) {
                    const fromDate = new Date(tanggalDari)
                    const toDate = new Date(tanggalSampai)
                    fromDate.setHours(0, 0, 0, 0) // Start of day
                    toDate.setHours(23, 59, 59, 999) // End of day
                    return dataDateRecap >= fromDate && dataDateRecap <= toDate
                }

                return true
            })
        }

        // Filter by reciter or examiner name
        if (filterPenyetor.trim()) {
            const q = filterPenyetor.trim().toLowerCase()
            data = data.filter((d) =>
                d.reciter?.name!.toLowerCase().includes(q) ||
                d.examiner?.name!.toLowerCase().includes(q)
            )
        }

        // Filter by type
        if (filterType && filterType !== "all") {
            data = data.filter((d) => d.type === filterType)
        }

        // Filter by memorization type
        if (filterMemorizationType && filterMemorizationType !== "all") {
            data = data.filter((d) => d.memorization_type === filterMemorizationType)
        }

        return data
    }, [tanggalDari, tanggalSampai, filterPenyetor, filterType, filterMemorizationType, recapsData])

    // Calculate total pages based on filtered data length
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

    // Display data (paginated)
    const displayedData = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filtered.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filtered, currentPage])

    const resetFilters = useCallback(() => {
        setTanggalDari("")
        setTanggalSampai("")
        setFilterPenyetor("")
        setFilterType("all")
        setFilterMemorizationType("all")
    }, [])

    const handleOpenFilterDialog = useCallback(() => {
        // Initialize temp values with current filter values
        setTempTanggalDari(tanggalDari)
        setTempTanggalSampai(tanggalSampai)
        setTempFilterPenyetor(filterPenyetor)
        setTempFilterType(filterType)
        setTempFilterMemorizationType(filterMemorizationType)
        setIsFilterDialogOpen(true)
    }, [tanggalDari, tanggalSampai, filterPenyetor, filterType, filterMemorizationType])

    const handleApplyFilters = useCallback(() => {
        // Validate date range
        if (tempTanggalDari && tempTanggalSampai && tempTanggalDari > tempTanggalSampai) {
            toast.error("Tanggal 'Dari' tidak boleh lebih besar dari tanggal 'Sampai'")
            return
        }

        // Apply temp values to actual filter state
        setTanggalDari(tempTanggalDari)
        setTanggalSampai(tempTanggalSampai)
        setFilterPenyetor(tempFilterPenyetor)
        setFilterType(tempFilterType)
        setFilterMemorizationType(tempFilterMemorizationType)
        setIsFilterDialogOpen(false)
    }, [tempTanggalDari, tempTanggalSampai, tempFilterPenyetor, tempFilterType, tempFilterMemorizationType])

    const handleCancelFilters = useCallback(() => {
        // Reset temp values and close dialog
        setIsFilterDialogOpen(false)
    }, [])

    const handleResetFilters = useCallback(() => {
        setStartDate(undefined)
        setEndDate(undefined)
        setStartMonth(undefined)
        setEndMonth(undefined)
        setStartDateValue("")
        setEndDateValue("")

        setTempTanggalDari("")
        setTempTanggalSampai("")
        setFilterPenyetor("")
        setFilterType("all")
        setFilterMemorizationType("all")
        resetFilters()
        setIsFilterDialogOpen(false)
    }, [resetFilters])

    // Mode change handler removed - only "all" mode is supported

    // Format date with hour - Indonesian format (DD MMM YYYY, HH:MM)
    const formatDateWithHour = (date: string) => {
        const dt = new Date(date)
        if (Number.isNaN(dt.getTime())) return date
        const day = dt.getDate().toString().padStart(2, "0")
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        const month = months[dt.getMonth()]
        const year = dt.getFullYear()
        const jam = dt.toLocaleTimeString('id-ID', {
            hour: "2-digit",
            minute: "2-digit"
        })

        return `${day} ${month} ${year}, ${jam}`
    }

    // Removed useEffect dependency on userId - admin view doesn't need user filtering


    return (
        <>
            {/* Results Table Section */}
            <Card className="border-none shadow-none bg-transparent min-h-screen max-w-7xl mx-auto">
                <CardContent className="px-0">
                    <div className="flex flex-col gap-4 mb-6">
                        {/* Header and Filter */}
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                                {t("hasil-setoran.recitation_results")}
                            </h1>
                            <div className="sm">
                                <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                                    <DialogTrigger asChild>
                                        <div
                                            onClick={handleOpenFilterDialog}
                                            className="rounded-lg border text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 sm:p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <Filter className="w-5 h-5" />
                                        </div>
                                    </DialogTrigger>
                                </Dialog>
                            </div>
                        </div>


                    </div>

                    <div className="mb-4">
                        <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Filter className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        {t("hasil-setoran.filter")}
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    {/* Date Range Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <Label
                                                htmlFor="dialog-tanggal-dari"
                                                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                                            >
                                                {t("hasil-setoran.from_date")}
                                            </Label>
                                            <div className="relative flex gap-2 mt-2">
                                                <Input
                                                    id="start-date"
                                                    value={startDateValue}
                                                    readOnly
                                                    placeholder={t("hasil-setoran.select_start_date")}
                                                    className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400"
                                                    onChange={(e) => {
                                                        const date = new Date(e.target.value)
                                                        setStartDateValue(e.target.value)
                                                        if (isValidDate(date)) {
                                                            setStartDate(date)
                                                            setStartMonth(date)
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "ArrowDown") {
                                                            e.preventDefault()
                                                            setOpenStartDate(true)
                                                        }
                                                    }}
                                                    onClick={() => setOpenStartDate(true)}
                                                />

                                                <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            id="start-date-picker"
                                                            variant="ghost"
                                                            className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                                                        >
                                                            <CalendarIcon className="size-3.5" />
                                                            <span className="sr-only">{t("hasil-setoran.select_start_date")}</span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="w-auto overflow-hidden p-0 bg-white"
                                                        align="end"
                                                        alignOffset={-8}
                                                        sideOffset={10}
                                                    >
                                                        <CalendarUi
                                                            mode="single"
                                                            selected={startDate}
                                                            captionLayout="dropdown"
                                                            month={startMonth}
                                                            onMonthChange={setStartMonth}
                                                            onSelect={(date) => {
                                                                if (!date) return
                                                                setTempTanggalDari(formatForDb(date))
                                                                setStartDate(date)
                                                                setStartDateValue(formatDate(date))
                                                                setOpenStartDate(false)
                                                            }}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>


                                        <div>
                                            <Label
                                                htmlFor="dialog-tanggal-sampai"
                                                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                                            >
                                                {t("hasil-setoran.to_date")}
                                            </Label>
                                            <div className="relative flex gap-2 mt-2">
                                                <Input
                                                    id="end-date"
                                                    value={endDateValue}
                                                    readOnly
                                                    placeholder={t("hasil-setoran.select_end_date")}
                                                    className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400"
                                                    onChange={(e) => {
                                                        const date = new Date(e.target.value)
                                                        setEndDateValue(e.target.value)
                                                        if (isValidDate(date)) {
                                                            setEndDate(date)
                                                            setEndMonth(date)
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "ArrowDown") {
                                                            e.preventDefault()
                                                            setOpenEndDate(true)
                                                        }
                                                    }}
                                                    onClick={() => setOpenEndDate(true)}
                                                />

                                                <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            id="end-date-picker"
                                                            variant="ghost"
                                                            className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                                                        >
                                                            <CalendarIcon className="size-3.5" />
                                                            <span className="sr-only">{t("hasil-setoran.select_end_date")}</span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="w-auto overflow-hidden p-0 bg-white"
                                                        align="end"
                                                        alignOffset={-8}
                                                        sideOffset={10}
                                                    >
                                                        <CalendarUi
                                                            mode="single"
                                                            selected={endDate}
                                                            captionLayout="dropdown"
                                                            month={endMonth}
                                                            onMonthChange={setEndMonth}
                                                            onSelect={(date) => {
                                                                if (!date) return
                                                                setTempTanggalSampai(formatForDb(date))
                                                                setEndDate(date)
                                                                setEndDateValue(formatDate(date))
                                                                setOpenEndDate(false)
                                                            }}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Other Filters Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <Label htmlFor="dialog-penyetor" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                {t("hasil-setoran.reciter")} / {t("hasil-setoran.recipient")}
                                            </Label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    id="dialog-penyetor"
                                                    placeholder={`Search ${t("hasil-setoran.reciter").toLowerCase()} or ${t("hasil-setoran.recipient").toLowerCase()}...`}
                                                    value={tempFilterPenyetor}
                                                    onChange={(e) => setTempFilterPenyetor(e.target.value)}
                                                    className="pl-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 mt-2"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("hasil-setoran.type")}</Label>
                                            <Select
                                                value={tempFilterType}
                                                onValueChange={(v: "all" | "group" | "friend") => setTempFilterType(v)}
                                            >
                                                <SelectTrigger className="min-h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 mt-2 w-full">
                                                    <SelectValue placeholder={t("hasil-setoran.all")} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="all">{t("hasil-setoran.all")}</SelectItem>
                                                    <SelectItem value="group">{t("hasil-setoran.group")}</SelectItem>
                                                    <SelectItem value="friend">{t("hasil-setoran.friend")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("hasil-setoran.memorization_type")}</Label>
                                            <Select
                                                value={tempFilterMemorizationType}
                                                onValueChange={(v: "all" | "surah" | "juz" | "page") => setTempFilterMemorizationType(v)}
                                            >
                                                <SelectTrigger className="min-h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 mt-2 w-full">
                                                    <SelectValue placeholder={t("hasil-setoran.all")} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="all">{t("hasil-setoran.all")}</SelectItem>
                                                    <SelectItem value="surah">{t("hasil-setoran.surah")}</SelectItem>
                                                    <SelectItem value="juz">Juz</SelectItem>
                                                    <SelectItem value="page">{t("hasil-setoran.page")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleResetFilters}
                                        className="border-2 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-600 text-slate-700 dark:text-slate-300 rounded-xl"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        {t("hasil-setoran.reset")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleCancelFilters}
                                        className="border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl"
                                    >
                                        {t("hasil-setoran.cancel")}
                                    </Button>
                                    <Button
                                        onClick={handleApplyFilters}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                                    >
                                        {t("hasil-setoran.apply")}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Paraf Confirmation Dialog */}
                    <Dialog open={isParafDialogOpen} onOpenChange={setIsParafDialogOpen}>
                        <DialogContent className="">
                            <DialogHeader>
                                <DialogTitle className="text-base md:text-xl font-bold text-slate-700 dark:text-slate-200">
                                    {t("hasil-setoran.signature_confirmation")}
                                </DialogTitle>
                            </DialogHeader>

                            <DialogFooter className="sm:gap-2 flex flex-row justify-center">
                                <Button
                                    variant="outline"
                                    onClick={handleParafCancel}
                                    className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base border-none 
                            dark:bg-slate-500/50 hover:border-slate-300 bg-slate-200 dark:hover:border-slate-600 
                            text-slate-700 dark:text-slate-200 flex-1"
                                >
                                    {t("hasil-setoran.cancel")}
                                </Button>
                                <Button
                                    disabled={isUpdatingParaf}
                                    onClick={handleParafConfirm}
                                    className={`px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base 
                    bg-gradient-to-r from-emerald-600 to-teal-600 
                    hover:from-emerald-700 hover:to-teal-700 text-white flex-1
                    ${isUpdatingParaf ? 'opacity-80 cursor-not-allowed' : ''}`}
                                >
                                    {isUpdatingParaf ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </>
                                    ) : (
                                        t("hasil-setoran.signature_confirmation_button")
                                    )}
                                </Button>
                            </DialogFooter>

                        </DialogContent>
                    </Dialog>

                    {(filtered.length === 0 && !isLoading) ? (
                        <div className="text-center py-28">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
                                <BookOpen className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 text-lg font-medium mb-2">{t("hasil-setoran.no_records_found")}</div>
                            <p className="text-slate-500 dark:text-slate-500">{t("hasil-setoran.try_adjusting_filters")}</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("hasil-setoran.time")}</TableHead>
                                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">
                                                {t("hasil-setoran.reciter")}
                                            </TableHead>
                                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">
                                                {t("hasil-setoran.recipient")}
                                            </TableHead>
                                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("hasil-setoran.recite")}</TableHead>
                                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("hasil-setoran.result")}</TableHead>
                                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50 text-center capitalize">{t("hasil-setoran.signature")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    {isLoading ? (
                                        <TableBody>
                                            {[...Array(1)].map((_, i) => (
                                                <TableRow
                                                    key={i}
                                                    className="animate-pulse hover:bg-transparent border-b border-slate-200 dark:border-slate-700"
                                                >
                                                    {/* Kolom Tanggal & Waktu */}
                                                    <TableCell>
                                                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    </TableCell>

                                                    {/* Kolom Reciter */}
                                                    <TableCell>
                                                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-md mb-1" />
                                                    </TableCell>

                                                    {/* Kolom Recipient */}
                                                    <TableCell>
                                                        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    </TableCell>

                                                    {/* Kolom Recite */}
                                                    <TableCell>
                                                        <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    </TableCell>

                                                    {/* Kolom Result */}
                                                    <TableCell>
                                                        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                                    </TableCell>

                                                    {/* Kolom Signature */}
                                                    <TableCell className="text-center">
                                                        <div className="mx-auto h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    ) : (
                                        <TableBody>
                                            {displayedData.map((row) => {
                                                const dt = new Date(row.created_at!)
                                                const localeString = locale === 'id' ? 'id-ID' : 'en-GB'
                                                const tanggal = dt.toLocaleDateString(localeString, {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })
                                                const jam = dt.toLocaleTimeString('id-ID', {
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })

                                                // Get result from database conclusion field
                                                const mistakesCount = row.mistakes?.length || 0
                                                const result = getResultFromConclusion(row.conclusion, mistakesCount)

                                                return (
                                                    <TableRow key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-700 dark:text-slate-200">{tanggal}, {jam}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link href={`/profile/${row.reciter?.username?.replace(/^@/, '') || ''}`}>
                                                                <div className="font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400">
                                                                    {row.reciter?.nickname ? `${row.reciter?.nickname} - ${row.reciter?.name}` : row.reciter?.name}
                                                                </div>
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link href={`/profile/${row.examiner?.username?.replace(/^@/, '') || ''}`}>
                                                                <div className="font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400">
                                                                    {row.examiner?.nickname ? `${row.examiner?.nickname} - ${row.examiner?.name}` : row.examiner?.name}
                                                                </div>
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link href={`/setoran/recap/${row.id}`}
                                                                className="font-medium text-slate-700 dark:text-slate-200 capitalize cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                                                onClick={() => handleReciteClick(row.id!)}
                                                                title={t("hasil-setoran.click_to_view_detail")}
                                                            >
                                                                {formatMemorizationDisplay(row.memorization, row.recitation_type)}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={`${result.color} border-0 font-medium w-fit`}>
                                                                {result.text}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex justify-center">
                                                                {row.id && parafStatuses[row.id] ? (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div
                                                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 border-2 border-green-300 dark:bg-green-900/30 dark:border-green-600 cursor-pointer"
                                                                                title={t("hasil-setoran.signature_already_given")}
                                                                            >
                                                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                                            </div>
                                                                        </PopoverTrigger>

                                                                        <PopoverContent className="bg-white dark:bg-slate-900 shadow-lg rounded-xl p-4 w-64 border border-slate-200 dark:border-slate-700">
                                                                            <div className="flex items-center gap-3">
                                                                                <Link
                                                                                    href={`/profile/${row.signed_by?.username?.replace(/^@/, '')}`}
                                                                                    className="relative flex justify-center items-center"
                                                                                >
                                                                                    <div className="inline-block rounded-full ring-4 ring-slate-100 dark:ring-slate-700">
                                                                                        <UserAvatar
                                                                                            user={{
                                                                                                id: row.signed_by?.id || '',
                                                                                                name: row.signed_by?.name || null,
                                                                                                username: row.signed_by?.username || null,
                                                                                                avatar: row.signed_by?.avatar || null,
                                                                                            }}
                                                                                            size="md"
                                                                                        />
                                                                                    </div>
                                                                                </Link>
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                                                        {row.signed_by?.name || 'unknown'}
                                                                                    </span>
                                                                                    <span className="text-sm text-slate-500">
                                                                                        @{row.signed_by?.username?.replace(/^@/, '') || 'unknown'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                                                                                <p className="text-xs text-slate-500">
                                                                                    {t("hasil-setoran.signed_on")}
                                                                                </p>
                                                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                                                    {formatDateWithHour(row.signed_at!)}
                                                                                </p>
                                                                            </div>
                                                                        </PopoverContent>

                                                                    </Popover>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 w-8 p-0 rounded-full border-2 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-600"
                                                                        onClick={() => row.id && handleParafClick(row.id, parafStatuses[row.id] || false)}
                                                                        title={t("hasil-setoran.click_to_give_signature")}
                                                                    >
                                                                        <Check className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    )}
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {isLoading ? (
                                    [...Array(1)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 animate-pulse"
                                        >
                                            <div className="space-y-2">
                                                {/* Time */}
                                                <div className="flex items-center justify-between">
                                                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                </div>

                                                {/* Reciter/Recipient */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    </div>
                                                </div>

                                                {/* Recite */}
                                                <div className="flex items-start justify-between">
                                                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                </div>

                                                {/* Result */}
                                                <div className="flex items-center justify-between">
                                                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                                </div>

                                                {/* Signature */}
                                                <div className="flex items-center justify-between">
                                                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-md" />
                                                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                </div>
                                            </div>

                                            {/* Button */}
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                                <div className="h-9 w-full bg-slate-200 dark:bg-slate-700 rounded-md" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    displayedData.map((row: IRecap) => {
                                        const dt = new Date(row.created_at!)
                                        const localeString = locale === 'id' ? 'id-ID' : 'en-US'
                                        const tanggal = dt.toLocaleDateString(localeString, {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        })
                                        const jam = dt.toLocaleTimeString('id-ID', {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })

                                        // Get result from database conclusion field
                                        const getResultFromConclusion = (conclusion?: string) => {
                                            switch (conclusion?.toLowerCase()) {
                                                case 'excellent':
                                                    return { text: t("hasil-setoran.excellent"), color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
                                                case 'very good':
                                                    return { text: t("hasil-setoran.very_good"), color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
                                                case 'good':
                                                    return { text: t("hasil-setoran.good"), color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
                                                case 'pass':
                                                    return { text: t("hasil-setoran.pass"), color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" }
                                                case 'weak':
                                                    return { text: t("hasil-setoran.weak"), color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" }
                                                case 'not pass':
                                                    return { text: t("hasil-setoran.not_pass"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
                                                default:
                                                    // Fallback: if no conclusion, determine by mistakes count
                                                    const mistakesCount = row.mistakes?.length || 0
                                                    if (mistakesCount === 0) return { text: t("hasil-setoran.excellent"), color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
                                                    if (mistakesCount <= 2) return { text: t("hasil-setoran.very_good"), color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
                                                    if (mistakesCount <= 4) return { text: t("hasil-setoran.good"), color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
                                                    if (mistakesCount <= 6) return { text: t("hasil-setoran.pass"), color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" }
                                                    if (mistakesCount <= 8) return { text: t("hasil-setoran.weak"), color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" }
                                                    return { text: t("hasil-setoran.not_pass"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
                                            }
                                        }

                                        const result = getResultFromConclusion(row.conclusion)

                                        return (
                                            <div key={row.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("hasil-setoran.time")}:</span>
                                                        <span className="text-sm text-slate-700 dark:text-slate-200">{tanggal} {jam}</span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                                {t("hasil-setoran.reciter")}:
                                                            </span>
                                                            <span className="text-sm text-slate-700 dark:text-slate-200">
                                                                <Link href={`/profile/${row.reciter?.username?.replace(/^@/, '') || ''}`}>
                                                                    {row.reciter?.nickname ? `${row.reciter?.nickname} - ${row.reciter?.name}` : row.reciter?.name}
                                                                </Link>
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                                {t("hasil-setoran.recipient")}:
                                                            </span>
                                                            <span className="text-sm text-slate-700 dark:text-slate-200">
                                                                <Link href={`/profile/${row.examiner?.username?.replace(/^@/, '') || ''}`}>
                                                                    {row.examiner?.nickname ? `${row.examiner?.nickname} - ${row.examiner?.name}` : row.examiner?.name}
                                                                </Link>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start justify-between">
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("hasil-setoran.recite")}:</span>
                                                        <span className="text-sm text-slate-700 dark:text-slate-200 text-right capitalize">
                                                            {formatMemorizationDisplay(row.memorization, row.recitation_type)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("hasil-setoran.result")}:</span>
                                                        <Badge className={`${result.color} border-0 font-medium text-xs`}>
                                                            {result.text}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("hasil-setoran.signature")}:</span>
                                                        <div>
                                                            {row.id && parafStatuses[row.id] ? (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <div
                                                                            className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 border border-green-300 dark:bg-green-900/30 dark:border-green-600"
                                                                            title={t("hasil-setoran.signature_already_given")}
                                                                        >
                                                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                        </div>
                                                                    </PopoverTrigger>

                                                                    <PopoverContent className="bg-white dark:bg-slate-900 shadow-lg rounded-xl p-4 w-64 border border-slate-200 dark:border-slate-700">
                                                                        <div className="flex items-center gap-3">
                                                                            <Link
                                                                                href={`/profile/${row.signed_by?.username?.replace(/^@/, '')}`}
                                                                                className="relative flex justify-center items-center"
                                                                            >
                                                                                <div className="inline-block rounded-full ring-4 ring-slate-100 dark:ring-slate-700">
                                                                                    <UserAvatar
                                                                                        user={{
                                                                                            id: row.signed_by?.id || '',
                                                                                            name: row.signed_by?.name || null,
                                                                                            username: row.signed_by?.username || null,
                                                                                            avatar: row.signed_by?.avatar || null,
                                                                                        }}
                                                                                        size="md"
                                                                                    />
                                                                                </div>
                                                                            </Link>
                                                                            <div className="flex flex-col">
                                                                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                                                    {row.signed_by?.name || 'unknown'}
                                                                                </span>
                                                                                <span className="text-sm text-slate-500">
                                                                                    @{row.signed_by?.username?.replace(/^@/, '') || 'unknown'}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                                                                            <p className="text-xs text-slate-500">
                                                                                {t("hasil-setoran.signed_on")}
                                                                            </p>
                                                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                                                {formatDateWithHour(row.signed_at!)}
                                                                            </p>
                                                                        </div>
                                                                    </PopoverContent>

                                                                </Popover>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-6 w-6 p-0 rounded-full border hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-600"
                                                                    onClick={() => row.id && handleParafClick(row.id, parafStatuses[row.id] || false)}
                                                                    title={t("hasil-setoran.click_to_give_signature")}
                                                                >
                                                                    <Check className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full text-sm hover:text-white text-white bg-gradient-to-r from-emerald-600 to-teal-600 dark:text-slate-50"
                                                        onClick={() => router.push(`/setoran/recap/${row.id}`)}
                                                    >
                                                        Detail
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Global Pagination Controls */}
                            {!isLoading && (
                                <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        Menampilkan{" "}
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {filtered.length === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                                        </span>{" "}
                                        dari{" "}
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span>{" "}
                                        data
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage <= 1}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                            let p = i + 1
                                            if (totalPages > 5) {
                                                if (currentPage <= 3) p = i + 1
                                                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i
                                                else p = currentPage - 2 + i
                                            }
                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => {
                                                        if (p > totalPages && hasMore) loadMoreServerData()
                                                        setCurrentPage(p)
                                                    }}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                                                        currentPage === p
                                                            ? "bg-emerald-500 text-white"
                                                            : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        })}
                                        <button
                                            onClick={() => {
                                                if (currentPage >= totalPages && hasMore) loadMoreServerData()
                                                setCurrentPage(p => Math.min(totalPages, p + 1))
                                            }}
                                            disabled={currentPage >= totalPages && !hasMore}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </>
    )
}

export default function HasilSetoranTable() {
    return <HasilSetoranTableContent />
}

