// Avatar components tidak digunakan karena menggunakan direct img tag
import { useI18n } from "@/components/providers/i18n-provider"
import { useMemo, useCallback, useState } from "react"

interface UserAvatarProps {
    user: {
        id: string
        name?: string | null
        username?: string | null
        avatar?: string | null
    }
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function UserAvatar({
    user,
    size = 'md',
    className = ""
}: UserAvatarProps) {
    const { t } = useI18n()
    const [imageError, setImageError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Memoize size classes untuk mencegah re-creation
    const sizeClasses = useMemo(() => ({
        sm: 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10',
        md: 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11',
        lg: 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12'
    }), [])

    // Memoize initial dan alt text untuk mencegah re-creation
    const initial = useMemo(() => {
        return user.name?.charAt(0).toUpperCase() ||
            user.username?.charAt(0).toUpperCase() ||
            t('search.user_initial', "U")
    }, [user.name, user.username, t])

    const altText = useMemo(() => {
        return user.name || t('search.user', "User")
    }, [user.name, t])

    // Memoize processed avatar URL untuk mencegah re-processing
    const avatarSrc = useMemo(() => {
        let src = user.avatar || undefined

        if (src && src.includes('googleusercontent.com')) {
            // Hapus parameter s=96-c yang mungkin menyebabkan masalah
            src = src.replace(/[?&]s=\d+-c/, '')

            // Atau coba dengan parameter yang berbeda
            if (!src.includes('?') && !src.includes('&')) {
                src = src + '?sz=96'
            }
        }

        return src
    }, [user.avatar])

    // Memoize final avatar URL - gunakan proxy untuk Google avatars
    const finalAvatarSrc = useMemo(() => {
        if (avatarSrc && avatarSrc.includes('googleusercontent.com')) {
            return `/api/proxy-avatar?url=${encodeURIComponent(avatarSrc)}`
        }
        return avatarSrc
    }, [avatarSrc])

    // Optimized event handlers
    const handleImageLoad = useCallback(() => {
        setIsLoading(false)
        setImageError(false)
    }, [])

    const handleImageError = useCallback(() => {
        // Set error state untuk fallback
        setImageError(true)
        setIsLoading(false)
    }, [])

    return (
        <div className={`relative flex-shrink-0 ${className}`}>
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-slate-600 flex items-center justify-center`}>
                {finalAvatarSrc && !imageError ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={finalAvatarSrc}
                            alt={altText}
                            className={`w-full h-full object-cover transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                        />
                        {/* Loading skeleton */}
                        {isLoading && (
                            <div className="absolute inset-0 bg-slate-500 animate-pulse rounded-full" />
                        )}
                    </>
                ) : null}

                {/* Fallback - selalu ada tapi hanya visible saat error atau tidak ada avatar */}
                <div className={`absolute inset-0 bg-slate-600 text-white font-semibold text-xs flex items-center justify-center rounded-full transition-opacity duration-200 ${!finalAvatarSrc || imageError ? 'opacity-100' : 'opacity-0'
                    }`}>
                    {initial}
                </div>
            </div>
        </div>
    )
}
