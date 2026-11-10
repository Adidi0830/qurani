"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/providers/i18n-provider"
import { masterdataApi, StateData, StateRequest, CountryData, CountriesApiResponse } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Plus,
    Pencil,
    Trash2,
    Filter,
    Loader2,
    Building2,
    Search,
    MoreHorizontal,
    AlertCircle,
    MapPin,
    Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination"
import { Combobox } from "@/components/ui/combobox"

// Items per page options


// State types for filtering
const STATE_TYPES = [
    "All",
    "State",
    "Province",
    "Region",
    "Territory",
    "District",
    "Department",
    "Prefecture",
    "County",
    "Municipality"
]

export function StatesManager() {
    const { t } = useI18n()
    const router = useRouter()

    // Data states
    const [states, setStates] = useState<StateData[]>([])
    const [countries, setCountries] = useState<CountryData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filter states
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>("all")
    const [selectedType, setSelectedType] = useState<string>("All")

    // Search states
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [inputValue, setInputValue] = useState<string>("")
    const [searchResults, setSearchResults] = useState<StateData[] | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const searchAbortRef = useRef<AbortController | null>(null)

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 15 // Fixed items per page

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null)

    // Form states
    const [editingStateId, setEditingStateId] = useState<number | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<Partial<StateRequest>>({
        name: "",
        countryId: 0,
        country: "",
        countryCode: "",
        iso2: "",
        type: "",
    })

    // Temporary filter states
    const [tempCountryCode, setTempCountryCode] = useState<string>("all")
    const [tempType, setTempType] = useState<string>("All")

    // Refs
    const abortControllerRef = useRef<AbortController | null>(null)



    // Reset form
    const resetForm = useCallback(() => {
        setFormData({
            name: "",
            countryId: 0,
            country: "",
            countryCode: "",
            iso2: "",
            type: "",
        })
    }, [])

    // Fetch countries for dropdown
    const fetchCountries = useCallback(async () => {
        try {
            const response = await masterdataApi.countries.getAll()
            if (response && response.success && response.data) {
                setCountries(response.data)
            }
        } catch (err) {
            console.error("Failed to fetch countries:", err)
        }
    }, [])

    // Fetch states from Supabase-backed API (includes citiesCount, sorted by ID)
    const fetchStates = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            if (selectedCountryCode && selectedCountryCode !== 'all') {
                params.set('countryCode', selectedCountryCode)
            }

            const res = await fetch(`/api/masterdata/states?${params.toString()}`, {
                signal: abortControllerRef.current.signal
            })

            if (!res.ok) throw new Error(`Failed to fetch states: ${res.status}`)

            const json = await res.json()
            const allStates: StateData[] = json.success && Array.isArray(json.data) ? json.data : []

            setStates(allStates)
            console.log(`✅ Loaded ${allStates.length} states`)
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return
            const errorMsg = err instanceof Error ? err.message : "Failed to fetch states"
            setError(errorMsg)
            console.error("Failed to fetch states:", err)
        } finally {
            setIsLoading(false)
        }
    }, [selectedCountryCode])

    // Initial data load - fetch both countries and states on mount
    useEffect(() => {
        fetchCountries()
        fetchStates()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Refetch states when filter changes
    useEffect(() => {
        // Skip initial render
        if (selectedCountryCode !== "all") {
            fetchStates()
        }
    }, [selectedCountryCode, fetchStates])

    // Search states using Supabase-backed API
    const searchStates = useCallback(async (keyword: string) => {
        // Cancel any pending search request
        if (searchAbortRef.current) {
            searchAbortRef.current.abort()
        }

        // If keyword is empty or too short, clear search results
        if (!keyword.trim() || keyword.trim().length < 2) {
            setSearchResults(null)
            setIsSearching(false)
            return
        }

        // Create new AbortController for this search
        searchAbortRef.current = new AbortController()
        setIsSearching(true)

        try {
            const params = new URLSearchParams({ q: keyword.trim(), limit: '50' })
            if (selectedCountryCode && selectedCountryCode !== 'all') {
                params.set('countryCode', selectedCountryCode)
            }

            const res = await fetch(`/api/masterdata/states/search?${params.toString()}`, {
                signal: searchAbortRef.current.signal
            })

            if (!res.ok) throw new Error(`Search failed: ${res.status}`)

            const json = await res.json()
            const searchItems: StateData[] = json.success && Array.isArray(json.data) ? json.data : []

            if (searchItems.length > 0) {
                setSearchResults(searchItems)
            } else {
                // Fallback to client-side filter if API returns empty
                setSearchResults(null)
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return
            console.warn('Search states error:', err)
            setSearchResults(null)
        } finally {
            setIsSearching(false)
        }
    }, [selectedCountryCode])

    // Search effect - triggers immediately when searchQuery changes (only on button click/Enter)
    useEffect(() => {
        searchStates(searchQuery)
    }, [searchQuery, searchStates])

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

    // Enrich states with country names from countries lookup
    const enrichedStates = useMemo(() => {
        return states.map(state => {
            // If country name is missing, lookup from countries
            if (!state.country && state.countryCode) {
                const countryData = countries.find(c => c.iso2 === state.countryCode)
                if (countryData) {
                    return {
                        ...state,
                        country: countryData.name
                    }
                }
            }
            return state
        })
    }, [states, countries])

    // Filter states - use search API results if available, otherwise client-side filter
    const filteredStates = useMemo(() => {
        let result: StateData[]

        if (searchQuery.trim().length >= 3 && searchResults !== null) {
            // Use API search results, enrich them with country names
            result = searchResults.map(state => {
                if (!state.country && state.countryCode) {
                    const countryData = countries.find(c => c.iso2 === state.countryCode)
                    if (countryData) {
                        return { ...state, country: countryData.name }
                    }
                }
                return state
            })
        } else if (searchQuery.trim().length >= 3) {
            // Fallback client-side filter while API is loading or for short queries
            const query = searchQuery.toLowerCase()
            result = enrichedStates.filter(state =>
                state.name.toLowerCase().includes(query) ||
                state.countryCode?.toLowerCase().includes(query) ||
                state.country?.toLowerCase().includes(query)
            )
        } else {
            // No search query - use enriched states
            result = enrichedStates
        }

        // Type filter (always apply on top of search results)
        if (selectedType && selectedType !== "All") {
            result = result.filter(state =>
                state.type?.toLowerCase() === selectedType.toLowerCase()
            )
        }

        // Sort by ID (ascending) - create new array to avoid mutation
        const sorted = [...result].sort((a, b) => a.name.localeCompare(b.name))
        console.log('🔢 States sorted by ID:', sorted.slice(0, 5).map(s => ({ id: s.id, name: s.name })))
        return sorted
    }, [enrichedStates, selectedType, searchQuery, searchResults, countries])

    // Paginated states
    const paginatedStates = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize
        return filteredStates.slice(startIndex, startIndex + pageSize)
    }, [filteredStates, currentPage, pageSize])

    // Total pages
    const totalPages = useMemo(() => {
        return Math.ceil(filteredStates.length / pageSize)
    }, [filteredStates.length, pageSize])

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedCountryCode, selectedType])

    // Filter modal handlers
    const handleOpenFilterModal = () => {
        setTempCountryCode(selectedCountryCode)
        setTempType(selectedType)
        setIsFilterModalOpen(true)
    }

    const handleApplyFilter = () => {
        setSelectedCountryCode(tempCountryCode)
        setSelectedType(tempType)
        setIsFilterModalOpen(false)
    }

    const handleResetFilter = () => {
        setTempCountryCode("all")
        setTempType("All")
    }

    const handleCancelFilter = () => {
        setIsFilterModalOpen(false)
    }

    // CRUD Handlers
    const handleCreateState = async () => {
        // Validate required fields
        if (!formData.name || !formData.countryId || !formData.country || !formData.countryCode) {
            toast.error(t("masterdata.states.all_fields_required", "All fields with * are required"))
            return
        }

        setIsSubmitting(true)

        try {
            const response = await masterdataApi.states.create(formData as StateRequest)

            if (response.success || response.data) {
                await fetchStates()
                setIsCreateModalOpen(false)
                resetForm()
                toast.success(t("masterdata.states.create_success", "State created successfully"))
            } else {
                throw new Error(response.message || "Failed to create state")
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to create state"
            setError(errorMsg)
            toast.error(t("masterdata.states.create_error", errorMsg))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOpenEditModal = (state: StateData) => {
        setEditingStateId(state.id)
        setFormData({
            name: state.name,
            countryId: state.countryId,
            country: state.country || "",
            countryCode: state.countryCode || "",
            iso2: state.iso2 || "",
            type: state.type || "",
        })
        setIsEditModalOpen(true)
    }

    const handleUpdateState = async () => {
        if (!editingStateId || !formData.name || !formData.countryId || !formData.country || !formData.countryCode) {
            toast.error(t("masterdata.states.all_fields_required", "All fields with * are required"))
            return
        }

        setIsSubmitting(true)

        try {
            const response = await masterdataApi.states.update(editingStateId, formData as StateRequest)

            if (response.success || response.data) {
                await fetchStates()
                setIsEditModalOpen(false)
                resetForm()
                setEditingStateId(null)
                toast.success(t("masterdata.states.update_success", "State updated successfully"))
            } else {
                throw new Error(response.message || "Failed to update state")
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to update state"
            setError(errorMsg)
            toast.error(t("masterdata.states.update_error", errorMsg))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOpenDeleteDialog = (state: StateData) => {
        setItemToDelete({ id: state.id, name: state.name })
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return

        setIsDeleting(true)

        try {
            await masterdataApi.states.delete(itemToDelete.id)
            await fetchStates()
            toast.success(t("masterdata.states.delete_success", `"${itemToDelete.name}" deleted successfully`))
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to delete state"
            toast.error(t("masterdata.states.delete_error", errorMsg))
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        }
    }

    // Handle country selection in form
    const handleCountryChange = (countryId: string) => {
        const country = countries.find(c => c.id.toString() === countryId)
        if (country) {
            setFormData({
                ...formData,
                countryId: country.id,
                country: country.name,
                countryCode: country.iso2 || "",
            })
        }
    }

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (selectedCountryCode !== "all") count++
        if (selectedType !== "All") count++
        return count
    }, [selectedCountryCode, selectedType])

    return (
        <div className="space-y-6">
            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div className="flex-1">
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchStates}
                        className="text-red-600 hover:text-red-700"
                    >
                        Try Again
                    </Button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        States
                    </h1>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("common.create", "Create")}
                </Button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="flex flex-1 sm:flex-none sm:w-64 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                        <div className="relative flex-1 bg-white dark:bg-gray-900">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search by name, state code..."
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
                            {isSearching ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Cari"
                            )}
                        </Button>
                    </div>

                    {/* Filter Button */}
                    <Button
                        variant="outline"
                        onClick={handleOpenFilterModal}
                        className={cn(
                            "flex items-center gap-2 shrink-0 h-10 bg-white dark:bg-gray-900 relative",
                            activeFilterCount > 0
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">
                            {t("common.filter", "Filter")}
                        </span>
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="h-12 bg-emerald-600/10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-4">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 flex-1" />
                        </div>
                    ))}
                </div>
            ) : filteredStates.length === 0 ? (
                <div className="text-center py-12">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No states found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {selectedCountryCode !== "all" || selectedType !== "All"
                            ? "Try adjusting your filter criteria"
                            : "Get started by creating your first state"}
                    </p>
                    {selectedCountryCode === "all" && selectedType === "All" && (
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create State
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {/* States Grid */}
                    {/* States Table */}
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                    <TableHead className="w-20 text-white font-bold">No.</TableHead>
                                    <TableHead className="min-w-[200px] text-white font-bold">State Name</TableHead>
                                    <TableHead className="w-[180px] text-white font-bold">Country</TableHead>
                                    <TableHead className="w-32 text-white font-bold">Type</TableHead>
                                    <TableHead className="w-24 text-center text-white font-bold">Cities</TableHead>
                                    <TableHead className="w-24 text-white font-bold">ISO Code</TableHead>
                                    <TableHead className="w-[120px] text-center text-white font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedStates.map((state, index) => (
                                    <TableRow
                                        key={state.id}
                                        className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                                        onClick={() => router.push(`/master/states/${state.id}`)}
                                    >
                                        {/* ID Column */}
                                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                            #{(currentPage - 1) * pageSize + index + 1}
                                        </TableCell>

                                        {/* State Name Column */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                    {state.iso2 || (state.name ? state.name.substring(0, 2).toUpperCase() : "ST")}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {state.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                {countries.find(c => c.id === state.countryId)?.emoji && (
                                                    <span className="text-base">{countries.find(c => c.id === state.countryId)?.emoji}</span>
                                                )}
                                                <span>{state.country || "Unknown"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {state.type || "State"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium">
                                                <Building2 className="w-3.5 h-3.5" />
                                                {state.citiesCount || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-900 dark:text-white">
                                            {state.iso2 || state.countryCode || "-"}
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="inline-flex items-center rounded overflow-hidden border border-emerald-600 text-[11px] h-6">
                                                <button
                                                    className="flex items-center gap-0.5 px-1.5 h-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/master/states/${state.id}/edit`) }}
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
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-10 flex justify-center">
                            <Pagination>
                                <PaginationContent className="gap-2">
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            size="lg"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                if (currentPage > 1) setCurrentPage(p => p - 1)
                                            }}
                                            className={cn(
                                                "h-11 px-5 text-base",
                                                currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                                            )}
                                        />
                                    </PaginationItem>

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
                                            <PaginationItem key={pageNum}>
                                                <PaginationLink
                                                    href="#"
                                                    size="lg"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        setCurrentPage(pageNum)
                                                    }}
                                                    isActive={currentPage === pageNum}
                                                    className={cn(
                                                        "h-11 w-11 text-base cursor-pointer",
                                                        currentPage === pageNum && "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md"
                                                    )}
                                                >
                                                    {pageNum}
                                                </PaginationLink>
                                            </PaginationItem>
                                        )
                                    })}

                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            size="lg"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                if (currentPage < totalPages) setCurrentPage(p => p + 1)
                                            }}
                                            className={cn(
                                                "h-11 px-5 text-base",
                                                currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                            )}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}

                </>
            )}

            {/* Filter Modal */}
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("common.filter", "Filter")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Country</Label>
                            <Combobox
                                options={[
                                    { label: "All Countries", value: "all" },
                                    ...countries.map(c => ({
                                        label: c.name,
                                        value: c.iso2 || c.id.toString(),
                                        emoji: c.emoji || undefined
                                    }))
                                ]}
                                value={tempCountryCode}
                                onValueChange={setTempCountryCode}
                                placeholder="Select Country"
                                searchPlaceholder="Search country..."
                            />
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Combobox
                                options={STATE_TYPES.map(type => ({ label: type, value: type }))}
                                value={tempType}
                                onValueChange={setTempType}
                                placeholder="Select Type"
                                searchPlaceholder="Search type..."
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={handleCancelFilter}>
                            Cancel
                        </Button>
                        <Button onClick={handleApplyFilter} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t("masterdata.states.create_title", "Create New State")}</DialogTitle>
                        <DialogDescription>
                            {t("masterdata.states.create_description", "Add a new state or province to the system.")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="name">State Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. California"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="country">Country *</Label>
                                <Combobox
                                    options={countries.map(c => ({
                                        label: c.name,
                                        value: c.id.toString(),
                                        emoji: c.emoji || undefined
                                    }))}
                                    value={formData.countryId?.toString() || ""}
                                    onValueChange={(val) => handleCountryChange(val)}
                                    placeholder="Select Country"
                                    searchPlaceholder="Search country..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="iso2">ISO2 Code</Label>
                                <Input
                                    id="iso2"
                                    value={formData.iso2 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    placeholder="e.g. CA"
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={formData.type || ""}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATE_TYPES.filter(t => t !== "All").map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateState}
                            disabled={!formData.name || !formData.countryId || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t("masterdata.states.edit_title", "Edit State")}</DialogTitle>
                        <DialogDescription>
                            {t("masterdata.states.edit_description", "Update state information.")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="edit-name">State Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="edit-country">Country *</Label>
                                <Select
                                    value={formData.countryId?.toString() || ""}
                                    onValueChange={handleCountryChange}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map((country) => (
                                            <SelectItem key={country.id} value={country.id.toString()}>
                                                {country.name} ({country.iso2})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit-iso2">ISO2 Code</Label>
                                <Input
                                    id="edit-iso2"
                                    value={formData.iso2 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-type">Type</Label>
                                <Select
                                    value={formData.type || ""}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATE_TYPES.filter(t => t !== "All").map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsEditModalOpen(false); resetForm(); setEditingStateId(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateState}
                            disabled={!formData.name || !formData.countryId || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("masterdata.states.delete_title", "Delete State")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("masterdata.states.delete_confirm", `Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
