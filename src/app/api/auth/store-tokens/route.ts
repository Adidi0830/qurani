import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { accessToken, refreshToken, user } = body;

        if (!accessToken || !refreshToken) {
            return NextResponse.json(
                { success: false, error: "Missing tokens" },
                { status: 400 }
            );
        }

        // TODO: Re-enable role validation after testing
        // Validate user role
        // const allowedRoles = ["admin", "billing", "support"];
        // const userRole = user?.role?.toLowerCase() || "member";
        // if (!allowedRoles.includes(userRole)) {
        //     return NextResponse.json(
        //         { success: false, error: "Access denied: Insufficient permissions" },
        //         { status: 403 }
        //     );
        // }
        console.log("[StoreTokens] Role validation temporarily disabled for testing");

        const cookieStore = await cookies();

        // Store access token
        cookieStore.set("myqurani_access_token", accessToken, TOKEN_COOKIE_OPTIONS);

        // Store refresh token (longer expiry)
        cookieStore.set("myqurani_refresh_token", refreshToken, {
            ...TOKEN_COOKIE_OPTIONS,
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Store user info (readable by client)
        if (user) {
            cookieStore.set(
                "myqurani_user",
                JSON.stringify({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                }),
                {
                    ...TOKEN_COOKIE_OPTIONS,
                    httpOnly: false, // Allow client-side access
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[StoreTokens] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to store tokens" },
            { status: 500 }
        );
    }
}
