"use client"

import * as React from "react"
import { PanelLeftIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "./custom-sidebar"

interface SidebarTriggerProps extends React.ComponentProps<"button"> {
  notificationCount?: number
}

function SidebarTrigger({
  className,
  onClick,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notificationCount = 0,
  ...props
}: SidebarTriggerProps) {
  const { toggleSidebar, openMobile, isMobile } = useSidebar()
  
  // Debug logging (optional - can be removed in production)
  // console.log('SidebarTrigger - isMobile:', isMobile, 'notificationCount:', notificationCount)

  return (
    <div className="relative">
      <button
        aria-label={isMobile ? (openMobile ? "Close navigation menu" : "Open navigation menu") : "Toggle sidebar"}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-green-500 disabled:pointer-events-none disabled:opacity-50",
          "h-7 w-7",
          className
        )}
        onClick={(event) => {
          onClick?.(event)
          toggleSidebar()
        }}
        {...props}
      >
        <PanelLeftIcon className="h-4 w-4" />
        <span className="sr-only">
          {isMobile ? (openMobile ? "Close navigation menu" : "Open navigation menu") : "Toggle sidebar"}
        </span>
      </button>
      
      {/* Badge moved to dashboard layout for better control */}
    </div>
  )
}

export { SidebarTrigger }
