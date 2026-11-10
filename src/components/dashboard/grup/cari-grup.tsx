"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Users, Loader2, UserRoundPlus, UserCheck, Filter, ArrowLeft, Send, Component, Check, RotateCcw } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination"
import { useI18n } from "@/components/providers/i18n-provider"
import { useGroupMutations, useSearchGroups } from "@/hooks/use-grup-data"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// import { fetchAllCategories } from "@/utils/api/grup/fetch"
import type { Categories } from "@/types/grup"
import { useRouter } from "next/navigation"
import { CATEGORY_LIST } from "@/data/categories-data"
import { ProvinceData } from "@/types/provinces"
import { CityData } from "@/types/cities"
import { fetchCountries } from "@/utils/api/countries/fetch"
import { fetchStates } from "@/utils/api/states/fetch"
import { fetchCities } from "@/utils/api/city/fetch"

// Skeleton component for loading state
const GroupCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
    {/* Banner Skeleton */}
    <div className="h-32 bg-slate-200 dark:bg-slate-700 animate-pulse">
      <div className="absolute top-4 left-4 flex items-center gap-4 p-4">
        <div className="h-15 w-15 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
        <div className="flex-1">
          <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded animate-pulse w-3/4" />
        </div>
      </div>
    </div>
    {/* Content Skeleton */}
    <div className="p-4 space-y-3">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
      <div className="flex items-center justify-between">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/4" />
      </div>
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse w-full" />
    </div>
  </div>
);

// Extended type for categories with name
type CategoryWithName = Categories & { name: string }

export function CariGrup() {
  const { t } = useI18n()
  const { userId } = useAuth()
  const [inputValue, setInputValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  /* REMOVED UNUSED LEGACY FETCH */
  // const [categories, setCategories] = useState<CategoryWithName[]>([])
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const router = useRouter()
  const [countries, setCountries] = useState<ProvinceData[]>([]);
  const [filterProvinces, setFilterProvinces] = useState<ProvinceData[]>([]);
  const [filterCities, setFilterCities] = useState<CityData[]>([]);

  // Filter states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all")
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>("all")
  const [openFilterCountry, setOpenFilterCountry] = useState(false);
  const [openFilterProvince, setOpenFilterProvince] = useState(false);
  const [openFilterCity, setOpenFilterCity] = useState(false);
  const [locationFilter, setLocationFilter] = useState({
    country_id: "0",
    country_name: "",
    province_id: "0",
    province_name: "",
    city_id: "0",
    city_name: "",
  });
  const [tempLocationFilter, setTempLocationFilter] = useState(locationFilter);

  const {
    searchData: searchResults,
    isLoading: isSearching,
    error: searchError,
    refresh: refreshSearch
  } = useSearchGroups({ userId, query: searchQuery });

  // Use props data instead of local state (SWR migration)
  const groups = searchResults
  const hasError = !!searchError
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

  // REMOVED LEGACY FETCH CATEGORIES
  // Use CATEGORY_LIST directly for dropdown logic


  // Effect untuk load countries
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const result = await fetchCountries()
        if (result.success) {
          setCountries(result.data || [])
        }
      } catch (error) {
        console.error("Error loading countries:", error)
      }
    }
    loadCountries()
  }, [])

  useEffect(() => {
    if (!isFilterModalOpen) {
      return;
    }
    const loadFilterProvinces = async () => {
      if (!tempLocationFilter.country_id || tempLocationFilter.country_id === "0") {
        setFilterProvinces([]);
        setFilterCities([]);
        return;
      }
      const result = await fetchStates(parseInt(tempLocationFilter.country_id, 10));
      if (result.success) {
        setFilterProvinces(result.data || []);
      } else {
        toast.error(result.message || "Error fetching provinces");
      }
    };
    loadFilterProvinces();
  }, [tempLocationFilter.country_id, isFilterModalOpen]);

  useEffect(() => {
    if (!isFilterModalOpen) {
      return;
    }
    const loadFilterCities = async () => {
      if (!tempLocationFilter.province_id || tempLocationFilter.province_id === "0") {
        setFilterCities([]);
        return;
      }
      const result = await fetchCities(Number(tempLocationFilter.province_id));
      setFilterCities(result.data || []);
    };
    loadFilterCities();
  }, [tempLocationFilter.province_id, isFilterModalOpen]);

  // Pagination states (simplified for SWR)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Reset pagination when search results change
  useEffect(() => {
    setCurrentPage(1)
  }, [groups, selectedCategoryFilter, locationFilter.country_id, locationFilter.province_id, locationFilter.city_id])

  // Filter handlers
  const handleApplyFilters = () => {
    setSelectedCategoryFilter(tempCategoryFilter)
    setLocationFilter(tempLocationFilter)
    setOpenFilterCountry(false)
    setOpenFilterProvince(false)
    setOpenFilterCity(false)
    setCurrentPage(1) // Reset to first page when applying filters
    setIsFilterModalOpen(false)
  }

  const handleResetFilters = () => {
    setTempCategoryFilter("all")
    setTempLocationFilter({
      country_id: "0",
      country_name: "",
      province_id: "0",
      province_name: "",
      city_id: "0",
      city_name: "",
    })
    setCurrentPage(1)
  }

  const handleCancelFilters = () => {
    setTempCategoryFilter(selectedCategoryFilter) // Reset temp to current selected
    setTempLocationFilter({ ...locationFilter }) // Reset temp location to current location
    setOpenFilterCountry(false)
    setOpenFilterProvince(false)
    setOpenFilterCity(false)
    setIsFilterModalOpen(false)
  }

  // Initialize temp filter when modal opens
  useEffect(() => {
    if (isFilterModalOpen) {
      setTempLocationFilter({ ...locationFilter })
    }
  }, [isFilterModalOpen, selectedCategoryFilter, locationFilter])


  // Memoize filtered groups with category filtering
  const filteredGroups = useMemo(() => {
    let filtered = [...groups];

    // Apply category filter
    if (selectedCategoryFilter !== "all") {
      filtered = filtered.filter(group => {
        const categoryId = group.grup_members[0]?.grup?.category?.id
        return categoryId === selectedCategoryFilter
      })
    }


    // Apply location filters
    if (locationFilter.country_id !== "0") {
      filtered = filtered.filter(group => {
        const groupCountryId = group.country_id?.toString()
        return groupCountryId === locationFilter.country_id
      })
    }

    if (locationFilter.province_id !== "0") {
      filtered = filtered.filter(group => {
        const groupProvinceId = group.state_id?.toString()
        return groupProvinceId === locationFilter.province_id
      })
    }

    if (locationFilter.city_id !== "0") {
      filtered = filtered.filter(group => {
        const groupCityId = group.city_id?.toString()
        return groupCityId === locationFilter.city_id
      })
    }

    return filtered;
  }, [groups, selectedCategoryFilter, locationFilter.country_id, locationFilter.province_id, locationFilter.city_id])

  // Computed totalGroups and totalPages based on filtered results
  const totalGroups = filteredGroups.length
  const totalPages = Math.ceil(totalGroups / itemsPerPage)

  // Memoize current page groups for performance and stability
  const currentPageGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    return filteredGroups.slice(startIndex, endIndex)
  }, [filteredGroups, currentPage, itemsPerPage])

  // Format date helper - Indonesian format (DD MMM YYYY)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return dateString
    const day = date.getDate().toString().padStart(2, "0")
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  const {
    joinGroup: joinGroupMutation,
  } = useGroupMutations(userId);

  const formatWithCount = (template: string, count: number) => template.replace('{count}', String(count))

  const handleJoinGroup = async (groupId: string) => {
    if (!groupId) return

    setIsSubmitting(groupId)
    try {
      // Use prop function instead of direct API call (SWR migration)
      await joinGroupMutation(groupId);
      toast.success(t('grup saya.toast.join_success', 'Successfully joined the group'));
      await refreshSearch();
      // Success message is handled in parent component
      // No need for manual refresh - SWR handles this automatically
    } catch (error) {
      console.error("Error joining group:", error)
      toast.error(t('grup saya.toast.join_error', 'Failed to join group'));
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(null)
    }
  }

  const {
    requestJoinGroup: requestJoinGroupMutation,
  } = useGroupMutations(userId);

  const handleRequestJoinGroup = async (groupId: string) => {
    if (!groupId) return

    setIsSubmitting(groupId)
    try {
      // Use prop function instead of direct API call (SWR migration)
      await requestJoinGroupMutation(groupId);
      toast.success(t('grup saya.toast.join_request', 'Successfully send request join the group'));
      // Refresh search data to update has_requested_join status
      await refreshSearch();
    } catch (error) {
      console.log("Error send request join the group:", error)
      toast.error(t('grup saya.toast.join_error', 'Failed to send request join the group'));
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(null)
    }
  }

  function handleTriger() {
    setSearchQuery(inputValue)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleTriger()
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="h-auto max-w-full mx-auto flex flex-col md:block">
      {/* Simple Header */}
      <div className="flex justify-between w-full mx-auto md:max-w-7xl mb-5 px-2 sm:px-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 sm:p-2 rounded-lg transition-all duration-300"
          >
            <ArrowLeft className="text-gray-600 dark:text-gray-400 w-5 h-5 md:h-6 md:w-6" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {t('cari grup.header.title', 'My Groups')}
            </h1>
          </div>
        </div>
        <Button
          variant={"default"}
          size={"sm"}
          onClick={() => setIsFilterModalOpen(true)}
          className="flex sm:hidden items-center justify-center gap-1 h-auto w-10 rounded-lg font-medium transition-all duration-300 text-sm whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 border-0 relative"
        >
          <Filter className="h-4 w-4" />
          {(selectedCategoryFilter !== "all" || locationFilter.country_id !== "0" || locationFilter.province_id !== "0" || locationFilter.city_id !== "0") && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white z-100"></div>
          )}
        </Button>
      </div>
      <div className="flex-1 w-full md:max-w-7xl mx-auto p-3 sm:p-4 md:p-6 bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/20 dark:shadow-gray-800/25 space-y-4 md:space-y-6 overflow-visible min-h-0">
        <div className="relative flex w-full gap-1 md:gap-2">
          <div className="relative flex flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-gray-400" />
            <Input
              placeholder={t('grup saya.search.placeholder', 'Search groups...')}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              className="pl-10 h-10 text-sm rounded-l-lg rounded-r-none border-2 border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/20 focus:outline-none focus:ring-0 focus:ring-offset-0
            focus:!border-gray-200 focus:dark:!border-gray-700 focus-visible:ring-0
              focus-visible:ring-offset-0
              focus-visible:outline-none focus-visible:shadow-none
              active:ring-0 active:ring-offset-0"
            />
            <button
              onClick={handleTriger}
              className="group rounded-r-lg text-xs px-4 cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 transition-all duration-300 flex items-center gap-1"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-gray-600 dark:text-gray-200 group-hover:text-white transition-colors duration-200" />
              <span className="text-gray-600 dark:text-gray-200 font-medium group-hover:text-white transition-colors duration-200">
                {t('grup saya.search.button', 'Search')}
              </span>
            </button>
          </div>
          <Button
            variant={"default"}
            size={"sm"}
            onClick={() => setIsFilterModalOpen(true)}
            className="hidden sm:flex items-center justify-center gap-1 h-auto w-10 rounded-lg font-medium transition-all duration-300 text-sm whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 border-0 relative"
          >
            <Filter className="h-4 w-4" />
            {selectedCategoryFilter !== "all" && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
            )}
          </Button>
        </div>
        {/* Content Area - Flexible height for mobile, normal for desktop */}
        <div className="flex-1 md:flex-none flex flex-col md:block min-h-full md:min-h-auto">

          {/* Loading State with Skeleton */}
          {isSearching && (
            <div className="flex-1 md:flex-none flex flex-col md:block space-y-6 w-full min-h-0 md:min-h-auto">
              <div className="flex-shrink-0 md:flex-shrink-auto flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                <Component className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">{t('cari grup.loading.searching', 'Searching groups...')}</span>
              </div>
              <div className="flex-1 md:flex-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto md:overflow-visible min-h-0 md:min-h-auto">
                {Array.from({ length: 3 }).map((_, i) => (
                  <GroupCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isSearching && totalGroups === 0 && searchQuery.trim() && !hasError && (
            <div className="flex-1 md:flex-none flex items-center justify-center w-full min-h-full py-10">
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Users className="h-8 w-8 md:h-10 md:w-10 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-base md:text-lg font-medium mb-2">{t('cari grup.empty.title', 'No groups found')}</div>
                <p className="text-slate-500 dark:text-slate-500 text-sm md:text-base">{t('cari grup.empty.subtitle', 'Try searching with different keywords')}</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="flex-1 md:flex-none flex items-center justify-center w-full min-h-full py-10">
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Users className="h-8 w-8 md:h-10 md:w-10 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-base md:text-lg font-medium mb-2">{t('cari grup.error.title', 'Connection Error')}</div>
                <p className="text-slate-500 dark:text-slate-500 text-sm md:text-base mb-4">
                  {searchError || t('cari grup.error.description', 'Unable to search groups. Please check your connection and try again.')}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t('cari grup.error.retry_note', 'SWR will automatically retry the search request.')}
                </p>
              </div>
            </div>
          )}

          {/* Initial State */}
          {!isSearching && totalGroups === 0 && !searchQuery.trim() && !hasError && (
            <div className="flex-1 md:flex-none flex items-center justify-center w-full min-h-full py-10">
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Search className="h-8 w-8 md:h-10 md:w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-base md:text-lg font-medium mb-2">{t('cari grup.initial.title', 'Start searching for groups')}</div>
                <p className="text-slate-500 dark:text-slate-500 text-sm md:text-base">{t('cari grup.initial.subtitle', 'Enter group name or description to discover study groups')}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!isSearching && totalGroups > 0 && !hasError && (
            <div className="flex-1 md:flex-none flex flex-col md:block space-y-6 w-full min-h-0 md:min-h-auto">
              <div className="flex-shrink-0 md:flex-shrink-auto flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:text-base">
                    {formatWithCount(
                      totalGroups === 1
                        ? t('cari grup.results.found_singular', 'Found {count} group')
                        : t('cari grup.results.found_plural', 'Found {count} groups'),
                      totalGroups
                    )}
                  </span>
                </div>
              </div>

              {/* Grid Layout - 3 columns x 2 rows */}
              <div className="flex-1 md:flex-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto md:overflow-visible min-h-0 md:min-h-auto">
                {currentPageGroups.map((group) => (
                  <div key={group.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-xl hover:shadow-slate-200/25 dark:hover:shadow-slate-900/25 transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
                    {/* Banner Background */}
                    <div className="relative h-32 bg-gradient-to-br from-slate-700 to-slate-800">
                      {group.photo_path && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-20"
                          style={{
                            backgroundImage: `url(${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/qurani_storage/${group.photo_path})`
                          }}
                        />
                      )}
                      {/* Group Avatar and Name Section */}
                      <div className="absolute inset-0 flex items-center gap-4 p-4">
                        {group.grup_members[0]?.grup?.category?.id && (
                          <Badge className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide uppercase border border-emerald-400/40 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30 ring-1 ring-emerald-400/20 shadow-sm hover:ring-emerald-300/30 transition text-emerald-400 gap-0">
                            {CATEGORY_LIST.find((cat) => cat.id === Number(group.grup_members[0]?.grup?.category?.id))?.name}
                          </Badge>
                        )}
                        <div className="relative">
                          <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
                            <AvatarImage src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/qurani_storage/${group.photo_path ?? ''}`} alt={group.name} />
                            <AvatarFallback className="bg-gray-600 text-white font-semibold text-xl">
                              {group.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 3)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xl text-white truncate drop-shadow-lg">
                            {group.name}
                          </h3>
                          {(group.city_name && group.province_name) &&
                            <span className="text-gray-300 text-xs line-clamp-1">
                              {`${group.city_name} - ${group.province_name}`}
                            </span>
                          }
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 space-y-3">
                      {/* Description */}
                      <p className="text-slate-600 dark:text-slate-400 text-sm truncate leading-relaxed">
                        {group.description || t('cari grup.card.no_description', 'No description available')}
                      </p>

                      {/* Date and Members */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <span>{formatDate(group.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          <span>{group.grup_members.length} {t('cari grup.card.members', 'Members')}</span>
                        </div>
                      </div>

                      {/* Join Button */}
                      {group.type == "private" ? (
                        <Button
                          onClick={() => handleRequestJoinGroup(group.id)}
                          disabled={isSubmitting === group.id || group.has_requested_join}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          {isSubmitting === group.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          {group.has_requested_join
                            ? t('cari grup.actions.request_sent', 'Request Sent')
                            : t('cari grup.actions.request_join', 'Request Join Group')
                          }
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleJoinGroup(group.id)}
                          disabled={isSubmitting === group.id}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          {isSubmitting === group.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UserRoundPlus className="h-4 w-4 mr-2" />
                          )}
                          {t('cari grup.actions.join', 'Join Group')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex-shrink-0 md:flex-shrink-auto flex justify-center mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) {
                              setCurrentPage(currentPage - 1)
                            }
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(page)
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) {
                              setCurrentPage(currentPage + 1)
                            }
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Filter
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("grup detail.filter.category")}</Label>
              <Select
                value={tempCategoryFilter}
                onValueChange={(value: string) => setTempCategoryFilter(value)}
              >
                <SelectTrigger className="min-h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 mt-2 w-full">
                  <SelectValue placeholder={t("grup detail.filter.category_placeholder")}>
                    <span className="capitalize">
                      {tempCategoryFilter === "all"
                        ? t("grup detail.filter.all")
                        : (CATEGORY_LIST.find((cat) => String(cat.id) === String(tempCategoryFilter))?.name || tempCategoryFilter)}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t("grup detail.filter.all")}</SelectItem>
                  {CATEGORY_LIST
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter_country_id">{t("register.country", "Countries")}</Label>
              <Popover open={openFilterCountry} onOpenChange={setOpenFilterCountry}>
                <PopoverTrigger asChild className="w-full text-left mt-1">
                  <Button variant="outline">
                    {tempLocationFilter.country_name || t("register.select_country", "Select Country")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 z-100">
                  <Command>
                    <CommandInput placeholder={t("register.search_country", "Search Country")} />
                    <CommandList>
                      <CommandGroup>
                        {countries.map((country) => {
                          const countryId = country.id.toString();
                          return (
                            <CommandItem
                              className="w-full flex justify-between"
                              onSelect={() => {
                                setTempLocationFilter((prev) => {
                                  const isSelected = prev.country_id === countryId;
                                  return isSelected
                                    ? {
                                      ...prev,
                                      country_id: "0",
                                      country_name: "",
                                      province_id: "0",
                                      province_name: "",
                                      city_id: "0",
                                      city_name: "",
                                    }
                                    : {
                                      ...prev,
                                      country_id: countryId,
                                      country_name: country.name,
                                      province_id: "0",
                                      province_name: "",
                                      city_id: "0",
                                      city_name: "",
                                    };
                                });
                                setOpenFilterCountry(false);
                                setOpenFilterProvince(false);
                                setOpenFilterCity(false);
                              }}
                              value={country.name}
                              key={country.id}
                            >
                              {country.name}
                              <Check className={`text-red-200 w-4 h-4 ${tempLocationFilter.country_id === countryId ? "opacity-100" : "opacity-0"}`} />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="filter_province_id">{t("register.province", "Province")}</Label>
              <Popover open={openFilterProvince} onOpenChange={setOpenFilterProvince}>
                <PopoverTrigger asChild className="w-full text-left mt-1" disabled={Number(tempLocationFilter.country_id) === 0}>
                  <Button variant="outline">
                    {tempLocationFilter.province_name || t("register.select_province", "Select Province")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 z-100">
                  <Command>
                    <CommandInput placeholder={t("register.search_province", "Search Province")} />
                    <CommandList>
                      <CommandGroup>
                        {filterProvinces.map((province) => {
                          const provinceId = province.id.toString();
                          return (
                            <CommandItem
                              className="w-full flex justify-between"
                              onSelect={() => {
                                setTempLocationFilter((prev) => {
                                  const isSelected = prev.province_id === provinceId;
                                  return isSelected
                                    ? {
                                      ...prev,
                                      province_id: "0",
                                      province_name: "",
                                      city_id: "0",
                                      city_name: "",
                                    }
                                    : {
                                      ...prev,
                                      province_id: provinceId,
                                      province_name: province.name,
                                      city_id: "0",
                                      city_name: "",
                                    };
                                });
                                setOpenFilterProvince(false);
                                setOpenFilterCity(false);
                              }}
                              value={province.name}
                              key={province.id}
                            >
                              {province.name}
                              <Check className={`text-red-200 w-4 h-4 ${tempLocationFilter.province_id === provinceId ? "opacity-100" : "opacity-0"}`} />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="filter_city_id">{t("register.city", "City")}</Label>
              <Popover open={openFilterCity} onOpenChange={setOpenFilterCity}>
                <PopoverTrigger asChild className="w-full text-left mt-1" disabled={Number(tempLocationFilter.province_id) === 0}>
                  <Button variant="outline">
                    {tempLocationFilter.city_name || t("register.select_city", "Select City")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 z-100">
                  <Command>
                    <CommandInput placeholder={t("register.search_city", "Search City")} />
                    <CommandList>
                      <CommandGroup>
                        {filterCities.map((city) => {
                          const cityId = city.id.toString();
                          return (
                            <CommandItem
                              className="w-full flex justify-between"
                              onSelect={() => {
                                setTempLocationFilter((prev) => {
                                  const isSelected = prev.city_id === cityId;
                                  return isSelected
                                    ? {
                                      ...prev,
                                      city_id: "0",
                                      city_name: "",
                                    }
                                    : {
                                      ...prev,
                                      city_id: cityId,
                                      city_name: city.name,
                                    };
                                });
                                setOpenFilterCity(false);
                              }}
                              value={city.name}
                              key={Number(city.id)}
                            >
                              {city.name}
                              <Check className={`text-red-200 w-4 h-4 ${tempLocationFilter.city_id === cityId ? "opacity-100" : "opacity-0"}`} />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="border-2 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-600 text-slate-700 dark:text-slate-300 rounded-xl"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("grup detail.filter.reset")}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelFilters}
                className="flex-1 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl"
              >
                {t("grup detail.filter.cancel")}
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                {t("grup detail.filter.apply")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
