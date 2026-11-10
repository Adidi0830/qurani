"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SkeletonDetailPage } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Mail, Phone, MapPin, Shield,
    Clock, Activity, Calendar, ArrowLeft, Loader2, User as UserIcon,
    TrendingUp
} from "lucide-react"
import { BookOpen } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"

import { useUserProfile } from "@/hooks/use-user-profile"
import { walletApi, auditApi, API_BASE } from "@/lib/api"
import { getKycAll } from "@/utils/api/kyc/fetch"
import { toast } from "sonner"
import { getSimWalletBalances, getSimTransactions } from "@/lib/sim-wallet-store"
import { getSimSetoransByUser } from "@/data/sim-setoran"
import dummyBillingData from "@/data/billing-dummy.json"
import { UserWalletDetail } from "@/components/Wallet/UserWalletDetail"
import { UserOrders } from "@/components/admin/user-orders"
import { UserSetoran } from "@/components/admin/user-setoran"
import { SIM_TRAINERS } from "@/data/sim-dummy-users"

function formatCurrency(amount: number, locale: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function formatDate(dateString: string, locale: string = "id-ID") {
    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return dateString
        return date.toLocaleDateString(locale, {
            day: '2-digit', month: 'long', year: 'numeric'
        })
    } catch {
        return dateString
    }
}

function formatDateTime(dateString: string, locale: string = "id-ID") {
    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return dateString
        return date.toLocaleDateString(locale, {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    } catch {
        return dateString
    }
}

const getAvatarSrc = (user: any): string | null => {
    if (!user) return null;
    if (user.imageBase64 && user.imageBase64.trim()) {
        const b64 = user.imageBase64.trim();
        if (b64.startsWith('data:image')) return b64;
        return `data:image/jpeg;base64,${b64}`;
    }
    if (user.avatar_url && user.avatar_url.trim()) return user.avatar_url;
    if (user.avatar && user.avatar.trim()) return user.avatar;
    if (user.image && user.image.trim()) {
        let img = user.image.trim();
        if (img.startsWith('http')) return img;
        return `${API_BASE}${img.startsWith('/') ? img : `/${img}`}`;
    }
    return null;
}

function UserDetailContent() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t, locale } = useI18n()
    const userId = (params as any)?.id as string
    const lang = (params as any)?.lang as string || "en"

    const { profile, loading: loadingProfile, isMock } = useUserProfile(userId)
    const user = profile as any

    const [activeTab, setActiveTab] = useState(() => searchParams?.get("tab") || "overview")

    useEffect(() => {
        const tab = searchParams?.get("tab")
        if (tab && tab !== activeTab) {
            setActiveTab(tab)
        } else if (!tab && activeTab !== "overview") {
            // If URL has no tab param, reset to overview
            setActiveTab("overview")
        }
    }, [searchParams])

    const handleTabChange = (val: string) => {
        setActiveTab(val)
        router.replace(`/${lang}/users/manage/${userId}?tab=${val}`, { scroll: false })
    }

    // State for tabs
    const [kycData, setKycData] = useState<any | null>(null)
    const [walletData, setWalletData] = useState<any | null>(null)
    const [activityLogs, setActivityLogs] = useState<any[]>([])

    const [loadingKyc, setLoadingKyc] = useState(false)
    const [loadingWallet, setLoadingWallet] = useState(false)
    const [loadingLogs, setLoadingLogs] = useState(false)

    // Mock user computed metrics
    const [simBalance, setSimBalance] = useState<{ activeBalance: number; pendingBalance: number } | null>(null)
    const [simOrderCount, setSimOrderCount] = useState<number>(0)
    const [simSetoranCount, setSimSetoranCount] = useState<number>(0)
    const [simTxCount, setSimTxCount] = useState<number>(0)

    const [walletForbidden, setWalletForbidden] = useState(false)
    const [logsForbidden, setLogsForbidden] = useState(false)
    const [isProcessingWallet, setIsProcessingWallet] = useState(false)

    // Cek apakah user terdaftar sebagai guru/trainer
    const trainerInfo = useMemo(() => {
        if (isMock) {
            return Object.values(SIM_TRAINERS).find(t => String(t.userId) === String(userId)) || null
        }
        const roleLower = String(user?.role || '').toLowerCase()
        const isTeacher = roleLower === 'trainer' || roleLower === 'guru' || roleLower === 'teacher'
        if (isTeacher) {
            return { id: user?.trainer_id || user?.teacher_id || userId }
        }
        return null
    }, [isMock, userId, user?.role, user?.trainer_id, user?.teacher_id])

    // We now manage wallet entirely via UserWalletDetail in mock mode.
    // The previous state 'walletData' etc. for fetching wallet are kept as-is 
    // to not break other things, but we'll render UserWalletDetail.

    useEffect(() => {
        if (user && userId) {
            fetchKyc()
            // Skip real API calls for dummy/mock users — UserWalletDetail handles wallet display
            // and audit logs don't exist for sim users. This prevents toast spam + API spam.
            if (!isMock) {
                fetchWallet()
                fetchLogs()
            }
        }
    }, [user?.id, userId, isMock])

    // Hitung metrics dari sim store untuk mock users
    useEffect(() => {
        if (!isMock || !userId) return

        // Saldo aktif dari transaksi wallet
        const balances = getSimWalletBalances(userId)
        setSimBalance(balances)

        // Jumlah pesanan dari billing-dummy.json (deduplicated)
        const seenOrderIds = new Set<string>()
        const orders = (dummyBillingData.bookings as any[]).filter(
            (b: any) => {
                if (String(b.userId) !== String(userId)) return false
                if (seenOrderIds.has(String(b.id))) return false
                seenOrderIds.add(String(b.id))
                return true
            }
        )
        setSimOrderCount(orders.length)

        // Jumlah setoran dari sim-setoran
        const setorans = getSimSetoransByUser(userId)
        setSimSetoranCount(setorans.length)

        // Total transaksi wallet
        const txs = getSimTransactions().filter(
            (tx: any) => String(tx.userId) === String(userId)
        )
        setSimTxCount(txs.length)
    }, [isMock, userId])

    const fetchKyc = async () => {
        if (!user) return
        setLoadingKyc(true)
        try {
            const username = user?.username?.replace('@', '')
            const res = await getKycAll(1, 10, undefined)
            if (res.success && res.data && res.data.length > 0) {
                const match = res.data.find((k: any) => String(k.userId) === String(userId) || k.username === username)
                setKycData(match || res.data[0])
            } else {
                setKycData(null)
            }
        } catch (error) {
            console.error("Failed to fetch KYC", error)
            setKycData(null)
        } finally {
            setLoadingKyc(false)
        }
    }

    const fetchWallet = async () => {
        if (!userId) return
        setLoadingWallet(true)
        setWalletForbidden(false)
        try {
            const res = await walletApi.getWalletByUserId(userId)
            setWalletData(res.data || res)
        } catch (error) {
            console.error("Failed to fetch Wallet", error)
            if (error instanceof Error && error.message.includes("403")) {
                // 403 = permission issue, show forbidden state silently without toast
                setWalletForbidden(true)
                setWalletData(null)
            } else {
                setWalletData(null)
            }
        } finally {
            setLoadingWallet(false)
        }
    }

    const fetchLogs = async () => {
        if (!userId) return
        setLoadingLogs(true)
        setLogsForbidden(false)
        try {
            const res = await auditApi.getUserLogs(userId)
            let logs: any[] = []
            if (Array.isArray(res?.data?.items)) logs = res.data.items
            else if (Array.isArray(res?.items)) logs = res.items
            else if (Array.isArray(res?.data?.data)) logs = res.data.data
            else if (Array.isArray(res?.data)) logs = res.data
            else if (Array.isArray(res)) logs = res

            setActivityLogs(logs.slice(0, 50))
        } catch (error) {
            console.error("Failed to fetch logs", error)
            if (error instanceof Error && error.message.includes("403")) {
                setLogsForbidden(true)
            }
            setActivityLogs([])
        } finally {
            setLoadingLogs(false)
        }
    }

    if (loadingProfile) {
        return <SkeletonDetailPage showAvatar infoRows={6} />
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Activity className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500">{t("user_detail.not_found", "Pengguna tidak ditemukan.")}</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t("user_detail.back", "Kembali")}
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-emerald-600 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("user_detail.title", "Profil User")}</h1>
                    </div>
                </div>

                {/* Header Compact */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <Avatar className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full border-2 border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
                            <AvatarImage src={getAvatarSrc(user) || undefined} className="object-cover" />
                            <AvatarFallback className="bg-emerald-50 text-emerald-600 text-lg sm:text-xl font-bold">
                                {user.name ? user.name.charAt(0) : user.username?.charAt(1) || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">
                                    {user.name || user.username}
                                </h1>

                                {user.isVerify && (
                                    <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 h-5 inline-flex items-center justify-center leading-none border border-emerald-200 dark:border-emerald-800 shrink-0">
                                        Verified
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 truncate">
                                @{user.username?.replace('@', '')} • <span className="text-xs uppercase">{user.role || 'MEMBER'}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
                        {trainerInfo && (
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 sm:flex-initial"
                                onClick={() => {
                                    router.push(`/${lang}/teachers/manage/${trainerInfo.id}`)
                                }}
                            >
                                <BookOpen className="w-4 h-4 mr-2" /> {t("user_detail.view_teacher_profile", "Lihat Profil Guru")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Key Metrics Cards — clickable, navigate to corresponding tab */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Card 1: Total Saldo → tab Dompet User */}
                    <Card
                        onClick={() => handleTabChange('wallet')}
                        className="rounded-2xl border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 cursor-pointer hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200"
                    >
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400">{t("user_detail.stats.balance", "Total Saldo")}</p>
                                <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                                {isMock
                                    ? formatCurrency(simBalance?.activeBalance ?? 0, locale)
                                    : (walletData?.balance ? formatCurrency(walletData.balance, locale) : formatCurrency(0, locale))}
                            </h3>
                        </CardContent>
                    </Card>

                    {/* Card 2: Total Pesanan → tab Pesanan */}
                    <Card
                        onClick={() => handleTabChange('pesanan')}
                        className="rounded-2xl border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200"
                    >
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400">{t("user_detail.stats.orders", "Total Pesanan")}</p>
                                <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {isMock ? simOrderCount : (activityLogs?.length || 0)}
                            </h3>
                        </CardContent>
                    </Card>

                    {/* Card 3: Total Setoran → tab Setoran */}
                    <Card
                        onClick={() => handleTabChange('setoran')}
                        className="rounded-2xl border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 cursor-pointer hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200"
                    >
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400">{t("user_detail.stats.setoran", "Total Setoran")}</p>
                                <div className="p-1.5 sm:p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {isMock ? simSetoranCount : 0}
                            </h3>
                        </CardContent>
                    </Card>

                    {/* Card 4: Total Transaksi → tab Dompet User */}
                    <Card
                        onClick={() => handleTabChange('wallet')}
                        className="rounded-2xl border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 cursor-pointer hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200"
                    >
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400">{t("user_detail.stats.transactions", "Total Transaksi")}</p>
                                <div className="p-1.5 sm:p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {isMock ? simTxCount : (walletData?.totalTransactions || walletData?.transactions?.length || 0)}
                            </h3>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs & Content */}
                <Card className="rounded-2xl border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-4 sm:px-6 pt-2">
                        <Tabs defaultValue="overview" value={activeTab} onValueChange={handleTabChange} className="w-full">
                            <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                                <TabsList className="w-max min-w-full justify-start border-b border-gray-100 dark:border-gray-800 rounded-none bg-transparent h-auto p-0 space-x-4 sm:space-x-6 flex-nowrap">
                                    <TabsTrigger value="overview" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-1 py-3 sm:py-4 data-[state=active]:shadow-none text-xs sm:text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                                        {t("user_detail.tabs.overview", "Overview")}
                                    </TabsTrigger>
                                    <TabsTrigger value="kyc" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-1 py-3 sm:py-4 data-[state=active]:shadow-none text-xs sm:text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                                        {t("user_detail.tabs.kyc", "KYC Member")}
                                    </TabsTrigger>
                                    <TabsTrigger value="wallet" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-1 py-3 sm:py-4 data-[state=active]:shadow-none text-xs sm:text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                                        {t("user_detail.tabs.wallet", "Wallet")}
                                    </TabsTrigger>
                                    <TabsTrigger value="pesanan" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-1 py-3 sm:py-4 data-[state=active]:shadow-none text-xs sm:text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                                        {t("user_detail.tabs.orders", "Pesanan")}
                                    </TabsTrigger>
                                    <TabsTrigger value="setoran" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-1 py-3 sm:py-4 data-[state=active]:shadow-none text-xs sm:text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                                        {t("user_detail.tabs.setoran", "Setoran")}
                                    </TabsTrigger>
                                    <TabsTrigger value="aktivitas" className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-1 py-3 sm:py-4 data-[state=active]:shadow-none text-xs sm:text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                                        {t("user_detail.tabs.log", "Log Aktivitas")}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="py-6">
                                {/* OVERVIEW TAB (60:40 Layout) */}
                                <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                        {/* Kiri (60%) */}
                                        <div className="lg:col-span-7">
                                            <Card className="border border-gray-100 dark:border-gray-800 shadow-none h-full bg-gray-50/50 dark:bg-gray-800/20">
                                                <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                                                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">{t("user_detail.overview.personal_title", "Detail Informasi Pribadi")}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-6 space-y-6">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{t("user_detail.overview.email", "Email")}</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white break-all">{user.email || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{t("user_detail.overview.phone", "No. Telepon")}</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{user.hp || user.noHp || user.phone || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{t("user_detail.overview.gender", "Jenis Kelamin")}</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{user.gender === 'm' ? t("user_detail.overview.male", "Laki-laki") : user.gender === 'f' ? t("user_detail.overview.female", "Perempuan") : '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{t("user_detail.overview.birth_date", "Tanggal Lahir")}</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{user.dob ? formatDate(user.dob, locale) : '-'}</p>
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{t("user_detail.overview.job", "Pekerjaan")}</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{user.job || '-'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{t("user_detail.overview.bio", "Bio")}</p>
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                                {user.bio || t("user_detail.overview.bio_empty", "Tidak ada bio yang dituliskan oleh pengguna.")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Kanan (40%) */}
                                        <div className="lg:col-span-5 space-y-6">
                                            {/* Kartu 1: Detail Akun */}
                                            <Card className="border border-gray-100 dark:border-gray-800 shadow-none bg-gray-50/50 dark:bg-gray-800/20">
                                                <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                                                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">{t("user_detail.overview.account_title", "Detail Akun")}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-6 space-y-4">
                                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800/50">
                                                        <span className="text-sm font-medium text-gray-500">{t("user_detail.overview.joined", "Tanggal Gabung")}</span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(user.created_at || user.createdAt || new Date().toISOString(), locale)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800/50">
                                                        <span className="text-sm font-medium text-gray-500">{t("user_detail.overview.timezone", "Timezone")}</span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{user.timezone || '-'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-medium text-gray-500">{t("user_detail.overview.status", "Status Akun")}</span>
                                                        <div className="flex gap-2">
                                                            {user.isBlocked ? (
                                                                <Badge variant="destructive" className="text-[10px]">{t("user_detail.overview.status_blocked_badge", "Terblokir")}</Badge>
                                                            ) : (
                                                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px]">{t("user_detail.overview.status_active", "Aktif")}</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Kartu 2: Lokasi & Perangkat */}
                                            <Card className="border border-gray-100 dark:border-gray-800 shadow-none bg-gray-50/50 dark:bg-gray-800/20">
                                                <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                                                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">{t("user_detail.overview.location_title", "Lokasi & Perangkat")}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-6 space-y-4">
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{t("user_detail.overview.address_title", "Alamat Lengkap")}</p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {[user.cityName || user.city_name, user.stateName || user.state_name, user.countryName || user.country_name].filter(Boolean).join(', ') || t("user_detail.overview.address_empty", "Lokasi belum diatur")}
                                                        </p>
                                                    </div>
                                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/50">
                                                        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{t("user_detail.overview.login_ip", "Info Login Terakhir (IP)")}</p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                                                            {activityLogs && activityLogs.length > 0 && activityLogs[0].ipAddress
                                                                ? activityLogs[0].ipAddress
                                                                : '127.0.0.1'}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                    </div>
                                </TabsContent>

                                {/* KYC TAB */}
                                <TabsContent value="kyc" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {loadingKyc ? (
                                        <div className="space-y-3 py-4">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="flex justify-between animate-pulse"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-36" /></div>
                                            ))}
                                        </div>
                                    ) : kycData ? (
                                        <div className="space-y-4 max-w-2xl">
                                            <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${kycData.status === 2 ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                    kycData.status === 3 ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800' :
                                                        kycData.status === 1 ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800' :
                                                            'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800'
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-full">
                                                        <Shield className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-bold">
                                                            {kycData.status === 2 ? t("user_detail.kyc.approved_title", "KYC Disetujui") :
                                                                kycData.status === 3 ? t("user_detail.kyc.rejected_title", "KYC Ditolak") :
                                                                    kycData.status === 1 ? t("user_detail.kyc.under_review", "Sedang Direview") : t("user_detail.kyc.waiting_review", "Menunggu Review")}
                                                        </p>
                                                        <p className="text-sm opacity-80 mt-1">
                                                            {kycData.reviewedAt ? t("user_detail.kyc.reviewed_on", "Direview pada {{date}}", { date: formatDate(kycData.reviewedAt, locale) }) : t("user_detail.kyc.submitted_on", "Disubmit pada {{date}}", { date: formatDate(kycData.createdAt, locale) })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" onClick={() => router.push('/support/kyc-member')} className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-current border-opacity-20 hover:bg-white/80 dark:hover:bg-gray-900/80 rounded-xl w-full sm:w-auto">
                                                    {t("user_detail.kyc.view_detail", "Lihat Detail KYC")}
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20">
                                                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">{t("user_detail.kyc.doc_type", "Tipe Dokumen")}</p>
                                                    <p className="text-base font-bold text-gray-900 dark:text-white">{kycData.documentType || '-'}</p>
                                                </div>
                                                <div className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20">
                                                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">{t("user_detail.kyc.doc_number", "Nomor Dokumen")}</p>
                                                    <p className="text-base font-bold text-gray-900 dark:text-white">{kycData.documentNumber || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                                <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                            </div>
                                            <p className="text-base font-medium text-gray-600 dark:text-gray-400">{t("user_detail.kyc.empty", "Pengguna belum mengajukan verifikasi KYC")}</p>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* WALLET TAB */}
                                <TabsContent value="wallet" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <UserWalletDetail
                                        userId={userId}
                                        userData={user}
                                        hideProfileCard={true}
                                        isTeacher={!!trainerInfo}
                                    />
                                </TabsContent>

                                {/* ORDERS TAB */}
                                <TabsContent value="pesanan" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <UserOrders userId={userId} />
                                </TabsContent>

                                {/* SETORAN TAB */}
                                <TabsContent value="setoran" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <UserSetoran userId={userId} isMock={isMock} />
                                </TabsContent>

                                {/* ACTIVITY TAB */}
                                <TabsContent value="aktivitas" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {loadingLogs ? (
                                        <div className="space-y-4 py-4">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="flex items-start gap-3 animate-pulse">
                                                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                                                    <div className="space-y-2 flex-1"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : activityLogs && activityLogs.length > 0 ? (
                                        <div className="space-y-4 max-w-3xl">
                                            <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-4 pl-8 pb-4 pt-2">
                                                {activityLogs.map((log: any, idx: number) => (
                                                    <div key={log.id || idx} className="mb-8 relative">
                                                        <div className="absolute -left-[41px] w-4 h-4 bg-white dark:bg-gray-900 border-[3px] border-emerald-500 rounded-full mt-1.5 shadow-sm"></div>
                                                        <div className="flex flex-col gap-1.5 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                                            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                                                                <Badge variant="secondary" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm font-semibold px-2.5 py-0.5">
                                                                    {log.action || log.event || t("user_detail.log.activity", "Aktivitas")}
                                                                </Badge>
                                                                <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {formatDateTime(log.createdAt || log.timestamp || new Date().toISOString(), locale)}
                                                                </span>
                                                            </div>
                                                            <p className="text-base text-gray-900 dark:text-gray-100 mt-1">
                                                                {log.description || log.message || '-'}
                                                            </p>
                                                            {log.ipAddress && (
                                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                                                                    <span className="text-xs text-gray-400 font-mono">IP: {log.ipAddress}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                                <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                            </div>
                                            <p className="text-base font-medium text-gray-600 dark:text-gray-400">{t("user_detail.log.empty", "Belum ada riwayat aktivitas untuk pengguna ini")}</p>
                                        </div>
                                    )}
                                </TabsContent>
</div>
        </Tabs>
    </div>
</Card>
    </div>
    )
}

export default function UserDetailPage() {
    return <UserDetailContent />
}