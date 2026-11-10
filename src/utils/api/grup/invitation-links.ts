"use server";

import { createClient } from "@/utils/supabase/server";
import { InvitationLinkWithGroup } from "@/types/grup";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { generateId } from "@/lib/generateId";
// Fungsi untuk generate invitation link (OPTIMIZED)
export async function generateInvitationLink(
  groupId: string,
  expiresInHours: number = 24 // Default 24 jam
) {
  const supabase = await createClient();

  try {
    // Get current user auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        status: "error",
        message: "Unauthorized",
      };
    }

    // ✅ Get user profile to get XID (not UUID)
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth", user.id)
      .single();

    if (profileError || !profile) {
      return {
        status: "error",
        message: "User profile not found",
      };
    }

    // Pre-generate token and expiry date to avoid blocking operationss
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    // OPTIMIZATION: Insert invitation link directly without additional select
    // We already have all the data we need, no need to select after insert
    const insertData = {
      id: generateId(),
      group_id: groupId,
      token: token,
      created_by: profile.id, // ✅ Use XID instead of UUID
      expires_at: expiresAt.toISOString(),
    };

    const { data: invitationLink, error: insertError } = await supabase
      .from("grup_invitation_links")
      .insert(insertData)
      .select("id, created_at, token, expires_at, created_by, group_id")
      .single();

    if (insertError) {
      console.error("Error creating invitation link:", insertError);
      return {
        status: "error",
        message: `Gagal membuat link undangan: ${insertError.message}`,
      };
    }

    // Generate full invitation URL
    const invitationUrl = new URL(`/join/${token}`, baseUrl).toString();

    return {
      status: "success",
      message: "Link undangan berhasil dibuat",
      data: {
        ...invitationLink,
        url: invitationUrl,
      },
    };
  } catch (error) {
    console.error("Error generating invitation link:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat membuat link undangan",
    };
  }
}

// Fungsi untuk mendapatkan invitation link berdasarkan token (OPTIMIZED)
export async function getInvitationByToken(token: string) {
  const supabase = await createClient();

  try {
    // OPTIMIZATION: Skip cleanup for individual token lookup - do it periodically instead
    // Only cleanup when absolutely necessary or via scheduled job

    // OPTIMIZATION: Check expiry in the query itself using database functions
    // This avoids fetching expired links and checking them in JavaScript
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("grup_invitation_links")
      .select(
        `
        id,
        created_at,
        token,
        expires_at,
        created_by,
        group_id,
        grup:group_id (
          id,
          name,
          description,
          photo_path,
          is_private,
          owner_id
        )
      `
      )
      .eq("token", token)
      .gt("expires_at", now) // Only get non-expired links
      .single();

    if (error || !data) {
      return {
        status: "error",
        message: "Link undangan tidak valid atau telah kedaluwarsa",
      };
    }

    return {
      status: "success",
      data: data as unknown as InvitationLinkWithGroup,
    };
  } catch (error) {
    console.error("Error getting invitation by token:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat memvalidasi link undangan",
    };
  }
}

// Fungsi untuk join grup via invitation link (OPTIMIZED)
export async function joinGroupViaLink(token: string) {
  const supabase = await createClient();

  try {
    // Get current user auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        status: "error",
        message: "Anda harus login terlebih dahulu",
      };
    }

    // ✅ Get user profile to get XID (not UUID)
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth", user.id)
      .single();

    if (profileError || !profile) {
      return {
        status: "error",
        message: "User profile not found",
      };
    }

    // OPTIMIZATION: Get invitation data first, then check membership for that specific group
    const now = new Date().toISOString();

    // Get invitation data
    const { data: invitation, error: invitationError } = await supabase
      .from("grup_invitation_links")
      .select(
        `
        id,
        created_at,
        token,
        expires_at,
        created_by,
        group_id,
        grup:group_id (
          id,
          name,
          description,
          photo_path,
          is_private,
          owner_id
        )
      `
      )
      .eq("token", token)
      .gt("expires_at", now)
      .single();

    // Validate invitation
    if (invitationError || !invitation) {
      return {
        status: "error",
        message: "Link undangan tidak valid atau telah kedaluwarsa",
      };
    }

    const groupId = invitation.group_id;

    // OPTIMIZATION: Check membership for specific group only
    const { data: existingMember } = await supabase
      .from("grup_members")
      .select("id")
      .eq("grup_id", groupId)
      .eq("user_id", profile.id) // ✅ Use XID
      .single();

    if (existingMember) {
      return {
        status: "error",
        message: "Anda sudah menjadi anggota grup ini",
      };
    }

    // OPTIMIZATION: Combine member insertion and logging in a transaction-like approach
    const joinData = {
      id: generateId(),
      grup_id: groupId,
      user_id: profile.id, // ✅ Use XID
      role: "member" as const,
    };

    const logData = {
      group_id: groupId,
      user_id: profile.id, // ✅ Use XID
      invitation_link_id: invitation.id,
      joined_via: "invitation_link" as const,
      joined_at: new Date().toISOString(),
    };

    // Execute both operations in parallel (non-critical logging won't block the main operation)
    const [memberResult] = await Promise.allSettled([
      supabase.from("grup_members").insert(joinData),
      supabase.from("grup_join_logs").insert(logData), // This can fail without affecting the join
    ]);

    if (
      memberResult.status === "rejected" ||
      (memberResult.status === "fulfilled" && memberResult.value.error)
    ) {
      const error =
        memberResult.status === "rejected"
          ? memberResult.reason
          : memberResult.value.error;
      console.error("Error adding member to group:", error);
      return {
        status: "error",
        message: "Gagal bergabung ke grup",
      };
    }

    // Type assertion to ensure proper typing
    const invitationData = invitation as unknown as InvitationLinkWithGroup;

    revalidatePath("/grup");

    return {
      status: "success",
      message: `Berhasil bergabung ke grup "${
        invitationData.grup?.name || "Unknown"
      }"`,
      data: {
        groupId: groupId,
        groupName: invitationData.grup?.name || "Unknown",
      },
    };
  } catch (error) {
    console.error("Error joining group via link:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat bergabung ke grup",
    };
  }
}

// Fungsi untuk mendapatkan semua invitation links milik grup
export async function getGroupInvitationLinks(groupId: string) {
  const supabase = await createClient();

  try {
    // Get current user auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        status: "error",
        message: "Unauthorized",
      };
    }

    // ✅ Get user profile to get XID (not UUID)
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth", user.id)
      .single();

    if (profileError || !profile) {
      return {
        status: "error",
        message: "User profile not found",
      };
    }

    // Verify user has permission (owner or admin)
    const { data: membership, error: memberError } = await supabase
      .from("grup_members")
      .select("role")
      .eq("grup_id", groupId)
      .eq("user_id", profile.id) // ✅ Use XID
      .single();

    if (
      memberError ||
      !membership ||
      !["owner", "admin"].includes(membership.role)
    ) {
      return {
        status: "error",
        message: "Anda tidak memiliki izin untuk melihat link undangan",
      };
    }

    const { data, error } = await supabase
      .from("grup_invitation_links")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitation links:", error);
      return {
        status: "error",
        message: "Gagal mengambil data link undangan",
      };
    }

    // Add full URL to each invitation
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const linksWithUrl = data.map((link) => ({
      ...link,
      url: `${baseUrl}/grup/join/${link.token}`,
    }));

    return {
      status: "success",
      data: linksWithUrl,
    };
  } catch (error) {
    console.error("Error getting group invitation links:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat mengambil link undangan",
    };
  }
}

// Fungsi untuk menghapus invitation link
export async function deleteInvitationLink(linkId: string) {
  const supabase = await createClient();

  try {
    // Get current user auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        status: "error",
        message: "Unauthorized",
      };
    }

    // ✅ Get user profile to get XID (not UUID)
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth", user.id)
      .single();

    if (profileError || !profile) {
      return {
        status: "error",
        message: "User profile not found",
      };
    }

    // Get invitation data
    const { data: invitation, error: invitationError } = await supabase
      .from("grup_invitation_links")
      .select("id, group_id, created_by")
      .eq("id", linkId)
      .single();

    if (invitationError || !invitation) {
      return {
        status: "error",
        message: "Link undangan tidak ditemukan",
      };
    }

    // Verify user has permission (owner, admin, or creator of the link)
    if (invitation.created_by !== profile.id) {
      const { data: membership, error: memberError } = await supabase
        .from("grup_members")
        .select("role")
        .eq("grup_id", invitation.group_id)
        .eq("user_id", profile.id) // ✅ Use XID
        .single();

      if (
        memberError ||
        !membership ||
        !["owner", "admin"].includes(membership.role)
      ) {
        return {
          status: "error",
          message: "Anda tidak memiliki izin untuk menghapus link ini",
        };
      }
    }

    // Delete the link
    const { error: deleteError } = await supabase
      .from("grup_invitation_links")
      .delete()
      .eq("id", linkId);

    if (deleteError) {
      console.error("Error deleting invitation link:", deleteError);
      return {
        status: "error",
        message: "Gagal menghapus link undangan",
      };
    }

    return {
      status: "success",
      message: "Link undangan berhasil dihapus",
    };
  } catch (error) {
    console.error("Error deleting invitation link:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat menghapus link undangan",
    };
  }
}

// Fungsi untuk mendapatkan data siapa saja yang join via invitation links
export async function getGroupJoinLogs(groupId: string) {
  const supabase = await createClient();

  try {
    // Get current user auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        status: "error",
        message: "Unauthorized",
      };
    }

    // ✅ Get user profile to get XID (not UUID)
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth", user.id)
      .single();

    if (profileError || !profile) {
      return {
        status: "error",
        message: "User profile not found",
      };
    }

    // Verify user has permission (owner or admin)
    const { data: membership, error: memberError } = await supabase
      .from("grup_members")
      .select("role")
      .eq("grup_id", groupId)
      .eq("user_id", profile.id) // ✅ Use XID
      .single();

    if (
      memberError ||
      !membership ||
      !["owner", "admin"].includes(membership.role)
    ) {
      return {
        status: "error",
        message: "Anda tidak memiliki izin untuk melihat log join",
      };
    }

    const { data, error } = await supabase
      .from("grup_join_logs")
      .select(
        `
        id,
        joined_at,
        joined_via,
        user_profiles:user_id (
          id,
          name,
          email,
          avatar
        ),
        grup_invitation_links:invitation_link_id (
          id,
          token,
          created_at
        )
      `
      )
      .eq("group_id", groupId)
      .eq("joined_via", "invitation_link")
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error fetching join logs:", error);
      return {
        status: "error",
        message: "Gagal mengambil data log join",
      };
    }

    return {
      status: "success",
      data: data || [],
    };
  } catch (error) {
    console.error("Error getting group join logs:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat mengambil log join",
    };
  }
}

// Fungsi untuk cleanup expired links (hapus link yang sudah expired)
export async function cleanupExpiredLinks() {
  const supabase = await createClient();

  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("grup_invitation_links")
      .delete()
      .lt("expires_at", now);

    if (error) {
      console.error("Error cleaning up expired links:", error);
      return {
        status: "error",
        message: "Gagal membersihkan link yang kedaluwarsa",
      };
    }

    return {
      status: "success",
      message: "Berhasil membersihkan link yang kedaluwarsa",
    };
  } catch (error) {
    console.error("Error in cleanup expired links:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat membersihkan link",
    };
  }
}
