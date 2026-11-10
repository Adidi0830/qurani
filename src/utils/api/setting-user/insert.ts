"use server";

import { createClient } from "@/utils/supabase/server";
import { invalidateSettingUserCache } from "./fetch";
import { generateId } from "@/lib/generateId";

interface SettingUser {
  id: number;
  value: string;
  color: string | null;
  status: number; // Mengubah tipe data status menjadi boolean
}

export async function insert(values: SettingUser[], userId: string) {
  try {
    const supabase = await createClient();

    // Ambil data yang sudah ada di database berdasarkan group_id
    const { data: existingData, error: fetchError } = await supabase
      .from("setting_user")
      .select("setting, user_id") // Hanya ambil kolom yang dibutuhkan
      .eq("user_id", userId);

    if (fetchError) {
      console.error("Error fetching existing settings:", fetchError);
      return {
        success: false,
        message: "An error occurred while fetching existing settings.",
      };
    }

    // Buat daftar operasi asinkron (Promise)
    const promises = values.map(async (value) => {
      // Cari apakah setting ini sudah ada di database
      const isExisting = existingData?.some((d) => d.setting === value.id);

      // Siapkan objek data untuk dimasukkan atau diperbarui
      const dataToSave = {
        id: generateId(),
        setting: value.id,
        value: value.value,
        color: value.color,
        status: value.status,
        user_id: userId,
      };

      if (isExisting) {
        // Operasi UPDATE
        const { error: updateError } = await supabase
          .from("setting_user")
          .update(dataToSave)
          .eq("setting", value.id)
          .eq("user_id", userId);

        if (updateError) {
          console.error("Update error:", updateError);
          return { error: updateError, type: "update" };
        }
      } else {
        // Operasi INSERT
        const { error: insertError } = await supabase
          .from("setting_user")
          .insert(dataToSave);

        if (insertError) {
          console.error("Insert error:", insertError);
          return { error: insertError, type: "insert" };
        }
      }
      return { success: true };
    });

    // Jalankan semua operasi secara bersamaan
    const results = await Promise.all(promises);

    // Periksa apakah ada operasi yang gagal
    const hasError = results.some((result) => result.error);

    if (hasError) {
      console.error(
        "Some operations failed.",
        results.filter((r) => r.error)
      );
      return {
        success: false,
        message: "An error occurred during one or more database operations.",
      };
    }

    // Invalidate cache after successful update
    await invalidateSettingUserCache(userId);

    return {
      success: true,
      message: "Settings updated successfully.",
    };
  } catch (error) {
    console.error("Caught a general error:", error);
    return {
      success: false,
      message: "An unexpected error occurred.",
    };
  }
}
