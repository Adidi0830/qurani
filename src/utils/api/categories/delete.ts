"use server";

import { createClient } from "../../supabase/server";

export async function deleteCategory(
    categoryId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    return { status: "error", message: "Kategori Gagal Dihapus" };
  }

  return { status: "success", message: "Kategori Berhasil Dihapus" };
}
