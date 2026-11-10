"use server"

import { cookies } from "next/headers"
import { usersApi } from "@/lib/api"

export interface RegularUser {
  id: string
  name: string
  email: string
  avatar_url?: string
}

export async function fetchAdminUsers(): Promise<{ users: RegularUser[]; error?: string }> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("myqurani_access_token")?.value
    
    // Gunakan endpoint list user API Qurani dengan filter Role=Admin
    const response = await usersApi.search({ pageSize: 100 }, token)
    
    const items = response?.data?.items || response?.items || response?.data || []
    const usersArray = Array.isArray(items) ? items : []

    // Filter secara manual jika API tidak mendukung filter by role di parameter
    // atau jika role didapat dari item.role
    const admins = usersArray.filter((user: any) => {
        const role = user.role || (user.roles && user.roles[0]);
        return role?.toLowerCase() === "admin"
    })

    const users: RegularUser[] = admins.map((user: any) => ({
      id: user.id?.toString() || "",
      name: user.name || user.username || "Unknown",
      email: user.email || "",
      avatar_url: user.avatar || user.image
    }))

    return { users }
  } catch (error) {
    console.error("Error in fetchAdminUsers:", error)
    return { users: [], error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function fetchRegularUsers(): Promise<{ users: RegularUser[]; error?: string }> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("myqurani_access_token")?.value;

    const response = await usersApi.search({ pageSize: 100 }, token);
    
    const items = response?.data?.items || response?.items || response?.data || []
    const usersArray = Array.isArray(items) ? items : []

    const members = usersArray.filter((user: any) => {
        const role = user.role || (user.roles && user.roles[0]);
        return role?.toLowerCase() !== "admin"
    })

    const users: RegularUser[] = members.map((user: any) => ({
      id: user.id?.toString() || "",
      name: user.name || user.username || "Unknown",
      email: user.email || "",
      avatar_url: user.avatar || user.image
    }))

    return { users }
  } catch (error) {
    console.error("Error in fetchRegularUsers:", error)
    return { users: [], error: error instanceof Error ? error.message : "Unknown error" }
  }
}
