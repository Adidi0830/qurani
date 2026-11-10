"use server";

import { createClient } from "@/utils/supabase/server";
import { invalidateSettingGroupCache } from "./fetch";

export async function deleteSettingGroup(groupId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("setting_group")
      .delete()
      .eq("group_id", groupId);

    if (error) throw error;

    // Invalidate cache after successful delete
    await invalidateSettingGroupCache(groupId);
  } catch (error) {
    console.log("error dari delete Group", error);
  }
}
