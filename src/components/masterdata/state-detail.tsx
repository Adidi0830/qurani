"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { masterdataApi, StateData, CityData, CountryData } from "@/lib/api"
import { fetchAllCitiesByState } from "@/lib/fetch-helpers"
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
    Loader2,
    ArrowLeft,
    MapPin,
    Globe,
    Building2,
    Search,
    MoreVertical,
    Map,
    Clock,
    Hash,
} from "lucide-react"
import { toast } from "sonner"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

interface StateDetailProps {
    id: string
}

export function StateDetail({ id }: StateDetailProps) {
    const router = useRouter()
    const [state, setState] = useState<StateData | null>(null)
    const [country, setCountry] = useState<CountryData | null>(null)
    const [cities, setCities] = useState<CityData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingCities, setIsLoadingCities] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                // Fetch state details
                const stateResponse = await masterdataApi.states.getById(Number(id))
                let stateData: StateData | null = null

                if ('data' in stateResponse && stateResponse.data) {
                    if (Array.isArray(stateResponse.data)) {
                        stateData = stateResponse.data[0]
                    } else {
                        stateData = stateResponse.data as StateData
                    }
                } else if ('id' in stateResponse) {
                    stateData = stateResponse as unknown as StateData
                }

                if (!stateData) {
                    throw new Error("State not found")
                }

                setState(stateData)

                // Fetch country info for this state
                if (stateData.countryId) {
                    try {
                        const countryResponse = await masterdataApi.countries.getById(stateData.countryId)
                        if ('data' in countryResponse && countryResponse.data) {
                            if (Array.isArray(countryResponse.data)) {
                                setCountry(countryResponse.data[0])
                            } else {
                                setCountry(countryResponse.data as CountryData)
                            }
                        } else if ('id' in countryResponse) {
                            setCountry(countryResponse as unknown as CountryData)
                        }
                    } catch {
                        // Country info is optional, don't fail the whole page
                    }
                }

                // Fetch cities for this state
                setIsLoadingCities(true)
                try {
                    // Gunakan helper yang sudah dioptimalkan (Parallel Batching)
                    const citiesData = await fetchAllCitiesByState(
                        Number(id),
                        (progress) => {
                            setCities([...progress])
                        }
                    )
                    setCities(citiesData)
                } catch {
                    // Cities list is optional
                } finally {
                    setIsLoadingCities(false)
                }

            } catch (err) {
                console.error("Error fetching state details:", err)
                setError("Failed to load state details")
                toast.error("Failed to load state details")
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchData()
        }
    }, [id])

    // Filter cities by search
    const filteredCities = useMemo(() => {
        let result = cities;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = cities.filter(city => city.name.toLowerCase().includes(q))
        }
        return [...result].sort((a, b) => a.name.localeCompare(b.name))
    }, [cities, searchQuery])

    // Pagination
    const totalPages = Math.ceil(filteredCities.length / itemsPerPage)
    const displayedCities = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredCities.slice(start, start + itemsPerPage)
    }, [filteredCities, currentPage])

    const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)))

    // Reset page on search
    useEffect(() => { setCurrentPage(1) }, [searchQuery])

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

                {/* Cities List Skeleton */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-10 w-full sm:w-64" />
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

    if (error || !state) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <Map className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">State Not Found</h3>
                <p className="text-gray-500 mb-6">{error || "The state you are looking for does not exist."}</p>
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
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 to-transparent dark:from-emerald-900/20" />

                {/* Content */}
                <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl md:text-3xl font-bold shadow-lg shadow-emerald-200/50 dark:shadow-none border-4 border-white dark:border-gray-900">
                            {state.name.substring(0, 2).toUpperCase()}
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-bold truncate pr-4 text-gray-900 dark:text-white">
                                {state.name}
                            </h1>
                            <Button size="icon" variant="ghost" className="text-gray-500 hover:text-gray-900 hover:bg-emerald-100/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 rounded-full">
                                <MoreVertical className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-gray-600 dark:text-emerald-100 text-sm md:text-base max-w-2xl font-medium">
                            {country?.name || state.country || "Unknown Country"}
                            {state.type && <span className="text-emerald-400"> • </span>}
                            {state.type}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            {state.type && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                    {state.type}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    className={cn(
                        "bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4",
                        country && "cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                    )}
                    onClick={() => country && router.push(`/master/countries/${country.id}`)}
                >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        {country?.emoji ? (
                            <span className="text-2xl leading-none">{country.emoji}</span>
                        ) : (
                            <Globe className="w-6 h-6" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Country</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {country?.name || state.country || "N/A"}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Hash className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">ISO Code</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{state.iso2 || "N/A"}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Cities</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{cities.length || state.citiesCount || 0}</p>
                    </div>
                </div>
            </div>

            {/* Additional Info Cards - Deactivated as requested */}
            {/* {(state.latitude || state.longitude || state.timezone) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(state.latitude && state.longitude) && (
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Coordinates</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                                    {Number(state.latitude).toFixed(4)}, {Number(state.longitude).toFixed(4)}
                                </p>
                            </div>
                        </div>
                    )}
                    {state.timezone && (
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Timezone</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{state.timezone}</p>
                            </div>
                        </div>
                    )}
                </div>
            )} */}

            {/* Cities List Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Cities
                            {cities.length > 0 && (
                                <span className="ml-2 text-sm font-normal text-gray-500">({filteredCities.length})</span>
                            )}
                        </h3>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search cities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                    </div>
                </div>

                {isLoadingCities ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Loading cities...</p>
                    </div>
                ) : filteredCities.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{searchQuery ? "No cities match your search." : "No cities found for this state."}</p>
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <TableHead className="min-w-[200px]">City Name</TableHead>
                                    <TableHead className="w-[150px]">State/Province</TableHead>
                                    <TableHead className="w-[150px]">Coordinates</TableHead>
                                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedCities.map((city) => (
                                    <TableRow
                                        key={city.id}
                                        className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                                        onClick={() => router.push(`/master/cities/${city.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0 overflow-hidden">
                                                    {country?.emoji ? (
                                                        <span className="text-base">{country.emoji}</span>
                                                    ) : (
                                                        city.name.substring(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{city.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {state?.name || "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {city.latitude && city.longitude ? (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded w-fit">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{city.latitude.toFixed(4)}, {city.longitude.toFixed(4)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center p-6 border-t border-gray-100 dark:border-gray-800">
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
                    </>
                )}
            </div>
        </div >
    )
}
