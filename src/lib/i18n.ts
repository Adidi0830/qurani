import { defaultLocale, locales, type Locale } from '../../i18n.config';

// Global event name for broadcasting locale changes within the same tab
export const LOCALE_CHANGE_EVENT = 'i18n-locale-change';

// Dictionary cache to prevent reloading
const dictionaryCache = new Map<string, Record<string, unknown>>();

// Backwards-compat: load only the common namespace by default
export const getDictionary = async (locale: Locale = defaultLocale) => {
  return getDictionaries(['common'], locale);
};

export async function getDictionaries(namespaces: string[], locale: Locale = defaultLocale): Promise<Record<string, unknown>> {
  const cacheKey = `${locale}:${namespaces.sort().join('|')}`;
  
  // Check cache first
  if (dictionaryCache.has(cacheKey)) {
    return dictionaryCache.get(cacheKey)!;
  }

  const merged: Record<string, unknown> = {};

  for (const ns of namespaces) {
    // Each namespace file shape should be an object (e.g., { common: {...} } or { profile: {...} })
    const data = await import(`@/dictionaries/${ns}/${locale}.json`).then((m) => m.default as Record<string, unknown>);
    Object.assign(merged, data);
  }

  // Cache the result
  dictionaryCache.set(cacheKey, merged);
  
  return merged;
}

// Get locale from localStorage or browser preference
export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  
  const stored = localStorage.getItem('preferred-locale') as Locale;
  if (stored && locales.includes(stored)) {
    return stored;
  }

  return defaultLocale;
}

// Store locale preference
export function setStoredLocale(locale: Locale) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferred-locale', locale);
}

