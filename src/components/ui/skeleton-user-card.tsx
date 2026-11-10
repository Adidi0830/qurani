"use client"

import { memo } from "react"

interface SkeletonUserCardProps {
  count?: number
}

const SkeletonUserCard = memo(function SkeletonUserCard() {
  return (
    <div className="animate-pulse flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-slate-600 last:border-b-0">
      <div className="flex items-center gap-3 flex-1">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0" />
        
        <div className="min-w-0 flex-1">
          {/* Name skeleton */}
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-32 mb-1" />
          {/* Username skeleton */}
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-24" />
        </div>
      </div>
      
      {/* Button skeleton */}
      <div className="flex gap-1 flex-shrink-0">
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-md" />
      </div>
    </div>
  )
})

export function SkeletonUserList({ count = 5 }: SkeletonUserCardProps) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonUserCard key={index} />
      ))}
    </div>
  )
}

export { SkeletonUserCard }
