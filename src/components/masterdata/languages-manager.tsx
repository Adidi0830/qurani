"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Plus,
    Filter,
    Search,
    Loader2,
    AlertCircle,
    RotateCcw,
    Languages,
    Eye,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { masterdataApi, LanguageData, LanguageRequest } from "@/lib/api"

export function LanguagesManager() {
    const router = useRouter()
    const abortControllerRef = useRef<AbortController | null>(null)

    // Data state
    const [languages, setLanguages] = useState<LanguageData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Search state
    const [inputValue, setInputValue] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Filter state (applied)
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
    const [filterDirection, setFilterDirection] = useState<"all" | "ltr" | "rtl">("all")

    // Filter modal state (temp / pending)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [tempFilterStatus, setTempFilterStatus] = useState<"all" | "active" | "inactive">("all")
    const [tempFilterDirection, setTempFilterDirection] = useState<"all" | "ltr" | "rtl">("all")

    const handleOpenFilter = () => {
        setTempFilterStatus(filterStatus)
        setTempFilterDirection(filterDirection)
        setIsFilterModalOpen(true)
    }

    const handleSaveFilter = () => {
        setFilterStatus(tempFilterStatus)
        setFilterDirection(tempFilterDirection)
        setCurrentPage(1)
        setIsFilterModalOpen(false)
    }

    const handleCancelFilter = () => {
        setTempFilterStatus(filterStatus)
        setTempFilterDirection(filterDirection)
        setIsFilterModalOpen(false)
    }

    const isFilterActive = filterStatus !== "all" || filterDirection !== "all"

    // Create modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [langToDelete, setLangToDelete] = useState<{ id: string; name: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [formData, setFormData] = useState<Partial<LanguageRequest>>({
        id: "",
        name: "",
        nativeName: "",
        direction: "ltr",
        iso639_2: "",
        iso639_3: "",
        family: "",
        flagEmoji: "",
        script: "",
        primaryCountry: "",
        speakers: undefined,
    })

    const resetForm = () => setFormData({
        id: "",
        name: "",
        nativeName: "",
        direction: "ltr",
        iso639_2: "",
        iso639_3: "",
        family: "",
        flagEmoji: "",
        script: "",
        primaryCountry: "",
        speakers: undefined,
    })

    const handleCreateLanguage = async () => {
        if (!formData.id?.trim() || !formData.name?.trim()) {
            toast.error("Language Code (ID) and Name are required")
            return
        }
        if (!formData.direction) {
            toast.error("Direction is required")
            return
        }
        // id → UPPERCASE (API stores codes as uppercase: EN, AR, IDN, etc.)
        const newId = formData.id.trim().toUpperCase()
        // Check if ID already exists in loaded list
        const duplicate = languages.find(l => l.id.toUpperCase() === newId)
        if (duplicate) {
            toast.error(`Language code "${newId}" already exists (${duplicate.name || duplicate.id})`, { duration: 6000 })
            return
        }
        if (isSubmitting) return
        setIsSubmitting(true)
        try {
            // Build payload with ALL fields — exactly matching the API's expected format
            const requestData: LanguageRequest = {
                id: newId,                                                      // UPPERCASE: EN, AR, IDN
                iso639_2: formData.iso639_2?.trim().toLowerCase() || null,     // lowercase 3 chars: eng, ara
                iso639_3: formData.iso639_3?.trim().toLowerCase() || null,     // lowercase 3 chars: eng, ara
                name: formData.name.trim(),
                nativeName: formData.nativeName?.trim() || null,
                script: formData.script?.trim() || null,
                scriptCode: null,
                direction: (formData.direction || "LTR").toUpperCase(),        // UPPERCASE: LTR or RTL
                family: formData.family?.trim() || null,
                speakers: formData.speakers !== null && formData.speakers !== undefined
                    ? String(formData.speakers)                                // send as string — API accepts string "1000000"
                    : null,
                primaryCountry: formData.primaryCountry?.trim() || null,
                countries: null,
                pluralRules: null,
                dateFormat: null,
                timeFormat: null,
                numberFormat: null,
                isActive: 1,
                isFullyTranslated: 0,
                translationPercent: 0,
                isDefault: 0,
                displayOrder: 1,
                FlagEmoji: null,                                               // removed from form, always null
                notes: null,
            }

            console.log('[Create Language] Sending payload:', JSON.stringify(requestData, null, 2))

            const response = await masterdataApi.languages.create(requestData)
            if (response.success || response.data) {
                await fetchLanguages()
                setIsCreateModalOpen(false)
                resetForm()
                toast.success("Language created successfully")
            } else {
                toast.error("Failed to create language")
            }
        } catch (err) {
            console.error("Error creating language:", err)
            const msg = err instanceof Error ? err.message : "Failed to create language"
            toast.error(msg, { duration: 8000 })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Delete handler
    const handleDeleteClick = (lang: LanguageData) => {
        setLangToDelete({ id: lang.id, name: lang.name })
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!langToDelete || !langToDelete.id) {
            toast.error("Invalid language ID")
            return
        }
        setIsDeleting(true)
        try {
            const response = await masterdataApi.languages.delete(langToDelete.id)
            if (response.success) {
                await fetchLanguages()
                toast.success(`"${langToDelete.name}" deleted successfully`)
            } else {
                toast.error("Failed to delete language")
            }
        } catch (err) {
            console.error("Error deleting language:", err)
            const msg = err instanceof Error ? err.message : "Failed to delete language"
            toast.error(msg)
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setLangToDelete(null)
        }
    }

    // Fetch all languages
    const fetchLanguages = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)

        try {
            const response = await masterdataApi.languages.getAll(
                undefined,
                abortControllerRef.current.signal
            )

            if (response.success && response.data) {
                const data = Array.isArray(response.data) ? response.data : []
                setLanguages(data)
            } else {
                setLanguages([])
            }
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return
            console.error("Error fetching languages:", err)
            setError("Failed to load languages")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLanguages()
        return () => {
            abortControllerRef.current?.abort()
        }
    }, [fetchLanguages])

    // Client-side search + filter
    const filteredLanguages = useMemo(() => {
        let filtered = languages

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (lang) =>
                    lang.name.toLowerCase().includes(q) ||
                    lang.id.toLowerCase().includes(q) ||
                    lang.nativeName?.toLowerCase().includes(q) ||
                    lang.family?.toLowerCase().includes(q)
            )
        }

        // Status filter
        if (filterStatus === "active") {
            filtered = filtered.filter(lang => lang.isActive === 1)
        } else if (filterStatus === "inactive") {
            filtered = filtered.filter(lang => lang.isActive !== 1)
        }

        // Direction filter
        if (filterDirection !== "all") {
            filtered = filtered.filter(lang =>
                (lang.direction?.toLowerCase() || "ltr") === filterDirection
            )
        }

        return filtered
    }, [languages, searchQuery, filterStatus, filterDirection])

    // Pagination
    const totalPages = Math.ceil(filteredLanguages.length / itemsPerPage)
    const displayedLanguages = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredLanguages.slice(start, start + itemsPerPage)
    }, [filteredLanguages, currentPage])

    const goToPage = (page: number) =>
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))

    const handleSearch = () => {
        setSearchQuery(inputValue)
        setCurrentPage(1)
    }

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch()
    }

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    // Format speakers count (API returns/accepts as string or number)
    const formatSpeakers = (count?: string | number | null) => {
        if (count === null || count === undefined || count === '' || count === 0) return "—"
        const n = typeof count === 'string' ? parseInt(count, 10) : count
        if (isNaN(n)) return String(count)
        if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
        return n.toLocaleString()
    }

    // ====== RENDER ======

    // Skeleton loading state
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-8 w-40" />
                </div>

                {/* Search Skeleton */}
                <div className="flex gap-2 sm:gap-3 items-center mb-6">
                    <Skeleton className="h-10 flex-1" />
                </div>

                {/* Table Skeleton */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="h-12 bg-emerald-600/10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-4"
                        >
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 flex-1" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (error && languages.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={fetchLanguages} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header and Toolbar */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Languages</h1>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="flex flex-1 sm:flex-none sm:w-64 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                            <div className="relative flex-1 bg-white dark:bg-gray-900">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search by name, code, or language family..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white h-10"
                                />
                            </div>
                            <Button
                                onClick={handleSearch}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors rounded-none h-10 border-0"
                            >
                                Cari
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleOpenFilter}
                            className={cn(
                                "flex items-center gap-2 shrink-0 h-10 bg-white dark:bg-gray-900",
                                isFilterActive
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                Filter
                            </span>
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {displayedLanguages.length === 0 ? (
                        <div className="p-12 text-center">
                            <Languages className="w-12 h-12 mx-auto mb-3 opacity-20 text-gray-400" />
                            <p className="text-gray-500">
                                {searchQuery || isFilterActive
                                    ? "No languages match your search/filter."
                                    : "No languages found."}
                            </p>
                            {isFilterActive && (
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFilterStatus("all"); setFilterDirection("all") }}>
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                    <TableHead className="w-[25%] text-white font-bold pl-8">Name</TableHead>
                                    <TableHead className="w-[25%] text-white font-bold">Native Name</TableHead>
                                    <TableHead className="w-[10%] text-white font-bold text-center">Code</TableHead>
                                    <TableHead className="w-[10%] text-white font-bold text-center">Direction</TableHead>
                                    <TableHead className="w-[15%] text-white font-bold text-center">Status</TableHead>
                                    <TableHead className="w-[15%] text-center text-white font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedLanguages.map((lang) => (
                                    <TableRow
                                        key={lang.id}
                                        className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                                        onClick={() => router.push(`/master/languages/${lang.id}`)}
                                    >
                                        {/* Name Column */}
                                        <TableCell className="w-[25%] pl-8">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                    {lang.id.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                    {lang.name}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Native Name Column */}
                                        <TableCell className="w-[25%] text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                                            {lang.nativeName || "—"}
                                        </TableCell>

                                        {/* Code Column */}
                                        <TableCell className="w-[10%] text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {lang.flagEmoji && (
                                                    <span className="text-sm leading-none">{lang.flagEmoji}</span>
                                                )}
                                                <span className="font-mono font-semibold text-sm text-emerald-600 dark:text-emerald-400 uppercase">
                                                    {lang.id}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Direction Column */}
                                        <TableCell className="w-[10%] text-center">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                                                    lang.direction === "rtl"
                                                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                                )}
                                            >
                                                {lang.direction?.toUpperCase() || "LTR"}
                                            </span>
                                        </TableCell>

                                        {/* Family Column - Temporarily disabled */}
                                        {/* <TableCell className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] text-center">
                                            {lang.family || "—"}
                                        </TableCell> */}



                                        {/* Status Column */}
                                        <TableCell className="w-[15%] text-center">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                                                    lang.isActive === 1
                                                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                )}
                                            >
                                                {lang.isActive === 1 ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>

                                        {/* Actions Column */}
                                        <TableCell className="w-[15%] text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="inline-flex items-center rounded overflow-hidden border border-emerald-600 text-[11px] h-6">
                                                <button
                                                    className="flex items-center gap-0.5 px-1.5 h-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/master/languages/${lang.id}/edit`) }}
                                                >
                                                    <Pencil className="w-2.5 h-2.5" />
                                                    Edit
                                                </button>
                                                <div className="w-px h-full bg-emerald-500" />
                                                <button
                                                    className={cn(
                                                        "flex items-center gap-0.5 px-1.5 h-full transition-colors font-medium",
                                                        !lang.id
                                                            ? "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                                                            : "bg-emerald-600 hover:bg-red-600 text-white"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (lang.id) handleDeleteClick(lang);
                                                    }}
                                                    disabled={!lang.id}
                                                    title={!lang.id ? "Cannot delete: Missing Language Code" : "Delete Language"}
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Pagination */}
                {filteredLanguages.length > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap justify-center sm:justify-start">
                            <span>Menampilkan <span className="font-bold text-emerald-600">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredLanguages.length)}</span> dari <span className="font-bold text-gray-700 dark:text-gray-200">{filteredLanguages.length}</span> data</span>
                            <div className="flex items-center gap-2">
                                <span>Baris:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
                                    onClick={() => goToPage(Math.max(1, currentPage - 1))} 
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                
                                {/* Page Numbers */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number
                                    if (totalPages <= 5) {
                                        pageNum = i + 1
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i
                                    } else {
                                        pageNum = currentPage - 2 + i
                                    }
                                    return (
                                        <button 
                                            key={pageNum} 
                                            onClick={() => goToPage(pageNum)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg text-sm font-medium transition-colors border",
                                                currentPage === pageNum
                                                    ? "bg-emerald-500 text-white shadow-sm border-emerald-500"
                                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                })}

                                <button 
                                    onClick={() => goToPage(Math.min(totalPages, currentPage + 1))} 
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Language Dialog */}
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => { setIsCreateModalOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Languages className="w-4 h-4" />
                            Create New Language
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* ID (Language Code) & Name */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="lang-id">Language Code <span className="text-red-500">*</span></Label>
                                <Input
                                    id="lang-id"
                                    placeholder="e.g. EN, AR, IDN"
                                    maxLength={10}
                                    value={formData.id ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, id: e.target.value.toUpperCase() }))}
                                    className={cn(
                                        formData.id?.trim() && languages.find(l => l.id.toUpperCase() === formData.id!.trim().toUpperCase())
                                            ? "border-red-500 focus-visible:ring-red-500"
                                            : ""
                                    )}
                                />
                                {formData.id?.trim() && languages.find(l => l.id.toUpperCase() === formData.id!.trim().toUpperCase()) ? (
                                    <p className="text-xs text-red-500 font-medium">⚠ Code already exists</p>
                                ) : (
                                    <p className="text-xs text-gray-400">Uppercase code: EN, AR, IDN</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lang-name">Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="lang-name"
                                    placeholder="e.g. English"
                                    value={formData.name ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Native Name — full width, Flag Emoji removed (sent as null) */}
                        <div className="space-y-1.5">
                            <Label htmlFor="lang-native">Native Name</Label>
                            <Input
                                id="lang-native"
                                placeholder="e.g. Indonesia, العربية"
                                value={formData.nativeName ?? ""}
                                onChange={(e) => setFormData(p => ({ ...p, nativeName: e.target.value }))}
                            />
                        </div>


                        {/* Direction */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Direction <span className="text-red-500">*</span></Label>
                            <div className="flex gap-2">
                                {(["ltr", "rtl"] as const).map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, direction: d }))}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                                            formData.direction === d
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                                        )}
                                    >
                                        {d.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ISO codes & Family */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="lang-iso2">ISO 639-2</Label>
                                <Input
                                    id="lang-iso2"
                                    placeholder="e.g. eng"
                                    maxLength={3}
                                    value={formData.iso639_2 ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, iso639_2: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lang-iso3">ISO 639-3</Label>
                                <Input
                                    id="lang-iso3"
                                    placeholder="e.g. eng"
                                    maxLength={3}
                                    value={formData.iso639_3 ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, iso639_3: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lang-family">Language Family</Label>
                                <Input
                                    id="lang-family"
                                    placeholder="e.g. Indo-European"
                                    value={formData.family ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, family: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Script & Primary Country */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="lang-script">Script</Label>
                                <Input
                                    id="lang-script"
                                    placeholder="e.g. Latin, Arabic"
                                    value={formData.script ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, script: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lang-country">Primary Country</Label>
                                <Input
                                    id="lang-country"
                                    placeholder="e.g. US, ID"
                                    value={formData.primaryCountry ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, primaryCountry: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Speakers */}
                        <div className="space-y-1.5">
                            <Label htmlFor="lang-speakers">Speakers (estimated)</Label>
                            <Input
                                id="lang-speakers"
                                type="number"
                                min={0}
                                placeholder="e.g. 270000000"
                                value={formData.speakers ?? ""}
                                onChange={(e) => setFormData(p => ({ ...p, speakers: e.target.value || undefined }))}
                            />
                            <p className="text-xs text-gray-400">Perkiraan jumlah penutur bahasa ini</p>
                        </div>

                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => { setIsCreateModalOpen(false); resetForm() }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleCreateLanguage}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                            ) : (
                                <>Save</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Filter Dialog */}
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filter Languages
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Status */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                            <div className="flex gap-2 flex-wrap">
                                {(["all", "active", "inactive"] as const).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setTempFilterStatus(s)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                                            tempFilterStatus === s
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                                        )}
                                    >
                                        {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Direction */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Direction</Label>
                            <div className="flex gap-2 flex-wrap">
                                {(["all", "ltr", "rtl"] as const).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setTempFilterDirection(d)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-sm font-medium border transition-all uppercase",
                                            tempFilterDirection === d
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                                        )}
                                    >
                                        {d === "all" ? "All" : d.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={handleCancelFilter}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveFilter}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Delete Language
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                &quot;{langToDelete?.name}&quot;
                            </span>{" "}
                            ({langToDelete?.id})? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                            ) : (
                                <><Trash2 className="w-4 h-4 mr-2" />Delete</>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
