import { Skeleton } from "@/components/ui/skeleton"
import { VerseSkeleton } from "./verse-skeleton"

interface PageSkeletonProps {
    verses?: number
    showPageHeader?: boolean
    className?: string
}

export function PageSkeleton({
    verses = 15,
    showPageHeader = true,
    className = ""
}: PageSkeletonProps) {
    return (
        <div className={`space-y-4 ${className}`}>
            {/* Page Header */}
            {showPageHeader && (
                <div className="text-center mb-8">
                    <Skeleton className="h-12 w-32 mx-auto mb-2 bg-gray-200 dark:bg-gray-700" />
                    <Skeleton className="h-4 w-24 mx-auto bg-gray-200 dark:bg-gray-700" />
                </div>
            )}

            {/* Multiple Verses */}
            {Array.from({ length: verses }).map((_, i) => {
                // Random variation for more realistic skeleton
                const showSurahHeader = i === 0 || Math.random() < 0.1
                const showBismillah = showSurahHeader && Math.random() < 0.8
                const textLines = 1 + Math.floor(Math.random() * 3)

                return (
                    <VerseSkeleton
                        key={i}
                        showSurahHeader={showSurahHeader}
                        showBismillah={showBismillah}
                        textLines={textLines}
                    />
                )
            })}

            {/* Page Separator */}
            <div className="my-8 flex items-center">
                <div className="flex-1">
                    <Skeleton className="h-px w-full bg-gray-300 dark:bg-gray-600" />
                </div>
                <div className="mx-4">
                    <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="flex-1">
                    <Skeleton className="h-px w-full bg-gray-300 dark:bg-gray-600" />
                </div>
            </div>
        </div>
    )
}

