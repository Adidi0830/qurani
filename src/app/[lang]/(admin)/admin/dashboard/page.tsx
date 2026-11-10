import { AdminDashboardClient } from "@/components/admin/dashboard/admin-dashboard-client"
import { AdminDashboardError } from "@/components/admin/dashboard/admin-dashboard-error"
import type { AdminDashboardSummary } from "@/types/admin-dashboard"
import { fetchAdminDashboardSummary } from "@/utils/api/admin/dashboard/fetch"

export default async function Page() {
  let summary: AdminDashboardSummary | null = null
  let errorMessage: string | null = null

  try {
    summary = await fetchAdminDashboardSummary()
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error"
  }

  return (
    <section className="space-y-6">
      {errorMessage ? (
        <AdminDashboardError message={errorMessage} />
      ) : summary ? (
        <AdminDashboardClient summary={summary} />
      ) : null}
    </section>
  )
}