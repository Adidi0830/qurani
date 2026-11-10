// app/api/me/route.ts
// Clean endpoint for current user profile - no query params needed
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("myqurani_access_token")?.value;

        if (!token) {
            // Try fallback to cookie user data
            const userCookie = cookieStore.get('myqurani_user')?.value;
            if (userCookie) {
                try {
                    const userData = JSON.parse(decodeURIComponent(userCookie));
                    return NextResponse.json({ profile: convertToProfile(userData) });
                } catch {
                    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
                }
            }
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Fetch from MyQurani API /api/v1/users/me
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            // Fallback to cookie data
            const userCookie = cookieStore.get('myqurani_user')?.value;
            if (userCookie) {
                try {
                    const userData = JSON.parse(decodeURIComponent(userCookie));
                    return NextResponse.json({ profile: convertToProfile(userData) });
                } catch {
                    // Continue to error
                }
            }
            return NextResponse.json({ error: "Failed to fetch profile" }, { status: response.status });
        }

        const responseText = await response.text();
        if (!responseText) {
            return NextResponse.json({ error: "Empty response" }, { status: 500 });
        }

        const result = JSON.parse(responseText);
        const profileData = result.data || result;

        // --- Data Supabase sudah tidak digunakan ---
        let profile = convertToProfile(profileData);
        // -------------------------------------------------------------

        return NextResponse.json({ profile });
    } catch (err) {
        console.error("[/api/me] Error:", err);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
}

// Helper function to normalize avatar URL (handle relative paths from API)
function normalizeAvatarUrl(url: string | null | undefined): string | null {
    if (!url || !url.trim()) return null;
    const img = url.trim();
    // Already a full URL or data URI
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    // Relative path - prepend API base URL
    const normalizedPath = img.replace(/\\/g, '/'); // Fix Windows backslashes
    return `${API_BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
}

// Helper function to convert API response to profile format
function convertToProfile(data: any) {
    const avatarUrl = normalizeAvatarUrl(data.avatarUrl || data.avatar || data.image);

    return {
        id: String(data.id || data.userId || ''),
        username: data.username || '',
        name: data.name || data.fullName || '',
        full_name: data.fullName || data.name || '',
        nickname: data.nickname || '',
        email: data.email || '',
        avatar: avatarUrl,
        avatar_url: avatarUrl,
        hp: data.phone || data.hp || data.address || '',
        noHp: data.phone || data.noHp || data.address || '',
        bio: data.bio || '',
        cityId: data.cityId || null,
        city_id: data.cityId || null,
        cityName: data.cityName || data.city || '',
        city_name: data.cityName || data.city || '',
        stateId: data.stateId || null,
        stateName: data.stateName || data.state || '',
        state_name: data.stateName || data.state || '',
        countryId: data.countryId || null,
        country_id: data.countryId || null,
        countryName: data.countryName || data.country || '',
        country_name: data.countryName || data.country || '',
        gender: data.gender ?? data.sex ?? null,
        dob: data.dateOfBirth || data.birthDate || data.dob || null,
        birth_date: data.dateOfBirth || data.birthDate || null,
        job: data.job || '',
        timezone: data.timezone || '',
        is_verified: data.isVerified || false,
        created_at: data.createdAt || null,
        updated_at: data.updatedAt || null,
    };
}
