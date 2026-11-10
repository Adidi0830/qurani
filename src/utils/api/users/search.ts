"use server";

import { cookies } from "next/headers";
import { usersApi } from "@/lib/api";

export interface SearchUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  email?: string;
}

export async function searchUsers(
  searchQuery: string,
  currentUserId: string,
  limit: number = 10
): Promise<{ users: SearchUser[]; total: number }> {
  try {
    if (!searchQuery.trim()) {
      return { users: [], total: 0 };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    const response = await usersApi.search(
      { keyword: searchQuery, pageSize: limit },
      token
    );

    const items = response?.data?.items || response?.items || response?.data || [];
    const rawUsers = Array.isArray(items) ? items : [];

    // Filter out current user
    const filteredUsers = rawUsers.filter(
      (u: any) => u.id?.toString() !== currentUserId
    );

    // Transform data to match SearchUser interface
    const users: SearchUser[] = filteredUsers.map((user: any) => {
      let avatarUrl = "";
      if (user.avatar && user.avatar.trim() !== "") {
        avatarUrl = user.avatar;
      } else if (user.image && user.image.trim() !== "") {
        avatarUrl = user.image;
      }

      return {
        id: user.id?.toString() || "",
        name: user.name || user.username || "Unknown",
        username: user.username || "",
        avatar: avatarUrl,
      };
    });

    return {
      users,
      total: users.length, 
    };
  } catch (error) {
    console.error("Error in searchUsers:", error);
    throw error;
  }
}
