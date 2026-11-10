import { Skeleton } from "@/components/ui/skeleton"

interface ArabicTextSkeletonProps {
    lines?: number
    className?: string
}

export function ArabicTextSkeleton({
    lines = 3,
    className = ""
}: ArabicTextSkeletonProps) {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: lines }).map((_, lineIndex) => {
                // Create structured widths for better visual hierarchy
                const isFirstLine = lineIndex === 0;
                const isLastLine = lineIndex === lines - 1;
                
                let baseWidth;
                if (isFirstLine) {
                    baseWidth = 90; // First line is almost full width
                } else if (isLastLine) {
                    baseWidth = 65; // Last line is shorter
                } else {
                    baseWidth = 80; // Middle lines are medium width
                }
                
                return (
                    <div key={lineIndex} className="flex justify-center">
                        <Skeleton
                            className="bg-gray-200 dark:bg-gray-700 rounded-md"
                            style={{
                                width: `${baseWidth}%`,
                                height: '32px'
                            }}
                        />
                    </div>
                );
            })}
        </div>
    )
}