"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { masterdataApi, LanguageData, CountryData } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Loader2,
    ArrowLeft,
    Globe,
    Search,
    MoreVertical,
    Type,
    Users,
    AlignLeft,
    AlignRight,
    Languages,
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

interface LanguageDetailProps {
    id: string
}

export default function LanguageDetailView({ id }: LanguageDetailProps) {
    const router = useRouter()
    const [language, setLanguage] = useState<LanguageData | null>(null)
    const [countries, setCountries] = useState<CountryData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingCountries, setIsLoadingCountries] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                // Fetch language details
                const languageResponse = await masterdataApi.languages.getById(id)
                let languageData: LanguageData | null = null

                if ('data' in languageResponse && languageResponse.data) {
                    // Check if data is array or object based on API response structure
                    if (Array.isArray(languageResponse.data)) {
                        languageData = languageResponse.data[0]
                    } else {
                        languageData = languageResponse.data as LanguageData
                    }
                }

                if (!languageData) {
                    throw new Error("Language not found")
                }

                setLanguage(languageData)

                // Fetch countries using this language
                if (languageData.countries) {
                    setIsLoadingCountries(true)
                    try {
                        const countriesResponse = await masterdataApi.countries.getAll()
                        if ('data' in countriesResponse && Array.isArray(countriesResponse.data)) {
                            // Parse countries string (assuming comma separated ISO codes)
                            const countryCodes = languageData.countries.split(',').map(c => c.trim().toUpperCase());

                            const filtered = countriesResponse.data.filter((c: CountryData) => {
                                return c.iso2 && countryCodes.includes(c.iso2.toUpperCase())
                            })

                            setCountries(filtered)
                        }
                    } catch (err) {
                        console.error("Error fetching countries for language:", err)
                    } finally {
                        setIsLoadingCountries(false)
                    }
                }
            } catch (err) {
                console.error("Error fetching language details:", err)
                setError("Failed to load language details")
                toast.error("Failed to load language details")
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchData()
        }
    }, [id])

    // Filter countries by search
    const filteredCountries = useMemo(() => {
        if (!searchQuery.trim()) return countries
        const q = searchQuery.toLowerCase()
        return countries.filter(country =>
            country.name.toLowerCase().includes(q) ||
            country.iso2?.toLowerCase().includes(q) ||
            country.iso3?.toLowerCase().includes(q)
        )
    }, [countries, searchQuery])

    // Pagination
    const totalPages = Math.ceil(filteredCountries.length / itemsPerPage)
    const displayedCountries = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredCountries.slice(start, start + itemsPerPage)
    }, [filteredCountries, currentPage])

    const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)))

    // Reset page on search
    useEffect(() => { setCurrentPage(1) }, [searchQuery])

    // Format speakers count (API returns/accepts as string or number)
    const formatSpeakers = (count?: string | number | null) => {
        if (count === null || count === undefined || count === '' || count === 0) return "—"
        const n = typeof count === 'string' ? parseInt(count, 10) : count
        if (isNaN(n)) return String(count)
        return new Intl.NumberFormat('en-US').format(n)
    }

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

                {/* Countries List Skeleton */}
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
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="hidden md:block h-4 w-24" />
                                <Skeleton className="hidden md:block h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error || !language) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <Languages className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Language Not Found</h3>
                <p className="text-gray-500 mb-6">{error || "The language you are looking for does not exist."}</p>
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
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center text-4xl md:text-5xl font-bold shadow-lg shadow-emerald-200/50 dark:shadow-none border-4 border-white dark:border-gray-900 overflow-hidden">
                            {language.flagEmoji ? (
                                <span className="flex items-center justify-center w-full h-full text-5xl md:text-6xl pt-2">
                                    {language.flagEmoji}
                                </span>
                            ) : (
                                <span>{language.id.substring(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-bold truncate pr-4 text-gray-900 dark:text-white">
                                {language.name}
                            </h1>
                            <Button size="icon" variant="ghost" className="text-gray-500 hover:text-gray-900 hover:bg-emerald-100/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 rounded-full">
                                <MoreVertical className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-gray-600 dark:text-emerald-100 text-sm md:text-base max-w-2xl font-medium">
                            {language.nativeName || language.name} • {language.family || "Unknown Family"}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm uppercase">
                                {language.id}
                            </span>
                            {language.script && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                    {language.script}
                                </span>
                            )}
                            <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm",
                                language.isActive
                                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                            )}>
                                {language.isActive ? "Active System" : "Inactive System"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Type className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">ISO Codes</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white uppercase">
                            {language.iso639_2 || language.iso639_3 || "—"}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        {language.direction === 'rtl' ? <AlignRight className="w-6 h-6" /> : <AlignLeft className="w-6 h-6" />}
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Direction</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white uppercase">
                            {language.direction || "LTR"}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Speakers</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatSpeakers(language.speakers)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Countries List Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Countries using this language
                            {countries.length > 0 && (
                                <span className="ml-2 text-sm font-normal text-gray-500">({filteredCountries.length})</span>
                            )}
                        </h3>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search countries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                    </div>
                </div>

                {isLoadingCountries ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Loading countries...</p>
                    </div>
                ) : filteredCountries.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{searchQuery ? "No countries match your search." : "No countries data found for this language."}</p>
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                    <TableHead className="min-w-[200px] text-white font-bold">Country Name</TableHead>
                                    <TableHead className="w-[150px] text-white font-bold">ISO Codes</TableHead>
                                    <TableHead className="w-[150px] text-white font-bold">Currency</TableHead>
                                    <TableHead className="w-[150px] text-white font-bold">Region</TableHead>
                                    <TableHead className="w-[120px] text-right text-white font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedCountries.map((country) => (
                                    <TableRow
                                        key={country.id}
                                        className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                                        onClick={() => router.push(`/master/countries/${country.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg shrink-0 overflow-hidden">
                                                    {country.emoji || country.iso2}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{country.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                {country.iso2} / {country.iso3}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{country.currency || "-"}</span>
                                                <span className="text-xs text-gray-500">{country.currencyName || "-"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600 dark:text-gray-400">
                                            {country.region || "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 h-9 shadow-sm transition-all active:scale-95"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    router.push(`/master/countries/${country.id}`)
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
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    if (currentPage > 1) goToPage(currentPage - 1)
                                                }}
                                                className={cn(
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
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            goToPage(pageNum)
                                                        }}
                                                        isActive={currentPage === pageNum}
                                                        className={cn(
                                                            "cursor-pointer",
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
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    if (currentPage < totalPages) goToPage(currentPage + 1)
                                                }}
                                                className={cn(
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
        </div>
    )
}
