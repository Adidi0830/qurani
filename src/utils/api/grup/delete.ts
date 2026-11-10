"use server";

/**
 * ============================================
 * Groups Delete API (LEGACY - Supabase)
 * ============================================
 * API Source: Supabase (Local Database)
 * Status: DEPRECATED - Should migrate to MyQurani API
 * 
 * MyQurani Alternative: groupsApi.delete() in lib/api.ts
 * ============================================
 */

import { createClient } from "../../supabase/server";

export async function deleteGrup(grupId: string) {
  const supabase = await createClient();

  // Hapus entri dari tabel 'grup_members' terlebih dahulu untuk menghindari pelanggaran kunci asing
  // const { error: errorMembers } = await supabase
  //   .from("grup_members")
  //   .delete()
  //   .eq("grup_id", grupId);

  // if (errorMembers) {
  //   throw new Error("Failed to remove group member.");
  // }

  // Hapus entri dari tabel 'grup'
  const { error: errorGrup } = await supabase
    .from("grup")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", grupId);

  if (errorGrup) {
    throw new Error("Failed to remove group member.");
  }

  return { status: "success", message: "Group successfully deleted." };
}

export async function leaveGrup(grupId: string) {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("grup_members")
    .delete()
    .eq("grup_id", grupId)
    .eq("user_id", user.user?.id);

  if (error) {
    throw new Error("Gagal keluar dari grup.");
  }
  return { status: "success", message: "Successfully left the group." };
}

export async function deleteMember(groupId: string, userId: string) {
  try {
    const supabase = await createClient();

    // Hapus anggota dari tabel 'grup_members'
    const { error, data } = await supabase
      .from("grup_members")
      .delete()
      .eq("grup_id", groupId)
      .eq("user_id", userId);

    if (error) throw error;
    console.log("Member deleted:", data, userId);
    return {
      status: "success",
      message: "Member successfully removed from group.",
    };
  } catch (error) {
    console.error("Error deleting member from group:", error);
    return {
      status: "error",
      message: "An error occurred while removing the member from the group.",
    };
  }
}
