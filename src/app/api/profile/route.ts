// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const userId = searchParams.get("userId");

  // Get auth token and user data from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("myqurani_access_token")?.value;
  const userCookie = cookieStore.get("myqurani_user")?.value;

  // Try to get user data from cookie as fallback
  let fallbackUserData: any = null;
  if (userCookie) {
    try {
      fallbackUserData = JSON.parse(decodeURIComponent(userCookie));
    } catch {
      console.log('[Profile API] Failed to parse user cookie');
    }
  }

  if (!token) {
    // If no token but has user cookie, return user data from cookie
    if (fallbackUserData) {
      console.log('[Profile API] No token, using fallback user data');
      return NextResponse.json({
        profile: convertToProfile(fallbackUserData)
      });
    }
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    // Use 'me' endpoint if userId is 'me', undefined, null, or '0'
    const useMeEndpoint = !userId || userId === "me" || userId === "0" || userId === "null" || userId === "undefined";
    const endpoint = useMeEndpoint
      ? `${API_BASE_URL}/api/v1/users/me`
      : `${API_BASE_URL}/api/v1/users/${userId}`;

    console.log('[Profile API] Fetching from:', endpoint);

    // Use fetchWithAutoRefresh for automatic token refresh
    const { fetchWithAutoRefresh } = await import('@/utils/api/token-refresh');

    let response: Response;
    try {
      response = await fetchWithAutoRefresh(endpoint, { method: 'GET' });
    } catch (authError) {
      console.log('[Profile API] Auth error, using fallback');
      if (fallbackUserData) {
        return NextResponse.json({ profile: convertToProfile(fallbackUserData) });
      }
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // If API fails (401, 403, etc.), try fallback to cookie data
    if (!response.ok) {
      console.log('[Profile API] API failed, status:', response.status);

      if (fallbackUserData) {
        console.log('[Profile API] Using fallback user data from cookie');
        return NextResponse.json({
          profile: convertToProfile(fallbackUserData)
        });
      }

      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText ? JSON.parse(errorText).message : "Failed to fetch profile" },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    console.log('[Profile API] Response status:', response.status);

    if (!responseText || responseText.trim() === '') {
      if (fallbackUserData) {
        console.log('[Profile API] Empty response, using fallback');
        return NextResponse.json({
          profile: convertToProfile(fallbackUserData)
        });
      }
      return NextResponse.json(
        { error: "Empty response from server" },
        { status: 500 }
      );
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      if (fallbackUserData) {
        console.log('[Profile API] Parse error, using fallback');
        return NextResponse.json({
          profile: convertToProfile(fallbackUserData)
        });
      }
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    // Extract profile data (handle different response structures)
    const profileData = result.data || result;
    const profile = convertToProfile(profileData);

    console.log('[Profile API] Profile fetched:', profile.username);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[Profile API] Error:", err);

    // Fallback to cookie data on error
    if (fallbackUserData) {
      console.log('[Profile API] Error occurred, using fallback');
      return NextResponse.json({
        profile: convertToProfile(fallbackUserData)
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// Helper function to convert API response to profile format
function convertToProfile(data: any) {
  return {
    id: String(data.id || data.userId || ''),
    username: data.username || '',
    name: data.name || data.fullName || '',
    full_name: data.fullName || data.name || '',
    nickname: data.nickname || '',
    email: data.email || '',
    avatar: data.avatarUrl || data.avatar || data.image || null,
    avatar_url: data.avatarUrl || data.avatar || data.image || null,
    hp: data.phone || data.hp || '',
    noHp: data.phone || data.noHp || '',
    bio: data.bio || '',
    cityId: data.cityId || null,
    city_id: data.cityId || null,
    cityName: data.cityName || '',
    city_name: data.cityName || '',
    stateId: data.stateId || null,
    stateName: data.stateName || '',
    state_name: data.stateName || '',
    countryId: data.countryId || null,
    country_id: data.countryId || null,
    countryName: data.countryName || '',
    country_name: data.countryName || '',
    gender: data.gender || null,
    dob: data.birthDate || data.dob || null,
    birth_date: data.birthDate || null,
    job: data.job || '',
    timezone: data.timezone || '',
    is_verified: data.isVerified || false,
    created_at: data.createdAt || null,
    updated_at: data.updatedAt || null,
  };
}
