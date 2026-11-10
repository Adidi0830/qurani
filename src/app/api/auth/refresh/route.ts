// app/api/auth/refresh/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export async function POST() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("myqurani_refresh_token")?.value;

    if (!refreshToken) {
        console.log('[Auth Refresh] No refresh token found');
        return NextResponse.json(
            { success: false, error: "No refresh token" },
            { status: 401 }
        );
    }

    try {
        console.log('[Auth Refresh] Attempting to refresh token...');

        const response = await fetch(`${API_BASE_URL}/api/v1/Auth/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        const responseText = await response.text();
        console.log('[Auth Refresh] Response status:', response.status);

        if (!response.ok || !responseText) {
            console.error('[Auth Refresh] Refresh failed');

            // Clear cookies on refresh failure
            const res = NextResponse.json(
                { success: false, error: "Token refresh failed" },
                { status: 401 }
            );

            res.cookies.delete('myqurani_access_token');
            res.cookies.delete('myqurani_refresh_token');
            res.cookies.delete('myqurani_user');

            return res;
        }

        const result = JSON.parse(responseText);
        const data = result.data || result;

        if (!data.accessToken) {
            console.error('[Auth Refresh] No access token in response');
            return NextResponse.json(
                { success: false, error: "Invalid refresh response" },
                { status: 400 }
            );
        }

        console.log('[Auth Refresh] Token refreshed successfully!');

        // Create response with new cookies
        const res = NextResponse.json({
            success: true,
            message: "Token refreshed successfully",
        });

        // Set new access token
        res.cookies.set('myqurani_access_token', data.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        // Set new refresh token if provided
        if (data.refreshToken) {
            res.cookies.set('myqurani_refresh_token', data.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days
            });
        }

        // Update user cookie if user data is provided
        if (data.userId || data.email || data.username) {
            const userData = {
                id: data.userId,
                email: data.email,
                username: data.username,
                name: data.name,
                image: data.image,
                roles: data.roles || [],
            };

            res.cookies.set('myqurani_user', JSON.stringify(userData), {
                httpOnly: false, // Accessible by client for display
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            });
        }

        return res;
    } catch (error) {
        console.error('[Auth Refresh] Error:', error);
        return NextResponse.json(
            { success: false, error: "Refresh error" },
            { status: 500 }
        );
    }
}
