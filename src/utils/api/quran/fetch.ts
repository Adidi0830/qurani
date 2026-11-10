"use server";

import { Chapters, Verse, Words } from "@/types/quran";
import { createClient } from "@/utils/supabase/server";
import { getCachedData, setCachedData, getSurahCacheKey, getPageCacheKey, getJuzCacheKey } from "@/utils/cache/server-cache";

// fetch chapter surat
export const getAllSuratChapters = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.from("chapters").select("*");

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (data.length === 0) {
    return {
      success: false,
      message: "surat not found",
    };
  }

  return {
    success: true,
    message: "get surat chapter successfully",
    data: data as Chapters[],
  };
};

// fetch surat by id
// export const getSuratById = async (id: number) => {
//   const supabase = await createClient();

//   const { data, error } = await supabase
//     .from("chapters")
//     .select("*")
//     .eq("id", id)
//     .single();

//   if (error) {
//     return {
//       success: false,
//       message: error.message,
//     };
//   }

//   if (data.length === 0) {
//     return {
//       success: false,
//       message: "chapter not found",
//     };
//   }

//   const { data: dataVerses, error: errorVerses } = await supabase
//     .from("verses")
//     .select("*")
//     .like("verse_key", `${data.id}:%`)
//     .order("page_number", { ascending: true });

//   //   console.log(dataVerses);
//   if (errorVerses) {
//     return {
//       success: false,
//       message: errorVerses.message,
//     };
//   }

//   dataVerses.map(async (verse: Verse) => {
//     const verseKey = verse.verse_key.split(":")[1];
//     const { data: dataWords, error: errorWords } = await supabase
//       .from("words")
//       .select("*")
//       .like("location", `${data.id}:${verseKey}:%`);
//   });

//   return {
//     success: true,
//     message: "surat get by number surat successfully",
//     chapter: data as Chapters,
//     verses: dataVerses as Verse[],
//     // data: dataWords as Words[],
//   };
// };
export const getSuratById = async (id: number) => {
  // Check cache first
  const cacheKey = getSurahCacheKey(id);
  const cachedData = getCachedData<{ chapter: Chapters; verses: Verse[] }>(cacheKey);
  
  if (cachedData) {
    console.log(`Cache hit for surah ${id}`);
    return {
      success: true,
      message: "surat get by number surat successfully (cached)",
      chapter: cachedData.chapter,
      verses: cachedData.verses,
    };
  }

  console.log(`Cache miss for surah ${id}, fetching from database`);
  const supabase = await createClient();

  try {
    // Parallel execution: fetch chapter, verses, and words simultaneously
    const [
      { data: chapter, error: chapterError },
      { data: verses, error: versesError },
      { data: allWords, error: wordsError }
    ] = await Promise.all([
      // Query 1: Get chapter data
      supabase
        .from("chapters")
        .select("*")
        .eq("id", id)
        .single(),
      
      // Query 2: Get all verses for this chapter
      supabase
        .from("verses")
        .select("*")
        .like("verse_key", `${id}:%`)
        .order("id", { ascending: true }),
      
      // Query 3: Get ALL words for this chapter in one query
      supabase
        .from("words")
        .select("*")
        .like("location", `${id}:%`)
        .order("id", { ascending: true })
    ]);

    // Handle errors
    if (chapterError) {
      return {
        success: false,
        message: chapterError.message,
      };
    }

    if (!chapter) {
      return {
        success: false,
        message: "chapter not found",
      };
    }

    if (versesError) {
      return {
        success: false,
        message: versesError.message,
      };
    }

    if (wordsError) {
      return {
        success: false,
        message: wordsError.message,
      };
    }

    // Group words by verse using Map for O(1) lookup
    const wordsByVerse = new Map<string, Words[]>();
    
    allWords?.forEach(word => {
      const verseKey = word.location.split(':').slice(0, 2).join(':');
      if (!wordsByVerse.has(verseKey)) {
        wordsByVerse.set(verseKey, []);
      }
      wordsByVerse.get(verseKey)!.push(word);
    });

    // Combine verses with their words efficiently
    const versesWithWords = verses?.map(verse => ({
      ...verse,
      words: wordsByVerse.get(verse.verse_key) || []
    })) || [];

    // Cache the result
    const result = {
      chapter: chapter as Chapters,
      verses: versesWithWords,
    };
    
    setCachedData(cacheKey, result);
    console.log(`Cached surah ${id} data`);

    return {
      success: true,
      message: "surat get by number surat successfully",
      chapter: result.chapter,
      verses: result.verses,
    };

  } catch (error) {
    console.error('Error in getSuratById:', error);
    return {
      success: false,
      message: 'Internal server error',
    };
  }
};

// fetch halaman by id
export const getPageById = async (id: number) => {
  // Check cache first
  const cacheKey = getPageCacheKey(id);
  const cachedData = getCachedData<{ pageNumber: number; chapters: Chapters[]; verses: Verse[] }>(cacheKey);
  
  if (cachedData) {
    console.log(`Cache hit for page ${id}`);
    return {
      success: true,
      message: "Page fetched successfully (cached)",
      pageNumber: cachedData.pageNumber,
      chapters: cachedData.chapters,
      verses: cachedData.verses,
    };
  }

  console.log(`Cache miss for page ${id}, fetching from database`);
  const supabase = await createClient();

  try {
    // Get verses for the specific page first
    const { data: verses, error: versesError } = await supabase
      .from("verses")
      .select("*")
      .eq("page_number", id)
      .order("verse_key", { ascending: true });

    if (versesError) {
      return {
        success: false,
        message: versesError.message,
      };
    }

    if (!verses || verses.length === 0) {
      return {
        success: false,
        message: "Page not found",
      };
    }

    // Get unique chapter IDs from verses on this page
    const chapterIds = [
      ...new Set(verses.map((verse) => verse.verse_key.split(":")[0])),
    ];

    // Build location patterns for all verses on this page
    const locationPatterns = verses.map(v => {
      const [chapterId, verseNumber] = v.verse_key.split(":");
      return `${chapterId}:${verseNumber}:%`;
    });

    // Parallel execution: fetch chapters and words simultaneously
    const [
      { data: chapters, error: chaptersError },
      { data: allWords, error: wordsError }
    ] = await Promise.all([
      // Get chapter info for all chapters on this page
      supabase
        .from("chapters")
        .select("*")
        .in("id", chapterIds)
        .order("id", { ascending: true }),
      
      // Get ALL words for all verses on this page using OR with LIKE
      supabase
        .from("words")
        .select("*")
        .or(locationPatterns.map(pattern => `location.like.${pattern}`).join(','))
        .order("id", { ascending: true })
    ]);

    if (chaptersError) {
      return {
        success: false,
        message: chaptersError.message,
      };
    }

    if (wordsError) {
      return {
        success: false,
        message: wordsError.message,
      };
    }

    // Group words by verse using Map for O(1) lookup
    const wordsByVerse = new Map<string, Words[]>();
    
    allWords?.forEach(word => {
      const verseKey = word.location.split(':').slice(0, 2).join(':');
      if (!wordsByVerse.has(verseKey)) {
        wordsByVerse.set(verseKey, []);
      }
      wordsByVerse.get(verseKey)!.push(word);
    });

    // Combine verses with their words efficiently
    const versesWithWords = verses.map(verse => ({
      ...verse,
      words: wordsByVerse.get(verse.verse_key) || []
    }));

    // Cache the result
    const result = {
      pageNumber: id,
      chapters: chapters as Chapters[],
      verses: versesWithWords,
    };
    
    setCachedData(cacheKey, result);
    console.log(`Cached page ${id} data`);

    return {
      success: true,
      message: "Page fetched successfully",
      pageNumber: result.pageNumber,
      chapters: result.chapters,
      verses: result.verses,
    };

  } catch (error) {
    console.error('Error in getPageById:', error);
    return {
      success: false,
      message: 'Internal server error',
    };
  }
};

// fetch juz by id
export const getJuzById = async (id: number) => {
  // Check cache first
  const cacheKey = getJuzCacheKey(id);
  const cachedData = getCachedData<{ juzNumber: number; startPage: number; endPage: number; chapters: Chapters[]; verses: Verse[] }>(cacheKey);
  
  if (cachedData) {
    console.log(`Cache hit for juz ${id}`);
    return {
      success: true,
      message: "Get juz successfully (cached)",
      juzNumber: cachedData.juzNumber,
      startPage: cachedData.startPage,
      endPage: cachedData.endPage,
      chapters: cachedData.chapters,
      verses: cachedData.verses,
    };
  }

  console.log(`Cache miss for juz ${id}, fetching from database`);
  const supabase = await createClient();

  try {
    // Get verses data for the juz first
    const { data: verses, error: versesError } = await supabase
      .from("verses")
      .select("*")
      .eq("juz_number", id)
      .order("id", { ascending: true });

    if (versesError) {
      return {
        success: false,
        message: versesError.message,
      };
    }

    if (!verses || verses.length === 0) {
      return {
        success: false,
        message: "Juz not found",
      };
    }

    // Get unique chapter IDs from verses
    const chapterIds = [
      ...new Set(verses.map((verse) => verse.verse_key.split(":")[0])),
    ];

    // For better performance with large juz, we'll fetch words by chapter ranges
    // instead of individual verse patterns to avoid OR query limits
    const chapterRanges = chapterIds.map(chapterId => `location.like.${chapterId}:%`);

    // Parallel execution: fetch chapters and words simultaneously
    const [
      { data: chapters, error: chaptersError },
      { data: allWords, error: wordsError }
    ] = await Promise.all([
      // Get chapter info for all chapters in this juz
      supabase
        .from("chapters")
        .select("*")
        .in("id", chapterIds)
        .order("id", { ascending: true }),
      
      // Get ALL words for all chapters in this juz (more efficient for large juz)
      supabase
        .from("words")
        .select("*")
        .or(chapterRanges.join(','))
        .order("id", { ascending: true })
    ]);

    if (chaptersError) {
      return {
        success: false,
        message: chaptersError.message,
      };
    }

    if (wordsError) {
      return {
        success: false,
        message: wordsError.message,
      };
    }

    // Create a Set of verse keys in this juz for efficient filtering
    const juzVerseKeys = new Set(verses.map(verse => verse.verse_key));
    
    // Group words by verse using Map for O(1) lookup
    // Filter words to only include those from verses in this juz
    const wordsByVerse = new Map<string, Words[]>();
    
    allWords?.forEach(word => {
      const verseKey = word.location.split(':').slice(0, 2).join(':');
      // Only include words from verses that are actually in this juz
      if (juzVerseKeys.has(verseKey)) {
        if (!wordsByVerse.has(verseKey)) {
          wordsByVerse.set(verseKey, []);
        }
        wordsByVerse.get(verseKey)!.push(word);
      }
    });

    // Combine verses with their words efficiently
    const versesWithWords = verses.map(verse => ({
      ...verse,
      words: wordsByVerse.get(verse.verse_key) || []
    }));

    // Cache the result
    const result = {
      juzNumber: id,
      startPage: verses[0].page_number,
      endPage: verses[verses.length - 1].page_number,
      chapters: chapters as Chapters[],
      verses: versesWithWords,
    };
    
    setCachedData(cacheKey, result);
    console.log(`Cached juz ${id} data`);

    return {
      success: true,
      message: "Get juz successfully",
      juzNumber: result.juzNumber,
      startPage: result.startPage,
      endPage: result.endPage,
      chapters: result.chapters,
      verses: result.verses,
    };

  } catch (error) {
    console.error('Error in getJuzById:', error);
    return {
      success: false,
      message: 'Internal server error',
    };
  }
};
