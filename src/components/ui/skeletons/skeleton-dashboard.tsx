import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonDashboardProps {
  statCount?: number
  chartCount?: number
  className?: string
}

export function SkeletonDashboard({
  statCount = 4,
  chartCount = 4,
  className = "",
}: SkeletonDashboardProps) {
  return (
    <section className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 bg-slate-200" />
        <Skeleton className="h-4 w-80 bg-slate-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: statCount }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-3 w-24 bg-slate-200" />
              <Skeleton className="h-10 w-10 rounded-xl bg-slate-200" />
            </div>
            <Skeleton className="h-8 w-20 bg-slate-200" />
            <Skeleton className="mt-3 h-3 w-16 bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: chartCount }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-32 bg-slate-200" />
              <Skeleton className="h-3 w-16 bg-slate-200" />
            </div>
            <Skeleton className="h-64 w-full bg-slate-200 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  )
}
