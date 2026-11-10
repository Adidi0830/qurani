"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"
import { getInitials } from "@/utils/helpers/get-initials"
import Link from "next/link"

interface ProfileAvatarProps {
  avatarSource: string | null
  fullName: string
  username: string
  nickname: string
  isEditing: boolean
  loading: boolean
  imageLoadError: boolean
  onAvatarClick: () => void
  onUploadClick: () => void
  setImageLoadError: (error: boolean) => void
  showPreviewButton?: boolean
}

export function ProfileAvatar({
  avatarSource,
  fullName,
  username,
  nickname,
  isEditing,
  loading,
  imageLoadError,
  onAvatarClick,
  onUploadClick,
  setImageLoadError,
  showPreviewButton = true
}: ProfileAvatarProps) {
  const initial = fullName && getInitials(fullName)

  return (
    <div className="relative flex">
      <div className="flex items-center">
        <div
          className="relative cursor-pointer max-w-auto group"
          onClick={onAvatarClick}
        >
          <Avatar className={`${isEditing ? "h-30 w-30" : "h-24 w-24"} ring-4 ring-slate-200 dark:ring-slate-700 transition-all duration-300 ${isEditing
            ? 'group-hover:ring-blue-300 dark:group-hover:ring-blue-600'
            : avatarSource
              ? 'group-hover:ring-emerald-300 dark:group-hover:ring-emerald-600 group-hover:scale-105'
              : 'group-hover:ring-blue-300 dark:group-hover:ring-blue-600'
            }`}>
            {loading ? (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {avatarSource ? (
                  <>
                    <AvatarImage
                      src={avatarSource || undefined}
                      alt={fullName}
                      className="object-cover"
                      onError={(e) => {
                        console.error('Main avatar image failed to load:', avatarSource)
                        console.error('Error details:', e)
                        setImageLoadError(true)
                      }}
                      onLoad={() => {
                        console.log('Main avatar image loaded successfully:', avatarSource)
                        setImageLoadError(false)
                      }}
                    />
                    {imageLoadError && (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-full">
                        <span className="text-xs text-red-600 dark:text-red-400">IMG ERROR</span>
                      </div>
                    )}
                  </>
                ) : null}
                <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {initial}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          {isEditing && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Camera className="h-10 w-10 text-white" />
            </div>
          )}
          {isEditing && showPreviewButton && (
            <Button
              size="icon"
              variant="outline"
              className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900 border-2 border-blue-200 dark:border-blue-600"
              onClick={onUploadClick}
            >
              <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </Button>
          )}
        </div>
        {
          !isEditing && (
            <div className="flex flex-col gap-1 ml-5">
              <div className="text-xl font-semibold">
                {nickname
                  ? nickname + " - " + fullName
                  : fullName}
              </div>
              {username && (
                <Link
                  href={'/profile/' + username?.replace(/^@/, '')}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium"
                >
                  {username}
                </Link>
              )}
            </div>
          )
        }
      </div>
    </div>
  )
}

