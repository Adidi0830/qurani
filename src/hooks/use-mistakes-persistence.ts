import { useState, useEffect } from 'react';

interface WordError {
  color: string;
  type: string;
  text_uthman: string;
  key: string;
}

interface WordErrorsMap {
  [key: string]: WordError;
}

interface VerseErrorsMap {
  [key: number]: string | { color: string; type: string; verse_number: number };
}

interface MistakesData {
  wordErrors: WordErrorsMap;
  verseErrors: VerseErrorsMap;
}

/**
 * Hook untuk menyimpan dan mengembalikan data mistakes agar persistent saat reload
 * @param pageType - Type halaman (surah, juz, atau page)
 * @param pageId - ID halaman yang sedang dibuka
 * @returns Object dengan state dan setter untuk wordErrors dan verseErrors
 */
export function useMistakesPersistence(pageType: 'surah' | 'juz' | 'page', pageId: string) {
  const storageKey = `mistakes-${pageType}-${pageId}`;
  
  // Initialize states with data from localStorage if available
  const [wordErrors, setWordErrors] = useState<WordErrorsMap>(() => {
    if (typeof window === 'undefined') return {};
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed: MistakesData = JSON.parse(savedData);
        return parsed.wordErrors || {};
      }
    } catch (error) {
      console.error('Error loading word errors from localStorage:', error);
    }
    return {};
  });

  const [verseErrors, setVerseErrors] = useState<VerseErrorsMap>(() => {
    if (typeof window === 'undefined') return {};
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed: MistakesData = JSON.parse(savedData);
        return parsed.verseErrors || {};
      }
    } catch (error) {
      console.error('Error loading verse errors from localStorage:', error);
    }
    return {};
  });

  // Save to localStorage whenever wordErrors or verseErrors change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const mistakesData: MistakesData = {
        wordErrors,
        verseErrors
      };
      
      // Only save if there are actual mistakes
      if (Object.keys(wordErrors).length > 0 || Object.keys(verseErrors).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(mistakesData));
      } else {
        // Remove from localStorage if no mistakes
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('Error saving mistakes to localStorage:', error);
    }
  }, [wordErrors, verseErrors, storageKey]);

  // Function to clear mistakes data
  const clearMistakes = () => {
    setWordErrors({});
    setVerseErrors({});
    localStorage.removeItem(storageKey);
  };

  // Function to get combined mistakes count
  const getMistakesCount = () => {
    return Object.keys(wordErrors).length + Object.keys(verseErrors).length;
  };

  return {
    wordErrors,
    verseErrors,
    setWordErrors,
    setVerseErrors,
    clearMistakes,
    getMistakesCount
  };
}
