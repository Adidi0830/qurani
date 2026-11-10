"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useLocalizedRouter as useRouter } from "@/hooks/use-localized-router"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { markSidebarNavigation } from "@/utils/navigation-cache"
// import { motion, AnimatePresence } from "motion/react" 

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/sidebar/custom-collapsible"
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/sidebar/custom-dropdown"
import { Tooltip } from "@/components/ui/sidebar/custom-tooltip"
import { useSidebar } from "@/components/ui/sidebar/custom-sidebar"
import { NotificationIconWrapper } from "@/components/ui/notification-badge"
import { useAuth } from "@/hooks/use-auth"
import { useUnreadCount } from "@/hooks/use-notifications"
import { usePWAInstall } from "@/hooks/use-pwa-install"

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement>>
  items?: NavItem[]
  isDownloadApp?: boolean
}

export const NavMain = React.memo(function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const rawPathname = usePathname()
  const router = useRouter()

  // Strip locale prefix so comparisons work regardless of active language
  const LOCALES = ["id", "en", "ar"]
  const pathname = (() => {
    const segments = (rawPathname ?? "/").split("/").filter(Boolean)
    if (segments.length > 0 && LOCALES.includes(segments[0])) {
      return "/" + segments.slice(1).join("/")
    }
    return rawPathname ?? "/"
  })()

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})
  // const { t } = useI18n()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const [mounted, setMounted] = useState(false)
  const isCollapsed = mounted ? (state === "collapsed" && !isMobile) : false // Di mobile, tidak pernah collapsed
  const { userId } = useAuth()
  const { unreadCount } = useUnreadCount(userId)
  const [hasVisitedNotifications, setHasVisitedNotifications] = useState(false)

  // PWA Install hook
  const { install: installPWA } = usePWAInstall()

  // Set mounted setelah hydration selesai
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cek apakah user sedang di halaman notifikasi
  const isOnNotificationsPage = pathname === '/notifikasi'

  // Load status kunjungan dari localStorage saat component mount
  useEffect(() => {
    if (userId) {
      const visitKey = `notifications_visited_${userId}`
      const hasVisited = localStorage.getItem(visitKey) === 'true'
      setHasVisitedNotifications(hasVisited)
    }
  }, [userId])

  // Simpan status kunjungan ketika user masuk ke halaman notifikasi
  useEffect(() => {
    if (isOnNotificationsPage && userId) {
      const visitKey = `notifications_visited_${userId}`
      console.log('NavMain: User is on notifications page, saving visit status:', visitKey)
      localStorage.setItem(visitKey, 'true')
      setHasVisitedNotifications(true)
    }
  }, [isOnNotificationsPage, userId])

  // Reset status kunjungan jika ada notifikasi baru masuk
  useEffect(() => {
    if (userId && unreadCount > 0 && hasVisitedNotifications) {
      const lastCountKey = `last_notification_count_${userId}`
      const lastCount = parseInt(localStorage.getItem(lastCountKey) || '0')

      // Jika ada notifikasi baru (count bertambah), reset status kunjungan
      if (unreadCount > lastCount) {
        const visitKey = `notifications_visited_${userId}`
        localStorage.removeItem(visitKey)
        setHasVisitedNotifications(false)
      }

      // Simpan count terbaru
      localStorage.setItem(lastCountKey, unreadCount.toString())
    }
  }, [unreadCount, userId, hasVisitedNotifications])

  // Badge count untuk sidebar: hilang jika sedang di halaman notifikasi ATAU sudah pernah mengunjungi
  const sidebarBadgeCount = (isOnNotificationsPage || hasVisitedNotifications) ? 0 : unreadCount

  // Handle PWA install
  const handlePWAInstall = React.useCallback(async () => {
    await installPWA()
  }, [installPWA])

  // Helper function to handle navigation with sidebar auto-close
  const handleNavigation = React.useCallback((url: string, isDownloadApp?: boolean) => {
    markSidebarNavigation();

    // Close mobile sidebar if open (only on mobile)
    if (isMobile) {
      setOpenMobile(false);
    }
    // Desktop sidebar state is preserved via cookie

    // Handle download app special case
    if (isDownloadApp) {
      handlePWAInstall();
      return;
    }

    router.push(url);
  }, [isMobile, setOpenMobile, router, handlePWAInstall]);

  // Auto-open the group that contains the current page.
  const initializedRef = React.useRef(false)

  // Helper: check if current pathname is active for a given sub-item url
  const isSubItemActive = React.useCallback((subUrl: string): boolean => {
    if (pathname === subUrl) return true
    
    // Prevent auto-opening "Administrator" group when viewing a user profile (/users/manage/[id])
    // so that if accessed from Billing, the Billing group stays open.
    if (subUrl === '/users/manage' && pathname.startsWith('/users/manage/')) return false
    
    // Match sub-pages, but avoid matching /groups when on /groups/categories etc.
    // Use startsWith only for paths that have dynamic children (not exact data pages)
    if (subUrl !== '/' && pathname.startsWith(subUrl + '/')) return true
    return false
  }, [pathname])

  useEffect(() => {
    const groupToOpen: string | null = (() => {
      for (const item of items) {
        if (item.items && item.items.length > 0) {
          const hasActive = item.items.some(sub =>
            isSubItemActive(sub.url) ||
            (sub.items && sub.items.some(nested => isSubItemActive(nested.url)))
          )
          if (hasActive) return item.title
        }
      }
      return null
    })()

    if (!initializedRef.current) {
      const initialState: Record<string, boolean> = {}
      items.forEach((item) => {
        if (item.items && item.items.length > 0) {
          const hasActive = item.items.some(sub =>
            isSubItemActive(sub.url) ||
            (sub.items && sub.items.some(nested => isSubItemActive(nested.url)))
          )
          initialState[item.title] = hasActive
        }
      })
      setOpenMenus(initialState)
      initializedRef.current = true
    } else if (groupToOpen) {
      // Auto-close semua section lain, buka hanya yang aktif
      setOpenMenus(prev => {
        const newState: Record<string, boolean> = {}
        items.forEach(item => {
          if (item.items && item.items.length > 0) {
            newState[item.title] = item.title === groupToOpen
          }
        })
        // Skip update jika state sudah sama (avoid unnecessary re-render)
        const isSame = Object.keys(newState).every(k => prev[k] === newState[k])
        return isSame ? prev : newState
      })
    }
  }, [pathname, items, isSubItemActive])

  // Close mobile sidebar when pathname changes (navigation)
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  const handleOpenChange = React.useCallback((title: string, isOpen: boolean) => {
    setOpenMenus(prev => ({
      ...prev,
      [title]: isOpen
    }))
  }, [])

  const handleDropdownChange = React.useCallback((title: string, isOpen: boolean) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [title]: isOpen
    }))
  }, [])

  return (
    <div className={cn(
      "relative flex w-full min-w-0 flex-col",
      isCollapsed ? "p-1" : "px-3 py-1"
    )}>
      <ul className={cn(
        "flex w-full min-w-0 flex-col mt-1",
        isCollapsed ? "gap-1" : "gap-1"
      )}>
        {items.map((item) => {
          // If item has submenu items, render based on collapsed state
          if (item.items && item.items.length > 0) {
            if (isCollapsed) {
              // Check if this menu is active in collapsed state
              const hasActiveSubItem = item.items.some(subItem =>
                pathname === subItem.url ||
                (subItem.url !== '/' && pathname.startsWith(subItem.url + '/'))
              )

              // Collapsed state: render as dropdown with tooltip
              return (
                <li key={item.title} className="group/menu-item relative flex justify-center">
                  <Dropdown
                    open={openDropdowns[item.title] || false}
                    onOpenChange={(isOpen: boolean) => handleDropdownChange(item.title, isOpen)}
                  >
                    <Tooltip content={item.title}>
                      <DropdownTrigger asChild>
                        <button className={cn(
                          "flex items-center justify-center rounded-lg text-sm outline-none transition-all duration-300",
                          "focus-visible:ring-2 focus-visible:ring-emerald-500",
                          "disabled:pointer-events-none disabled:opacity-50",
                          "h-10 w-10 p-0",
                          hasActiveSubItem
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        )}>
                          {item.icon && (
                            item.url === "/notifikasi" ? (
                              <NotificationIconWrapper
                                count={sidebarBadgeCount}
                                badgePosition="collapsed-sidebar"
                              >
                                <item.icon className="h-4 w-4 shrink-0" />
                              </NotificationIconWrapper>
                            ) : (
                              <item.icon className="h-4 w-4 shrink-0" />
                            )
                          )}
                        </button>
                      </DropdownTrigger>
                    </Tooltip>
                    <DropdownContent
                      className="min-w-48 rounded-lg"
                      side="right"
                      align="start"
                      sideOffset={8}
                    >
                      {item.items.map((subItem) => {
                        const isCurrentPageSub = pathname === subItem.url ||
                          (((subItem.url === "/grup" || subItem.url === "/groups") && (pathname?.startsWith("/groups/detail/") || pathname?.startsWith("/grup/detail/") || pathname?.startsWith("/grup/kelola/"))) || false)
                        return (
                          <button
                            key={subItem.title}
                            onClick={(e) => {
                              e.preventDefault()
                              console.log('Navigating to:', subItem.title, 'URL:', subItem.url)

                              // Close dropdown and navigate
                              setOpenDropdowns(prev => ({
                                ...prev,
                                [item.title]: false
                              }))

                              // Navigate with auto-close sidebar
                              handleNavigation(subItem.url)
                            }}
                            className={cn(
                              "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                              "hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 w-full",
                              "select-none",
                              isCurrentPageSub && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium"
                            )}
                          >
                            {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                            {subItem.title}
                          </button>
                        )
                      })}
                    </DropdownContent>
                  </Dropdown>
                </li>
              )
            } else {
              // Check if this menu is active (user is on one of its sub-pages)
              const hasActiveSubItem = item.items.some(subItem =>
                pathname === subItem.url ||
                (subItem.url !== '/' && pathname.startsWith(subItem.url + '/'))
              )

              // Menu tidak aktif atau aktif: selalu render sebagai collapsible biasa agar bisa ditutup
              return (
                <Collapsible
                  key={item.title}
                  open={openMenus[item.title] || hasActiveSubItem} // Buka secara default jika aktif, tapi biarkan user menutupnya
                  onOpenChange={(isOpen) => handleOpenChange(item.title, isOpen)}
                  className="group/collapsible"
                >
                  <li className="group/menu-item relative">
                    <CollapsibleTrigger asChild>
                      <button className={cn(
                        "flex w-full items-center gap-2 overflow-hidden rounded-lg p-3 text-left text-sm outline-none transition-all duration-200",
                        "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-green-500",
                        "disabled:pointer-events-none disabled:opacity-50",
                        hasActiveSubItem && "bg-gray-100 dark:bg-gray-800" // Tambahkan highlight background jika aktif
                      )}>
                        {item.icon && (
                          item.url === "/notifikasi" ? (
                            <NotificationIconWrapper
                              count={sidebarBadgeCount}
                              badgePosition="collapsed-sidebar"
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                            </NotificationIconWrapper>
                          ) : (
                            <item.icon className="h-4 w-4 shrink-0" />
                          )
                        )}
                        <span className="flex-1 truncate">{item.title}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-gray-200 dark:border-gray-700 px-2.5 py-0.5">
                        {item.items.map((subItem) => {
                          const isCurrentPageSub = pathname === subItem.url ||
                            (((subItem.url === "/grup" || subItem.url === "/groups") && (pathname?.startsWith("/groups/detail/") || pathname?.startsWith("/grup/detail/") || pathname?.startsWith("/grup/kelola/"))) || false)

                          // Check if subItem has nested items (3rd level)
                          if (subItem.items && subItem.items.length > 0) {
                            const hasActiveNestedItem = subItem.items.some(nestedItem => pathname === nestedItem.url)
                            return (
                              <Collapsible
                                key={subItem.title}
                                open={openMenus[`${item.title}-${subItem.title}`] || hasActiveNestedItem}
                                onOpenChange={(isOpen) => handleOpenChange(`${item.title}-${subItem.title}`, isOpen)}
                                className="group/nested-collapsible"
                              >
                                <li className="group/menu-sub-item relative">
                                  <div className={cn(
                                    "flex w-full h-9 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-lg px-2 text-sm transition-colors",
                                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                                    (isCurrentPageSub || hasActiveNestedItem) && "bg-gray-100 dark:bg-gray-800 font-medium"
                                  )}>
                                    {/* Clickable area for navigation (icon + text) */}
                                    <button
                                      onClick={() => handleNavigation(subItem.url)}
                                      className="flex items-center gap-2 flex-1 min-w-0 outline-none text-left focus-visible:ring-2 focus-visible:ring-green-500 rounded"
                                    >
                                      {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                                      <span className="flex-1 truncate">{subItem.title}</span>
                                    </button>
                                    {/* Collapse trigger (arrow only) */}
                                    <CollapsibleTrigger asChild>
                                      <button
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ChevronRight className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=open]/nested-collapsible:rotate-90" />
                                      </button>
                                    </CollapsibleTrigger>
                                  </div>
                                  <CollapsibleContent>
                                    <ul className="mx-3 flex min-w-0 translate-x-px flex-col gap-0.5 border-l border-gray-200 dark:border-gray-700 px-2 py-0.5">
                                      {subItem.items.map((nestedItem) => {
                                        const isCurrentPageNested = pathname === nestedItem.url
                                        return (
                                          <li key={nestedItem.title} className="group/menu-nested-item relative">
                                            <button
                                              onClick={() => {
                                                handleNavigation(nestedItem.url);
                                              }}
                                              className={cn(
                                                "flex w-full h-8 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-xs outline-none transition-colors text-left",
                                                "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-green-500",
                                                "disabled:pointer-events-none disabled:opacity-50",
                                                isCurrentPageNested && "bg-emerald-100 dark:bg-emerald-900/30 font-medium text-emerald-700 dark:text-emerald-400"
                                              )}
                                            >
                                              {nestedItem.icon && <nestedItem.icon className="h-3.5 w-3.5 shrink-0" />}
                                              <span className="flex-1 truncate">{nestedItem.title}</span>
                                            </button>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  </CollapsibleContent>
                                </li>
                              </Collapsible>
                            )
                          }

                          // Regular subItem without nested items
                          return (
                            <li key={subItem.title} className="group/menu-sub-item relative">
                              <button
                                onClick={() => {
                                  handleNavigation(subItem.url);
                                }}
                                className={cn(
                                  "flex w-full h-9 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-lg px-2 text-sm outline-none transition-colors text-left",
                                  "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-green-500",
                                  "disabled:pointer-events-none disabled:opacity-50",
                                  isCurrentPageSub && "bg-emerald-100 dark:bg-emerald-900/30 font-medium text-emerald-700 dark:text-emerald-400"
                                )}
                              >
                                {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                                <span className="flex-1 truncate">{subItem.title}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </CollapsibleContent>
                  </li>
                </Collapsible>
              )
            }
          }

          // If item has no submenu, render as direct link
          const isCurrentPage = pathname?.startsWith(item.url) || false


          return (
            <li key={item.title} className={cn(
              "group/menu-item relative flex w-full",
              isCollapsed && "flex justify-center",
              isCurrentPage && !isCollapsed && "mb-2"
            )}>
              <Tooltip content={item.title} disabled={!isCollapsed}>
                <button
                  onClick={() => {
                    handleNavigation(item.url, item.isDownloadApp);
                  }}
                  className={cn(
                    "flex items-center text-sm w-full outline-none transition-all duration-300",
                    "focus-visible:ring-2 focus-visible:ring-emerald-500",
                    "disabled:pointer-events-none disabled:opacity-50",
                    isCollapsed
                      ? cn(
                        "justify-center rounded-lg h-10 w-10 p-0",
                        isCurrentPage
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                      )
                      : cn(
                        "w-full gap-2 overflow-hidden text-left rounded-lg",
                        "hover:bg-gray-100 dark:hover:bg-gray-800",
                        isCurrentPage
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium px-3 py-2"
                          : "p-3"
                      )
                  )}
                >
                  {item.icon && (
                    item.url === "/notifikasi" ? (
                      <NotificationIconWrapper
                        count={sidebarBadgeCount}
                        badgePosition={isCollapsed ? "collapsed-sidebar" : "default"}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                      </NotificationIconWrapper>
                    ) : (
                      <item.icon className="h-4 w-4 shrink-0" />
                    )
                  )}
                  {!isCollapsed && <span className="flex-1 truncate">{item.title}</span>}
                </button>
              </Tooltip>
            </li>
          )
        })}
      </ul>
    </div>
  )
})
