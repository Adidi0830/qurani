"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Lock, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { I18nProvider, useI18n } from "@/components/providers/i18n-provider"


export default function ResetPasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isClient, setIsClient] = useState(false)
    const router = useRouter()
    const { t } = useI18n()

    useEffect(() => {
        setIsClient(true)
    }, [])

    const handleBack = () => {
        // Jika tidak ada history, gunakan router untuk kembali ke halaman sebelumnya
        if (window.history.length > 1) {
            router.back()
        } else {
            // Fallback ke halaman login jika tidak ada history
            router.push('/login')
        }
    }

    useEffect(() => {
        // Listen for PASSWORD_RECOVERY event (mengikuti dokumentasi Supabase)
        const supabase = createClient()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
                if (event === "PASSWORD_RECOVERY") {
                    // User is ready to reset password
                    console.log("Password recovery mode activated")
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error(isClient ? t("reset_password.passwords_not_match", "Passwords do not match") : "Passwords do not match")
            return
        }

        if (password.length < 6) {
            toast.error(isClient ? t("reset_password.password_min_length", "Password must be at least 6 characters") : "Password must be at least 6 characters")
            return
        }

        setIsLoading(true)

        try {
            const supabase = createClient()

            // Step 2: Update user password (mengikuti dokumentasi Supabase)
            const { data, error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) {
                toast.error(error.message)
                return
            }

            if (data) {
                toast.success(isClient ? t("reset_password.password_updated_success", "Password updated successfully!") : "Password updated successfully!")
                router.push("/login")
            }
        } catch {
            toast.error(isClient ? t("reset_password.error_occurred", "An error occurred. Please try again.") : "An error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col p-6 md:p-10 bg-gray-50 dark:bg-slate-950">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center font-medium">
                        <Image src="/icons/qurani-192.png" alt="Qurani Logo" width={192} height={192} className="size-6" />
                        <span className="font-semibold text-emerald-700 text-2xl">URANI</span>
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <I18nProvider namespaces={["common"]}>
                            <div className="text-center mb-8">
                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6 text-primary" />
                                </div>
                                <h1 className="text-xl font-bold">{isClient ? t("reset_password.title", "Set new password") : "Set new password"}</h1>
                                <p className="text-muted-foreground text-sm text-balance">
                                    {isClient ? t("reset_password.subtitle", "Enter your new password below to complete the reset process") : "Enter your new password below to complete the reset process"}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">{isClient ? t("reset_password.new_password", "New Password") : "New Password"}</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={isClient ? t("reset_password.new_password_placeholder", "Enter new password") : "Enter new password"}
                                            required
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">{isClient ? t("reset_password.confirm_password", "Confirm Password") : "Confirm Password"}</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder={isClient ? t("reset_password.confirm_password_placeholder", "Confirm new password") : "Confirm new password"}
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 rounded-md sm:rounded-lg md:rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 h-10 px-4"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                    ) : (
                                        <Lock className="w-4 h-4" />
                                    )}
                                    {isLoading ? (isClient ? t("reset_password.updating", "Updating...") : "Updating...") : (isClient ? t("reset_password.update_password", "Update Password") : "Update Password")}
                                </Button>
                            </form>

                            <div className="text-center mt-6">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleBack}
                                    className="text-sm hover:bg-slate-900! transform hover:scale-105 duration-300"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {isClient ? t("reset_password.back_to_login", "Back to Login") : "Back to Login"}
                                </Button>
                            </div>
                        </I18nProvider>
                    </div>
                </div>
            </div>
            <div className="relative hidden lg:block">
                <Image
                    src="/img/bg-tarteel2.png"
                    alt="Background pattern"
                    fill
                    className="object-cover dark:bg-slate-950 bg-black"
                    priority
                />
            </div>
        </div>
    )
}