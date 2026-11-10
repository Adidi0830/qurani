"use server";

import { createClient } from "../../supabase/server";

export async function updateCategory(
    categoryId: string,
    categoryName: string
) {
  const supabase = await createClient();

  // Validate input
  if (!categoryName || categoryName.trim().length === 0) {
    return { status: "error", message: "Nama kategori tidak boleh kosong" };
  }

  const trimmedName = categoryName.trim();

  // Check if category exists
  const { data: currentCategory } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", categoryId)
    .single();

  if (!currentCategory) {
    return { status: "error", message: "Kategori tidak ditemukan" };
  }

  // Check if the new name is the same as current name
  if (currentCategory.name === trimmedName) {
    return { status: "success", message: "Kategori sudah sesuai", data: currentCategory };
  }

  // Check if another category with the same name already exists
  const { data: existingCategory } = await supabase
    .from("categories")
    .select("id, name")
    .eq("name", trimmedName)
    .neq("id", categoryId)
    .single();

  if (existingCategory) {
    return { status: "error", message: "Kategori dengan nama tersebut sudah ada" };
  }

  // Update the category name
  const { data, error: updateError } = await supabase
    .from("categories")
    .update({ name: trimmedName })
    .eq("id", categoryId)
    .select();

  if (updateError) {
    console.error("Update category error:", updateError);
    return { status: "error", message: "Kategori Gagal Diupdate" };
  }

  return { status: "success", message: "Kategori Berhasil Diupdate", data };
}
