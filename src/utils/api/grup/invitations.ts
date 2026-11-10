"use server";

import { createClient } from "@/utils/supabase/server";
import { updateNotificationStatus } from "@/utils/api/notifikasi/update";
import { revalidatePath } from "next/cache";
import { generateId } from "@/lib/generateId";

// Fungsi untuk menerima undangan grup
export async function acceptGroupInvitation(
  notificationId: string,
  groupId: string,
  userId: string
) {
  const supabase = await createClient();

  try {
    // Get group data untuk validasi
    const { data: groupData, error: groupError } = await supabase
      .from("grup")
      .select("name, id")
      .eq("id", groupId)
      .single();

    if (groupError || !groupData) {
      return {
        status: "error",
        message: "Grup tidak ditemukan",
      };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("grup_members")
      .select("id")
      .eq("grup_id", groupId)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      // Update notification status
      await updateNotificationStatus(notificationId, {
        is_read: true,
        is_action_taken: true,
      });

      return {
        status: "error",
        message: "Anda sudah menjadi anggota grup ini",
      };
    }

    // Add user to group
    const { error: memberError } = await supabase.from("grup_members").insert({
      id: generateId(),
      grup_id: groupId,
      user_id: userId,
      role: "member",
    });

    if (memberError) {
      console.error("Error adding member to group:", memberError);
      return {
        status: "error",
        message: "Failed to add to group.",
      };
    }

    // Update notification status
    const updateResult = await updateNotificationStatus(notificationId, {
      is_read: true,
      is_action_taken: true,
    });

    if (updateResult.error) {
      console.error("Error updating notification:", updateResult.error);
    }

    // Revalidate grup saya page to ensure fresh data
    revalidatePath("/grup");

    return {
      status: "success",
      message: `Successfully joined the group "${groupData.name}"`,
    };
  } catch (error) {
    console.error("Error accepting group invitation:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat menerima undangan",
    };
  }
}

// Fungsi untuk menolak undangan grup
export async function rejectGroupInvitation(notificationId: string) {
  try {
    // Update notification status
    const updateResult = await updateNotificationStatus(notificationId, {
      is_read: true,
      is_action_taken: true,
    });

    if (updateResult.error) {
      console.error("Error updating notification:", updateResult.error);
      return {
        status: "error",
        message: "Failed to update notification status.",
      };
    }

    return {
      status: "success",
      message: "Invitation declined.",
    };
  } catch (error) {
    console.error("Error rejecting group invitation:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat menolak undangan",
    };
  }
}
