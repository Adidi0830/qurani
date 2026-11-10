"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex w-full flex-1 flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800",
        className
      )}
      {...props}
    />
  )
}

export { SidebarInset }
