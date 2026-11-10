import { sendPushToUser } from "./webPush";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Mengirim notifikasi push berdasarkan data dari tabel notifications
 * @param {string} notificationId - ID dari tabel notifications
 */
export async function sendPushFromNotification(notificationId) {
  try {
    // Ambil data notifikasi dari database
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select(
        `
        *,
        user_profiles!notifications_user_id_fkey(username, full_name),
        from_user_profiles:user_profiles!notifications_from_user_id_fkey(username, full_name),
        grup(name)
      `
      )
      .eq("id", notificationId)
      .single();

    if (notifError || !notification) {
      throw new Error(`Notification not found: ${notifError?.message}`);
    }

    // Generate payload berdasarkan tipe notifikasi
    const payload = generatePayloadFromNotification(notification);

    if (!payload) {
      console.log(
        `No push payload generated for notification type: ${notification.type}`
      );
      return { success: false, message: "No payload generated" };
    }

    // Kirim push notification
    const result = await sendPushToUser(notification.user_id, payload);

    // Update notification bahwa push sudah dikirim
    await supabase
      .from("notifications")
      .update({
        // Bisa tambah field push_sent: true jika ada
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    return result;
  } catch (error) {
    console.error("Error in sendPushFromNotification:", error);
    throw error;
  }
}

/**
 * Generate payload push notification berdasarkan tipe notifikasi
 * @param {Object} notification - Data notifikasi dari database
 */
function generatePayloadFromNotification(notification) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, from_user_profiles, grup, user_profiles } = notification;

  switch (type) {
    case "friend_request":
      return {
        title: "👥 Permintaan Pertemanan Baru",
        body: `${
          from_user_profiles?.full_name ||
          from_user_profiles?.username ||
          "Seseorang"
        } ingin berteman dengan Anda`,
        icon: "/icons/qurani-192.png",
        url: "/friends",
        data: {
          type: "friend_request",
          fromUserId: notification.from_user_id,
          notificationId: notification.id,
        },
        tag: "friend-request",
      };

    case "group_invite":
      return {
        title: "🏠 Undangan Grup Baru",
        body: `${
          from_user_profiles?.full_name ||
          from_user_profiles?.username ||
          "Seseorang"
        } mengundang Anda ke grup "${grup?.name || "Unknown Group"}"`,
        icon: "/icons/qurani-192.png",
        url: "/groups",
        data: {
          type: "group_invite",
          fromUserId: notification.from_user_id,
          groupId: notification.group_id,
          notificationId: notification.id,
        },
        tag: "group-invite",
      };

    case "recap_notification":
      return {
        title: "📋 Setoran Hafalan Baru",
        body: `${
          from_user_profiles?.full_name ||
          from_user_profiles?.username ||
          "Seseorang"
        } telah melakukan setoran hafalan`,
        icon: "/icons/qurani-192.png",
        url: "/recaps",
        data: {
          type: "recap_notification",
          fromUserId: notification.from_user_id,
          recapId: notification.recap_id,
          notificationId: notification.id,
        },
        tag: "recap-notification",
      };

    default:
      // Generic notification
      return {
        title: "🔔 Notifikasi Qurani",
        body: "Anda memiliki notifikasi baru",
        icon: "/icons/qurani-192.png",
        url: "/notifications",
        data: {
          type: notification.type,
          notificationId: notification.id,
        },
        tag: "generic-notification",
      };
  }
}

/**
 * Mengirim push notification untuk semua notifikasi yang belum dikirim
 * Fungsi ini bisa dipanggil secara berkala (cron job)
 */
export async function sendPendingPushNotifications() {
  try {
    // Ambil notifikasi yang belum dibaca dan belum dikirim push
    // Asumsi: tambah field push_sent di tabel notifications
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("is_read", false)
      // .eq('push_sent', false) // Uncomment jika ada field ini
      .order("created_at", { ascending: true })
      .limit(50); // Batasi untuk menghindari overload

    if (error) throw error;

    if (!notifications || notifications.length === 0) {
      console.log("No pending push notifications");
      return { processed: 0 };
    }

    console.log(
      `Processing ${notifications.length} pending push notifications`
    );

    // Kirim push untuk setiap notifikasi
    const results = [];
    for (const notification of notifications) {
      try {
        const result = await sendPushFromNotification(notification.id);
        results.push({
          notificationId: notification.id,
          success: result.success,
          result,
        });
      } catch (error) {
        console.error(
          `Failed to send push for notification ${notification.id}:`,
          error
        );
        results.push({
          notificationId: notification.id,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `Push notification batch completed: ${successCount} success, ${failCount} failed`
    );

    return {
      processed: notifications.length,
      success: successCount,
      failed: failCount,
      results,
    };
  } catch (error) {
    console.error("Error in sendPendingPushNotifications:", error);
    throw error;
  }
}

/**
 * Helper function untuk mengirim push notification custom
 * dengan integrasi ke tabel notifications
 * @param {string} userId - Target user ID
 * @param {string} fromUserId - Pengirim (optional)
 * @param {string} type - Tipe notifikasi
 * @param {Object} pushPayload - Custom payload untuk push
 * @param {Object} additionalData - Data tambahan untuk disimpan di DB
 */
export async function createAndSendNotification(
  userId,
  fromUserId,
  type,
  pushPayload,
  additionalData = {}
) {
  try {
    // 1. Simpan ke tabel notifications
    const { data: notification, error: dbError } = await supabase
      .from("notifications")
      .insert({
        id: generateId(),
        user_id: userId,
        from_user_id: fromUserId,
        type,
        is_read: false,
        is_action_taken: false,
        ...additionalData,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Kirim push notification
    const pushResult = await sendPushToUser(userId, pushPayload);

    return {
      success: true,
      notification,
      pushResult,
    };
  } catch (error) {
    console.error("Error in createAndSendNotification:", error);
    throw error;
  }
}

/**
 * Contoh penggunaan untuk berbagai skenario
 */
export const notificationTemplates = {
  // Ketika ada setoran hafalan baru
  newRecap: (reciterId, examinerId, recapId) => ({
    userId: examinerId,
    fromUserId: reciterId,
    type: "recap_notification",
    pushPayload: {
      title: "📋 Setoran Hafalan Baru",
      body: "Ada setoran hafalan yang perlu Anda periksa",
      icon: "/icons/qurani-192.png",
      url: `/recaps/${recapId}`,
      data: { type: "new_recap", recapId },
      tag: "new-recap",
    },
    additionalData: { recap_id: recapId },
  }),

  // Ketika permintaan pertemanan diterima
  friendRequestAccepted: (requesterId, recipientId) => ({
    userId: requesterId,
    fromUserId: recipientId,
    type: "friend_request_accepted",
    pushPayload: {
      title: "🎉 Permintaan Pertemanan Diterima",
      body: "Selamat! Permintaan pertemanan Anda telah diterima",
      icon: "/icons/qurani-192.png",
      url: "/friends",
      data: { type: "friend_accepted", fromUserId: recipientId },
      tag: "friend-accepted",
    },
  }),

  // Reminder setoran hafalan
  memorationReminder: (userId) => ({
    userId,
    fromUserId: null, // System notification
    type: "memorization_reminder",
    pushPayload: {
      title: "⏰ Reminder Setoran Hafalan",
      body: "Jangan lupa setoran hafalan hari ini ya! Semoga Allah mudahkan 🤲",
      icon: "/icons/qurani-192.png",
      url: "/setoran",
      data: { type: "memorization_reminder" },
      tag: "memorization-reminder",
    },
  }),
};
