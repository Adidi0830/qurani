"use server";

/**
 * ============================================
 * Groups Update API (LEGACY - Supabase)
 * ============================================
 * API Source: Supabase (Local Database)
 * Status: DEPRECATED - Should migrate to MyQurani API
 * 
 * MyQurani Alternatives:
 *   - groupsApi.update() for group updates
 *   - groupsApi.updateMemberRole() for role changes
 *   - groupsApi.uploadLogo() for photo uploads
 * ============================================
 */

import { createClient } from "../../supabase/server";

interface UpdateData {
  name: string;
  category_id: string;
  description?: string;
  type: string;
  photo_path?: string; // optional property
}

// API function untuk update grup
export async function updateGrup(
  groupId: string,
  formData: FormData,
  photo?: File | null
) {
  try {
    const supabase = await createClient();

    let photoPath: string | null = null;
    // Handle photo upload jika ada
    if (photo) {
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileExt = photo.name.split('.').pop()
      const { data: dataUpload, error: errorUpload } = await supabase.storage
        .from("qurani_storage")
        .upload("grup_profil" + groupId + "-" + Date.now() + "." + fileExt, buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: photo.type,
        });
      console.log("Photo uploaded:", dataUpload);
      if (errorUpload) {
        console.error("Error uploading photo:", errorUpload);
        return { status: "error", message: "Upload foto gagal." };
      }
      photoPath = dataUpload.path;
    }
    const updateData: UpdateData = {
      name: formData.get("name") as string,
      category_id: formData.get("category") as string,
      description: formData.get("description") as string,
      type: formData.get("status") as string,
    };

    // hanya update photo_path kalau ada foto baru
    if (photoPath) {
      updateData.photo_path = photoPath;
    }
    const { error } = await supabase
      .from("grup")
      .update(updateData)
      .eq("id", groupId);

    if (error) {
      console.error("Error updating group:", error);
      return {
        status: "error",
        message: "Gagal memperbarui grup",
      };
    }

    return {
      status: "success",
      message: "Grup berhasil diperbarui",
      data: { ...updateData, id: groupId },
    };
  } catch (error) {
    console.error("Error updating group:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat memperbarui grup",
    };
  }
}

export async function deleteGrup() {
  try {
    // TODO: Implement actual API call dengan Supabase
    // const { error } = await supabase
    //   .from('groups')
    //   .delete()
    //   .eq('id', groupId)

    // if (error) throw error

    // Mock response untuk testing
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API delay

    return {
      status: "success",
      message: "Grup berhasil dihapus",
    };
  } catch (error) {
    console.error("Error deleting group:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat menghapus grup",
    };
  }
}

export async function promoteToAdmin(groupId: string, userId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("grup_members")
      .update({ role: "admin" })
      .eq("grup_id", groupId)
      .eq("user_id", userId);

    console.log("Member promoted to admin:", userId, groupId);
    if (error) throw error;
    return {
      status: "success",
      message: "Anggota berhasil dipromosikan menjadi admin",
    };
  } catch (error) {
    console.error("Error promoting member to admin:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat mempromosikan anggota",
    };
  }
}

export async function demoteFromAdmin(groupId: string, userId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("grup_members")
      .update({ role: "member" })
      .eq("grup_id", groupId)
      .eq("user_id", userId);

    if (error) throw error;

    return {
      status: "success",
      message: "Admin berhasil diturunkan menjadi anggota",
    };
  } catch (error) {
    console.error("Error demoting admin:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat menurunkan admin",
    };
  }
}
