"use server"

import { cookies } from "next/headers"
import { usersApi } from "@/lib/api"

export interface AdminUser {
  id: string
  name: string
  email: string
  avatar_url?: string
}

export async function fetchAdmins(): Promise<{ admins: AdminUser[]; error?: string }> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("myqurani_access_token")?.value
    
    const response = await usersApi.search({ pageSize: 100 }, token)
    
    const items = response?.data?.items || response?.items || response?.data || []
    const usersArray = Array.isArray(items) ? items : []

    const adminsList = usersArray.filter((user: any) => {
        const role = user.role || (user.roles && user.roles[0]);
        return role?.toLowerCase() === "admin"
    })

    const admins: AdminUser[] = adminsList.map((user: any) => ({
      id: user.id?.toString() || "",
      name: user.name || user.username || "Unknown",
      email: user.email || "",
      avatar_url: user.avatar || user.image
    }))

    return { admins }
  } catch (error) {
    console.error("Error in fetchAdmins:", error)
    return { admins: [], error: error instanceof Error ? error.message : "Unknown error" }
  }
}
