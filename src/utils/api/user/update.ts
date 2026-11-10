"use server";

import { UserProfile } from "@/types/database.types";
import { normalizeUsername } from "@/utils/validation/username";
import { cookies } from "next/headers";
import { userApi, masterdataApi } from "@/lib/api";

export const updateUsername = async (
  userId: string,
  username: string,
  country: { id: string; name: string },
  states: { id: string; name: string },
  city: { id: string; name: string; timezone: string }
) => {
  try {
    const normalizedUsername = normalizeUsername(username);
    const formattedUsername = normalizedUsername.startsWith("@")
      ? normalizedUsername.substring(1) // API Qurani mungkin tidak perlu @
      : normalizedUsername;

    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    const updateData: any = {
      username: formattedUsername,
      countryId: Number(country.id),
      stateId: Number(states.id),
      cityId: Number(city.id),
    };

    if (city.timezone) {
      try {
        const tzResponse = await masterdataApi.timezones.getByCode(city.timezone, token);
        if (tzResponse.success && tzResponse.data?.id) {
          updateData.timezone = Number(tzResponse.data.id);
        }
      } catch (err) {
        console.error("Failed to fetch timezone ID:", err);
      }
    }

    const response = await userApi.updateMe(updateData, token);

    return {
      success: true,
      message: "Username updated successfully",
      data: response?.data || response,
    };
  } catch (error: any) {
    console.error("Error updating username:", error);
    return {
      success: false,
      message: error.message || "Failed to update username",
    };
  }
};

export const createUserProfile = async (
  authUserId: string,
  email?: string,
  fullName?: string
) => {
  // Profil dibuat otomatis saat register via API Qurani.
  return {
    success: true,
    message: "User profile creation is handled by registration API",
    data: { id: authUserId, email, name: fullName },
  };
};

export const updateUserProfile = async (userId: string, data: UserProfile) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    const formattedUsername = data.username?.startsWith("@")
      ? data.username.substring(1)
      : data.username;

    // Mapping properti ke format API Qurani
    const updateData: Record<string, any> = {
      name: data.name || null,
      nickname: data.nickname || null,
      sex: data.gender !== undefined ? data.gender : null,
      job: data.job || null,
      bio: data.bio || null,
      address: data.hp || null,
      countryId: data.countryId ? Number(data.countryId) : null,
      stateId: data.stateId ? Number(data.stateId) : null,
      cityId: data.cityId ? Number(data.cityId) : null,
    };

    if (data.dob) {
      updateData.dateOfBirth = data.dob;
    }

    if (data.timezone) {
      try {
        const tzResponse = await masterdataApi.timezones.getByCode(data.timezone, token);
        if (tzResponse.success && tzResponse.data?.id) {
          updateData.timezone = Number(tzResponse.data.id);
        }
      } catch (err) {
        console.error("Failed to fetch timezone ID:", err);
      }
    }
    const response = await userApi.updateMe(updateData, token);

    return {
      success: true,
      message: "User profile updated successfully",
      data: response?.data || response,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to update profile",
    };
  }
};
