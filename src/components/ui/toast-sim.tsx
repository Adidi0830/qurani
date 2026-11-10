"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react"

export type ToastType = "success" | "error" | "info"

export interface ToastItem {
    id: number
    type: ToastType
    title: string
    message?: string
    endpoint?: string // API endpoint label for simulation context
}

let _addToast: ((t: Omit<ToastItem, "id">) => void) | null = null

/** Call from anywhere (without hooks) */
export function showToast(t: Omit<ToastItem, "id">) {
    _addToast?.(t)
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    useEffect(() => {
        _addToast = (t) => {
            const id = Date.now()
            setToasts(prev => [...prev, { ...t, id }])
            setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000)
        }
        return () => { _addToast = null }
    }, [])

    function dismiss(id: number) {
        setToasts(prev => prev.filter(x => x.id !== id))
    }

    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map(t => {
                const cfg = {
                    success: {
                        bg: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800",
                        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />,
                        title: "text-emerald-800 dark:text-emerald-200",
                    },
                    error: {
                        bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
                        icon: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />,
                        title: "text-red-800 dark:text-red-200",
                    },
                    info: {
                        bg: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800",
                        icon: <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />,
                        title: "text-emerald-800 dark:text-emerald-200",
                    },
                }[t.type]

                return (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-bottom-2 fade-in ${cfg.bg}`}
                    >
                        {cfg.icon}
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold leading-tight ${cfg.title}`}>{t.title}</p>
                            {t.message && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{t.message}</p>
                            )}
                        </div>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
