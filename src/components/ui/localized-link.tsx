"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ComponentProps, forwardRef } from "react";

type LocalizedLinkProps = ComponentProps<typeof Link>;

export const LocalizedLink = forwardRef<HTMLAnchorElement, LocalizedLinkProps>(
  ({ href, ...props }, ref) => {
    const params = useParams();
    const locale = (params?.lang as string) || '';

    let localizedHref = href;
    
    if (typeof href === 'string' && href.startsWith('/')) {
      if (locale && !href.startsWith(`/${locale}`)) {
        const segments = href.split('/');
        if (segments.length > 1 && ["id", "en", "ar"].includes(segments[1])) {
           segments[1] = locale;
           localizedHref = segments.join('/');
        } else {
           localizedHref = `/${locale}${href}`;
        }
      }
    } else if (typeof href === 'object' && href.pathname?.startsWith('/')) {
      if (locale && !href.pathname.startsWith(`/${locale}`)) {
        const segments = href.pathname.split('/');
        let newPathname = `/${locale}${href.pathname}`;
        if (segments.length > 1 && ["id", "en", "ar"].includes(segments[1])) {
           segments[1] = locale;
           newPathname = segments.join('/');
        }
        localizedHref = {
          ...href,
          pathname: newPathname
        };
      }
    }

    return <Link ref={ref} href={localizedHref} {...props} />;
  }
);

LocalizedLink.displayName = "LocalizedLink";
