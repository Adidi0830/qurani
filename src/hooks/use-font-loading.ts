"use client";

import { useState, useEffect, useCallback } from 'react';

interface ArabicFontLoadingState {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  progress: number;
  reload: () => void;
}

export function useArabicFontLoading(): ArabicFontLoadingState {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const loadFonts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Check if fonts are already loaded
      if (document.fonts) {
        const fontFaces = Array.from(document.fonts);
        const arabicFonts = fontFaces.filter(font => 
          font.family.toLowerCase().includes('indopak') || 
          font.family.toLowerCase().includes('qpc') ||
          font.family.toLowerCase().includes('kitab')
        );

        if (arabicFonts.length === 0) {
          // No Arabic fonts found, consider as loaded (fallback)
          setProgress(100);
          setIsLoaded(true);
          setIsLoading(false);
          return;
        }

        // Load fonts progressively
        const totalFonts = arabicFonts.length;
        let loadedCount = 0;

        for (const font of arabicFonts) {
          try {
            await font.load();
            loadedCount++;
            setProgress(Math.round((loadedCount / totalFonts) * 100));
          } catch (fontError) {
            console.warn(`Failed to load font: ${font.family}`, fontError);
          }
        }

        await document.fonts.ready;
        setIsLoaded(true);
      } else {
        // Fallback for browsers without FontFace API
        setProgress(100);
        setIsLoaded(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Arabic fonts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    setIsLoaded(false);
    loadFonts();
  }, [loadFonts]);

  useEffect(() => {
    loadFonts();
  }, [loadFonts]);

  return {
    isLoaded,
    isLoading,
    error,
    progress,
    reload
  };
}
