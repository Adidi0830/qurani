"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Mail, ArrowLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/providers/i18n-provider"
import Image from "next/image"
import ReCAPTCHA from "react-google-recaptcha"

interface ForgotPasswordFormProps {
    onBack?: () => void
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [isClient, setIsClient] = useState(false)
    const router = useRouter()
    const { t, locale } = useI18n()
    const recaptchaRef = useRef<ReCAPTCHA>(null);

    useEffect(() => {
        setIsClient(true)
    }, [])

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else {
            // Jika tidak ada onBack prop, gunakan router untuk kembali ke halaman sebelumnya
            if (window.history.length > 1) {
                router.back()
            } else {
                // Fallback ke halaman login jika tidak ada history
                router.push('/login')
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email) {
            toast.error(isClient ? t("forgot_password.enter_email_address", "Please enter your email address") : "Please enter your email address")
            return
        }

        setIsLoading(true)

        try {
            const supabase = createClient()

            const token = recaptchaRef.current?.getValue();
            if (!token) {
                toast.error(t("auth.captcha_required"));
                return;
            }

            // Step 1: Send password reset email (mengikuti dokumentasi Supabase)
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })


            if (error) {
                toast.error(error.message)
                return
            }

            if (data) {
                setIsSubmitted(true)
                toast.success(isClient ? t("forgot_password.password_reset_sent", "Password reset link sent to your email!") : "Password reset link sent to your email!")
            }
        } catch {
            toast.error(isClient ? t("forgot_password.error_occurred", "An error occurred. Please try again.") : "An error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    if (isSubmitted) {
        return (
            <>
                <div className="flex justify-center gap-2 mb-5">
                    <Link href="/" className="flex items-center font-medium">
                        <Image src="/icons/Qurani - Logo Green.png" alt="Qurani" width={120} height={120} className="dark:hidden" />
                        <Image src="/icons/Qurani - Logo White.png" alt="Qurani" width={120} height={120} className="dark:block hidden" />
                    </Link>
                </div>
                <div className="flex flex-col items-center gap-6 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl p-6 w-full sm:max-w-md mx-auto">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Mail className="w-6 h-6 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-center">{isClient ? t("forgot_password.check_email", "Check your email") : "Check your email"}</h2>
                    <p className="text-sm text-muted-foreground text-center">
                        {isClient ? t("forgot_password.email_sent_message", "We've sent a password reset link to") : "We've sent a password reset link to"} <strong>{email}</strong>
                    </p>
                    <div className="flex flex-col gap-2">
                        <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                            {isClient ? t("forgot_password.send_another_email", "Send another email") : "Send another email"}
                        </Button>
                        <Link href="/login" className="text-sm text-center text-primary hover:underline">
                            {isClient ? t("forgot_password.back_to_login", "Back to Login") : "Back to Login"}
                        </Link>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="flex justify-center gap-2 mb-5">
                <Link href="/" className="flex items-center font-medium">
                    <Image src="/icons/Qurani - Logo Green.png" alt="Qurani" width={120} height={120} className="dark:hidden" />
                    <Image src="/icons/Qurani - Logo White.png" alt="Qurani" width={120} height={120} className="dark:block hidden" />
                </Link>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl p-6 w-full sm:max-w-md mx-auto">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-xl font-bold">{isClient ? t("forgot_password.title", "Reset your password") : "Reset your password"}</h1>
                    <p className="text-sm text-muted-foreground text-balance">
                        {isClient ? t("forgot_password.subtitle", "Enter your email address and we'll send you a link to reset your password") : "Enter your email address and we'll send you a link to reset your password"}
                    </p>
                </div>

                <div className="grid gap-3">
                    <div className="grid gap-1">
                        <Label htmlFor="email">{isClient ? t("forgot_password.email", "Email") : "Email"}</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={isClient ? t("forgot_password.email_placeholder", "m@example.com") : "m@example.com"}
                            required
                        />
                    </div>
                    <div className="recaptcha-container">
                        <div className="recaptcha-wrapper">
                            <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                            hl={locale === "id" ? "id" : "en"}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 rounded-md sm:rounded-lg md:rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 h-10 px-4"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : (
                            <Mail className="w-4 h-4" />
                        )}
                        {isLoading ? (isClient ? t("forgot_password.sending", "Sending...") : "Sending...") : (isClient ? t("forgot_password.send_reset_link", "Send reset link") : "Send reset link")}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="w-full flex items-center justify-center gap-2 border-0 rounded-md sm:rounded-lg md:rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 h-10 px-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {isClient ? t("forgot_password.back_to_login", "Back to Login") : "Back to Login"}
                    </Button>
                </div>
            </form>
        </>
    )
}


