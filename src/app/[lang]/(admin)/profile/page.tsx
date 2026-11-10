"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { User, Save, Settings2, UserPen, MoreVertical, LogOut, Edit } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { searchUsers, SearchUser } from "@/utils/api/users/search"
import { updateUserProfile } from "@/utils/api/user/update-profile"
import signOut from "@/utils/Auth/logout"
import { useI18n } from "@/components/providers/i18n-provider"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useNotificationRecipients } from "@/hooks/use-recepient"
import { generateId } from "@/lib/generateId"

// Import custom components
import { ProfileAvatar } from "@/components/profile/profile-avatar"
import { ProfileInfo } from "@/components/profile/profile-info"
import { ProfileEditForm } from "@/components/profile/profile-edit-form"
import { SettingsSection } from "@/components/profile/settings-section"
import { NotificationRecipients } from "@/components/profile/notification-recipients"
import { AddUserDialog } from "@/components/profile/dialogs/add-user-dialog"
import { DeleteConfirmationDialog } from "@/components/profile/dialogs/delete-confirmation-dialog"
import { LogoutDialog } from "@/components/profile/dialogs/logout-dialog"
import { FullscreenAvatarModal } from "@/components/profile/dialogs/fullscreen-avatar-modal"
import { ImageCropDialog } from "@/components/profile/dialogs/image-crop-dialog"

// Import custom hooks
import { useUsernameValidation } from "@/hooks/use-username-validation"
import { useImageCrop } from "@/hooks/use-image-crop"
import { useLocationData, resolveIndonesiaTimezone } from "@/hooks/use-location-data"
import { SkeletonDetailPage } from "@/components/ui/skeletons"

function ProfilePageContent() {
  const { userId, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { masterdataApi } = require("@/lib/api")

  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: "",
    nickname: "",
    username: "",
    email: "",
    gender: 0 as number | null,
    date_of_birth: "",
    job: "",
    address: "",
    timezone: "",
    bio: "",
    language: 1,
    dateFormat: "",
    timeFormat: "",
    numberFormat: "",
    currencyFormat: "",
  })
  const [imageLoadError, setImageLoadError] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Dialogs state
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showFullscreenAvatar, setShowFullscreenAvatar] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<SearchUser | null>(null)
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Custom hooks
  const { profile, loading, refresh } = useUserProfile(userId ? "me" : null)
  // DISABLED: Recipients feature not used, saves network request
  // const { recipients, refreshRecipients } = useNotificationRecipients(userId ? "me" : undefined)
  const recipients: any[] = [] // Empty placeholder
  const refreshRecipients = () => { } // No-op
  const {
    usernameError,
    setUsernameError,
    isCheckingUsername,
    validateUsernameFormat,
    checkUsernameAvailability,
    debouncedCheckUsername,
    cleanup: cleanupUsernameValidation
  } = useUsernameValidation(userId, profile?.username ?? undefined)

  const {
    openCropImage,
    shouldApplyCrop,
    setShouldApplyCrop,
    originalAvatarPreview,
    isCancelling,
    cropApplyRef,
    handleImageCrop,
    handleApplyCrop,
    handleCancelCrop,
    openCropDialog
  } = useImageCrop()

  const {
    states,
    cities,
    countries,
    openState,
    setOpenState,
    openCity,
    setOpenCity,
    openCountry,
    setOpenCountry,
    currentState,
    setCurrentState,
    currentCity,
    setCurrentCity,
    currentCountry,
    setCurrentCountry,
    selectedState,
    setSelectedState,
    selectedCity,
    setSelectedCity,
    selectedCountry,
    setSelectedCountry,
    resolvedTimezone
  } = useLocationData()

  // Check if edit param is present
  const isEditParam = searchParams?.get('edit') === 'true'

  useEffect(() => {
    if (isEditParam) setIsEditing(true)
  }, [isEditParam])

  // Handle keyboard events for fullscreen modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showFullscreenAvatar && event.key === 'Escape') {
        setShowFullscreenAvatar(false)
      }
    }

    if (showFullscreenAvatar) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showFullscreenAvatar])

  // Search users with debounce
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!searchQuery.trim() || !userId || searchQuery.trim().length < 2) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        const result = await searchUsers(searchQuery.trim(), userId, 10)
        setSearchResults(result.users)
      } catch (error) {
        console.error('Error searching users:', error)
        toast.error(t('profile.notification_recipients.messages.search_failed', 'Failed to search users'))
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery, userId, t])

  // DISABLED: Recipients refresh - saves network request
  // useEffect(() => {
  //   if (userId) {
  //     refreshRecipients()
  //   }
  // }, [userId, refreshRecipients])

  // Load profile data
  useEffect(() => {
    if (profile) {
      // For Indonesian users, re-resolve the correct timezone from state/city
      // to fix stale values (e.g. stored "Asia/Jakarta" when actually in Bali = WITA)
      const isIndonesia = (profile as any).countryName?.toLowerCase().includes("indonesia") ||
        (profile as any).countryId === 101; // Indonesia countryId
      const correctedTimezone = isIndonesia
        ? resolveIndonesiaTimezone((profile as any).stateName || "", (profile as any).cityName || "")
        : (profile.timezone || "");

      setProfileData({
        fullName: profile.name || "",
        nickname: (profile as any).nickname || "",
        username: profile.username || "",
        email: profile.email || "",
        gender: profile.gender ?? (profile as any).sex ?? null,
        date_of_birth: profile.dob || (profile as any).dateOfBirth || "",
        job: profile.job || "",
        address: (profile as any).address || profile.hp || "",
        timezone: correctedTimezone,
        bio: (profile as any).bio || "",
        language: (profile as any).language ?? 1,
        dateFormat: (profile as any).dateFormat || "",
        timeFormat: (profile as any).timeFormat || "",
        numberFormat: (profile as any).numberFormat || "",
        currencyFormat: (profile as any).currencyFormat || "",
      })

      if ((profile as any).stateId) {
        setCurrentState({ id: (profile as any).stateId, name: (profile as any).stateName || "" })
      }
      if ((profile as any).cityId) {
        // Use corrected timezone so displayTimezone shows the right value immediately
        setCurrentCity({ id: (profile as any).cityId, name: (profile as any).cityName || "", timezone: correctedTimezone })
      }
      if ((profile as any).countryId) {
        const countryRow = countries.find(c => c.id === (profile as any).countryId)
        setCurrentCountry({
          id: (profile as any).countryId,
          name: (profile as any).countryName || countryRow?.name || "",
          iso2: countryRow?.iso2 || ""
        })
      }
    }
  }, [profile, states, countries, setCurrentState, setCurrentCity, setCurrentCountry])

  // Cleanup username validation on unmount
  useEffect(() => {
    return () => {
      cleanupUsernameValidation()
    }
  }, [cleanupUsernameValidation])

  const isCountryTouched = selectedCountry.id !== 0
  const isStateTouched = selectedState.id !== 0
  const effectiveCountry = selectedCountry.id !== 0 ? selectedCountry : currentCountry
  const effectiveState = selectedState.id !== 0 ? selectedState : (isCountryTouched ? { id: 0, name: "" } : currentState)
  const effectiveCity = selectedCity.id !== 0 ? selectedCity : ((isCountryTouched || isStateTouched) ? { id: 0, name: "", timezone: "" } : currentCity)
  const displayTimezone = resolvedTimezone
    || effectiveCity.timezone
    || ((isCountryTouched || isStateTouched) ? "" : (currentCity.timezone || profileData.timezone || ""))

  // Auto-fill locale formats when country changes
  useEffect(() => {
    const fetchAndApplyLocale = async () => {
      const countryCode = effectiveCountry.iso2
      if (!countryCode) return

      try {
        const res = await masterdataApi.locales.getAll()
        if (res.success && res.data) {
          const localesList = res.data
          const matchingLocale = localesList.find((l: any) => {
            const locCountry = l.countryCode || (l.id && l.id.includes('_') ? l.id.split('_')[1] : null)
            return locCountry && locCountry.toUpperCase() === countryCode.toUpperCase()
          })
          if (matchingLocale) {
            setProfileData(prev => ({
              ...prev,
              language: matchingLocale.languageCode === 'id' ? 1 : matchingLocale.languageCode === 'ar' ? 2 : 1, // mapping logic if needed, fallback to 1
              dateFormat: matchingLocale.dateFormatShort || prev.dateFormat,
              timeFormat: matchingLocale.uses12HourClock === 1 ? "hh:mm A" : "HH:mm:ss",
              currencyFormat: matchingLocale.currencyCode || prev.currencyFormat,
            }))
          }
        }
      } catch (err) {
        console.error("Failed to fetch locales:", err)
      }
    }

    if (isEditing && isCountryTouched) {
      fetchAndApplyLocale()
    }
  }, [effectiveCountry.iso2, isEditing, isCountryTouched])

  // Apply crop when shouldApplyCrop changes
  useEffect(() => {
    if (shouldApplyCrop && cropApplyRef.current) {
      cropApplyRef.current.click()
      setShouldApplyCrop(false)
    }
  }, [shouldApplyCrop, setShouldApplyCrop, cropApplyRef])

  // Get avatar source
  const getAvatarSource = () => {
    if (avatarPreview) return avatarPreview
    if (profile?.avatar && profile.avatar !== null && profile.avatar !== '') {
      return profile.avatar
    }
    return null
  }

  // Get avatar URL for user list
  const getAvatarUrl = (user: SearchUser) => {
    return user.avatar || undefined
  }

  const handleInputChange = (field: string, value: string | number) => {
    if (field === 'username' && typeof value === 'string') {
      let formattedValue = value
      if (!formattedValue.startsWith('@') && formattedValue.length > 0) {
        formattedValue = '@' + formattedValue
      }
      if (formattedValue === '@') {
        formattedValue = ''
      }

      setProfileData(prev => ({
        ...prev,
        [field]: formattedValue
      }))

      debouncedCheckUsername(formattedValue)
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('profile.messages.error.file_too_large', 'File size must be less than 5MB'))
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error(t('profile.messages.error.invalid_file_type', 'Please select an image file'))
        return
      }

      const currentPreview = getAvatarSource()
      openCropDialog(currentPreview)
      setSelectedAvatar(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.onerror = () => {
        console.error('Error reading file')
        toast.error(t('profile.messages.error.file_read_failed', 'Failed to read image file'))
        setSelectedAvatar(null)
        setAvatarPreview(originalAvatarPreview)
      }
      try {
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('Error in readAsDataURL:', error)
        toast.error(t('profile.messages.error.file_read_failed', 'Failed to read image file'))
        setSelectedAvatar(null)
        setAvatarPreview(originalAvatarPreview)
      }
    }
  }

  const triggerAvatarUpload = () => {
    document.getElementById('avatar-upload')?.click()
  }

  const handleAvatarClick = () => {
    if (isEditing) {
      triggerAvatarUpload()
    } else if (getAvatarSource()) {
      setShowFullscreenAvatar(true)
    }
  }

  const handleSaveProfile = async () => {
    if (!userId) return

    // Validate username format
    if (profileData.username) {
      const formatError = validateUsernameFormat(profileData.username)
      if (formatError) {
        setUsernameError(formatError)
        return
      }
    }

    // Validate username availability
    if (usernameError) return

    if (profileData.username && profileData.username !== profile?.username) {
      const isAvailable = await checkUsernameAvailability(profileData.username)
      if (!isAvailable) return
    }

    setIsSaving(true)
    try {
      let profilePhotoUrl = profile?.avatar

      // Upload avatar if selected (convert to base64 for Qurani API)
      if (selectedAvatar) {
        try {
          const base64Str = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(selectedAvatar)
          })

          profilePhotoUrl = base64Str
        } catch (error) {
          console.error('Error reading avatar file:', error)
          toast.error(t('profile.messages.error.upload_avatar_failed', 'Failed to process avatar image'))
          return
        }
      }

      if (isCountryTouched && effectiveState.id === 0) {
        toast.warning(t('profile.messages.warning.state_not_valid', 'Please select a state/province'))
        return
      }
      if ((isCountryTouched || isStateTouched) && effectiveCity.id === 0) {
        toast.warning(t('profile.messages.warning.city_not_valid', 'Please select a city'))
        return
      }

      const timezoneToSave = displayTimezone || ""

      // Update profile
      const result = await updateUserProfile(
        userId,
        effectiveCountry.id,
        effectiveState.id,
        effectiveCity.id,
        effectiveCountry.name,
        effectiveState.name,
        effectiveCity.name,
        timezoneToSave,
        profileData.fullName,
        profileData.nickname,
        profileData.username,
        profileData.gender,
        profileData.date_of_birth,
        profileData.job,
        profileData.address,
        profileData.bio,
        profilePhotoUrl || undefined,
        profileData.email, // Tambahkan email di sini
        profileData.language,
        profileData.dateFormat,
        profileData.timeFormat,
        profileData.numberFormat,
        profileData.currencyFormat
      )

      if (!result.success) {
        if ((result as any).warning) {
          toast.warning((result as any).type == "state" ? t("profile.messages.warning.state_not_valid") : t("profile.messages.warning.city_not_valid"))
          return
        }
        console.error('Error updating profile:', result.message)
        toast.error(result.message || t('profile.messages.error.update_failed', 'Failed to update profile'))
        return
      }

      // Reset state
      setSelectedAvatar(null)
      setAvatarPreview(null)
      setIsEditing(false)

      // Update current location values
      if (effectiveState.id) {
        const stateName = states.find(p => p.id === effectiveState.id)?.name || effectiveState.name || ""
        setCurrentState({ id: effectiveState.id, name: stateName })
      } else {
        setCurrentState({ id: 0, name: "" })
      }

      if (effectiveCity.id) {
        const cityName = cities.find(c => c.id === effectiveCity.id)?.name || effectiveCity.name || ""
        const cityTimeZone = timezoneToSave || cities.find(c => c.id === effectiveCity.id)?.timezone || ""
        setCurrentCity({ id: effectiveCity.id, name: cityName, timezone: cityTimeZone })
      } else {
        setCurrentCity({ id: 0, name: "", timezone: "" })
      }

      const countryFound = countries.find(c => c.id === effectiveCountry.id)
      setCurrentCountry({
        id: effectiveCountry.id,
        name: countryFound?.name || effectiveCountry.name || "",
        iso2: countryFound?.iso2 || effectiveCountry.iso2 || ""
      })

      setSelectedState({ id: 0, name: "" })
      setSelectedCity({ id: 0, name: "", timezone: "" })
      setSelectedCountry({ id: 0, name: "" })
      setProfileData(prev => ({ ...prev, timezone: timezoneToSave }))

      // We no longer manually cache myqurani_user_profile_v2. 
      // The auth provider will fetch the latest via refreshProfile().

      try {
        await refreshProfile()
      } catch {
        // no-op
      }

      toast.success(t('profile.messages.success.update_success', 'Profile updated successfully!'))
      refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(t('profile.messages.error.update_failed', 'Failed to update profile'))
    } finally {
      setIsSaving(false)
    }
  }

  // Notification recipient functions
  const saveNotificationRecipient = async (recipientId: string) => {
    if (!userId) return false

    try {
      // Supabase is completely removed as requested.
      // TODO: Replace with Qurani API for user monitoring when available.
      toast.info("Fitur notifikasi penerima (recipient) sedang dimigrasi ke API baru.")
      return false
    } catch (error) {
      console.error('Error saving notification recipient:', error)
      return false
    }
  }

  const handleAddUser = async (userToAdd: SearchUser) => {
    try {
      const isAlreadySelected = recipients.some(u => u.id === userToAdd.id)
      if (isAlreadySelected) {
        toast.warning(t('profile.notification_recipients.messages.already_added_warning', '{name} is already added as notification recipient').replace('{name}', userToAdd.name))
        return
      }

      const saved = await saveNotificationRecipient(userToAdd.id)

      if (saved) {
        refreshRecipients()
        toast.success(t('profile.notification_recipients.messages.added_success', '{name} added as notification recipient').replace('{name}', userToAdd.name))
        setSearchQuery("")
        setSearchResults([])
      } else {
        // toast.error(t('profile.notification_recipients.messages.add_failed', 'Failed to add notification recipient. Please try again.'))
      }
    } catch (error) {
      console.error('Error adding user:', error)
      toast.error(t('profile.notification_recipients.messages.add_failed', 'Failed to add notification recipient. Please try again.'))
    }
  }

  const deleteNotificationRecipient = async (recipientId: string) => {
    if (!userId) return false

    try {
      // Supabase is completely removed as requested.
      // TODO: Replace with Qurani API for user monitoring when available.
      toast.info("Fitur notifikasi penerima (recipient) sedang dimigrasi ke API baru.")
      return false
    } catch (error) {
      console.error('Error deleting notification recipient:', error)
      return false
    }
  }

  const handleDeleteUser = (user: SearchUser) => {
    setUserToDelete(user)
    setShowDeleteDialog(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const deleted = await deleteNotificationRecipient(userToDelete.id)

      if (deleted) {
        refreshRecipients()
        toast.success(t('profile.notification_recipients.messages.deleted_success', '{name} successfully removed from notification recipients').replace('{name}', userToDelete.name))
      } else {
        toast.error(t('profile.notification_recipients.messages.delete_failed', 'Failed to remove notification recipient. Please try again.'))
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(t('profile.notification_recipients.messages.delete_failed', 'Failed to remove notification recipient. Please try again.'))
    } finally {
      setShowDeleteDialog(false)
      setUserToDelete(null)
    }
  }

  const handleLogout = () => {
    setShowLogoutDialog(true)
  }

  const handleLogoutConfirm = async (status: boolean) => {
    setShowLogoutDialog(false)
    if (status) {
      localStorage.removeItem('autoNotificationDismissed')
      await signOut(status, router)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return dateString
    const day = date.getDate().toString().padStart(2, "0")
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  if (loading) {
    return <SkeletonDetailPage showAvatar infoRows={6} />
  }

  return (
    <div className="space-y-4 min-h-full">
      <div className="space-y-4 w-full md:max-w-7xl mx-auto">
        <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <UserPen className="h-5 w-5" />
                    {t('profile.edit_profile', 'Edit Profile')}
                  </>
                ) : (
                  <>
                    <User className="h-5 w-5" />
                    {t('profile.personal_info', 'Personal Information')}
                  </>
                )}
              </CardTitle>

              {!isEditing && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={"outline"}
                    onClick={() => router.push('/profile/pengaturan-qurani')}
                    className="hidden md:flex rounded-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300 hover:scale-105"
                  >
                    {t('profile.qurani_setting')}
                  </Button>
                  <Button
                    variant={"default"}
                    onClick={() => setIsEditing(true)}
                    className="hidden md:flex rounded-xl transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:scale-105"
                  >
                    {t('profile.edit_profile', 'Edit Profile')}
                  </Button>
                </div>
              )}

              {/* Mobile Dropdown Menu */}
              {!isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('profile.edit_profile', 'Edit Profile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/profile/pengaturan-qurani")}>
                      <Settings2 className="h-4 w-4 mr-2" />
                      {t('profile.qurani_setting')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('profile.logout', 'Logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-10">
            {/* Profile Section */}
            <div className="flex flex-col gap-3">
              <div className={`flex flex-col sm:flex-row sm:items-center gap-6 ${isEditing ? "justify-center items-center" : "items-start"}`}>
                <ProfileAvatar
                  avatarSource={getAvatarSource()}
                  fullName={profileData.fullName}
                  username={profileData.username}
                  nickname={profileData.nickname}
                  isEditing={isEditing}
                  loading={loading}
                  imageLoadError={imageLoadError}
                  onAvatarClick={handleAvatarClick}
                  onUploadClick={triggerAvatarUpload}
                  setImageLoadError={setImageLoadError}
                  showPreviewButton={!avatarPreview}
                />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />

              </div>
              {!isEditing && (
                <ProfileInfo
                  profileData={profileData}
                  currentState={currentState}
                  currentCity={currentCity}
                  currentCountry={currentCountry}
                  formatDate={formatDate}
                />
              )}
            </div>

            {!isEditing && <Separator />}

            {/* Profile Edit Form */}
            {isEditing && (
              <>
                <ProfileEditForm
                  profileData={profileData}
                  displayTimezone={displayTimezone}
                  usernameError={usernameError}
                  isCheckingUsername={isCheckingUsername}
                  handleInputChange={handleInputChange}
                  countries={countries}
                  states={states}
                  cities={cities}
                  selectedCountry={selectedCountry}
                  currentCountry={currentCountry}
                  selectedState={selectedState}
                  currentState={currentState}
                  selectedCity={selectedCity}
                  currentCity={currentCity}
                  openCountry={openCountry}
                  openState={openState}
                  openCity={openCity}
                  setOpenCountry={setOpenCountry}
                  setOpenState={setOpenState}
                  setOpenCity={setOpenCity}
                  setSelectedCountry={setSelectedCountry}
                  setSelectedState={setSelectedState}
                  setSelectedCity={setSelectedCity}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedState({ id: 0, name: "" })
                      setSelectedCity({ id: 0, name: "", timezone: "" })
                      setSelectedCountry({ id: 0, name: "" })
                      try {
                        const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []))
                        params.delete('edit')
                        const query = params.toString()
                        router.replace(query ? `${pathname}?${query}` : `${pathname}`)
                      } catch {
                        // no-op fallback
                      }
                    }}
                  >
                    {t('profile.auth.cancel', 'Cancel')}
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    onClick={handleSaveProfile}
                    disabled={isSaving || !!usernameError || isCheckingUsername}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? t('profile.auth.saving', 'Saving...') : t('profile.auth.save', 'Save')}
                  </Button>
                </div>
              </>
            )}

            {/* Settings Section */}
            {!isEditing && (
              <div className="space-y-5">
                <SettingsSection theme={theme} setTheme={setTheme} />
                <NotificationRecipients
                  recipients={recipients}
                  onAddClick={() => setShowAddUserDialog(true)}
                  onDeleteClick={handleDeleteUser}
                  getAvatarUrl={getAvatarUrl}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddUserDialog
        open={showAddUserDialog}
        onOpenChange={setShowAddUserDialog}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        recipients={recipients}
        onAddUser={handleAddUser}
        getAvatarUrl={getAvatarUrl}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userToDelete={userToDelete}
        onConfirm={confirmDeleteUser}
      />

      <LogoutDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogoutConfirm}
      />

      <FullscreenAvatarModal
        show={showFullscreenAvatar}
        avatarSource={getAvatarSource()}
        fullName={profileData.fullName}
        username={profileData.username}
        onClose={() => setShowFullscreenAvatar(false)}
      />

      <ImageCropDialog
        open={openCropImage}
        selectedAvatar={selectedAvatar}
        onCrop={handleImageCrop}
        onCancel={() => handleCancelCrop(originalAvatarPreview)}
        onApply={() => handleApplyCrop((file, preview) => {
          setSelectedAvatar(file)
          setAvatarPreview(preview)
        })}
        cropApplyRef={cropApplyRef as React.RefObject<HTMLButtonElement>}
        isCancelling={isCancelling}
      />
    </div>
  )
}

export default function ProfilePage() {
  const { t } = useI18n()

  return (
    <Suspense fallback={<SkeletonDetailPage showAvatar infoRows={6} />}>
      <ProfilePageContent />
    </Suspense>
  )
}

