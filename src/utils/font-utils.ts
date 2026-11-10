import { WordIndopak } from '@/types/quran';

interface FontTextOptions {
  fontTypeValue?: string;
  wordIndopak?: WordIndopak | null;
  wordUtsmani?: WordIndopak | null;
  isFontsLoaded: boolean;
  fallbackText?: string;
}

export function getFontText(
  location: string, 
  options: FontTextOptions
): string {
  const { 
    fontTypeValue, 
    wordIndopak, 
    wordUtsmani, 
    isFontsLoaded, 
    fallbackText = '' 
  } = options;

  // Return fallback if fonts are not loaded
  if (!isFontsLoaded) {
    return fallbackText;
  }

  try {
    if (fontTypeValue === "IndoPak") {
      return wordIndopak?.[location]?.text || fallbackText;
    } else {
      return wordUtsmani?.[location]?.text || fallbackText;
    }
  } catch (error) {
    console.warn('Error getting font text for location:', location, error);
    return fallbackText;
  }
}

// Enhanced font loading with retry mechanism
export async function loadFontWithRetry(
  fontFamily: string,
  fontUrl: string,
  maxRetries: number = 3
): Promise<FontFace | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if font is already loaded
      if (document.fonts.check(`16px "${fontFamily}"`)) {
        return new FontFace(fontFamily, `url(${fontUrl})`);
      }

      const fontFace = new FontFace(fontFamily, `url(${fontUrl})`, {
        display: 'block'
      });

      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      
      return loadedFont;
    } catch (error) {
      console.warn(`Font loading attempt ${attempt} failed for ${fontFamily}:`, error);
      
      if (attempt === maxRetries) {
        console.error(`Failed to load font ${fontFamily} after ${maxRetries} attempts`);
        return null;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return null;
}

// Font loading state checker
export function isFontLoaded(fontFamily: string): boolean {
  try {
    return document.fonts.check(`16px "${fontFamily}"`);
  } catch (error) {
    console.warn('Error checking font load status:', error);
    return false;
  }
}

// Get font loading progress
export function getFontLoadingProgress(fontFamilies: string[]): number {
  if (fontFamilies.length === 0) return 100;
  
  const loadedCount = fontFamilies.filter(isFontLoaded).length;
  return Math.round((loadedCount / fontFamilies.length) * 100);
}

