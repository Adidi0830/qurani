import { NextRequest, NextResponse } from "next/server";
import { fetchWithAutoRefresh } from "@/utils/api/token-refresh";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com";

type TimezoneRecord = {
  id: string;
  name: string;
  code: string;
  countryCode?: string;
  countryName?: string;
  stateName?: string;
  cityName?: string;
  offset?: string;
};

const INDONESIA_TIMEZONE_FALLBACK: TimezoneRecord[] = [
  {
    id: "id-wib",
    name: "Asia/Jakarta",
    code: "Asia/Jakarta",
    countryCode: "ID",
    countryName: "Indonesia",
    offset: "+07:00",
  },
  {
    id: "id-wita",
    // Label "Asia/Bali" sesuai request bisnis, tapi code pakai IANA valid.
    name: "Asia/Makassar",
    code: "Asia/Makassar",
    countryCode: "ID",
    countryName: "Indonesia",
    offset: "+08:00",
  },
  {
    id: "id-wit",
    name: "Asia/Jayapura",
    code: "Asia/Jayapura",
    countryCode: "ID",
    countryName: "Indonesia",
    offset: "+09:00",
  },
];

function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const maybeData = (value as { data?: unknown }).data;
    if (Array.isArray(maybeData)) return maybeData as T[];
    if (maybeData && typeof maybeData === "object") return [maybeData as T];
    return [value as T];
  }
  return [];
}

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pick(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = toString(raw[key]);
    if (value) return value;
  }
  return "";
}

function normalizeTimezone(raw: unknown): TimezoneRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const code = pick(row, ["code", "name", "value", "timezone", "timezoneCode"]);
  const name = pick(row, ["name", "code", "value", "timezone", "timezoneName"]);
  if (!code && !name) return null;

  const id = pick(row, ["id", "code", "name"]) || `${code || name}`;
  const countryCode = pick(row, ["countryCode", "country_code", "countryIso2", "countryISO2"]).toUpperCase() || undefined;

  return {
    id,
    name: name || code,
    code: code || name,
    countryCode,
    countryName: pick(row, ["countryName", "country", "country_name"]) || undefined,
    stateName: pick(row, ["stateName", "state", "state_name", "provinceName", "province"]) || undefined,
    cityName: pick(row, ["cityName", "city", "city_name"]) || undefined,
    offset: pick(row, ["offset", "utcOffset", "gmtOffset", "offsetText"]) || undefined,
  };
}

function buildEndpoint(params: URLSearchParams): string {
  const countryCode = params.get("countryCode")?.trim();
  const q = params.get("q")?.trim();
  const code = params.get("code")?.trim();
  const page = params.get("page")?.trim() || "1";
  const pageSize = params.get("pageSize")?.trim() || "20";

  if (code) return `${API_BASE_URL}/api/v1/Timezones/code/${encodeURIComponent(code)}`;
  if (countryCode) return `${API_BASE_URL}/api/v1/Timezones/country/${encodeURIComponent(countryCode.toUpperCase())}`;
  if (q) {
    const query = new URLSearchParams({ q, page, pageSize });
    return `${API_BASE_URL}/api/v1/Timezones/search?${query.toString()}`;
  }

  return `${API_BASE_URL}/api/v1/Timezones`;
}

function mergeUniqueTimezones(rows: TimezoneRecord[]): TimezoneRecord[] {
  const map = new Map<string, TimezoneRecord>();
  rows.forEach((row) => {
    const key = (row.code || row.name).trim().toLowerCase();
    if (!key) return;
    if (!map.has(key)) map.set(key, row);
  });
  return Array.from(map.values());
}

export async function GET(request: NextRequest) {
  try {
    const countryCodeParam = request.nextUrl.searchParams.get("countryCode")?.trim().toUpperCase() || "";
    const codeParam = request.nextUrl.searchParams.get("code")?.trim() || "";
    const queryParam = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";

    const endpoint = buildEndpoint(request.nextUrl.searchParams);
    const response = await fetchWithAutoRefresh(endpoint, { method: "GET" });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: message || "Failed to fetch timezones" },
        { status: response.status }
      );
    }

    const text = await response.text();
    if (!text) {
      return NextResponse.json({ success: true, data: [], count: 0 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: true, data: [], count: 0 });
    }

    const normalized = toArray(parsed)
      .map(normalizeTimezone)
      .filter((row): row is TimezoneRecord => Boolean(row));

    let finalData = normalized;

    // Fallback khusus Indonesia: selalu pastikan 3 zona waktu tersedia.
    if (countryCodeParam === "ID") {
      finalData = mergeUniqueTimezones([...normalized, ...INDONESIA_TIMEZONE_FALLBACK]);
    } else if (codeParam) {
      const codeLower = codeParam.toLowerCase();
      if (codeLower === "asia/bali") {
        finalData = mergeUniqueTimezones([
          ...normalized,
          INDONESIA_TIMEZONE_FALLBACK[1],
        ]);
      }
    } else if (queryParam) {
      if (queryParam.includes("indonesia") || queryParam.includes("bali")) {
        finalData = mergeUniqueTimezones([...normalized, ...INDONESIA_TIMEZONE_FALLBACK]);
      }
    }

    return NextResponse.json({
      success: true,
      data: finalData,
      count: finalData.length,
    });
  } catch (error) {
    console.error("[Masterdata Timezones API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
