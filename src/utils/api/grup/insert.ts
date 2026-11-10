"use server";

/**
 * ============================================
 * Groups Insert API
 * ============================================
 * API Source: MyQurani API (https://api.myqurani.com)
 * Endpoints Used:
 *   - POST /api/v1/Groups (Create group)
 *   - POST /api/v1/Groups/join (Join group via invite code)
 *   - POST /api/v1/Groups/{id}/leave (Leave group)
 * ============================================
 */

import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// Helper to get auth token from cookies
async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('myqurani_access_token')?.value || null;
  } catch {
    return null;
  }
}

export async function insertGrup(
  form: FormData,
  photo: File | null
): Promise<{ status: "success" | "error"; message: string; data?: any }> {
  const token = await getAuthToken();

  if (!token) {
    return { status: "error", message: "Not authenticated" };
  }

  try {
    // Build form data for API
    const apiFormData = new FormData();

    // Map form fields to API fields
    const name = form.get("name") as string;
    const description = form.get("description") as string;
    const category = form.get("category") as string;
    const status = form.get("status") as string;
    const countryId = form.get("country_id") as string;
    const countryName = form.get("country_name") as string;
    const stateId = form.get("province_id") as string;
    const stateName = form.get("province_name") as string;
    const cityId = form.get("city_id") as string;
    const cityName = form.get("city_name") as string;

    if (name) apiFormData.append("Name", name);
    if (description) apiFormData.append("Description", description);
    if (category) apiFormData.append("CategoryId", category);
    if (status) apiFormData.append("Type", status); // public, private, secret
    if (countryId && countryId !== "0") apiFormData.append("CountryId", countryId);
    if (countryName) apiFormData.append("Country", countryName);
    if (stateId && stateId !== "0") apiFormData.append("StateId", stateId);
    if (stateName) apiFormData.append("State", stateName);
    if (cityId && cityId !== "0") apiFormData.append("CityId", cityId);
    if (cityName) apiFormData.append("City", cityName);

    // Add photo if provided
    if (photo) {
      apiFormData.append("ImageFile", photo);
    }

    console.log("[insertGrup] Creating group via API:", name);

    const response = await fetch(`${API_BASE_URL}/api/v1/Groups`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: apiFormData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("[insertGrup] API error:", result);
      return {
        status: "error",
        message: result.message || "Grup Gagal Dibuat"
      };
    }

    console.log("[insertGrup] Group created:", result.data?.id);

    return {
      status: "success",
      message: "Grup Berhasil Dibuat",
      data: result.data
    };
  } catch (error) {
    console.error("[insertGrup] Error:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Grup Gagal Dibuat"
    };
  }
}

export async function joinGrup(grupId: string, inviteCode?: string) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    // MyQurani API uses invite codes for joining
    if (inviteCode) {
      const response = await fetch(`${API_BASE_URL}/api/v1/Groups/join`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ InviteCode: inviteCode }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal bergabung ke grup.");
      }

      return { status: "success", message: "Berhasil bergabung ke grup." };
    } else {
      // If no invite code, try to get one or join directly
      // Some groups may allow direct joining
      throw new Error("Invite code required to join this group.");
    }
  } catch (error) {
    console.error("[joinGrup] Error:", error);
    throw new Error(error instanceof Error ? error.message : "Gagal bergabung ke grup.");
  }
}

export async function leaveGrup(grupId: string) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/Groups/${grupId}/leave`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal keluar dari grup.");
    }

    return { status: "success", message: "Berhasil keluar dari grup." };
  } catch (error) {
    console.error("[leaveGrup] Error:", error);
    throw new Error(error instanceof Error ? error.message : "Gagal keluar dari grup.");
  }
}
