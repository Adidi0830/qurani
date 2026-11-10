"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: React.ReactNode
}

interface CollapsibleTriggerProps {
  asChild?: boolean
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

interface CollapsibleContentProps {
  className?: string
  children: React.ReactNode
}

const CollapsibleContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

function useCollapsible() {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error("useCollapsible must be used within Collapsible")
  }
  return context
}

function Collapsible({ 
  open: controlledOpen, 
  onOpenChange, 
  className, 
  children,
  ...props 
}: CollapsibleProps & React.HTMLAttributes<HTMLDivElement>) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = React.useCallback((newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }, [onOpenChange])

  const contextValue = React.useMemo(() => ({
    open,
    setOpen
  }), [open, setOpen])

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div 
        className={cn("group/collapsible", className)}
        data-state={open ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ asChild = false, className, children, onClick, ...props }, ref) => {
  const { open, setOpen } = useCollapsible()
  
  const handleClick = React.useCallback(() => {
    setOpen(!open)
    onClick?.()
  }, [open, setOpen, onClick])

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      onClick: handleClick,
      ref,
      className: cn((children.props as Record<string, unknown>)?.className as string, className),
    })
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
})

CollapsibleTrigger.displayName = "CollapsibleTrigger"

function CollapsibleContent({ 
  className, 
  children,
  ...props 
}: CollapsibleContentProps & React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useCollapsible()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | undefined>(open ? undefined : 0)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const animationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useLayoutEffect(() => {
    if (!contentRef.current || !innerRef.current) return

    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }

    const contentHeight = innerRef.current.scrollHeight
    setIsAnimating(true)

    if (open) {
      // Opening animation
      setHeight(0)
      requestAnimationFrame(() => {
        setHeight(contentHeight)
      })
      
      // Reset to auto after animation completes
      animationTimeoutRef.current = setTimeout(() => {
        setHeight(undefined)
        setIsAnimating(false)
      }, 250)
    } else {
      // Closing animation
      setHeight(contentHeight)
      requestAnimationFrame(() => {
        setHeight(0)
      })

      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false)
      }, 250)
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [open])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={contentRef}
      className={cn(
        "overflow-hidden transition-[height] duration-250 ease-out",
        !open && !isAnimating && "hidden",
        className
      )}
      style={{ height }}
      data-state={open ? "open" : "closed"}
      {...props}
    >
      <div ref={innerRef} className="pb-2">
        {children}
      </div>
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
