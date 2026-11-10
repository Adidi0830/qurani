import { NextResponse } from "next/server";

const QURANI_API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch counts from Qurani API in parallel using pageSize=1 and reading pagination.totalCount
        const [statesRes, citiesRes, countriesRes] = await Promise.all([
            fetch(`${QURANI_API_BASE}/api/v1/States?page=1&pageSize=1`, {
                headers: { 'Accept': 'application/json' }
            }),
            fetch(`${QURANI_API_BASE}/api/v1/Cities?page=1&pageSize=1`, {
                headers: { 'Accept': 'application/json' }
            }),
            fetch(`${QURANI_API_BASE}/api/v1/Countries`, {
                headers: { 'Accept': 'application/json' }
            }),
        ]);

        const [statesJson, citiesJson, countriesJson] = await Promise.all([
            statesRes.ok ? statesRes.json() : null,
            citiesRes.ok ? citiesRes.json() : null,
            countriesRes.ok ? countriesRes.json() : null,
        ]);

        // Extract total counts
        const statesCount = statesJson?.pagination?.totalCount
            || statesJson?.data?.pagination?.totalCount
            || statesJson?.totalCount
            || 0;

        const citiesCount = citiesJson?.pagination?.totalCount
            || citiesJson?.data?.pagination?.totalCount
            || citiesJson?.totalCount
            || 0;

        // Calculate unique regions from countries list
        const countriesData: any[] = countriesJson?.data || [];
        const regionsSet = new Set(
            countriesData
                .map((c: any) => c.region)
                .filter((r: string | null | undefined) => r && r.trim() !== "")
        );

        return NextResponse.json({
            success: true,
            data: {
                regions: regionsSet.size,
                states: statesCount,
                cities: citiesCount
            }
        });

    } catch (error) {
        console.error("[Masterdata Counts API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch masterdata counts" },
            { status: 500 }
        );
    }
}
