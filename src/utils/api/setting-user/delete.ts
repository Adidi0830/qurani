"use server";

import { createClient } from "@/utils/supabase/server";
import { invalidateSettingUserCache } from "./fetch";

export async function deleteSettingUser(userId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("setting_user")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    // Invalidate cache after successful delete
    await invalidateSettingUserCache(userId);
  } catch (error) {
    console.log("error dari delete user setting", error);
  }
}
