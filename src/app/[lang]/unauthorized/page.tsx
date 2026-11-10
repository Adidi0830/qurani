"use client"

import { Button } from "@/components/ui/button"
import { ShieldX, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function UnauthorizedPage() {
    const { signOut, profile, loading } = useAuth()
    const router = useRouter()

    // If user becomes admin (role changed), redirect to dashboard
    useEffect(() => {
        if (!loading && profile?.role === "admin") {
            router.push("/dashboard")
        }
    }, [profile, loading, router])

    const handleLogout = async () => {
        await signOut()
        router.push("/login")
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
                    <ShieldX className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Akses Ditolak
                </h1>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Maaf, hanya pengguna dengan role <span className="font-semibold text-red-600 dark:text-red-400">Admin</span> yang dapat mengakses aplikasi ini.
                </p>

                {/* Current User Info */}
                {profile && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-6">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Anda login sebagai:</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{profile.name || profile.email}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Role: <span className="font-medium text-orange-600 dark:text-orange-400">{profile.role || "member"}</span>
                        </p>
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Butuh akses?</strong> Hubungi administrator untuk mengubah role Anda menjadi Admin di database Supabase.
                    </p>
                </div>

                {/* Logout Button */}
                <Button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout dan Kembali ke Login
                </Button>
            </div>
        </div>
    )
}
