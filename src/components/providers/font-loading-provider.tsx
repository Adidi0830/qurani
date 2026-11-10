"use client";

import { useArabicFontLoading } from '@/hooks/use-font-loading';
import React, { createContext, useContext, ReactNode } from 'react';

interface FontLoadingContextType {
    isArabicFontsLoaded: boolean;
    isArabicFontsLoading: boolean;
    arabicFontError: string | null;
    arabicFontProgress: number;
    reloadArabicFonts: () => void;
}

const FontLoadingContext = createContext<FontLoadingContextType | undefined>(undefined);

interface FontLoadingProviderProps {
    children: ReactNode;
}

export function FontLoadingProvider({ children }: FontLoadingProviderProps) {
    const arabicFontState = useArabicFontLoading();

    const contextValue: FontLoadingContextType = {
        isArabicFontsLoaded: arabicFontState.isLoaded,
        isArabicFontsLoading: arabicFontState.isLoading,
        arabicFontError: arabicFontState.error,
        arabicFontProgress: arabicFontState.progress,
        reloadArabicFonts: arabicFontState.reload
    };

    return (
        <FontLoadingContext.Provider value={contextValue}>
            {children}
        </FontLoadingContext.Provider>
    );
}

export function useFontLoading() {
    const context = useContext(FontLoadingContext);
    if (context === undefined) {
        throw new Error('useFontLoading must be used within a FontLoadingProvider');
    }
    return context;
}

