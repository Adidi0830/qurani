import { SkeletonStatsCards } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

const rowSlots = Array.from({ length: 8 })

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-8 w-56 bg-slate-200" />

        <SkeletonStatsCards count={4} columns={4} />

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 pt-4 gap-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24 bg-slate-200 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-64 bg-slate-200 rounded-lg" />
          </div>

          <div className="hidden sm:block p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50 dark:bg-gray-800/30">
                <tr>
                  {["ID", "Tanggal", "User", "Kategori", "Nominal", "Aksi"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left"><Skeleton className="h-3 w-16 bg-slate-200" /></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rowSlots.map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-12 bg-slate-200 rounded-md" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20 bg-slate-200" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-28 bg-slate-200" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 bg-slate-200" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-lg bg-slate-200" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}