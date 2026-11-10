import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const overlayVariants = cva(
  "fixed inset-0 z-50 flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-background/80 backdrop-blur-sm",
        dark: "bg-black/50 backdrop-blur-sm",
        light: "bg-white/80 backdrop-blur-sm",
        transparent: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface LoadingOverlayProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof overlayVariants> {
  isOpen?: boolean
  message?: string
  showSpinner?: boolean
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ 
    className, 
    variant, 
    isOpen = false, 
    message = "Loading...", 
    showSpinner = true,
    ...props 
  }, ref) => {
    if (!isOpen) return null

    return (
      <div
        ref={ref}
        className={cn(overlayVariants({ variant }), className)}
        {...props}
      >
        <div className="flex flex-col items-center space-y-4 rounded-lg bg-card p-6 shadow-lg">
          {showSpinner && <Spinner size="lg" />}
          {message && (
            <p className="text-sm font-medium text-foreground">{message}</p>
          )}
        </div>
      </div>
    )
  }
)
LoadingOverlay.displayName = "LoadingOverlay"

export { LoadingOverlay, overlayVariants }
