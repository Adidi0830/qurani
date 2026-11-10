"use client"

import { memo, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SmoothButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export const SmoothButton = memo(forwardRef<HTMLButtonElement, SmoothButtonProps>(
  function SmoothButton({ isLoading, loadingText, children, className, disabled, ...props }, ref) {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "transition-all duration-200 transform hover:scale-105 active:scale-95",
          "disabled:transform-none disabled:hover:scale-100",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-1.5">
          {isLoading && (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          )}
          <span className={cn(
            "transition-opacity duration-150",
            isLoading && loadingText ? "opacity-0" : "opacity-100"
          )}>
            {children}
          </span>
          {isLoading && loadingText && (
            <span className="absolute inset-0 flex items-center justify-center">
              {loadingText}
            </span>
          )}
        </div>
      </Button>
    )
  }
))

SmoothButton.displayName = "SmoothButton"
