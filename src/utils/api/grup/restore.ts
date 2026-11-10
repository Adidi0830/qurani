"use server";

import { createClient } from "../../supabase/server";

export async function restoreGroup(grupId: string) {
  const supabase = await createClient();

  const { error: errorGrup } = await supabase
    .from("grup")
    .update({ deleted_at: null })
    .eq("id", grupId);

  if (errorGrup) {
    throw new Error("Failed to remove group member.");
  }

  return { status: "success", message: "Group restore deleted." };
}