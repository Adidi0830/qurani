"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  delayDuration?: number
  disabled?: boolean
}

function Tooltip({ 
  children, 
  content, 
  side = "right", 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  align = "center",
  delayDuration = 300,
  disabled = false 
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const showTooltip = React.useCallback(() => {
    if (disabled) return
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delayDuration)
  }, [disabled, delayDuration])

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }, [])

  // Optimized position calculation with useCallback and debouncing
  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let top = 0
    let left = 0

    // Calculate position based on side
    switch (side) {
      case "top":
        top = triggerRect.top - tooltipRect.height - 8
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        break
      case "bottom":
        top = triggerRect.bottom + 8
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        break
      case "left":
        left = triggerRect.left - tooltipRect.width - 8
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
      case "right":
        left = triggerRect.right + 8
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
    }

    // Viewport boundary checks
    if (left + tooltipRect.width > viewport.width) {
      left = viewport.width - tooltipRect.width - 8
    }
    if (left < 8) {
      left = 8
    }
    if (top + tooltipRect.height > viewport.height) {
      top = viewport.height - tooltipRect.height - 8
    }
    if (top < 8) {
      top = 8
    }

    setPosition({ top, left })
  }, [side])

  const debouncedCalculatePosition = useDebounce(calculatePosition, 16)

  React.useLayoutEffect(() => {
    if (!isVisible) return

    calculatePosition()
    
    // Add scroll and resize listeners with debouncing for better performance
    window.addEventListener('scroll', debouncedCalculatePosition, { passive: true })
    window.addEventListener('resize', debouncedCalculatePosition, { passive: true })

    return () => {
      window.removeEventListener('scroll', debouncedCalculatePosition)
      window.removeEventListener('resize', debouncedCalculatePosition)
    }
  }, [isVisible, calculatePosition, debouncedCalculatePosition])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      className="w-full"
    >
      {children}
      
      {isVisible && content && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "fixed z-50 overflow-hidden rounded-md bg-gray-900 dark:bg-gray-100 px-3 py-1.5 text-xs text-white dark:text-gray-900",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            "shadow-md border border-gray-200 dark:border-gray-700"
          )}
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export { Tooltip }
