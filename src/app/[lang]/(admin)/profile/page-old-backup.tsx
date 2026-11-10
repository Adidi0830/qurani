// "use client"

// import { useState, useEffect, useCallback, useRef, Suspense } from "react"
// import Image from "next/image"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// import { Switch } from "@/components/ui/switch"
// import { Separator } from "@/components/ui/separator"
// import {
//   User,
//   Globe,
//   Moon,
//   Sun,
//   Camera,
//   Save,
//   Settings,
//   Phone,
//   Check,
//   MoreVertical,
//   LogOut,
//   Edit,
//   Bell,
//   UserPlus,
//   X,
//   Search,
//   Trash2,
//   Plus,
//   BriefcaseBusiness,
//   MapPin,
//   Calendar,
//   Mail,
//   Settings2,
//   UserPen,
// } from "lucide-react"
// import {
//   Dialog,
//   DialogContent,
//   DialogTitle,
// } from "@/components/ui/dialog"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { useAuth } from "@/hooks/use-auth"
// import { useTheme } from "next-themes"
// import { toast } from "sonner"
// import { getInitials } from "@/utils/helpers/get-initials"
// import { cn } from "@/lib/utils"
// // import { searchUsers, SearchUser } from "@/utils/api/users/search"
// import { createClient } from "@/utils/supabase/client"
// import { fetchStates } from "@/utils/api/province/fetch"
// import { fetchCities } from "@/utils/api/city/fetch"
// import { fetchCountries } from "@/utils/api/countries/fetch"
// import { CityData } from "@/types/cities"
// import { ProvinceData } from "@/types/provinces"
// import { CountryData } from "@/types/countries"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
// import { updateUserProfile } from "@/utils/api/user/update-location"
// import signOut from "@/utils/Auth/logout"
// import { useI18n, I18nProvider } from "@/components/providers/i18n-provider"
// import { LanguageSwitcher } from "@/components/ui/language-switcher"
// import Link from "next/link"
// import { useRouter, useSearchParams, usePathname } from "next/navigation"
// import { useUserProfile } from "@/hooks/use-user-profile"
// import { useNotificationRecipients } from "@/hooks/use-recepient"
// import { Textarea } from "@/components/ui/textarea"
// import { ImageCrop, ImageCropApply, ImageCropContent } from "@/components/kibo-ui/image-crop"
// import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
// import { generateId } from "@/lib/generateId"

// function ProfilePageContent() {
//   const { user } = useAuth()
//   const { theme, setTheme } = useTheme()
//   const { t, locale } = useI18n()

//   // Profile form state
//   const [profileData, setProfileData] = useState({
//     fullName: "",
//     nickname: "",
//     username: "",
//     email: "",
//     gender: 0,
//     date_of_birth: "",
//     job: "",
//     phoneNumber: "",
//     bio: "",
//     language: "id", // Default to Indonesian (only for settings)
//     country_id: 0,
//     country_name: "",
//     states_id: 0,
//     states_name: "",
//     city_id: 0,
//     city_name: "",
//   })
//   const [usernameError, setUsernameError] = useState("");
//   const [isCheckingUsername, setIsCheckingUsername] = useState(false);
//   const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const [imageLoadError, setImageLoadError] = useState(false);
//   const [isEditing, setIsEditing] = useState(false)
//   const [isSaving, setIsSaving] = useState(false)
//   const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
//   const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
//   const [states, setStates] = useState<ProvinceData[]>([])
//   const [cities, setCities] = useState<CityData[]>([])
//   const [countries, setCountries] = useState<CountryData[]>([])
//   const [openState, setOpenState] = useState(false)
//   const [openCity, setOpenCity] = useState(false)
//   const [openCountry, setOpenCountry] = useState(false)
//   const [currentState, setCurrentState] = useState<{ id: string, name: string }>({ id: "0", name: "" })
//   const [currentCity, setCurrentCity] = useState<{ id: string, name: string }>({ id: "0", name: "" })
//   const [currentCountry, setCurrentCountry] = useState<{ id: string, name: string }>({ id: "0", name: "" })
//   const [selectedState, setSelectedState] = useState<{ id: string, name: string }>({ id: "0", name: "" })
//   const [selectedCity, setSelectedCity] = useState<{ id: string, name: string }>({ id: "0", name: "" })
//   const [selectedCountry, setSelectedCountry] = useState<{ id: string, name: string }>({ id: "0", name: "" })
//   const [locationError, setLocationError] = useState("")
//   const [showLogoutDialog, setShowLogoutDialog] = useState(false)
//   const [showFullscreenAvatar, setShowFullscreenAvatar] = useState(false)
//   const [showDeleteDialog, setShowDeleteDialog] = useState(false)
//   const [userToDelete, setUserToDelete] = useState<SearchUser | null>(null)
//   const [openCropImage, setOpenCropImage] = useState<boolean>(false)
//   const [croppedImage, setCroppedImage] = useState<string | null>(null)
//   const [shouldApplyCrop, setShouldApplyCrop] = useState(false)
//   const [originalAvatarPreview, setOriginalAvatarPreview] = useState<string | null>(null)
//   const [isCancelling, setIsCancelling] = useState(false)
//   const cropApplyRef = useRef<HTMLButtonElement>(null)
//   const router = useRouter()

//   // Notification settings state
//   const [showAddUserDialog, setShowAddUserDialog] = useState(false)
//   const [searchQuery, setSearchQuery] = useState("")
//   const [searchResults, setSearchResults] = useState<SearchUser[]>([])
//   const [isSearching, setIsSearching] = useState(false)
//   const searchParams = useSearchParams();
//   const isEditParam = searchParams.get('edit') === 'true';
//   const pathname = usePathname();

//   useEffect(() => {
//     if (isEditParam) setIsEditing(true);
//   }, [isEditParam]);

//   // Handle keyboard events for fullscreen modal
//   useEffect(() => {
//     const handleKeyDown = (event: KeyboardEvent) => {
//       if (showFullscreenAvatar && event.key === 'Escape') {
//         setShowFullscreenAvatar(false)
//       }
//     }

//     if (showFullscreenAvatar) {
//       document.addEventListener('keydown', handleKeyDown)
//       // Prevent body scroll when modal is open
//       document.body.style.overflow = 'hidden'
//     }

//     return () => {
//       document.removeEventListener('keydown', handleKeyDown)
//       document.body.style.overflow = 'unset'
//     }
//   }, [showFullscreenAvatar])

//   // Search users with debounce
//   useEffect(() => {
//     const searchTimeout = setTimeout(async () => {
//       if (!searchQuery.trim() || !user?.id || searchQuery.trim().length < 2) {
//         setSearchResults([])
//         setIsSearching(false)
//         return
//       }

//       setIsSearching(true)
//       try {
//         const result = await searchUsers(searchQuery.trim(), user.id, 10)
//         setSearchResults(result.users)
//       } catch (error) {
//         console.error('Error searching users:', error)
//         toast.error(t('profile.notification_recipients.messages.search_failed', 'Failed to search users'))
//         setSearchResults([])
//       } finally {
//         setIsSearching(false)
//       }
//     }, 300) // 300ms debounce for faster response

//     return () => clearTimeout(searchTimeout)
//   }, [searchQuery, user?.id, t])

//   // Get proper avatar URL with priority: profile_user > avatar
//   const getAvatarUrl = (user: SearchUser) => {
//     return user.profile_user || user.avatar || undefined
//   }

//   const { recipients, refreshRecipients } = useNotificationRecipients();

//   // Load notification recipients on component mount
//   useEffect(() => {
//     if (user?.id) {
//       refreshRecipients()
//     }
//   }, [user?.id, refreshRecipients])

//   // Save notification recipient to Supabase
//   const saveNotificationRecipient = async (recipientId: string) => {
//     if (!user?.id) return false

//     try {
//       const supabase = createClient()

//       const { error } = await supabase
//         .from('user_monitoring_records')
//         .insert({
//           id: generateId(),
//           user_id: user.id,
//           user_monitoring_id: recipientId
//         })

//       if (error) {
//         console.error('Error saving notification recipient:', error)
//         return false
//       }

//       return true
//     } catch (error) {
//       console.error('Error saving notification recipient:', error)
//       return false
//     }
//   }

//   // Handle add user directly
//   const handleAddUser = async (userToAdd: SearchUser) => {
//     try {
//       // Check if user is already added
//       const isAlreadySelected = recipients.some(u => u.id === userToAdd.id)
//       if (isAlreadySelected) {
//         toast.warning(t('profile.notification_recipients.messages.already_added_warning', '{name} is already added as notification recipient').replace('{name}', userToAdd.name))
//         return
//       }

//       // Save to Supabase
//       const saved = await saveNotificationRecipient(userToAdd.id)

//       if (saved) {
//         // Add to local state
//         refreshRecipients()
//         toast.success(t('profile.notification_recipients.messages.added_success', '{name} added as notification recipient').replace('{name}', userToAdd.name))

//         // Clear search
//         setSearchQuery("")
//         setSearchResults([])
//       } else {
//         toast.error(t('profile.notification_recipients.messages.add_failed', 'Failed to add notification recipient. Please try again.'))
//       }
//     } catch (error) {
//       console.error('Error adding user:', error)
//       toast.error(t('profile.notification_recipients.messages.add_failed', 'Failed to add notification recipient. Please try again.'))
//     }
//   }

//   // Delete notification recipient from Supabase
//   const deleteNotificationRecipient = async (recipientId: string) => {
//     if (!user?.id) return false

//     try {
//       const supabase = createClient()

//       const { error } = await supabase
//         .from('user_monitoring_records')
//         .delete()
//         .eq('user_id', user.id)
//         .eq('user_monitoring_id', recipientId)

//       if (error) {
//         console.error('Error deleting notification recipient:', error)
//         return false
//       }

//       return true
//     } catch (error) {
//       console.error('Error deleting notification recipient:', error)
//       return false
//     }
//   }

//   // Handle delete user - show confirmation dialog
//   const handleDeleteUser = (user: SearchUser) => {
//     setUserToDelete(user)
//     setShowDeleteDialog(true)
//   }

//   // Confirm delete user
//   const confirmDeleteUser = async () => {
//     if (!userToDelete) return

//     try {
//       // Delete from Supabase
//       const deleted = await deleteNotificationRecipient(userToDelete.id)

//       if (deleted) {
//         // Remove from local state
//         refreshRecipients()
//         toast.success(t('profile.notification_recipients.messages.deleted_success', '{name} successfully removed from notification recipients').replace('{name}', userToDelete.name))
//       } else {
//         toast.error(t('profile.notification_recipients.messages.delete_failed', 'Failed to remove notification recipient. Please try again.'))
//       }
//     } catch (error) {
//       console.error('Error deleting user:', error)
//       toast.error(t('profile.notification_recipients.messages.delete_failed', 'Failed to remove notification recipient. Please try again.'))
//     } finally {
//       setShowDeleteDialog(false)
//       setUserToDelete(null)
//     }
//   }

//   // Function untuk validasi state-city relationship
//   const validateStateCityRelationship = useCallback(() => {
//     // Reset error first
//     setLocationError("")

//     // Jika tidak ada pilihan, tidak perlu validasi
//     if (selectedState.id === "0" && selectedCity.id === "0") {
//       return true
//     }

//     // Jika ada state tapi tidak ada city
//     if (selectedState.id !== "0" && selectedCity.id === "0") {
//       setLocationError(t('profile.select_city_first', 'Please select a city'))
//       return false
//     }

//     // Jika ada city tapi tidak ada state, gunakan current state sebagai fallback
//     if (selectedState.id === "0" && selectedCity.id !== "0") {
//       // Jika ada current state, gunakan itu untuk validasi
//       if (currentState.id !== "0") {
//         const selectedCityData = cities.find(city => city.id === Number(selectedCity.id))
//         const currentStateId = Number(currentState.id)

//         if (selectedCityData && selectedCityData.code_province === currentStateId) {
//           return true // Valid karena city sesuai dengan current state
//         }
//       }
//       setLocationError(t('profile.state_city_required', 'State and city must be valid'))
//       return false
//     }

//     // Validasi apakah city belongs to state
//     if (selectedState.id !== "0" && selectedCity.id !== "0") {
//       const selectedCityData = cities.find(city => city.id === Number(selectedCity.id))
//       const selectedStateId = Number(selectedState.id)

//       if (!selectedCityData) {
//         setLocationError("City data not found")
//         return false
//       }

//       if (selectedCityData.code_province !== selectedStateId) {
//         setLocationError(`${selectedCity.name} is not in ${selectedState.name} state`)
//         return false
//       }
//     }

//     return true
//   }, [selectedState, selectedCity, currentState, cities, t])

//   const loadStates = useCallback(async () => {
//     const countryId = selectedCountry.id !== "0" ? Number(selectedCountry.id) : Number(currentCountry.id)
//     const result = await fetchStates(countryId)
//     if (result.success) {
//       setStates(result.data || [])
//     }
//   }, [selectedCountry.id, currentCountry.id])

//   const loadCities = useCallback(async () => {
//     if (selectedState.id === "0") {
//       setCities([])
//       setSelectedCity({ id: "0", name: "" })
//       return
//     }

//     try {
//       const result = await fetchCities(Number(selectedState.id))
//       if (result.success) {
//         setCities(result.data || [])
//         setSelectedCity({ id: "0", name: "" }) // Reset city selection
//       }
//     } catch (error) {
//       console.error("Error loading cities:", error)
//       setCities([])
//     }
//   }, [selectedState.id])

//   const loadCountries = useCallback(async () => {
//     const result = await fetchCountries()
//     if (result.success) {
//       setCountries(result.data || [])
//     }
//   }, [])

//   const { profile, loading, refresh } = useUserProfile();

//   // Effect untuk isi data form ketika profile sudah tersedia dari hook
//   useEffect(() => {
//     if (profile) {
//       setProfileData({
//         fullName: profile.full_name || "",
//         nickname: profile.nickname || "",
//         username: profile.username || "",
//         email: profile.email || "",
//         gender: profile.gender || 0,
//         date_of_birth: profile.date_of_birth || "",
//         job: profile.job || "",
//         phoneNumber: profile.no_hp || "",
//         bio: profile.bio || "",
//         language: "id",
//         country_id: profile.country_id || 0,
//         country_name: profile.country_name || "",
//         states_id: profile.states_id || 0,
//         states_name: profile.states_name || "",
//         city_id: profile.city_id || 0,
//         city_name: profile.city_name || "",
//       });
//       // Set state info
//       if (profile.states_id) {
//         const stateName = states.find(state => state.id === profile.states_id)?.name || ""
//         setCurrentState({ id: profile.states_id.toString(), name: stateName })
//       }
//       // Set city info
//       if (profile.city_id) {
//         setCurrentCity({ id: profile.city_id.toString(), name: "" })
//       }
//       // Set country info
//       if (profile.country_id) {
//         const countryName = countries.find(country => country.id === profile.country_id)?.name || ""
//         setCurrentCountry({ id: profile.country_id.toString(), name: countryName })
//       }
//       // Set city info
//       if (profile.city_id) {
//         setCurrentCity({ id: profile.city_id.toString(), name: "" })
//       }

//     }
//   }, [profile, states, countries]);

//   // Effect untuk load states
//   useEffect(() => {
//     loadStates()
//   }, [loadStates])

//   // Effect untuk load countries
//   useEffect(() => {
//     loadCountries()
//   }, [loadCountries])

//   // Effect untuk load states ketika selectedCountry berubah
//   useEffect(() => {
//     if (selectedCountry.id !== "0") {
//       loadStates()
//       // Reset state and city when country changes
//       setSelectedState({ id: "0", name: "" })
//       setSelectedCity({ id: "0", name: "" })
//       setCities([])
//     }
//   }, [selectedCountry.id, loadStates])

//   // Effect untuk load countries
//   useEffect(() => {
//     loadCountries()
//   }, [loadCountries])

//   // Effect untuk load cities ketika selectedState berubah
//   useEffect(() => {
//     if (selectedState.id !== "0") {
//       loadCities()
//     }
//   }, [selectedState.id, loadCities])

//   // Effect untuk load cities berdasarkan currentState ketika profile dimuat
//   useEffect(() => {
//     if (currentState.id !== "0" && cities.length === 0) {
//       const loadInitialCities = async () => {
//         try {
//           const result = await fetchCities(Number(currentState.id))
//           if (result.success) {
//             setCities(result.data || [])
//           }
//         } catch (error) {
//           console.error("Error loading initial cities:", error)
//         }
//       }
//       loadInitialCities()
//     }
//   }, [currentState.id, cities.length])

//   // Effect untuk update city name setelah cities dimuat
//   useEffect(() => {
//     if (currentCity.id !== "0" && currentCity.name === "" && cities.length > 0) {
//       const cityName = cities.find(city => city.id === Number(currentCity.id))?.name || ""
//       if (cityName) {
//         setCurrentCity(prev => ({ ...prev, name: cityName }))
//       }
//     }
//   }, [currentCity.id, currentCity.name, cities])

//   // Effect untuk validasi state-city relationship
//   useEffect(() => {
//     // Use timeout to avoid race condition with state updates
//     const timeoutId = setTimeout(() => {
//       // Hanya lakukan validasi jika ada perubahan yang signifikan
//       if (selectedState.id !== "0" || selectedCity.id !== "0") {
//         // Jangan validasi jika sedang dalam proses memilih kota yang valid dengan current state
//         if (selectedState.id === "0" && selectedCity.id !== "0" && currentState.id !== "0") {
//           // Cek apakah city yang dipilih valid dengan current state
//           const selectedCityData = cities.find(city => city.id === Number(selectedCity.id))
//           if (selectedCityData && selectedCityData.code_province === Number(currentState.id)) {
//             setLocationError("") // Clear error jika valid
//             return
//           }
//         }
//         validateStateCityRelationship()
//       } else {
//         setLocationError("")
//       }
//     }, 150) // Increase timeout slightly untuk memberikan waktu state update

//     return () => clearTimeout(timeoutId)
//   }, [selectedState, selectedCity, currentState, cities, validateStateCityRelationship])

//   // Cleanup timeout on unmount
//   useEffect(() => {
//     return () => {
//       if (usernameTimeoutRef.current) {
//         clearTimeout(usernameTimeoutRef.current)
//       }
//     }
//   }, [])


//   const initial = profileData.fullName && getInitials(profileData.fullName)

//   // Get avatar source with priority: preview > profile_user from database only
//   const getAvatarSource = () => {

//     // 1. Show preview if user is selecting new image
//     if (avatarPreview) {
//       return avatarPreview
//     }

//     // 2. Show uploaded profile image from database only (no Google fallback)
//     if (profile?.profile_user && profile.profile_user !== null && profile.profile_user !== '') {
//       return profile.profile_user
//     }

//     if (profile?.avatar && profile.avatar !== null && profile.avatar !== '') {
//       return profile.avatar
//     }

//     // 3. No fallback - if no profile_user, show initials only
//     return null
//   }

//   const handleSaveProfile = async () => {
//     if (!user?.id) return

//     // Validate username format before saving
//     if (profileData.username) {
//       const formatError = validateUsernameFormat(profileData.username)
//       if (formatError) {
//         setUsernameError(formatError)
//         return
//       }
//     }

//     // Validate username before saving
//     if (usernameError) {
//       return
//     }

//     // Check username availability one more time before saving
//     if (profileData.username && profileData.username !== profile?.username) {
//       const isAvailable = await checkUsernameAvailability(profileData.username)
//       if (!isAvailable) {
//         return
//       }
//     }

//     // Check if location has been changed and validate
//     const hasLocationChanged = selectedState.id !== "0" || selectedCity.id !== "0"
//     if (hasLocationChanged) {
//       // Validate state-city relationship
//       // Jika hanya city yang berubah dan valid dengan current state, skip validasi yang ketat
//       if (selectedState.id === "0" && selectedCity.id !== "0" && currentState.id !== "0") {
//         const selectedCityData = cities.find(city => city.id === Number(selectedCity.id))
//         if (selectedCityData && selectedCityData.code_province === Number(currentState.id)) {
//           // Valid - city sesuai dengan current state, lanjutkan save
//         } else {
//           toast.error(t('profile.messages.error.invalid_location', 'Invalid location selection'))
//           return
//         }
//       } else {
//         // Validasi normal untuk kasus lainnya
//         if (!validateStateCityRelationship()) {
//           toast.error(locationError || t('profile.messages.error.invalid_location', 'Invalid location selection'))
//           return
//         }
//       }
//     }

//     setIsSaving(true)
//     try {
//       const supabase = createClient()
//       let profilePhotoUrl = profile?.profile_user
//       // Upload avatar if selected
//       if (selectedAvatar) {
//         const fileExt = selectedAvatar.name.split('.').pop()
//         const fileName = `${user.id}-${Date.now()}.${fileExt}`

//         const { data: uploadData, error: uploadError } = await supabase.storage
//           .from('profile_user')
//           .upload(fileName, selectedAvatar)

//         if (uploadError) {
//           console.error('Error uploading avatar:', uploadError)
//           toast.error(t('profile.messages.error.upload_avatar_failed', 'Failed to upload avatar'))
//           return
//         }

//         const { data: urlData } = supabase.storage
//           .from('profile_user')
//           .getPublicUrl(uploadData.path)

//         profilePhotoUrl = urlData.publicUrl
//       }

//       // Prepare update data
//       // Jika hanya city yang diubah dan state tidak, gunakan current state
//       const stateId = selectedState.id !== "0"
//         ? Number(selectedState.id)
//         : (selectedCity.id !== "0" && currentState.id !== "0")
//           ? Number(currentState.id)
//           : undefined
//       const cityId = selectedCity.id !== "0" ? Number(selectedCity.id) : undefined
//       const countryId = selectedCountry.id !== "0" ? Number(selectedCountry.id) : (currentCountry.id !== "0" ? Number(currentCountry.id) : undefined)

//       console.log('Update data:', {
//         full_name: profileData.fullName,
//         username: profileData.username,
//         no_hp: profileData.phoneNumber,
//         profile_user: profilePhotoUrl,
//         states_id: stateId,
//         city_id: cityId,
//         country_id: countryId
//       })

//       // Use the new API function to update profile
//       const result = await updateUserProfile(
//         user.id,
//         profileData.fullName,
//         profileData.nickname,
//         profileData.username,
//         profileData.gender,
//         profileData.date_of_birth,
//         profileData.job,
//         profileData.phoneNumber,
//         stateId,
//         cityId,
//         profileData.bio,
//         profilePhotoUrl || undefined,
//         countryId
//       )

//       if (!result.success) {
//         console.error('Error updating profile:', result.message)
//         toast.error(result.message || t('profile.messages.error.update_failed', 'Failed to update profile'))
//         return
//       }

//       const updatedProfile = result.data

//       // Update local state
//       console.log('Updated profile after save:', updatedProfile)
//       // setUserProfile(updatedProfile) // This line is removed as per the edit hint
//       setSelectedAvatar(null)
//       setAvatarPreview(null)
//       setIsEditing(false)

//       // Reset location selections and update current values
//       if (stateId && cityId) {
//         const stateName = states.find(p => p.id === stateId)?.name || ""
//         const cityName = cities.find(c => c.id === cityId)?.name || ""

//         setCurrentState({ id: stateId.toString(), name: stateName })
//         setCurrentCity({ id: cityId.toString(), name: cityName })
//       }

//       if (countryId) {
//         const countryName = countries.find(c => c.id === countryId)?.name || ""
//         setCurrentCountry({ id: countryId.toString(), name: countryName })
//       }

//       setSelectedState({ id: "0", name: "" })
//       setSelectedCity({ id: "0", name: "" })
//       setSelectedCountry({ id: "0", name: "" })

//       // Verify the update by checking profile_user field
//       if (profilePhotoUrl && updatedProfile?.profile_user !== profilePhotoUrl) {
//         console.warn('WARNING: profile_user was not updated correctly!')

//         // Try to fetch fresh data from database
//         console.log('Fetching fresh data to verify...')
//         const { data: freshProfile } = await supabase
//           .from('user_profiles')
//           .select('*')
//           .eq('id', user.id)
//           .single()

//         if (freshProfile) {
//           // setUserProfile(freshProfile) // This line is removed as per the edit hint
//         }
//       } else if (profilePhotoUrl) {
//         console.log('SUCCESS: profile_user updated correctly to:', updatedProfile?.profile_user)
//       }

//       toast.success(t('profile.messages.success.update_success', 'Profile updated successfully!'))
//       refresh(); // Call refresh() after successful update
//     } catch (error) {
//       console.error('Error updating profile:', error)
//       toast.error(t('profile.messages.error.update_failed', 'Failed to update profile'))
//     } finally {
//       setIsSaving(false)
//     }
//   }

//   const checkUsernameAvailability = useCallback(async (username: string) => {
//     if (!username || username === profile?.username) {
//       setUsernameError("")
//       return true
//     }

//     setIsCheckingUsername(true)
//     try {
//       const supabase = createClient()

//       const { data, error } = await supabase
//         .from('user_profiles')
//         .select('username')
//         .eq('username', username)
//         .neq('id', user?.id || '')
//         .limit(1)

//       if (error) {
//         console.error('Error checking username:', error)
//         setUsernameError(t('profile.messages.error.check_username', 'Error checking username availability'))
//         return false
//       }

//       if (data && data.length > 0) {
//         setUsernameError(t('profile.messages.error.username_taken', 'Username sudah digunakan oleh user lain'))
//         return false
//       }

//       setUsernameError("")
//       return true
//     } catch (error) {
//       console.error('Error checking username:', error)
//       setUsernameError(t('profile.messages.error.check_username', 'Error checking username availability'))
//       return false
//     } finally {
//       setIsCheckingUsername(false)
//     }
//   }, [user?.id, profile?.username, t])

//   // Function to validate username format
//   const validateUsernameFormat = (username: string): string | null => {
//     if (!username) return null

//     const usernameWithoutAt = username.startsWith('@') ? username.slice(1) : username

//     // Check for spaces
//     if (usernameWithoutAt.includes(' ')) {
//       return t('profile.messages.error.username_no_spaces', 'Username tidak boleh menggunakan spasi. Gunakan underscore (_) sebagai gantinya.')
//     }

//     // Check for hyphens (not allowed)
//     if (usernameWithoutAt.includes('-')) {
//       return t('profile.messages.error.username_no_hyphens', 'Username tidak boleh menggunakan tanda hubung (-). Gunakan underscore (_) sebagai gantinya.')
//     }

//     // Check for valid characters (alphanumeric, underscore only)
//     const validUsernameRegex = /^[a-zA-Z0-9_]+$/
//     if (!validUsernameRegex.test(usernameWithoutAt)) {
//       return t('profile.messages.error.username_invalid_chars', 'Username hanya boleh menggunakan huruf, angka, dan underscore (_)')
//     }

//     // Check minimum length
//     if (usernameWithoutAt.length < 3) {
//       return t('profile.messages.error.username_min_length', 'Username minimal 3 karakter')
//     }

//     return null // No error
//   }

//   const handleInputChange = (field: string, value: string) => {
//     if (field === 'username') {
//       // Auto-add @ prefix if not present
//       let formattedValue = value
//       if (!formattedValue.startsWith('@') && formattedValue.length > 0) {
//         formattedValue = '@' + formattedValue
//       }

//       // Remove @ if user tries to delete it completely
//       if (formattedValue === '@') {
//         formattedValue = ''
//       }

//       setProfileData(prev => ({
//         ...prev,
//         [field]: formattedValue
//       }))

//       // Clear previous timeout
//       if (usernameTimeoutRef.current) {
//         clearTimeout(usernameTimeoutRef.current)
//       }

//       // Debounced username availability check only (no format validation here)
//       if (formattedValue && formattedValue.length > 1) {
//         usernameTimeoutRef.current = setTimeout(() => {
//           checkUsernameAvailability(formattedValue)
//         }, 500)
//       } else {
//         setUsernameError("")
//       }
//     } else {
//       setProfileData(prev => ({
//         ...prev,
//         [field]: value
//       }))
//     }
//   }

//   const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0]
//     if (file) {
//       if (file.size > 5 * 1024 * 1024) { // 5MB limit
//         toast.error(t('profile.messages.error.file_too_large', 'File size must be less than 5MB'))
//         return
//       }

//       if (!file.type.startsWith('image/')) {
//         toast.error(t('profile.messages.error.invalid_file_type', 'Please select an image file'))
//         return
//       }

//       // Save current avatar preview before opening crop dialog
//       const currentPreview = getAvatarSource()
//       setOriginalAvatarPreview(currentPreview)

//       setSelectedAvatar(file)
//       setOpenCropImage(true)
//       setCroppedImage(null)

//       // Create preview URL
//       const reader = new FileReader()
//       reader.onload = (e) => {
//         setAvatarPreview(e.target?.result as string)
//       }
//       reader.onerror = () => {
//         console.error('Error reading file')
//         toast.error(t('profile.messages.error.file_read_failed', 'Failed to read image file'))
//         setOpenCropImage(false)
//         setSelectedAvatar(null)
//         setAvatarPreview(originalAvatarPreview)
//       }
//       try {
//         reader.readAsDataURL(file)
//       } catch (error) {
//         console.error('Error in readAsDataURL:', error)
//         toast.error(t('profile.messages.error.file_read_failed', 'Failed to read image file'))
//         setOpenCropImage(false)
//         setSelectedAvatar(null)
//         setAvatarPreview(originalAvatarPreview)
//       }
//     }
//   }

//   const handleImageCrop = (croppedImageData: string) => {
//     setCroppedImage(croppedImageData)

//     // If shouldApplyCrop flag is set, process the crop immediately
//     if (shouldApplyCrop) {
//       processCroppedImage(croppedImageData)
//     }
//   }

//   // Function to check if browser supports WebP
//   const checkWebPSupport = (): boolean => {
//     const canvas = document.createElement('canvas')
//     canvas.width = 1
//     canvas.height = 1
//     return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
//   }

//   // Function to resize image to specific dimensions (always 400x400)
//   const resizeImage = async (src: string, width: number, height: number): Promise<Blob> => {
//     return new Promise<Blob>((resolve, reject) => {
//       const img = document.createElement('img')
//       img.onload = () => {
//         const canvas = document.createElement('canvas')
//         canvas.width = width
//         canvas.height = height

//         const ctx = canvas.getContext('2d')
//         if (!ctx) {
//           reject(new Error('Could not get canvas context'))
//           return
//         }

//         // Draw image to fill the canvas, maintaining aspect ratio
//         ctx.drawImage(img, 0, 0, width, height)

//         // Use WebP if supported, fallback to PNG
//         const format = checkWebPSupport() ? 'image/webp' : 'image/png'
//         const quality = checkWebPSupport() ? 0.85 : 0.9

//         canvas.toBlob(
//           (blob) => {
//             if (blob) {
//               resolve(blob)
//             } else {
//               reject(new Error('Could not convert canvas to blob'))
//             }
//           },
//           format,
//           quality
//         )
//       }
//       img.onerror = () => reject(new Error('Failed to load image'))
//       img.src = src
//     })
//   }

//   const processCroppedImage = async (croppedImageData: string) => {
//     try {
//       // Resize image to exactly 400x400 and convert to WebP (with PNG fallback)
//       const resizedBlob = await resizeImage(croppedImageData, 400, 400)
//       const supportsWebP = checkWebPSupport()
//       const fileName = supportsWebP ? 'avatar.webp' : 'avatar.png'
//       const mimeType = supportsWebP ? 'image/webp' : 'image/png'
//       const file = new File([resizedBlob], fileName, { type: mimeType })

//       setSelectedAvatar(file)
//       setAvatarPreview(croppedImageData)
//       setOpenCropImage(false)
//       setCroppedImage(null)
//       setShouldApplyCrop(false)
//     } catch (error) {
//       console.error('Error converting cropped image:', error)
//       toast.error(t('profile.messages.error.crop_failed', 'Failed to process cropped image'))
//       setShouldApplyCrop(false)
//     }
//   }

//   useEffect(() => {
//     if (shouldApplyCrop && cropApplyRef.current) {
//       cropApplyRef.current.click()
//       setShouldApplyCrop(false)
//     }
//   }, [shouldApplyCrop])

//   const handleApplyCrop = () => {
//     if (cropApplyRef.current) {
//       // If cropped image already exists, process it immediately
//       if (croppedImage) {
//         processCroppedImage(croppedImage)
//       } else {
//         // Set flag and trigger crop
//         setShouldApplyCrop(true)
//       }
//     }
//   }

//   const handleCancelCrop = () => {
//     if (isCancelling) return // Prevent double calls

//     setIsCancelling(true)
//     setOpenCropImage(false)

//     // Reset state after dialog is closed to prevent ImageCrop from reading null
//     setTimeout(() => {
//       setSelectedAvatar(null)
//       setCroppedImage(null)
//       setAvatarPreview(originalAvatarPreview) // Restore original preview
//       setShouldApplyCrop(false)
//       setOriginalAvatarPreview(null)
//       setIsCancelling(false)

//       // Reset file input to allow selecting the same file again
//       const fileInput = document.getElementById('avatar-upload') as HTMLInputElement
//       if (fileInput) {
//         fileInput.value = ''
//       }
//     }, 300) // Wait for dialog close animation
//   }

//   const triggerAvatarUpload = () => {
//     document.getElementById('avatar-upload')?.click()
//   }

//   const handleAvatarClick = () => {
//     if (isEditing) {
//       triggerAvatarUpload()
//     } else if (getAvatarSource()) {
//       setShowFullscreenAvatar(true)
//     }
//   }

//   const handleLogout = () => {
//     setShowLogoutDialog(true)
//   }

//   const handleLogoutConfirm = async (status: boolean) => {
//     setShowLogoutDialog(false)
//     if (status) {
//       localStorage.removeItem('autoNotificationDismissed')
//       await signOut(status, router)
//     }
//   }

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString)
//     const localeString = locale === 'id' ? 'id-ID' : 'en-GB'
//     return date.toLocaleDateString(localeString, {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric'
//     })
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-slate-600 dark:text-slate-400">{t('common.loading', 'Loading...')}</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="space-y-4 min-h-full">

//       <div className="space-y-4 w-full md:max-w-7xl mx-auto">
//         <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
//           <CardHeader>
//             <div className="flex items-center justify-between">
//               <CardTitle className="flex items-center gap-2">
//                 {isEditing ? (
//                   <>
//                     <UserPen className="h-5 w-5" />
//                     {t('profile.edit_profile', 'Edit Profile')}
//                   </>
//                 ) : (
//                   <>
//                     <User className="h-5 w-5" />
//                     {t('profile.personal_info', 'Personal Information')}
//                   </>
//                 )}
//               </CardTitle>

//               {!isEditing && (
//                 <div className="flex items-center gap-2">
//                   <Button
//                     variant={"outline"}
//                     onClick={() => router.push('/profile/pengaturan-qurani')}
//                     className="hidden md:flex rounded-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300 hover:scale-105"
//                   >
//                     {t('profile.qurani_setting')}
//                   </Button>
//                   <Button
//                     variant={"default"}
//                     onClick={() => setIsEditing(true)}
//                     className="hidden md:flex rounded-xl transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:scale-105"
//                   >
//                     {t('profile.edit_profile', 'Edit Profile')}
//                   </Button>
//                 </div>
//               )}

//               {/* Mobile Dropdown Menu */}
//               {!isEditing && (
//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="md:hidden h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
//                     >
//                       <MoreVertical className="h-4 w-4" />
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="end" className="w-48">
//                     <DropdownMenuItem onClick={() => setIsEditing(true)}>
//                       <Edit className="h-4 w-4 mr-2" />
//                       {isEditing ? t('common.cancel', 'Cancel') : t('profile.edit_profile', 'Edit Profile')}
//                     </DropdownMenuItem>
//                     <DropdownMenuItem onClick={() => router.push("/profile/pengaturan-qurani")}>
//                       <Settings2 className="h-4 w-4 mr-2" />
//                       {t('profile.qurani_setting')}
//                     </DropdownMenuItem>
//                     <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
//                       <LogOut className="h-4 w-4 mr-2" />
//                       {t('profile.logout', 'Logout')}
//                     </DropdownMenuItem>
//                   </DropdownMenuContent>
//                 </DropdownMenu>
//               )}
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-10">
//             {/* Profile Card */}
//             <div className="flex flex-col gap-5">
//               <div className={`flex flex-col sm:flex-row sm:items-center gap-6 ${isEditing ? "justify-center items-center" : "items-start"}`}>
//                 <div className="relative group flex">
//                   <div
//                     className="relative cursor-pointer max-w-auto"
//                     onClick={handleAvatarClick}
//                   >
//                     <Avatar className={`${isEditing ? "h-40 w-40" : "h-24 w-24"} ring-4 ring-slate-200 dark:ring-slate-700 transition-all duration-300 ${isEditing
//                       ? 'group-hover:ring-blue-300 dark:group-hover:ring-blue-600'
//                       : getAvatarSource()
//                         ? 'group-hover:ring-emerald-300 dark:group-hover:ring-emerald-600 group-hover:scale-105'
//                         : 'group-hover:ring-blue-300 dark:group-hover:ring-blue-600'
//                       }`}>
//                       {loading ? (
//                         <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
//                           <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
//                         </div>
//                       ) : (
//                         <>
//                           {getAvatarSource() ? (
//                             <>
//                               <AvatarImage
//                                 src={getAvatarSource() || undefined}
//                                 alt={profileData.fullName}
//                                 className="object-cover"
//                                 onError={(e) => {
//                                   console.error('Main avatar image failed to load:', getAvatarSource())
//                                   console.error('Error details:', e)
//                                   setImageLoadError(true)
//                                 }}
//                                 onLoad={() => {
//                                   console.log('Main avatar image loaded successfully:', getAvatarSource())
//                                   setImageLoadError(false)
//                                 }}
//                               />
//                               {imageLoadError && (
//                                 <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-full">
//                                   <span className="text-xs text-red-600 dark:text-red-400">IMG ERROR</span>
//                                 </div>
//                               )}
//                             </>
//                           ) : null}
//                           <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
//                             {initial}
//                           </AvatarFallback>
//                         </>
//                       )}
//                     </Avatar>
//                     {isEditing && (
//                       <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
//                         <Camera className="h-10 w-10 text-white" />
//                       </div>
//                     )}
//                   </div>
//                   <input
//                     id="avatar-upload"
//                     type="file"
//                     accept="image/*"
//                     onChange={handleAvatarChange}
//                     className="hidden"
//                   />
//                   {isEditing && !avatarPreview && (
//                     <Button
//                       size="icon"
//                       variant="outline"
//                       className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900 border-2 border-blue-200 dark:border-blue-600"
//                       onClick={triggerAvatarUpload}
//                     >
//                       <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400" />
//                     </Button>
//                   )}
//                 </div>
//                 {!isEditing && (
//                   <div className="space-y-2">
//                     <div>
//                       <div className="text-xl font-semibold">
//                         {profileData.nickname
//                           ? profileData.nickname + " - " + profileData.fullName
//                           : profileData.fullName}
//                         {profileData.gender !== 0 && (
//                           <span className="text-sm text-gray-500 dark:text-gray-400 font-thin pl-3">{profileData.gender === 1 ? t('profile.gender.male') : t('profile.gender.female')}</span>
//                         )}
//                       </div>
//                       {profileData.username && (
//                         <Link href={'/profile/' + profileData.username?.replace(/^@/, '')} className="text-sm text-blue-600 dark:text-blue-400 font-medium">
//                           {profileData.username}
//                         </Link>
//                       )}
//                     </div>

//                     <div className="sm:hidden">
//                       {profileData.email && (
//                         <div className="flex items-center gap-2">
//                           <Mail className="text-gray-700 dark:text-gray-300 w-4" />
//                           <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{profileData.email}</span>
//                         </div>
//                       )}
//                       {profileData.phoneNumber && (
//                         <div className="flex items-center gap-2">
//                           <Phone className="text-gray-700 dark:text-gray-300 w-4" />
//                           <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{profileData.phoneNumber}</span>
//                         </div>
//                       )}
//                       {profileData.job && (
//                         <div className="flex items-center gap-2">
//                           <BriefcaseBusiness className="text-gray-700 dark:text-gray-300 w-4" />
//                           <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{profileData.job}</span>
//                         </div>
//                       )}
//                       {profileData.date_of_birth && (
//                         <div className="flex items-center gap-2">
//                           <Calendar className="text-gray-700 dark:text-gray-300 w-4" />
//                           <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{formatDate(profileData.date_of_birth)}</span>
//                         </div>
//                       )}
//                       {(currentCity.name && currentState.name) && (
//                         <div className="flex items-start gap-2 mt-0.5">
//                           <MapPin className="text-gray-700 dark:text-gray-300 w-4 -mt-[2px]" />
//                           <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{currentCountry.name}, {currentState.name} - {currentCity.name}</span>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>
//               {!isEditing && (
//                 <div className="hidden sm:block">
//                   <div className="flex gap-3">
//                     {profileData.email && (
//                       <div className="flex items-center gap-2">
//                         <Mail className="text-gray-700 dark:text-gray-300 w-4" />
//                         <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{profileData.email}</span>
//                       </div>
//                     )}
//                     {(profileData.email && profileData.phoneNumber) && (
//                       <span className="text-gray-700 dark:text-gray-300 block">|</span>
//                     )}
//                     {profileData.phoneNumber && (
//                       <div className="flex items-center gap-2">
//                         <Phone className="text-gray-700 dark:text-gray-300 w-4" />
//                         <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{profileData.phoneNumber}</span>
//                       </div>
//                     )}
//                   </div>
//                   {profileData.job && (
//                     <div className="flex items-center gap-2">
//                       <BriefcaseBusiness className="text-gray-700 dark:text-gray-300 w-4" />
//                       <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{profileData.job}</span>
//                     </div>
//                   )}
//                   {profileData.date_of_birth && (
//                     <div className="flex items-center gap-2">
//                       <Calendar className="text-gray-700 dark:text-gray-300 w-4" />
//                       <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{formatDate(profileData.date_of_birth)}</span>
//                     </div>
//                   )}
//                   {(currentCity.name && currentState.name) && (
//                     <div className="flex items-start gap-2 mt-0.5">
//                       <MapPin className="text-gray-700 dark:text-gray-300 w-4 -mt-[2px]" />
//                       <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">{currentCountry.name}, {currentState.name} - {currentCity.name}</span>
//                     </div>
//                   )}
//                 </div>
//               )}
//               {(profileData.bio && !isEditing) && (
//                 <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">{profileData.bio}</p>
//               )}

//             </div>
//             {!isEditing && (
//               <Separator />
//             )}

//             {/* Profile Form */}
//             {isEditing && (
//               <div className="space-y-6">
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
//                   {/* full name */}
//                   <div className="space-y-2">
//                     <Label htmlFor="fullName">{t('profile.auth.full_name')}</Label>
//                     <Input
//                       id="fullName"
//                       value={profileData.fullName}
//                       onChange={(e) => handleInputChange("fullName", e.target.value)}
//                       disabled={!isEditing}
//                       maxLength={25}
//                     />
//                   </div>
//                   {/* nickname */}
//                   <div className="space-y-2">
//                     <Label htmlFor="nickname">{t('profile.auth.nickname')}</Label>
//                     <Input
//                       id="nickname"
//                       placeholder={t('profile.auth.nickname_placeholder')}
//                       value={profileData.nickname}
//                       onChange={(e) => handleInputChange("nickname", e.target.value)}
//                       disabled={!isEditing}
//                       maxLength={25}
//                     />
//                   </div>
//                   {/* username */}
//                   <div className="space-y-2">
//                     <Label htmlFor="username">{t('profile.auth.username')}</Label>
//                     <div className="relative">
//                       <Input
//                         id="username"
//                         value={profileData.username}
//                         onChange={(e) => handleInputChange("username", e.target.value)}
//                         disabled={!isEditing}
//                         placeholder="@username"
//                         maxLength={15}
//                         className={`${usernameError ? 'border-red-500 focus:border-red-500' : ''} ${isCheckingUsername ? 'pr-10' : ''}`}
//                       />
//                       {isCheckingUsername && (
//                         <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
//                           <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
//                         </div>
//                       )}
//                     </div>
//                     {usernameError && (
//                       <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
//                         <span className="w-4 h-4 text-red-500">⚠</span>
//                         {usernameError}
//                       </p>
//                     )}

//                   </div>
//                   {/* gender */}
//                   <div className="space-y-2">
//                     <Label htmlFor="gender">{t('profile.auth.gender')}</Label>
//                     <Select
//                       value={profileData.gender ? profileData.gender.toString() : undefined}
//                       onValueChange={(value) => handleInputChange("gender", value)}
//                       disabled={!isEditing}
//                     >
//                       <SelectTrigger className="w-full">
//                         <SelectValue placeholder={t('profile.auth.gender_placeholder')}>
//                         </SelectValue>
//                       </SelectTrigger>
//                       <SelectContent className="rounded-xl">
//                         <SelectItem value="1">{t('profile.gender.male')}</SelectItem>
//                         <SelectItem value="2">{t('profile.gender.female')}</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   {/* date of birth */}
//                   <div className="space-y-2">
//                     <Label htmlFor="date_of_birth">{t('profile.auth.birth')}</Label>
//                     <Input
//                       id="date_of_birth"
//                       type="date"
//                       value={profileData.date_of_birth}
//                       onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
//                       disabled={!isEditing}
//                       maxLength={25}
//                     />
//                   </div>
//                   {/* job */}
//                   <div className="space-y-2">
//                     <Label htmlFor="job">{t('profile.auth.job')}</Label>
//                     <Input
//                       id="job"
//                       placeholder={t('profile.auth.job_placeholder')}
//                       value={profileData.job}
//                       onChange={(e) => handleInputChange("job", e.target.value)}
//                       disabled={!isEditing}
//                       maxLength={25}
//                     />
//                   </div>
//                   {/* phone number */}
//                   <div className="space-y-2">
//                     <Label htmlFor="phoneNumber">{t('profile.auth.phone_number')}</Label>
//                     <div className="flex items-center gap-2">
//                       <Input
//                         id="phoneNumber"
//                         type="tel"
//                         value={profileData.phoneNumber}
//                         onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
//                         disabled={!isEditing}
//                         placeholder="+12 345 6789 1234"
//                         minLength={10}
//                         maxLength={15}
//                       />
//                     </div>
//                   </div>
//                   {/* Country Selection */}
//                   <div className="space-y-2">
//                     <Label htmlFor="country">{t('profile.country', 'Country')}</Label>
//                     <Popover open={openCountry} onOpenChange={setOpenCountry}>
//                       <PopoverTrigger asChild>
//                         <Button
//                           variant="outline"
//                           className="w-full justify-start text-left"
//                           disabled={!isEditing}
//                         >
//                           {selectedCountry.name || currentCountry.name || t('profile.select_country', 'Select Country')}
//                           {selectedCountry.id !== "0" && (
//                             <span
//                               className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
//                               onClick={(e) => {
//                                 e.stopPropagation()
//                                 setSelectedCountry({ id: "0", name: "" })
//                               }}
//                             >
//                               ×
//                             </span>
//                           )}
//                         </Button>
//                       </PopoverTrigger>
//                       <PopoverContent align="start" className="w-full">
//                         <Command>
//                           <CommandInput placeholder={t('common.search', 'Search')} />
//                           <CommandList>
//                             <CommandGroup>
//                               {countries.map((country) => (
//                                 <CommandItem
//                                   key={country.id}
//                                   className="w-full flex justify-between cursor-pointer"
//                                   onSelect={() => {
//                                     const newCountryId = country.id.toString()

//                                     // Always set the selected country (no toggle behavior)
//                                     setSelectedCountry({
//                                       id: newCountryId,
//                                       name: country.name
//                                     })

//                                     setOpenCountry(false)
//                                   }}
//                                 >
//                                   {country.name}
//                                   <Check className={`w-4 h-4 ${
//                                     // Show check for selected country (prioritas tertinggi)
//                                     selectedCountry.id !== "0" && selectedCountry.id === country.id.toString()
//                                       ? "opacity-100"
//                                       // Show check for current country jika tidak ada yang selected
//                                       : selectedCountry.id === "0" && currentCountry.id === country.id.toString()
//                                         ? "opacity-100"
//                                         : "opacity-0"
//                                     }`} />
//                                 </CommandItem>
//                               ))}
//                             </CommandGroup>
//                           </CommandList>
//                         </Command>
//                       </PopoverContent>
//                     </Popover>
//                   </div>
//                   {/* State Selection */}
//                   <div className="space-y-2">
//                     <Label htmlFor="state">{t('profile.state', 'State')}</Label>
//                     <Popover open={openState} onOpenChange={setOpenState}>
//                       <PopoverTrigger asChild>
//                         <Button
//                           variant="outline"
//                           className="w-full justify-start text-left"
//                           disabled={!isEditing}
//                         >
//                           {selectedState.name || currentState.name || t('profile.select_state', 'Select State')}
//                           {selectedState.id !== "0" && (
//                             <span
//                               className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
//                               onClick={(e) => {
//                                 e.stopPropagation()
//                                 setSelectedState({ id: "0", name: "" })
//                                 setSelectedCity({ id: "0", name: "" })
//                                 setLocationError("")
//                               }}
//                             >
//                               ×
//                             </span>
//                           )}
//                         </Button>
//                       </PopoverTrigger>
//                       <PopoverContent align="start" className="w-full">
//                         <Command>
//                           <CommandInput placeholder={t('common.search', 'Search')} />
//                           <CommandList>
//                             <CommandGroup>
//                               {states.map((state) => (
//                                 <CommandItem
//                                   key={state.id}
//                                   className="w-full flex justify-between cursor-pointer"
//                                   onSelect={() => {
//                                     const newStateId = state.id.toString()


//                                     // Always set the selected state (no toggle behavior)
//                                     setSelectedState({
//                                       id: newStateId,
//                                       name: state.name
//                                     })

//                                     // Check if current selected city belongs to this state
//                                     if (selectedCity.id !== "0") {
//                                       const selectedCityData = cities.find(city => city.id === Number(selectedCity.id))
//                                       if (selectedCityData && selectedCityData.code_province !== Number(newStateId)) {
//                                         // Reset city if it doesn't belong to new state
//                                         setSelectedCity({ id: "0", name: "" })
//                                       }
//                                     }

//                                     setLocationError("")
//                                     setOpenState(false)
//                                   }}
//                                 >
//                                   {state.name}
//                                   <Check className={`w-4 h-4 ${
//                                     // Show check for selected state (prioritas tertinggi)
//                                     selectedState.id !== "0" && selectedState.id === state.id.toString()
//                                       ? "opacity-100"
//                                       // Show check for current state jika tidak ada yang selected
//                                       : selectedState.id === "0" && currentState.id === state.id.toString()
//                                         ? "opacity-100"
//                                         : "opacity-0"
//                                     }`} />
//                                 </CommandItem>
//                               ))}
//                             </CommandGroup>
//                           </CommandList>
//                         </Command>
//                       </PopoverContent>
//                     </Popover>
//                   </div>
//                   {/* City Selection */}
//                   <div className="space-y-2 relative">
//                     <Label htmlFor="city">{t('profile.city', 'City')}</Label>
//                     <Popover open={openCity} onOpenChange={setOpenCity}>
//                       <PopoverTrigger asChild>
//                         <Button
//                           variant="outline"
//                           className="w-full justify-start text-left"
//                           disabled={!isEditing || (selectedState.id === "0" && currentState.id === "0")}
//                         >
//                           {selectedCity.name || currentCity.name || t('profile.select_city', 'Select City')}
//                           {selectedCity.id !== "0" && (
//                             <span
//                               className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
//                               onClick={(e) => {
//                                 e.stopPropagation()
//                                 setSelectedCity({ id: "0", name: "" })
//                                 setLocationError("")
//                               }}
//                             >
//                               ×
//                             </span>
//                           )}
//                         </Button>
//                       </PopoverTrigger>
//                       <PopoverContent align="start" className="w-full">
//                         <Command>
//                           <CommandInput placeholder={t('common.search', 'Search')} />
//                           <CommandList>
//                             <CommandGroup>
//                               {cities.map((city) => (
//                                 <CommandItem
//                                   key={city.id}
//                                   className="w-full flex justify-between cursor-pointer"
//                                   onSelect={() => {
//                                     const newCityId = city.id.toString()


//                                     // Always set the selected city (no toggle behavior)
//                                     setSelectedCity({
//                                       id: newCityId,
//                                       name: city.name
//                                     })
//                                     setOpenCity(false)
//                                   }}
//                                 >
//                                   {city.name}
//                                   <Check className={`w-4 h-4 ${
//                                     // Show check for selected city (prioritas tertinggi)
//                                     selectedCity.id !== "0" && selectedCity.id === city.id.toString()
//                                       ? "opacity-100"
//                                       // Show check for current city jika tidak ada yang selected
//                                       : selectedCity.id === "0" && currentCity.id === city.id.toString()
//                                         ? "opacity-100"
//                                         : "opacity-0"
//                                     }`} />
//                                 </CommandItem>
//                               ))}
//                             </CommandGroup>
//                           </CommandList>
//                         </Command>
//                       </PopoverContent>
//                     </Popover>
//                     {locationError && (
//                       <p className="absolute z-10 text-sm text-red-500 bg-white border border-red-200 rounded-md px-2 py-1 shadow-sm flex items-center gap-1 mt-1">
//                         <span className="w-4 h-4 text-red-500">⚠</span>
//                         {locationError}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="bio">{t('profile.auth.bio')}</Label>
//                   <Textarea
//                     id="bio"
//                     className="h-40 sm:h-20"
//                     value={profileData.bio}
//                     onChange={(e) => handleInputChange("bio", e.target.value)}
//                     maxLength={400}
//                     disabled={!isEditing}
//                   />
//                   <p className="text-sm text-gray-500">
//                     {profileData.bio?.length || 0}/400 {t('profile.auth.characters')}
//                   </p>
//                 </div>

//                 <div className="flex justify-end gap-2">
//                   <Button
//                     variant="outline"
//                     onClick={() => {
//                       setIsEditing(false)
//                       setSelectedState({ id: "0", name: "" })
//                       setSelectedCity({ id: "0", name: "" })
//                       setSelectedCountry({ id: "0", name: "" })
//                       // fetchUserProfile() // This line is removed as per the edit hint
//                       try {
//                         const params = new URLSearchParams(Array.from(searchParams.entries()))
//                         params.delete('edit')
//                         const query = params.toString()
//                         router.replace(query ? `${pathname}?${query}` : `${pathname}`)
//                       } catch {
//                         // no-op fallback
//                       }
//                     }}
//                   >
//                     {t('profile.auth.cancel', 'Cancel')}
//                   </Button>
//                   <Button
//                     className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
//                     onClick={handleSaveProfile}
//                     disabled={isSaving || !!usernameError || isCheckingUsername}
//                   >
//                     <Save className="h-4 w-4 mr-2" />
//                     {isSaving ? t('profile.auth.saving', 'Saving...') : t('profile.auth.save', 'Save')}
//                   </Button>
//                 </div>
//               </div>
//             )}

//             {/* Theme and Language Settings */}
//             {!isEditing && (
//               <div className="space-y-5">
//                 <div className="flex items-center gap-2 text-xl bg-none">
//                   <Settings className="h-5 w-5" />
//                   {t('profile.settings.title', 'Settings')}
//                 </div>
//                 <div className="flex flex-col gap-3">
//                   {/* Theme Setting */}
//                   <div className="group py-2 px-4 mb-1 rounded-2xl bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-lg transition-all duration-300">
//                     <div className="flex items-center justify-between">
//                       <div className="md:space-y-2">
//                         <Label className="text-lg font-semibold flex items-center gap-2">
//                           {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
//                           {t('profile.settings.theme_label', 'Theme')}
//                         </Label>
//                       </div>
//                       <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-inner">
//                         <Sun className="h-5 w-5 text-gray-500" />
//                         <Switch
//                           checked={theme === "dark"}
//                           onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
//                           className="data-[state=checked]:bg-slate-700 data-[state=unchecked]:bg-gray-200"
//                         />
//                         <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
//                       </div>
//                     </div>
//                   </div>

//                   {/* Language Setting */}
//                   <div className="group py-2 px-4 rounded-2xl bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/50 dark:border-blue-600/30 hover:shadow-lg transition-all duration-300">
//                     <div className="flex items-center justify-between">
//                       <div className="md:space-y-2">
//                         <Label className="text-lg font-semibold flex items-center gap-2">
//                           <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
//                           {t('profile.settings.language_label', 'Language')}
//                         </Label>
//                       </div>
//                       <LanguageSwitcher />
//                     </div>
//                   </div>

//                   {/* Notification Settings */}
//                   <div className="group py-4 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
//                     <div className="space-y-4">
//                       <div className="flex items-center justify-between">
//                         <div className="space-y-2">
//                           <Label className="text-lg font-semibold flex items-center gap-2">
//                             <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
//                             {t('profile.notification_recipients.title', 'Notification Recipients')}
//                           </Label>
//                         </div>
//                         {/* Desktop Add Button - Hidden on mobile */}
//                         <Button
//                           onClick={() => setShowAddUserDialog(true)}
//                           size="sm"
//                           className="hidden md:flex bg-emerald-600 hover:bg-emerald-700 text-white"
//                         >
//                           <UserPlus className="h-4 w-4 mr-2" />
//                           {t('profile.notification_recipients.add_recipient', 'Add Recipient')}
//                         </Button>
//                       </div>

//                       {/* Selected Users Display */}
//                       <div className="space-y-3">
//                         {recipients.length === 0 ? (
//                           <div className="text-center py-8 text-muted-foreground">
//                             <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                             <p className="text-sm">{t('profile.notification_recipients.no_recipients_selected', 'No notification recipients selected')}</p>
//                             <p className="text-xs">{t('profile.notification_recipients.add_people_description', 'Add people to receive notifications about your recitations')}</p>
//                           </div>
//                         ) : (
//                           <div className="grid gap-2">
//                             {recipients.map(user => ({ ...user, profile_user: user.profile_user ?? undefined })).map((user) => (
//                               <div
//                                 key={user.id}
//                                 className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all duration-200"
//                               >
//                                 <div className="flex items-center gap-3">
//                                   <Link href={'/profile/' + user.username?.replace(/^@/, '')}>
//                                     <Avatar className="h-10 w-10">
//                                       <AvatarImage src={getAvatarUrl(user)} />
//                                       <AvatarFallback className="bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
//                                         {getInitials(user.name)}
//                                       </AvatarFallback>
//                                     </Avatar>
//                                   </Link>
//                                   <div>
//                                     <p className="font-medium text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200" onClick={() => router.push('/profile/' + user.username?.replace(/^@/, ''))}>{user.name}</p>
//                                     <p className="text-xs text-muted-foreground">{user.username}</p>
//                                   </div>
//                                 </div>
//                                 <Button
//                                   onClick={() => handleDeleteUser(user)}
//                                   size="sm"
//                                   variant="ghost"
//                                   className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
//                                 >
//                                   <Trash2 className="h-4 w-4" />
//                                 </Button>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>

//                       {/* Mobile Add Button - Only visible on mobile, positioned at bottom */}
//                       <div className="md:hidden pt-2">
//                         <Button
//                           onClick={() => setShowAddUserDialog(true)}
//                           size="sm"
//                           className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
//                         >
//                           <UserPlus className="h-4 w-4 mr-2" />
//                           {t('profile.notification_recipients.add_recipient', 'Add Recipient')}
//                         </Button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </div>

//       {/* Add User Dialog */}
//       <AlertDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
//         <AlertDialogContent className="max-w-md dark:bg-gray-800">
//           <AlertDialogHeader>
//             <div className="flex items-center justify-between">
//               <AlertDialogTitle className="flex items-center gap-2">
//                 <UserPlus className="h-5 w-5 text-emerald-600" />
//                 {t('profile.notification_recipients.add_notification_recipient', 'Add Notification Recipient')}
//               </AlertDialogTitle>
//               <Button
//                 onClick={() => setShowAddUserDialog(false)}
//                 size="sm"
//                 variant="ghost"
//                 className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
//               >
//                 <X className="h-4 w-4" />
//               </Button>
//             </div>
//           </AlertDialogHeader>

//           <div className="space-y-4">
//             {/* Search Input */}
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder={t('profile.notification_recipients.search_placeholder', 'Search by name or username...')}
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="pl-10"
//               />
//             </div>

//             {/* Search Results */}
//             <div className="max-h-60 overflow-y-auto space-y-2">
//               {isSearching ? (
//                 <div className="flex items-center justify-center py-8">
//                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
//                   <span className="ml-2 text-sm text-muted-foreground">{t('profile.notification_recipients.searching', 'Searching...')}</span>
//                 </div>
//               ) : searchResults.length === 0 && searchQuery ? (
//                 <div className="text-center py-8 text-muted-foreground">
//                   <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                   <p className="text-sm">{t('profile.notification_recipients.no_users_found', 'No users found')}</p>
//                   <p className="text-xs">{t('profile.notification_recipients.try_different_term', 'Try searching with a different term')}</p>
//                 </div>
//               ) : searchQuery === "" ? (
//                 <div className="text-center py-8 text-muted-foreground">
//                   <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                   <p className="text-sm">{t('profile.notification_recipients.start_typing', 'Start typing to search for users')}</p>
//                 </div>
//               ) : searchQuery.length < 2 ? (
//                 <div className="text-center py-8 text-muted-foreground">
//                   <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                   <p className="text-sm">{t('profile.notification_recipients.type_at_least_2', 'Type at least 2 characters to search')}</p>
//                 </div>
//               ) : (
//                 searchResults.map((user) => {
//                   const isAlreadySelected = recipients.some(u => u.id === user.id)
//                   return (
//                     <div
//                       key={user.id}
//                       className={cn(
//                         "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
//                         isAlreadySelected
//                           ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 opacity-60"
//                           : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
//                       )}
//                     >
//                       <div className="flex items-center gap-3">
//                         <Avatar className="h-10 w-10">
//                           <AvatarImage src={getAvatarUrl(user)} />
//                           <AvatarFallback className="bg-slate-100 dark:bg-slate-700">
//                             {getInitials(user.name)}
//                           </AvatarFallback>
//                         </Avatar>
//                         <div>
//                           <p className="font-medium text-sm">{user.name}</p>
//                           <p className="text-xs text-muted-foreground">{user.username}</p>
//                         </div>
//                       </div>
//                       {isAlreadySelected ? (
//                         <Check className="h-4 w-4 text-emerald-600" />
//                       ) : (
//                         <Button
//                           onClick={(e) => {
//                             e.stopPropagation()
//                             handleAddUser(user)
//                           }}
//                           size="sm"
//                           variant="ghost"
//                           className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full"
//                         >
//                           <Plus className="h-4 w-4" />
//                         </Button>
//                       )}
//                     </div>
//                   )
//                 })
//               )}
//             </div>
//           </div>

//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Delete Confirmation Dialog */}
//       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle className="flex items-center gap-2">
//               <Trash2 className="h-5 w-5 text-red-600" />
//               {t('profile.notification_recipients.delete_confirmation.title', 'Remove Notification Recipient')}
//             </AlertDialogTitle>
//             <AlertDialogDescription>
//               {t('profile.notification_recipients.delete_confirmation.description', 'Are you sure you want to remove {name} from notification recipients?').replace('{name}', userToDelete?.name || '')}
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
//               {t('profile.notification_recipients.delete_confirmation.cancel', 'Cancel')}
//             </AlertDialogCancel>
//             <AlertDialogAction
//               onClick={confirmDeleteUser}
//               className="bg-red-600 hover:bg-red-700 text-white"
//             >
//               <Trash2 className="h-4 w-4 mr-2" />
//               {t('profile.notification_recipients.delete_confirmation.confirm', 'Yes, Remove')}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Logout Confirmation Dialog */}
//       <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>{t('profile.logout_dialog.title', 'Are You Sure?')}</AlertDialogTitle>
//             <AlertDialogDescription>
//               {t('profile.logout_dialog.description', 'If you want to sign out, make sure all changes have been saved.')}
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter className="flex flex-row justify-between gap-3">
//             <AlertDialogCancel onClick={() => handleLogoutConfirm(false)} className="flex-1">
//               {t('common.cancel', 'Cancel')}
//             </AlertDialogCancel>
//             <AlertDialogAction
//               onClick={() => handleLogoutConfirm(true)}
//               className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 flex items-center justify-center gap-2"
//             >
//               <LogOut className="h-4 w-4" />
//               {t('profile.logout', 'Logout')}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Fullscreen Avatar Modal */}
//       {showFullscreenAvatar && (
//         <div
//           className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300"
//           onClick={() => setShowFullscreenAvatar(false)}
//         >
//           <div className="relative w-full h-full flex items-center justify-center p-4">
//             {/* Close Button */}
//             <button
//               onClick={() => setShowFullscreenAvatar(false)}
//               className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
//               title="Close (Esc)"
//             >
//               <svg
//                 className="w-6 h-6"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M6 18L18 6M6 6l12 12"
//                 />
//               </svg>
//             </button>

//             {/* Avatar Image */}
//             <div
//               className="relative max-w-full max-h-full animate-in zoom-in duration-300"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <Image
//                 src={getAvatarSource() || ''}
//                 alt={profileData.fullName}
//                 width={800}
//                 height={600}
//                 className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
//                 style={{ maxHeight: '90vh', maxWidth: '90vw' }}
//                 priority
//                 unoptimized
//                 onError={() => {
//                   console.error('Fullscreen avatar failed to load:', getAvatarSource())
//                 }}
//               />
//             </div>

//             {/* User Info Overlay */}
//             <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 text-white animate-in slide-in-from-bottom duration-300">
//               <h3 className="font-semibold text-lg">
//                 {profileData.fullName || "User"}
//               </h3>
//               {profileData.username && (
//                 <p className="text-sm text-gray-300">
//                   {profileData.username}
//                 </p>
//               )}
//             </div>

//             {/* Instructions */}
//             <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm animate-in slide-in-from-top duration-300">
//               <p className="flex items-center gap-2">
//                 <span>Press</span>
//                 <kbd className="px-2 py-1 bg-white/20 rounded text-xs">ESC</kbd>
//                 <span>or click outside to close</span>
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Crop image */}
//       <Dialog
//         open={openCropImage}
//         onOpenChange={(open) => {
//           if (!open && openCropImage && !isCancelling) {
//             // Only cancel if dialog is being closed (not opened) and not already cancelling
//             handleCancelCrop()
//           }
//         }}
//       >
//         <DialogContent showCloseButton={false} className="
//           flex flex-col justify-between p-4 fixed bottom-0 right-0 border-transparent h-screen min-w-screen rounded-none
//           sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:h-auto sm:min-w-[60vw] sm:rounded-lg sm:p-8 sm:border sm:border-white sm:dark:border-gray-600
//           lg:min-w-[30vw]
//           dark:bg-black
//           "
//         >
//           <VisuallyHidden>
//             <DialogTitle>Crop Image</DialogTitle>
//           </VisuallyHidden>
//           <div className="flex flex-col justify-between h-full">
//             <div className="h-[75vh] flex flex-col justify-center">
//               {selectedAvatar && (
//                 <ImageCrop
//                   className="max-w-full max-h-[70vh]"
//                   aspect={1}
//                   file={selectedAvatar}
//                   onChange={console.log}
//                   onComplete={console.log}
//                   onCrop={handleImageCrop}
//                 >
//                   <ImageCropContent className="max-w-md" />
//                   <div className="hidden">
//                     {/* Hidden ImageCropApply to trigger crop functionality */}
//                     <ImageCropApply ref={cropApplyRef} />
//                   </div>
//                 </ImageCrop>
//               )}
//             </div>
//             <div className="flex justify-between items-center pb-4 sm:pb-0">
//               <button
//                 onClick={handleCancelCrop}
//                 className="text-sm cursor-pointer md:text-base font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
//               >
//                 {t('profile.cancel')}
//               </button>
//               <button
//                 onClick={handleApplyCrop}
//                 className="text-sm cursor-pointer md:text-base font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
//               >
//                 {t('profile.done')}
//               </button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }

// export default function ProfilePage() {
//   const { t } = useI18n()

//   return (
//     <DashboardLayout>
//       <I18nProvider namespaces={["common", "profile", "verse_word_error"]}>
//         <Suspense fallback={
//           <div className="flex items-center justify-center min-h-[400px]">
//             <div className="text-center">
//               <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//               <p className="text-slate-600 dark:text-slate-400">{t('common.loading', 'Loading...')}</p>
//             </div>
//           </div>
//         }>
//           <ProfilePageContent />
//         </Suspense>
//       </I18nProvider>
//     </DashboardLayout>
//   )
// }