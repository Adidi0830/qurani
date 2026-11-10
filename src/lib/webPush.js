import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Konfigurasi VAPID keys
webpush.setVapidDetails(
  "mailto:your-email@example.com", // Ganti dengan email Anda
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY // Private key harus di server-side env
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role untuk akses server-side
);

/**
 * Mengirim push notification ke pengguna tertentu
 * @param {string} userId - ID pengguna yang akan menerima notifikasi
 * @param {Object} payload - Data notifikasi
 * @param {string} payload.title - Judul notifikasi
 * @param {string} payload.body - Isi notifikasi
 * @param {string} payload.icon - URL icon notifikasi
 * @param {string} payload.url - URL yang akan dibuka ketika notifikasi diklik
 * @param {Object} payload.data - Data tambahan
 */
export async function sendPushToUser(userId, payload) {
  try {
    // 1. Ambil subscription data user dari database
    const { data: subscriptions, error: fetchError } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { success: false, message: "No subscriptions found" };
    }

    console.log(
      `Found ${subscriptions.length} subscription(s) for user ${userId}`
    );

    // 2. Kirim notifikasi ke semua subscription user tersebut
    const sendPromises = subscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/qurani-192.png",
        badge: "/icons/qurani-192.png",
        url: payload.url || "/",
        data: payload.data || {},
        timestamp: Date.now(),
        tag: payload.tag || "default",
      });

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result = await webpush.sendNotification(
          pushSubscription,
          notificationPayload
        );
        return { success: true, subscription: subscription.id };
      } catch (error) {
        console.error("Failed to send push notification:", error);

        // Jika subscription tidak valid (410 Gone), hapus dari database
        if (error.statusCode === 410) {
          console.log(`Removing invalid subscription: ${subscription.id}`);
          await supabase
            .from("user_push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }

        return {
          success: false,
          error: error.message,
          subscription: subscription.id,
        };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `Push notification results: ${successCount} success, ${failCount} failed`
    );

    return {
      success: successCount > 0,
      results,
      successCount,
      failCount,
      totalSent: subscriptions.length,
    };
  } catch (error) {
    console.error("Error in sendPushToUser:", error);
    throw error;
  }
}

/**
 * Mengirim push notification ke multiple users sekaligus
 * @param {string[]} userIds - Array ID pengguna
 * @param {Object} payload - Data notifikasi
 */
export async function sendPushToMultipleUsers(userIds, payload) {
  const results = [];

  for (const userId of userIds) {
    try {
      const result = await sendPushToUser(userId, payload);
      results.push({ userId, ...result });
    } catch (error) {
      results.push({
        userId,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Mengirim push notification ke semua user yang subscribe
 * @param {Object} payload - Data notifikasi
 */
export async function sendPushToAllUsers(payload) {
  try {
    // Ambil semua user yang punya subscription
    const { data: users, error } = await supabase
      .from("user_push_subscriptions")
      .select("user_id")
      .distinct();

    if (error) throw error;

    const userIds = users.map((user) => user.user_id);
    return await sendPushToMultipleUsers(userIds, payload);
  } catch (error) {
    console.error("Error in sendPushToAllUsers:", error);
    throw error;
  }
}

/**
 * Test function untuk mengirim notifikasi test
 * @param {string} userId - ID pengguna
 */
export async function sendTestNotification(userId) {
  const payload = {
    title: "🕌 Test Notifikasi Qurani",
    body: "Alhamdulillah, notifikasi push berhasil! Semoga Allah mudahkan hafalan Anda.",
    icon: "/icons/qurani-192.png",
    url: "/setoran",
    data: {
      type: "test",
      timestamp: Date.now(),
    },
    tag: "test-notification",
  };

  return await sendPushToUser(userId, payload);
}
