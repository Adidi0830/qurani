import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { getDictionaries, setStoredLocale } from '@/lib/i18n';
import { LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import { defaultLocale, locales, type Locale } from '../../i18n.config';

type Dictionary = Record<string, unknown>;

export function useTranslation(namespaces: string[] = ['common']) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const localeFromUrl = (params?.lang as Locale) || defaultLocale;
  const [locale, setLocale] = useState<Locale>(localeFromUrl);
  const [dictionary, setDictionary] = useState<Dictionary>({});
  const [isLoading, setIsLoading] = useState(true);

  const namespacesKey = useMemo(() => namespaces.slice().sort().join('|'), [namespaces]);

  // Initialize locale from URL instead of storage
  useEffect(() => {
    if (locales.includes(localeFromUrl)) {
      setLocale(localeFromUrl);
      setStoredLocale(localeFromUrl);
    }
  }, [localeFromUrl]);

  // Load dictionary when locale or namespaces change
  useEffect(() => {
    const loadDictionary = async () => {
      setIsLoading(true);
      try {
        // getDictionaries now uses internal cache, so this will be instant for cached data
        const dict = await getDictionaries(namespaces, locale);
        setDictionary(dict);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
        setDictionary({});
      } finally {
        setIsLoading(false);
      }
    };

    loadDictionary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, namespacesKey]);

  const changeLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;
    
    setLocale(newLocale);
    setStoredLocale(newLocale);
    
    if (pathname) {
      const segments = pathname.split('/');
      if (segments.length > 1 && locales.includes(segments[1] as any)) {
        segments[1] = newLocale;
        router.push(segments.join('/'));
      } else {
        router.push(`/${newLocale}${pathname === '/' ? '' : pathname}`);
      }
    }
  };

  const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = dictionary;
    let found = true;

    for (const k of keys) {
      if (value && typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        found = false;
        break;
      }
    }

    let result = found && typeof value === 'string' ? value : fallback || key;

    // Handle interpolation if params are provided
    if (params && typeof result === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        const placeholder = `{{${paramKey}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(paramValue));
      });
    }

    return result;
  };

  return {
    t,
    locale,
    changeLocale,
    isLoading,
    dictionary,
  };
}
