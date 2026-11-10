import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonStatsCardsProps {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}

const gridCols = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "lg:grid-cols-4",
}

export function SkeletonStatsCards({
  count = 4,
  columns = 4,
  className = "",
}: SkeletonStatsCardsProps) {
  return (
    <div className={`grid grid-cols-1 ${gridCols[columns]} gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 bg-slate-200" />
              <Skeleton className="h-7 w-16 bg-slate-200" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
