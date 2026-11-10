"use client"

import * as React from "react"
import { useLocalizedRouter as useRouter } from "@/hooks/use-localized-router"
import { Bell, Search, ChevronDown, LogOut, User, Settings, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useUnreadCount } from "@/hooks/use-notifications"
import { useI18n } from "@/components/providers/i18n-provider"
import { useSidebar } from "@/components/ui/sidebar/custom-sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar/custom-sidebar-trigger"
import { LocalizedLink as Link } from "@/components/ui/localized-link"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "next-themes"
import signOut from "@/utils/Auth/logout"
import { getInitials } from "@/utils/helpers/get-initials"

export const Topbar = React.memo(function Topbar() {
  const router = useRouter()
  const { profile, userId, isAuthenticated } = useAuth()
  const { unreadCount } = useUnreadCount(isAuthenticated ? userId : undefined)
  const { t } = useI18n()
  const { state, isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isCollapsed = mounted ? state === "collapsed" && !isMobile : false

  const displayData = React.useMemo(
    () => ({
      displayName: profile?.name || "User",
      displayUsername: profile?.username || null,
      initial: getInitials(profile?.name || "User"),
      avatar: profile?.avatar || "",
    }),
    [profile]
  )

  const handleSearch = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (searchQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
        setSearchQuery("")
      }
    },
    [searchQuery, router]
  )

  const handleLogout = React.useCallback(async () => {
    await signOut(true, router)
  }, [router])

  const handleThemeToggle = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  if (!mounted) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800" />
    )
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-50 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-all duration-200",
        isMobile ? "left-0" : isCollapsed ? "left-12" : "left-64"
      )}
    >
      <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger
                className="h-9 w-9 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label={t("navigation.menu", "Menu Sidebar")}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("navigation.menu", "Menu Sidebar")}
            </TooltipContent>
          </Tooltip>


          <form onSubmit={handleSearch} className="relative mx-4 hidden w-full max-w-md md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.search_placeholder", "Cari...")}
              aria-label={t("common.search", "Cari")}
              className="w-full rounded-lg border border-gray-200 bg-gray-100 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </form>
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/notification"
                aria-label={t("common.notifications", "Notifikasi")}
                className="relative flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm dark:border-gray-900">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("common.notifications", "Notifikasi")}
            </TooltipContent>
          </Tooltip>

          <LanguageSwitcher />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleThemeToggle}
                aria-label={t("common.theme", "Tema")}
                className="flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("common.theme", "Tema")}
            </TooltipContent>
          </Tooltip>

          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={t("common.user_menu", "Menu Pengguna")}
                  className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={displayData.avatar} alt={displayData.displayName} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-semibold text-white">
                      {displayData.initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[120px] truncate text-sm font-medium text-gray-700 dark:text-gray-200 md:block">
                    {displayData.displayName}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-gray-500 md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {displayData.displayName}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {displayData.displayUsername
                      ? `@${displayData.displayUsername.replace(/^@/, "")}`
                      : "No username"}
                  </p>
                </div>

                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <User className="h-4 w-4" />
                    {t("navigation.profile", "Profil")}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Settings className="h-4 w-4" />
                    {t("navigation.settings", "Pengaturan")}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  {t("navigation.sign_out", "Keluar")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
})
