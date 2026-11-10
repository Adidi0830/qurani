import { Suspense } from "react"
import { GrupSaya } from "@/components/dashboard/grup/grup-saya"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GrupSaya />
    </Suspense>
  )
}