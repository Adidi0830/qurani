"use client"

import { cn } from "@/lib/utils"

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  className?: string;
}

/**
 * Simple Online/Offline Indicator Component
 * 
 * @example
 * ```tsx
 * <OnlineIndicator isOnline={true} />
 * <OnlineIndicator isOnline={false} withText />
 * <OnlineIndicator isOnline={true} size="lg" />
 * ```
 */
export function OnlineIndicator({ 
  isOnline, 
  size = 'md', 
  withText = false,
  className 
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  if (withText) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div 
          className={cn(
            "rounded-full",
            sizeClasses[size],
            isOnline 
              ? "bg-green-500 animate-pulse" 
              : "bg-gray-400"
          )}
        />
        <span className={cn(
          textSizeClasses[size],
          isOnline ? "text-green-600 dark:text-green-400" : "text-gray-500"
        )}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "rounded-full",
        sizeClasses[size],
        isOnline 
          ? "bg-green-500 animate-pulse" 
          : "bg-gray-400",
        className
      )}
      title={isOnline ? 'Online' : 'Offline'}
    />
  )
}

/**
 * Online Badge for Avatar - Absolute positioned indicator
 * 
 * @example
 * ```tsx
 * <div className="relative">
 *   <Avatar />
 *   <OnlineBadge isOnline={true} />
 * </div>
 * ```
 */
export function OnlineBadge({ 
  isOnline, 
  size = 'md' 
}: { 
  isOnline: boolean; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const sizeClasses = {
    sm: 'w-3 h-3 border',
    md: 'w-4 h-4 border-2',
    lg: 'w-5 h-5 border-2'
  }

  const positionClasses = {
    sm: 'bottom-0 right-0',
    md: 'bottom-0.5 right-0.5',
    lg: 'bottom-1 right-1'
  }

  return (
    <div 
      className={cn(
        "absolute rounded-full border-white dark:border-gray-800",
        sizeClasses[size],
        positionClasses[size],
        isOnline 
          ? "bg-green-500 animate-pulse" 
          : "bg-gray-400"
      )}
      title={isOnline ? 'Online' : 'Offline'}
    />
  )
}
