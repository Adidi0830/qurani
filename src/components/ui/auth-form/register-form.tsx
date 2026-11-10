"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useForm } from "@/hooks/handleChange"
import { useRouter, useSearchParams } from "next/navigation"
import { useLoading } from "@/hooks/useLoading"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { toast } from "sonner"
import { UserPlus, CheckCircle, XCircle, Loader2, Check } from "lucide-react"
import { isValidEmail, registerWithToast, validatePassword, validateUsername, checkUsernameAvailability } from "@/utils/Auth/auth-client"
import { createClient } from "@/utils/supabase/client"
import { useDebounce } from "@/hooks/use-debounce"
import { useI18n } from "@/components/providers/i18n-provider"
import { Popover, PopoverContent, PopoverTrigger } from "../popover"
import { fetchStates } from "@/utils/api/states/fetch"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../command"
import { ProvinceData } from "@/types/provinces"
import { fetchCities } from "@/utils/api/city/fetch"
import { CityData } from "@/types/cities"
import Image from "next/image"
import { fetchCountries } from "@/utils/api/countries/fetch"
import { CountryData } from "@/types/countries"
import { useLocationData } from "@/hooks/use-location-data"

export function RegisterForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usernameStatus, setUsernameStatus] = useState<{
        isChecking: boolean;
        isAvailable: boolean | null;
        message: string;
    }>({ isChecking: false, isAvailable: null, message: "" });
    const searchParams = useSearchParams();
    const { loading: formLoading, withLoading } = useLoading();
    const router = useRouter();
    const { t } = useI18n();

    const [isClient, setIsClient] = useState(false);
    const redirectPath = searchParams?.get("redirect");

    const {
        countries,
        states: provinces,
        cities,
        openCountry,
        setOpenCountry,
        openState: openProvince,
        setOpenState: setOpenProvince,
        openCity,
        setOpenCity,
        selectedCountry,
        setSelectedCountry,
        selectedState: selectedProvince,
        setSelectedState: setSelectedProvince,
        selectedCity: selectedCityObj,
        setSelectedCity: setSelectedCityObj,
    } = useLocationData(true);

    const { data, handleChange } = useForm({
        email: "",
        password: "",
        full_name: "",
        username: "",
        country_id: "0",
        country_name: "",
        province_id: "0",
        province_name: "",
        city_id: "0",
        city_name: "",
        timezone: "",
    });

    // Sinkronkan data form dengan data dari Hook
    useEffect(() => {
        handleChange({ target: { name: "country_id", value: selectedCountry.id.toString() } });
        handleChange({ target: { name: "country_name", value: selectedCountry.name } });
    }, [selectedCountry]);

    useEffect(() => {
        handleChange({ target: { name: "province_id", value: selectedProvince.id.toString() } });
        handleChange({ target: { name: "province_name", value: selectedProvince.name } });
    }, [selectedProvince]);

    useEffect(() => {
        handleChange({ target: { name: "city_id", value: selectedCityObj.id.toString() } });
        handleChange({ target: { name: "city_name", value: selectedCityObj.name } });
        handleChange({ target: { name: "timezone", value: selectedCityObj.timezone } });
    }, [selectedCityObj]);

    // --- RESTORED LOGIC ---
    const debouncedUsername = useDebounce(data.username, 500);

    useEffect(() => {
        const urlError = searchParams?.get("error");
        if (urlError) setError(urlError);
    }, [searchParams]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const checkUsername = async () => {
            if (!debouncedUsername) {
                setUsernameStatus({ isChecking: false, isAvailable: null, message: "" });
                return;
            }
            if (debouncedUsername.length < 3) {
                setUsernameStatus({ isChecking: false, isAvailable: false, message: t("register.username_min_length") });
                return;
            }
            setUsernameStatus(prev => ({ ...prev, isChecking: true }));
            try {
                const result = await checkUsernameAvailability(debouncedUsername);
                setUsernameStatus({ isChecking: false, isAvailable: result.isAvailable, message: result.message || "" });
            } catch {
                setUsernameStatus({ isChecking: false, isAvailable: false, message: t("register.username_checking_error") });
            }
        };
        checkUsername();
    }, [debouncedUsername, t]);
    // -----------------------


    const handleEmailRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Complete input validation
        if (!data.email || !data.password || !data.full_name || !data.username) {
            toast.error(t("register.fill_all_fields"));
            return;
        }

        if (!isValidEmail(data.email)) {
            toast.error(t("register.invalid_email_format"));
            return;
        }

        const passwordValidation = validatePassword(data.password);
        if (!passwordValidation.isValid) {
            toast.error(passwordValidation.message || t("register.invalid_password"));
            return;
        }

        const usernameValidation = validateUsername(data.username);
        if (!usernameValidation.isValid) {
            toast.error(usernameValidation.message || t("register.invalid_username"));
            return;
        }

        // Cek apakah username tersedia
        if (usernameStatus.isAvailable !== true) {
            if (usernameStatus.isChecking) {
                toast.error(t("register.username_checking"));
                return;
            }
            toast.error(usernameStatus.message || t("register.username_not_available"));
            return;
        }

        if (data.full_name.trim().length < 2) {
            toast.error(t("register.full_name_min_length"));
            return;
        }

        if (data.city_id === "0") {
            toast.error(t("register.select_city_error"));
            return;
        }

        if (data.province_id === "0") {
            toast.error(t("register.select_province_error"));
            return;
        }

        try {
            await withLoading(async () => {
                const { authApi } = await import('@/lib/api');
                
                // 1. Daftar ke MyQurani API TERLEBIH DAHULU untuk mendapat userId
                console.log("[Register] Registering to MyQurani API...");
                const registerResult = await authApi.register({
                    email: data.email.trim(),
                    password: data.password,
                    username: data.username.trim().toLowerCase(),
                    name: data.full_name.trim(),
                    countryId: parseInt(data.country_id) || 0,
                    stateId: parseInt(data.province_id) || 0,
                    cityId: parseInt(data.city_id) || 0,
                    timezone: data.timezone || "Asia/Jakarta",
                });

                // 2. Setelah dapat userId dari API, simpan profil ke Supabase
                let realUserId = String(registerResult?.userId || "");
                
                // Jika userId tidak ada di respons register, lakukan login untuk mendapatkannya
                if (!realUserId) {
                    console.log("[Register] No userId in register response, attempting login to get it...");
                    try {
                        const loginResult = await authApi.login(data.email.trim(), data.password);
                        realUserId = String(loginResult?.userId || "");
                        console.log("[Register] Got userId from login:", realUserId);
                    } catch (loginErr) {
                        console.warn("[Register] Auto-login to get userId failed:", loginErr);
                    }
                }

                if (realUserId) {
                    const { updateUserProfile } = await import('@/utils/api/user/update-profile');
                    console.log("[Register] Saving profile to Supabase with userId:", realUserId);
                    
                    const supabaseResult = await updateUserProfile(
                        realUserId,
                        parseInt(data.country_id) || 0,
                        parseInt(data.province_id) || 0,
                        parseInt(data.city_id) || 0,
                        data.country_name,
                        data.province_name,
                        data.city_name,
                        data.timezone,
                        data.full_name.trim(),
                        data.username.trim().toLowerCase(), // nickname = username
                        data.username.trim().toLowerCase(),
                        null, // gender
                        "", // dob
                        "", // job
                        "", // phone
                        "", // bio
                        undefined, // avatar
                        data.email.trim()
                    );

                    if (!supabaseResult.success) {
                        // Tampilkan error ke user agar kita bisa identifikasi masalahnya
                        console.error("[Register] Supabase save FAILED:", supabaseResult.message);
                        toast.warning(`Profile note: ${supabaseResult.message}`);
                    } else {
                        console.log("[Register] ✅ Profile saved to Supabase successfully!");
                    }
                } else {
                    console.warn("[Register] No userId obtained — skipping Supabase save");
                    toast.warning("Account created but profile not linked to database. Please update your profile after login.");
                }

                toast.success(t("register.success", "Registration successful!"));
                if (registerResult?.accessToken) {
                    router.replace('/dashboard');
                } else {
                    router.replace('/login');
                }
            });
        } catch (err: any) {
            toast.error(err.message || t("register.failed", "Registration failed"));
        }
    };

    const handleGoogleRegister = async () => {
        try {
            setIsLoading(true);
            setError(null);
            toast.loading(t("register.redirecting_to_google"));

            const supabase = createClient();

            const redirectPathUrl = redirectPath || "/dashboard";
            localStorage.setItem("redirectPath", redirectPathUrl);

            // Gunakan window.location.origin untuk dynamic URL
            const redirectUrl = `${window.location.origin}/auth/callback`;

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: redirectUrl,
                },
            });

            if (error) {
                setError(error.message);
                toast.error(error.message);
            }
        } catch {
            const errorMessage = t("register.google_signup_error");
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <LoadingOverlay
                isOpen={formLoading}
                message={t("register.creating_your_account")}
                variant="default"
            />
            <div className="flex justify-center gap-2 mb-5">
                <Link href="/" className="flex items-center font-medium">
                    <Image src="/icons/Qurani - Logo Green.png" alt="Qurani" width={120} height={120} className="dark:hidden" />
                    <Image src="/icons/Qurani - Logo White.png" alt="Qurani" width={120} height={120} className="dark:block hidden" />
                </Link>
            </div>
            <form className={cn("flex flex-col gap-4 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl p-6 w-full sm:max-w-md mx-auto", className)} onSubmit={handleEmailRegister} {...props}>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-xl font-bold">
                        {isClient ? t("register.title", "Create your account") : "Create your account"}
                    </h1>
                    <Button
                        onClick={handleGoogleRegister}
                        disabled={isLoading}
                        variant="outline"
                        type="button"
                        className="w-full cursor-pointer mt-2 rounded-md hover:rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-emerald-600 hover:text-emerald-800 dark:text-emerald-500 dark:hover:text-emerald-400"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                                <path
                                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                    fill="currentColor"
                                />
                            </svg>
                        )}
                        <span className="ml-2">
                            {isLoading ? (isClient ? t("common.loading", "Loading...") : "Loading...") : (isClient ? t("register.signup_with_google", "Sign up with Google") : "Sign up with Google")}
                        </span>
                    </Button>
                    <div className="mt-2 after:border-border relative text-center text-xs after:absolute after:inset-x-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:-mx-[1%]">
                        <span className="bg-gray-50 dark:bg-slate-950 text-muted-foreground dark:text-white relative z-10 px-4">
                            {isClient ? t("register.or", "Or") : "Or"}
                        </span>
                    </div>
                    {error && (
                        <div className="w-full mt-2 p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded">
                            {error}
                        </div>
                    )}
                </div>
                <div className="grid gap-3">
                    <div className="grid gap-1">
                        <Label htmlFor="email">{isClient ? t("register.email", "Email") : "Email"}</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            onChange={handleChange}
                            placeholder={isClient ? t("register.email_placeholder", "m@example.com") : "m@example.com"}
                            required
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="full_name">{isClient ? t("register.full_name", "Full Name") : "Full Name"}</Label>
                        <Input
                            id="full_name"
                            type="text"
                            name="full_name"
                            onChange={handleChange}
                            placeholder={isClient ? t("register.full_name_placeholder", "John Doe") : "John Doe"}
                            maxLength={25}
                            required
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="username">{isClient ? t("register.username", "Username") : "Username"}</Label>
                        <div className="relative">
                            <Input
                                id="username"
                                type="text"
                                name="username"
                                onChange={handleChange}
                                placeholder={isClient ? t("register.username_placeholder", "john_doe") : "john_doe"}
                                required
                                maxLength={15}
                                className={cn(
                                    "pr-8",
                                    usernameStatus.isAvailable === true && "border-green-500 focus-visible:ring-green-500",
                                    usernameStatus.isAvailable === false && usernameStatus.message && "border-red-500 focus-visible:ring-red-500"
                                )}
                            />
                            {data.username && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                    {usernameStatus.isChecking ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                    ) : usernameStatus.isAvailable === true ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : usernameStatus.isAvailable === false && usernameStatus.message ? (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                    ) : null}
                                </div>
                            )}
                        </div>
                        {data.username && usernameStatus.message && (
                            <div className={cn(
                                "text-xs px-1 py-0.5 rounded transition-colors duration-200",
                                usernameStatus.isAvailable === true && "text-green-600",
                                usernameStatus.isAvailable === false && "text-red-600",
                                usernameStatus.isChecking && "text-gray-500"
                            )}>
                                {usernameStatus.message}
                            </div>
                        )}
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="country_id">{isClient ? t("register.country", "Country") : "Country"}</Label>
                        <Popover open={openCountry} onOpenChange={setOpenCountry}>
                            <PopoverTrigger asChild className="w-full text-left">
                                <Button variant="outline">
                                    {data.country_name ? data.country_name : (isClient ? t("register.select_country", "Select Country") : "Select Country")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="p-0">
                                <Command>
                                    <CommandInput placeholder={isClient ? t("register.search_country", "Search Country") : "Search Country"} />
                                    <CommandList>
                                        <CommandGroup>
                                            {countries.map((country: CountryData) => (
                                                <CommandItem 
                                                    className="w-full flex justify-between cursor-pointer" 
                                                    onSelect={() => {
                                                        setSelectedCountry({ id: country.id, name: country.name });
                                                        setOpenCountry(false);
                                                    }} 
                                                    value={country.name} 
                                                    key={country.id}
                                                >
                                                    {country.name}
                                                    <Check className={`text-emerald-500 w-4 h-4 ${data.country_id === country.id.toString() ? "opacity-100" : "opacity-0"}`} />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="province_id">{isClient ? t("register.province", "Province") : "Province"}</Label>
                        <Popover open={openProvince} onOpenChange={setOpenProvince}>
                            <PopoverTrigger asChild className="w-full text-left" disabled={Number(data.country_id) === 0}>
                                <Button variant="outline">
                                    {data.province_name ? data.province_name : (isClient ? t("register.select_province", "Select Province") : "Select Province")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="p-0">
                                <Command>
                                    <CommandInput placeholder={isClient ? t("register.search_province", "Search Province") : "Search Province"} />
                                    <CommandList>
                                        <CommandGroup>
                                            {provinces.map((province: ProvinceData) => (
                                                <CommandItem 
                                                    className="w-full flex justify-between cursor-pointer" 
                                                    onSelect={() => {
                                                        setSelectedProvince({ id: province.id, name: province.name });
                                                        setOpenProvince(false);
                                                    }} 
                                                    value={province.name} 
                                                    key={province.id}
                                                >
                                                    {province.name}
                                                    <Check className={`text-emerald-500 w-4 h-4 ${data.province_id === province.id.toString() ? "opacity-100" : "opacity-0"}`} />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="province_id">{isClient ? t("register.city", "City") : "City"}</Label>
                        <Popover open={openCity} onOpenChange={setOpenCity}>
                            <PopoverTrigger asChild className="w-full text-left" disabled={Number(data.province_id) === 0}>
                                <Button variant="outline">
                                    {data.city_name ? data.city_name : (isClient ? t("register.select_city", "Select City") : "Select City")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="p-0">
                                <Command>
                                    <CommandInput placeholder={isClient ? t("register.search_city", "Search City") : "Search City"} />
                                    <CommandList>
                                        <CommandGroup>
                                            {cities.map((city: CityData) => (
                                                <CommandItem 
                                                    className="w-full flex justify-between cursor-pointer" 
                                                    onSelect={() => {
                                                        setSelectedCityObj({ id: city.id, name: city.name, timezone: city.timezone });
                                                        setOpenCity(false);
                                                    }} 
                                                    value={city.name} 
                                                    key={city.id}
                                                >
                                                    {city.name}
                                                    <Check className={`text-emerald-500 w-4 h-4 ${data.city_id === city.id.toString() ? "opacity-100" : "opacity-0"}`} />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="password">{isClient ? t("register.password", "Password") : "Password"}</Label>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            onChange={handleChange}
                            placeholder={isClient ? t("register.password_placeholder", "Password") : "Password"}
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 rounded-md sm:rounded-lg md:rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 h-10 px-4"
                        disabled={
                            formLoading ||
                                isLoading ||
                                usernameStatus.isChecking ||
                                (data.username && usernameStatus.isAvailable !== true) ? true : false
                        }
                    >
                        {formLoading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {isClient ? t("register.creating_account", "Creating Account...") : "Creating Account..."}
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4" />
                                {isClient ? t("register.create_account", "Create Account") : "Create Account"}
                            </>
                        )}
                    </Button>
                </div>
                <div className="text-center text-xs">
                    {isClient ? t("register.already_have_account", "Already have an account?") : "Already have an account?"}{" "}
                    <Link href="/login" className="underline underline-offset-4 hover:text-teal-700 duration-200">
                        {isClient ? t("register.sign_in", "Sign in") : "Sign in"}
                    </Link>
                </div>
            </form>
        </>
    )
}
