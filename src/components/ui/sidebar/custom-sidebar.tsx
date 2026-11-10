"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

// Helper function to get sidebar state from cookie
function getSidebarStateFromCookie(): boolean {
  const cookieValue = getCookie(SIDEBAR_COOKIE_NAME)
  return cookieValue === 'true'
}

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

function SidebarProvider({
  defaultOpen,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  // ALWAYS start with defaultOpen ?? false on BOTH server and client
  // to avoid hydration mismatch. Cookie is read only after mount.
  const [_open, _setOpen] = React.useState<boolean>(defaultOpen ?? false)
  const open = openProp ?? _open

  // Load state from cookie ONLY on client-side mount (after hydration)
  React.useEffect(() => {
    if (openProp === undefined) {
      const cookieState = getSidebarStateFromCookie()
      if (cookieState !== null && cookieState !== (defaultOpen ?? false)) {
        _setOpen(cookieState)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      // Set cookie to keep sidebar state
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open]
  )

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  // Keyboard shortcut to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }

      // Close mobile sidebar on Escape
      if (event.key === "Escape" && isMobile && openMobile) {
        event.preventDefault()
        setOpenMobile(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar, isMobile, openMobile, setOpenMobile])

  // Prevent body scroll when mobile sidebar is open
  React.useEffect(() => {
    if (isMobile && openMobile) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isMobile, openMobile])

  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "flex min-h-screen w-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = "left",
  collapsible = "icon",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        className={cn(
          "bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 text-gray-900 dark:text-gray-100 flex h-full flex-col border-r border-gray-200 dark:border-gray-800",
          className
        )}
        style={{ width: SIDEBAR_WIDTH }}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile Overlay */}
        <div
          className={cn(
            "fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm transition-all duration-300 ease-in-out",
            openMobile ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setOpenMobile(false)}
          onTouchStart={(e) => {
            // Mencegah scroll di background saat sidebar terbuka
            if (openMobile) {
              e.preventDefault()
            }
          }}
          aria-hidden={!openMobile}
        />

        {/* Mobile Sidebar */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={cn(
            "fixed inset-y-0 left-0 z-[100] transform transition-transform duration-300 ease-out",
            "bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-800",
            "shadow-xl focus-within:outline-none overflow-hidden",
            openMobile ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ width: SIDEBAR_WIDTH_MOBILE }}
          onTouchStart={(e) => {
            const touch = e.touches[0]
            const startX = touch.clientX

            const handleTouchMove = (e: TouchEvent) => {
              const currentTouch = e.touches[0]
              const deltaX = currentTouch.clientX - startX

              // Jika swipe ke kiri lebih dari 50px, tutup sidebar
              if (deltaX < -50) {
                setOpenMobile(false)
                document.removeEventListener('touchmove', handleTouchMove)
                document.removeEventListener('touchend', handleTouchEnd)
              }
            }

            const handleTouchEnd = () => {
              document.removeEventListener('touchmove', handleTouchMove)
              document.removeEventListener('touchend', handleTouchEnd)
            }

            document.addEventListener('touchmove', handleTouchMove, { passive: false })
            document.addEventListener('touchend', handleTouchEnd)
          }}
          {...props}
        >
          <div className="flex h-full w-full flex-col overflow-hidden">{children}</div>
        </div>
      </>
    )
  }

  return (
    <div
      className={cn(
        "group peer text-gray-900 dark:text-gray-100 hidden md:block transition-all duration-200 ease-in-out",
        state === "collapsed" ? "w-12" : "w-64"
      )}
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-side={side}
      suppressHydrationWarning
    >
      {/* Sidebar gap */}
      <div
        className={cn(
          "relative bg-transparent transition-[width] duration-200 ease-in-out",
          state === "collapsed" ? "w-12" : "w-64"
        )}
        suppressHydrationWarning
      />

      {/* Sidebar container */}
      <div
        className={cn(
          "fixed inset-y-0 z-10 hidden h-screen transition-all duration-200 ease-in-out md:flex",
          side === "left" ? "left-0" : "right-0",
          state === "collapsed" ? "w-12" : "w-64",
          "border-r border-gray-200 dark:border-gray-800 shadow-sm",
          className
        )}
        suppressHydrationWarning
        {...props}
      >
        <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex h-full w-full flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-3 mt-auto border-t border-gray-200 dark:border-gray-700", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto scrollbar-hide",
        className
      )}
      style={{
        scrollbarWidth: 'none', /* Firefox */
        msOverflowStyle: 'none', /* Internet Explorer 10+ */
      }}
      {...props}
    />
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar, state } = useSidebar()

  return (
    <button
      aria-label={`${state === "collapsed" ? "Expand" : "Collapse"} sidebar`}
      tabIndex={-1}
      onClick={toggleSidebar}
      title={`${state === "collapsed" ? "Expand" : "Collapse"} sidebar`}
      className={cn(
        "absolute inset-y-0 -right-4 z-20 hidden w-4 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ease-linear sm:flex items-center justify-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
      {...props}
    >
      <div className="w-1 h-8 bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors" />
    </button>
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  useSidebar,
}
