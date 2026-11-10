/**
 * Custom Skeleton Component
 * Lightweight alternative to shadcn skeleton with same visual appearance
 * No external dependencies - optimized for performance
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className = "", ...props }: SkeletonProps) {
  // Lightweight className merging without external utilities
  const mergedClassName = `bg-accent animate-pulse rounded-md ${className}`.trim();
  
  return (
    <div
      data-slot="skeleton"
      className={mergedClassName}
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
