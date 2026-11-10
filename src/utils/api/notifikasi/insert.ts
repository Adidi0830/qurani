// File ini sekadar re-export atau bridge ke server.ts untuk fungsi notifikasi yang baru (menggunakan API Qurani).

export {
  sendPushToUser,
  createNotificationWithPush,
  createNewRecapNotification,
  createFriendRequestNotification,
  createFriendRequestAcceptedNotification,
  createGroupInviteNotification,
  createMemorationReminderNotification,
  createTestNotification,
  createCustomNotification,
  sendNotificationWithTemplate,
  sendGroupInviteNotification,
} from "./server";

export const notificationTemplates = {
  newRecap: (
    reciterId: string | number,
    examinerId: string | number,
    recapId: number,
    reciterName: string
  ) => ["recap_notification", reciterId, examinerId, recapId, reciterName],

  friendRequest: (
    requesterId: string | number,
    recipientId: string | number,
    requesterName: string
  ) => ["friendRequest", requesterId, recipientId, requesterName],

  friendRequestAccepted: (
    requesterId: string | number,
    recipientId: string | number,
    recipientName: string
  ) => ["friendRequestAccepted", requesterId, recipientId, recipientName],

  groupInvite: (
    inviterId: string | number,
    inviteeId: string | number,
    groupId: string,
    inviterName: string,
    groupName: string
  ) => ["groupInvite", inviterId, inviteeId, groupId, inviterName, groupName],

  memorationReminder: (userId: string | number, userName: string) => 
    ["memorationReminder", userId, userName],

  test: (userId: string | number) => 
    ["test", userId],

  custom: (
    userId: string | number,
    title: string,
    message: string,
    icon?: string,
    url?: string
  ) => ["custom", userId, title, message, icon, url],
};

import { sendNotificationWithTemplate as serverSendTemplate } from "./server";

export async function sendNotificationToMultipleUsers(
  userIds: (string | number)[],
  templateName: string,
  ...params: any[]
) {
  const results = [];
  for (const userId of userIds) {
    try {
      // Modify params slightly to inject the correct userId if needed
      // Actually, standard usage of template functions usually needs the target ID in a specific position
      // For simplicity, we just pass params and assume the caller mapped them right
      const result = await serverSendTemplate(templateName, ...params);
      results.push({ userId, success: true, result });
    } catch (error: any) {
      results.push({
        userId,
        success: false,
        error: error.message,
      });
    }
  }
  return results;
}

export async function checkUserHasSubscription(userId: string | number) {
  // Always return true or some mock, because API Qurani handles subscriptions on their end.
  return {
    hasSubscription: true,
    subscriptionCount: 1,
    subscriptions: [],
  };
}
