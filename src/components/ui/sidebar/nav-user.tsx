"use client"

import {
  ChevronsUpDown,
  LogOut,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"


import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/sidebar/custom-dropdown"
import { Tooltip } from "@/components/ui/sidebar/custom-tooltip"
import { useSidebar } from "@/components/ui/sidebar/custom-sidebar"
import { useAuth } from "@/hooks/use-auth"
import { BtnLogout } from "./btn-logout/btn-logout"
import { useI18n } from "@/components/providers/i18n-provider"
import * as React from "react"
import { useState } from "react"
import { getInitials } from "@/utils/helpers/get-initials"
import signOut from "@/utils/Auth/logout"
import { useLocalizedRouter as useRouter } from "@/hooks/use-localized-router"
export const NavUser = React.memo(function NavUser() {
  const { profile } = useAuth()
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [isExpandedDropdownOpen, setIsExpandedDropdownOpen] = useState(false)
  const { t } = useI18n()
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile // Di mobile, tidak pernah collapsed

  const displayData = React.useMemo(() => ({
    displayName: profile?.name || 'User',
    displayUsername: profile?.username || null,
    initial: getInitials(profile?.name || 'User'),
    avatar: profile?.avatar || ""
  }), [profile])

  // Memoized handlers for better performance
  const handleProfileClick = React.useCallback(() => {
    router.push('/profile')
    setIsExpandedDropdownOpen(false)
  }, [router])

  const handleLogoutClick = React.useCallback(() => {
    setShowDialog(true)
    setIsExpandedDropdownOpen(false)
  }, [])


  return (
    <>
      <ul className="flex w-full min-w-0 flex-col gap-1">
        <li className="group/menu-item relative">
          {isCollapsed ? (
            // Collapsed state: avatar with dropdown (sama seperti nav-main)
            <div className="flex w-full justify-center">
              <Dropdown>
                <Tooltip content={displayData.displayName}>
                  <DropdownTrigger asChild>
                    <button className={cn(
                      "flex items-center justify-center rounded-lg text-sm outline-none transition-all duration-200",
                      "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-green-500",
                      "disabled:pointer-events-none disabled:opacity-50",
                      "h-10 w-10 p-0"
                    )}>
                      <Avatar className="h-6 w-6 rounded-lg">
                        <AvatarImage src={displayData.avatar} alt={displayData.displayName} className="object-cover" />
                        <AvatarFallback
                          className={`font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white
                            ${isMobile ? "text-sm" : "text-xs"}
                          `}>
                          {displayData.initial}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownTrigger>
                </Tooltip>
                <DropdownContent
                  className="min-w-48 rounded-lg"
                  side="right"
                  align="start"
                  sideOffset={8}
                >
                  <DropdownItem
                    onClick={handleProfileClick}
                    className="cursor-pointer"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    {t('navigation.profile', 'Profil')}
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem
                    onClick={handleLogoutClick}
                    className="cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {t('navigation.sign_out', 'Keluar')}
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            </div>
          ) : (
            // Expanded state: full dropdown with manual implementation
            <div className="relative">
              <button
                onClick={() => {
                  setIsExpandedDropdownOpen(!isExpandedDropdownOpen)
                }}
                className={cn(
                  "flex w-full items-center gap-2 overflow-hidden rounded-lg text-left outline-none transition-all duration-200",
                  "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-green-500",
                  "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
                  // Ukuran berbeda untuk mobile dan desktop
                  isMobile ? "p-3 h-16" : "p-2 h-12"
                )}>
                <Avatar className={cn(
                  "rounded-lg",
                  // Avatar lebih besar di mobile
                  isMobile ? "h-10 w-10" : "h-8 w-8"
                )}>
                  <AvatarImage src={displayData.avatar} alt={displayData.displayName} className="object-cover" />
                  <AvatarFallback
                    className={`font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white
                      ${isMobile ? "text-sm" : "text-xs"}
                    `}>
                    {displayData.initial}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "grid flex-1 text-left leading-tight",
                  // Text lebih besar di mobile
                  isMobile ? "text-base" : "text-sm"
                )}>
                  <span className="truncate font-medium font-inter">
                    {displayData.displayName}
                  </span>
                  <span className={cn(
                    "truncate text-gray-500 dark:text-gray-400 font-inter",
                    isMobile ? "text-sm" : "text-xs"
                  )}>
                    {displayData.displayUsername
                      ? `@${displayData.displayUsername.replace(/^@/, '')}`
                      : 'No username set'
                    }
                  </span>
                </div>
                <ChevronsUpDown className={cn(
                  "ml-auto shrink-0",
                  isMobile ? "h-5 w-5" : "h-4 w-4"
                )} />
              </button>

              {/* Dropdown for expanded state */}
              {isExpandedDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setIsExpandedDropdownOpen(false)
                    }}
                  />

                  {/* Dropdown content */}
                  <div className="absolute left-0 bottom-full mb-2 z-50 w-full min-w-[200px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-1">
                    <div
                      onClick={handleProfileClick}
                      className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 select-none"
                    >
                      <User className="h-4 w-4 shrink-0" />
                      {t('navigation.profile', 'Profil')}
                    </div>

                    <hr className="my-1 border-gray-200 dark:border-gray-700" />

                    <div
                      onClick={handleLogoutClick}
                      className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 select-none"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      {t('navigation.sign_out', 'Keluar')}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </li>
      </ul>

      <BtnLogout
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        text={t('logout_text')}
        desc={t('logout_desc')}
        handleEvent={signOut}
        router={router} />
    </>
  )
})
