"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface SmartPaginationProps {
    /** Total number of items across all pages */
    total: number
    /** Current page number (1-indexed) */
    page: number
    /** Number of items per page */
    pageSize: number
    /** Called when user navigates to a different page */
    onPageChange: (page: number) => void
    /** Called when user changes rows-per-page */
    onPageSizeChange: (size: number) => void
    /** Available options for rows-per-page dropdown. Default: [5, 10, 25, 50] */
    pageSizeOptions?: number[]
    /** When true, hides the component */
    loading?: boolean
}

/**
 * Full-featured pagination bar matching the reference design:
 *   "Menampilkan 1–10 dari 101 data  Baris: [10 ▾]   ‹  [1] 2  3  4  5  ›"
 */
export function SmartPagination({
    total,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [5, 10, 25, 50],
    loading = false,
}: SmartPaginationProps) {
    if (loading || total === 0) return null

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const from = Math.min((page - 1) * pageSize + 1, total)
    const to = Math.min(page * pageSize, total)

    // Build page number list with ellipsis: always show at most 5 page buttons
    function getPageNumbers(): (number | "...")[] {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }
        const pages: (number | "...")[] = []
        if (page <= 4) {
            // Near start: 1 2 3 4 5 ... N
            pages.push(1, 2, 3, 4, 5, "...", totalPages)
        } else if (page >= totalPages - 3) {
            // Near end: 1 ... N-4 N-3 N-2 N-1 N
            pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
        } else {
            // Middle: 1 ... page-1 page page+1 ... N
            pages.push(1, "...", page - 1, page, page + 1, "...", totalPages)
        }
        return pages
    }

    const pageNumbers = getPageNumbers()

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Left: info label */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Menampilkan{" "}
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                        {from}–{to}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{total}</span>{" "}
                    data
                </span>

                {/* Rows per page dropdown */}
                <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Baris:
                    <select
                        value={pageSize}
                        onChange={e => {
                            onPageSizeChange(Number(e.target.value))
                            onPageChange(1)
                        }}
                        className="text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-emerald-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        {pageSizeOptions.map(opt => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Right: page navigation */}
            <div className="flex items-center gap-1">
                {/* Prev button */}
                <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Halaman sebelumnya"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="flex items-center justify-center w-8 h-8 text-xs text-gray-400 dark:text-gray-500 select-none"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                                page === p
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                            aria-current={page === p ? "page" : undefined}
                        >
                            {p}
                        </button>
                    )
                )}

                {/* Next button */}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Halaman berikutnya"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
