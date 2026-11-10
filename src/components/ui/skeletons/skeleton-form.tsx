import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonFormPageProps {
  fields?: number
  showAvatar?: boolean
  className?: string
}

export function SkeletonFormPage({
  fields = 6,
  showAvatar = false,
  className = "",
}: SkeletonFormPageProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 bg-slate-200" />
              <Skeleton className="h-5 w-40 bg-slate-200" />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {showAvatar && (
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-20 w-20 rounded-full bg-slate-200" />
              <Skeleton className="h-8 w-32 bg-slate-200 rounded-lg" />
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20 bg-slate-200" />
                <Skeleton className="h-10 w-full bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Skeleton className="h-10 w-24 bg-slate-200 rounded-lg" />
            <Skeleton className="h-10 w-28 bg-slate-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
