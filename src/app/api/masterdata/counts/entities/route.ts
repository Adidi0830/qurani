import { NextRequest, NextResponse } from "next/server";

const QURANI_API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const countryId = searchParams.get('countryId');

        if (!countryId) {
            return NextResponse.json({ success: false, error: "countryId is required" }, { status: 400 });
        }

        // Fetch counts from Qurani API in parallel using pageSize=1
        // We use the specific endpoints for states and cities by country
        const [statesRes, citiesRes] = await Promise.all([
            fetch(`${QURANI_API_BASE}/api/v1/States/country/${countryId}?page=1&pageSize=1`, {
                headers: { 'Accept': 'application/json' }
            }),
            fetch(`${QURANI_API_BASE}/api/v1/Cities/country/${countryId}?page=1&pageSize=1`, {
                headers: { 'Accept': 'application/json' }
            })
        ]);

        const [statesJson, citiesJson] = await Promise.all([
            statesRes.ok ? statesRes.json() : null,
            citiesRes.ok ? citiesRes.json() : null,
        ]);

        // Extract total counts from pagination metadata, fallback to data length
        const statesCount = statesJson?.pagination?.totalCount
            || statesJson?.data?.pagination?.totalCount
            || statesJson?.totalCount
            || (Array.isArray(statesJson?.data) ? statesJson.data.length : 0);

        const citiesCount = citiesJson?.pagination?.totalCount
            || citiesJson?.data?.pagination?.totalCount
            || citiesJson?.totalCount
            || (Array.isArray(citiesJson?.data) ? citiesJson.data.length : 0);

        return NextResponse.json({
            success: true,
            data: {
                states: statesCount,
                cities: citiesCount
            }
        });

    } catch (error) {
        console.error("[Masterdata Entity Counts API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch entity counts" },
            { status: 500 }
        );
    }
}
