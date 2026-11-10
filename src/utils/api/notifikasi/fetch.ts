"use server";

import { cookies } from "next/headers";
import { notificationsApi } from "@/lib/api";

interface MappedNotification {
  id: string;
  type: string;
  is_read: boolean;
  is_action_taken: boolean;
  is_accept_friend: boolean | null;
  created_at: string;
  group_id: string | null;
  groupName: string;
  fromUserName: string;
  fromUserUsername: string;
  fromUserAvatar: string | null;
  fromUserProfileUser: string | null;
  fromUserId: string;
  userId: string;
  recap_id?: number | null;
  recitationType?: string;
  examinerName?: string;
  memorization?: string;
}

interface NotificationResponse {
  data: MappedNotification[] | null;
  error: string | null;
}

/**
 * Ambil notifikasi user dari API Qurani
 * Menggantikan query Supabase langsung ke tabel notifications
 */
export async function getNotifications(
  userId: string
): Promise<NotificationResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    if (!token) {
      return { data: [], error: null };
    }

    const response = await notificationsApi.getWithCursor(
      { pageSize: 50 },
      token
    );

    const raw = response?.data || response;
    const list: any[] = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []);

    const notifications: MappedNotification[] = list.map((notif: any) => ({
      id: notif.id?.toString() ?? "",
      type: notif.type ?? "",
      is_read: notif.isRead ?? notif.is_read ?? false,
      is_action_taken: notif.isActionTaken ?? notif.is_action_taken ?? false,
      is_accept_friend: notif.isAcceptFriend ?? notif.is_accept_friend ?? null,
      created_at: notif.createdAt ?? notif.created_at ?? new Date().toISOString(),
      group_id: notif.groupId?.toString() ?? notif.group_id ?? null,
      groupName: notif.group?.name ?? notif.groupName ?? "Tidak Diketahui",
      fromUserName: notif.fromUser?.name ?? notif.fromUserName ?? "Tidak Diketahui",
      fromUserUsername: notif.fromUser?.username ?? notif.fromUserUsername ?? "Tidak Diketahui",
      fromUserAvatar: notif.fromUser?.avatar ?? notif.fromUserAvatar ?? null,
      fromUserProfileUser: notif.fromUser?.avatar ?? notif.fromUserProfileUser ?? null,
      fromUserId: notif.fromUserId?.toString() ?? notif.from_user_id ?? "",
      userId: notif.userId?.toString() ?? notif.user_id ?? userId,
      recap_id: notif.recapId ?? notif.recap_id ?? null,
      recitationType: notif.recap?.recitationType ?? notif.recitationType ?? undefined,
      examinerName: notif.recap?.examiner?.name ?? notif.examinerName ?? "Tidak Diketahui",
      memorization: notif.recap?.memorization ?? notif.memorization ?? undefined,
    }));

    return { data: notifications, error: null };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch notifications",
    };
  }
}
