"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface DropdownProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DropdownTriggerProps {
  asChild?: boolean
  className?: string
  children: React.ReactNode
}

interface DropdownContentProps {
  className?: string
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  sideOffset?: number
  children: React.ReactNode
}

interface DropdownItemProps {
  className?: string
  onClick?: () => void
  children: React.ReactNode
}

const DropdownContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
} | null>(null)

function useDropdown() {
  const context = React.useContext(DropdownContext)
  if (!context) {
    throw new Error("useDropdown must be used within Dropdown")
  }
  return context
}

function Dropdown({ open: controlledOpen, onOpenChange, children }: DropdownProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = React.useCallback((newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }, [onOpenChange])

  // Optimized event handlers with useCallback
  const handleEscape = React.useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false)
    }
  }, [open, setOpen])

  const handleClickOutside = React.useCallback((e: MouseEvent) => {
    if (open && triggerRef.current && contentRef.current) {
      const target = e.target as Node
      const isClickInsideTrigger = triggerRef.current.contains(target)
      const isClickInsideContent = contentRef.current.contains(target)
      
      if (!isClickInsideTrigger && !isClickInsideContent) {
        setOpen(false)
      }
    }
  }, [open, setOpen])

  // Combined effect for better performance
  React.useEffect(() => {
    if (!open) return

    document.addEventListener("keydown", handleEscape, { passive: true })
    document.addEventListener("mousedown", handleClickOutside, { passive: true })
    
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, handleEscape, handleClickOutside])

  const contextValue = React.useMemo(() => ({
    open,
    setOpen,
    triggerRef,
    contentRef
  }), [open, setOpen])

  return (
    <DropdownContext.Provider value={contextValue}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

const DropdownTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ asChild = false, className, children, ...props }, ref) => {
  const { open, setOpen, triggerRef } = useDropdown()
  
  const handleClick = React.useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  const buttonRef = React.useRef<HTMLButtonElement>(null)

  React.useImperativeHandle(ref, () => buttonRef.current!)

  React.useEffect(() => {
    if (buttonRef.current) {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = buttonRef.current
    }
  }, [triggerRef])

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ref: (element: HTMLElement | null) => {
        (triggerRef as React.MutableRefObject<HTMLElement | null>).current = element
        if (ref && typeof ref === 'function') {
          ref(element as HTMLButtonElement)
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current = element as HTMLButtonElement
        }
      },
      onClick: handleClick,
      className: cn((children.props as Record<string, unknown>)?.className as string, className),
      "aria-expanded": open,
      "aria-haspopup": "menu",
    })
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      className={className}
      aria-expanded={open}
      aria-haspopup="menu"
      {...props}
    >
      {children}
    </button>
  )
})

DropdownTrigger.displayName = "DropdownTrigger"

function DropdownContent({ 
  className, 
  side = "bottom",
  align = "start",
  sideOffset = 4,
  children,
  ...props 
}: DropdownContentProps & React.HTMLAttributes<HTMLDivElement>) {
  const { open, triggerRef, contentRef } = useDropdown()
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  // Debounced position calculation for better performance
  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current || !contentRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let top = 0
    let left = 0

    // Calculate position based on side
    switch (side) {
      case "top":
        top = triggerRect.top - contentRect.height - sideOffset
        break
      case "bottom":
        top = triggerRect.bottom + sideOffset
        break
      case "left":
        left = triggerRect.left - contentRect.width - sideOffset
        top = triggerRect.top
        break
      case "right":
        left = triggerRect.right + sideOffset
        top = triggerRect.top
        break
    }

    // Calculate alignment
    if (side === "top" || side === "bottom") {
      switch (align) {
        case "start":
          left = triggerRect.left
          break
        case "center":
          left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2
          break
        case "end":
          left = triggerRect.right - contentRect.width
          break
      }
    }

    // Viewport boundary checks
    if (left + contentRect.width > viewport.width) {
      left = viewport.width - contentRect.width - 8
    }
    if (left < 8) {
      left = 8
    }
    if (top + contentRect.height > viewport.height) {
      top = triggerRect.top - contentRect.height - sideOffset
    }
    if (top < 8) {
      top = 8
    }

    setPosition({ top, left })
  }, [side, align, sideOffset, triggerRef, contentRef])

  const debouncedCalculatePosition = useDebounce(calculatePosition, 16) // ~60fps

  React.useLayoutEffect(() => {
    if (!open) return

    calculatePosition()
    
    window.addEventListener('scroll', debouncedCalculatePosition, { passive: true })
    window.addEventListener('resize', debouncedCalculatePosition, { passive: true })

    return () => {
      window.removeEventListener('scroll', debouncedCalculatePosition)
      window.removeEventListener('resize', debouncedCalculatePosition)
    }
  }, [open, calculatePosition, debouncedCalculatePosition])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        "fixed z-50 min-w-[8rem] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        side === "top" && "slide-in-from-bottom-2",
        side === "bottom" && "slide-in-from-top-2",
        side === "left" && "slide-in-from-right-2",
        side === "right" && "slide-in-from-left-2",
        className
      )}
      style={{ 
        top: position.top,
        left: position.left,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownItem({ 
  className, 
  onClick,
  children,
  ...props 
}: DropdownItemProps & React.HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = useDropdown()

  const handleClick = React.useCallback(() => {
    onClick?.()
    setOpen(false)
  }, [onClick, setOpen])

  return (
    <div
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800",
        "select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-gray-200 dark:bg-gray-700 -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

export { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator }
