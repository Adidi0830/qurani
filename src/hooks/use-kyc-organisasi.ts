"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import dummyOrgsBase from "@/data/dummy-orgs.json"

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

const DUMMY_STATUS_KEY = "qurani_dummy_org_status"

type DummyOverride = { isVerified: number; status: string; isActive: boolean }

function getDummyOverrides(): Record<string, DummyOverride> {
    if (typeof window === "undefined") return {}
    try {
        const raw = localStorage.getItem(DUMMY_STATUS_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}

function setDummyOverride(id: number | string, patch: DummyOverride) {
    if (typeof window === "undefined") return
    const current = getDummyOverrides()
    current[String(id)] = patch
    localStorage.setItem(DUMMY_STATUS_KEY, JSON.stringify(current))
}

function getDummyOrgs() {
    const overrides = getDummyOverrides()
    return dummyOrgsBase.map(d => {
        const ov = overrides[String(d.id)]
        if (!ov) return d
        return { ...d, isVerified: ov.isVerified, status: ov.status, isActive: ov.isActive }
    })
}

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const raw = localStorage.getItem("myqurani_auth")
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed?.accessToken || null
    } catch {
        return null
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrgStatus = "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE" | "INACTIVE"

export type ApiOrg = {
    id: number | string
    name: string
    slug?: string
    description?: string
    type?: string
    categoryId?: number
    categoryName?: string
    category?: string
    legalName?: string
    legalType?: string
    registrationNumber?: string
    taxId?: string
    foundedDate?: string
    email?: string
    phone?: string
    website?: string
    address?: string
    postalCode?: string
    countryId?: number
    stateId?: number
    cityId?: number
    city?: string
    isVerified?: number  // 0=pending, 1=approved, 2=rejected
    isActive?: boolean
    memberCount?: number
    inviteCode?: string
    logo?: string
    image?: string
    banner?: string
    logoUrl?: string
    ownerId?: number
    ownerName?: string
    ownerUsername?: string
    ownerEmail?: string
    createdAt?: string
    updatedAt?: string
    createdBy?: string | number | null
    verificationDocs?: string | null
    status?: string
}

export type OrgMember = {
    id: number
    orgId: number
    userId: number
    userName: string
    role: string
    joinedAt: string
}

export type TabKey = "semua" | "menunggu" | "aktif" | "nonaktif" | "ditolak"

export type FilterState = {
    type: string
    categoryIds: string[]
    isActive: string
    dateFrom: string
    dateTo: string
}

export const EMPTY_FILTER: FilterState = {
    type: "",
    categoryIds: [],
    isActive: "",
    dateFrom: "",
    dateTo: "",
}

export type SortOrder = "newest" | "oldest" | "name_asc"

export type KycOrganisasiState = {
    orgs: ApiOrg[]
    loading: boolean
    error: string | null
    totalCount: number
    page: number
    perPage: number
    tabCounts: Record<TabKey, number>
    activeTab: TabKey
    search: string
    filter: FilterState
    sortOrder: SortOrder
    selectedOrg: ApiOrg | null
    detailOrg: ApiOrg | null
    detailLoading: boolean
    actionLoading: boolean
    toasts: ToastData[]
    orgMembers: OrgMember[]
    orgMembersLoading: boolean
    // setters
    setPage: (p: number) => void
    setPerPage: (p: number) => void
    setActiveTab: (t: TabKey) => void
    setSearch: (s: string) => void
    setFilter: (f: FilterState) => void
    setSortOrder: (s: SortOrder) => void
    setSelectedOrg: (o: ApiOrg | null) => void
    // actions
    fetchDetail: (id: number | string) => Promise<void>
    fetchOrgMembers: (id: number | string) => Promise<void>
    verifyOrg: (id: number | string) => Promise<void>
    rejectOrg: (id: number | string, reason: string) => Promise<void>
    editOrg: (id: number | string, body: Partial<ApiOrg>) => Promise<void>
    regenerateInvite: (id: number | string) => Promise<string>
    toggleActive: (id: number | string, currentStatus: string) => Promise<void>
    removeToast: (id: number | string) => void
    retry: () => void
    clearDetail: () => void
}

export type ToastData = { id: number; message: string; type: "success" | "error" }

// ─── Parse API response ───────────────────────────────────────────────────────

function parseItems(payload: unknown): ApiOrg[] {
    if (!payload) return []
    const p = payload as Record<string, unknown>
    if (Array.isArray(payload)) return payload as ApiOrg[]
    if (Array.isArray(p.data)) return p.data as ApiOrg[]
    if (p.data && typeof p.data === "object") {
        const d = p.data as Record<string, unknown>
        if (Array.isArray(d.items)) return d.items as ApiOrg[]
        if (Array.isArray(d.data)) return d.data as ApiOrg[]
    }
    if (Array.isArray(p.items)) return p.items as ApiOrg[]
    return []
}

function parseTotalCount(payload: unknown, itemsLength = 0): number {
    if (!payload) return itemsLength
    const p = payload as Record<string, any>
    const candidates = [
        p.totalCount, p.total, p.count,
        p.data?.totalCount, p.data?.total,
        p.data?.pagination?.totalCount, p.data?.pagination?.total,
        p.pagination?.totalCount, p.pagination?.total,
    ]
    for (const c of candidates) {
        const n = Number(c)
        if (Number.isFinite(n) && n > 0) return n
    }
    return itemsLength
}

function statusToTabKey(org: ApiOrg): TabKey {
    if (org.status) {
        const s = org.status.toLowerCase();
        if (s === 'active' || s === 'aktif' || s === 'approved') return "aktif";
        if (s === 'pending') return "menunggu";
        if (s === 'rejected' || s === 'ditolak') return "ditolak";
        if (s === 'inactive' || s === 'nonaktif') return "nonaktif";
    }
    if (org.isVerified === 2) return "ditolak";
    if (org.isVerified === 0 && !org.isActive) return "menunggu";
    if (org.isActive) return "aktif";
    return "nonaktif";
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useKycOrganisasi(): KycOrganisasiState {
    const [orgs, setOrgs] = useState<ApiOrg[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [totalCount, setTotalCount] = useState(0)
    const [page, setPageRaw] = useState(1)
    const [perPage, setPerPageRaw] = useState(10)
    const [activeTab, setActiveTabRaw] = useState<TabKey>("semua")
    const [search, setSearchRaw] = useState("")
    const [filter, setFilterRaw] = useState<FilterState>(EMPTY_FILTER)
    const [sortOrder, setSortOrderRaw] = useState<SortOrder>("name_asc")
    const [selectedOrg, setSelectedOrg] = useState<ApiOrg | null>(null)
    const [detailOrg, setDetailOrg] = useState<ApiOrg | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [toasts, setToasts] = useState<ToastData[]>([])
    const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
    const [orgMembersLoading, setOrgMembersLoading] = useState(false)
    const [tabCounts, setTabCounts] = useState<Record<TabKey, number>>({
        semua: 0, menunggu: 0, aktif: 0, nonaktif: 0, ditolak: 0,
    })

    const retryRef = useRef(0)
    const fetchSeqRef = useRef(0)
    // Cache all filtered rows when using fallback mode (for correct total count)
    const fallbackCacheRef = useRef<{ key: string; rows: ApiOrg[] } | null>(null)

    // ── Toast helpers ──────────────────────────────────────────────────────────
    const removeToast = useCallback((id: number | string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const showToast = useCallback((message: string, type: "success" | "error") => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3500)
    }, [])

    // ── Fetch helper ───────────────────────────────────────────────────────────
    const authHeaders = useCallback((): HeadersInit => {
        const token = getClientToken()
        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
    }, [])

    const fetchAllOrgsForCounts = useCallback(async (): Promise<Record<TabKey, number>> => {
        const counts: Record<TabKey, number> = { semua: 0, menunggu: 0, aktif: 0, nonaktif: 0, ditolak: 0 }
        const pageSize = 200
        let pageNum = 1
        let pageGuard = 0
        let expectedTotal = Number.POSITIVE_INFINITY

        while (pageGuard < 200) {
            pageGuard += 1
            const params = new URLSearchParams({ Page: String(pageNum), PageSize: String(pageSize) })
            const res = await fetch(`${API_BASE_URL}/api/v1/Organizations/search?${params}`, { headers: authHeaders() })
            if (!res.ok) break
            const json = await res.json()
            const items = parseItems(json)

            if (pageNum === 1) {
                expectedTotal = parseTotalCount(json, items.length)
                getDummyOrgs().forEach(d => {
                    counts[statusToTabKey(d as any)] += 1
                    counts.semua += 1
                })
            }

            items.forEach((org) => {
                counts[statusToTabKey(org)] += 1
                counts.semua += 1
            })

            if (items.length === 0) break
            if (Number.isFinite(expectedTotal) && counts.semua >= expectedTotal) break
            if (items.length < pageSize) break
            pageNum += 1
        }

        return counts
    }, [authHeaders])

    // ── Fetch tab counts ───────────────────────────────────────────────────────
    const fetchTabCounts = useCallback(async () => {
        try {
            const counts = await fetchAllOrgsForCounts()
            setTabCounts(counts)
        } catch { }
    }, [fetchAllOrgsForCounts])

    // ── Main fetch ─────────────────────────────────────────────────────────────
    const fetchOrgs = useCallback(async () => {
        const requestId = ++fetchSeqRef.current
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            params.set("Page", String(page))
            params.set("PageSize", String(perPage))

            if (search.trim()) params.set("Name", search.trim())

            // REMOVED IsActive param because the API currently returns 400 Bad Request for it.
            // We rely purely on the local tabFilteredItems and strictFallback to handle IsActive and status.

            // Add sorting parameters
            if (sortOrder === "name_asc") {
                params.set("SortBy", "NameAsc")
            } else if (sortOrder === "newest") {
                params.set("SortBy", "CreatedDateDesc")
            } else if (sortOrder === "oldest") {
                params.set("SortBy", "CreatedDateAsc")
            }

            if (filter.type) params.set("Type", filter.type)
            if (filter.categoryIds.length === 1) params.set("CategoryId", filter.categoryIds[0])
            if (filter.dateFrom) params.set("DateFrom", filter.dateFrom)
            if (filter.dateTo) params.set("DateTo", filter.dateTo)

            const res = await fetch(
                `${API_BASE_URL}/api/v1/Organizations/search?${params}`,
                { headers: authHeaders() }
            )

            if (!res.ok) {
                throw new Error(`API error: ${res.status} ${res.statusText}`)
            }

            const json = await res.json()
            let items = parseItems(json)

            // INJECT DUMMY DATA ONLY ON PAGE 1
            if (page === 1) {
                const searchLower = search.trim().toLowerCase();
                const filteredDummy = getDummyOrgs().filter(d => {
                    if (searchLower && !d.name.toLowerCase().includes(searchLower)) return false;
                    return true;
                })
                items = [...filteredDummy as any, ...items]
            }

            const total = parseTotalCount(json, items.length)

            const tabFilteredItems =
                activeTab === "semua"
                    ? items
                    : items.filter((org) => statusToTabKey(org) === activeTab)

            // Some API responses may ignore IsVerified filter on /search.
            // If we detect mixed statuses in a filtered tab, fallback by fetching
            // all rows for current non-status filters and filter locally.
            const needStrictFallback =
                filter.categoryIds.length > 1 ||
                (activeTab !== "semua" &&
                items.length > 0 &&
                tabFilteredItems.length !== items.length)

            if (needStrictFallback) {
                // Build a cache key to avoid re-fetching all rows on page/perPage change
                const cacheKey = `${activeTab}|${search}|${filter.type}|${filter.categoryIds.join(",")}|${filter.isActive}|${filter.dateFrom}|${filter.dateTo}`

                let strictFiltered: ApiOrg[]

                if (fallbackCacheRef.current?.key === cacheKey) {
                    // Use cached rows — only page/perPage changed
                    strictFiltered = fallbackCacheRef.current.rows
                } else {
                    // Need to re-fetch all rows
                    const allRows: ApiOrg[] = []
                    const pageSizeFallback = 200
                    let fallbackPage = 1
                    let guard = 0
                    let expectedTotal = Number.POSITIVE_INFINITY

                    while (guard < 200) {
                        guard += 1
                        const p = new URLSearchParams()
                        p.set("Page", String(fallbackPage))
                        p.set("PageSize", String(pageSizeFallback))
                        if (search.trim()) p.set("Name", search.trim())
                        if (filter.type) p.set("Type", filter.type)
                        // Do not append CategoryId to fallback fetch if there are multiple, to let client filter
                        if (filter.categoryIds.length === 1) p.set("CategoryId", filter.categoryIds[0])
                        // Do not append IsActive to fallback fetch to prevent 400 Bad Request
                        if (filter.dateFrom) p.set("DateFrom", filter.dateFrom)
                        if (filter.dateTo) p.set("DateTo", filter.dateTo)

                        const r = await fetch(`${API_BASE_URL}/api/v1/Organizations/search?${p}`, {
                            headers: authHeaders(),
                        })
                        if (!r.ok) break
                        const j = await r.json()
                        const rows = parseItems(j)
                        if (fallbackPage === 1) expectedTotal = parseTotalCount(j, rows.length)
                        allRows.push(...rows)

                        if (rows.length === 0) break
                        if (Number.isFinite(expectedTotal) && allRows.length >= expectedTotal) break
                        if (rows.length < pageSizeFallback) break
                        fallbackPage += 1
                    }

                    strictFiltered = allRows.filter((org) => {
                        if (activeTab !== "semua" && statusToTabKey(org) !== activeTab) return false;
                        if (filter.categoryIds.length > 1) {
                            const matchCategory = org.category || org.categoryName || String(org.categoryId || "");
                            if (!filter.categoryIds.includes(matchCategory)) return false;
                        }
                        return true;
                    })

                    const searchLower = search.trim().toLowerCase();
                    const filteredDummy = getDummyOrgs().filter(d => {
                        if (searchLower && !d.name.toLowerCase().includes(searchLower)) return false;
                        if (activeTab !== "semua" && statusToTabKey(d as any) !== activeTab) return false;
                        if (filter.categoryIds.length > 1) {
                            const matchCategory = (d as any).category || (d as any).categoryName || String((d as any).categoryId || "");
                            if (!filter.categoryIds.includes(matchCategory)) return false;
                        }
                        return true;
                    });
                    strictFiltered = [...filteredDummy as any, ...strictFiltered];

                    // Cache the filtered rows so page/perPage changes don't re-fetch
                    fallbackCacheRef.current = { key: cacheKey, rows: strictFiltered }
                }

                // Apply client-side sort
                const sorted = [...strictFiltered].sort((a, b) => {
                    if (sortOrder === "name_asc") {
                        const cmp = String(a.name || "").localeCompare(String(b.name || ""))
                        return cmp !== 0 ? cmp : (Number(b.id) - Number(a.id))
                    }
                    const da = new Date(a.createdAt || 0).getTime()
                    const db = new Date(b.createdAt || 0).getTime()
                    if (da === db) {
                        return sortOrder === "newest" ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id)
                    }
                    return sortOrder === "newest" ? db - da : da - db
                })

                const start = (page - 1) * perPage
                const end = start + perPage
                if (requestId !== fetchSeqRef.current) return
                setOrgs(sorted.slice(start, end))
                // ✅ Use the FULL filtered count (not just current page slice)
                setTotalCount(strictFiltered.length)
            } else {
                // Apply client-side sort for non-fallback mode too
                const sorted = [...tabFilteredItems].sort((a, b) => {
                    if (sortOrder === "name_asc") {
                        const cmp = String(a.name || "").localeCompare(String(b.name || ""))
                        return cmp !== 0 ? cmp : (Number(b.id) - Number(a.id))
                    }
                    const da = new Date(a.createdAt || 0).getTime()
                    const db = new Date(b.createdAt || 0).getTime()
                    if (da === db) {
                        return sortOrder === "newest" ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id)
                    }
                    return sortOrder === "newest" ? db - da : da - db
                })
                if (requestId !== fetchSeqRef.current) return
                setOrgs(sorted)
                setTotalCount(total)
            }
        } catch (err) {
            if (requestId !== fetchSeqRef.current) return
            const msg = err instanceof Error ? err.message : "Gagal memuat data"
            setError(msg)
            setOrgs([])
            setTotalCount(0)
        } finally {
            if (requestId !== fetchSeqRef.current) return
            setLoading(false)
        }
    }, [page, perPage, search, activeTab, filter, sortOrder, authHeaders])

    useEffect(() => {
        fetchOrgs()
        fetchTabCounts()
    }, [fetchOrgs, fetchTabCounts])

    // ── Detail ─────────────────────────────────────────────────────────────────
    const fetchDetail = useCallback(async (id: number | string) => {
        setDetailLoading(true)
        setDetailOrg(null)

        const dummyOrg = getDummyOrgs().find(d => String(d.id) === String(id));
        if (dummyOrg) {
            setDetailOrg(dummyOrg as unknown as ApiOrg);
            setDetailLoading(false);
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/Organizations/${id}`,
                { headers: authHeaders() }
            )
            if (!res.ok) throw new Error(`API error: ${res.status}`)
            const json = await res.json()
            const item: ApiOrg = json?.data ?? json
            setDetailOrg(item)
        } catch {
            showToast("Gagal memuat detail organisasi", "error")
        } finally {
            setDetailLoading(false)
        }
    }, [authHeaders, showToast])

    // ── Members ────────────────────────────────────────────────────────────────
    const fetchOrgMembers = useCallback(async (id: number | string) => {
        setOrgMembersLoading(true)
        setOrgMembers([])
        try {
            const params = new URLSearchParams({ page: "1", pageSize: "100" })
            const res = await fetch(
                `${API_BASE_URL}/api/v1/Organizations/${id}/members?${params}`,
                { headers: authHeaders() }
            )
            if (!res.ok) throw new Error(`API error: ${res.status}`)
            const json = await res.json()
            const items = json?.data?.items ?? json?.data ?? []
            setOrgMembers(Array.isArray(items) ? items : [])
        } catch {
            showToast("Gagal memuat daftar pengajar", "error")
        } finally {
            setOrgMembersLoading(false)
        }
    }, [authHeaders, showToast])

    // ── Verify / Approve ───────────────────────────────────────────────────────
    const verifyOrg = useCallback(async (id: number | string) => {
        setActionLoading(true)

        // --- DUMMY: persist to localStorage so refresh survives ---
        const isDummy = getDummyOrgs().some(d => String(d.id) === String(id));
        if (isDummy) {
            setDummyOverride(id, { isVerified: 1, status: 'ACTIVE', isActive: true });
            showToast("Organisasi berhasil diverifikasi", "success")
            await fetchOrgs()
            await fetchTabCounts()
            await fetchDetail(id)
            setActionLoading(false)
            return;
        }
        // ----------------------------------------------------------

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/Organizations/${id}/verify`,
                {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ verified: 1, verificationDocs: null }),
                }
            )
            if (!res.ok) throw new Error(`API error: ${res.status}`)
            showToast("Organisasi berhasil diverifikasi", "success")
            await fetchOrgs()
            await fetchTabCounts()
            setSelectedOrg(null)
            setDetailOrg(null)
            await fetchDetail(id)
        } catch {
            showToast("Gagal memverifikasi organisasi", "error")
        } finally {
            setActionLoading(false)
        }
    }, [authHeaders, showToast, fetchOrgs, fetchTabCounts, fetchDetail])

    // ── Reject ─────────────────────────────────────────────────────────────────
    const rejectOrg = useCallback(async (id: number | string, reason: string) => {
        setActionLoading(true)

        // --- DUMMY: persist to localStorage so refresh survives ---
        const isDummy = getDummyOrgs().some(d => String(d.id) === String(id));
        if (isDummy) {
            setDummyOverride(id, { isVerified: 2, status: 'REJECTED', isActive: false });
            showToast("Organisasi berhasil ditolak", "error")
            await fetchOrgs()
            await fetchTabCounts()
            await fetchDetail(id)
            setActionLoading(false)
            return;
        }
        // ----------------------------------------------------------

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/Organizations/${id}/status`,
                {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ status: "REJECTED", reason }),
                }
            )
            if (!res.ok) throw new Error(`API error: ${res.status}`)
            showToast("Organisasi berhasil ditolak", "error")
            await fetchOrgs()
            await fetchTabCounts()
            setSelectedOrg(null)
            setDetailOrg(null)
            await fetchDetail(id)
        } catch {
            showToast("Gagal menolak organisasi", "error")
        } finally {
            setActionLoading(false)
        }
    }, [authHeaders, showToast, fetchOrgs, fetchTabCounts, fetchDetail])

    // ── Edit ───────────────────────────────────────────────────────────────────
    const editOrg = useCallback(async (id: number | string, body: Partial<ApiOrg>) => {
        setActionLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/Organizations/${id}`,
                {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify(body),
                }
            )
            if (!res.ok) throw new Error(`API error: ${res.status}`)
            showToast("Organisasi berhasil diperbarui", "success")
            await fetchOrgs()
            setSelectedOrg(null)
        } catch {
            showToast("Gagal memperbarui organisasi", "error")
        } finally {
            setActionLoading(false)
        }
    }, [authHeaders, showToast, fetchOrgs])

    // ── Regenerate Invite ──────────────────────────────────────────────────────
    const regenerateInvite = useCallback(async (id: number | string): Promise<string> => {
        setActionLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/Organizations/${id}/regenerate-invite`,
                { method: "POST", headers: authHeaders() }
            )
            if (!res.ok) throw new Error(`API error: ${res.status}`)
            const json = await res.json()
            const newCode: string = json?.data?.inviteCode ?? json?.inviteCode ?? "—"
            showToast("Kode undangan berhasil diperbarui", "success")
            return newCode
        } catch {
            showToast("Gagal memperbarui kode undangan", "error")
            return ""
        } finally {
            setActionLoading(false)
        }
    }, [authHeaders, showToast])

    // ── Toggle Active ──────────────────────────────────────────────────────────
    const toggleActive = useCallback(async (id: number | string, currentStatus: string) => {
        const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
        setActionLoading(true)

        // --- DUMMY: persist to localStorage so refresh survives ---
        const dummyOrg = getDummyOrgs().find(d => String(d.id) === String(id));
        if (dummyOrg) {
            setDummyOverride(id, {
                isVerified: dummyOrg.isVerified,
                status: newStatus,
                isActive: newStatus === "ACTIVE"
            });
            const label = newStatus === "ACTIVE" ? "diaktifkan" : "dinonaktifkan"
            showToast(`Organisasi berhasil ${label}`, "success")
            await fetchOrgs()
            await fetchDetail(id)
            setActionLoading(false)
            return;
        }
        // ----------------------------------------------------------

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/Organizations/${id}/status`,
                {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ status: newStatus }),
                }
            )
            if (!res.ok) throw new Error(`API error: ${res.status}`)
            const label = newStatus === "ACTIVE" ? "diaktifkan" : "dinonaktifkan"
            showToast(`Organisasi berhasil ${label}`, "success")
            await fetchOrgs()
        } catch {
            showToast("Gagal mengubah status organisasi", "error")
        } finally {
            setActionLoading(false)
        }
    }, [authHeaders, showToast, fetchOrgs, fetchDetail])

    // ── Setters with page reset ────────────────────────────────────────────────
    const setPage = useCallback((p: number) => setPageRaw(p), [])
    const setPerPage = useCallback((p: number) => { setPerPageRaw(p); setPageRaw(1) }, [])
    const setActiveTab = useCallback((t: TabKey) => { setActiveTabRaw(t); setPageRaw(1); fallbackCacheRef.current = null }, [])
    const setSearch = useCallback((s: string) => { setSearchRaw(s); setPageRaw(1); fallbackCacheRef.current = null }, [])
    const setFilter = useCallback((f: FilterState) => { setFilterRaw(f); setPageRaw(1); fallbackCacheRef.current = null }, [])
    const setSortOrder = useCallback((s: SortOrder) => { setSortOrderRaw(s); setPageRaw(1) }, [])
    const retry = useCallback(() => { retryRef.current += 1; fallbackCacheRef.current = null; fetchOrgs() }, [fetchOrgs])
    const clearDetail = useCallback(() => { setDetailOrg(null); setSelectedOrg(null) }, [])

    return {
        orgs, loading, error, totalCount, page, perPage,
        tabCounts, activeTab, search, filter, sortOrder,
        selectedOrg, detailOrg, detailLoading, actionLoading, toasts,
        orgMembers, orgMembersLoading,
        setPage, setPerPage, setActiveTab, setSearch, setFilter, setSortOrder,
        setSelectedOrg, fetchDetail, fetchOrgMembers, verifyOrg, rejectOrg, editOrg,
        regenerateInvite, toggleActive, removeToast, retry, clearDetail,
    }
}
