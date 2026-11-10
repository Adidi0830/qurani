import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface NotificationRaw {
  id: string;
  type: string;
  is_read: boolean;
  is_action_taken: boolean;
  is_accept_friend: boolean | null;
  created_at: string;
  group_id: string | null;
  from_user_id: string;
  user_id: string;
  recap_id: number | null;
  ticket_id: number | null;
  grup: {
    name: string;
  } | null;
  from_user: {
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
  recap: {
    recitation_type: string;
    conclusion?: string;
    memorization?: string;
    examiner: {
      name: string;
    } | null;
  } | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const limitParam = Number(searchParams.get("limit"));
  const offsetParam = Number(searchParams.get("offset"));
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.floor(limitParam), 1), 100)
    : 30;
  const offset = Number.isFinite(offsetParam)
    ? Math.max(Math.floor(offsetParam), 0)
    : 0;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = await createClient();

  // Define the fields to select
  const selectFields = `id, type, is_read, is_action_taken, is_accept_friend, created_at, group_id, from_user_id, user_id, recap_id, ticket_id`;

  // Always filter by user_id - show only notifications meant for this user
  // New notifications will be added via realtime subscription
  console.log('Fetching notifications for user:', userId);

  const { data, error, count } = await supabase
    .from("notifications")
    .select(selectFields, { count: 'exact' })
    .eq('user_id', userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Debug logging
  console.log(`Fetched ${data?.length || 0} notifications for user ${userId}`);

  // Get unique IDs for separate lookups
  const fromUserIds = [...new Set(data?.filter(n => n.from_user_id).map(n => n.from_user_id) || [])];
  const groupIds = [...new Set(data?.filter(n => n.group_id).map(n => n.group_id) || [])];
  const recapIds = [...new Set(data?.filter(n => n.recap_id).map(n => n.recap_id) || [])];
  const ticketIds = [...new Set(data?.filter(n => n.ticket_id).map(n => n.ticket_id) || [])];

  // Fetch user profiles separately
  let usersData: { [key: string]: { name: string; username: string; avatar: string | null } } = {};
  if (fromUserIds.length > 0) {
    const { data: users } = await supabase
      .from("user_profiles")
      .select("id, name, username, avatar")
      .in("id", fromUserIds);

    usersData = (users || []).reduce((acc, user) => {
      acc[user.id] = { name: user.name, username: user.username, avatar: user.avatar };
      return acc;
    }, {} as typeof usersData);
  }

  // Fetch groups separately
  let groupsData: { [key: string]: { name: string } } = {};
  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from("grup")
      .select("id, name")
      .in("id", groupIds);

    groupsData = (groups || []).reduce((acc, group) => {
      acc[group.id] = { name: group.name };
      return acc;
    }, {} as typeof groupsData);
  }

  // Fetch recaps separately
  let recapsData: { [key: number]: { recitation_type: string; conclusion?: string; memorization?: string; examiner_name?: string } } = {};
  if (recapIds.length > 0) {
    const { data: recaps } = await supabase
      .from("recaps")
      .select("id, recitation_type, conclusion, memorization, examiner_id")
      .in("id", recapIds);

    // Get examiner names
    const examinerIds = [...new Set((recaps || []).filter(r => r.examiner_id).map(r => r.examiner_id))];
    let examinersData: { [key: string]: string } = {};
    if (examinerIds.length > 0) {
      const { data: examiners } = await supabase
        .from("user_profiles")
        .select("id, name")
        .in("id", examinerIds);
      examinersData = (examiners || []).reduce((acc, e) => { acc[e.id] = e.name; return acc; }, {} as typeof examinersData);
    }

    recapsData = (recaps || []).reduce((acc, recap) => {
      acc[recap.id] = {
        recitation_type: recap.recitation_type,
        conclusion: recap.conclusion,
        memorization: recap.memorization,
        examiner_name: recap.examiner_id ? examinersData[recap.examiner_id] : undefined
      };
      return acc;
    }, {} as typeof recapsData);
  }

  // Fetch ticket data separately
  let ticketsData: { [key: number]: { contact: string; subject: string; ticket_number: string; latestReply?: { author: string; message: string } } } = {};
  if (ticketIds.length > 0) {
    // Get ticket basic info
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, contact, subject, ticket_number")
      .in("id", ticketIds);

    // Get latest reply for each ticket
    const { data: latestReplies } = await supabase
      .from("ticket_replies")
      .select("ticket_id, author, message, date")
      .in("ticket_id", ticketIds)
      .order("date", { ascending: false });

    // Create a lookup map for latest replies
    const latestRepliesMap: { [key: number]: { author: string; message: string } } = {};
    if (latestReplies) {
      latestReplies.forEach(reply => {
        if (!latestRepliesMap[reply.ticket_id]) {
          latestRepliesMap[reply.ticket_id] = {
            author: reply.author,
            message: reply.message
          };
        }
      });
    }

    // Create a combined lookup map
    ticketsData = (tickets || []).reduce((acc, ticket) => {
      acc[ticket.id] = {
        contact: ticket.contact,
        subject: ticket.subject,
        ticket_number: ticket.ticket_number,
        latestReply: latestRepliesMap[ticket.id]
      };
      return acc;
    }, {} as typeof ticketsData);
  }

  const mapped = (data ?? []).map((notif) => {
    const ticketInfo = notif.ticket_id ? ticketsData[notif.ticket_id] : null;
    const userInfo = notif.from_user_id ? usersData[notif.from_user_id] : null;
    const groupInfo = notif.group_id ? groupsData[notif.group_id] : null;
    const recapInfo = notif.recap_id ? recapsData[notif.recap_id] : null;

    return {
      id: notif.id,
      type: notif.type,
      is_read: notif.is_read,
      is_action_taken: notif.is_action_taken,
      is_accept_friend: notif.is_accept_friend,
      created_at: notif.created_at,
      group_id: notif.group_id,
      groupName: groupInfo?.name ?? "Tidak Diketahui",
      // For ticket notifications, show ticket contact instead of system
      fromUserName: notif.type === "ticket_reply" ? (ticketInfo?.contact ?? "Support Ticket") : (userInfo?.name ?? "Tidak Diketahui"),
      fromUserUsername: notif.type === "ticket_reply" ? "support" : (userInfo?.username ?? "Tidak Diketahui"),
      fromUserAvatar: notif.type === "ticket_reply" ? null : (userInfo?.avatar ?? null),
      fromUserProfileUser: notif.type === "ticket_reply" ? null : (userInfo?.avatar ?? null),
      fromUserId: notif.from_user_id,
      userId: notif.user_id,
      recap_id: notif.recap_id,
      ticket_id: notif.ticket_id,
      ticketContact: ticketInfo?.contact ?? undefined,
      ticketSubject: ticketInfo?.subject ?? undefined,
      ticketNumber: ticketInfo?.ticket_number ?? undefined,
      latestReplyAuthor: ticketInfo?.latestReply?.author ?? undefined,
      latestReplyMessage: ticketInfo?.latestReply?.message ?? undefined,
      recitationType: recapInfo?.recitation_type ?? undefined,
      examinerName: recapInfo?.examiner_name ?? "Tidak Diketahui",
      conclusion: recapInfo?.conclusion ?? undefined,
      memorization: recapInfo?.memorization ?? undefined,
    };
  });

  return NextResponse.json(mapped);
}
