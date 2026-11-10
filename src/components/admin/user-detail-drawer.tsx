"use client"

import { useRouter } from "next/navigation"
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    Mail, Phone, MapPin, ExternalLink, Calendar, UserCheck
} from "lucide-react"

import { API_BASE } from "@/lib/api"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateString: string) {
    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return dateString
        return date.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        })
    } catch {
        return dateString
    }
}

// Helper function to get avatar URL (copied from user.tsx)
const getAvatarSrc = (user: any): string | null => {
    if (!user) return null;
    if (user.imageBase64 && user.imageBase64.trim()) {
        const b64 = user.imageBase64.trim();
        if (b64.startsWith('data:image')) return b64;
        return `data:image/jpeg;base64,${b64}`;
    }
    if (user.image && user.image.trim()) {
        let img = user.image.trim();
        if (img.startsWith('data:image') || (img.length > 200 && !img.includes('/'))) {
            if (img.startsWith('data:image')) return img;
            return `data:image/jpeg;base64,${img}`;
        }
        if (img.startsWith('http')) return img;
        img = img.replace(/\\/g, '/');
        const path = img.startsWith('/') ? img : `/${img}`;
        return `${API_BASE}${path}`;
    }
    if (user.avatar && user.avatar.trim()) return user.avatar;
    return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UserDetailDrawerProps {
    isOpen: boolean
    onClose: () => void
    user: any | null
    onEdit?: (userId: string | number) => void
}

export function UserDetailDrawer({ isOpen, onClose, user, onEdit }: UserDetailDrawerProps) {
    const router = useRouter()

    if (!user) return null

    const userId = user?.userId || user?.id

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl overflow-y-auto p-0 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col h-full">
                <SheetHeader className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-10 flex flex-row items-center justify-between shadow-sm">
                    <div className="flex flex-col gap-1.5">
                        <SheetTitle className="text-xl font-bold">Detail Pengguna</SheetTitle>
                        <SheetDescription className="text-xs">
                            Melihat informasi kontak pengguna #{userId}
                        </SheetDescription>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 text-center sm:text-left">
                            <Avatar className="w-24 h-24 rounded-2xl shadow-md border-2 border-white dark:border-gray-800 ring-1 ring-gray-100 dark:ring-gray-700">
                                <AvatarImage src={getAvatarSrc(user) || undefined} className="object-cover" />
                                <AvatarFallback className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-3xl font-bold rounded-2xl">
                                    {user.name ? user.name.charAt(0) : user.username?.charAt(1) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-2 mt-2 sm:mt-0">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                    {user.name || user.username}
                                </h2>
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    @{user.username?.replace('@', '')}
                                </p>
                                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                                    <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium px-3">
                                        {user.role?.toUpperCase() || 'MEMBER'}
                                    </Badge>
                                    {user.isBlocked ? (
                                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-medium px-3">Terblokir</Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-medium px-3">Aktif</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 px-2">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" /> 
                                    <span>Bergabung {formatDate(user.created || user.createdAt || new Date().toISOString())}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 px-2">
                                Contact Information
                            </h3>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{user.email || '-'}</p>
                                    </div>
                                </div>
                                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone Number</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.phone || user.hp || user.noHp || '-'}</p>
                                    </div>
                                </div>
                                <div className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Location</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                                            {[user.cityName, user.stateName, user.countryName].filter(Boolean).join(', ') || 'Lokasi belum diatur'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20 mt-auto">
                    <div className="flex flex-col gap-3">
                        <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-12 rounded-xl transition-all hover:scale-[1.01]"
                            onClick={() => { onClose(); router.push('/users/manage/' + userId); }}
                        >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Kelola Data Lengkap
                        </Button>
                        <Button 
                            variant="outline"
                            className="w-full font-semibold border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 h-12 rounded-xl"
                            onClick={() => { onClose(); router.push('/profile/' + userId); }}
                        >
                            <ExternalLink className="w-4 h-4 mr-2 text-gray-400" />
                            Lihat Profil Publik
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
