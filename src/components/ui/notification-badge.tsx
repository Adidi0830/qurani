"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface NotificationBadgeProps {
  count: number
  className?: string
  size?: "sm" | "md" | "lg"
  maxCount?: number
  position?: "default" | "collapsed-sidebar"
}

export function NotificationBadge({ 
  count, 
  className, 
  size = "sm",
  maxCount = 99,
  position = "default"
}: NotificationBadgeProps) {
  if (count <= 0) return null

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()
  console.log('Badge rendered with count:', count) // Debug log

  const sizeClasses = {
    sm: "h-4 w-4 text-xs min-w-4",
    md: "h-5 w-5 text-xs min-w-5", 
    lg: "h-6 w-6 text-sm min-w-6"
  }

  const positionClasses = {
    default: "-top-0 left-45", // Badge di pojok kanan atas untuk sidebar expanded
    "collapsed-sidebar": "-top-4 -right-3" // Geser lebih ke atas dan ke kanan sampai hampir keluar container
  }

  return (
    <span 
      className={cn(
        "absolute inline-flex items-center justify-center",
        "bg-red-500 text-white font-bold rounded-full",
        "border-2 border-red-600 dark:border-red-400",
        "z-10 shadow-sm",
        sizeClasses[size],
        positionClasses[position],
        className
      )}
    >
      {displayCount}
    </span>
  )
}

interface NotificationIconWrapperProps {
  children: React.ReactNode
  count: number
  className?: string
  badgeSize?: "sm" | "md" | "lg"
  badgePosition?: "default" | "collapsed-sidebar"
}

export function NotificationIconWrapper({ 
  children, 
  count, 
  className,
  badgeSize = "sm",
  badgePosition = "default"
}: NotificationIconWrapperProps) {
  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      <NotificationBadge count={count} size={badgeSize} position={badgePosition} />
    </div>
  )
}
