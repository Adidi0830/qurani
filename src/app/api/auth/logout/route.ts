import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Delete MyQurani cookies
        cookieStore.delete('myqurani_access_token');
        cookieStore.delete('myqurani_refresh_token');
        cookieStore.delete('myqurani_user');

        // Also try to delete Supabase cookies (if any)
        const allCookies = cookieStore.getAll();
        for (const cookie of allCookies) {
            if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
                cookieStore.delete(cookie.name);
            }
        }

        return NextResponse.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('[Logout API] Error:', error);
        return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
    }
}

export async function GET() {
    // Also support GET for simple redirect-based logout
    const cookieStore = await cookies();

    cookieStore.delete('myqurani_access_token');
    cookieStore.delete('myqurani_refresh_token');
    cookieStore.delete('myqurani_user');

    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
