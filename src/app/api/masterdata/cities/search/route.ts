import { NextRequest, NextResponse } from "next/server";

const QURANI_API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q')?.trim() || '';
        const countryCode = searchParams.get('countryCode')?.trim() || '';
        const stateId = searchParams.get('stateId')?.trim() || '';
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

        if ((!q || q.length < 2) && !stateId && (!countryCode || countryCode === 'All')) {
            return NextResponse.json({ success: false, error: "Query must be at least 2 characters if no country/state filter is applied" }, { status: 400 });
        }

        // Build Qurani API search URL
        const params = new URLSearchParams({ q, limit: limit.toString() });
        if (stateId && stateId !== 'all') {
            params.set('stateId', stateId);
        } else if (countryCode && countryCode !== 'All') {
            params.set('countryCode', countryCode.toUpperCase());
        }

        const res = await fetch(`${QURANI_API_BASE}/api/v1/Cities/search?${params.toString()}`, {
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) throw new Error(`Qurani API error: ${res.status}`);

        const json = await res.json();
        const rawData: any[] = Array.isArray(json?.data) ? json.data : [];

        // Map to CityData interface
        const mapped = rawData.map((c: any) => ({
            id: c.id,
            name: c.name,
            stateId: c.stateId,
            state: c.state ?? null,
            stateCode: c.stateCode ?? null,
            countryId: c.countryId,
            country: c.country ?? null,
            countryCode: c.countryCode ?? null,
            latitude: c.latitude ?? null,
            longitude: c.longitude ?? null,
            native: c.native ?? null,
            timezone: c.timezone ?? null,
        }));

        const totalCount = json?.pagination?.totalCount || json?.data?.pagination?.totalCount || json?.totalCount || mapped.length;

        return NextResponse.json({
            success: true,
            data: mapped,
            count: mapped.length,
            totalCount: totalCount,
        });

    } catch (error) {
        console.error("[Masterdata Cities Search] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
