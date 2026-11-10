"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useDebounce } from "@/hooks/use-debounce"
import { updateUsername } from "@/utils/api/user/update"
import { checkUsernameAvailability } from "@/utils/api/user/check"
import { validateUsername } from "@/utils/validation/username"
import { fetchStates } from "@/utils/api/states/fetch"
import { fetchCities } from "@/utils/api/city/fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Loader2, Check, X } from "lucide-react"
import { ProvinceData } from "@/types/provinces"
import { CityData } from "@/types/cities"
import { fetchCountries } from "@/utils/api/countries/fetch"
import { CountryData } from "@/types/countries"
import { useI18n } from "@/components/providers/i18n-provider"

export default function RequiredForm() {
    const { t } = useI18n()
    const [username, setUsername] = useState("")
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

    // Location states
    const [countries, setCountries] = useState<CountryData[]>([])
    const [provinces, setProvinces] = useState<ProvinceData[]>([])
    const [cities, setCities] = useState<CityData[]>([])
    const [openCountry, setOpenCountry] = useState(false)
    const [openProvince, setOpenProvince] = useState(false)
    const [openCity, setOpenCity] = useState(false)
    const [SelectedCountry, setSelectedCountry] = useState<{ id: string, name: string }>({ id: "0", name: "" })
    const [selectedProvince, setSelectedProvince] = useState<{ id: string, name: string }>({ id: "0", name: "" })
    const [selectedCity, setSelectedCity] = useState<{ id: string, name: string, timezone: string }>({ id: "0", name: "", timezone: "" })

    const { userId } = useAuth()
    const router = useRouter()

    const mapUsernameValidationError = (message: string) => {
        if (message === "Username cannot contain spaces. Use underscore (_) instead.") {
            return t("required.validation.no_spaces", message)
        }
        if (message === "Username cannot contain hyphens (-). Use underscore (_) instead.") {
            return t("required.validation.no_hyphens", message)
        }
        if (message === "Username can only contain letters, numbers, and underscore (_)") {
            return t("required.validation.invalid_chars", message)
        }
        if (message === "Username must be at least 3 characters") {
            return t("required.validation.min_length", message)
        }
        if (message === "Username must be at most 20 characters") {
            return t("required.validation.max_length", message)
        }
        return message
    }

    // Debounce username untuk checking
    const debouncedUsername = useDebounce(username, 500)

    // Effect untuk load countries
    useEffect(() => {
        const loadCountries = async () => {
            try {
                const result = await fetchCountries()
                if (result.success) {
                    setCountries(result.data || [])
                }
            } catch (error) {
                console.error("Error loading provinces:", error)
            }
        }
        loadCountries()
    }, [])

    // Effect untuk load provinces
    useEffect(() => {
        const loadProvinces = async () => {
            try {
                if (SelectedCountry.id === "0") {
                    return
                }
                const result = await fetchStates(parseInt(SelectedCountry.id))
                console.log("Fetched provinces:", result)
                if (result.success) {
                    setProvinces(result.data || [])
                }
            } catch (error) {
                console.error("Error loading provinces:", error)
            }
        }
        loadProvinces()
    }, [SelectedCountry.id])

    // Effect untuk load cities ketika province berubah
    useEffect(() => {
        const loadCities = async () => {
            if (selectedProvince.id === "0") {
                setCities([])
                setSelectedCity({ id: "0", name: "", timezone: "" })
                return
            }

            try {
                const result = await fetchCities(Number(selectedProvince.id))
                setCities(result.data || [])
                setSelectedCity({ id: "0", name: "", timezone: "" }) // Reset city selection
            } catch (error) {
                console.error("Error loading cities:", error)
                setCities([])
            }
        }
        loadCities()
    }, [selectedProvince.id])

    // Effect untuk check username availability
    useEffect(() => {
        const checkAvailability = async () => {
            if (!debouncedUsername.trim() || !userId) {
                setIsAvailable(null)
                setSuccess("")
                return
            }

            // Validasi format username terlebih dahulu
            const validationError = validateUsername(debouncedUsername)
            if (validationError) {
                setError(mapUsernameValidationError(validationError))
                setIsAvailable(null)
                setSuccess("")
                return
            }

            setChecking(true)
            setSuccess("")

            try {
                const result = await checkUsernameAvailability(debouncedUsername)

                if (!result.success) {
                    setError(result.message || t("required.errors.check_username_failed", "Failed to check username availability"))
                    setIsAvailable(null)
                    return
                }

                setIsAvailable(!!result.available)
                if (result.available) {
                    setSuccess(t("required.username_available", "Username is available!"))
                    setError("")
                } else {
                    setError(t("required.username_taken", "Username is already taken"))
                    setSuccess("")
                }
            } catch (error) {
                console.error("Error checking username:", error)
                setError(t("required.errors.check_username_failed", "Failed to check username availability"))
                setIsAvailable(null)
                setSuccess("")
            } finally {
                setChecking(false)
            }
        }

        checkAvailability()
    }, [debouncedUsername, userId, mapUsernameValidationError, t])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userId) {
            setError(t("required.errors.user_not_found", "User not found"))
            return
        }

        const validationError = validateUsername(username)
        if (validationError) {
            setError(mapUsernameValidationError(validationError))
            return
        }

        // Validate location selection
        if (selectedProvince.id === "0") {
            setError(t("required.errors.select_province", "Please select a province"))
            return
        }

        if (selectedCity.id === "0") {
            setError(t("required.errors.select_city", "Please select a city"))
            return
        }

        setLoading(true)
        setError("")

        try {
            const result = await updateUsername(userId, username, SelectedCountry, selectedProvince, selectedCity)

            if (!result.success) {
                setError(result.message || t("required.errors.update_failed", "Failed to update username"))
                return
            }

            // TODO: Update user location data as well
            // This might need a separate API call to update location
            console.log("Selected location:", {
                province_id: selectedProvince.id,
                province_name: selectedProvince.name,
                city_id: selectedCity.id,
                city_name: selectedCity.name
            })

            const redirectPath = localStorage.getItem("redirectPath") || "/dashboard";
            localStorage.removeItem("redirectPath");
            router.replace(redirectPath);
        } catch (error) {
            console.error("Error updating username:", error)
            setError(t("required.errors.generic", "Something went wrong, please try again"))
        } finally {
            setLoading(false)
        }
    }

    if (!userId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-black px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>{t("required.title", "Welcome!")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">{t("required.username_label", "Username")}</Label>
                            <div className="relative">
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder={t("required.username_placeholder", "@username (use _ not space or -)")}
                                    value={username}
                                    onChange={(e) => {
                                        let formattedValue = e.target.value

                                        // Auto-add @ prefix if not present
                                        if (!formattedValue.startsWith('@') && formattedValue.length > 0) {
                                            formattedValue = '@' + formattedValue
                                        }

                                        // Remove @ if user tries to delete it completely
                                        if (formattedValue === '@') {
                                            formattedValue = ''
                                        }

                                        setUsername(formattedValue)

                                        // Clear success message immediately
                                        setSuccess("")

                                        // Only clear error if input is empty, otherwise let useEffect handle validation
                                        if (!formattedValue.trim()) {
                                            setError("")
                                        }
                                    }}
                                    disabled={loading}
                                    className={`pr-10 ${error
                                        ? "border-red-500"
                                        : isAvailable === true
                                            ? "border-green-500"
                                            : ""
                                        }`}
                                    autoFocus
                                />
                                {/* Status indicator */}
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    {checking ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    ) : isAvailable === true ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : isAvailable === false ? (
                                        <X className="h-4 w-4 text-red-500" />
                                    ) : null}
                                </div>
                            </div>

                            {/* Status messages */}
                            {checking && debouncedUsername.trim() && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {t("required.checking_availability", "Checking availability...")}
                                </p>
                            )}
                            {success && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    {success}
                                </p>
                            )}
                            {error && (
                                <p className="text-sm text-red-500 flex items-center gap-1">
                                    <X className="h-3 w-3" />
                                    {error}
                                </p>
                            )}

                            <p className="text-xs text-gray-500">
                                {t("required.username_help", "Username can only contain letters, numbers, and underscores (3-20 characters). No spaces or hyphens allowed.")}
                            </p>
                        </div>

                        {/* Country Selection */}
                        <div className="">
                            <Label htmlFor="province">{t("required.countries_label", "Countries")}</Label>
                            <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left">
                                        {SelectedCountry.name || t("required.country_select", "Select Country")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-full bg-white">
                                    <Command>
                                        <CommandInput placeholder={t("required.country_search", "Search Country")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {countries.map((country) => (
                                                    <CommandItem
                                                        key={country.id}
                                                        className="w-full flex justify-between cursor-pointer"
                                                        onSelect={() => {
                                                            if (SelectedCountry.id === country.id.toString()) {
                                                                setSelectedCountry({ id: "0", name: "" })
                                                            } else {
                                                                setSelectedCountry({
                                                                    id: country.id.toString(),
                                                                    name: country.name
                                                                })
                                                                setOpenCountry(false)
                                                            }
                                                        }}
                                                    >
                                                        {country.name}
                                                        <Check className={`w-4 h-4 ${SelectedCountry.name === country.name ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Province Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="province">{t("required.province_label", "Province")}</Label>
                            <Popover open={openProvince} onOpenChange={setOpenProvince}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left"
                                        disabled={SelectedCountry.id === "0"}
                                    >
                                        {selectedProvince.name || t("required.province_select", "Select Province")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-full bg-white">
                                    <Command>
                                        <CommandInput placeholder={t("required.province_search", "Search Province")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {provinces.map((province) => (
                                                    <CommandItem
                                                        key={province.id}
                                                        className="w-full flex justify-between cursor-pointer"
                                                        onSelect={() => {
                                                            if (selectedProvince.id === province.id.toString()) {
                                                                setSelectedProvince({ id: "0", name: "" })
                                                            } else {
                                                                setSelectedProvince({
                                                                    id: province.id.toString(),
                                                                    name: province.name
                                                                })
                                                                setOpenProvince(false)
                                                            }
                                                        }}
                                                    >
                                                        {province.name}
                                                        <Check className={`w-4 h-4 ${selectedProvince.name === province.name ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* City Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="city">{t("required.city_label", "City")}</Label>
                            <Popover open={openCity} onOpenChange={setOpenCity}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left"
                                        disabled={selectedProvince.id === "0"}
                                    >
                                        {selectedCity.name || t("required.city_select", "Select City")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-full bg-white">
                                    <Command>
                                        <CommandInput placeholder={t("required.city_search", "Search City")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {cities.map((city) => (
                                                    <CommandItem
                                                        key={city.id}
                                                        className="w-full flex justify-between cursor-pointer"
                                                        onSelect={() => {
                                                            if (selectedCity.id === city.id.toString()) {
                                                                setSelectedCity({ id: "0", name: "", timezone: "" })
                                                            } else {
                                                                setSelectedCity({
                                                                    id: city.id.toString(),
                                                                    name: city.name,
                                                                    timezone: city.timezone
                                                                })
                                                                setOpenCity(false)
                                                            }
                                                        }}
                                                    >
                                                        {city.name}
                                                        <Check className={`w-4 h-4 ${selectedCity.name === city.name ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600"
                            disabled={
                                loading ||
                                !username.trim() ||
                                checking ||
                                isAvailable !== true ||
                                selectedProvince.id === "0" ||
                                selectedCity.id === "0" ||
                                !!error
                            }
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("required.saving", "Saving...")}
                                </>
                            ) : (
                                t("required.save", "Save")
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
