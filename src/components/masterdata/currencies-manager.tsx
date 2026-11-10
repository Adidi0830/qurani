"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    DollarSign,
    Eye,
    AlertCircle,
    RotateCcw,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { masterdataApi, CurrencyData, CurrencyRequest } from "@/lib/api"
import { toast } from "sonner"

export function CurrenciesManager() {
    const { t } = useI18n()
    const router = useRouter()

    // AbortController ref for request cancellation
    const abortControllerRef = useRef<AbortController | null>(null)

    // Data state
    const [currencies, setCurrencies] = useState<CurrencyData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // UI state
    const [inputValue, setInputValue] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Filter state (applied)
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
    const [filterType, setFilterType] = useState<string>("all")

    // Filter modal state (temp / pending)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [tempFilterStatus, setTempFilterStatus] = useState<"all" | "active" | "inactive">("all")
    const [tempFilterType, setTempFilterType] = useState<string>("all")

    const handleOpenFilter = () => {
        setTempFilterStatus(filterStatus)
        setTempFilterType(filterType)
        setIsFilterModalOpen(true)
    }

    const handleSaveFilter = () => {
        setFilterStatus(tempFilterStatus)
        setFilterType(tempFilterType)
        setCurrentPage(1)
        setIsFilterModalOpen(false)
    }

    const handleCancelFilter = () => {
        setTempFilterStatus(filterStatus)
        setTempFilterType(filterType)
        setIsFilterModalOpen(false)
    }

    const isFilterActive = filterStatus !== "all" || filterType !== "all"

    // Create modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<Partial<CurrencyRequest>>({
        name: "",
        code: "",
        symbol: "",
        symbolNative: "",
        decimalDigits: 2,
        namePlural: "",
        type: "",
    })

    const resetForm = () => setFormData({
        name: "",
        code: "",
        symbol: "",
        symbolNative: "",
        decimalDigits: 2,
        namePlural: "",
        type: "",
    })

    // Create currency handler
    const handleCreateCurrency = async () => {
        if (!formData.name?.trim() || !formData.code?.trim()) {
            toast.error("Name and Code are required")
            return
        }
        if (isSubmitting) return // prevent duplicate
        setIsSubmitting(true)
        try {
            const response = await masterdataApi.currencies.create(formData as CurrencyRequest)
            if (response.success || response.data) {
                await fetchCurrencies()
                setIsCreateModalOpen(false)
                resetForm()
                toast.success("Currency created successfully")
            } else {
                toast.error("Failed to create currency")
            }
        } catch (err) {
            console.error("Error creating currency:", err)
            toast.error(err instanceof Error ? err.message : "Failed to create currency")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Fetch currencies
    const fetchCurrencies = useCallback(async () => {
        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Create new AbortController
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)

        try {
            const response = await masterdataApi.currencies.getAll(
                undefined,
                undefined,
                abortControllerRef.current.signal
            )

            if (response && response.success && response.data) {
                const data = Array.isArray(response.data) ? response.data : []
                setCurrencies(data)
            } else {
                setCurrencies([])
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return
            console.error("Error fetching currencies:", err)
            setError("Failed to load currencies")
            toast.error("Failed to load currencies")
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial fetch
    useEffect(() => {
        fetchCurrencies()

        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [fetchCurrencies])

    // Filter currencies by search + filters, sort by ID
    const filteredCurrencies = useMemo(() => {
        let filtered = currencies

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(currency =>
                currency.name.toLowerCase().includes(q) ||
                currency.code.toLowerCase().includes(q) ||
                currency.symbol?.toLowerCase().includes(q)
            )
        }

        // Status filter
        if (filterStatus === "active") {
            filtered = filtered.filter(c => (c as any).isActive === 1 || (c as any).isActive === true)
        } else if (filterStatus === "inactive") {
            filtered = filtered.filter(c => (c as any).isActive !== 1 && (c as any).isActive !== true)
        }

        // Type filter
        if (filterType !== "all") {
            filtered = filtered.filter(c => (c as any).type?.toLowerCase() === filterType.toLowerCase())
        }

        // Sort by ID (ascending)
        return [...filtered].sort((a, b) => a.id - b.id)
    }, [currencies, searchQuery, filterStatus, filterType])

    // Derive unique types from data
    const availableTypes = useMemo(() => {
        const types = new Set<string>()
        currencies.forEach(c => {
            if ((c as any).type) types.add((c as any).type)
        })
        return Array.from(types).sort()
    }, [currencies])

    // Pagination
    const totalPages = Math.ceil(filteredCurrencies.length / itemsPerPage)
    const displayedCurrencies = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredCurrencies.slice(start, start + itemsPerPage)
    }, [filteredCurrencies, currentPage])

    const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)))

    // Handle search button click
    const handleSearch = () => {
        setSearchQuery(inputValue)
        setCurrentPage(1)
    }

    // Handle Enter key in search input
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    // Loading state (Skeleton)
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* Search Bar Skeleton */}
                <div className="flex gap-2 sm:gap-3 items-center mb-6">
                    <Skeleton className="h-10 flex-1" />
                </div>

                {/* Table Skeleton */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="h-12 bg-emerald-600/10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-4">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 flex-1" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (error && currencies.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={fetchCurrencies} variant="outline">
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Currencies</h1>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="flex flex-1 sm:flex-none sm:w-64 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                            <div className="relative flex-1 bg-white dark:bg-gray-900">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search by name, code, or symbol..."
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
                                {t("common.filter", "Filter")}
                            </span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Button
                            onClick={() => { resetForm(); setIsCreateModalOpen(true) }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t("common.create", "Create")}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {filteredCurrencies.length === 0 ? (
                        <div className="p-12 text-center">
                            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20 text-gray-400" />
                            <p className="text-gray-500">
                                {searchQuery || isFilterActive ? "No currencies match your search/filter." : "No currencies found."}
                            </p>
                            {isFilterActive && (
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFilterStatus("all"); setFilterType("all") }}>
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                    <TableHead className="w-20 text-white font-bold">ID</TableHead>
                                    <TableHead className="min-w-[200px] text-white font-bold">Name</TableHead>
                                    <TableHead className="w-[120px] text-white font-bold">Symbol</TableHead>
                                    <TableHead className="w-[100px] text-white font-bold">Code</TableHead>
                                    <TableHead className="w-[100px] text-white font-bold">Decimals</TableHead>
                                    <TableHead className="w-[120px] text-center text-white font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedCurrencies.map((currency) => (
                                    <TableRow
                                        key={currency.id}
                                        className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                                        onClick={() => router.push(`/master/currencies/${currency.id}`)}
                                    >
                                        {/* ID Column */}
                                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                            #{currency.id}
                                        </TableCell>

                                        {/* Name Column */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                    {currency.majorSymbol || currency.code.substring(0, 1)}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {currency.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600 dark:text-gray-400">
                                            {currency.majorSymbol || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {currency.code}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-600 dark:text-gray-400">
                                            {currency.decimalPlaces ?? 2}
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="inline-flex items-center rounded overflow-hidden border border-emerald-600 text-[11px] h-6">
                                                <button
                                                    className="flex items-center gap-0.5 px-1.5 h-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/master/currencies/${currency.id}/edit`) }}
                                                >
                                                    <Pencil className="w-2.5 h-2.5" />
                                                    Edit
                                                </button>
                                                <div className="w-px h-full bg-emerald-500" />
                                                <button
                                                    className="flex items-center gap-0.5 px-1.5 h-full bg-emerald-600 hover:bg-red-600 text-white transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); /* TODO: delete */ }}
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

                {/* Pagination Controls */}
                {filteredCurrencies.length > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap justify-center sm:justify-start">
                            <span>Menampilkan <span className="font-bold text-emerald-600">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredCurrencies.length)}</span> dari <span className="font-bold text-gray-700 dark:text-gray-200">{filteredCurrencies.length}</span> data</span>
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

            {/* Create Currency Dialog */}
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => { setIsCreateModalOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Create New Currency
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="cur-name">Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="cur-name"
                                placeholder="e.g. United States Dollar"
                                value={formData.name ?? ""}
                                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>

                        {/* Code */}
                        <div className="space-y-1.5">
                            <Label htmlFor="cur-code">Code <span className="text-red-500">*</span></Label>
                            <Input
                                id="cur-code"
                                placeholder="e.g. USD"
                                maxLength={10}
                                value={formData.code ?? ""}
                                onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                            />
                        </div>

                        {/* Symbol & Symbol Native */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cur-symbol">Symbol</Label>
                                <Input
                                    id="cur-symbol"
                                    placeholder="e.g. $"
                                    value={formData.symbol ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, symbol: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cur-symbol-native">Native Symbol</Label>
                                <Input
                                    id="cur-symbol-native"
                                    placeholder="e.g. $"
                                    value={formData.symbolNative ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, symbolNative: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Decimal Digits & Name Plural */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cur-decimal">Decimal Digits</Label>
                                <Input
                                    id="cur-decimal"
                                    type="number"
                                    min={0}
                                    max={10}
                                    placeholder="2"
                                    value={formData.decimalDigits ?? 2}
                                    onChange={(e) => setFormData(p => ({ ...p, decimalDigits: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cur-type">Type</Label>
                                <Input
                                    id="cur-type"
                                    placeholder="e.g. fiat"
                                    value={formData.type ?? ""}
                                    onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Name Plural */}
                        <div className="space-y-1.5">
                            <Label htmlFor="cur-plural">Name Plural</Label>
                            <Input
                                id="cur-plural"
                                placeholder="e.g. US dollars"
                                value={formData.namePlural ?? ""}
                                onChange={(e) => setFormData(p => ({ ...p, namePlural: e.target.value }))}
                            />
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
                            onClick={handleCreateCurrency}
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
                            Filter Currencies
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

                        {/* Type */}
                        {availableTypes.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type</Label>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => setTempFilterType("all")}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                                            tempFilterType === "all"
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                                        )}
                                    >
                                        All
                                    </button>
                                    {availableTypes.map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setTempFilterType(type)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-sm font-medium border transition-all capitalize",
                                                tempFilterType === type
                                                    ? "bg-emerald-600 text-white border-emerald-600"
                                                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={handleCancelFilter}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveFilter}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
