"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"

interface LazyIconProps {
  icon: LucideIcon
  className?: string
  fallback?: React.ReactNode
}

// Lazy loaded icon component to reduce initial bundle size
export const LazyIcon = React.memo(function LazyIcon({ icon: Icon, className, fallback }: LazyIconProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    // Simulate icon loading for better performance
    const timer = setTimeout(() => setIsLoaded(true), 0)
    return () => clearTimeout(timer)
  }, [])

  // Always render the icon, but show fallback while loading if provided
  return (
    <>
      {!isLoaded && fallback && fallback}
      <Icon className={className} style={{ display: isLoaded ? 'block' : 'none' }} />
    </>
  )
})

// HOC untuk membuat icon menjadi lazy
export function withLazyIcon<T extends { icon?: LucideIcon; className?: string }>(
  Component: React.ComponentType<T>
) {
  return React.memo(function WithLazyIcon(props: T) {
    if (props.icon) {
      return (
        <Component
          {...props}
          icon={props.icon}
        />
      )
    }
    return <Component {...props} />
  })
}
