"use client"

import { useSidebar } from "@/components/ui/sidebar/custom-sidebar"
import { useI18n } from "@/components/providers/i18n-provider"
import * as React from "react"
import { PanelLeftIcon } from "lucide-react"

export const NavTrigerSidebar = React.memo(function NavUser() {
  const { t } = useI18n()
  const { state, isMobile, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile // Di mobile, tidak pernah collapsed

  // Prevent hydration mismatch: sidebar state depends on cookie & window width
  // which are only available on the client
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    // Render placeholder yang sama di server & client → no mismatch
    return (
      <div className="flex items-center gap-2 p-2 border border-gray-500 dark:border-gray-600 rounded-lg">
        <PanelLeftIcon className="h-4 w-4" />
        <span className="text-sm opacity-0">‎</span>
      </div>
    )
  }

  return (
    <>
      {isCollapsed ? (
        <div
          className="group/menu-item relative flex justify-center cursor-pointer"
          onClick={() => toggleSidebar()}>
          <PanelLeftIcon className="h-4 w-4" />
        </div>
      ) : (
        // Expanded state: full dropdown with manual implementation
        <div className="flex items-center gap-2 p-2 border border-gray-500 dark:border-gray-600 hover:text-emerald-500 dark:hover:border-emerald-500 hover:border-emerald-500 rounded-lg transition-all duration-300 cursor-pointer"
          onClick={() =>
            toggleSidebar()
          }
        >
          <PanelLeftIcon className="h-4 w-4" />
          <span className="text-sm">{t('navigation.close_sidebar', 'Tutup Sidebar')}</span>
        </div>
      )}
    </>
  )
})
