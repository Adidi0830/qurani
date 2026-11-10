"use server";

import { cookies } from "next/headers";
import { notificationsApi } from "@/lib/api";

// Fungsi untuk meng-update status notifikasi
export async function updateNotificationStatus(
  notificationId: string,
  updates: { is_read?: boolean; is_action_taken?: boolean }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    if (!token) {
      return { error: "No authentication token found" };
    }

    if (updates.is_read) {
      await notificationsApi.markAsRead(notificationId, token);
    }
    
    // If there is an action taken endpoint, call it here. For now, mark as read is the primary action.

    return { error: null };
  } catch (error) {
    console.error("Error updating notification status:", error);
    return { error: error instanceof Error ? error.message : "Failed to update notification" };
  }
}

// Fungsi untuk mark all notifications sebagai read untuk user tertentu
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    if (!token) {
      return { error: "No authentication token found" };
    }

    await notificationsApi.markAllAsRead(token);
    
    return { error: null };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { error: error instanceof Error ? error.message : "Failed to mark all as read" };
  }
}
