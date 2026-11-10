"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

interface SWRProviderProps {
    children: ReactNode;
}

/**
 * Global SWR Configuration for optimized data fetching
 * 
 * Key optimizations:
 * - revalidateOnFocus: false - Don't refetch when tab gains focus
 * - revalidateOnReconnect: false - Don't refetch when network reconnects
 * - dedupingInterval: 120000 - Dedupe requests within 2 minutes
 * - errorRetryCount: 2 - Only retry failed requests 2 times
 * - keepPreviousData: true - Show stale data while revalidating
 */
export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig
            value={{
                // Disable automatic revalidation on focus (reduces unnecessary requests)
                revalidateOnFocus: false,

                // Disable revalidation on network reconnect
                revalidateOnReconnect: false,

                // Increase deduping interval to 5 minutes (prevents duplicate requests)
                dedupingInterval: 300000,

                // Keep previous data while fetching new data (smoother UX)
                keepPreviousData: true,

                // Limit error retries
                errorRetryCount: 2,
                errorRetryInterval: 3000,

                // Cache for 5 minutes before considering stale
                focusThrottleInterval: 300000,

                // Don't automatically revalidate on mount if data exists
                revalidateIfStale: false,

                // Use a longer loading delay to prevent flash
                loadingTimeout: 3000,

                // Custom fetcher with error handling
                fetcher: async (url: string) => {
                    const res = await fetch(url);
                    if (!res.ok) {
                        const error = new Error("An error occurred while fetching the data.");
                        throw error;
                    }
                    return res.json();
                },
            }}
        >
            {children}
        </SWRConfig>
    );
}
