import { NextResponse } from "next/server"
import {
  getFriendsData,
  searchUsersWithStatus,
  sendFriendRequest,
  acceptFriendRequest,
  rejectOrCancelFriendRequest,
  unfriend
} from "@/utils/api/friends"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const action = searchParams.get("action") || "getFriends"

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    switch (action) {
      case "getFriends": {
        const data = await getFriendsData(userId)
        return NextResponse.json({
          success: true,
          data
        })
      }

      case "search": {
        const query = searchParams.get("query")
        const page = parseInt(searchParams.get("page") || "0")
        const limit = parseInt(searchParams.get("limit") || "10")

        if (!query) {
          return NextResponse.json({
            success: true,
            data: { users: [], hasMore: false, total: 0 }
          })
        }

        const result = await searchUsersWithStatus(userId, query, page, limit)
        return NextResponse.json({
          success: true,
          data: result
        })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (err) {
    console.error(`Error in friends API (${action}):`, err)
    return NextResponse.json({
      error: "Failed to fetch friends data"
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, userId, targetUserId, notificationId } = body

    if (!userId || !targetUserId) {
      return NextResponse.json({
        error: "User ID and target user ID are required"
      }, { status: 400 })
    }

    switch (action) {
      case "sendRequest": {
        const result = await sendFriendRequest(userId, targetUserId)
        return NextResponse.json({ success: true, data: result })
      }

      case "acceptRequest": {
        const result = await acceptFriendRequest(targetUserId, userId, notificationId)
        return NextResponse.json({ success: true, data: result })
      }

      case "rejectRequest": {
        const result = await rejectOrCancelFriendRequest(targetUserId, userId, notificationId)
        return NextResponse.json({ success: true, data: result })
      }

      case "unfriend": {
        const result = await unfriend(userId, targetUserId)
        return NextResponse.json({ success: true, data: result })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (err) {
    console.error("Error in friends POST API:", err)
    return NextResponse.json({
      error: "Failed to process friend action"
    }, { status: 500 })
  }
}
