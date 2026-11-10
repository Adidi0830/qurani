"use client"

/**
 * Order Detail — Skeleton Loading State
 */

import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function OrderDetailSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
            {/* Header skeleton */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4 mb-6">
                <div className="max-w-screen-xl mx-auto flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                            <Skeleton className="h-3.5 w-44" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-28 rounded-lg flex-shrink-0" />
                </div>
            </div>

            <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 mb-6 pb-0">
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* 3-col grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
                    {/* Main: col-span-2 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Progress skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-9 h-9 rounded-xl" />
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-7 w-28 rounded-full" />
                            </div>
                            <Skeleton className="h-2.5 w-full rounded-full mb-2" />
                            <Skeleton className="h-3 w-44" />
                        </div>

                        {/* Session grid skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="h-5 w-16 rounded-full" />
                                        </div>
                                        <Skeleton className="h-3 w-36" />
                                        <Skeleton className="h-3 w-24" />
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Skeleton className="h-7 w-20 rounded-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-5">
                        {/* Student skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
                            <Skeleton className="h-3.5 w-16" />
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="w-7 h-7 rounded-lg" />
                            </div>
                            <Skeleton className="h-9 w-full rounded-xl" />
                        </div>

                        {/* Teacher skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
                            <Skeleton className="h-3.5 w-20" />
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="w-7 h-7 rounded-lg" />
                            </div>
                            <Skeleton className="h-9 w-full rounded-xl" />
                            <div className="flex flex-wrap gap-1.5">
                                {[16, 20, 14].map(w => <Skeleton key={w} className={`h-6 w-${w} rounded-md`} />)}
                            </div>
                        </div>

                        {/* Payment skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
                            <Skeleton className="h-3.5 w-36" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>

                        {/* Info skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
                            <Skeleton className="h-3.5 w-24" />
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
