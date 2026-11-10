import { Skeleton } from "@/components/ui/skeleton"
import { ArabicTextSkeleton } from "./arabic-text-skeleton"

interface VerseSkeletonProps {
    showSurahHeader?: boolean
    showBismillah?: boolean
    textLines?: number
    className?: string
}

export function VerseSkeleton({
    showSurahHeader = false,
    showBismillah = false,
    textLines = 2,
    className = ""
}: VerseSkeletonProps) {
    return (
        <div className={`mb-6 ${className}`}>
            {/* Surah Header */}
            {showSurahHeader && (
                <div className="mb-6 text-center">
                    <Skeleton className="h-12 w-48 mx-auto mb-2 bg-gray-200 dark:bg-gray-700" />
                    {showBismillah && (
                        <div className="mt-6 flex justify-center">
                            <Skeleton className="h-8 w-56 bg-gray-200 dark:bg-gray-700" />
                        </div>
                    )}
                </div>
            )}

            {/* Arabic Text */}
            <ArabicTextSkeleton lines={textLines} />
        </div>
    )
}