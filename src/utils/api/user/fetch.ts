"use server";

import { UserProfile, UserProfileWithGmailAvatar } from "@/types/database.types";
import { cookies } from "next/headers";
import { usersApi } from "@/lib/api";

export const getUsers = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    const response = await usersApi.search({ pageSize: 100 }, token);
    const items = response?.data?.items || response?.items || response?.data || [];
    const usersArray = Array.isArray(items) ? items : [];

    const usersWithGmailAvatar = usersArray.map((user: any) => ({
      ...user,
      id: user.id?.toString() || "",
      gmail_avatar: null as string | null
    }));

    return {
      success: true,
      message: "users fetched successfully",
      data: usersWithGmailAvatar as UserProfileWithGmailAvatar[],
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch users",
    };
  }
};

export const getUserBySearch = async (search: string) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    const response = await usersApi.search({ keyword: search, pageSize: 50 }, token);
    const items = response?.data?.items || response?.items || response?.data || [];
    const usersArray = Array.isArray(items) ? items : [];

    const usersWithGmailAvatar = usersArray.map((user: any) => ({
      ...user,
      id: user.id?.toString() || "",
      gmail_avatar: null as string | null
    }));

    return {
      success: true,
      message: "users fetched successfully",
      data: usersWithGmailAvatar as UserProfileWithGmailAvatar[],
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to search users",
    };
  }
};

export const getUserById = async (id: string) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    const response = await usersApi.getById(id, token);
    const user = response?.data || response;

    if (!user) {
      return {
        success: false,
        message: "user not found",
      };
    }

    return {
      success: true,
      message: "user get by id successfully",
      data: {
        ...user,
        id: user.id?.toString() || id,
      } as UserProfile,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to get user by ID",
    };
  }
};

export const getUserByUsername = async (username: string) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    const searchKeyword = username.startsWith("@") ? username : `@${username}`;
    const response = await usersApi.search({ keyword: searchKeyword, pageSize: 1 }, token);
    const items = response?.data?.items || response?.items || response?.data || [];
    
    const user = Array.isArray(items) && items.length > 0 ? items[0] : null;

    if (!user) {
      return {
        success: false,
        message: "user not found",
      };
    }

    return {
      success: true,
      message: "user get by username successfully",
      data: {
        ...user,
        id: user.id?.toString() || "",
      } as UserProfile,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to get user by username",
    };
  }
};

export const checkUserHasUsername = async (userId: string) => {
  try {
    const response = await getUserById(userId);
    
    if (!response.success || !response.data) {
      return {
        success: true,
        hasUsername: false,
        profileExists: false,
      };
    }

    return {
      success: true,
      hasUsername: !!response.data.username,
      profileExists: true,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Error checking username",
    };
  }
};
