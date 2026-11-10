"use server"

import { cookies } from "next/headers"
import { usersApi } from "@/lib/api"
import type { AdminDashboardSummary, DashboardCountItem } from "@/types/admin-dashboard"

const ROLE_ADMIN = "admin"
const TOP_LIMIT = 58
const CACHE_TTL_MS = 60 * 1000

let cachedSummary:
  | {
    data: AdminDashboardSummary
    expiresAt: number
  }
  | null = null

type ProfileLocationRow = {
  countryName: string | null
  stateName: string | null
  cityName: string | null
  gender: number | null
}

const normalizeLabel = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : "Unknown"
  }
  if (value === null || value === undefined) {
    return "Unknown"
  }
  return String(value)
}

const increment = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1)
}

const toTopList = (map: Map<string, number>, limit: number): DashboardCountItem[] => {
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

const fetchUserCountFromApi = async (
  token: string | undefined,
  filters: Record<string, string | boolean> = {}
): Promise<number> => {
  if (!token) return 0

  try {
    const response = await usersApi.search({
      ...filters,
      pageSize: 1
    }, token);
    
    // Attempt to find totalCount
    const payload = response?.data || response;
    const candidates = [
      payload?.pagination?.totalCount,
      payload?.pagination?.total,
      payload?.totalCount,
      payload?.TotalCount,
      payload?.total,
      payload?.count,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return candidate;
      }
    }
    
    // Fallback length
    return Array.isArray(payload?.items) ? payload.items.length : 0;
  } catch (error) {
    return 0;
  }
}

const fetchAllUsersForLocations = async (token: string | undefined): Promise<ProfileLocationRow[]> => {
  if (!token) return [];
  try {
    const response = await usersApi.search({ pageSize: 500 }, token); // Get a decent sample for dashboard
    const payload = response?.data || response;
    const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
    
    return items.map((u: any) => ({
      countryName: u.country || u.countryName || null,
      stateName: u.state || u.stateName || null,
      cityName: u.city || u.cityName || null,
      gender: u.sex !== undefined ? u.sex : (u.gender !== undefined ? u.gender : null),
    }));
  } catch (error) {
    return [];
  }
}

const buildSummary = async (): Promise<AdminDashboardSummary> => {
  const start = Date.now()
  const cookieStore = await cookies()
  const token = cookieStore.get("myqurani_access_token")?.value

  const [
    apiTotalUsers,
    apiTotalAdmins,
    apiBlockedUsers,
    apiActiveUsers,
    profiles
  ] = await Promise.all([
    fetchUserCountFromApi(token),
    fetchUserCountFromApi(token, { Role: ROLE_ADMIN }),
    fetchUserCountFromApi(token, { IsBlocked: true }),
    fetchUserCountFromApi(token, { IsBlocked: false }),
    fetchAllUsersForLocations(token)
  ])

  const totalUsers = Math.max(apiTotalUsers, 0)
  const totalAdmins = Math.max(apiTotalAdmins, 0)
  const blockedUsers = Math.max(apiBlockedUsers, 0)
  const activeUsers = Math.max(apiActiveUsers, 0)
  const activeRule = "Active = API filter IsBlocked=false"

  const countryCounts = new Map<string, number>()
  const stateCounts = new Map<string, number>()
  const cityCounts = new Map<string, number>()
  const genderCounts = new Map<string, number>()

  for (const profile of profiles) {
    increment(countryCounts, normalizeLabel(profile.countryName))
    increment(stateCounts, normalizeLabel(profile.stateName))
    increment(cityCounts, normalizeLabel(profile.cityName))

    const genderLabel =
      profile.gender === 1 ? "Male" : profile.gender === 2 ? "Female" : "Unknown"
    increment(genderCounts, genderLabel)
  }

  const summary: AdminDashboardSummary = {
    cards: {
      totalUsers,
      totalAdmins,
      activeUsers,
      blockedUsers,
    },
    charts: {
      topCountries: toTopList(countryCounts, TOP_LIMIT),
      topStates: toTopList(stateCounts, TOP_LIMIT),
      topCities: toTopList(cityCounts, TOP_LIMIT),
      genderCounts: toTopList(genderCounts, TOP_LIMIT),
    },
    meta: {
      activeRule,
      sourceTable: "MyQurani Users API",
    },
  }

  const durationMs = Date.now() - start
  console.info(`[admin-dashboard] summary fetched in ${durationMs}ms`)

  return summary
}

export async function fetchAdminDashboardSummary() {
  const now = Date.now()
  if (cachedSummary && cachedSummary.expiresAt > now) {
    return cachedSummary.data
  }

  const summary = await buildSummary()
  cachedSummary = {
    data: summary,
    expiresAt: now + CACHE_TTL_MS,
  }
  return summary
}
