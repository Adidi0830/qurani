import { NextRequest, NextResponse } from "next/server";

const QURANI_API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
let _cache: { data: any[]; timestamp: number } | null = null;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const currencyFilter = searchParams.get('currency')?.trim().toUpperCase() ?? null;

        const now = Date.now();

        // Serve from cache if still fresh
        if (_cache && (now - _cache.timestamp < CACHE_TTL)) {
            const data = currencyFilter
                ? _cache.data.filter(c => c.currency?.trim().toUpperCase() === currencyFilter)
                : _cache.data;

            return NextResponse.json({
                success: true,
                data,
                count: data.length,
                cached: true,
            });
        }

        // Fetch from Qurani API
        const res = await fetch(`${QURANI_API_BASE}/api/v1/Countries`, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 86400 } // 24h revalidate
        });

        if (!res.ok) throw new Error(`Qurani API error: ${res.status}`);

        const json = await res.json();
        const rawData: any[] = json?.data || [];

        // Map API response fields to CountryData interface
        const mappedData = rawData.map((c: any) => ({
            id: c.id,
            name: c.name,
            iso3: c.iso3 ?? null,
            iso2: c.iso2 ?? null,
            numericCode: c.numericCode ?? null,
            phoneCode: c.phoneCode ?? null,
            capital: c.capital ?? null,
            currency: c.currency ?? null,
            currencyName: c.currencyName ?? null,
            currencySymbol: c.currencySymbol ?? null,
            tld: c.tld ?? null,
            native: c.native ?? null,
            population: c.population ?? null,
            gdp: c.gdp ?? null,
            region: c.region ?? null,
            regionId: c.regionId ?? null,
            subregion: c.subregion ?? null,
            subregionId: c.subregionId ?? null,
            nationality: c.nationality ?? null,
            timezones: c.timezones ?? null,
            latitude: c.latitude ?? null,
            longitude: c.longitude ?? null,
            emoji: c.emoji ?? null,
            emojiU: c.emojiU ?? null,
            flag: c.flag ?? 1,
            // statesCount and citiesCount are not available from this API endpoint
            statesCount: undefined,
            citiesCount: undefined,
        }));

        // Sort by ID
        mappedData.sort((a, b) => a.id - b.id);

        // Save to cache
        _cache = { data: mappedData, timestamp: Date.now() };

        // Filter if currency query param was provided
        const filtered = currencyFilter
            ? mappedData.filter(c => c.currency?.trim().toUpperCase() === currencyFilter)
            : mappedData;

        return NextResponse.json({
            success: true,
            data: filtered,
            count: filtered.length,
            cached: false,
        });

    } catch (error) {
        console.error("[MasterdataCountries] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
