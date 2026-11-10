"use server";

import { userApi, masterdataApi } from "@/lib/api";

export const updateUserProfile = async (
  userId: string,
  countryId: number,
  stateId: number,
  cityId: number,
  countryName: string,
  statesName: string,
  cityName: string,
  timezone: string,
  fullName?: string,
  nickname?: string,
  username?: string,
  gender?: number | null,
  date_of_birth?: string,
  job?: string,
  phoneNumber?: string,
  bio?: string,
  profilePhotoUrl?: string,
  email?: string,
  language?: string | number,
  dateFormat?: string,
  timeFormat?: string,
  numberFormat?: string,
  currencyFormat?: string
) => {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    if (!token) {
      return { success: false, message: "No active session found. Please login again." };
    }

    // Strip data URL prefix if present (API expects raw base64 only)
    let imageBase64Value: string | null = null;
    if (profilePhotoUrl && profilePhotoUrl.startsWith("data:")) {
      const parts = profilePhotoUrl.split(",");
      imageBase64Value = parts.length > 1 ? parts[1] : null;
    }

    const finalPayload: Record<string, any> = {
      name: fullName || null,
      nickname: nickname || null,
      bio: bio || null,
      address: phoneNumber || null,
      cityId: cityId || null,
      city: cityName || null,
      stateId: stateId || null,
      state: statesName || null,
      countryId: countryId || null,
      country: countryName || null,
      sex: gender !== undefined ? gender : null,
      job: job || null,
      imageBase64: imageBase64Value,
      language: language !== undefined ? Number(language) : null,
      dateFormat: dateFormat || null,
      timeFormat: timeFormat || null,
      numberFormat: numberFormat || null,
      currencyFormat: currencyFormat || null,
    };

    if (date_of_birth) {
      finalPayload.dateOfBirth = date_of_birth;
    }

    // Resolve timezone string (e.g. "Asia/Jakarta") to integer ID via Qurani API
    if (timezone) {
      try {
        const tzResponse = await masterdataApi.timezones.getByCode(timezone, token);
        if (tzResponse.success && tzResponse.data?.id) {
          finalPayload.timezone = Number(tzResponse.data.id);
        }
      } catch (err) {
        console.error("Failed to fetch timezone ID:", err);
      }
    }

    const response = await userApi.updateMe(finalPayload, token);

    return {
      success: true,
      message: "Profile updated successfully",
      data: response?.data || response
    };
  } catch (err: any) {
    console.error("Update Profile Error:", err);
    return { success: false, message: err.message || "Failed to update profile" };
  }
};
