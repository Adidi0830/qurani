"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

import { TICKET_DEPARTMENTS, TICKET_PRIORITIES, TICKET_STATUSES } from "../model/constants"
import type { TicketPriority, TicketStatus, Translate } from "../model/types"
import { getPriorityConfig, getStatusConfig } from "./ticket-badges"

export interface TicketFilterModalProps {
    open: boolean
    onClose: () => void
    t: Translate

    tempStatus: TicketStatus[]
    setTempStatus: (next: TicketStatus[]) => void
    tempPriority: TicketPriority[]
    setTempPriority: (next: TicketPriority[]) => void
    tempDepartment: string[]
    setTempDepartment: (next: string[]) => void

    onClearTemp: () => void
    onApply: () => void
}

function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function TicketFilterModal(props: TicketFilterModalProps) {
    const {
        open,
        onClose,
        t,
        tempStatus,
        setTempStatus,
        tempPriority,
        setTempPriority,
        tempDepartment,
        setTempDepartment,
        onClearTemp,
        onApply,
    } = props

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">{t("filters")}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">{t("department")}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TICKET_DEPARTMENTS.map((dept) => (
                                <label
                                    key={dept}
                                    className={cn(
                                        "flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                                        tempDepartment.includes(dept)
                                            ? "border-emerald-500 bg-emerald-50"
                                            : "border-gray-200",
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        className="rounded accent-emerald-600"
                                        checked={tempDepartment.includes(dept)}
                                        onChange={() => setTempDepartment(toggle(tempDepartment, dept))}
                                    />
                                    <span className="text-sm">{dept}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold">{t("status")}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TICKET_STATUSES.map((status) => (
                                <label
                                    key={status}
                                    className={cn(
                                        "flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                                        tempStatus.includes(status)
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                            : "border-gray-200 dark:border-gray-700",
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        className="rounded accent-emerald-600"
                                        checked={tempStatus.includes(status)}
                                        onChange={() => setTempStatus(toggle(tempStatus, status))}
                                    />
                                    <span className="text-sm">{getStatusConfig(status, t).label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold">{t("priority")}</label>
                        <div className="flex gap-2">
                            {TICKET_PRIORITIES.map((priority) => {
                                const active = tempPriority.includes(priority)
                                return (
                                    <label
                                        key={priority}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                                            active
                                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                                : "border-gray-200 dark:border-gray-700",
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={active}
                                            onChange={() => setTempPriority(toggle(tempPriority, priority))}
                                        />
                                        <span
                                            className={cn(
                                                "text-sm font-medium",
                                                active ? "text-emerald-700" : "text-gray-600",
                                            )}
                                        >
                                            {getPriorityConfig(priority, t).label}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={onClearTemp}>
                        {t("clear")}
                    </Button>
                    <Button onClick={onApply} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {t("apply")}
                    </Button>
                </div>
            </div>
        </div>
    )
}