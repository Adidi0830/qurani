"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState, useEffect } from "react"

import { useForm } from "@/hooks/handleChange"
import { useLoading } from "@/hooks/useLoading"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { toast } from "sonner"
import { LogIn } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { loginWithToast } from "@/utils/Auth/auth-client"
import { getGoogleOAuthUrl } from "@/services/api/oauth"
import { useI18n } from "@/components/providers/i18n-provider"
import Image from "next/image"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loading: formLoading, withLoading } = useLoading();
  const router = useRouter();
  const { t } = useI18n();
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get("redirect");
  const { data, handleChange } = useForm({
    username: "",
    password: "",
  });

  useEffect(() => {
    setError(null);
  }, []);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data.username || !data.password) {
      toast.error(t("auth.fill_username_password"));
      return;
    }

    if (data.username.length < 3) {
      toast.error(t("auth.username_min_length"));
      return;
    }

    if (data.password.length < 6) {
      toast.error(t("auth.password_min_length"));
      return;
    }

    try {
      await withLoading(async () => {
        // 1. Try new client-side API login (stores in localStorage like My-Qurani example)
        try {
          const { authApi } = await import('@/lib/api');
          const user = await authApi.login(data.username, data.password);

          if (user) {
            toast.success("Login successful!");
            const destination = redirectPath || "/dashboard";
            router.replace(destination);
            return;
          }
        } catch (apiError: any) {
          console.log("Client API login failed:", apiError.message);
          // Try fallback
        }

        // 2. Fallback to server action (old flow)
        const formData = new FormData();
        formData.append('username', data.username);
        formData.append('password', data.password);

        const res = await loginWithToast(formData);
        if (res?.success) {
          // Server action berhasil tapi hanya set cookie (httpOnly).
          // Kita HARUS juga set localStorage agar AuthProvider tidak
          // mendeteksi "stale cookie" dan memicu force-logout ke localhost.
          try {
            const { authApi } = await import('@/lib/api');
            await authApi.login(data.username, data.password);
          } catch {
            // Jika client-side login juga gagal, 
            // cookie dari server action sudah cukup untuk middleware,
            // tapi kita perlu set localStorage manual dari data yang ada.
            const { setStoredAuth } = await import('@/lib/api');
            setStoredAuth({
              userId: res.user?.id || 0,
              email: res.user?.email || data.username,
              username: data.username,
              name: res.user?.name || data.username,
              accessToken: '', // akan di-refresh oleh AuthProvider
              refreshToken: '',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              roles: [res.user?.role || 'member'],
            });
          }
          const destination = redirectPath || "/dashboard";
          router.replace(destination);
        }
      });
    } catch {
      // Error already handled
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      toast.loading(t("auth.redirecting_to_google"));

      // Store redirect path for after OAuth
      const redirectPathUrl = redirectPath || "/dashboard";
      localStorage.setItem("redirectPath", redirectPathUrl);

      // Build callback URL for OAuth
      const callbackUrl = `${window.location.origin}/oauth/callback`;

      // Get Google OAuth URL from MyQurani API
      const result = await getGoogleOAuthUrl(callbackUrl);

      if (!result.success || !result.url) {
        throw new Error(result.error || "Failed to get OAuth URL");
      }

      // Store state for verification
      if (result.state) {
        localStorage.setItem("oauth_state", result.state);
      }

      // Redirect to Google OAuth
      window.location.href = result.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("auth.google_signin_error");
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay
        isOpen={formLoading}
        message={t("auth.signing_into_account")}
        variant="default"
      />
      <div className="flex justify-center gap-2 mb-5">
        <Link href="/" className="flex items-center font-medium">
          <Image src="/icons/Qurani - Logo Green.png" alt="Qurani" width={120} height={120} className="dark:hidden" />
          <Image src="/icons/Qurani - Logo White.png" alt="Qurani" width={120} height={120} className="dark:block hidden" />
        </Link>
      </div>
      <form className={cn("flex flex-col gap-6 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl p-6 w-full sm:max-w-md mx-auto", className)} onSubmit={handleEmailLogin} {...props}>
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="text-2xl font-bold">{isClient ? t("auth.login_title", "Login to your account") : "Login to your account"}</h1>
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            variant="outline"
            type="button"
            className="w-full cursor-pointer rounded-md hover:rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-emerald-600 hover:text-emerald-800 dark:text-emerald-500 dark:hover:text-emerald-400"
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
              {isLoading ? (isClient ? t("common.loading", "Loading...") : "Loading...") : (isClient ? t("auth.login_with_google", "Login with Google") : "Login with Google")}
            </span>
          </Button>
          {error && (
            <div className="w-full mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}
        </div>
        <div className="mt-2 after:border-border relative text-center text-xs after:absolute after:inset-x-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:-mx-[1%]">
          <span className="bg-gray-50 dark:bg-slate-950 text-muted-foreground dark:text-white relative z-10 px-4">
            {isClient ? t("auth.or", "Or") : "Or"}
          </span>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="username">{isClient ? t("auth.username", "Username") : "Username"}</Label>
            <Input
              id="username"
              type="text"
              name="username"
              onChange={handleChange}
              placeholder={isClient ? t("auth.username_placeholder", "username") : "username"}
              required
            />
          </div>
          <div className="grid gap-3">
            <div className="flex items-center">
              <Label htmlFor="password">{isClient ? t("auth.password", "Password") : "Password"}</Label>
              <Link
                href="/forgot-password"
                className="ml-auto text-sm underline-offset-4 hover:underline hover:text-teal-700 duration-200"
              >
                {isClient ? t("auth.forgot_password", "Forgot your password?") : "Forgot your password?"}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              name="password"
              onChange={handleChange}
              placeholder={isClient ? t("auth.password", "Password") : "Password"}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 rounded-md sm:rounded-lg md:rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 h-10 px-4"
            disabled={formLoading || isLoading}
          >
            {formLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isClient ? t("auth.signing_in", "Signing In...") : "Signing In..."}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {isClient ? t("auth.login_button", "Login") : "Login"}
              </>
            )}
          </Button>
        </div>
        <div className="text-center text-sm">
          {isClient ? t("auth.dont_have_account", "Don't have an account?") : "Don't have an account?"}{" "}
          <Link href="/register" className="underline underline-offset-4 hover:text-teal-700 duration-200">
            {isClient ? t("auth.sign_up", "Sign up") : "Sign up"}
          </Link>
        </div>
      </form>
    </>
  )
}
