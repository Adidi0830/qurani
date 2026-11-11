// app/api/me/route.ts
// Clean endpoint for current user profile - supports both header and cookie authentication with auto-refresh
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();

        // 1. Extract access token & refresh token from Authorization header (localStorage) OR cookies
        const authHeader = req.headers.get("authorization");
        const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
        let token = headerToken || cookieStore.get("myqurani_access_token")?.value;

        const headerRefreshToken = req.headers.get("x-refresh-token");
        let refreshToken = headerRefreshToken || cookieStore.get("myqurani_refresh_token")?.value;

        let refreshedToken: string | null = null;
        let refreshedRefreshToken: string | null = null;

        // Helper to attempt token refresh
        const tryRefreshToken = async (): Promise<boolean> => {
            if (!refreshToken) return false;
            try {
                console.log("[/api/me] Access token invalid/expired, attempting refresh with refresh token...");
                const refreshRes = await fetch(`${API_BASE_URL}/api/v1/Auth/refresh-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });

                if (!refreshRes.ok) return false;
                const refreshJson = await refreshRes.json();
                const refreshData = refreshJson.data || refreshJson;

                if (refreshData?.accessToken) {
                    token = refreshData.accessToken;
                    refreshedToken = refreshData.accessToken;
                    if (refreshData.refreshToken) {
                        refreshToken = refreshData.refreshToken;
                        refreshedRefreshToken = refreshData.refreshToken;
                    }
                    console.log("[/api/me] Token refreshed successfully ✅");
                    return true;
                }
            } catch (err) {
                console.error("[/api/me] Refresh token error:", err);
            }
            return false;
        };

        if (!token) {
            // Try refresh if we have a refresh token
            const didRefresh = await tryRefreshToken();
            if (!didRefresh) {
                // Check if userCookie exists with complete data
                const userCookie = cookieStore.get('myqurani_user')?.value;
                if (userCookie) {
                    try {
                        const userData = JSON.parse(decodeURIComponent(userCookie));
                        if (userData.address || userData.cityName || userData.countryName || userData.dob || userData.avatar) {
                            return NextResponse.json({ profile: convertToProfile(userData) });
                        }
                    } catch {}
                }
                return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
            }
        }

        // 2. Fetch from MyQurani API /api/v1/Users/me
        let response = await fetch(`${API_BASE_URL}/api/v1/Users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        // 3. If 401 Unauthorized, attempt token refresh and retry
        if (response.status === 401 && !refreshedToken) {
            const didRefresh = await tryRefreshToken();
            if (didRefresh) {
                response = await fetch(`${API_BASE_URL}/api/v1/Users/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store',
                });
            }
        }

        if (!response.ok) {
            console.warn(`[/api/me] MyQurani API returned ${response.status}`);

            // Only fallback to cookie data if the cookie has substantive profile fields
            const userCookie = cookieStore.get('myqurani_user')?.value;
            if (userCookie) {
                try {
                    const userData = JSON.parse(decodeURIComponent(userCookie));
                    if (userData.address || userData.cityName || userData.countryName || userData.dob || userData.avatar) {
                        return NextResponse.json({ profile: convertToProfile(userData) });
                    }
                } catch {}
            }

            return NextResponse.json(
                { error: "Failed to fetch profile from API" },
                { status: response.status }
            );
        }

        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
            return NextResponse.json({ error: "Empty response" }, { status: 500 });
        }

        const result = JSON.parse(responseText);
        const profileData = result.data || result;
        const profile = convertToProfile(profileData);

        const res = NextResponse.json({
            profile,
            accessToken: refreshedToken || undefined,
        });

        // 4. Update cookies if token was refreshed during this request
        if (refreshedToken) {
            const isProd = process.env.NODE_ENV === 'production';
            res.cookies.set('myqurani_access_token', refreshedToken, {
                httpOnly: true,
                secure: isProd,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            });

            if (refreshedRefreshToken) {
                res.cookies.set('myqurani_refresh_token', refreshedRefreshToken, {
                    httpOnly: true,
                    secure: isProd,
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 60 * 60 * 24 * 30,
                });
            }
        }

        return res;
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
    const avatarUrl = normalizeAvatarUrl(
        data.avatarUrl || data.avatar || data.image || data.avatar_url || data.profilePhotoUrl
    );

    return {
        id: String(data.id || data.userId || ''),
        username: data.username || '',
        name: data.name || data.fullName || '',
        full_name: data.fullName || data.name || '',
        fullName: data.fullName || data.name || '',
        nickname: data.nickname || '',
        email: data.email || '',
        avatar: avatarUrl,
        avatar_url: avatarUrl,
        avatarUrl: avatarUrl,
        hp: data.address || data.phone || data.hp || '',
        address: data.address || data.phone || data.hp || '',
        phone: data.phone || data.hp || '',
        noHp: data.noHp || data.phone || data.hp || '',
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
        sex: data.sex ?? data.gender ?? null,
        dob: data.dateOfBirth || data.birthDate || data.dob || null,
        dateOfBirth: data.dateOfBirth || data.birthDate || data.dob || null,
        birth_date: data.dateOfBirth || data.birthDate || null,
        job: data.job || '',
        timezone: data.timezone || '',
        is_verified: data.isVerified || false,
        created_at: data.createdAt || null,
        updated_at: data.updatedAt || null,
    };
}
