"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronRight, ChevronsUpDown, LogOut, User } from "lucide-react"

import { useI18n } from "@/components/providers/i18n-provider"
import { useAuth } from "@/hooks/use-auth"
import { useUnreadCount } from "@/hooks/use-notifications"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useLocalizedRouter as useRouter } from "@/hooks/use-localized-router"
import { LocalizedLink as Link } from "@/components/ui/localized-link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { BtnLogout } from "@/components/ui/sidebar/btn-logout/btn-logout"
import { getSidebarData, type NavItem } from "@/components/ui/sidebar/sidebar-data"
import { markSidebarNavigation } from "@/utils/navigation-cache"
import { getInitials } from "@/utils/helpers/get-initials"
import signOut from "@/utils/Auth/logout"
import { cn } from "@/lib/utils"

const LOCALES = ["id", "en", "ar"]

function stripLocalePrefix(rawPathname: string | null): string {
  const segments = (rawPathname ?? "/").split("/").filter(Boolean)
  if (segments.length > 0 && LOCALES.includes(segments[0])) {
    return "/" + segments.slice(1).join("/")
  }
  return rawPathname ?? "/"
}

const RtlSidebarLogo = React.memo(function RtlSidebarLogo() {
  const { state, isMobile } = useSidebar()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isCollapsed = mounted ? state === "collapsed" && !isMobile : false

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild tooltip="Qurani">
          <Link
            href="/dashboard"
            className="flex items-center justify-center"
            onClick={markSidebarNavigation}
          >
            {!isCollapsed ? (
              <>
                <Image
                  src="/icons/Qurani - Logo Green.png"
                  alt="Qurani"
                  width={100}
                  height={32}
                  className="dark:hidden h-auto w-auto max-h-8 object-contain"
                />
                <Image
                  src="/icons/Qurani - Logo White.png"
                  alt="Qurani"
                  width={100}
                  height={32}
                  className="hidden dark:block h-auto w-auto max-h-8 object-contain"
                />
              </>
            ) : (
              <div className="flex aspect-square size-8 items-center justify-center">
                <Image
                  src="/icons/Qurani - Icon2 Green.png"
                  alt="Qurani"
                  width={22}
                  height={22}
                  className="dark:hidden"
                />
                <Image
                  src="/icons/Qurani - Icon2 White.png"
                  alt="Qurani"
                  width={22}
                  height={22}
                  className="hidden dark:block"
                />
              </div>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
})

const RtlNavMain = React.memo(function RtlNavMain({ items }: { items: NavItem[] }) {
  const rawPathname = usePathname()
  const pathname = stripLocalePrefix(rawPathname)
  const { state, isMobile, setOpenMobile } = useSidebar()
  const { userId } = useAuth()
  const { unreadCount } = useUnreadCount(userId)

  const [mounted, setMounted] = React.useState(false)
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({})
  const [hasVisitedNotifications, setHasVisitedNotifications] = React.useState(false)
  const initializedRef = React.useRef(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isCollapsed = mounted ? state === "collapsed" && !isMobile : false
  const isOnNotificationsPage = pathname === "/notification" || pathname === "/notifikasi"

  React.useEffect(() => {
    if (userId) {
      setHasVisitedNotifications(localStorage.getItem(`notifications_visited_${userId}`) === "true")
    }
  }, [userId])

  React.useEffect(() => {
    if (isOnNotificationsPage && userId) {
      localStorage.setItem(`notifications_visited_${userId}`, "true")
      setHasVisitedNotifications(true)
    }
  }, [isOnNotificationsPage, userId])

  React.useEffect(() => {
    if (userId && unreadCount > 0 && hasVisitedNotifications) {
      const lastCountKey = `last_notification_count_${userId}`
      const lastCount = parseInt(localStorage.getItem(lastCountKey) || "0")
      if (unreadCount > lastCount) {
        localStorage.removeItem(`notifications_visited_${userId}`)
        setHasVisitedNotifications(false)
      }
      localStorage.setItem(lastCountKey, unreadCount.toString())
    }
  }, [unreadCount, userId, hasVisitedNotifications])

  const sidebarBadgeCount = isOnNotificationsPage || hasVisitedNotifications ? 0 : unreadCount

  const isSubItemActive = React.useCallback(
    (subUrl: string): boolean => {
      if (pathname === subUrl) return true
      if (subUrl === "/users/manage" && pathname.startsWith("/users/manage/")) return false
      if (subUrl !== "/" && pathname.startsWith(subUrl + "/")) return true
      return false
    },
    [pathname]
  )

  const isGroupLinkActive = React.useCallback(
    (subUrl: string): boolean =>
      isSubItemActive(subUrl) ||
      ((subUrl === "/grup" || subUrl === "/groups") &&
        (pathname.startsWith("/groups/detail/") ||
          pathname.startsWith("/grup/detail/") ||
          pathname.startsWith("/grup/kelola/"))),
    [isSubItemActive, pathname]
  )

  React.useEffect(() => {
    const groupToOpen =
      items.find(
        (item) =>
          item.items &&
          item.items.length > 0 &&
          item.items.some((sub) => isSubItemActive(sub.url))
      )?.url ?? null

    if (!initializedRef.current) {
      const initialState: Record<string, boolean> = {}
      items.forEach((item) => {
        if (item.items && item.items.length > 0) {
          initialState[item.url] = item.items.some((sub) => isSubItemActive(sub.url))
        }
      })
      setOpenMenus(initialState)
      initializedRef.current = true
    } else if (groupToOpen) {
      setOpenMenus((prev) => {
        const nextState: Record<string, boolean> = {}
        items.forEach((item) => {
          if (item.items && item.items.length > 0) {
            nextState[item.url] = item.url === groupToOpen
          }
        })
        const isSame = Object.keys(nextState).every((k) => prev[k] === nextState[k])
        return isSame ? prev : nextState
      })
    }
  }, [pathname, items, isSubItemActive])

  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  const handleLinkClick = React.useCallback(() => {
    markSidebarNavigation()
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, setOpenMobile])

  const handleOpenChange = React.useCallback((key: string, isOpen: boolean) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: isOpen,
    }))
  }, [])

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = Boolean(item.items && item.items.length > 0)

          if (hasSubItems && item.items) {
            const hasActiveSubItem = item.items.some((sub) => isGroupLinkActive(sub.url))

            if (isCollapsed) {
              return (
                <SidebarMenuItem key={item.url}>
                  <DropdownMenu dir="rtl">
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={hasActiveSubItem}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="left"
                      align="start"
                      sideOffset={8}
                      className="min-w-48 rounded-lg"
                    >
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {item.title}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {item.items.map((subItem) => {
                        const isCurrentPageSub = isGroupLinkActive(subItem.url)
                        return (
                          <DropdownMenuItem key={subItem.url} asChild>
                            <Link
                              href={subItem.url}
                              onClick={handleLinkClick}
                              className={cn(
                                "flex w-full items-center gap-2 cursor-pointer",
                                isCurrentPageSub &&
                                  "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              )}
                            >
                              {subItem.icon && <subItem.icon className="size-4 shrink-0" />}
                              <span>{subItem.title}</span>
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              )
            }

            return (
              <Collapsible
                key={item.url}
                asChild
                open={openMenus[item.url] ?? hasActiveSubItem}
                onOpenChange={(isOpen) => handleOpenChange(item.url, isOpen)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={hasActiveSubItem}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ms-auto transition-transform duration-200 rotate-180 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const isCurrentPageSub = isGroupLinkActive(subItem.url)
                        return (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton asChild isActive={isCurrentPageSub}>
                              <Link href={subItem.url} onClick={handleLinkClick}>
                                {subItem.icon && <subItem.icon />}
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          const isCurrentPage = pathname.startsWith(item.url)
          const isNotificationItem = item.url === "/notification" || item.url === "/notifikasi"

          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isCurrentPage} tooltip={item.title}>
                <Link href={item.url} onClick={handleLinkClick}>
                  {item.icon && (
                    <span className="relative flex items-center justify-center">
                      <item.icon className="size-4 shrink-0" />
                      {isNotificationItem && isCollapsed && sidebarBadgeCount > 0 && (
                        <span className="absolute -top-1 -start-1 size-2 rounded-full bg-red-500" />
                      )}
                    </span>
                  )}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {isNotificationItem && sidebarBadgeCount > 0 && (
                <SidebarMenuBadge className="bg-red-500 text-white rounded-full px-1.5">
                  {sidebarBadgeCount > 99 ? "99+" : sidebarBadgeCount}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
})

const RtlNavUser = React.memo(function RtlNavUser() {
  const { profile, isAuthenticated } = useAuth()
  const { profile: userProfile } = useUserProfile(isAuthenticated ? "me" : null)
  const { isMobile } = useSidebar()
  const { t } = useI18n()
  const router = useRouter()
  const [showDialog, setShowDialog] = React.useState(false)

  const displayData = React.useMemo(() => {
    const active =
      userProfile?.avatar || (userProfile as Record<string, unknown>)?.avatar_url
        ? userProfile
        : profile?.avatar
          ? profile
          : userProfile || profile
    const record = active as Record<string, unknown> | undefined
    const avatar =
      (record?.avatar as string) ||
      (record?.avatar_url as string) ||
      (record?.avatarUrl as string) ||
      (record?.image as string) ||
      ""
    const name = (record?.name as string) || (record?.fullName as string) || "User"
    return {
      displayName: name,
      displayUsername: (record?.username as string) || null,
      initial: getInitials(name),
      avatar,
    }
  }, [profile, userProfile])

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={displayData.displayName}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage
                    src={displayData.avatar}
                    alt={displayData.displayName}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-semibold text-white">
                    {displayData.initial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{displayData.displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {displayData.displayUsername
                      ? `@${displayData.displayUsername.replace(/^@/, "")}`
                      : "No username set"}
                  </span>
                </div>
                <ChevronsUpDown className="ms-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "left"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-1.5 text-start text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage
                      src={displayData.avatar}
                      alt={displayData.displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-semibold text-white">
                      {displayData.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{displayData.displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {displayData.displayUsername
                        ? `@${displayData.displayUsername.replace(/^@/, "")}`
                        : "No username set"}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="size-4" />
                  <span>{t("navigation.profile", "الملف الشخصي")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDialog(true)}
                className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400"
              >
                <LogOut className="size-4" />
                <span>{t("navigation.sign_out", "تسجيل الخروج")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <BtnLogout
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        text={t("logout_text")}
        desc={t("logout_desc")}
        handleEvent={signOut}
        router={router}
      />
    </>
  )
})

export const AppSidebarRtl = React.memo(function AppSidebarRtl({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { t } = useI18n()
  const sidebarData = React.useMemo(() => getSidebarData(t), [t])

  return (
    <Sidebar dir="rtl" side="right" variant="floating" collapsible="icon" {...props}>
      <SidebarHeader>
        <RtlSidebarLogo />
      </SidebarHeader>

      <SidebarContent>
        <RtlNavMain items={sidebarData.navMain} />
      </SidebarContent>

      <SidebarFooter>
        <RtlNavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
})

