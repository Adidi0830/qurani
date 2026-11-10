"use server";

import { createClient } from "@/utils/supabase/server";
import { fetchSettingGlobal } from "../setting global/fetch";
import { SettingGlobal } from "@/types/setting global";

export async function fetchSettingUser(userId: string) {
  try {
    // Fetch directly from database (no Redis)
    const supabase = await createClient();
    const settingGlobal = await fetchSettingGlobal();

    const { data, error } = await supabase
      .from("setting_user")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching data:", error);
      return {
        success: false,
        message: "An error occurred while fetching data",
      };
    }

    if (settingGlobal?.status == "error") {
      return {
        success: false,
        message: "An error occurred while fetching data global",
      };
    }

    let result;
    if (data && data.length > 0) {
      const dataGroup = settingGlobal?.data?.map((item: SettingGlobal) => {
        return data.find((v) => v.setting === item.id)
          ? {
              ...item,
              value: data.find((v) => v.setting === item.id)?.value,
              color: data.find((v) => v.setting === item.id)?.color,
              status:
                data.find((v) => v.setting === item.id)?.status == true ? 1 : 0,
            }
          : item;
      });
      result = {
        success: true,
        message: "get setting user successfully",
        data: dataGroup,
        source: "database",
      };
    } else {
      result = {
        success: true,
        message: "get setting user successfully",
        data: settingGlobal?.data,
        source: "database",
      };
    }

    return result;
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}

// Helper function to invalidate cache (now a no-op since we removed Redis)
export async function invalidateSettingUserCache(userId: string) {
  // No longer needed, but kept for backward compatibility
  console.log(`ℹ️ Cache invalidation called for user [${userId}] (Redis removed)`);
}
