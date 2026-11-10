"use server";

import { notificationsApi } from "@/lib/api";
import { cookies } from "next/headers";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  data?: Record<string, unknown>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationData {
  user_id: string | number;
  from_user_id?: string | number | null;
  type: string;
  group_id?: string;
  recap_id?: number;
  is_read?: boolean;
  is_action_taken?: boolean;
}

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("myqurani_access_token")?.value;
}

export async function sendPushToUser(userId: string | number, payload: PushPayload) {
  try {
    const token = await getToken();
    const result = await notificationsApi.send({
      userIds: [Number(userId)],
      title: payload.title,
      message: payload.body,
      imageUrl: payload.image || payload.icon,
      actionUrl: payload.url,
      actionData: payload.data ? JSON.stringify(payload.data) : null,
      channels: ["Push", "InApp"],
    }, token);

    return {
      success: true,
      result,
      successCount: 1,
      failCount: 0,
      totalSent: 1,
    };
  } catch (error: any) {
    console.error("Error in sendPushToUser:", error);
    return {
      success: false,
      message: error.message || "Failed to send push notification",
    };
  }
}

export async function createNotificationWithPush(
  notificationData: NotificationData,
  pushPayload?: PushPayload
) {
  try {
    const token = await getToken();
    const result = await notificationsApi.send({
      userIds: [Number(notificationData.user_id)],
      title: pushPayload?.title || "Notification",
      message: pushPayload?.body || "You have a new notification",
      type: notificationData.type,
      actionUrl: pushPayload?.url,
      actionData: pushPayload?.data ? JSON.stringify(pushPayload.data) : null,
      imageUrl: pushPayload?.image || pushPayload?.icon,
      channels: ["InApp", "Push"],
    }, token);

    return {
      success: true,
      notification: result?.data || result,
      pushResult: result,
    };
  } catch (error: any) {
    console.error("Error in createNotificationWithPush:", error);
    throw error;
  }
}

export async function createNewRecapNotification(
  reciterId: string | number,
  examinerId: string | number,
  recapId: number,
  reciterName: string
) {
  return {
    notificationData: {
      user_id: examinerId,
      from_user_id: reciterId,
      type: "recap_notification",
      recap_id: recapId,
    },
    pushPayload: {
      title: "📋 Setoran Hafalan Baru",
      body: `${reciterName} telah melakukan setoran hafalan yang perlu Anda periksa`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: `/setoran/recap/${recapId}`,
      data: {
        type: "new_recap",
        recapId,
        reciterId,
      },
      tag: "new-recap",
    },
  };
}

export async function createFriendRequestNotification(
  requesterId: string | number,
  recipientId: string | number,
  requesterName: string
) {
  return {
    notificationData: {
      user_id: recipientId,
      from_user_id: requesterId,
      type: "friend_request",
    },
    pushPayload: {
      title: "Permintaan Pertemanan Baru",
      body: `${requesterName} ingin berteman dengan Anda`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/notifikasi",
      data: {
        type: "friend_request",
        fromUserId: requesterId,
      },
      tag: "friend-request",
    },
  };
}

export async function createFriendRequestAcceptedNotification(
  requesterId: string | number,
  recipientId: string | number,
  recipientName: string
) {
  return {
    notificationData: {
      user_id: requesterId,
      from_user_id: recipientId,
      type: "friend_request", 
    },
    pushPayload: {
      title: "🎉 Permintaan Pertemanan Diterima",
      body: `${recipientName} telah menerima permintaan pertemanan Anda`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/notifikasi",
      data: {
        type: "friend_accepted",
        fromUserId: recipientId,
      },
      tag: "friend-accepted",
    },
  };
}

export async function createGroupInviteNotification(
  inviterId: string | number,
  inviteeId: string | number,
  groupId: string,
  inviterName: string,
  groupName: string
) {
  return {
    notificationData: {
      user_id: inviteeId,
      from_user_id: inviterId,
      type: "group_invite",
      group_id: groupId,
    },
    pushPayload: {
      title: "Undangan Grup Baru",
      body: `${inviterName} mengundang Anda ke grup "${groupName}"`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/notifikasi",
      data: {
        type: "group_invite",
        fromUserId: inviterId,
        groupId,
      },
      tag: "group-invite",
    },
  };
}

export async function createMemorationReminderNotification(
  userId: string | number,
  userName: string
) {
  return {
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", 
    },
    pushPayload: {
      title: "Reminder Setoran Hafalan",
      body: `Assalamu'alaikum ${userName}, jangan lupa setoran hafalan hari ini ya! 🤲`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/notifikasi",
      data: { type: "memorization_reminder" },
      tag: "memorization-reminder",
    },
  };
}

export async function createTestNotification(userId: string | number) {
  return {
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", 
    },
    pushPayload: {
      title: "Test Notifikasi Qurani",
      body: "Alhamdulillah, notifikasi push berhasil! Semoga Allah mudahkan hafalan Anda.",
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/setoran",
      data: { type: "test", timestamp: Date.now() },
      tag: "test-notification",
    },
  };
}

export async function createCustomNotification(
  userId: string | number,
  title: string,
  message: string,
  icon?: string,
  url?: string
) {
  return {
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", 
    },
    pushPayload: {
      title: title || "🔔 Notifikasi Qurani",
      body: message || "Anda memiliki notifikasi baru",
      icon: icon || "/icons/Qurani - Icon2 Green.png",
      url: url || "/setoran",
      data: { type: "custom", timestamp: Date.now() },
      tag: "custom-notification",
    },
  };
}

export async function sendNotificationWithTemplate(
  templateName: string,
  ...params: unknown[]
) {
  try {
    let templateResult: {
      notificationData: NotificationData;
      pushPayload: PushPayload;
    };

    switch (templateName) {
      case "recap_notification":
        templateResult = await createNewRecapNotification(
          params[0] as string | number,
          params[1] as string | number,
          params[2] as number,
          params[3] as string
        );
        break;
      case "friendRequest":
        templateResult = await createFriendRequestNotification(
          params[0] as string | number,
          params[1] as string | number,
          params[2] as string
        );
        break;
      case "friendRequestAccepted":
        templateResult = await createFriendRequestAcceptedNotification(
          params[0] as string | number,
          params[1] as string | number,
          params[2] as string
        );
        break;
      case "groupInvite":
        templateResult = await createGroupInviteNotification(
          params[0] as string | number,
          params[1] as string | number,
          params[2] as string,
          params[3] as string,
          params[4] as string
        );
        break;
      case "memorationReminder":
        templateResult = await createMemorationReminderNotification(
          params[0] as string | number,
          params[1] as string
        );
        break;
      case "test":
        templateResult = await createTestNotification(params[0] as string | number);
        break;
      case "custom":
        templateResult = await createCustomNotification(
          params[0] as string | number,
          params[1] as string,
          params[2] as string,
          params[3] as string,
          params[4] as string
        );
        break;
      default:
        throw new Error(`Template ${templateName} not found`);
    }

    return await createNotificationWithPush(
      templateResult.notificationData,
      templateResult.pushPayload
    );
  } catch (error) {
    console.error(
      `Error sending notification with template ${templateName}:`,
      error
    );
    throw error;
  }
}

export async function sendGroupInviteNotification(
  username: string,
  groupId: string,
  userId?: string | number
) {
  try {
    const { usersApi } = await import("@/lib/api");
    const token = await getToken();
    
    // Cari user
    const dbUsername = username.startsWith("@") ? username : `@${username}`;
    const userRes = await usersApi.search({ keyword: dbUsername, pageSize: 1 }, token);
    const inviteeUser = Array.isArray(userRes?.data?.items) && userRes.data.items.length > 0 ? userRes.data.items[0] : null;

    if (!inviteeUser) {
      return {
        success: false,
        error: `User dengan username ${dbUsername} tidak ditemukan`,
      };
    }

    // Tentukan inviter name (dummy untuk sementara karena tidak ada get group info API disini)
    const inviterName = "Seseorang";
    const groupName = "Group " + groupId;

    const actualInviterId = userId || inviteeUser.id;

    const result = await sendNotificationWithTemplate(
      "groupInvite",
      actualInviterId, 
      inviteeUser.id, 
      groupId,
      inviterName, 
      groupName
    );

    return {
      success: true,
      message: `Undangan grup berhasil dikirim ke ${username}`,
      result,
    };
  } catch (error: any) {
    console.error("Error in sendGroupInviteNotification:", error);
    return {
      success: false,
      error: error.message || "Terjadi kesalahan saat mengirim undangan",
    };
  }
}
