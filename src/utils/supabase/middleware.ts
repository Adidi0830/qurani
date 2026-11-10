import { NextResponse, type NextRequest } from "next/server"

/**
 * User info from MyQurani token cookie
 */
interface MyQuraniUser {
  id: number;
  email: string;
  name?: string;
  role?: string;
  roles?: string[];
}

/**
 * Get user from MyQurani token cookie
 */
function getMyQuraniUser(request: NextRequest): MyQuraniUser | null {
  try {
    const accessToken = request.cookies.get("myqurani_access_token")?.value;
    const userCookie = request.cookies.get("myqurani_user")?.value;

    if (!accessToken) return null;

    if (userCookie) {
      try {
        return JSON.parse(decodeURIComponent(userCookie)) as MyQuraniUser;
      } catch {
        return JSON.parse(userCookie) as MyQuraniUser;
      }
    }

    // If we have token but no user cookie, still consider authenticated
    return { id: 0, email: "", role: "member" };
  } catch {
    return null;
  }
}

/**
 * Build a redirect URL that works correctly behind a reverse proxy.
 * Di production, request.nextUrl.origin bisa menunjuk ke http://localhost:3000
 * karena Nginx meneruskan request ke internal Next.js server.
 * Kita gunakan NEXT_PUBLIC_BASE_URL sebagai base URL yang benar.
 */
function buildRedirectUrl(request: NextRequest, pathname: string): URL {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.startsWith("192.168.");

  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (publicBaseUrl && !isLocal) {
    return new URL(pathname, publicBaseUrl);
  }
  // Fallback: gunakan request URL (benar untuk local dev tanpa reverse proxy)
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return url;
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  let pathname = request.nextUrl.pathname;
  let possibleLocale = "";

  // Extract and remove locale prefix if present
  const segments = pathname.split('/');
  if (segments.length > 1 && ["id", "en", "ar"].includes(segments[1])) {
    possibleLocale = segments[1];
    pathname = pathname.replace(`/${possibleLocale}`, '') || '/';
  }

  // Define route types
  const isAuthCallback =
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/oauth/callback");
  const isLoginPage = pathname.startsWith("/login");
  const isRegisterPage = pathname.startsWith("/register");
  const isHomePage = pathname === "/";
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/administrator") ||
    pathname.startsWith("/master-data") ||
    pathname.startsWith("/notification") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/groups") ||
    pathname.startsWith("/teachers") ||
    pathname.startsWith("/myqurani") ||
    pathname.startsWith("/setoran") ||
    pathname.startsWith("/admin");

  // ============================================
  // Check for MyQurani API token (sole auth method)
  // ============================================
  const myquraniUser = getMyQuraniUser(request);

  if (myquraniUser) {
    console.log(
      "[Middleware] MyQurani user found:",
      myquraniUser?.email || "token-only"
    );

    // Redirect authenticated user away from login/register pages
    if (isLoginPage || isRegisterPage || isHomePage) {
      const redirectPath = possibleLocale ? `/${possibleLocale}/dashboard` : "/dashboard";
      return NextResponse.redirect(buildRedirectUrl(request, redirectPath));
    }

    // Allow access to protected routes
    return response;
  }

  // ============================================
  // Handle unauthenticated users
  // ============================================

  // Redirect unauthenticated users to login for protected routes
  if (
    !isAuthCallback &&
    !isLoginPage &&
    !isRegisterPage &&
    !isHomePage &&
    isProtectedRoute
  ) {
    console.log("[Middleware] No auth found, redirecting to login");
    const redirectPath = possibleLocale ? `/${possibleLocale}/login` : "/login";
    return NextResponse.redirect(buildRedirectUrl(request, redirectPath));
  }

  return response;
}
