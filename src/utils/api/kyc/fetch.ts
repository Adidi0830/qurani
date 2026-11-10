"use server";

/**
 * KYC Admin API
 *
 * Endpoints:
 * - GET  /api/v1/Kyc/all              → semua KYC dengan paginasi
 * - GET  /api/v1/Kyc/pending          → hanya yang pending
 * - POST /api/v1/Kyc/{id}/start-review → tandai sedang direview
 * - POST /api/v1/Kyc/{id}/review      → setujui / tolak
 * - GET  /api/v1/Kyc/admin/deletion-requests → permintaan hapus data
 */

import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type KycStatus = 0 | 1 | 2 | 3;
// 0 = pending, 1 = in_review, 2 = approved, 3 = rejected

export interface KycSubmission {
  id: number;
  userId: number;
  username: string | null;
  email: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  documentImageUrl: string | null;
  selfieImageUrl: string | null;
  status: KycStatus;
  statusName: string | null;
  riskLevel: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  // UI-only: local placeholder images for demo/dummy mode
  _dummyDocImage?: string;
  _dummySelfieImage?: string;
}

export interface KycDeletionRequest {
  id: number;
  userId: number;
  username: string | null;
  email: string | null;
  requestType: string | null;
  status: string | null;
  reason: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export interface KycApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  totalCount?: number;
  page?: number;
  pageSize?: number;
}

// ─── Auth Token Helper ──────────────────────────────────────────────────────────

async function getToken(clientToken?: string): Promise<string | null> {
  if (clientToken) return clientToken;
  try {
    const cookieStore = await cookies();
    return cookieStore.get("myqurani_access_token")?.value || null;
  } catch {
    return null;
  }
}

// ─── GET All KYC (with pagination + optional status filter) ────────────────────

export async function getKycAll(
  page = 1,
  pageSize = 10,
  status?: KycStatus,
  clientToken?: string
): Promise<{ success: boolean; data: KycSubmission[]; totalCount: number; message: string }> {
  const token = await getToken(clientToken);
  if (!token) return { success: false, data: [], totalCount: 0, message: "Not authenticated" };

  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status !== undefined) params.set("status", String(status));

    const res = await fetch(`${API_BASE}/api/v1/Kyc/all?${params}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const text = await res.text();
    if (!text) return { success: true, data: [], totalCount: 0, message: "No data" };

    const json = JSON.parse(text);

    if (!res.ok) {
      return { success: false, data: [], totalCount: 0, message: json.message || `Error ${res.status}` };
    }

    const items: KycSubmission[] = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.data?.data)
      ? json.data.data
      : Array.isArray(json.data?.items)
      ? json.data.items
      : [];

    const totalCount = json.totalCount ?? json.data?.totalCount ?? items.length;

    return { success: true, data: items, totalCount, message: "OK" };
  } catch (err) {
    console.error("[getKycAll] Error:", err);
    return { success: false, data: [], totalCount: 0, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── GET Pending KYC ──────────────────────────────────────────────────────────

export async function getKycPending(
  clientToken?: string
): Promise<{ success: boolean; data: KycSubmission[]; message: string }> {
  const token = await getToken(clientToken);
  if (!token) return { success: false, data: [], message: "Not authenticated" };

  try {
    const res = await fetch(`${API_BASE}/api/v1/Kyc/pending`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const text = await res.text();
    if (!text) return { success: true, data: [], message: "No data" };

    const json = JSON.parse(text);
    if (!res.ok) {
      return { success: false, data: [], message: json.message || `Error ${res.status}` };
    }

    const items: KycSubmission[] = Array.isArray(json.data) ? json.data : [];
    return { success: true, data: items, message: "OK" };
  } catch (err) {
    console.error("[getKycPending] Error:", err);
    return { success: false, data: [], message: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── POST Start Review ────────────────────────────────────────────────────────

export async function startKycReview(
  id: number,
  clientToken?: string
): Promise<{ success: boolean; message: string }> {
  const token = await getToken(clientToken);
  if (!token) return { success: false, message: "Not authenticated" };

  try {
    const res = await fetch(`${API_BASE}/api/v1/Kyc/${id}/start-review`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });

    const text = await res.text();
    if (!text) return { success: res.ok, message: res.ok ? "OK" : `Error ${res.status}` };

    const json = JSON.parse(text);
    return { success: res.ok && json.success !== false, message: json.message || (res.ok ? "OK" : `Error ${res.status}`) };
  } catch (err) {
    console.error("[startKycReview] Error:", err);
    return { success: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── POST Review KYC (Approve / Reject) ──────────────────────────────────────

export async function reviewKyc(
  id: number,
  approved: boolean,
  rejectionReason?: string | null,
  reviewNotes?: string | null,
  riskLevel?: string | null,
  clientToken?: string
): Promise<{ success: boolean; message: string }> {
  const token = await getToken(clientToken);
  if (!token) return { success: false, message: "Not authenticated" };

  try {
    const res = await fetch(`${API_BASE}/api/v1/Kyc/${id}/review`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        approved,
        rejectionReason: rejectionReason || null,
        reviewNotes: reviewNotes || null,
        riskLevel: riskLevel || null,
      }),
    });

    const text = await res.text();
    if (!text) return { success: res.ok, message: res.ok ? "OK" : `Error ${res.status}` };

    const json = JSON.parse(text);
    return { success: res.ok && json.success !== false, message: json.message || (res.ok ? "OK" : `Error ${res.status}`) };
  } catch (err) {
    console.error("[reviewKyc] Error:", err);
    return { success: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── GET Deletion Requests ────────────────────────────────────────────────────

export async function getKycDeletionRequests(
  page = 1,
  pageSize = 10,
  clientToken?: string
): Promise<{ success: boolean; data: KycDeletionRequest[]; totalCount: number; message: string }> {
  const token = await getToken(clientToken);
  if (!token) return { success: false, data: [], totalCount: 0, message: "Not authenticated" };

  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const res = await fetch(`${API_BASE}/api/v1/Kyc/admin/deletion-requests?${params}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const text = await res.text();
    if (!text) return { success: true, data: [], totalCount: 0, message: "No data" };

    const json = JSON.parse(text);
    if (!res.ok) {
      return { success: false, data: [], totalCount: 0, message: json.message || `Error ${res.status}` };
    }

    const items: KycDeletionRequest[] = Array.isArray(json.data) ? json.data : [];
    const totalCount = json.totalCount ?? items.length;
    return { success: true, data: items, totalCount, message: "OK" };
  } catch (err) {
    console.error("[getKycDeletionRequests] Error:", err);
    return { success: false, data: [], totalCount: 0, message: err instanceof Error ? err.message : "Unknown error" };
  }
}
