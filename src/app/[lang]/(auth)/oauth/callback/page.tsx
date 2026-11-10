"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { handleGoogleCallback } from "@/services/api/oauth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";

function OAuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(true);

    useEffect(() => {
        async function processCallback() {
            const code = searchParams?.get("code");
            const state = searchParams?.get("state");
            const errorParam = searchParams?.get("error");

            // Handle error from Google
            if (errorParam) {
                setError(`Google OAuth error: ${errorParam}`);
                setProcessing(false);
                return;
            }

            // Validate required params
            if (!code || !state) {
                setError("Missing authorization code or state");
                setProcessing(false);
                return;
            }

            try {
                // Exchange code for tokens via MyQurani API
                const result = await handleGoogleCallback(code, state);

                if (!result.success) {
                    setError(result.error || "Failed to complete OAuth");
                    setProcessing(false);
                    return;
                }

                // Store tokens in cookies via API route
                const storeResponse = await fetch("/api/auth/store-tokens", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                        user: result.user,
                    }),
                });

                if (!storeResponse.ok) {
                    setError("Failed to store authentication");
                    setProcessing(false);
                    return;
                }

                // Redirect to dashboard
                const redirectPath = localStorage.getItem("redirectPath") || "/dashboard";
                localStorage.removeItem("redirectPath");
                router.replace(redirectPath);
            } catch (err) {
                console.error("[OAuthCallback] Error:", err);
                setError("An unexpected error occurred");
                setProcessing(false);
            }
        }

        processCallback();
    }, [searchParams, router]);

    if (processing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="text-center space-y-4 animate-pulse">
                    <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                    <Skeleton className="h-4 w-40 mx-auto" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg max-w-md text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Sign In Failed
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => router.push("/login")}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

export default function OAuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="text-center space-y-4 animate-pulse">
                    <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                    <Skeleton className="h-4 w-40 mx-auto" />
                </div>
            </div>
        }>
            <OAuthCallbackContent />
        </Suspense>
    );
}
