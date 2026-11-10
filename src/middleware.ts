import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { defaultLocale, locales } from "../i18n.config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const cookieLocale = request.cookies.get('preferred-locale')?.value;
    const localeToUse = (cookieLocale && locales.includes(cookieLocale as any)) 
      ? cookieLocale 
      : defaultLocale;
      
    request.nextUrl.pathname = `/${localeToUse}${pathname}`;
    // We redirect to the localized URL, the next request will go through auth check
    return NextResponse.redirect(request.nextUrl);
  }

  // Handle auth, now the request URL already has the locale prefix
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - clear-session (session clearing page)
     * - api/auth/force-logout (force logout endpoint)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|clear-session|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js|mp4)$).*)",
  ],
};
