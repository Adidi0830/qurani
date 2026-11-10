import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonTableProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  showSearch?: boolean
  showPagination?: boolean
  className?: string
}

export function SkeletonTable({
  rows = 5,
  columns = 5,
  showHeader = true,
  showSearch = true,
  showPagination = true,
  className = "",
}: SkeletonTableProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 bg-slate-200" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 bg-slate-200 rounded-lg" />
            <Skeleton className="h-9 w-32 bg-slate-200 rounded-lg" />
          </div>
        </div>
      )}

      {showSearch && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64 bg-slate-200 rounded-lg" />
          <Skeleton className="h-9 w-20 bg-slate-200 rounded-lg" />
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="px-5 py-3.5 text-left">
                    <Skeleton className="h-3 w-20 bg-slate-200" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50/50">
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <td key={colIndex} className="px-5 py-4">
                      <Skeleton
                        className="h-4 bg-slate-200"
                        style={{ width: `${60 + Math.random() * 30}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showPagination && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/30">
            <Skeleton className="h-3 w-40 bg-slate-200" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 bg-slate-200 rounded-lg" />
              <Skeleton className="h-8 w-8 bg-slate-200 rounded-lg" />
              <Skeleton className="h-8 w-8 bg-slate-200 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
