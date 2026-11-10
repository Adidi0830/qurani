// app/api/notifications/recipients/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url)
  const queryUserId = searchParams.get("userId")

  if (!queryUserId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  let targetUserId = queryUserId;
  if (queryUserId === 'me') {
    // Try Supabase auth first
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      targetUserId = user.id;
    } else {
      // Fallback to MyQurani cookie auth
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const userCookie = cookieStore.get('myqurani_user')?.value;

      if (userCookie) {
        try {
          const userData = JSON.parse(decodeURIComponent(userCookie));
          targetUserId = userData.id;
        } catch (e) {
          console.error('[Recipients] Failed to parse user cookie:', e);
          // Return empty recipients instead of 401 to prevent UI errors
          return NextResponse.json({ recipients: [] });
        }
      } else {
        // No auth available - return empty recipients gracefully
        return NextResponse.json({ recipients: [] });
      }
    }
  }

  try {
    // 🔹 Ambil daftar penerima notifikasi
    const { data: recipientData, error: recipientError } = await supabase
      .from("user_monitoring_records")
      .select("user_monitoring_id")
      .eq("user_id", targetUserId);

    if (recipientError) throw recipientError;

    if (!recipientData || recipientData.length === 0) {
      return NextResponse.json({ recipients: [] });
    }

    const recipientIds = recipientData.map(
      (record) => record.user_monitoring_id
    );

    // 🔹 Ambil profil penerima
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, name, username, avatar")
      .in("id", recipientIds);

    if (profileError) throw profileError;

    const recipients = (profileData || []).map((profile) => ({
      id: profile.id,
      name: profile.name || "Unknown",
      username: profile.username || "",
      avatar: profile.avatar || "",
    }));

    return NextResponse.json({ recipients });
  } catch (error) {
    console.error("Error loading notification recipients:", error);
    return NextResponse.json(
      { error: "Failed to load notification recipients" },
      { status: 500 }
    );
  }
}
