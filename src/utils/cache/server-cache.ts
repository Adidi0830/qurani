// Server-side cache utilities compatible with Next.js server actions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Chapters, Verse } from "@/types/quran";

// Simple in-memory cache storage
const cacheStorage = new Map<string, {
  data: unknown;
  timestamp: number;
  ttl: number;
}>();

const DEFAULT_TTL = 1000 * 60 * 15; // 15 minutes

// Cache helper functions (not server actions)
export function getCachedData<T>(key: string): T | null {
  const item = cacheStorage.get(key);
  
  if (!item) {
    return null;
  }
  
  // Check if expired
  if (Date.now() - item.timestamp > item.ttl) {
    cacheStorage.delete(key);
    return null;
  }
  
  return item.data as T;
}

export function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cacheStorage.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

export function clearCache(): void {
  cacheStorage.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cacheStorage.size,
    keys: Array.from(cacheStorage.keys())
  };
}

// Helper functions for specific data types
export function getSurahCacheKey(id: number): string {
  return `surah:${id}`;
}

export function getPageCacheKey(id: number): string {
  return `page:${id}`;
}

export function getJuzCacheKey(id: number): string {
  return `juz:${id}`;
}
