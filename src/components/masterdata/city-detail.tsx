"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { masterdataApi, CityData, StateData, CountryData } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Loader2,
    ArrowLeft,
    MapPin,
    Globe,
    Building2,
    MoreVertical,
    Map,
    Clock,
    Hash,
    Users,
} from "lucide-react"
import { toast } from "sonner"
import { CityLocationMap } from "@/components/masterdata/city-location-map"

interface CityDetailProps {
    id: string
}

export function CityDetail({ id }: CityDetailProps) {
    const router = useRouter()
    const [city, setCity] = useState<CityData | null>(null)
    const [state, setState] = useState<StateData | null>(null)
    const [country, setCountry] = useState<CountryData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                // Fetch city details
                const cityResponse = await masterdataApi.cities.getById(Number(id))
                let cityData: CityData | null = null

                if ('data' in cityResponse && cityResponse.data) {
                    if (Array.isArray(cityResponse.data)) {
                        cityData = cityResponse.data[0]
                    } else {
                        cityData = cityResponse.data as CityData
                    }
                } else if ('id' in cityResponse) {
                    cityData = cityResponse as unknown as CityData
                }

                if (!cityData) {
                    throw new Error("City not found")
                }

                setCity(cityData)

                // Fetch state info
                if (cityData.stateId) {
                    try {
                        const stateResponse = await masterdataApi.states.getById(cityData.stateId)
                        if ('data' in stateResponse && stateResponse.data) {
                            if (Array.isArray(stateResponse.data)) {
                                setState(stateResponse.data[0])
                            } else {
                                setState(stateResponse.data as StateData)
                            }
                        } else if ('id' in stateResponse) {
                            setState(stateResponse as unknown as StateData)
                        }
                    } catch {
                        // State info is optional
                    }
                }

                // Fetch country info
                if (cityData.countryId) {
                    try {
                        const countryResponse = await masterdataApi.countries.getById(cityData.countryId)
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
                        // Country info is optional
                    }
                }

            } catch (err) {
                console.error("Error fetching city details:", err)
                setError("Failed to load city details")
                toast.error("Failed to load city details")
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchData()
        }
    }, [id])

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

                {/* Additional Info Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <Skeleton className="w-12 h-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error || !city) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <Building2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">City Not Found</h3>
                <p className="text-gray-500 mb-6">{error || "The city you are looking for does not exist."}</p>
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
                            {city.name.substring(0, 2).toUpperCase()}
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-bold truncate pr-4 text-gray-900 dark:text-white">
                                {city.name}
                            </h1>
                            <Button size="icon" variant="ghost" className="text-gray-500 hover:text-gray-900 hover:bg-emerald-100/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 rounded-full">
                                <MoreVertical className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-gray-600 dark:text-emerald-100 text-sm md:text-base max-w-2xl font-medium">
                            {state?.name || city.state || ""}
                            {(state?.name || city.state) && (country?.name || city.country) && (
                                <span className="text-emerald-400"> • </span>
                            )}
                            {country?.name || city.country || ""}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            {city.type && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                    {city.type}
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
                        state && "cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                    )}
                    onClick={() => state && router.push(`/master/states/${state.id}`)}
                >
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Map className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">State/Province</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {state?.name || city.state || "N/A"}
                        </p>
                    </div>
                </div>

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
                            {country?.name || city.country || "N/A"}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Population</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {city.population ? city.population.toLocaleString() : "N/A"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Additional Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Coordinates</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                            {city.latitude && city.longitude
                                ? `${city.latitude.toFixed(4)}, ${city.longitude.toFixed(4)}`
                                : "N/A"
                            }
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Timezone</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {city.timezone || "N/A"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Map Section — shown only when coordinates are available */}
            {city.latitude && city.longitude && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {/* Map Header */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Location Map</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {city.latitude.toFixed(4)}, {city.longitude.toFixed(4)}
                            </p>
                        </div>
                    </div>
                    {/* Leaflet Map */}
                    <CityLocationMap
                        latitude={city.latitude}
                        longitude={city.longitude}
                        cityName={city.name}
                        countryEmoji={country?.emoji ?? undefined}
                    />
                </div>
            )}

            {/* Native Name & Additional Details */}
            {(city.native || city.type) && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Details</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {city.native && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Native Name</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{city.native}</p>
                            </div>
                        )}
                        {city.type && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Type</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{city.type}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Breadcrumb Navigation */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Location Hierarchy</h3>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                        {country && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={() => router.push(`/master/countries/${country.id}`)}
                            >
                                <Globe className="w-3 h-3 mr-1.5" />
                                {country.emoji && <span className="mr-1">{country.emoji}</span>}
                                {country.name}
                            </Button>
                        )}
                        {country && state && (
                            <span className="text-gray-400">→</span>
                        )}
                        {state && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={() => router.push(`/master/states/${state.id}`)}
                            >
                                <Map className="w-3 h-3 mr-1.5" />
                                {state.name}
                            </Button>
                        )}
                        {state && (
                            <span className="text-gray-400">→</span>
                        )}
                        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Building2 className="w-3 h-3 mr-1.5" />
                            {city.name}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
