"use server";

import { normalizeUsername } from "@/utils/validation/username";
import { getUserByUsername } from "./fetch";

export const checkUsernameAvailability = async (username: string) => {
  try {
    const normalizedUsername = normalizeUsername(username);

    // Cek apakah username sudah digunakan
    const response = await getUserByUsername(normalizedUsername);

    // Jika response sukses dan ada data, berarti username tidak tersedia
    const isAvailable = !response.success || !response.data;

    return {
      success: true,
      available: isAvailable,
      username: normalizedUsername,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to check username availability",
    };
  }
};
