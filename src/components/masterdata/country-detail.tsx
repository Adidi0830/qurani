"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { masterdataApi, CountryData, StateData, CityData } from "@/lib/api"
import { fetchAllCitiesByCountry } from "@/lib/fetch-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Loader2,
    ArrowLeft,
    MapPin,
    Globe,
    Clock3,
    DollarSign,
    Search,
    MoreVertical,
    Flag,
    Building2,
    Map as MapIcon,
} from "lucide-react"
import { toast } from "sonner"

interface CountryDetailProps {
    id: string
}

export function CountryDetail({ id }: CountryDetailProps) {
    const router = useRouter()
    const [country, setCountry] = useState<CountryData | null>(null)
    const [states, setStates] = useState<StateData[]>([])
    const [cities, setCities] = useState<CityData[]>([])
    const [currencyId, setCurrencyId] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingStates, setIsLoadingStates] = useState(false)
    const [isLoadingCities, setIsLoadingCities] = useState(false)
    const [isLoadingTimezones, setIsLoadingTimezones] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [countryTimezoneCodes, setCountryTimezoneCodes] = useState<string[]>([])

    // Search and pagination states
    const [activeTab, setActiveTab] = useState<"states" | "cities">("states")
    const [statesSearchQuery, setStatesSearchQuery] = useState("")
    const [citiesSearchQuery, setCitiesSearchQuery] = useState("")
    const [statesPage, setStatesPage] = useState(1)
    const [citiesPage, setCitiesPage] = useState(1)
    const itemsPerPage = 15

    // AbortController refs to prevent duplicate fetching
    const statesAbortRef = useRef<AbortController | null>(null)
    const citiesAbortRef = useRef<AbortController | null>(null)

    // Fetch country details
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const countryResponse = await masterdataApi.countries.getById(id)
                let countryData: CountryData | null = null

                if ('data' in countryResponse && countryResponse.data) {
                    if (Array.isArray(countryResponse.data)) {
                        countryData = countryResponse.data[0]
                    } else {
                        countryData = countryResponse.data as CountryData
                    }
                } else if ('id' in countryResponse) {
                    countryData = countryResponse as unknown as CountryData
                }

                if (!countryData) {
                    throw new Error("Country not found")
                }

                setCountry(countryData)

            } catch (err) {
                console.error("Error fetching country details:", err)
                setError("Failed to load country details")
                toast.error("Failed to load country details")
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchData()
        }
    }, [id])

    // Fetch states when country is loaded
    useEffect(() => {
        const fetchStates = async () => {
            if (!country?.id) return

            // Cancel any pending request
            if (statesAbortRef.current) {
                statesAbortRef.current.abort()
            }
            statesAbortRef.current = new AbortController()

            setIsLoadingStates(true)
            try {
                // Use local API so citiesCount is included and consistent with states page
                const res = await fetch(`/api/masterdata/states?countryId=${country.id}`, {
                    signal: statesAbortRef.current.signal
                })
                if (!res.ok) throw new Error(`Failed to fetch states: ${res.status}`)
                const json = await res.json()
                const statesData = json?.success && Array.isArray(json.data) ? json.data : []
                setStates(statesData)
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return
                console.error("Error fetching states:", err)
            } finally {
                setIsLoadingStates(false)
            }
        }

        fetchStates()

        return () => {
            if (statesAbortRef.current) {
                statesAbortRef.current.abort()
            }
        }
    }, [country?.id, country?.name])

    // Fetch cities when country is loaded
    useEffect(() => {
        const fetchCities = async () => {
            if (!country?.id) return

            // Cancel any pending request
            if (citiesAbortRef.current) {
                citiesAbortRef.current.abort()
            }
            citiesAbortRef.current = new AbortController()

            setIsLoadingCities(true)
            try {
                // "Bungkus" logika fetching ke dalam helper yang lebih rapi
                // Menggunakan parallel fetching di balik layar agar jauh lebih cepat
                const finalData = await fetchAllCitiesByCountry(
                    country.id,
                    (progressData) => {
                        // Tetap update secara progresif agar UI terasa responsif
                        setCities([...progressData])
                    },
                    citiesAbortRef.current.signal
                )

                console.log(`✅ Final total cities for ${country.name}: ${finalData.length}`)
                setCities(finalData)
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return
                console.error("Error fetching cities:", err)
            } finally {
                setIsLoadingCities(false)
            }
        }

        fetchCities()

        return () => {
            if (citiesAbortRef.current) {
                citiesAbortRef.current.abort()
            }
        }
    }, [country?.id, country?.name])

    // Fetch currency ID when country is loaded
    useEffect(() => {
        const fetchCurrencyId = async () => {
            if (!country?.currency) return

            try {
                // Try to find currency by code (e.g. "AFN", "USD")
                const response = await masterdataApi.currencies.getByCode(country.currency)
                if (response.success && response.data) {
                    setCurrencyId(response.data.id)
                } else {
                    // Fallback: search by name/code if specific endpoint fails or returns no data
                    const searchResponse = await masterdataApi.currencies.search(country.currency)
                    if (searchResponse.success && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
                        // Find exact match if possible
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const match = searchResponse.data.find((c: any) => c.code === country.currency)
                        if (match) {
                            setCurrencyId(match.id)
                        } else {
                            // Or use first result
                            setCurrencyId(searchResponse.data[0].id)
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching currency info:", err)
            }
        }

        fetchCurrencyId()
    }, [country?.currency])

    const parseCountryTimezoneField = useCallback((raw: string | null | undefined): string[] => {
        if (!raw) return []
        return Array.from(
            new Set(
                raw
                    .replace(/\[|\]|\"/g, "")
                    .split(",")
                    .map((tz) => tz.trim())
                    .filter(Boolean)
            )
        )
    }, [])

    // Fetch timezone list per country from API Qurani (fallback: country.timezones)
    useEffect(() => {
        const loadTimezones = async () => {
            if (!country?.iso2) {
                setCountryTimezoneCodes(parseCountryTimezoneField(country?.timezones))
                return
            }

            setIsLoadingTimezones(true)
            try {
                const res = await fetch(`/api/masterdata/timezones?countryCode=${encodeURIComponent(country.iso2)}`, {
                    method: "GET",
                    cache: "no-store",
                })

                if (!res.ok) {
                    setCountryTimezoneCodes(parseCountryTimezoneField(country.timezones))
                    return
                }

                const json = await res.json()
                if (!json?.success || !Array.isArray(json.data)) {
                    setCountryTimezoneCodes(parseCountryTimezoneField(country.timezones))
                    return
                }

                const rows = json.data as Array<{ code?: string; name?: string; offset?: string }>
                const labels = Array.from(new Set(
                    rows
                        .map((row) => {
                            const base = (row.name || row.code || "").trim()
                            const offset = (row.offset || "").trim()
                            if (!base) return ""
                            return offset ? `${base} (UTC${offset})` : base
                        })
                        .filter((tz): tz is string => Boolean(tz))
                ))

                if (labels.length > 0) {
                    setCountryTimezoneCodes(labels)
                } else {
                    setCountryTimezoneCodes(parseCountryTimezoneField(country.timezones))
                }
            } catch (err) {
                console.error("Error fetching country timezones:", err)
                setCountryTimezoneCodes(parseCountryTimezoneField(country.timezones))
            } finally {
                setIsLoadingTimezones(false)
            }
        }

        loadTimezones()
    }, [country?.iso2, country?.timezones, parseCountryTimezoneField])

    // Filter and paginate states
    const filteredStates = useMemo(() => {
        if (!statesSearchQuery.trim()) return [...states].sort((a, b) => a.name.localeCompare(b.name))
        const q = statesSearchQuery.toLowerCase()
        return states.filter(state =>
            state.name.toLowerCase().includes(q) ||
            state.iso2?.toLowerCase().includes(q)
        ).sort((a, b) => a.name.localeCompare(b.name))
    }, [states, statesSearchQuery])

    const statesTotalPages = Math.ceil(filteredStates.length / itemsPerPage)
    const displayedStates = useMemo(() => {
        const start = (statesPage - 1) * itemsPerPage
        return filteredStates.slice(start, start + itemsPerPage)
    }, [filteredStates, statesPage])

    const stateNameById = useMemo(() => {
        const map = new Map<number, string>()
        states.forEach((s) => {
            if (typeof s.id === "number" && s.name) map.set(s.id, s.name)
        })
        return map
    }, [states])

    const stateNameByCode = useMemo(() => {
        const map = new Map<string, string>()
        states.forEach((s) => {
            if (s.iso2 && s.name) map.set(s.iso2.toUpperCase(), s.name)
        })
        return map
    }, [states])

    const getCityStateLabel = useCallback((city: CityData) => {
        if (city.state && city.state.trim()) return city.state
        if (typeof city.stateId === "number" && stateNameById.has(city.stateId)) return stateNameById.get(city.stateId) as string
        if (city.stateCode && stateNameByCode.has(city.stateCode.toUpperCase())) return stateNameByCode.get(city.stateCode.toUpperCase()) as string
        if (city.stateCode && city.stateCode.trim()) return city.stateCode
        return "—"
    }, [stateNameByCode, stateNameById])

    // Filter and paginate cities
    const filteredCities = useMemo(() => {
        let result = cities
        if (citiesSearchQuery.trim()) {
            const q = citiesSearchQuery.toLowerCase()
            result = cities.filter(city =>
                city.name.toLowerCase().includes(q) ||
                getCityStateLabel(city).toLowerCase().includes(q) ||
                city.stateCode?.toLowerCase().includes(q)
            )
        }
        return [...result].sort((a, b) => a.name.localeCompare(b.name))
    }, [cities, citiesSearchQuery, getCityStateLabel])

    const citiesTotalPages = Math.ceil(filteredCities.length / itemsPerPage)
    const displayedCities = useMemo(() => {
        const start = (citiesPage - 1) * itemsPerPage
        return filteredCities.slice(start, start + itemsPerPage)
    }, [filteredCities, citiesPage])

    // Reset page on search
    useEffect(() => { setStatesPage(1) }, [statesSearchQuery])
    useEffect(() => { setCitiesPage(1) }, [citiesSearchQuery])

    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Header Banner Skeleton */}
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/50" />
                    <div className="flex-1 space-y-4 w-full">
                        <Skeleton className="h-8 w-48 md:w-64 bg-emerald-100 dark:bg-emerald-900/50" />
                        <Skeleton className="h-4 w-full max-w-lg bg-emerald-50 dark:bg-emerald-900/30" />
                        <div className="flex gap-3 mt-2">
                            <Skeleton className="h-6 w-20 rounded-full bg-emerald-50 dark:bg-emerald-900/30" />
                            <Skeleton className="h-6 w-24 rounded-full bg-emerald-50 dark:bg-emerald-900/30" />
                        </div>
                    </div>
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <Skeleton className="w-12 h-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs & List Skeleton */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-6">
                        <div className="flex gap-4 mb-4">
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    </div>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="p-4 flex items-center gap-4">
                                <Skeleton className="w-8 h-8 rounded-full" />
                                <div className="space-y-1 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="hidden md:block h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error || !country) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <Flag className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Country Not Found</h3>
                <p className="text-gray-500 mb-6">{error || "The country you are looking for does not exist."}</p>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 to-transparent dark:from-emerald-900/20" />

                <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center text-4xl md:text-5xl shadow-lg shadow-emerald-200/50 dark:shadow-none border-4 border-white dark:border-gray-900">
                            {country.emoji || country.iso2}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-bold truncate pr-4 text-gray-900 dark:text-white">
                                {country.name}
                            </h1>
                            <Button size="icon" variant="ghost" className="text-gray-500 hover:text-gray-900 hover:bg-emerald-100/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 rounded-full">
                                <MoreVertical className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-gray-600 dark:text-emerald-100 text-sm md:text-base max-w-2xl font-medium">
                            {country.region} {country.subregion && <span className="text-emerald-400">•</span>} {country.subregion}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                {country.iso2} / {country.iso3}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                +{country.phoneCode}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Capital</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{country.capital || "N/A"}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Globe className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Region</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{country.region || "Global"}</p>
                    </div>
                </div>

                <div
                    className={`bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4 ${currencyId ? "cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors" : ""}`}
                    onClick={() => currencyId && router.push(`/master/currencies/${currencyId}`)}
                >
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Currency</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {country.currency || "N/A"}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Clock3 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Timezones</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {isLoadingTimezones ? "..." : countryTimezoneCodes.length || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {countryTimezoneCodes.length > 0
                                ? countryTimezoneCodes.join(", ")
                                : "N/A"}
                        </p>
                    </div>
                </div>
            </div>

            {/* States & Cities Tabs */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "states" | "cities")} className="w-full">
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-6">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="states" className="flex items-center gap-2">
                                <MapIcon className="w-4 h-4" />
                                States ({states.length})
                            </TabsTrigger>
                            <TabsTrigger value="cities" className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Cities ({cities.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* States Tab */}
                    <TabsContent value="states" className="m-0">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search states..."
                                    value={statesSearchQuery}
                                    onChange={(e) => setStatesSearchQuery(e.target.value)}
                                    className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        {isLoadingStates ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                                <p className="text-gray-500">Loading states...</p>
                            </div>
                        ) : displayedStates.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No states found</p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                            <TableHead className="text-white font-bold">State Name</TableHead>
                                            <TableHead className="text-white font-bold w-32">ISO Code</TableHead>
                                            <TableHead className="text-white font-bold w-32 text-center">Cities</TableHead>
                                            <TableHead className="text-white font-bold w-28 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedStates.map((state) => (
                                            <TableRow
                                                key={state.id}
                                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                                onClick={() => router.push(`/master/states/${state.id}`)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                            {state.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{state.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-900 dark:text-white">
                                                    {state.iso2 || state.countryCode || "-"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        {state.citiesCount || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 h-9 shadow-sm transition-all active:scale-95"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            router.push(`/master/states/${state.id}`)
                                                        }}
                                                    >
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {statesTotalPages > 1 && (
                                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                                        <Pagination>
                                            <PaginationContent className="gap-2">
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            if (statesPage > 1) setStatesPage(statesPage - 1)
                                                        }}
                                                        className={cn(statesPage === 1 && "pointer-events-none opacity-50")}
                                                    />
                                                </PaginationItem>
                                                {Array.from({ length: Math.min(5, statesTotalPages) }, (_, i) => {
                                                    let pageNum = i + 1
                                                    if (statesTotalPages > 5) {
                                                        if (statesPage <= 3) pageNum = i + 1
                                                        else if (statesPage >= statesTotalPages - 2) pageNum = statesTotalPages - 4 + i
                                                        else pageNum = statesPage - 2 + i
                                                    }
                                                    return (
                                                        <PaginationItem key={pageNum}>
                                                            <PaginationLink
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    setStatesPage(pageNum)
                                                                }}
                                                                isActive={statesPage === pageNum}
                                                                className={cn(
                                                                    "cursor-pointer",
                                                                    statesPage === pageNum && "bg-emerald-600 hover:bg-emerald-700 text-white"
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
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            if (statesPage < statesTotalPages) setStatesPage(statesPage + 1)
                                                        }}
                                                        className={cn(statesPage === statesTotalPages && "pointer-events-none opacity-50")}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>

                    {/* Cities Tab */}
                    <TabsContent value="cities" className="m-0">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search cities..."
                                    value={citiesSearchQuery}
                                    onChange={(e) => setCitiesSearchQuery(e.target.value)}
                                    className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        {isLoadingCities ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                                <p className="text-gray-500">Loading cities...</p>
                            </div>
                        ) : displayedCities.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No cities found</p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                            <TableHead className="text-white font-bold">City Name</TableHead>
                                            <TableHead className="text-white font-bold w-48">State/Province</TableHead>
                                            <TableHead className="text-white font-bold w-40">Coordinates</TableHead>
                                            <TableHead className="text-white font-bold w-28 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedCities.map((city) => (
                                            <TableRow
                                                key={city.id}
                                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                                onClick={() => router.push(`/master/cities/${city.id}`)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                            {city.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{city.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-600 dark:text-gray-400">
                                                    {getCityStateLabel(city)}
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
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 h-9 shadow-sm transition-all active:scale-95"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            router.push(`/master/cities/${city.id}`)
                                                        }}
                                                    >
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {citiesTotalPages > 1 && (
                                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                                        <Pagination>
                                            <PaginationContent className="gap-2">
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            if (citiesPage > 1) setCitiesPage(citiesPage - 1)
                                                        }}
                                                        className={cn(citiesPage === 1 && "pointer-events-none opacity-50")}
                                                    />
                                                </PaginationItem>
                                                {Array.from({ length: Math.min(5, citiesTotalPages) }, (_, i) => {
                                                    let pageNum = i + 1
                                                    if (citiesTotalPages > 5) {
                                                        if (citiesPage <= 3) pageNum = i + 1
                                                        else if (citiesPage >= citiesTotalPages - 2) pageNum = citiesTotalPages - 4 + i
                                                        else pageNum = citiesPage - 2 + i
                                                    }
                                                    return (
                                                        <PaginationItem key={pageNum}>
                                                            <PaginationLink
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    setCitiesPage(pageNum)
                                                                }}
                                                                isActive={citiesPage === pageNum}
                                                                className={cn(
                                                                    "cursor-pointer",
                                                                    citiesPage === pageNum && "bg-emerald-600 hover:bg-emerald-700 text-white"
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
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            if (citiesPage < citiesTotalPages) setCitiesPage(citiesPage + 1)
                                                        }}
                                                        className={cn(citiesPage === citiesTotalPages && "pointer-events-none opacity-50")}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

