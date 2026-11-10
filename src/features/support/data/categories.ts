"use server"

/**
 * Support — Ticket Categories (server action)
 *
 * Berpindah dari `src/utils/api/tickets/fetch-categories.ts`.
 */

import { cookies } from "next/headers"

import type { TicketCategory } from "../model/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

export async function fetchTicketCategories(): Promise<{
    success: boolean
    data?: TicketCategory[]
    error?: string
}> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("myqurani_access_token")?.value

        if (!token) return { success: false, error: "Not authenticated" }

        const response = await fetch(`${API_BASE_URL}/api/v1/tickets/config/categories`, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            next: { revalidate: 3600 },
        })

        if (!response.ok) {
            return { success: false, error: "Failed to fetch categories" }
        }

        const result = await response.json()
        const data = result.data || result

        const categories: TicketCategory[] = Array.isArray(data)
            ? data.map((item: any) => ({
                  id: item.id || item.categoryId || item.Value || item.value,
                  name: item.name || item.categoryName || item.Text || item.text,
              }))
            : []

        return { success: true, data: categories }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}