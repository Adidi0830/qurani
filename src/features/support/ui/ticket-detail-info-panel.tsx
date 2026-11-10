"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Loader2, UserCheck, X } from "lucide-react"

import { cn } from "@/lib/utils"

import { TICKET_PRIORITIES } from "../model/constants"
import type { AssigneeUser, TicketListItem, Translate } from "../model/types"
import { useTicketAssignee } from "../hooks/use-ticket-detail"
import { useTicketTags } from "../hooks/use-ticket-collections"
import { getDepartmentLabel, getStatusConfig } from "./ticket-badges"

interface TicketDetailInfoPanelProps {
    ticket: TicketListItem
    status: string
    priority: string
    show: boolean
    onClose: () => void
    onPriorityChange: (priority: string) => Promise<boolean>
    adminUsers: AssigneeUser[]
    isLoadingAdmins: boolean
    onSaved: () => void
    t: Translate
}

/** Panel kanan: status, prioritas, detail, tag, dan assignee. */
export default function TicketDetailInfoPanel({
    ticket,
    status,
    priority,
    show,
    onClose,
    onPriorityChange,
    adminUsers,
    isLoadingAdmins,
    onSaved,
    t,
}: TicketDetailInfoPanelProps) {
    const statusConfig = getStatusConfig(status, t)
    const { tags, addTag, removeLast, removeTag } = useTicketTags(String(ticket.id))
    const { selected: selectedAssignee, isSaving, assign } = useTicketAssignee(ticket.id)

    const [tagInput, setTagInput] = useState("")
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
    const [assigneeSearch, setAssigneeSearch] = useState("")
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Tutup dropdown saat klik di luar.
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowAssigneeDropdown(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault()
            addTag(tagInput)
            setTagInput("")
        }
        if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
            removeLast()
        }
    }

    const filteredUsers = adminUsers.filter(
        (user) =>
            user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
            user.email.toLowerCase().includes(assigneeSearch.toLowerCase()),
    )

    const handleSelectAssignee = async (user: AssigneeUser) => {
        const ok = await assign(user, ticket)
        if (ok) {
            setShowAssigneeDropdown(false)
            onSaved()
        }
    }

    return (
        <aside
            className={cn(
                "w-[320px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto transition-transform duration-300 absolute lg:static inset-y-0 right-0 z-30 shadow-2xl lg:shadow-none",
                show ? "translate-x-0" : "translate-x-full lg:translate-x-0",
            )}
        >
            <div className="p-4 space-y-6">
                <div className="lg:hidden flex justify-end mb-2">
                    <button onClick={onClose}>
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* STATUS & PRIORITY */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-3 space-y-4">
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("detail.status", "Status")}
                        </span>
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm",
                                statusConfig.className,
                            )}
                        >
                            {statusConfig.icon}
                            <span className="font-semibold">{statusConfig.label}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("detail.priority", "Priority")}
                        </span>
                        <div className="inline-flex w-full rounded-md bg-gray-100 dark:bg-gray-900 p-0.5 gap-1">
                            {TICKET_PRIORITIES.map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => onPriorityChange(level)}
                                    className={cn(
                                        "flex-1 px-2 py-1.5 text-xs font-medium rounded-md border border-transparent transition-colors",
                                        priority === level
                                            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border-gray-200 dark:border-gray-700"
                                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
                                    )}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* DETAILS */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-3 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("detail.details", "Details")}
                    </h4>
                    <dl className="text-xs">
                        <div className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-x-3 py-1.5">
                            <dt className="text-gray-500">{t("detail.department", "Department")}</dt>
                            <dd className="font-medium text-gray-900 dark:text-gray-100 text-right justify-self-end min-w-0 truncate">
                                {getDepartmentLabel(ticket.department, ticket.department || "-")}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* TAGS */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-3 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("detail.tags", "Tags")}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 min-h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-[11px] rounded-md flex items-center gap-1"
                            >
                                {tag}
                                <button onClick={() => removeTag(tag)} className="text-gray-500 hover:text-red-500">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        <input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder={
                                tags.length > 0
                                    ? t("tags.add_more", "Tambah tag...")
                                    : t("tags.placeholder", "Type tag and press Enter...")
                            }
                            className="h-6 flex-1 min-w-[120px] border-0 bg-transparent text-xs outline-none placeholder:text-gray-400"
                        />
                    </div>
                </div>

                {/* ASSIGNEE */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                        {t("detail.assignee", "Assignee")}
                        {isSaving && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
                    </h4>
                    <div className="relative" ref={dropdownRef}>
                        <div
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                        >
                            {selectedAssignee ? (
                                <>
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                        {selectedAssignee.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm truncate flex-1">{selectedAssignee.name}</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
                                        <UserCheck className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm text-gray-400 italic flex-1">
                                        {t("detail.unassigned", "Unassigned")}
                                    </span>
                                </>
                            )}
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>

                        {showAssigneeDropdown && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 flex flex-col">
                                <div className="p-2 sticky top-0 bg-white dark:bg-gray-900 border-b z-10">
                                    <input
                                        type="text"
                                        placeholder={t("detail.search_staff", "Search staff...")}
                                        value={assigneeSearch}
                                        onChange={(e) => setAssigneeSearch(e.target.value)}
                                        className="w-full text-xs p-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                                <div className="overflow-y-auto p-1 flex-1">
                                    {filteredUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            onClick={() => handleSelectAssignee(user)}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm rounded"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="truncate flex-1">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {user.name}
                                                </p>
                                                <p className="text-[10px] text-gray-500">{user.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoadingAdmins && (
                                        <div className="p-3 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {t("detail.loading_admins", "Loading admins...")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    )
}