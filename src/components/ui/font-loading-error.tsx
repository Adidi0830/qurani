import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FontLoadingErrorProps {
    error: string;
    onRetry: () => void;
    className?: string;
}

export function FontLoadingError({ error, onRetry, className }: FontLoadingErrorProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Font Loading Error
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                {error}
            </p>
            <Button
                onClick={onRetry}
                variant="outline"
                className="flex items-center gap-2"
            >
                <RefreshCw className="h-4 w-4" />
                Retry Loading Fonts
            </Button>
        </div>
    );
}

interface FontLoadingProgressProps {
    progress: number;
    className?: string;
}

export function FontLoadingProgress({ progress, className }: FontLoadingProgressProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
            <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Loading fonts... {progress}%
            </p>
        </div>
    );
}

