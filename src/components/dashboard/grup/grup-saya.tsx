"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
// Removed unused imports
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Users, Settings, Crown, Shield, Component, Filter, ClockAlert, ArchiveRestore, MoreVerticalIcon, FlagIcon, AlertCircle, Check, RotateCcw, Search, BadgeCheck, Trash2 } from "lucide-react"
import { useForm } from "@/hooks/handleChange"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { motion, useInView } from "motion/react"
import { groupsApi } from "@/lib/api"

import { useRouter, useSearchParams } from "next/navigation"
import { insertGrup } from "@/utils/api/grup/insert"
import { useI18n } from "@/components/providers/i18n-provider"
import { useGroupsData, useGroupMutations } from "@/hooks/use-grup-data"
import type { MappedGroup } from "@/types/grup";
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageCrop, ImageCropApply, ImageCropContent } from "@/components/kibo-ui/image-crop"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { restoreGroup } from "@/utils/api/grup/restore"
import { CATEGORY_LIST } from "@/data/categories-data"
import Link from "next/link"
import { createReport } from "@/utils/api/reports/insert"
import { generateId } from "@/lib/generateId"
import { createClient } from "@/utils/supabase/client"
import { fetchCountries } from "@/utils/api/countries/fetch"
import { fetchStates } from "@/utils/api/states/fetch"
import { fetchCities } from "@/utils/api/city/fetch"
import { ProvinceData } from "@/types/provinces"
import { CityData } from "@/types/cities"


interface AnimatedGroupItemProps {
  children: React.ReactNode;
  delay?: number;
  index: number;
}


const AnimatedGroupItem: React.FC<AnimatedGroupItemProps> = ({ children, delay = 0, index }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.9, opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay: delay * index }}
    >
      {children}
    </motion.div>
  );
};

export function GrupSaya() {
  const { t, locale } = useI18n()
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<MappedGroup | null>(null)
  const [showAllGroups] = useState(true) // Always show all groups
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [isRestore, setIsRestore] = useState<boolean>(false)
  const [openDialogReport, setOpenDialogReport] = useState<boolean>(false)
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false)

  // Delete group states
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false)
  const [groupToDelete, setGroupToDelete] = useState<MappedGroup | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const categoryList = CATEGORY_LIST

  // Filter states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all")
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>("all")
  const [selectedStatusGrup, setSelectedStatusGrup] = useState<"active" | "deleted">("active")
  const [tempStatusGrup, setTempStatusGrup] = useState<"active" | "deleted">("active")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Form state for creating new group
  const { userId } = useAuth();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string>("");
  const [dataReport, setDataReport] = useState({
    violation: "",
    title: "",
    detail: "",
    evidence: null as File | null,
    type: "",
    grup_id: ""
  })

  const [countries, setCountries] = useState<ProvinceData[]>([]);
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [filterProvinces, setFilterProvinces] = useState<ProvinceData[]>([]);
  const [filterCities, setFilterCities] = useState<CityData[]>([]);

  const [openCountry, setOpenCountry] = useState(false);
  const [openProvince, setOpenProvince] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const [openFilterCountry, setOpenFilterCountry] = useState(false);
  const [openFilterProvince, setOpenFilterProvince] = useState(false);
  const [openFilterCity, setOpenFilterCity] = useState(false);

  const [locationData, setLocationData] = useState({
    country_id: null,
    states_id: null,
    city_id: null,
    country_name: "",
    states_name: "",
    city_name: "",
  })
  const [locationFilter, setLocationFilter] = useState({
    country_id: "0",
    country_name: "",
    province_id: "0",
    province_name: "",
    city_id: "0",
    city_name: "",
  });
  const [tempLocationFilter, setTempLocationFilter] = useState(locationFilter);


  // Note: User location data query removed - columns may not exist in Supabase table
  // Location filtering for groups uses API-based data instead

  const { data, handleChange, resetForm, setFormData } = useForm({
    name: "",
    category: "",
    description: "",
    status: "public",
    owner_id: userId || "",
    country_id: locationData.country_id || "0",
    country_name: locationData.country_name || "",
    province_id: locationData.states_id || "0",
    province_name: locationData.states_name || "",
    city_id: locationData.city_id || "0",
    city_name: locationData.city_name || "",
  });

  useEffect(() => {
    // Hanya update jika locationData ada dan form BELUM diisi
    if (
      locationData.country_name &&
      (!data.country_name || data.country_name === "")
    ) {
      setFormData({
        country_id: locationData.country_id || "0",
        country_name: locationData.country_name || "",
        province_id: locationData.states_id || "0",
        province_name: locationData.states_name || "",
        city_id: locationData.city_id || "0",
        city_name: locationData.city_name || "",
      });
    }
  }, [locationData, data.country_name, setFormData]);

  // LEGACY FETCH REMOVED by request to fix 'groups' duplicates */

  const handleChangeReport = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDataReport((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChangeReport = (value: string) => {
    setDataReport((prev) => ({ ...prev, violation: value }));
  };

  const handleFileChangereport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDataReport((prev) => ({ ...prev, evidence: file }));
      const label = document.getElementById("file-label");
      if (label) label.textContent = file.name;
    }
  };

  const handleSendReport = async (): Promise<void> => {
    const supabase = await createClient();

    setIsLoadingReport(true)
    try {
      // 🪣 1️⃣ Jika ada file, upload dulu ke Supabase Storage
      let evidenceUrl = null

      if (dataReport.evidence) {
        const file = dataReport.evidence;
        const fileExt = file.name.split(".").pop();
        const fileName = `${generateId()}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("report_evidence")
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          console.error("Upload failed:", uploadError.message);
          toast.error("Gagal mengunggah bukti laporan");
          return;
        }

        // Dapatkan URL publik
        const { data: publicUrlData } = supabase.storage
          .from("report_evidence")
          .getPublicUrl(filePath);

        evidenceUrl = publicUrlData.publicUrl;
      }

      // 📨 2️⃣ Kirim data laporan ke server
      const result = await createReport({
        violation: dataReport.violation,
        title: dataReport.title,
        detail: dataReport.detail,
        evidence: evidenceUrl,
        type: dataReport.type,
        group_id: dataReport.grup_id,
      })

      if (result.success) {
        toast.success(t("grup saya.success"))
      } else {
        toast.error(t("grup saya.error"))
        console.log("err:", result.message)
      }
    } catch {
      toast.error(t("grup saya.error"))
    } finally {
      setDataReport({
        violation: "",
        title: "",
        detail: "",
        evidence: null,
        type: "",
        grup_id: ""
      })
      setIsLoadingReport(false)
      setOpenDialogReport(false);
    }
  }

  const validatePhotoFile = (file: File): boolean => {
    const maxSize = 3 * 1024 * 1024 // 3MB in bytes
    if (file.size > maxSize) {
      setPhotoError(t('grup saya.validation.photo_size_exceeded', 'File size must not exceed 3MB'))
      return false
    }
    setPhotoError("")
    return true
  }

  // Use SWR hooks for groups data (NEW PATTERN)
  const {
    groupsData: groups,
    isLoading: loadingGroups,
    error: groupsError,
    refresh: refreshGroups
  } = useGroupsData({ userId, showAll: showAllGroups });

  // Local state to track verified groups - persisted in localStorage
  const VERIFIED_GROUPS_STORAGE_KEY = 'admin_verified_groups';

  // Initialize from localStorage
  const [localVerifiedGroups, setLocalVerifiedGroups] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(VERIFIED_GROUPS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[Verify] Loaded verified groups from localStorage:', parsed);
          return new Set(parsed);
        }
      } catch (e) {
        console.error('[Verify] Error loading from localStorage:', e);
      }
    }
    return new Set();
  });

  // Persist to localStorage whenever localVerifiedGroups changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (localVerifiedGroups.size > 0) {
          const toStore = Array.from(localVerifiedGroups);
          localStorage.setItem(VERIFIED_GROUPS_STORAGE_KEY, JSON.stringify(toStore));
          console.log('[Verify] Saved verified groups to localStorage:', toStore);
        } else {
          // If empty, remove from localStorage (all groups unverified)
          localStorage.removeItem(VERIFIED_GROUPS_STORAGE_KEY);
          console.log('[Verify] Cleared verified groups from localStorage');
        }
      } catch (e) {
        console.error('[Verify] Error with localStorage:', e);
      }
    }
  }, [localVerifiedGroups, VERIFIED_GROUPS_STORAGE_KEY]);

  // SWR mutations (only needed for restore functionality)
  const {
    leaveGroup: leaveGroupMutation,
  } = useGroupMutations(userId);

  // Update owner_id when user changes
  useEffect(() => {
    if (userId && data.owner_id !== userId) {
      setFormData({ owner_id: userId });
    }
  }, [userId, data.owner_id, setFormData]);

  // Show error toast when groups error occurs
  useEffect(() => {
    if (groupsError) {
      toast.error(groupsError);
    }
  }, [groupsError]);

  // Handle query parameter to open create modal
  useEffect(() => {
    if (!searchParams) return
    const createParam = searchParams.get('create')
    if (createParam === 'true') {
      setIsCreateModalOpen(true)
      // Clear the query parameter after opening modal
      const url = new URL(window.location.href)
      url.searchParams.delete('create')
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [searchParams, router])

  const handleLeaveGroup = async (groupId: string) => {
    setIsLeaving(true)
    try {
      // Use SWR mutation instead of direct API call
      await leaveGroupMutation(groupId);
      toast.success(t('grup saya.toast.leave_success', 'Successfully left the group'));

      // SWR automatically refreshes data after mutation
      // No need for manual cache invalidation
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error(t('grup saya.toast.leave_error', 'An error occurred while leaving the group'));
    } finally {
      setIsLeaving(false)
    }
  }

  const handleCreateGroup = async () => {
    // Validation
    if (!userId) {
      toast.error(t('grup saya.validation.login_required', 'You must login first'));
      return;
    }

    if (!data.name.trim()) {
      toast.error(t('grup saya.validation.name_empty', 'Group name cannot be empty'));
      return;
    }

    if (data.name.trim().length < 3) {
      toast.error(t('grup saya.validation.name_min_length', 'Group name must be at least 3 characters'));
      return;
    }

    if (data.name.trim().length > 50) {
      toast.error(t('grup saya.validation.name_max_length', 'Group name must be less than 50 characters'));
      return;
    }

    if (!data.category) {
      toast.error(t('grup saya.validation.category_empty'))
      return;
    }

    if (data.description && data.description.length > 500) {
      toast.error(t('grup saya.validation.description_max_length', 'Description must be less than 500 characters'));
      return;
    }

    // Photo validation
    if (photoError) {
      toast.error(photoError);
      return;
    }

    if (photo) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(photo.type)) {
        toast.error(t('grup saya.validation.photo_format', 'Photo must be JPEG, PNG, or WebP format'));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value as string);
      });

      // For now, use existing insertGrup but plan to migrate to SWR mutation
      // TODO: Move photo upload logic to API route for full SWR migration
      const result = await insertGrup(formData, photo);
      if (result.status === "success") {
        toast.success(result.message || t('grup saya.toast.create_success', 'Group created successfully!'));
        setIsCreateModalOpen(false);
        resetForm();
        setPhoto(null);
        setPhotoError("");
        // SWR will auto-refresh data
        await refreshGroups();
      } else {
        toast.error(result.message || t('grup saya.toast.create_failed', 'Failed to create group'));
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(t('grup saya.toast.create_error', 'An error occurred while creating group'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Memoize filtered groups with alphabetical sorting
  const filteredGroups = useMemo(() => {
    let filtered = [...groups];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedStatusGrup === "active") {
      filtered = filtered.filter(group => group.deleted_at === null)
    }

    if (selectedStatusGrup === "deleted") {
      filtered = filtered.filter(group => group.deleted_at !== null && group.role === "owner")
    }

    // Apply category filter (Fixed: Both are now numbers)
    if (selectedCategoryFilter !== "all") {
      filtered = filtered.filter(group => group.category === Number(selectedCategoryFilter))
    }

    // Apply location filters (Fixed: Use correct property names and types)
    if (locationFilter.country_id !== "0") {
      filtered = filtered.filter(group => group.countryId === Number(locationFilter.country_id))
    }

    if (locationFilter.province_id !== "0") {
      filtered = filtered.filter(group => group.stateId === Number(locationFilter.province_id))
    }

    if (locationFilter.city_id !== "0") {
      filtered = filtered.filter(group => group.cityId === Number(locationFilter.city_id))
    }

    // Sort alphabetically by name
    return filtered.sort((a, b) =>
      a.name.localeCompare(b.name, locale === 'id' ? 'id-ID' : 'en-US')
    )
  }, [groups, searchQuery, selectedCategoryFilter, locale, selectedStatusGrup, locationFilter.country_id, locationFilter.province_id, locationFilter.city_id])

  // Computed totalPages (like cari-grup)
  const totalPages = useMemo(() =>
    Math.ceil(filteredGroups.length / itemsPerPage),
    [filteredGroups.length, itemsPerPage]
  )

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5]
    }

    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
  }, [currentPage, totalPages])

  // Memoize current page groups for performance and stability
  const currentPageGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage


    return filteredGroups.slice(startIndex, endIndex)
  }, [filteredGroups, currentPage, itemsPerPage])

  // Reset to page 1 when user searches or filters change
  useEffect(() => {
    setCurrentPage(1) // Reset to page 1 when user searches
  }, [searchQuery, selectedCategoryFilter, selectedStatusGrup, locationFilter.country_id, locationFilter.province_id, locationFilter.city_id])

  // Filter handlers
  const handleApplyFilters = () => {
    setSelectedCategoryFilter(tempCategoryFilter);
    setSelectedStatusGrup(tempStatusGrup);
    setLocationFilter(tempLocationFilter);
    setOpenFilterCountry(false);
    setOpenFilterProvince(false);
    setOpenFilterCity(false);
    setCurrentPage(1); // Reset to first page when applying filters
    setIsFilterModalOpen(false);
  }

  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
    setTempCategoryFilter(selectedCategoryFilter);
    setTempStatusGrup(selectedStatusGrup);
    setTempLocationFilter({ ...locationFilter });
  };
  const handleCancelFilters = () => {
    setTempCategoryFilter(selectedCategoryFilter); // Reset temp to current selected
    setTempStatusGrup(selectedStatusGrup);
    setTempLocationFilter({ ...locationFilter });
    setOpenFilterCountry(false);
    setOpenFilterProvince(false);
    setOpenFilterCity(false);
    setIsFilterModalOpen(false)
  }
  const handleResetFilter = () => {
    setTempCategoryFilter("all");
    setTempStatusGrup("active");
    setTempLocationFilter({
      country_id: "0",
      country_name: "",
      province_id: "0",
      province_name: "",
      city_id: "0",
      city_name: "",
    });
  };

  // Initialize temp filter when modal opens
  useEffect(() => {
    if (isFilterModalOpen) {
      setTempCategoryFilter(selectedCategoryFilter)
      setTempStatusGrup(selectedStatusGrup) // Initialize temp status
      setTempLocationFilter({ ...locationFilter })
    }
  }, [isFilterModalOpen, selectedCategoryFilter, selectedStatusGrup, locationFilter])

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

  const handleRestoreGroup = useCallback(async (groupId: string) => {
    setIsRestore(true)
    try {
      const result = await restoreGroup(groupId)

      if (result.status === 'success') {
        toast.success(t('kelola grup.toast.group_restore'))
        // Refresh groups so UI updates without manual reload
        await refreshGroups()
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error(t('kelola grup.toast.restore_failed', 'An error occurred while restore the group'))
    } finally {
      setIsRestore(false)
    }
  }, [t, refreshGroups])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleManageGroup = (groupId: string) => {
    router.push(`/groups/detail/${groupId}`)
  }

  const handleViewDetails = (groupId: string) => {
    router.push(`/groups/detail/${groupId}`)
  }

  // Admin function to verify/unverify a group (toggle)
  const [isVerifying, setIsVerifying] = useState<string | null>(null)

  const handleVerifyGroup = useCallback(async (groupId: string, currentlyVerified: boolean) => {
    setIsVerifying(groupId)
    try {
      const newStatus = currentlyVerified ? 0 : 1 // Toggle: if verified, unverify; if not, verify
      console.log('[Verify] Starting verify:', { groupId, currentlyVerified, newStatus })

      await groupsApi.verify(groupId, newStatus)

      // Update local verified state immediately for instant UI feedback
      console.log('[Verify] API success, updating local state...')
      setLocalVerifiedGroups(prev => {
        const updated = new Set(prev)
        if (newStatus === 1) {
          updated.add(groupId)
          console.log('[Verify] Added to verified set:', groupId)
        } else {
          updated.delete(groupId)
          console.log('[Verify] Removed from verified set:', groupId)
        }
        console.log('[Verify] New verified set:', Array.from(updated))
        return updated
      })

      if (newStatus === 1) {
        toast.success(t('grup saya.toast.verify_success', 'Group verified successfully'))
      } else {
        toast.success(t('grup saya.toast.unverify_success', 'Group verification removed'))
      }

      // NOTE: Not calling refreshGroups() here because it would overwrite localVerifiedGroups
      // since API search doesn't return isVerified field. Local state is the source of truth.
    } catch (error) {
      console.error('Error verifying group:', error)
      toast.error(t('grup saya.toast.verify_error', 'An error occurred while verifying the group'))
    } finally {
      setIsVerifying(null)
    }
  }, [t, setLocalVerifiedGroups])

  // Handler to open delete confirmation dialog
  const handleOpenDeleteDialog = useCallback((group: MappedGroup) => {
    setGroupToDelete(group)
    setOpenDeleteDialog(true)
  }, [])

  // Handler to confirm and execute delete
  const handleConfirmDelete = useCallback(async () => {
    if (!groupToDelete) return

    setIsDeleting(true)
    try {
      console.log('[Delete Group] Deleting group:', groupToDelete.id, groupToDelete.name)

      // Call Delete API
      await groupsApi.delete(groupToDelete.id)

      toast.success(t('grup saya.toast.delete_success', 'Group deleted successfully'))

      // Refresh groups list to reflect the deletion
      await refreshGroups()

      setOpenDeleteDialog(false)
      setGroupToDelete(null)
    } catch (error) {
      console.error('Error deleting group:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(t('grup saya.toast.delete_error', 'Failed to delete group: ') + errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }, [groupToDelete, t, refreshGroups])

  // Image crop states
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [openCropImage, setOpenCropImage] = useState<boolean>(false)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [shouldApplyCrop, setShouldApplyCrop] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const cropApplyRef = useRef<HTMLButtonElement>(null)


  // Function to check if browser supports WebP
  const checkWebPSupport = (): boolean => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  // Function to resize image to specific dimensions (always 400x400)
  const resizeImage = async (src: string, width: number, height: number): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // Draw image to fill the canvas, maintaining aspect ratio
        ctx.drawImage(img, 0, 0, width, height)

        // Use WebP if supported, fallback to PNG
        const format = checkWebPSupport() ? 'image/webp' : 'image/png'
        const quality = checkWebPSupport() ? 0.85 : 0.9

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Could not convert canvas to blob'))
            }
          },
          format,
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = src
    })
  }

  const handleImageCrop = (croppedImageData: string) => {
    setCroppedImage(croppedImageData)

    // If shouldApplyCrop flag is set, process the crop immediately
    if (shouldApplyCrop) {
      processCroppedImage(croppedImageData)
    }
  }

  const processCroppedImage = async (croppedImageData: string) => {
    try {
      // Resize image to exactly 400x400 and convert to WebP (with PNG fallback)
      const resizedBlob = await resizeImage(croppedImageData, 400, 400)
      const supportsWebP = checkWebPSupport()
      const fileName = supportsWebP ? 'group-photo.webp' : 'group-photo.png'
      const mimeType = supportsWebP ? 'image/webp' : 'image/png'
      const file = new File([resizedBlob], fileName, { type: mimeType })

      setPhoto(file)
      setSelectedAvatar(file)
      setOpenCropImage(false)
      setCroppedImage(null)
      setShouldApplyCrop(false)
    } catch (error) {
      console.error('Error converting cropped image:', error)
      toast.error(t('kelola grup.toast.crop_failed', 'Failed to process cropped image'))
      setShouldApplyCrop(false)
    }
  }

  useEffect(() => {
    if (shouldApplyCrop && cropApplyRef.current) {
      cropApplyRef.current.click()
      setShouldApplyCrop(false)
    }
  }, [shouldApplyCrop])

  const handleApplyCrop = () => {
    if (cropApplyRef.current) {
      // If cropped image already exists, process it immediately
      if (croppedImage) {
        processCroppedImage(croppedImage)
      } else {
        // Set flag and trigger crop
        setShouldApplyCrop(true)
      }
    }
  }

  const handleCancelCrop = () => {
    if (isCancelling) return // Prevent double calls

    setIsCancelling(true)
    setOpenCropImage(false)

    // Reset state after dialog is closed to prevent ImageCrop from reading null
    setTimeout(() => {
      setSelectedAvatar(null)
      setCroppedImage(null)
      setShouldApplyCrop(false)
      setIsCancelling(false)

      // Reset file input to allow selecting the same file again
      const fileInput = document.getElementById('group-photo') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    }, 300) // Wait for dialog close animation  
  }

  const daysLeftUntil7Days = (dateString: string): number => {
    const targetDate = new Date(dateString);
    const sevenDaysLater = new Date(targetDate);
    sevenDaysLater.setDate(targetDate.getDate() + 7);

    const now = new Date();
    const diffMs = sevenDaysLater.getTime() - now.getTime(); // selisih dalam milidetik
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0; // kalau sudah lewat, kembalikan 0
  }

  const handleOpenDialogReport = (groupId: string) => {
    setOpenDialogReport(true)
    setDataReport((prev) => ({
      ...prev,
      grup_id: groupId,
      type: "group"
    }))
  }

  const handleCloseDialogReport = () => {
    setOpenDialogReport(false)
    setDataReport({
      violation: "",
      title: "",
      detail: "",
      evidence: null,
      type: "",
      grup_id: ""
    })
  }

  return (
    <div className="h-auto max-w-full mx-auto flex flex-col md:block">
      {/* Simple Header */}
      <div className="flex justify-between w-full mx-auto md:max-w-7xl mb-5 px-2 sm:px-0">
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
          <div className="flex items-center justify-center  ">
            <Component className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {t('grup saya.header.title', 'My Groups')}
            </h1>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant={"default"}
                size={"sm"}
                className="flex items-center justify-center gap-1 w-auto rounded-lg font-medium transition-all duration-300 text-sm whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 border-0"
              >
                <Plus className="h-6 w-6" />
                {t('grup saya.create.button_short', 'Create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto dark:bg-gray-800">
              <DialogHeader>
                <DialogTitle>{t('grup saya.create.modal_title', 'Create New Group')}</DialogTitle>
              </DialogHeader>
              <div className="grid py-4">
                <div>
                  <Label htmlFor="group-name">{t('grup saya.create.name_label', 'Group Name')}</Label>
                  <Input
                    id="group-name"
                    placeholder={t('grup saya.create.name_placeholder', 'Group name...')}
                    name="name"
                    value={data.name}
                    onChange={handleChange}
                    maxLength={50}
                    required
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {data.name.length}/50 characters
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="edit-category">{t('grup saya.create.category_label', 'Category')}</Label>
                    <Select
                      value={data.category}
                      onValueChange={(value) => handleChange({ target: { name: "category", value } })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t('grup saya.create.category_placeholder')}
                        >
                          <span className="capitalize">
                            {categoryList.find(cat => cat.id === Number(data.category))?.name}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categoryList
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="country_id">{t("register.country", "Countries")}</Label>
                    <Popover open={openCountry} onOpenChange={setOpenCountry}>
                      <PopoverTrigger asChild className="w-full text-left">
                        <Button variant="outline">
                          {data.country_name || t("register.select_country", "Select Country")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="p-0" >
                        <Command>
                          <CommandInput placeholder={t("register.search_country", "Search Country")} />
                          <CommandList>
                            <CommandGroup>
                              {countries.map((country) => (
                                <CommandItem className="w-full flex justify-between" onSelect={() => {
                                  if (Number(data.province_id) === country.id) {
                                    handleChange({ target: { name: "country_id", value: "0" }, });
                                    handleChange({ target: { name: "country_name", value: "" }, });
                                    handleChange({ target: { name: "province_id", value: "0" }, });
                                    handleChange({ target: { name: "province_name", value: "" }, });
                                  } else {
                                    handleChange({ target: { name: "country_id", value: country.id.toString() } });
                                    handleChange({ target: { name: "country_name", value: country.name } });
                                    handleChange({ target: { name: "province_id", value: "0" }, });
                                    handleChange({ target: { name: "province_name", value: "" }, });
                                    setOpenCountry(false);
                                  }
                                }} value={country.name} key={country.id}>{country.name}
                                  <Check className={`text-red-200 w-4 h-4 ${data.country_name === country.name ? "opacity-100" : "opacity-0"}`} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="province_id">{t("register.province", "Province")}</Label>
                    <Popover open={openProvince} onOpenChange={setOpenProvince}>
                      <PopoverTrigger asChild className="w-full text-left" disabled={Number(data.country_id) === 0}>
                        <Button variant="outline">
                          {data.province_name || t("register.select_province", "Select Province")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="p-0">
                        <Command>
                          <CommandInput placeholder={t("register.search_province", "Search Province")} />
                          <CommandList>
                            <CommandGroup>
                              {provinces.map((province) => (
                                <CommandItem className="w-full flex justify-between" onSelect={() => {
                                  if (Number(data.province_id) === province.id) {
                                    handleChange({ target: { name: "province_id", value: "0" }, });
                                    handleChange({ target: { name: "province_name", value: "" }, });
                                    handleChange({ target: { name: "city_id", value: "0" }, });
                                    handleChange({ target: { name: "city_name", value: "" }, });
                                  } else {
                                    handleChange({ target: { name: "province_id", value: province.id.toString() } });
                                    handleChange({ target: { name: "province_name", value: province.name } });
                                    handleChange({ target: { name: "city_id", value: "0" }, });
                                    handleChange({ target: { name: "city_name", value: "" }, });
                                    setOpenProvince(false);
                                  }
                                }} value={province.name} key={province.id}>{province.name}
                                  <Check className={`text-red-200 w-4 h-4 ${data.province_name === province.name ? "opacity-100" : "opacity-0"}`} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="province_id">{t("register.city", "City")}</Label>
                    <Popover open={openCity} onOpenChange={setOpenCity}>
                      <PopoverTrigger asChild className="w-full text-left" disabled={Number(data.province_id) === 0}>
                        <Button variant="outline">
                          {data.city_name || t("register.select_city", "Select City")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="p-0">
                        <Command>
                          <CommandInput placeholder={t("register.search_city", "Search City")} />
                          <CommandList>
                            <CommandGroup>
                              {cities.map((city) => (
                                <CommandItem className="w-full flex justify-between" onSelect={() => {
                                  if (Number(data.city_id) === city.id) {
                                    handleChange({ target: { name: "city_name", value: "" }, });
                                    handleChange({ target: { name: "city_id", value: "0" }, });
                                  } else {
                                    handleChange({ target: { name: "city_name", value: city.name }, });
                                    handleChange({ target: { name: "city_id", value: city.id.toString() }, });
                                    setOpenCity(false);
                                  }
                                }} value={city.name} key={Number(city.id)}>
                                  {city.name}
                                  <Check className={`text-red-200 w-4 h-4 ${Number(data.city_id) === city.id ? "opacity-100" : "opacity-0"}`} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>{t('grup saya.create.status_label', 'Status')}</Label>
                    <RadioGroup
                      name="status"
                      value={data.status}
                      onValueChange={(value) => handleChange({ target: { name: "status", value } })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="public" />
                        <Label htmlFor="public" className="cursor-pointer">{t('grup saya.create.public', 'Public')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="private" />
                        <Label htmlFor="private" className="cursor-pointer">{t('grup saya.create.private', 'Private')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="secret" id="secret" />
                        <Label htmlFor="secret" className="cursor-pointer">{t('grup saya.create.secret', 'secret')}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="group-description">{t('grup saya.create.description_label', 'Description (Optional)')}</Label>
                    <Textarea
                      id="group-description"
                      name="description"
                      value={data.description}
                      onChange={handleChange}
                      placeholder={t('grup saya.create.description_placeholder', 'Group description...')}
                      maxLength={500}
                      rows={3}
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {data.description.length}/500 characters
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="group-avatar">{t('grup saya.create.photo_label', 'Profile Photo (Optional)')}</Label>
                    <Input
                      id="group-avatar"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file) {
                          if (validatePhotoFile(file)) {
                            // Open crop dialog
                            setSelectedAvatar(file)
                            setOpenCropImage(true)
                            setCroppedImage(null)
                            setPhotoError("")
                          } else {
                            setPhoto(null)
                          }
                        } else {
                          setPhoto(null)
                          setPhotoError("")
                        }
                      }}
                      className="file:text-gray-300"
                    />
                    {photoError && (
                      <div className="text-sm text-red-500 mt-1">
                        {photoError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                    setPhoto(null);
                    setPhotoError("");
                  }}
                >
                  {t('grup saya.create.cancel', 'Cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={isSubmitting || !data.name.trim() || !!photoError || !data.category || !data.country_name || !data.province_name || !data.city_name}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {isSubmitting ? t('grup saya.create.creating', 'Creating...') : t('grup saya.create.create_action', 'Create Group')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 w-full md:max-w-7xl mx-auto p-3 sm:p-4 md:p-6 bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/20 dark:shadow-gray-800/25 space-y-4 md:space-y-6 overflow-visible min-h-0">
        {/* Search Input */}
        <div className="flex w-full">
          <div className="flex flex-col sm:flex-row w-full gap-2 items-center">
            <div className="flex items-center w-full md:w-64">
              <div className="flex w-full rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                <input
                  type="text"
                  placeholder={t('grup saya.search.placeholder', 'Search groups...')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchQuery(searchInput);
                      setCurrentPage(1);
                    }
                  }}
                  className="w-full pl-3 pr-2 h-9 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
                />
                <button
                  onClick={() => { setSearchQuery(searchInput); setCurrentPage(1); }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 w-10 flex items-center justify-center shrink-0"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <button
              onClick={() => handleOpenFilterModal()}
              className={`relative h-9 px-3 w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategoryFilter !== "all" || selectedStatusGrup !== "active" || locationFilter.country_id !== "0"
                  ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
                  : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-emerald-400"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              {t('filters', 'Filter')}
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        {!loadingGroups && currentPageGroups.length > 0 && (
          <div className="flex-1 flex flex-col space-y-6 w-full min-h-0">
            <div className="flex-shrink-0 flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
              <div className="flex items-center gap-2">
                <Component className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">
                  {t('grup saya.header.title', 'My Groups')} ({filteredGroups.length})
                </span>
              </div>
            </div>

            {/* Grid Layout - 3 columns x 2 rows */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-visible min-h-0">
              {currentPageGroups.map((group, index) => (
                <AnimatedGroupItem key={group.id} index={index} delay={0.05}>
                  <div className="relative">
                    {group.deleted_at !== null && (
                      <div className="absolute -top-2 -left-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase text-rose-200 shadow-lg ring-1 ring-rose-400/30 border border-rose-400/20 bg-gradient-to-r from-rose-500/40 to-red-500/40 dark:from-rose-500/20 dark:to-red-500/20 backdrop-blur supports-[backdrop-filter]:bg-rose/20 hover:ring-rose-300/40 transition z-20 whitespace-nowrap">
                        <ClockAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-200 dark:text-rose-300" />
                        <span className="drop-shadow-sm">{daysLeftUntil7Days(group.deleted_at!)} {t('grup saya.card.day')}</span>
                      </div>
                    )}
                    <div className="group overflow-hidden relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-xl hover:shadow-slate-200/25 dark:hover:shadow-slate-900/25 transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
                      {/* Banner Background */}
                      <div className="relative h-32 bg-gradient-to-br from-slate-700 to-slate-800 ">
                        {group.avatar && (
                          <div
                            className="absolute inset-0 bg-cover bg-center opacity-20"
                            style={{
                              backgroundImage: `url(${group.avatar})`
                            }}
                          />
                        )}
                        {/* Group Avatar and Name Section */}
                        <div className="absolute inset-0 flex items-center gap-4 p-4">
                          <div className="absolute top-3 right-3 flex items-center gap-2">
                            {group.category && (
                              <Badge className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide uppercase border border-emerald-400/40 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30 ring-1 ring-emerald-400/20 shadow-sm hover:ring-emerald-300/30 transition text-emerald-400 gap-0">
                                {categoryList.find((category) => category.id === Number(group.category))?.name}
                              </Badge>
                            )}
                            {/* Group Type Badge */}
                            {group.type && (
                              <Badge className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide uppercase backdrop-blur border ${group.type === 'public'
                                ? 'border-blue-400/40 bg-blue-900/30 text-blue-300'
                                : group.type === 'private'
                                  ? 'border-orange-400/40 bg-orange-900/30 text-orange-300'
                                  : 'border-red-400/40 bg-red-900/30 text-red-300'
                                }`}>
                                {group.type}
                              </Badge>
                            )}
                            {/* Membership Status Badge */}
                            {group.is_member && (
                              <Badge className="px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide uppercase border border-green-400/40 bg-green-900/30 text-green-300 backdrop-blur">
                                {t('grup saya.badge.member', 'Member')}
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="rounded-full transition-colors duration-200 cursor-pointer"
                                  aria-label="More options"
                                >
                                  <MoreVerticalIcon className="h-4 w-4 text-gray-200 dark:text-gray-300" />
                                </button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 animate-in fade-in-0 zoom-in-95 duration-150"
                              >
                                <DropdownMenuItem
                                  onSelect={() => handleOpenDialogReport(group.id)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                                >
                                  <FlagIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  {t('grup saya.report.report')}
                                </DropdownMenuItem>
                                {/* Delete Group - Admin Only */}
                                <DropdownMenuItem
                                  onSelect={() => handleOpenDeleteDialog(group)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 cursor-pointer rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                                  {t('grup saya.actions.delete', 'Delete Group')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                          </div>
                          <div className="relative">
                            <Link
                              href={(group.role === "owner" || group.role === "admin") ? `/groups/detail/${group.id}` : `/groups/detail/${group.id}`}
                              className="h-16 w-16 border-2 border-white shadow-lg rounded-full bg-gray-600 flex items-center justify-center"
                              onClick={(e) => {
                                if (group.deleted_at) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              {group.avatar ? (
                                <div
                                  className="h-full w-full bg-cover bg-center rounded-full"
                                  style={{ backgroundImage: `url(${group.avatar})` }}
                                />
                              ) : (
                                <span className="text-white font-semibold text-xl">
                                  {group.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 3)}
                                </span>
                              )}
                            </Link>
                            {/* Role Badge */}
                            {(group.role === "owner" || group.role === "admin") && (
                              <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${group.role === "owner"
                                ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                                : "bg-gradient-to-br from-blue-500 to-blue-700"
                                }`}>
                                {group.role === "owner" ? (
                                  <Crown className="w-3 h-3 text-white" />
                                ) : (
                                  <Shield className="w-3 h-3 text-white" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">

                            <Link
                              href={(group.role === "owner" || group.role === "admin") ? `/groups/detail/${group.id}` : `/groups/detail/${group.id}`}
                              className="font-bold text-xl text-white truncate line-clamp-1 drop-shadow-lg"
                              title={group.name}
                              onClick={(e) => {
                                if (group.deleted_at) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              {group.name}
                            </Link>
                            {(group.cityName && group.stateName) && (
                              <span className="text-gray-300 text-xs line-clamp-1">
                                {`${group.cityName} - ${group.stateName}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-4 space-y-3">
                        {/* Description */}
                        <p
                          title={group.description!}
                          className="text-slate-600 dark:text-slate-400 text-sm line-clamp-1 leading-relaxed"
                        >
                          {group.description || t('grup saya.card.no_description', 'No description available')}
                        </p>

                        {/* Date and Members */}
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            {/* <Calendar className="h-3 w-3" /> */}
                            <span>{formatDate(group.createdAt)}</span>
                            {/* <span>{t('grup saya.card.created_prefix', 'Created')} {formatDate(group.createdAt)}</span> */}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{group.total_members} {t('grup saya.card.members', 'Members')}</span>
                          </div>
                        </div>

                        {/* Action Buttons - Admin can view all group details */}
                        {group.deleted_at !== null ? (
                          <Button
                            disabled={isRestore}
                            onClick={() => handleRestoreGroup(group.id)}
                            className="w-full rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 border-0 text-white"
                          >
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            {t('grup saya.card.restore')}
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleViewDetails(group.id)}
                              className="flex-1 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 text-white"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              {t('grup saya.card.details', 'Details')}
                            </Button>
                            <Button
                              onClick={() => {
                                const isCurrentlyVerified = group.isVerified || localVerifiedGroups.has(group.id)
                                handleVerifyGroup(group.id, isCurrentlyVerified)
                              }}
                              disabled={isVerifying === group.id}
                              variant="outline"
                              className={`rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${(group.isVerified || localVerifiedGroups.has(group.id))
                                ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                                : 'border-gray-300 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/20'
                                }`}
                              title={(group.isVerified || localVerifiedGroups.has(group.id))
                                ? t('grup saya.card.unverify_tooltip', 'Remove verification')
                                : t('grup saya.card.verify_tooltip', 'Verify this group')}
                            >
                              {isVerifying === group.id ? (
                                <div className={`h-4 w-4 border-2 ${(group.isVerified || localVerifiedGroups.has(group.id)) ? 'border-green-600' : 'border-gray-400'} border-t-transparent rounded-full animate-spin`} />
                              ) : (
                                <BadgeCheck className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimatedGroupItem>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex-shrink-0 flex justify-center">
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

                    {(() => {
                      const pages: number[] = []
                      if (totalPages <= 5) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i)
                      } else if (currentPage <= 3) {
                        pages.push(1, 2, 3, 4, 5)
                      } else if (currentPage >= totalPages - 2) {
                        pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                      } else {
                        pages.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2)
                      }
                      return pages.map((page) => (
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
                      ))
                    })()}

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

        {/* Loading State */}
        {loadingGroups && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Component className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">
                {t('grup saya.header.title')}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="group hidden lg:block overflow-hidden relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                {/* Banner Background (skeleton) */}
                <div className="relative flex items-center h-32 bg-gradient-to-br dark:from-slate-700 dark:to-slate-800 from-gray-200 to-slate-300 animate-pulse p-4">
                  {/* Avatar placeholder positioned like real card */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 shadow-lg rounded-full bg-gray-400 dark:bg-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="h-5 w-32 bg-gray-400 dark:bg-gray-600 rounded-md" />
                    </div>
                  </div>
                </div>


                {/* Content Section (skeleton) */}
                <div className="p-4 space-y-3 mt-6">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
              </div>
              <div className="group hidden md:block overflow-hidden relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                {/* Banner Background (skeleton) */}
                <div className="relative flex items-center h-32 bg-gradient-to-br dark:from-slate-700 dark:to-slate-800 from-gray-200 to-slate-300 animate-pulse p-4">
                  {/* Avatar placeholder positioned like real card */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 shadow-lg rounded-full bg-gray-400 dark:bg-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="h-5 w-32 bg-gray-400 dark:bg-gray-600 rounded-md" />
                    </div>
                  </div>
                </div>


                {/* Content Section (skeleton) */}
                <div className="p-4 space-y-3 mt-6">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
              </div>
              <div className="group overflow-hidden relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                {/* Banner Background (skeleton) */}
                <div className="relative flex items-center h-32 bg-gradient-to-br dark:from-slate-700 dark:to-slate-800 from-gray-200 to-slate-300 animate-pulse p-4">
                  {/* Avatar placeholder positioned like real card */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 shadow-lg rounded-full bg-gray-400 dark:bg-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="h-5 w-32 bg-gray-400 dark:bg-gray-600 rounded-md" />
                    </div>
                  </div>
                </div>


                {/* Content Section (skeleton) */}
                <div className="p-4 space-y-3 mt-6">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loadingGroups && filteredGroups.length === 0 && (
          <div className="flex-1 flex items-center justify-center w-full py-5">
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Users className="h-8 w-8 md:h-10 md:w-10 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-base md:text-lg font-medium mb-2">
                {t('grup saya.empty.member_title', 'No groups joined')}
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-sm md:text-base">
                {t('grup saya.empty.member_description', 'Join existing groups or create your own to start learning together.')}
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={openCropImage}
        onOpenChange={(open) => {
          if (!open && openCropImage && !isCancelling) {
            // Only cancel if dialog is being closed (not opened) and not already cancelling
            handleCancelCrop()
          }
        }}
      >
        <DialogContent showCloseButton={false} className="
          flex flex-col justify-between p-4 fixed bottom-0 right-0 border-transparent h-screen min-w-screen rounded-none
          sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:h-auto sm:min-w-[60vw] sm:rounded-lg sm:p-8 sm:border sm:border-white sm:dark:border-gray-600
          lg:min-w-[30vw]
          dark:bg-black 
          "
        >
          <VisuallyHidden>
            <DialogTitle>Crop Image</DialogTitle>
          </VisuallyHidden>
          <div className="flex flex-col justify-between h-full">
            <div className="h-[75vh] flex flex-col justify-center">
              {selectedAvatar && (
                <ImageCrop
                  className="max-w-full max-h-[70vh]"
                  aspect={1}
                  file={selectedAvatar}
                  onChange={console.log}
                  onComplete={console.log}
                  onCrop={handleImageCrop}
                >
                  <ImageCropContent className="max-w-md" />
                  <div className="hidden">
                    {/* Hidden ImageCropApply to trigger crop functionality */}
                    <ImageCropApply ref={cropApplyRef} />
                  </div>
                </ImageCrop>
              )}
            </div>
            <div className="flex justify-between items-center pb-4 sm:pb-0">
              <button
                onClick={handleCancelCrop}
                className="text-sm cursor-pointer md:text-base font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('grup saya.create.cancel')}
              </button>
              <button
                onClick={handleApplyCrop}
                className="text-sm cursor-pointer md:text-base font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                {t('grup saya.create.done')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('grup detail.leave_group.dialog_title', 'Leave Group')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('grup detail.leave_group.dialog_description_before', 'Are you sure you want to leave')} <strong>{selectedGroup?.name}</strong>? {t('grup detail.leave_group.dialog_description_after', 'This action cannot be undone and you\'ll need to be re-invited to join again.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row">
            <AlertDialogCancel
              className="cursor-pointer flex-1"
              onClick={() => {
                setShowLeaveDialog(false)
                setSelectedGroup(null)
              }}
            >
              {t('grup detail.leave_group.no')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                handleLeaveGroup(selectedGroup!.id)
                setShowLeaveDialog(false)
              }}
              disabled={isLeaving}
            >
              {isLeaving ? t('grup detail.leave_group.leaving', 'Leaving...') : t('grup detail.leave_group.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-2xl z-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Filter
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Other Filters Row */}
            <div className="flex flex-col gap-2">
              <div>
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("grup detail.filter.category")}</Label>
                <Select
                  value={tempCategoryFilter}
                  onValueChange={(value: string) => setTempCategoryFilter(value)}
                >
                  <SelectTrigger className="min-h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 mt-1 w-full">
                    <SelectValue placeholder={t("grup detail.filter.category_placeholder")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-100">
                    <SelectItem value="all">{t("grup detail.filter.all")}</SelectItem>
                    {categoryList
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
              <div>
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</Label>
                <Select
                  value={tempStatusGrup}
                  onValueChange={(value) => setTempStatusGrup(value as "active" | "deleted")}
                >
                  <SelectTrigger className="min-h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-100">
                    <SelectItem value="active" className="capitalize">{t("grup detail.filter.active")}</SelectItem>
                    <SelectItem value="deleted" className="capitalize">{t("grup detail.filter.deleted")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant="outline"
                onClick={handleResetFilter}
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

      <Dialog
        open={openDialogReport}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setOpenDialogReport(true);
          } else {
            handleCloseDialogReport(); // otomatis reset dan tutup
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t('grup saya.report.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 md:gap-5 mt-4 overflow-y-auto">
            {/* Jenis Pelanggaran */}
            <div className="space-y-2">
              <Label htmlFor="violation-type">{t('grup saya.report.violation_type')}</Label>
              <Select onValueChange={handleSelectChangeReport}>
                <SelectTrigger id="violation-type" className="w-full !ring-0 text-sm">
                  <SelectValue placeholder={t('grup saya.report.violation_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="spam">{t('grup saya.report.violation_options.spam')}</SelectItem>
                    <SelectItem value="harassment">{t('grup saya.report.violation_options.harassment')}</SelectItem>
                    <SelectItem value="inappropriate">{t('grup saya.report.violation_options.inappropriate')}</SelectItem>
                    <SelectItem value="scam">{t('grup saya.report.violation_options.scam')}</SelectItem>
                    <SelectItem value="other">{t('grup saya.report.violation_options.other')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Judul Laporan */}
            <div className="space-y-2">
              <Label htmlFor="report-title">{t('grup saya.report.report_title')}</Label>
              <Input
                id="report-title"
                name="title"
                placeholder={t('grup saya.report.report_title_placeholder')}
                onChange={handleChangeReport}
                maxLength={100}
                className="w-full !ring-0 text-sm"
              />
              <p className="text-xs text-muted-foreground text-right">
                {dataReport.title.length}/100 {t('grup saya.report.char_count')}
              </p>
            </div>

            {/* Isi Laporan */}
            <div className="space-y-2">
              <Label htmlFor="report-description">{t('grup saya.report.report_description')}</Label>
              <Textarea
                id="report-description"
                name="detail"
                placeholder={t('grup saya.report.report_description_placeholder')}
                onChange={handleChangeReport}
                maxLength={500}
                className="min-h-24 resize-none !ring-0 text-sm"
              />
              <p className="text-xs text-muted-foreground text-right">
                {dataReport.detail.length}/500 {t('grup saya.report.char_count')}
              </p>
            </div>

            {/* Unggah Bukti */}
            <div className="space-y-2">
              <Label htmlFor="evidence">{t('grup saya.report.evidence_label')}</Label>

              <div className="group">
                <Input
                  id="evidence"
                  name="evidence"
                  type="file"
                  accept="image/*,video/*,.pdf"
                  className="hidden"
                  onChange={handleFileChangereport}
                />

                <label
                  htmlFor="evidence"
                  id="file-label"
                  className={`
                    flex items-center justify-center w-full h-32 px-4 text-center
                    transition-all duration-200 ease-in-out
                    bg-white dark:bg-gray-800
                    border-2 border-dashed rounded-xl
                    border-gray-300 dark:border-gray-600
                    text-gray-600 dark:text-gray-400
                    cursor-pointer
                    hover:border-primary hover:bg-primary/5
                    focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2
                    group-hover:border-primary group-hover:bg-primary/5
                  `}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <svg
                      className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm font-medium">
                      {t('grup saya.report.evidence_upload_text')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('grup saya.report.evidence_hint')}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div
              className="flex gap-2 items-start text-xs
              text-amber-800 dark:text-amber-200
              bg-amber-50 dark:bg-amber-900/30
              p-3 rounded-lg border border-amber-200 dark:border-amber-700"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <strong className="font-medium">
                  {t('grup saya.report.warning_title')}
                </strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>{t('grup saya.report.warning_items.one')}</li>
                  <li>{t('grup saya.report.warning_items.two')}</li>
                  <li>{t('grup saya.report.warning_items.three')}</li>
                </ul>
              </div>
            </div>


            {/* Tombol Aksi */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialogReport}
              >
                {t('grup saya.report.button_cancel')}
              </Button>
              <Button
                disabled={!dataReport.detail || !dataReport.title || !dataReport.violation || isLoadingReport}
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  handleSendReport()
                }}
              >
                {isLoadingReport && (
                  <div className="w-4 h-4 animate-spin rounded-full border-x-2 border-t-2 border-gray-300" />
                )}
                {t('grup saya.report.button_send')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation Dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent className="dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t('grup saya.delete.dialog_title', 'Delete Group')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('grup saya.delete.dialog_description_before', 'Are you sure you want to delete')} <strong className="text-gray-900 dark:text-white">{groupToDelete?.name}</strong>?
              {t('grup saya.delete.dialog_description_after', ' This action cannot be undone and all group data will be permanently removed.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-2">
            <AlertDialogCancel
              className="flex-1 cursor-pointer"
              onClick={() => {
                setOpenDeleteDialog(false)
                setGroupToDelete(null)
              }}
            >
              {t('grup saya.delete.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 cursor-pointer bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('grup saya.delete.confirm', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

