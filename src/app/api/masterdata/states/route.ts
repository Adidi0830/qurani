import { NextRequest, NextResponse } from "next/server";

const QURANI_API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const countryCode = searchParams.get('countryCode')?.trim().toUpperCase() || '';
        const countryId = searchParams.get('countryId')?.trim() || '';

        // Build Qurani API URL
        let apiUrl: string;
        if (countryId) {
            // Get states by country ID
            apiUrl = `${QURANI_API_BASE}/api/v1/States/country/${countryId}`;
        } else if (countryCode) {
            // Get states by country code (ISO2)
            apiUrl = `${QURANI_API_BASE}/api/v1/States/country-code/${countryCode}`;
        } else {
            // Get all states (paginated - fetch up to 5000 with large pageSize)
            apiUrl = `${QURANI_API_BASE}/api/v1/States?page=1&pageSize=5000`;
        }

        const res = await fetch(apiUrl, {
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
            // citiesCount not available from this API endpoint
            citiesCount: undefined,
        }));

        return NextResponse.json({
            success: true,
            data: mapped,
            count: mapped.length,
            cached: false,
        });

    } catch (error) {
        console.error("[Masterdata States API] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
