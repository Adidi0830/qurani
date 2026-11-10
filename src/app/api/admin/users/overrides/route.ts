import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * POST /api/admin/users/overrides
 *
 * Endpoint ini sebelumnya mengambil data override dari tabel Supabase `user_profiles`.
 * Sekarang setelah full migrasi ke Qurani API, data user sudah didapat langsung
 * dari GET /api/v1/Users/{userId} di component user.tsx.
 *
 * Endpoint ini dikembalikan sebagai empty array agar tidak breaking change
 * pada component yang masih memanggilnya.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("myqurani_user")?.value
    if (!userCookie) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    try {
      const parsedUser = JSON.parse(decodeURIComponent(userCookie))
      const roles = Array.isArray(parsedUser?.roles)
        ? parsedUser.roles.map((r: unknown) => String(r).toLowerCase())
        : []
      if (!roles.includes("admin")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid auth context" }, { status: 401 })
    }

    // Data user sekarang diambil langsung dari Qurani API di component.
    // Tidak ada lagi Supabase user_profiles lookup.
    return NextResponse.json({ success: true, data: [] })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to load user overrides",
      },
      { status: 500 }
    )
  }
}
