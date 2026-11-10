import { NextRequest, NextResponse } from "next/server";

const QURANI_API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q')?.trim() || '';
        const countryCode = searchParams.get('countryCode')?.trim() || '';
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

        if (!q || q.length < 2) {
            return NextResponse.json({ success: false, error: "Query must be at least 2 characters" }, { status: 400 });
        }

        // Build search URL for Qurani API
        const params = new URLSearchParams({ q, limit: limit.toString() });
        if (countryCode && countryCode !== 'all') {
            params.set('countryCode', countryCode.toUpperCase());
        }

        const res = await fetch(`${QURANI_API_BASE}/api/v1/States/search?${params.toString()}`, {
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) throw new Error(`Qurani API error: ${res.status}`);

        const json = await res.json();
        const rawData: any[] = Array.isArray(json?.data) ? json.data : [];

        // Map API response to StateData interface
        const mapped = rawData.map((s: any) => ({
            id: s.id,
            name: s.name,
            countryId: s.countryId,
            country: s.country ?? null,
            countryCode: s.countryCode ?? null,
            fipsCode: s.fipsCode ?? null,
            iso2: s.iso2 ?? null,
            iso3166_2: s.iso3166_2 ?? null,
            type: s.type ?? null,
            level: s.level ?? null,
            parentId: s.parentId ?? null,
            native: s.native ?? null,
            latitude: s.latitude ?? null,
            longitude: s.longitude ?? null,
            timezone: s.timezone ?? null,
            flag: s.flag ?? 1,
            citiesCount: undefined,
        }));

        return NextResponse.json({
            success: true,
            data: mapped,
            count: mapped.length,
        });

    } catch (error) {
        console.error("[Masterdata States Search] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
