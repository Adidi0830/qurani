import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { normalizeUsername } from "@/utils/validation/username"

const QURANI_API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

type UpdateUserPayload = {
  username?: string
  previousUsername?: string
  name?: string
  email?: string
  isBlocked?: boolean
  role?: "admin" | "member" | "support" | "billing" | string
  countryId?: number | null
  stateId?: number | null
  cityId?: number | null
  countryName?: string
  stateName?: string
  cityName?: string
}

const toNullableNumber = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieStore = await cookies()

    // Ambil access token dari cookie untuk call Qurani API
    const accessToken = cookieStore.get("myqurani_access_token")?.value

    const userCookie = cookieStore.get("myqurani_user")?.value
    if (!userCookie) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    try {
      JSON.parse(decodeURIComponent(userCookie))
    } catch {
      return NextResponse.json({ success: false, message: "Invalid auth context" }, { status: 401 })
    }

    const { userId } = await params
    const targetUserId = String(userId || "").trim()

    if (!targetUserId) {
      return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 })
    }

    const body = (await request.json()) as UpdateUserPayload

    const normalizedUsername =
      typeof body.username === "string" && body.username.trim()
        ? `@${normalizeUsername(body.username)}`
        : undefined

    // Bangun payload untuk Qurani API
    const updateData: Record<string, unknown> = {}

    if (normalizedUsername !== undefined) updateData.username = normalizedUsername
    if (typeof body.name === "string") updateData.name = body.name
    if (typeof body.email === "string") updateData.email = body.email
    if (typeof body.isBlocked === "boolean") updateData.isBlocked = body.isBlocked

    const countryId = toNullableNumber(body.countryId)
    const stateId = toNullableNumber(body.stateId)
    const cityId = toNullableNumber(body.cityId)

    if (countryId !== undefined) updateData.countryId = countryId
    if (stateId !== undefined) updateData.stateId = stateId
    if (cityId !== undefined) updateData.cityId = cityId

    if (typeof body.countryName === "string") updateData.countryName = body.countryName
    if (typeof body.stateName === "string") updateData.stateName = body.stateName
    if (typeof body.cityName === "string") updateData.cityName = body.cityName

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: "No valid fields to update" }, { status: 400 })
    }

    // Call Qurani API: PUT /api/v1/Users/{userId}
    const quranApiResponse = await fetch(`${QURANI_API_BASE}/api/v1/Users/${targetUserId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(updateData),
    })

    if (!quranApiResponse.ok) {
      const errorPayload = await quranApiResponse.json().catch(() => null)
      const errMsg = errorPayload?.message || errorPayload?.title || `Qurani API Error: ${quranApiResponse.status}`
      console.error("[admin/users PUT] Qurani API error:", quranApiResponse.status, errMsg)
      return NextResponse.json(
        { success: false, message: errMsg },
        { status: quranApiResponse.status }
      )
    }

    const result = await quranApiResponse.json().catch(() => null)

    // Jika role perlu diubah, panggil endpoint role terpisah
    if (typeof body.role === "string" && body.role.trim()) {
      const roleValue = body.role.trim().toLowerCase()
      try {
        await fetch(`${QURANI_API_BASE}/api/v1/Users/${targetUserId}/roles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ role: roleValue }),
        })
      } catch (roleErr) {
        // Role assignment failure non-fatal — log saja
        console.warn("[admin/users PUT] Role update failed (non-fatal):", roleErr)
      }
    }

    return NextResponse.json({ success: true, data: result?.data ?? result })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    )
  }
}
