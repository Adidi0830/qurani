import { NextResponse } from "next/server"
import { fetchAllStatistikData } from "@/utils/api/statistik/fetch" // kamu bisa pakai fungsi server-mu yang sudah ada

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate") || undefined
  const endDate = searchParams.get("endDate") || undefined

  try {
    const data = await fetchAllStatistikData(startDate, endDate)
    return NextResponse.json(data)
  } catch (err) {
    console.error("Error fetching statistik data:", err)
    return NextResponse.json({ error: "Failed to fetch statistik data" }, { status: 500 })
  }
}
