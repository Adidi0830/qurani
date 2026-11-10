import { Skeleton } from "@/components/ui/skeleton"

const cardSlots = Array.from({ length: 4 })
const chartSlots = Array.from({ length: 4 })

export default function Loading() {
  return (
      <section className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 bg-slate-200" />
          <Skeleton className="h-4 w-80 bg-slate-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cardSlots.map((_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-6">
              <Skeleton className="h-4 w-24 bg-slate-200" />
              <Skeleton className="mt-4 h-8 w-20 bg-slate-200" />
              <Skeleton className="mt-6 h-8 w-8 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {chartSlots.map((_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-6">
              <Skeleton className="h-4 w-32 bg-slate-200" />
              <Skeleton className="mt-6 h-64 w-full bg-slate-200" />
            </div>
          ))}
        </div>
      </section>
  )
}
