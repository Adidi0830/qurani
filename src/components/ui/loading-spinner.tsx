import React from 'react';
import { Spinner } from './spinner';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({
  message = 'Sedang memuat...',
  size = 'lg',
  className
}: LoadingSpinnerProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-10 min-h-[200px]",
      className
    )}>
      <Spinner size={size} variant="default" />
      <div className="mt-4 text-center">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}
