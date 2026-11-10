import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonDetailPageProps {
  showAvatar?: boolean
  infoRows?: number
  showActions?: boolean
  className?: string
}

export function SkeletonDetailPage({
  showAvatar = false,
  infoRows = 6,
  showActions = true,
  className = "",
}: SkeletonDetailPageProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 bg-slate-200" />
              <Skeleton className="h-5 w-40 bg-slate-200" />
            </div>
            {showActions && (
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 bg-slate-200 rounded-lg" />
                <Skeleton className="h-9 w-20 bg-slate-200 rounded-lg" />
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {showAvatar && (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full bg-slate-200" />
              <Skeleton className="h-4 w-32 bg-slate-200" />
            </div>
          )}

          <div className="space-y-4">
            {Array.from({ length: infoRows }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <Skeleton className="h-3 w-24 bg-slate-200" />
                <Skeleton
                  className="h-4 bg-slate-200"
                  style={{ width: `${40 + Math.random() * 30}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
