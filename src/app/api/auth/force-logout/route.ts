// app/api/auth/force-logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const cookieStore = await cookies();

    // Get all cookies
    const allCookies = cookieStore.getAll();

    console.log('[Force Logout] Clearing all cookies:', allCookies.map(c => c.name));

    // Create redirect response
    // Di production di balik reverse proxy, request.url = http://localhost:3000/...
    // sehingga harus pakai NEXT_PUBLIC_BASE_URL agar redirect ke domain publik yang benar
    const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const baseUrl = publicBaseUrl || new URL(request.url).origin;
    const response = NextResponse.redirect(new URL('/login', baseUrl));

    // Delete all myqurani related cookies (including httpOnly)
    response.cookies.set('myqurani_access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0, // Expire immediately
    });

    response.cookies.set('myqurani_refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });

    response.cookies.set('myqurani_user', '', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });

    // Also clear any supabase related cookies
    for (const cookie of allCookies) {
        if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
            response.cookies.set(cookie.name, '', {
                path: '/',
                maxAge: 0,
            });
        }
    }

    console.log('[Force Logout] All auth cookies cleared, redirecting to login');

    return response;
}

export async function POST(request: Request) {
    return GET(request);
}
