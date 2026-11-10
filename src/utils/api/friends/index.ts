"use server";
import { generateId } from "@/lib/generateId";
import { apiRequest } from "@/lib/api";
import { cookies } from "next/headers";
import { sendNotificationWithTemplate } from "@/utils/api/notifikasi/server";

export interface FriendWithProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  relationshipType: "friends" | "pending_sent" | "pending_received";
  lastActive: string;
  mutualFriends?: number;
  friendshipDate: string;
}

export interface UserWithFriendshipStatus {
  id: string;
  name: string;
  nickname?: string;
  username?: string;
  email: string;
  avatar?: string;
  countryName?: string;
  countryId?: number | null;
  isVerify: boolean;
  stateName?: string;
  stateId?: number | null;
  cityName?: string;
  cityId?: number | null;
  friendshipStatus:
    | "friends"
    | "pending_sent"
    | "pending_received"
    | "not_friends"
    | null;
}

export interface GetFriendData {
  id: string;
  name: string;
  nickname?: string;
  username?: string;
  email: string;
  avatar?: string;
  countryName?: string;
  countryId?: number | null;
  stateName?: string;
  stateId?: number | null;
  cityName?: string;
  cityId?: number | null;
  isVerify: boolean;
}

// Followers API wrappers using API Qurani
const followersApi = {
  // Get connection status with a specific user
  getStatus: async (targetUserId: string, token?: string) => 
    apiRequest<any>(`/api/v1/Followers/status/${targetUserId}`, { token }),
    
  // Get all followers / following / requests
  getConnections: async (token?: string) => 
    apiRequest<any>('/api/v1/Followers/connections', { token }),
    
  // Follow user
  follow: async (userId: string, token?: string) => 
    apiRequest<any>(`/api/v1/Followers/${userId}`, { method: 'POST', token }),
    
  // Accept follow request
  accept: async (userId: string, token?: string) => 
    apiRequest<any>(`/api/v1/Followers/${userId}/accept`, { method: 'POST', token }),
    
  // Unfollow / Reject / Cancel
  unfollow: async (userId: string, token?: string) => 
    apiRequest<any>(`/api/v1/Followers/${userId}`, { method: 'DELETE', token }),
};

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("myqurani_access_token")?.value;
}

export async function getFriendshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<UserWithFriendshipStatus["friendshipStatus"] | null> {
  try {
    const token = await getToken();
    const response = await followersApi.getStatus(targetUserId, token);
    
    // Asumsi status API: "following", "follower", "mutual", "requested", "pending", "none"
    const status = response?.data?.status || response?.status || "none";
    
    if (status === "mutual" || status === "friends") return "friends";
    if (status === "requested" || status === "pending_sent") return "pending_sent";
    if (status === "pending" || status === "pending_received") return "pending_received";
    
    return "not_friends";
  } catch (error) {
    console.error("Error fetching friendship status:", error);
    return "not_friends";
  }
}

export async function getFriendsData(userId: string) {
  try {
    const token = await getToken();
    
    // Ambil koneksi dari API
    // Jika API belum sedia, kita tangani error dan kembalikan array kosong
    let response;
    try {
       response = await followersApi.getConnections(token);
    } catch (e) {
       console.warn("Followers API might not be implemented yet", e);
       return { friends: [], pendingSent: [], pendingReceived: [], followers: [] };
    }

    const data = response?.data || response || {};
    
    // Asumsi mapping dari API
    const friendsList = Array.isArray(data.friends) ? data.friends : (data.mutual || []);
    const pendingSentList = Array.isArray(data.requested) ? data.requested : (data.pending_sent || []);
    const pendingReceivedList = Array.isArray(data.pending) ? data.pending : (data.pending_received || []);

    const mapToFriendData = (user: any): GetFriendData => ({
        id: user.id?.toString() || "",
        name: user.name || "Unknown",
        nickname: user.nickname,
        username: user.username,
        email: user.email || "",
        avatar: user.avatar || user.image,
        countryName: user.countryName,
        countryId: user.countryId,
        stateName: user.stateName,
        stateId: user.stateId,
        cityName: user.cityName,
        cityId: user.cityId,
        isVerify: user.isVerify || false,
    });

    const friends = friendsList.map(mapToFriendData);
    const pendingSent = pendingSentList.map(mapToFriendData);
    const pendingReceived = pendingReceivedList.map(mapToFriendData);
    const followers = [...pendingReceived, ...friends];

    return {
      friends,
      pendingSent,
      pendingReceived,
      followers,
    };
  } catch (error) {
    console.error("Error fetching friends data:", error);
    throw error;
  }
}

export async function getActiveFriendsOnly(
  userId: string
): Promise<UserWithFriendshipStatus[]> {
  try {
    const data = await getFriendsData(userId);
    return data.friends.map((f: any) => ({
      ...f,
      friendshipStatus: "friends"
    }));
  } catch (error) {
    console.error("Error fetching active friends:", error);
    return [];
  }
}

export async function searchUsersWithStatus(
  userId: string,
  searchQuery: string,
  page: number = 0,
  limit: number = 10
): Promise<{
  users: UserWithFriendshipStatus[];
  hasMore: boolean;
  total: number;
}> {
  try {
    const token = await getToken();
    
    // Gunakan usersApi untuk mencari
    const { usersApi } = await import("@/lib/api");
    const response = await usersApi.search({ keyword: searchQuery, pageSize: limit, page: page + 1 }, token);
    
    const items = response?.data?.items || response?.items || response?.data || [];
    const usersArray = Array.isArray(items) ? items : [];

    const total = response?.data?.pagination?.totalCount || response?.pagination?.totalCount || usersArray.length;

    // Fetch status parallel
    const usersWithStatus: UserWithFriendshipStatus[] = await Promise.all(
      usersArray
        .filter((u: any) => u.id?.toString() !== userId)
        .map(async (user: any) => {
          const status = await getFriendshipStatus(userId, user.id?.toString());
          return {
            id: user.id?.toString() || "",
            name: user.name || "Unknown",
            username: user.username,
            nickname: user.nickname,
            email: user.email || "",
            avatar: user.avatar || user.image,
            countryName: user.countryName,
            countryId: user.countryId,
            stateName: user.stateName,
            stateId: user.stateId,
            cityName: user.cityName,
            cityId: user.cityId,
            isVerify: user.isVerify || false,
            friendshipStatus: status,
          };
      })
    );

    const hasMore = (page + 1) * limit < total;

    return {
      users: usersWithStatus,
      hasMore,
      total,
    };
  } catch (error) {
    console.error("Error searching users:", error);
    return { users: [], hasMore: false, total: 0 };
  }
}

export async function sendFriendRequest(
  requesterId: string,
  recipientId: string
) {
  try {
    const token = await getToken();
    await followersApi.follow(recipientId, token);
    
    // Notification (opsional, bisa API yang handle, tapi kita tetap panggil untuk trigger push)
    try {
      await sendNotificationWithTemplate(
        "friendRequest",
        requesterId,
        recipientId,
        "Seseorang"
      );
    } catch (e) {
      console.warn("Failed to send push template", e);
    }

    return { status: "success" };
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
}

export async function acceptFriendRequest(
  requesterId: string, // User yang MENGIRIM request
  recipientId: string, // User yang MENERIMA request (current user)
  notificationId?: string
) {
  try {
    const token = await getToken();
    
    // Accept the request from the requester
    await followersApi.accept(requesterId, token);

    // Update notifikasi lokal jika ada (menggunakan API Qurani)
    if (notificationId) {
        const { notificationsApi } = await import("@/lib/api");
        await notificationsApi.markAsRead(notificationId, token);
    }

    return { status: "success" };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
}

export async function rejectOrCancelFriendRequest(
  requesterId: string,
  recipientId: string,
  notificationId?: string
) {
  try {
    const token = await getToken();
    
    // Kita panggil unfollow ke target user id (API Qurani)
    // Jika requesterId == current user, artinya kita cancel request ke recipientId.
    // Jika recipientId == current user, artinya kita menolak request dari requesterId.
    const currentUserToken = token; // This function is called server side, token belongs to caller.
    const targetId = requesterId === recipientId ? recipientId : requesterId; 
    // Usually we unfollow/reject the other person. Let's assume the API handles it by taking the other user's ID.
    
    await followersApi.unfollow(targetId, token);

    if (notificationId) {
        const { notificationsApi } = await import("@/lib/api");
        await notificationsApi.markAsRead(notificationId, token);
    }

    return { status: "success" };
  } catch (error) {
    console.error("Error rejecting/canceling friend request:", error);
    throw error;
  }
}

export async function rejectFromNotification(
  requesterId: string,
  recipientId: string
) {
  try {
    const token = await getToken();
    await followersApi.unfollow(requesterId, token);
  } catch (error) {
    console.error("Error rejecting from notification:", error);
    throw error;
  }
}

export async function unfriend(userId: string, friendId: string) {
  try {
    const token = await getToken();
    await followersApi.unfollow(friendId, token);
    return { status: "success", deletedCount: 1 };
  } catch (error) {
    console.error("Error unfriending:", error);
    throw error;
  }
}
