"use client"

import { Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ShoppingCart } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { useUserProfile } from "@/hooks/use-user-profile"
import { UserOrders } from "@/components/admin/user-orders"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { API_BASE } from "@/lib/api"

function getAvatarSrc(user: any): string | null {
    if (!user) return null
    if (user.imageBase64?.trim()) {
        const b64 = user.imageBase64.trim()
        if (b64.startsWith("data:image")) return b64
        return `data:image/jpeg;base64,${b64}`
    }
    if (user.avatar_url?.trim()) return user.avatar_url
    if (user.avatar?.trim()) return user.avatar
    if (user.image?.trim()) {
        const img = user.image.trim()
        if (img.startsWith("http")) return img
        return `${API_BASE}${img.startsWith("/") ? img : `/${img}`}`
    }
    return null
}

function OrdersFullContent() {
    const params = useParams()
    const router = useRouter()
    const { t, locale } = useI18n()
    const userId = (params as any)?.id as string
    const lang = (params as any)?.lang as string || "en"

    const { profile, loading } = useUserProfile(userId)
    const user = profile as any

    return (
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-6 py-4 sm:py-6">
            {/* Back + Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <button
                    onClick={() => router.back()}
                    className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-emerald-600 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all shadow-sm shrink-0"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className="min-w-0">
                    {loading ? (
                        <Skeleton className="h-6 w-48" />
                    ) : (
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {t("user_detail.orders.full_page_title", "Semua Pesanan")}
                            {user?.name && (
                                <span className="text-gray-400 font-normal text-base ml-2">— {user.name}</span>
                            )}
                        </h1>
                    )}
                </div>
            </div>

            {/* User mini-header */}
            {!loading && user && (
                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <Avatar className="w-10 h-10 shrink-0 rounded-full border border-gray-100 dark:border-gray-800">
                        <AvatarImage src={getAvatarSrc(user) || undefined} className="object-cover" />
                        <AvatarFallback className="bg-emerald-50 text-emerald-600 font-bold">
                            {user.name?.charAt(0) || user.username?.charAt(1) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || user.username}</p>
                        <p className="text-xs text-gray-500 truncate">@{user.username?.replace("@", "")} · #{userId}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {t("user_detail.orders.full_page_title", "Semua Pesanan")}
                        </div>
                    </div>
                </div>
            )}

            {/* Full Orders Table (no preview limit) */}
            <div className="bg-transparent sm:bg-white sm:dark:bg-gray-900 sm:rounded-2xl sm:border border-gray-200 dark:border-gray-800 sm:shadow-sm sm:p-6">
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <UserOrders userId={userId} preview={false} />
                )}
            </div>
        </div>
    )
}

export default function UserOrdersFullPage() {
    return (
        <Suspense>
            <OrdersFullContent />
        </Suspense>
    )
}
