"use client"

import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useI18n } from "@/components/providers/i18n-provider"

export function AdminDashboardError({ message }: { message: string }) {
  const { t } = useI18n()

  return (
    <Alert className="border-emerald-200 bg-emerald-50/60 text-emerald-900">
      <AlertTriangle className="h-4 w-4 text-emerald-700" />
      <AlertTitle>{t("errors.title", "Dashboard error")}</AlertTitle>
      <AlertDescription className="text-emerald-700">{message}</AlertDescription>
    </Alert>
  )
}
