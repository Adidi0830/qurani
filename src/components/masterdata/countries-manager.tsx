"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination"
import { Combobox } from "@/components/ui/combobox"
import {
    Plus,
    Search,
    Filter,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    Pencil,
    Trash2,
    MapPin,
    Building2,
    RotateCcw,
    X,
    Loader2,
    RefreshCw,
    AlertCircle,
    MoreHorizontal,
    Eye
} from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { masterdataApi, CountryData, CountryRequest } from "@/lib/api"
import { toast } from "sonner"

const REGIONS = [
    "All",
    "Africa",
    "Americas",
    "Asia",
    "Europe",
    "Oceania"
]

export function CountriesManager() {
    const { t } = useI18n()
    const router = useRouter()

    // AbortController ref for request cancellation
    const abortControllerRef = useRef<AbortController | null>(null)

    // Data state
    const [countries, setCountries] = useState<CountryData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Search API state
    const [searchResults, setSearchResults] = useState<CountryData[] | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const searchAbortRef = useRef<AbortController | null>(null)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // UI states
    const [searchQuery, setSearchQuery] = useState("")
    const [inputValue, setInputValue] = useState("")
    const [selectedRegion, setSelectedRegion] = useState("All")
    const [tempRegion, setTempRegion] = useState("All")
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [expandedCountries, setExpandedCountries] = useState<Set<number>>(new Set())

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10) // Fixed items per page

    // Form state for create/edit
    const [formData, setFormData] = useState<Partial<CountryRequest>>({
        name: "",
        iso2: "",
        iso3: "",
        phoneCode: "",
        capital: "",
        currency: "",
        region: "",
        subregion: "",
    })
    const [editingCountryId, setEditingCountryId] = useState<number | null>(null)

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ type: 'country' | 'state', id: number, name: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Fetch countries from API
    const fetchCountries = useCallback(async () => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Create new AbortController
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)

        try {
            const response = await masterdataApi.countries.getAll(
                undefined,
                abortControllerRef.current.signal
            )

            if (response.success && response.data) {
                setCountries(response.data)
            } else {
                // Handle case where response.data is the array directly
                if (Array.isArray(response)) {
                    setCountries(response as CountryData[])
                } else {
                    setError("Failed to load countries data")
                }
            }
        } catch (err) {
            // Don't set error if request was cancelled
            if (err instanceof Error && err.name === 'AbortError') {
                return
            }
            console.error("Error fetching countries:", err)
            setError(err instanceof Error ? err.message : "An error occurred while loading countries")
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial data fetch
    useEffect(() => {
        fetchCountries()

        // Cleanup: cancel request on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [fetchCountries])

    // Search countries using API with debounce
    const searchCountries = useCallback(async (keyword: string) => {
        // Cancel any pending search request
        if (searchAbortRef.current) {
            searchAbortRef.current.abort()
        }

        // If keyword is empty or too short, clear search results
        if (!keyword.trim() || keyword.trim().length < 3) {
            setSearchResults(null)
            setIsSearching(false)
            return
        }

        // Create new AbortController for this search
        searchAbortRef.current = new AbortController()
        setIsSearching(true)

        try {
            const response = await masterdataApi.search.countries(
                { keyword: keyword.trim(), pageSize: 50 },
                undefined,
                searchAbortRef.current.signal
            )

            // Handle different response formats
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responseData = response.data as any
            let searchItems: CountryData[] | null = null

            if (response.success && responseData?.items) {
                // Format: { success, data: { items: [...] } }
                searchItems = responseData.items as CountryData[]
            } else if (Array.isArray(responseData)) {
                // Format: { success, data: [...] }
                searchItems = responseData as CountryData[]
            }

            // If API returns results, use them. If empty, fallback to client-side filter.
            if (searchItems && searchItems.length > 0) {
                setSearchResults(searchItems)
            } else {
                // Fallback to client-side filter
                setSearchResults(null)
            }
        } catch (err) {
            // Don't set error if request was cancelled
            if (err instanceof Error && err.name === 'AbortError') {
                return
            }
            console.warn('Search error:', err)
            // Fallback to client-side filtering on API error
            setSearchResults(null)
        } finally {
            setIsSearching(false)
        }
    }, [])

    // Search effect - triggers immediately when searchQuery changes (only on button click/Enter)
    useEffect(() => {
        searchCountries(searchQuery)
    }, [searchQuery, searchCountries])

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

    // Filter countries - use search API results if available, otherwise client-side filter
    const filteredCountries = useMemo(() => {
        // If we have search results from API, use them
        let filtered: CountryData[]

        if (searchQuery.trim().length >= 3 && searchResults !== null) {
            // Use API search results
            filtered = [...searchResults]
        } else if (searchQuery.trim().length >= 3) {
            // Fallback client-side filter while API is loading or on error
            const query = searchQuery.toLowerCase()
            filtered = countries.filter(country =>
                country.name.toLowerCase().includes(query) ||
                (country.iso2?.toLowerCase().includes(query)) ||
                (country.iso3?.toLowerCase().includes(query))
            )
        } else {
            // No search query - show all countries
            filtered = [...countries]
        }

        // Region filter (always apply on top of search results)
        if (selectedRegion !== "All") {
            filtered = filtered.filter(country => country.region === selectedRegion)
        }

        // Sort by ID (ascending)
        return filtered.sort((a, b) => a.id - b.id)
    }, [countries, searchQuery, selectedRegion, searchResults])

    // Pagination calculations
    const totalPages = Math.ceil(filteredCountries.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    // Get countries to display (pagination only)
    const displayedCountries = useMemo(() => {
        return filteredCountries.slice(startIndex, endIndex)
    }, [filteredCountries, startIndex, endIndex])

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedRegion])

    // Pagination handlers
    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    const goToFirstPage = () => goToPage(1)
    const goToLastPage = () => goToPage(totalPages)
    const goToPrevPage = () => goToPage(currentPage - 1)
    const goToNextPage = () => goToPage(currentPage + 1)

    // Enrich displayed countries with region and counts
    useEffect(() => {
        const enrichDisplayedCountries = async () => {
            const toEnrich = displayedCountries.filter(c => c.region === undefined || c.statesCount === undefined);
            if (toEnrich.length === 0) return;

            // Fetch details for countries lacking them
            const enrichPromises = toEnrich.map(async (country) => {
                try {
                    const [detailRes, countsRes] = await Promise.all([
                        masterdataApi.countries.getById(country.id),
                        fetch(`/api/masterdata/counts/entities?countryId=${country.id}`)
                    ]);

                    let region = country.region;
                    if ('data' in detailRes && detailRes.data) {
                         const cData = Array.isArray(detailRes.data) ? detailRes.data[0] : detailRes.data;
                         region = cData?.region || "Unknown";
                    }

                    const countsJson = countsRes.ok ? await countsRes.json() : null;
                    const statesCount = countsJson?.data?.states || 0;
                    const citiesCount = countsJson?.data?.cities || 0;

                    return { id: country.id, region, statesCount, citiesCount };
                } catch (e) {
                    return { id: country.id, region: "Unknown", statesCount: 0, citiesCount: 0 };
                }
            });

            const enriched = await Promise.all(enrichPromises);

            setCountries(prev => prev.map(c => {
                const update = enriched.find(e => e.id === c.id);
                if (update) {
                    return { ...c, ...update };
                }
                return c;
            }));
        };

        enrichDisplayedCountries();
    }, [displayedCountries]);

    // Toggle country expansion
    const toggleCountryExpand = useCallback((countryId: number) => {
        setExpandedCountries(prev => {
            const next = new Set(prev)
            if (next.has(countryId)) {
                next.delete(countryId)
            } else {
                next.add(countryId)
            }
            return next
        })
    }, [])

    // Filter handlers
    const handleApplyFilter = () => {
        setSelectedRegion(tempRegion)
        setIsFilterModalOpen(false)
    }

    const handleResetFilter = () => {
        setTempRegion("All")
    }

    const handleCancelFilter = () => {
        setTempRegion(selectedRegion)
        setIsFilterModalOpen(false)
    }

    // Create country handler
    const handleCreateCountry = async () => {
        // Validate all required fields
        if (!formData.name || !formData.iso2 || !formData.iso3 || !formData.phoneCode || !formData.currency || !formData.capital || !formData.region) {
            toast.error(t("masterdata.countries.all_fields_required", "All fields with * are required"))
            return
        }

        setIsSubmitting(true)
        try {
            const response = await masterdataApi.countries.create(formData as CountryRequest)
            if (response.success || response.data) {
                // Refresh the list after successful creation
                await fetchCountries()
                setIsCreateModalOpen(false) // close modal
                resetForm()
                toast.success(t("masterdata.countries.create_success", "Country created successfully"))
            }
        } catch (err) {
            console.error("Error creating country:", err)
            const errorMsg = err instanceof Error ? err.message : "Failed to create country"
            setError(errorMsg)
            toast.error(t("masterdata.countries.create_error", errorMsg))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Edit country handler
    const handleEditClick = (country: CountryData) => {
        setEditingCountryId(country.id)
        setFormData({
            name: country.name,
            iso2: country.iso2 || "",
            iso3: country.iso3 || "",
            phoneCode: country.phoneCode || "",
            capital: country.capital || "",
            currency: country.currency || "",
            region: country.region || "",
            subregion: country.subregion || "",
            population: country.population,
            latitude: country.latitude,
            longitude: country.longitude,
        })
        setIsEditModalOpen(true)
    }

    const handleUpdateCountry = async () => {
        // Validate all required fields
        if (!editingCountryId || !formData.name || !formData.iso2 || !formData.iso3 || !formData.phoneCode || !formData.currency || !formData.capital || !formData.region) {
            toast.error(t("masterdata.countries.all_fields_required", "All fields with * are required"))
            return
        }

        setIsSubmitting(true)
        try {
            const response = await masterdataApi.countries.update(
                editingCountryId,
                formData as CountryRequest
            )
            if (response.success || response.data) {
                await fetchCountries()
                setIsEditModalOpen(false)
                resetForm()
                setEditingCountryId(null)
                toast.success(t("masterdata.countries.update_success", "Country updated successfully"))
            }
        } catch (err) {
            console.error("Error updating country:", err)
            const errorMsg = err instanceof Error ? err.message : "Failed to update country"
            setError(errorMsg)
            toast.error(t("masterdata.countries.update_error", errorMsg))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Delete handlers
    const handleDeleteClick = (type: 'country' | 'state', id: number, name: string) => {
        setItemToDelete({ type, id, name })
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return

        setIsDeleting(true)
        const deleteName = itemToDelete.name
        try {
            if (itemToDelete.type === 'country') {
                await masterdataApi.countries.delete(itemToDelete.id)
                await fetchCountries()
                toast.success(t("masterdata.countries.delete_success", `"${deleteName}" deleted successfully`).replace('{name}', deleteName))
            }
            // TODO: Handle state deletion when states API is available
        } catch (err) {
            console.error("Error deleting:", err)
            const errorMsg = err instanceof Error ? err.message : "Failed to delete"
            setError(errorMsg)
            toast.error(t("masterdata.countries.delete_error", errorMsg))
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        }
    }

    // Reset form
    const resetForm = () => {
        setFormData({
            name: "",
            iso2: "",
            iso3: "",
            phoneCode: "",
            capital: "",
            currency: "",
            region: "",
            subregion: "",
        })
    }

    // Get visible states (first 5)
    const getVisibleStates = (states: { id: number; name: string; citiesCount: number }[] | undefined) => {
        return states?.slice(0, 5) || []
    }

    // Render loading state (Skeleton)
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* Search & Filter Skeleton */}
                <div className="flex gap-2 sm:gap-3 items-center mb-6">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                </div>

                {/* Table Skeleton */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="h-12 bg-emerald-600/10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-4">
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

    // Render error state
    if (error && countries.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={fetchCountries} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* Error Banner (for non-blocking errors) */}
            {error && countries.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setError(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Header and Toolbar */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Countries</h1>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="flex flex-1 sm:flex-none sm:w-64 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                        <div className="relative flex-1 bg-white dark:bg-gray-900">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder={t("masterdata.countries.search_placeholder", "Search by name, ISO code...")}
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
                    <Button
                        variant="outline"
                        onClick={() => setIsFilterModalOpen(true)}
                        className={cn(
                            "flex items-center gap-2 shrink-0 h-10 bg-white dark:bg-gray-900",
                            selectedRegion !== "All"
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
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("common.create", "Create")}
                    </Button>
                </div>
            </div>



            {/* Countries Table */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                {displayedCountries.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{t("masterdata.countries.no_results", "No countries found")}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                <TableHead className="w-20 text-white font-bold">ID</TableHead>
                                <TableHead className="min-w-[200px] text-white font-bold">Country</TableHead>
                                <TableHead className="w-24 text-white font-bold">Phone</TableHead>
                                <TableHead className="w-32 text-white font-bold">Region</TableHead>
                                <TableHead className="w-24 text-center text-white font-bold">States</TableHead>
                                <TableHead className="w-24 text-center text-white font-bold">Cities</TableHead>
                                <TableHead className="w-20 text-white font-bold">ISO2</TableHead>
                                <TableHead className="w-20 text-white font-bold">ISO3</TableHead>
                                <TableHead className="w-[120px] text-center text-white font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedCountries.map((country) => (
                                <TableRow
                                    key={country.id}
                                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                                    onClick={() => router.push(`/master/countries/${country.id}`)}
                                >
                                    {/* ID Column */}
                                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                        #{country.id}
                                    </TableCell>

                                    {/* Country Column */}
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0 overflow-hidden">
                                                {country.emoji ? (
                                                    <span className="text-lg">{country.emoji}</span>
                                                ) : (
                                                    country.iso2 || "?"
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                                    {country.name}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-900 dark:text-white">
                                        {country.phoneCode ? `+${country.phoneCode}` : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            {country.region || "Unknown"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {country.statesCount || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {country.citiesCount || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-900 dark:text-white">
                                        {country.iso2 || "-"}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-900 dark:text-white">
                                        {country.iso3 || "-"}
                                    </TableCell>
                                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="inline-flex items-center rounded overflow-hidden border border-emerald-600 text-[11px] h-6">
                                            <button
                                                className="flex items-center gap-0.5 px-1.5 h-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                                onClick={(e) => { e.stopPropagation(); router.push(`/master/countries/${country.id}/edit`) }}
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

            {/* Pagination Controls (for pagination mode) */}
            {filteredCountries.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap justify-center sm:justify-start">
                        <span>Menampilkan <span className="font-bold text-emerald-600">{startIndex + 1}-{Math.min(endIndex, filteredCountries.length)}</span> dari <span className="font-bold text-gray-700 dark:text-gray-200">{filteredCountries.length}</span> data</span>
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
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
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
                                        onClick={() => setCurrentPage(pageNum)}
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
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}



            {/* Filter Modal */}
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("common.filter", "Filter")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>{t("masterdata.countries.region", "Region")}</Label>
                            <Combobox
                                options={REGIONS.map(region => ({ label: region, value: region }))}
                                value={tempRegion}
                                onValueChange={setTempRegion}
                                placeholder="Select Region"
                                searchPlaceholder="Search region..."
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

            {/* Create Country Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Country</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="name">Country Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. Indonesia"
                                />
                            </div>
                            <div>
                                <Label htmlFor="iso2">ISO2 Code *</Label>
                                <Input
                                    id="iso2"
                                    value={formData.iso2 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    placeholder="e.g. ID"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <Label htmlFor="iso3">ISO3 Code *</Label>
                                <Input
                                    id="iso3"
                                    value={formData.iso3 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso3: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    placeholder="e.g. IDN"
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="phoneCode">Phone Code *</Label>
                                <Input
                                    id="phoneCode"
                                    value={formData.phoneCode || ""}
                                    onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. +62"
                                />
                            </div>
                            <div>
                                <Label htmlFor="currency">Currency *</Label>
                                <Input
                                    id="currency"
                                    value={formData.currency || ""}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    placeholder="e.g. IDR"
                                />
                            </div>
                            <div>
                                <Label htmlFor="capital">Capital *</Label>
                                <Input
                                    id="capital"
                                    value={formData.capital || ""}
                                    onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. Jakarta"
                                />
                            </div>
                            <div>
                                <Label htmlFor="region">Region *</Label>
                                <Select
                                    value={formData.region || ""}
                                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REGIONS.filter(r => r !== "All").map((region) => (
                                            <SelectItem key={region} value={region}>
                                                {region}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="subregion">Subregion</Label>
                                <Input
                                    id="subregion"
                                    value={formData.subregion || ""}
                                    onChange={(e) => setFormData({ ...formData, subregion: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. South-Eastern Asia"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCountry}
                            disabled={!formData.name || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Country Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Country</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="edit-name">Country Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-iso2">ISO2 Code *</Label>
                                <Input
                                    id="edit-iso2"
                                    value={formData.iso2 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-iso3">ISO3 Code</Label>
                                <Input
                                    id="edit-iso3"
                                    value={formData.iso3 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso3: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-phoneCode">Phone Code *</Label>
                                <Input
                                    id="edit-phoneCode"
                                    value={formData.phoneCode || ""}
                                    onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-currency">Currency *</Label>
                                <Input
                                    id="edit-currency"
                                    value={formData.currency || ""}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-capital">Capital *</Label>
                                <Input
                                    id="edit-capital"
                                    value={formData.capital || ""}
                                    onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-region">Region *</Label>
                                <Select
                                    value={formData.region || ""}
                                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REGIONS.filter(r => r !== "All").map((region) => (
                                            <SelectItem key={region} value={region}>
                                                {region}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="edit-subregion">Subregion</Label>
                                <Input
                                    id="edit-subregion"
                                    value={formData.subregion || ""}
                                    onChange={(e) => setFormData({ ...formData, subregion: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsEditModalOpen(false); resetForm(); setEditingCountryId(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateCountry}
                            disabled={!formData.name || isSubmitting}
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
                            {itemToDelete?.type === 'country'
                                ? t("masterdata.countries.delete_country_title", "Delete Country")
                                : t("masterdata.countries.delete_state_title", "Delete State")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("masterdata.countries.delete_confirm", `Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`)}
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
