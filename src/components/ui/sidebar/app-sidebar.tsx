"use client"

import * as React from "react"
import { NavMain } from "@/components/ui/sidebar/nav-main"
import { NavUser } from "@/components/ui/sidebar/nav-user"
import { useI18n } from "@/components/providers/i18n-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar/custom-sidebar"
import { SidebarDropdownProvider } from "./sidebar-dropdown-context"
import Image from "next/image"
import Link from "next/link"
import { NavTrigerSidebar } from "./nav-sidebar-tigger"
import { getSidebarData } from "./sidebar-data"
import { AppSidebarRtl } from "./app-sidebar-rtl"

const Logo = React.memo(function Logo() {
  const { state, isMobile } = useSidebar()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Sebelum mount: render expanded view supaya cocok dengan server HTML
  const isCollapsed = mounted ? (state === "collapsed" && !isMobile) : false

  return (
    <div className="transition-all duration-200 ease-in-out">
      {!isCollapsed ? (
        <div className="flex items-center justify-center px-4 py-3">
          <Link
            href="/dashboard"
            className="text-2xl font-cairo text-gray-700 dark:hidden tracking-tight flex items-center gap-0.5"
          >
            <Image
              src="/icons/Qurani - Logo Green.png"
              alt="Qurani"
              width={100}
              height={100}
            />
          </Link>

          <Link
            href="/dashboard"
            className="text-2xl font-cairo text-gray-700 hidden dark:flex tracking-tight items-center gap-0.5"
          >
            <Image
              src="/icons/Qurani - Logo White.png"
              alt="Qurani"
              width={100}
              height={100}
            />
          </Link>
        </div>
      ) : (
        <Link href="/dashboard" className="flex items-center justify-center mt-3">
          <Image
            src="/icons/Qurani - Icon2 Green.png"
            alt="Qurani"
            width={25}
            height={25}
            className="dark:hidden"
          />
          <Image
            src="/icons/Qurani - Icon2 White.png"
            alt="Qurani"
            width={25}
            height={25}
            className="hidden dark:block"
          />
        </Link>
      )}
    </div>
  )
})

export const AppSidebar = React.memo(function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const { t, locale } = useI18n()

  const sidebarData = React.useMemo(() => getSidebarData(t), [t])

  const dropdownContextValue = React.useMemo(
    () => ({
      isDropdownOpen,
      setIsDropdownOpen,
    }),
    [isDropdownOpen]
  )

  if (locale === "ar") {
    return <AppSidebarRtl {...props} />
  }

  return (
    <SidebarDropdownProvider value={dropdownContextValue}>
      <Sidebar collapsible="icon" {...props}>
        <div className="h-full flex flex-col">
          <SidebarHeader>
            <Logo />
          </SidebarHeader>

          <SidebarContent className="flex-1">
            <NavMain items={sidebarData.navMain} />
          </SidebarContent>

          <SidebarFooter>
            <div className="hidden md:block">
              <NavTrigerSidebar />
            </div>
            <NavUser />
          </SidebarFooter>
        </div>
      </Sidebar>
    </SidebarDropdownProvider>
  )
})
