import { useRouter, useParams } from 'next/navigation';
import { NavigateOptions, PrefetchOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function useLocalizedRouter() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.lang as string) || '';

  const prefixHref = (href: string) => {
    if (!href.startsWith('/')) return href;
    if (locale && !href.startsWith(`/${locale}`)) {
      // Avoid double prefixing if it already has a different locale prefix
      const segments = href.split('/');
      if (segments.length > 1 && ["id", "en", "ar"].includes(segments[1])) {
        // Replace existing locale with current locale
        segments[1] = locale;
        return segments.join('/');
      }
      return `/${locale}${href}`;
    }
    return href;
  };

  return {
    ...router,
    push: (href: string, options?: NavigateOptions) => {
      router.push(prefixHref(href), options);
    },
    replace: (href: string, options?: NavigateOptions) => {
      router.replace(prefixHref(href), options);
    },
    prefetch: (href: string, options?: PrefetchOptions) => {
      router.prefetch(prefixHref(href), options);
    }
  };
}
