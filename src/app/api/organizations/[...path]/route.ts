import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com";

type RouteContext = {
    params: Promise<{ path: string[] }>;
};

async function proxyOrganizations(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    const segments = Array.isArray(path) ? path.filter(Boolean) : [];

    if (
        segments.length === 0 ||
        segments.some((seg) => seg === "." || seg === ".." || seg.includes("\\"))
    ) {
        return NextResponse.json(
            { success: false, message: "Invalid organization endpoint path" },
            { status: 400 }
        );
    }

    const encodedPath = segments.map((s) => encodeURIComponent(s)).join("/");
    const targetUrl = `${API_BASE_URL}/api/v1/Organizations/${encodedPath}${request.nextUrl.search}`;

    const headers: Record<string, string> = {
        Accept: request.headers.get("accept") || "application/json",
    };

    const contentType = request.headers.get("content-type");
    if (contentType) {
        headers["Content-Type"] = contentType;
    }

    let authHeader = request.headers.get("authorization");
    if (!authHeader) {
        const cookieStore = await cookies();
        const cookieToken = cookieStore.get("myqurani_access_token")?.value;
        if (cookieToken) {
            authHeader = `Bearer ${cookieToken}`;
        }
    }
    if (authHeader) {
        headers["Authorization"] = authHeader;
    }

    const method = request.method.toUpperCase();
    const init: RequestInit = {
        method,
        headers,
        cache: "no-store",
    };

    if (method !== "GET" && method !== "HEAD") {
        const bodyText = await request.text();
        if (bodyText) {
            init.body = bodyText;
        }
    }

    try {
        const upstream = await fetch(targetUrl, init);
        const responseText = await upstream.text();
        const upstreamContentType =
            upstream.headers.get("content-type") || "application/json";

        return new NextResponse(responseText, {
            status: upstream.status,
            headers: {
                "Content-Type": upstreamContentType,
            },
        });
    } catch (error) {
        console.error("[API Proxy /api/organizations] Upstream error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to reach MyQurani Organizations API" },
            { status: 502 }
        );
    }
}

export async function GET(request: NextRequest, context: RouteContext) {
    return proxyOrganizations(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
    return proxyOrganizations(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
    return proxyOrganizations(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    return proxyOrganizations(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    return proxyOrganizations(request, context);
}

