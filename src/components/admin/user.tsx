"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Edit, Eye, ChevronLeft, ChevronRight, X, User as UserIcon, Mail, Users as UsersIcon, Loader2, Filter, Calendar, Users2, Check, Shield, Wallet } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { useDebounce } from "@/hooks/use-debounce"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { normalizeUsername, validateUsername } from "@/utils/validation/username"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { UserDetailDrawer } from "./user-detail-drawer"

// Import from centralized API lib
import {
    usersApi,
    rolesApi,
    masterdataApi,
    walletApi,
    API_BASE,
    UserData,
    CountryData,
    StateData,
    CityData as ApiCityData
} from "@/lib/api"

// Extended User interface for component use
// API returns UserSummaryDto with: userId, username, name, image
interface UserItem extends UserData {
    userId?: number | string;  // API uses userId, not id
    avatar?: string;
    image?: string;
    imageBase64?: string; // Add imageBase64 field
    created?: string;
    createdAt?: string;
}

// Helper to get user ID (API uses userId, our code uses id)
const getUserId = (user: UserItem): string => {
    return String(user.userId || user.id || '')
}

// Helper function to get avatar URL
const getAvatarSrc = (user: UserItem): string | null => {
    // Priority 0: imageBase64 (New standard from API)
    if (user.imageBase64 && user.imageBase64.trim()) {
        const b64 = user.imageBase64.trim();
        // Check if it already has the prefix
        if (b64.startsWith('data:image')) return b64;
        // Assume JPEG/PNG, add generic prefix. Browsers are usually smart enough, strict mime type helps.
        // If exact type is unknown, jpeg is a safe bet for photos.
        return `data:image/jpeg;base64,${b64}`;
    }

    // Priority 1: user.image (from API)
    if (user.image && user.image.trim()) {
        let img = user.image.trim();
        // Check for Base64 in image field (legacy or misusage)
        if (img.startsWith('data:image') || (img.length > 200 && !img.includes('/'))) {
            if (img.startsWith('data:image')) return img;
            return `data:image/jpeg;base64,${img}`;
        }

        // Full URL
        if (img.startsWith('http')) return img;

        // Relative URL - append API Base URL
        // Normalize path: replace backslashes (Windows) with forward slashes
        img = img.replace(/\\/g, '/');

        // Ensure strictly relative path
        const path = img.startsWith('/') ? img : `/${img}`;

        return `${API_BASE}${path}`;
    }

    // Priority 2: user.avatar (legacy field)
    if (user.avatar && user.avatar.trim()) {
        return user.avatar;
    }

    // Priority 3: null (will use AvatarFallback with initials)
    return null;
}

const ITEMS_PER_PAGE = 10

const parseUserItems = (result: any): UserItem[] => {
    if (Array.isArray(result?.data?.items)) return result.data.items
    if (Array.isArray(result?.items)) return result.items
    if (Array.isArray(result?.data?.data)) return result.data.data
    if (Array.isArray(result?.data)) return result.data
    if (Array.isArray(result)) return result
    return []
}

const parseTotalCount = (result: any): number | null => {
    const candidates = [
        result?.data?.pagination?.totalCount,
        result?.data?.totalCount,
        result?.data?.TotalCount,
        result?.pagination?.totalCount,
        result?.totalCount,
        result?.TotalCount,
    ]

    for (const value of candidates) {
        if (typeof value === "number" && Number.isFinite(value)) return value
        if (typeof value === "string" && value.trim()) {
            const parsed = Number(value)
            if (Number.isFinite(parsed)) return parsed
        }
    }

    return null
}

export default function Users() {
    const { t } = useI18n()
    const [searchQuery, setSearchQuery] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UserItem | null>(null)
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
    const [selectedDetailUser, setSelectedDetailUser] = useState<UserItem | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isCheckingUsername, setIsCheckingUsername] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const [usernameError, setUsernameError] = useState('')
    const [editForm, setEditForm] = useState({
        username: '',
        name: '',
        email: '',
        isBlocked: false,
        role: 'member' as 'admin' | 'member' | 'support' | 'billing',
        countryId: null as number | null,
        stateId: null as number | null,
        cityId: null as number | null,
        countryName: '',
        stateName: '',
        cityName: ''
    })

    // Manage role states
    const [manageRoleModal, setManageRoleModal] = useState<{ open: boolean; user: UserItem | null }>({ open: false, user: null })
    const [isManagingRole, setIsManagingRole] = useState(false)
    const [availableRoles, setAvailableRoles] = useState<any[]>([])
    const [selectedRole, setSelectedRole] = useState<string>('')

    useEffect(() => {
        const loadRoles = async () => {
            try {
                const res = await rolesApi.getAll()
                if (res?.success) setAvailableRoles(res.data)
            } catch (e) {}
        }
        loadRoles()
    }, [])

    const handleManageRole = (user: UserItem) => {
        setManageRoleModal({ open: true, user })
        setSelectedRole(user.role || 'member')
    }

    const submitManageRole = async () => {
        if (!manageRoleModal.user || !selectedRole) return
        setIsManagingRole(true)
        try {
            const res = await rolesApi.assign(getUserId(manageRoleModal.user), selectedRole)
            if (res?.success) {
                toast.success(`Role berhasil diubah menjadi ${selectedRole}`)
                setManageRoleModal({ open: false, user: null })
                loadUsers(searchQuery)
            } else {
                toast.error(res?.message || 'Gagal mengubah role')
            }
        } catch (e) {
            toast.error('Terjadi kesalahan')
        } finally {
            setIsManagingRole(false)
        }
    }

    // Wallet Limits State
    const [walletModal, setWalletModal] = useState<{ open: boolean; user: UserItem | null }>({ open: false, user: null })
    const [isSavingWallet, setIsSavingWallet] = useState(false)
    const [walletForm, setWalletForm] = useState({
        dailyTopupLimit: 0,
        dailyWithdrawLimit: 0,
        dailyTransferLimit: 0,
        minWithdrawAmount: 0,
        maxBalance: 0,
    })

    const handleManageWallet = async (user: UserItem) => {
        setWalletModal({ open: true, user })
        try {
            const result = await walletApi.getWalletByUserId(getUserId(user));
            const data = result?.data || result;
            if (data) {
                setWalletForm({
                    dailyTopupLimit: data.dailyTopupLimit || 0,
                    dailyWithdrawLimit: data.dailyWithdrawLimit || 0,
                    dailyTransferLimit: data.dailyTransferLimit || 0,
                    minWithdrawAmount: data.minWithdrawAmount || 0,
                    maxBalance: data.maxBalance || 0,
                });
            }
        } catch (e) {
            console.error("Error fetching wallet", e);
            setWalletForm({
                dailyTopupLimit: 0,
                dailyWithdrawLimit: 0,
                dailyTransferLimit: 0,
                minWithdrawAmount: 0,
                maxBalance: 0,
            });
        }
    }

    const submitWalletLimits = async () => {
        if (!walletModal.user) return;
        setIsSavingWallet(true);
        try {
            const result = await walletApi.getWalletByUserId(getUserId(walletModal.user));
            const data = result?.data || result;
            if (!data?.id) {
                toast.error("Wallet not found for this user");
                return;
            }
            await walletApi.updateWalletLimits(data.id, walletForm);
            toast.success("Wallet limits updated successfully");
            setWalletModal({ open: false, user: null });
        } catch (e) {
            toast.error("Failed to update wallet limits");
        } finally {
            setIsSavingWallet(false);
        }
    }

    // Location states - using API types
    const [countries, setCountries] = useState<CountryData[]>([])
    const [provinces, setProvinces] = useState<StateData[]>([])
    const [cities, setCities] = useState<ApiCityData[]>([])
    const [openCountry, setOpenCountry] = useState(false)
    const [openProvince, setOpenProvince] = useState(false)
    const [openCity, setOpenCity] = useState(false)

    // Filter states
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [fromDate, setFromDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [showFilterModal, setShowFilterModal] = useState(false)

    // Temporary filter states for modal
    const [tempRoleFilter, setTempRoleFilter] = useState<string>('all')
    const [tempStatusFilter, setTempStatusFilter] = useState<string>('all')
    const [tempFromDate, setTempFromDate] = useState<string>('')
    const [tempEndDate, setTempEndDate] = useState<string>('')

    // User data states (from API)
    const [users, setUsers] = useState<UserItem[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [hasNextPage, setHasNextPage] = useState(false)
    const [hasPrevPage, setHasPrevPage] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const debouncedUsername = useDebounce(editForm.username, 500)

    const checkUsernameAvailability = useCallback(async (username: string, currentUserId: string | number) => {
        // Clear error immediately for empty username
        if (!username.trim()) {
            setUsernameError('')
            setIsCheckingUsername(false)
            return true
        }

        // Don't check if username hasn't changed
        if (editingUser && username === editingUser.username?.replace('@', '')) {
            setUsernameError('')
            setIsCheckingUsername(false)
            return true
        }

        setIsCheckingUsername(true)
        setUsernameError('')

        // First, validate username format
        const formatValidationError = validateUsername(username)
        if (formatValidationError) {
            setUsernameError(formatValidationError)
            setIsCheckingUsername(false)
            return false
        }

        // Add small delay to make the 0.5 second debounce more noticeable
        await new Promise(resolve => setTimeout(resolve, 100))

        try {
            // Use API to search for existing username
            const normalizedUsername = normalizeUsername(username)
            const result = await usersApi.search({ keyword: `@${normalizedUsername}`, pageSize: 1 })

            // Check if username exists and belongs to different user
            const existingUsers = parseUserItems(result)
            const existingUser = existingUsers.find((u: UserItem) =>
                u.username === `@${normalizedUsername}` && getUserId(u) !== String(currentUserId)
            )

            if (existingUser) {
                setUsernameError(t('validation.username_exists', 'Username sudah digunakan'))
                return false
            }

            setUsernameError('')
            return true
        } catch {
            setUsernameError(t('validation.username_error', 'Error checking username availability'))
            return false
        } finally {
            setIsCheckingUsername(false)
        }
    }, [editingUser, t])

    // Load users from API
    const loadUsers = useCallback(async (keyword?: string, signal?: AbortSignal) => {
        setIsLoading(true)
        try {
            const params: any = {
                page: currentPage,
                pageSize: ITEMS_PER_PAGE,
            }

            if (keyword) {
                params.keyword = keyword
            }

            if (roleFilter !== "all") {
                params.role = roleFilter
            }

            if (statusFilter !== "all") {
                params.isBlocked = statusFilter === "blocked"
            }

            console.log('[Users] Fetching users with params:', params)
            const result = await usersApi.search(params, undefined, signal)

            // Debug: Log raw API response to understand structure
            console.log('[Users] Raw API response:', JSON.stringify(result, null, 2).substring(0, 500))

            const summaryList = parseUserItems(result)
            const parsedTotal = parseTotalCount(result)
            const paginationInfo = result?.data?.pagination || result?.pagination || {}
            const parsedPageSize = (
                typeof paginationInfo?.pageSize === "number" ? paginationInfo.pageSize :
                typeof paginationInfo?.pageSize === "string" && Number.isFinite(Number(paginationInfo.pageSize)) ? Number(paginationInfo.pageSize) :
                ITEMS_PER_PAGE
            )
            const rawTotalPages = paginationInfo?.totalPages
            const parsedTotalPages: number | null = (
                typeof rawTotalPages === "number" ? rawTotalPages :
                typeof rawTotalPages === "string" && Number.isFinite(Number(rawTotalPages)) ? Number(rawTotalPages) :
                null
            )
            const derivedTotalFromPages = parsedTotalPages !== null ? parsedTotalPages * parsedPageSize : null
            const totalFromResponse = parsedTotal ?? derivedTotalFromPages
            const fallbackTotal = summaryList.length
            const rawHasNext = paginationInfo?.hasNext
            const parsedHasNext: boolean | null = (
                typeof rawHasNext === "boolean" ? rawHasNext :
                typeof rawHasNext === "string" ? rawHasNext.trim().toLowerCase() === "true" :
                null
            )

            console.log('[Users] Parsed totalCount:', parsedTotal, 'from result structure')
            
            // NOTE: Search API only returns UserSummaryDto (userId, username, name, image)
            // We need to fetch profiles and roles in parallel to populate the table properly
            let mergedUsers = summaryList

            if (summaryList.length > 0) {
                // Fetch profiles and roles in parallel
                const fetchPromises = summaryList.map(async (user: any) => {
                    const id = getUserId(user);
                    try {
                        const [profileRes, rolesRes] = await Promise.allSettled([
                            usersApi.getById(id).catch(() => null),
                            rolesApi.getUserRoles(id).catch(() => null)
                        ]);

                        let profileData = null;
                        let rolesData = null;

                        if (profileRes.status === 'fulfilled' && profileRes.value) {
                            const resData = profileRes.value as any;
                            profileData = resData?.data ?? resData;
                        }

                        if (rolesRes.status === 'fulfilled' && rolesRes.value) {
                            const resData = rolesRes.value as any;
                            rolesData = resData?.data ?? resData;
                        }

                        // Determine primary role
                        let role = 'member';
                        if (rolesData && Array.isArray(rolesData)) {
                            const roles = rolesData.map((r: any) => (typeof r === 'string' ? r : r?.name || '').toLowerCase());
                            if (roles.includes('admin')) role = 'admin';
                            else if (roles.includes('support')) role = 'support';
                            else if (roles.includes('billing')) role = 'billing';
                        } else if (profileData?.roles && Array.isArray(profileData.roles)) {
                            const roles = profileData.roles.map((r: any) => (typeof r === 'string' ? r : r?.name || '').toLowerCase());
                            if (roles.includes('admin')) role = 'admin';
                            else if (roles.includes('support')) role = 'support';
                            else if (roles.includes('billing')) role = 'billing';
                        } else if (profileData?.role) {
                            role = String(profileData.role).toLowerCase();
                        }

                        // Clear stale imageBase64 if profileData has fresh image and no new imageBase64
                        let updatedUser = { ...user };
                        if (profileData && profileData.image && !profileData.imageBase64) {
                            updatedUser.imageBase64 = undefined;
                        }

                        return {
                            ...updatedUser,
                            ...profileData, // Merge profile data (email, created, isBlocked, etc.)
                            userId: id,     // Ensure userId is preserved
                            role: role      // Set calculated role
                        };
                    } catch (err) {
                        console.warn(`[Users] Failed to fetch details for user ${id}:`, err);
                        return user;
                    }
                });

                mergedUsers = await Promise.all(fetchPromises);
            }

            // Data user sudah full dari Qurani API (search + getById + getUserRoles)
            // Tidak perlu lagi overlay dari Supabase user_profiles
            console.log('[Users] Loaded', mergedUsers.length, 'users dari Qurani API. Total:', totalFromResponse ?? fallbackTotal)
            setUsers(mergedUsers)
            setTotalCount((prev) => {
                if (typeof totalFromResponse === "number" && totalFromResponse >= mergedUsers.length) {
                    return totalFromResponse
                }

                if (currentPage === 1) {
                    return Math.max(fallbackTotal, prev)
                }

                const minimumKnownTotal = ((currentPage - 1) * ITEMS_PER_PAGE) +
                    (mergedUsers.length === ITEMS_PER_PAGE ? ITEMS_PER_PAGE + 1 : mergedUsers.length)
                return Math.max(prev, minimumKnownTotal)
            })
            setHasNextPage(
                parsedHasNext ?? (
                    mergedUsers.length === ITEMS_PER_PAGE &&
                    (typeof totalFromResponse === "number"
                        ? currentPage * ITEMS_PER_PAGE < totalFromResponse
                        : true)
                )
            )
            setHasPrevPage(currentPage > 1)
        } catch (error: any) {
            // Ignore abort errors
            if (error.name === 'AbortError') {
                console.log('[Users] Fetch aborted')
                return
            }
            console.error('[Users] Error loading users:', error)
            toast.error(t('users.error_loading', 'Gagal memuat data pengguna'))
            setUsers([])
            setHasNextPage(false)
            setHasPrevPage(currentPage > 1)
        } finally {
            if (!signal?.aborted) {
                setIsLoading(false)
            }
        }
    }, [currentPage, roleFilter, statusFilter, t])

    useEffect(() => {
        // No AbortController to avoid "canceled" status logging in dev console
        loadUsers(searchQuery || undefined)
    }, [loadUsers, searchQuery])

    // Load countries on mount
    useEffect(() => {
        const loadCountries = async () => {
            try {
                const result = await masterdataApi.countries.getAll()
                // Handle both array response and wrapped response
                const data = Array.isArray(result) ? result : ((result as any)?.data || result || [])
                setCountries(data as CountryData[])
            } catch (error) {
                console.error("[Users] Error loading countries:", error)
            }
        }
        loadCountries()
    }, [])

    // Load states when country changes
    useEffect(() => {
        const loadStates = async () => {
            if (!editForm.countryId || editForm.countryId === 0) {
                setProvinces([])
                setCities([])
                return
            }
            try {
                const result = await masterdataApi.states.getByCountryId(editForm.countryId)
                const data = Array.isArray(result) ? result : ((result as any)?.data || result || [])
                setProvinces(data as StateData[])
            } catch (error) {
                console.error("[Users] Error loading states:", error)
            }
        }
        loadStates()
    }, [editForm.countryId])

    // Load cities when state changes
    useEffect(() => {
        const loadCities = async () => {
            if (!editForm.stateId || editForm.stateId === 0) {
                setCities([])
                return
            }
            try {
                const result = await masterdataApi.cities.getByState(editForm.stateId)
                const data = Array.isArray(result) ? result : ((result as any)?.data || result || [])
                setCities(data as ApiCityData[])
            } catch (error) {
                console.error("[Users] Error loading cities:", error)
            }
        }
        loadCities()
    }, [editForm.stateId])

    // Validate username when it changes (with 0.5 second delay)
    useEffect(() => {
        if (editingUser) {
            checkUsernameAvailability(debouncedUsername, getUserId(editingUser))
        }
    }, [debouncedUsername, editingUser, checkUsernameAvailability])

    useEffect(() => {
        const roleParam = searchParams?.get("role")
        const statusParam = searchParams?.get("status")

        const validRoles = new Set(["admin", "member", "support", "billing"])
        const validStatuses = new Set(["active", "blocked"])

        if (roleParam && validRoles.has(roleParam)) {
            setRoleFilter(roleParam)
            setTempRoleFilter(roleParam)
        }

        if (statusParam && validStatuses.has(statusParam)) {
            setStatusFilter(statusParam)
            setTempStatusFilter(statusParam)
        }
    }, [searchParams])

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [roleFilter, statusFilter, fromDate, endDate])

    // Since API handles pagination and basic filtering, we only need client-side date filtering
    // Ensure users is always an array before filtering
    const safeUsers = Array.isArray(users) ? users : []
    const filteredUsers = safeUsers
        .filter((user: UserItem) => {
            // Date range filter (API doesn't support this, so we filter client-side)
            if (fromDate || endDate) {
                const userCreated = user.created || user.createdAt
                if (!userCreated) return false
                const userDate = new Date(userCreated)
                const startDate = fromDate ? new Date(fromDate) : null
                const endDateObj = endDate ? new Date(endDate) : null

                // Set time to beginning/end of day for proper comparison
                if (startDate) {
                    startDate.setHours(0, 0, 0, 0)
                }
                if (endDateObj) {
                    endDateObj.setHours(23, 59, 59, 999)
                }

                if (startDate && userDate < startDate) return false
                if (endDateObj && userDate > endDateObj) return false
            }

            return true
        })
        // Default sort by created descending (newest first)
        .sort((a: UserItem, b: UserItem) => {
            const dateA = (a.created || a.createdAt) ? new Date(a.created || a.createdAt || '').getTime() : 0
            const dateB = (b.created || b.createdAt) ? new Date(b.created || b.createdAt || '').getTime() : 0
            return dateB - dateA
        })

    // Pagination - API handles this, but we keep display logic
    const actualTotalUsers = totalCount || filteredUsers.length
    const totalPages = Math.ceil(actualTotalUsers / ITEMS_PER_PAGE)
    const inferredTotalPages = Math.max(
        currentPage,
        totalPages > 0 ? totalPages : 1,
        hasNextPage ? currentPage + 1 : currentPage
    )
    const shouldShowPagination = inferredTotalPages > 1 || currentPage > 1 || hasNextPage
    const canGoNext = hasNextPage || currentPage < inferredTotalPages
    const paginatedUsers = filteredUsers // Already paginated by API

    // Pagination display
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const startItem = actualTotalUsers > 0 ? startIndex + 1 : 0
    const endItem = Math.min(startIndex + paginatedUsers.length, actualTotalUsers)

    const handleSearch = () => {
        setCurrentPage(1) // Reset to first page when searching
        // debouncedSearch syncs with searchQuery automatically via useDebounce
    }

    // Removed handleSort function since we're not using sorting anymore

    const openFilterModal = () => {
        // Set temporary values to current filter values
        setTempRoleFilter(roleFilter)
        setTempStatusFilter(statusFilter)
        setTempFromDate(fromDate)
        setTempEndDate(endDate)
        setShowFilterModal(true)
    }

    const applyFilters = () => {
        // Apply temporary values to actual filter values
        setRoleFilter(tempRoleFilter)
        setStatusFilter(tempStatusFilter)
        setFromDate(tempFromDate)
        setEndDate(tempEndDate)
        setCurrentPage(1)
        setShowFilterModal(false)
    }

    const cancelFilters = () => {
        // Reset temporary values to current filter values
        setTempRoleFilter(roleFilter)
        setTempStatusFilter(statusFilter)
        setTempFromDate(fromDate)
        setTempEndDate(endDate)
        setShowFilterModal(false)
    }

    const resetFiltersInModal = () => {
        setTempRoleFilter('all')
        setTempStatusFilter('all')
        setTempFromDate('')
        setTempEndDate('')
    }

    const formatDate = (dateString: string) => {
        try {
            // Handle both ISO format and the specific format mentioned
            const date = new Date(dateString)

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return dateString // Return original if invalid
            }

            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return dateString // Return original string if parsing fails
        }
    }


    const handleEdit = (userId: string | number) => {
        const user = users.find((u: UserItem) => getUserId(u) === String(userId))
        if (user) {
            setEditingUser(user)
            // Validate and set role - ensure it's one of the valid roles
            const validRoles: ('admin' | 'member' | 'support' | 'billing')[] = ['admin', 'member', 'support', 'billing']
            const userRole = user.role as 'admin' | 'member' | 'support' | 'billing'
            const role = validRoles.includes(userRole) ? userRole : 'member'

            setEditForm({
                username: user.username?.startsWith('@') ? user.username.slice(1) : user.username || '', // Remove @ for editing
                name: user.name || '',
                email: user.email || '',
                isBlocked: user.isBlocked || false,
                role: role,
                countryId: user.countryId || null,
                stateId: user.stateId || null,
                cityId: user.cityId || null,
                countryName: user.countryName || '',
                stateName: user.stateName || '',
                cityName: user.cityName || ''
            })
            setIsEditModalOpen(true)
        }
    }

    const handleOpenDetail = (userId: string | number) => {
        const user = users.find((u: UserItem) => getUserId(u) === String(userId))
        if (user) {
            setSelectedDetailUser(user)
            setIsDetailDrawerOpen(true)
        }
    }

    const handleSaveChanges = async () => {
        if (editingUser) {
            // Basic validation for required fields
            if (!editForm.username.trim()) {
                setUsernameError(t('validation.username_required', 'Username is required'))
                return
            }

            // Validate username first
            const editingUserId = getUserId(editingUser)
            const isUsernameValid = await checkUsernameAvailability(editForm.username, editingUserId)
            if (!isUsernameValid) {
                return // Don't save if username is invalid
            }

            setIsSaving(true)
            try {
                const normalizedUsername = normalizeUsername(editForm.username)
                const updateData = {
                    username: `@${normalizedUsername}`,
                    name: editForm.name,
                    email: editForm.email,
                    isBlocked: editForm.isBlocked,
                    role: editForm.role,
                    countryId: editForm.countryId,
                    stateId: editForm.stateId,
                    cityId: editForm.cityId,
                    countryName: editForm.countryName,
                    stateName: editForm.stateName,
                    cityName: editForm.cityName,
                    previousUsername: editingUser.username || ""
                }
                const response = await fetch(`/api/admin/users/${encodeURIComponent(editingUserId)}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(updateData),
                })

                if (!response.ok) {
                    const errorPayload = await response.json().catch(() => null)
                    throw new Error(errorPayload?.message || `API Error: ${response.status}`)
                }

                const result = await response.json().catch(() => null)
                console.log('[Users] Update response:', result)

                // Update table immediately without refetching API page
                setUsers((prev) => prev.map((u) => {
                    if (getUserId(u) !== editingUserId) return u
                    return {
                        ...u,
                        username: updateData.username,
                        name: updateData.name,
                        email: updateData.email,
                        isBlocked: updateData.isBlocked,
                        role: updateData.role,
                        countryId: updateData.countryId || undefined,
                        stateId: updateData.stateId || undefined,
                        cityId: updateData.cityId || undefined,
                        countryName: updateData.countryName || undefined,
                        stateName: updateData.stateName || undefined,
                        cityName: updateData.cityName || undefined,
                    }
                }))

                setIsEditModalOpen(false)
                setEditingUser(null)
                setUsernameError('')
                toast.success(t('messages.update_success', 'User profile updated successfully'))
            } catch (error) {
                console.error('Error updating user:', error)
                toast.error(t('messages.update_error', 'Failed to update user profile'))
            } finally {
                setIsSaving(false)
            }
        }
    }

    const handleCancelEdit = () => {
        setIsEditModalOpen(false)
        setEditingUser(null)
        setEditForm({
            username: '',
            name: '',
            email: '',
            isBlocked: false,
            role: 'member' as 'admin' | 'member' | 'support' | 'billing',
            countryId: null,
            stateId: null,
            cityId: null,
            countryName: '',
            stateName: '',
            cityName: ''
        })
    }


    return (
        <div className="max-w-7xl mx-auto">
            <Card className="rounded-none py-0 bg-transparent dark:bg-transparent border-none shadow-none">
                <CardHeader className="px-0" >
                    <CardTitle className="flex-shrink-0 md:flex-shrink-auto w-full mx-auto md:max-w-7xl p">
                        <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                            <div className="flex items-center justify-center">
                                <Users2 className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                                {t('title', 'Daftar Pengguna')}
                            </h1>
                        </div>
                    </CardTitle>
                </CardHeader>

                <CardContent className="px-0 space-y-6">
                    {/* Search and Filter Bar */}
                    <div className="space-y-4">
                        {/* Search Row */}
                        <div className="flex gap-2 sm:gap-3 items-center">
                            <div className="flex items-center w-full md:w-96 h-10 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400">
                                <Search className="ml-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder={t('search_placeholder', 'Cari berdasarkan username...')}
                                    value={searchInput}
                                    onChange={e => setSearchInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            setSearchQuery(searchInput);
                                            setCurrentPage(1);
                                        }
                                    }}
                                    className="w-full h-full px-3 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-700 dark:text-gray-200"
                                />
                                <button
                                    onClick={() => { setSearchQuery(searchInput); setCurrentPage(1); }}
                                    className="h-full px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors flex items-center gap-2"
                                >
                                    <Search className="w-4 h-4" /> Cari
                                </button>
                            </div>

                            <button
                                onClick={openFilterModal}
                                className={`relative flex items-center gap-1.5 h-10 px-3 text-xs font-medium rounded-lg border transition-colors flex-shrink-0 ${
                                    roleFilter !== 'all' || statusFilter !== 'all' || fromDate || endDate
                                        ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-emerald-400'
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('filters', 'Filter')}</span>
                                {(roleFilter !== 'all' || statusFilter !== 'all' || fromDate || endDate) && (
                                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white text-emerald-600 text-[9px] font-bold flex-shrink-0">
                                        {[roleFilter !== 'all' ? 1 : 0, statusFilter !== 'all' ? 1 : 0, (fromDate || endDate) ? 1 : 0].reduce((a, b) => a + b, 0)}
                                    </span>
                                )}
                            </button>
                        </div>

                    </div>

                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-2">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                                            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                        </div>
                                        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                    </div>
                                </div>
                            ))
                        ) : paginatedUsers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                {searchQuery.trim() ? `Data "${searchQuery}" tidak ditemukan` : 'Tidak ada pengguna ditemukan'}
                            </div>
                        ) : (
                            paginatedUsers.map((user) => {
                                const roleConfig: Record<string, { className: string; label: string }> = {
                                    admin: { className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', label: 'Admin' },
                                    support: { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Support' },
                                    billing: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Billing' },
                                    member: { className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: 'Member' },
                                }
                                const rConfig = roleConfig[user.role || 'member'] || roleConfig.member
                                return (
                                    <div key={getUserId(user)} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <Link href={'/profile/' + getUserId(user)}>
                                                <Avatar className="w-10 h-10 flex-shrink-0">
                                                    <AvatarImage src={getAvatarSrc(user) || undefined} alt={user.name || user.username || ''} />
                                                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                                        {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <button onClick={() => handleOpenDetail(getUserId(user))} className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-emerald-600 transition-colors text-left">
                                                        {user.name || user.username}
                                                    </button>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${(user.isBlocked) ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                        {user.isBlocked ? 'Diblokir' : 'Aktif'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.username}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email || '-'}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rConfig.className}`}>
                                                        {rConfig.label}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => handleOpenDetail(getUserId(user))} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleManageRole(user)} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                                                            <Shield className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.photo', 'Photo')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.username', 'Username')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.full_name', 'Full Name')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.email', 'Email')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.join_date', 'Tanggal Bergabung')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.role', 'Role')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">{t('table_headers.status', 'Status')}</TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">{t('table_headers.actions', 'Aksi')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                                                    <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4"><div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                                            <TableCell className="py-4"><div className="w-40 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                                            <TableCell className="py-4"><div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                                            <TableCell className="py-4"><div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /></TableCell>
                                            <TableCell className="py-4"><div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /></TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex space-x-2">
                                                    <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                    <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                                            {searchQuery.trim() ? t('search_no_results', `Data "${searchQuery}" tidak ditemukan`).replace('{searchTerm}', searchQuery) : t('no_data', 'Tidak ada pengguna ditemukan')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <TableRow key={getUserId(user)} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <TableCell className="py-2 px-3">
                                                <div className="flex items-center space-x-3">
                                                    <Link href={'/profile/' + getUserId(user)}>
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarImage src={getAvatarSrc(user) || undefined} alt={user.name || user.username || ''} />
                                                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-semibold">
                                                                {user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : user.username?.charAt(1) || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 px-3" onClick={() => handleOpenDetail(getUserId(user))}>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                                                    {user.username}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2 px-3 text-sm text-gray-900 dark:text-white">{user.name}</TableCell>
                                            <TableCell className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{user.email || '-'}</TableCell>
                                            <TableCell className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">
                                                {(user.created || user.createdAt) ? formatDate(user.created || user.createdAt || '') : '-'}
                                            </TableCell>
                                            <TableCell className="py-2 px-3">
                                                {(() => {
                                                    if (!user.role) return <span className="text-gray-400 text-sm">-</span>
                                                    const role = user.role
                                                    const roleConfig = {
                                                        admin: { className: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800', label: t('roles.admin', 'Admin') },
                                                        support: { className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800', label: t('roles.support', 'Support') },
                                                        billing: { className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', label: t('roles.billing', 'Billing') },
                                                        member: { className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', label: t('roles.member', 'Member') }
                                                    }
                                                    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member
                                                    return <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium border ${config.className} rounded-md shadow-sm`}>{config.label}</Badge>
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-2 px-3">
                                                <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium border rounded-md shadow-sm ${(user.isBlocked || false) ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'}`}>
                                                    {(user.isBlocked || false) ? t('status.blocked', 'Diblokir') : t('status.active', 'Aktif')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 px-3">
                                                <div className="flex items-center space-x-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(getUserId(user))} className="h-8 w-8 p-0 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleManageRole(user)} title="Kelola Role" className="h-8 w-8 p-0 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                                                        <Shield className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {shouldShowPagination && (
                        <div className="flex flex-col-reverse gap-3 items-center pt-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {t('pagination.showing', 'Menampilkan {start} - {end} dari {total} pengguna')
                                    .replace('{start}', startItem.toString())
                                    .replace('{end}', endItem.toString())
                                    .replace('{total}', actualTotalUsers.toString())}
                                {searchQuery.trim() && ` (hasil pencarian "${searchQuery}")`}
                            </div>
                            <div className="flex items-center flex-wrap gap-1">
                                {/* Previous Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={!hasPrevPage && currentPage === 1}
                                    className="h-9 px-2 text-gray-500 hover:text-gray-700 disabled:text-gray-400"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    <span>Previous</span>
                                </Button>
                                {/* Page Numbers */}
                                {(() => {
                                    const pages = [];
                                    const showPages = 5;
                                    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                                    let endPage = Math.min(inferredTotalPages, startPage + showPages - 1);
                                    if (endPage - startPage + 1 < showPages) {
                                        startPage = Math.max(1, endPage - showPages + 1);
                                        endPage = Math.min(inferredTotalPages, startPage + showPages - 1);
                                    }

                                    for (let i = startPage; i <= endPage; i++) {
                                        pages.push(
                                            <Button
                                                key={i}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCurrentPage(i)}
                                                className={`h-9 w-9 p-0 text-sm ${currentPage === i
                                                    ? "bg-emerald-600 text-white hover:bg-emerald-600 rounded-lg"
                                                    : "text-gray-700 hover:bg-gray-100 rounded-lg"
                                                    }`}
                                            >
                                                {i}
                                            </Button>
                                        );
                                    }
                                    return pages;
                                })()}
                                {/* Next Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    disabled={!canGoNext}
                                    className="h-9 px-2 text-gray-700 hover:text-gray-900 disabled:text-gray-400"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Edit User Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4">
                        <div className="flex justify-between items-center">
                            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                                {t('edit_user.title', 'Edit Data Pengguna')}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="space-y-2">
                        {/* Username Field */}
                        <div>
                            <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.username_label', 'Username')} <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    id="username"
                                    value={editForm.username || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                    className={`pl-10 pr-10 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg ${usernameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                                        }`}
                                    placeholder={t('edit_user.username_placeholder', 'johndoe123')}
                                />
                                {isCheckingUsername && (
                                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                )}
                            </div>
                            {!usernameError && !isCheckingUsername && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {t('edit_user.username_hint', '3-20 karakter, huruf, angka, dan underscore saja')}
                                </p>
                            )}
                            {usernameError && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{usernameError}</p>
                            )}
                        </div>

                        {/* Full Name Field */}
                        <div>
                            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.full_name_label', 'Nama Pengguna')}
                            </Label>
                            <div className="relative">
                                <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    id="fullName"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                    placeholder={t('edit_user.full_name_placeholder', 'John Doe')}
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div>
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.email_label', 'Email')}
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    id="email"
                                    type="email"
                                    disabled
                                    value={editForm.email || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                    placeholder={t('edit_user.email_placeholder', 'john.doe@example.com')}
                                />
                            </div>
                        </div>

                        {/* Country Field */}
                        <div>
                            <Label htmlFor="country" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("register.country", "Countries")}
                            </Label>
                            <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                <PopoverTrigger asChild className="w-full text-left">
                                    <Button variant="outline" className="w-full justify-start">
                                        {editForm.countryName || t("register.select_country", "Select Country")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0">
                                    <Command>
                                        <CommandInput placeholder={t("register.search_country", "Search Country")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {countries.map((country) => (
                                                    <CommandItem
                                                        className="w-full flex justify-between"
                                                        onSelect={() => {
                                                            if (editForm.countryId === country.id) {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    countryId: null,
                                                                    countryName: '',
                                                                    stateId: null,
                                                                    stateName: '',
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                            } else {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    countryId: country.id,
                                                                    countryName: country.name,
                                                                    stateId: null,
                                                                    stateName: '',
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                                setOpenCountry(false)
                                                            }
                                                        }}
                                                        value={country.name}
                                                        key={country.id}
                                                    >
                                                        {country.name}
                                                        <Check className={`w-4 h-4 ${editForm.countryId === country.id ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Province/State Field */}
                        <div>
                            <Label htmlFor="province" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("register.province", "Province")}
                            </Label>
                            <Popover open={openProvince} onOpenChange={setOpenProvince}>
                                <PopoverTrigger asChild className="w-full text-left" disabled={!editForm.countryId}>
                                    <Button variant="outline" className="w-full justify-start" disabled={!editForm.countryId}>
                                        {editForm.stateName || t("register.select_province", "Select Province")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0">
                                    <Command>
                                        <CommandInput placeholder={t("register.search_province", "Search Province")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {provinces.map((province) => (
                                                    <CommandItem
                                                        className="w-full flex justify-between"
                                                        onSelect={() => {
                                                            if (editForm.stateId === province.id) {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    stateId: null,
                                                                    stateName: '',
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                            } else {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    stateId: province.id,
                                                                    stateName: province.name,
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                                setOpenProvince(false)
                                                            }
                                                        }}
                                                        value={province.name}
                                                        key={province.id}
                                                    >
                                                        {province.name}
                                                        <Check className={`w-4 h-4 ${editForm.stateId === province.id ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* City Field */}
                        <div>
                            <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("register.city", "City")}
                            </Label>
                            <Popover open={openCity} onOpenChange={setOpenCity}>
                                <PopoverTrigger asChild className="w-full text-left" disabled={!editForm.stateId}>
                                    <Button variant="outline" className="w-full justify-start" disabled={!editForm.stateId}>
                                        {editForm.cityName || t("register.select_city", "Select City")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0">
                                    <Command>
                                        <CommandInput placeholder={t("register.search_city", "Search City")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {cities.map((city) => (
                                                    <CommandItem
                                                        className="w-full flex justify-between"
                                                        onSelect={() => {
                                                            if (editForm.cityId === city.id) {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                            } else {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    cityId: city.id,
                                                                    cityName: city.name
                                                                }))
                                                                setOpenCity(false)
                                                            }
                                                        }}
                                                        value={city.name}
                                                        key={Number(city.id)}
                                                    >
                                                        {city.name}
                                                        <Check className={`w-4 h-4 ${editForm.cityId === city.id ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Role Field */}
                        <div>
                            <Label htmlFor="role" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.role_label', 'Role')}
                            </Label>
                            <Select
                                value={editForm.role}
                                onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value as 'admin' | 'member' | 'support' | 'billing' }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('edit_user.role_placeholder', 'Pilih role')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                            <span>{t('roles.admin', 'Admin')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="support">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                            <span>{t('roles.support', 'Support')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="billing">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span>{t('roles.billing', 'Billing')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="member">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <span>{t('roles.member', 'Member')}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Field */}
                        <div>
                            <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.status_label', 'Aktif')}
                            </Label>
                            {editingUser && users.length > 0 && getUserId(editingUser) === getUserId(users[users.length - 1]) ? (
                                // Read-only display for the last user
                                <div className="flex items-center space-x-2 p-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800">
                                    <div className={`w-3 h-3 rounded-full ${editForm.isBlocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {editForm.isBlocked ? t('edit_user.status_blocked', 'Tidak') : t('edit_user.status_active', 'Ya')}
                                    </span>
                                </div>
                            ) : (
                                // Editable select for other users
                                <Select
                                    value={editForm.isBlocked?.toString() || 'false'}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, isBlocked: value === 'true' }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={t('edit_user.status_placeholder', 'Pilih status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="false">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                <span>{t('edit_user.status_active', 'Ya')}</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="true">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span>{t('edit_user.status_blocked', 'Tidak')}</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
                            >
                                {t('edit_user.cancel_button', 'Batal')}
                            </Button>
                            <Button
                                onClick={handleSaveChanges}
                                disabled={isSaving || !!usernameError || isCheckingUsername}
                                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {t('edit_user.saving_button', 'Menyimpan...')}
                                    </>
                                ) : (
                                    t('edit_user.save_button', 'Simpan')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Filter Modal */}
            <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            {t('filter_modal.title', 'Filter Users')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Role Filter */}
                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                {t('filter_modal.filter_by_role', 'Filter by Role')}
                            </Label>
                            <Select value={tempRoleFilter} onValueChange={setTempRoleFilter}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('select_role', 'Select role')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('filter_modal.role.all', 'All Roles')}</SelectItem>
                                    <SelectItem value="admin">{t('filter_modal.role.admin', 'Admin')}</SelectItem>
                                    <SelectItem value="support">{t('filter_modal.role.support', 'Support')}</SelectItem>
                                    <SelectItem value="billing">{t('filter_modal.role.billing', 'Billing')}</SelectItem>
                                    <SelectItem value="member">{t('filter_modal.role.member', 'Member')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                {t('filter_modal.filter_by_status', 'Filter by Status')}
                            </Label>
                            <Select value={tempStatusFilter} onValueChange={setTempStatusFilter}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('select_status', 'Select status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('filter_modal.status.all', 'All Status')}</SelectItem>
                                    <SelectItem value="active">{t('filter_modal.status.active', 'Active')}</SelectItem>
                                    <SelectItem value="blocked">{t('filter_modal.status.blocked', 'Blocked')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range Filter */}
                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                {t('filter_modal.filter_by_date', 'Filter by Date Range')}
                            </Label>
                            <div className="space-y-3">
                                {/* From Date */}
                                <div>
                                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                        {t('filter_modal.from_date', 'From Date')}
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            type="date"
                                            value={tempFromDate}
                                            onChange={(e) => setTempFromDate(e.target.value)}
                                            className="pl-10 w-full"
                                            max={tempEndDate || undefined}
                                        />
                                    </div>
                                </div>

                                {/* End Date */}
                                <div>
                                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                        {t('filter_modal.to_date', 'To Date')}
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            type="date"
                                            value={tempEndDate}
                                            onChange={(e) => setTempEndDate(e.target.value)}
                                            className="pl-10 w-full"
                                            min={tempFromDate || undefined}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={resetFiltersInModal}
                            className="flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            {t('filter_modal.reset', 'Reset')}
                        </Button>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={cancelFilters}
                            >
                                {t('filter_modal.cancel', 'Cancel')}
                            </Button>
                            <Button
                                onClick={applyFilters}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                            >
                                {t('filter_modal.apply', 'Apply Filters')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Role Modal */}
            <Dialog open={manageRoleModal.open} onOpenChange={(open) => !open && setManageRoleModal({ open: false, user: null })}>
                <DialogContent className="sm:max-w-md dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                            Kelola Role Pengguna
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={manageRoleModal.user ? getAvatarSrc(manageRoleModal.user) || undefined : undefined} />
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {manageRoleModal.user?.name ? manageRoleModal.user.name.charAt(0) : 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{manageRoleModal.user?.name}</p>
                                <p className="text-xs text-gray-500">{manageRoleModal.user?.username}</p>
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                                Pilih Role
                            </Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih Role..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableRoles.length > 0 ? availableRoles.map(r => (
                                        <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                                    )) : (
                                        <>
                                            <SelectItem value="admin">admin</SelectItem>
                                            <SelectItem value="member">member</SelectItem>
                                            <SelectItem value="billing">billing</SelectItem>
                                            <SelectItem value="support">support</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-gray-500 mt-2">
                                Role menentukan hak akses halaman mana saja yang dapat dibuka oleh pengguna.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button
                            variant="outline"
                            onClick={() => setManageRoleModal({ open: false, user: null })}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={submitManageRole}
                            disabled={isManagingRole || !selectedRole}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isManagingRole ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan Role"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Wallet Limits Modal */}
            <Dialog open={walletModal.open} onOpenChange={(open) => !open && setWalletModal({ open: false, user: null })}>
                <DialogContent className="sm:max-w-md dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                            Kelola Limit Wallet
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={walletModal.user ? getAvatarSrc(walletModal.user) || undefined : undefined} />
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {walletModal.user?.name ? walletModal.user.name.charAt(0) : 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{walletModal.user?.name}</p>
                                <p className="text-xs text-gray-500">{walletModal.user?.username}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Limit Topup Harian</Label>
                                <Input 
                                    type="number" 
                                    value={walletForm.dailyTopupLimit}
                                    onChange={(e) => setWalletForm({...walletForm, dailyTopupLimit: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Limit Withdraw Harian</Label>
                                <Input 
                                    type="number" 
                                    value={walletForm.dailyWithdrawLimit}
                                    onChange={(e) => setWalletForm({...walletForm, dailyWithdrawLimit: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Limit Transfer Harian</Label>
                                <Input 
                                    type="number" 
                                    value={walletForm.dailyTransferLimit}
                                    onChange={(e) => setWalletForm({...walletForm, dailyTransferLimit: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min. Withdraw Amount</Label>
                                <Input 
                                    type="number" 
                                    value={walletForm.minWithdrawAmount}
                                    onChange={(e) => setWalletForm({...walletForm, minWithdrawAmount: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maksimal Saldo (Max Balance)</Label>
                                <Input 
                                    type="number" 
                                    value={walletForm.maxBalance}
                                    onChange={(e) => setWalletForm({...walletForm, maxBalance: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button
                            variant="outline"
                            onClick={() => setWalletModal({ open: false, user: null })}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={submitWalletLimits}
                            disabled={isSavingWallet}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isSavingWallet ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan Limit"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <UserDetailDrawer 
                isOpen={isDetailDrawerOpen} 
                onClose={() => { setIsDetailDrawerOpen(false); setSelectedDetailUser(null); }} 
                user={selectedDetailUser} 
                onEdit={(userId) => {
                    handleEdit(userId)
                }}
            />
        </div>
    )
}
