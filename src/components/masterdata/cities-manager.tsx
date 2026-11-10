"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    Pencil,
    Trash2,
    MapPin,
    Building2,
    Loader2,
    Filter,
    MoreHorizontal,
    Search,
    AlertCircle,
    RotateCcw,
    X,
    Eye,
} from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { cn } from "@/lib/utils"
import { masterdataApi, CityData, CityRequest, CountryData, StateData } from "@/lib/api"
import { fetchAllCitiesByCountry, fetchAllCitiesByState } from "@/lib/fetch-helpers"
import { toast } from "sonner"
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

export function CitiesManager() {
    const { t } = useI18n()
    const router = useRouter()

    // AbortController ref for request cancellation
    const abortControllerRef = useRef<AbortController | null>(null)

    // Countries list for dropdown
    const [countries, setCountries] = useState<CountryData[]>([])
    const [isLoadingCountries, setIsLoadingCountries] = useState(true)

    // Data state
    const [cities, setCities] = useState<CityData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filter state
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>("All")
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [inputValue, setInputValue] = useState<string>("")

    // Search API state
    const [searchResults, setSearchResults] = useState<CityData[] | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const searchAbortRef = useRef<AbortController | null>(null)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15 // Fixed items per page

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

    // Temp filter state for modal
    const [tempCountryCode, setTempCountryCode] = useState<string>("All")
    const [tempStateCode, setTempStateCode] = useState<string>("All")

    // Filter states list (for state dropdown in filter modal)
    const [filterStates, setFilterStates] = useState<StateData[]>([])
    const [isLoadingFilterStates, setIsLoadingFilterStates] = useState(false)
    const [allStates, setAllStates] = useState<StateData[]>([])

    // Applied filter state
    const [selectedStateCode, setSelectedStateCode] = useState<string>("All")

    // Form state for country/state dropdowns
    const [formStates, setFormStates] = useState<StateData[]>([])
    const [formSelectedCountryCode, setFormSelectedCountryCode] = useState<string>("")
    const [isLoadingFormStates, setIsLoadingFormStates] = useState(false)

    interface CityFormState extends Omit<CityRequest, 'latitude' | 'longitude'> {
        latitude?: string;
        longitude?: string;
    }

    // Form state for create/edit
    const [formData, setFormData] = useState<Partial<CityFormState>>({
        name: "",
        stateId: 0,
        state: "",
        stateCode: "",
        countryId: 0,
        country: "",
        countryCode: "",
    })
    const [editingCityId, setEditingCityId] = useState<number | null>(null)

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // ====== FETCH COUNTRIES LIST (once on mount) ======
    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoadingCountries(true)
            try {
                const response = await masterdataApi.countries.getAll()
                if (response.success && response.data) {
                    const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name))
                    setCountries(sorted)
                }
            } catch (err) {
                console.error("Error fetching countries:", err)
            } finally {
                setIsLoadingCountries(false)
            }
        }
        fetchCountries()
    }, [])

    // Preload states for state/province label fallback
    useEffect(() => {
        const fetchAllStates = async () => {
            try {
                const res = await fetch("/api/masterdata/states")
                if (!res.ok) return
                const json = await res.json()
                if (json?.success && Array.isArray(json.data)) {
                    setAllStates(json.data as StateData[])
                }
            } catch (err) {
                console.warn("[CitiesManager] Failed to preload states:", err)
            }
        }
        fetchAllStates()
    }, [])

    // Track how many countries we've already tried to load cities from
    const [processedCountryIndex, setProcessedCountryIndex] = useState(0)
    const isFetchingRef = useRef(false)

    // ====== FETCH CITIES ======
    const fetchCities = useCallback(async (isInitial = false) => {
        // Prevent concurrent identical fetches
        if (isFetchingRef.current && !isInitial) return

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)
        isFetchingRef.current = true

        try {
            // Find IDs for specific API calls
            const countryEntry = countries.find(c => (c.iso2 || c.id.toString()) === selectedCountryCode)
            const countryId = countryEntry?.id

            // Note: filterStates contains states for the currently selected country
            const stateEntry = filterStates.find(s => (s.iso2 || s.id.toString()) === selectedStateCode)
            const stateId = stateEntry?.id

            if (stateId && selectedStateCode !== "All") {
                // 1. If State is selected, use optimized Proxy Bundle (Parallel internally)
                const data = await fetchAllCitiesByState(stateId, undefined, abortControllerRef.current.signal)
                setCities(data)
            } else if (countryId && selectedCountryCode !== "All") {
                // 2. If Country is selected, use optimized Proxy Bundle (Parallel internally)
                const data = await fetchAllCitiesByCountry(countryId, undefined, abortControllerRef.current.signal)
                setCities(data)
            } else {
                // 3. "All Countries" - Use our aggregator for bundled fetching
                const countryList = countries.length > 0 ? countries : []
                if (countryList.length === 0) {
                    setIsLoading(false)
                    isFetchingRef.current = false
                    return
                }

                const currentIdx = isInitial ? 0 : processedCountryIndex
                if (currentIdx >= countryList.length && !isInitial) {
                    setIsLoading(false)
                    isFetchingRef.current = false
                    return
                }

                const batchSize = isInitial ? 10 : 20 // Konservatif agar response cepat kembali ke browser
                const endIdx = Math.min(currentIdx + batchSize, countryList.length)
                const batch = countryList.slice(currentIdx, endIdx)
                const codes = batch.map(c => c.iso2).filter(Boolean).join(",")

                const response = await fetch(`/api/masterdata/cities`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ codes }),
                    signal: abortControllerRef.current?.signal
                });

                if (!response.ok) throw new Error(`Failed to fetch bundle: ${response.status}`)

                const result = await response.json()
                if (abortControllerRef.current?.signal.aborted) return

                const newData: CityData[] = result.data || []

                if (isInitial) {
                    setCities(newData)
                } else {
                    setCities(prev => [...prev, ...newData])
                }

                setProcessedCountryIndex(endIdx)
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return
            console.error("Error fetching cities:", err)
            setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
            setIsLoading(false)
            isFetchingRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCountryCode, selectedStateCode, countries]) // Removed processedCountryIndex to prevent loop

    // 1. Initial trigger when filters change
    useEffect(() => {
        if (!isLoadingCountries) {
            setCurrentPage(1)
            setProcessedCountryIndex(0)
            fetchCities(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingCountries, selectedCountryCode, selectedStateCode])

    // 2. Lazy loading trigger when page changes
    useEffect(() => {
        if (
            selectedCountryCode === "All" &&
            !isLoading &&
            processedCountryIndex < countries.length &&
            currentPage >= Math.ceil(cities.length / itemsPerPage) - 1 &&
            cities.length > 0
        ) {
            fetchCities(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, selectedCountryCode, isLoading])




    // Search cities using Supabase-backed API (fixes the {} error from external backend)
    const searchCities = useCallback(async (keyword: string) => {
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
            const params = new URLSearchParams({ q: keyword.trim(), limit: '100' })

            if (selectedStateCode && selectedStateCode !== 'All') {
                const stateEntry = filterStates.find(s => (s.iso2 || s.id.toString()) === selectedStateCode)
                if (stateEntry) params.set('stateId', stateEntry.id.toString())
            } else if (selectedCountryCode && selectedCountryCode !== 'All') {
                params.set('countryCode', selectedCountryCode)
            }

            const res = await fetch(`/api/masterdata/cities/search?${params.toString()}`, {
                signal: searchAbortRef.current.signal
            })

            if (!res.ok) throw new Error(`Search failed: ${res.status}`)

            const json = await res.json()
            const searchItems: CityData[] = json.success && Array.isArray(json.data) ? json.data : []

            setSearchResults(searchItems.length > 0 ? searchItems : null)
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return
            console.warn('Search cities error:', err)
            setSearchResults(null)
        } finally {
            setIsSearching(false)
        }
    }, [selectedCountryCode, selectedStateCode, filterStates])

    // Search effect - triggers immediately when searchQuery changes (only on button click/Enter)
    useEffect(() => {
        searchCities(searchQuery)
    }, [searchQuery, searchCities])

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

    const stateNameById = useMemo(() => {
        const map = new Map<number, string>()
        const addState = (s: StateData) => {
            if (typeof s.id === "number" && s.name) map.set(s.id, s.name)
        }
        allStates.forEach(addState)
        filterStates.forEach(addState)
        formStates.forEach(addState)
        return map
    }, [allStates, filterStates, formStates])

    const stateNameByCode = useMemo(() => {
        const map = new Map<string, string>()
        const addState = (s: StateData) => {
            if (s.iso2 && s.name) map.set(s.iso2.toUpperCase(), s.name)
        }
        allStates.forEach(addState)
        filterStates.forEach(addState)
        formStates.forEach(addState)
        return map
    }, [allStates, filterStates, formStates])

    const getCityStateLabel = useCallback((city: CityData) => {
        if (city.state && city.state.trim()) return city.state
        if (typeof city.stateId === "number" && stateNameById.has(city.stateId)) {
            return stateNameById.get(city.stateId) as string
        }
        if (city.stateCode && stateNameByCode.has(city.stateCode.toUpperCase())) {
            return stateNameByCode.get(city.stateCode.toUpperCase()) as string
        }
        if (city.stateCode && city.stateCode.trim()) return city.stateCode
        return "—"
    }, [stateNameByCode, stateNameById])

    // ====== PAGINATION / SEARCH LOGIC ======
    // Hybrid Filter - Merge API search results with local client-side filter for maximum reliability
    const filteredCities = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        let result: CityData[]

        // Case 1: No search query - return all cities
        if (query.length < 2) {
            result = [...cities]
        } else {
            // Case 2: User is searching. Get local matches
            const localMatches = cities.filter(city =>
                city.name.toLowerCase().includes(query) ||
                getCityStateLabel(city).toLowerCase().includes(query) ||
                city.country?.toLowerCase().includes(query) ||
                city.countryCode?.toLowerCase().includes(query)
            )

            if (searchResults !== null) {
                // Merge API results with local matches, deduplicate by ID
                const mergedMap = new Map<number, CityData>()
                searchResults.forEach(c => mergedMap.set(c.id, c))
                localMatches.forEach(c => { if (!mergedMap.has(c.id)) mergedMap.set(c.id, c) })
                result = Array.from(mergedMap.values())
            } else {
                result = localMatches
            }
        }

        // Always deduplicate by ID before returning to prevent React key errors
        const deduped = Array.from(new Map(result.map(c => [c.id, c])).values())
        return deduped.sort((a, b) => a.name.localeCompare(b.name))
    }, [cities, searchQuery, searchResults, getCityStateLabel])

    const totalPages = Math.ceil(filteredCities.length / itemsPerPage)

    const displayedCities = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return filteredCities.slice(startIndex, startIndex + itemsPerPage)
    }, [filteredCities, currentPage, itemsPerPage])

    // Effect to check if we need more data when user changes page
    useEffect(() => {
        // If we're on the last few items of currently loaded cities in "All" mode, 
        // trigger loading more countries in background
        if (
            selectedCountryCode === "All" &&
            !isLoading &&
            processedCountryIndex < countries.length &&
            displayedCities.length > 0 &&
            currentPage >= totalPages - 1
        ) {
            fetchCities(false)
        }
    }, [currentPage, totalPages, selectedCountryCode, isLoading, countries.length, processedCountryIndex, displayedCities.length, fetchCities])

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedCountryCode])

    // Pagination handlers
    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    const goToFirstPage = () => goToPage(1)
    const goToLastPage = () => goToPage(totalPages)
    const goToPrevPage = () => goToPage(currentPage - 1)
    const goToNextPage = () => goToPage(currentPage + 1)

    // ====== FORM HELPERS ======
    const fetchFormStatesByCountry = useCallback(async (countryCode: string) => {
        if (!countryCode) {
            setFormStates([])
            return
        }

        setIsLoadingFormStates(true)
        try {
            const response = await masterdataApi.states.getByCountryCode(countryCode)
            if (response.success && response.data) {
                const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name))
                setFormStates(sorted)
            } else {
                setFormStates([])
            }
        } catch (err) {
            console.error("Error fetching states:", err)
            setFormStates([])
        } finally {
            setIsLoadingFormStates(false)
        }
    }, [])

    const handleFormCountryChange = (countryCode: string) => {
        const selectedCountry = countries.find(c => c.iso2 === countryCode)
        if (selectedCountry) {
            setFormSelectedCountryCode(countryCode)
            setFormData(prev => ({
                ...prev,
                countryId: selectedCountry.id,
                country: selectedCountry.name,
                countryCode: countryCode,
                // Reset state when country changes
                stateId: 0,
                state: "",
                stateCode: "",
            }))
            fetchFormStatesByCountry(countryCode)
        }
    }

    const handleFormStateChange = (stateId: string) => {
        const selectedState = formStates.find(s => s.id === Number(stateId))
        if (selectedState) {
            setFormData(prev => ({
                ...prev,
                stateId: selectedState.id,
                state: selectedState.name,
                stateCode: selectedState.iso2 || "",
            }))
        }
    }

    // ====== CRUD HANDLERS ======
    const handleCreateCity = async () => {
        if (!formData.name) {
            toast.error(t("masterdata.cities.name_required", "City name is required"))
            return
        }

        setIsSubmitting(true)
        try {
            // TEST: Send minimal payload to isolate if latitude/longitude are the problem
            const requestData: any = {
                name: formData.name,
                stateId: Number(formData.stateId),
                state: formData.state || "",
                stateCode: formData.stateCode || "",
                countryId: Number(formData.countryId),
                country: formData.country || "",
                countryCode: formData.countryCode || "",
                r: "city",
            }

            // Latitude and longitude omitted for this test to see if 400 persists
            console.log('[Cities TEST v8 - ' + new Date().toISOString() + '] Testing MINIMAL payload:', JSON.stringify(requestData, null, 2))
            const response = await masterdataApi.cities.create(requestData)
            if (response.success || response.data) {
                fetchCities()
                setIsCreateModalOpen(false)
                resetForm()
                toast.success(t("masterdata.cities.create_success", "City created successfully"))
            }
        } catch (err) {
            console.error("Error creating city:", err)
            const errorMsg = err instanceof Error ? err.message : "Failed to create city"
            toast.error(errorMsg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditClick = (city: CityData) => {
        setEditingCityId(city.id)
        setFormData({
            name: city.name,
            stateId: city.stateId,
            state: city.state,
            stateCode: city.stateCode,
            countryId: city.countryId,
            country: city.country,
            countryCode: city.countryCode,
            latitude: city.latitude !== undefined ? String(city.latitude) : undefined,
            longitude: city.longitude !== undefined ? String(city.longitude) : undefined,
            population: city.population,
            timezone: city.timezone,
        })
        // Set country code for dropdown and fetch states
        if (city.countryCode) {
            setFormSelectedCountryCode(city.countryCode)
            fetchFormStatesByCountry(city.countryCode)
        }
        setIsEditModalOpen(true)
    }

    const handleUpdateCity = async () => {
        if (!editingCityId || !formData.name) {
            toast.error(t("masterdata.cities.name_required", "City name is required"))
            return
        }

        setIsSubmitting(true)
        try {
            // Build payload matching StateRequest pattern
            const requestData: any = {
                name: formData.name,
                stateId: Number(formData.stateId),
                state: formData.state || "",
                stateCode: formData.stateCode || "",
                countryId: Number(formData.countryId),
                country: formData.country || "",
                countryCode: formData.countryCode || "",
                r: "city",  // REQUIRED by backend
            }

            // Convert string coordinates to integers (as required by spec pattern)
            if (formData.latitude && formData.latitude.trim() !== "") {
                const lat = parseFloat(formData.latitude)
                if (!isNaN(lat)) {
                    requestData.latitude = Math.round(lat)
                }
            }
            if (formData.longitude && formData.longitude.trim() !== "") {
                const lng = parseFloat(formData.longitude)
                if (!isNaN(lng)) {
                    requestData.longitude = Math.round(lng)
                }
            }

            console.log('[Cities] Updating city with payload:', JSON.stringify(requestData, null, 2))
            const response = await masterdataApi.cities.update(editingCityId, requestData)
            if (response.success || response.data) {
                fetchCities()
                setIsEditModalOpen(false)
                resetForm()
                setEditingCityId(null)
                toast.success(t("masterdata.cities.update_success", "City updated successfully"))
            }
        } catch (err) {
            console.error("Error updating city:", err)
            const errorMsg = err instanceof Error ? err.message : "Failed to update city"
            toast.error(errorMsg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteClick = (id: number, name: string) => {
        setItemToDelete({ id, name })
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return

        setIsDeleting(true)
        const deleteName = itemToDelete.name
        try {
            await masterdataApi.cities.delete(itemToDelete.id)
            fetchCities()
            toast.success(t("masterdata.cities.delete_success", "City deleted successfully").replace("{name}", deleteName))
        } catch (err) {
            console.error("Error deleting:", err)
            toast.error(t("masterdata.cities.delete_error", "Failed to delete city"))
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            stateId: 0,
            state: "",
            stateCode: "",
            countryId: 0,
            country: "",
            countryCode: "",
            latitude: undefined,
            longitude: undefined,
        })
        setFormSelectedCountryCode("")
        setFormStates([])
    }

    // ====== FILTER HANDLERS ======
    const fetchFilterStatesByCountry = useCallback(async (countryCode: string) => {
        if (!countryCode || countryCode === "All") {
            setFilterStates([])
            return
        }

        setIsLoadingFilterStates(true)
        try {
            const response = await masterdataApi.states.getByCountryCode(countryCode)
            if (response.success && response.data) {
                const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name))
                setFilterStates(sorted)
            } else {
                setFilterStates([])
            }
        } catch (err) {
            console.error("Error fetching filter states:", err)
            setFilterStates([])
        } finally {
            setIsLoadingFilterStates(false)
        }
    }, [])

    const handleFilterCountryChange = (countryCode: string) => {
        setTempCountryCode(countryCode)
        setTempStateCode("All") // Reset state when country changes
        if (countryCode && countryCode !== "All") {
            fetchFilterStatesByCountry(countryCode)
        } else {
            setFilterStates([])
        }
    }

    const handleApplyFilter = () => {
        setSelectedCountryCode(tempCountryCode)
        setSelectedStateCode(tempStateCode)
        setIsFilterModalOpen(false)
        setCurrentPage(1)
        // Clear search results when applying new filter to avoid confusion
        setSearchResults(null)
        setSearchQuery("")
        setInputValue("")
    }

    const handleResetFilter = () => {
        setTempCountryCode("All")
        setTempStateCode("All")
        setSelectedCountryCode("All")
        setSelectedStateCode("All")
        setFilterStates([])
        setIsFilterModalOpen(false)
        setCurrentPage(1)
        setSearchResults(null)
        setSearchQuery("")
        setInputValue("")
    }

    const handleCancelFilter = () => {
        setTempCountryCode(selectedCountryCode)
        setTempStateCode(selectedStateCode)
        setIsFilterModalOpen(false)
    }

    const handleOpenFilterModal = () => {
        setTempCountryCode(selectedCountryCode)
        setTempStateCode(selectedStateCode)
        // Fetch states if country is selected
        if (selectedCountryCode && selectedCountryCode !== "All") {
            fetchFilterStatesByCountry(selectedCountryCode)
        }
        setIsFilterModalOpen(true)
    }

    // ====== RENDER ======

    if (isLoadingCountries) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* Search & Filter Skeleton */}
                <div className="flex gap-2 sm:gap-3 items-center mb-6">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
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
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 flex-1" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error && cities.length === 0 && !isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={() => fetchCities()} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t("common.try_again", "Try Again")}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* Error Banner */}
            {error && cities.length > 0 && (
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

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t("masterdata.cities.title", "Cities")}
                    </h1>
                </div>
                <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setIsCreateModalOpen(true)}
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
                                placeholder="Search by city name..."
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
                            "flex items-center gap-2 shrink-0 h-10 bg-white dark:bg-gray-900",
                            (selectedCountryCode && selectedCountryCode !== "All")
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
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                {isLoading && cities.length === 0 ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                        <p className="text-gray-500">Loading cities...</p>
                    </div>
                ) : displayedCities.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{t("masterdata.cities.no_results", "No cities found")}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                <TableHead className="w-20 text-white font-bold">No.</TableHead>
                                <TableHead className="min-w-[200px] text-white font-bold">City Name</TableHead>
                                <TableHead className="w-[150px] text-white font-bold">State/Province</TableHead>
                                <TableHead className="w-[150px] text-white font-bold">Country</TableHead>
                                <TableHead className="w-40 text-white font-bold">Coordinates</TableHead>
                                <TableHead className="w-[120px] text-center text-white font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedCities.map((city, index) => (
                                <TableRow
                                    key={city.id}
                                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                                    onClick={() => router.push(`/master/cities/${city.id}`)}
                                >
                                    {/* ID Column */}
                                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                        #{((currentPage - 1) * itemsPerPage) + index + 1}
                                    </TableCell>

                                    {/* City Name Column */}
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                {city.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {city.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400">
                                        {getCityStateLabel(city)}
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400">
                                        {city.country || city.countryCode || "—"}
                                    </TableCell>
                                    <TableCell>
                                        {city.latitude && city.longitude ? (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded w-fit">
                                                <MapPin className="w-3 h-3" />
                                                <span>{city.latitude.toFixed(4)}, {city.longitude.toFixed(4)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="inline-flex items-center rounded overflow-hidden border border-emerald-600 text-[11px] h-6">
                                            <button
                                                className="flex items-center gap-0.5 px-1.5 h-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                                onClick={(e) => { e.stopPropagation(); router.push(`/master/cities/${city.id}/edit`) }}
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
            {filteredCities.length > 0 && totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                    <Pagination>
                        <PaginationContent className="gap-2">
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    size="lg"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage > 1) goToPage(currentPage - 1)
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
                                            size="icon"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                goToPage(pageNum)
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
                                        if (currentPage < totalPages) goToPage(currentPage + 1)
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

            {/* Filter Modal */}
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("common.filter", "Filter")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Country Dropdown */}
                        <div>
                            <Label>Country</Label>
                            <Combobox
                                options={[
                                    { label: "All Countries", value: "All" },
                                    ...countries.map(c => ({
                                        label: c.name,
                                        value: c.iso2 || c.id.toString(),
                                        emoji: c.emoji || undefined
                                    }))
                                ]}
                                value={tempCountryCode}
                                onValueChange={handleFilterCountryChange}
                                placeholder="Select Country"
                                searchPlaceholder="Search country..."
                            />
                        </div>

                        {/* State Dropdown */}
                        <div>
                            <Label>State/Province</Label>
                            <Combobox
                                options={[
                                    { label: "All States/Provinces", value: "All" },
                                    ...filterStates.map(s => ({
                                        label: `${s.name}${s.iso2 ? ` (${s.iso2})` : ""}`,
                                        value: s.iso2 || s.id.toString()
                                    }))
                                ]}
                                value={tempStateCode}
                                onValueChange={setTempStateCode}
                                disabled={!tempCountryCode || tempCountryCode === "All" || isLoadingFilterStates}
                                placeholder={isLoadingFilterStates ? "Loading..." : "Select State/Province"}
                                searchPlaceholder="Search state..."
                            />
                            {tempCountryCode === "All" && (
                                <p className="text-xs text-gray-500 mt-1">Select a country first</p>
                            )}
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
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("masterdata.cities.create_city", "Create New City")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* City Name */}
                        <div>
                            <Label htmlFor="name">City Name *</Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1.5"
                                placeholder="e.g. Jakarta"
                            />
                        </div>

                        {/* Country Dropdown */}
                        <div>
                            <Label>Country *</Label>
                            <Combobox
                                options={countries.map(c => ({
                                    label: c.name,
                                    value: c.iso2 || "",
                                    emoji: c.emoji || undefined
                                }))}
                                value={formSelectedCountryCode}
                                onValueChange={handleFormCountryChange}
                                placeholder="Select Country"
                                searchPlaceholder="Search country..."
                            />
                        </div>

                        {/* State Dropdown */}
                        <div>
                            <Label>State/Province *</Label>
                            <Combobox
                                options={formStates.map(s => ({
                                    label: `${s.name}${s.iso2 ? ` (${s.iso2})` : ""}`,
                                    value: s.id.toString()
                                }))}
                                value={formData.stateId?.toString() || ""}
                                onValueChange={handleFormStateChange}
                                disabled={!formSelectedCountryCode || isLoadingFormStates}
                                placeholder={isLoadingFormStates ? "Loading..." : (formStates.length === 0 ? "No states available" : "Select State/Province")}
                                searchPlaceholder="Search state..."
                            />
                        </div>

                        {/* Coordinates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="latitude">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="text"
                                    value={formData.latitude || ""}
                                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value || undefined })}
                                    className="mt-1.5"
                                    placeholder="e.g. -7.1128"
                                />
                            </div>
                            <div>
                                <Label htmlFor="longitude">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="text"
                                    value={formData.longitude || ""}
                                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value || undefined })}
                                    className="mt-1.5"
                                    placeholder="e.g. 112.1635"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCity}
                            disabled={isSubmitting}
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
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("masterdata.cities.edit_city", "Edit City")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* City Name */}
                        <div>
                            <Label htmlFor="edit-name">City Name *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1.5"
                            />
                        </div>

                        {/* Country Dropdown */}
                        <div>
                            <Label>Country *</Label>
                            <Select
                                value={formSelectedCountryCode}
                                onValueChange={handleFormCountryChange}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {countries.map((country) => (
                                        <SelectItem key={country.id} value={country.iso2 || ""}>
                                            {country.emoji} {country.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* State Dropdown */}
                        <div>
                            <Label>State/Province *</Label>
                            <Select
                                value={formData.stateId?.toString() || ""}
                                onValueChange={handleFormStateChange}
                                disabled={!formSelectedCountryCode || isLoadingFormStates}
                            >
                                <SelectTrigger className="mt-1.5">
                                    {isLoadingFormStates ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </span>
                                    ) : (
                                        <SelectValue placeholder="Select State/Province" />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {formStates.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                            {formSelectedCountryCode ? "No states available" : "Select country first"}
                                        </SelectItem>
                                    ) : (
                                        formStates.map((state) => (
                                            <SelectItem key={state.id} value={state.id.toString()}>
                                                {state.name} {state.iso2 ? `(${state.iso2})` : ""}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Coordinates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-latitude">Latitude</Label>
                                <Input
                                    id="edit-latitude"
                                    type="text"
                                    value={formData.latitude || ""}
                                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value || undefined })}
                                    className="mt-1.5"
                                    placeholder="e.g. -7.1128"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-longitude">Longitude</Label>
                                <Input
                                    id="edit-longitude"
                                    type="text"
                                    value={formData.longitude || ""}
                                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value || undefined })}
                                    className="mt-1.5"
                                    placeholder="e.g. 112.1635"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateCity}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("masterdata.cities.delete_city_title", "Delete City")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("masterdata.cities.delete_confirm", "Are you sure you want to delete")} <strong>{itemToDelete?.name}</strong>? {t("masterdata.cities.delete_warning", "This action cannot be undone.")}
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
        </div >
    )
}

