"use client"

import { Button } from "@/components/ui/button"

import { TICKET_PRIORITIES, TICKET_STATUSES } from "../model/constants"
import { getPriorityConfig, getStatusConfig } from "./ticket-badges"
import type { Translate } from "../model/types"

export interface TicketBulkModalProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    status: string
    setStatus: (value: string) => void
    priority: string
    setPriority: (value: string) => void
    t: Translate
}

export function TicketBulkModal(props: TicketBulkModalProps) {
    const { open, onClose, onConfirm, status, setStatus, priority, setPriority, t } = props

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold">{t("bulk_actions")}</h2>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">{t("status")}</label>
                        <select
                            className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="">{t("no_change", "No Change")}</option>
                            {TICKET_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {getStatusConfig(s, t).label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">{t("priority")}</label>
                        <select
                            className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                        >
                            <option value="">{t("no_change", "No Change")}</option>
                            {TICKET_PRIORITIES.map((p) => (
                                <option key={p} value={p}>
                                    {getPriorityConfig(p, t).label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                        {t("cancel")}
                    </Button>
                    <Button className="flex-1 text-white bg-emerald-600 hover:bg-emerald-700" onClick={onConfirm}>
                        {t("update")}
                    </Button>
                </div>
            </div>
        </div>
    )
}