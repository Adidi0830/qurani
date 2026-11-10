"use server";

import { createClient } from "../../supabase/server";

export async function insertCategory(
    categoryName: string
) {
  const supabase = await createClient();

  // Validate input
  if (!categoryName || categoryName.trim().length === 0) {
    return { status: "error", message: "Nama kategori tidak boleh kosong" };
  }

  const trimmedName = categoryName.trim();

  // Check if category with same name already exists
  const { data: existingCategory } = await supabase
    .from("categories")
    .select("id, name")
    .eq("name", trimmedName)
    .single();

  if (existingCategory) {
    return { status: "error", message: "Kategori dengan nama tersebut sudah ada" };
  }

  // Get next available ID
  const { data: maxIdResult } = await supabase
    .from("categories")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  const nextId = maxIdResult ? maxIdResult.id + 1 : 1;

  // Insert the new category
  const { data: dataCategory, error: errorCategory } = await supabase
    .from("categories")
    .insert({
      id: nextId,
      name: trimmedName,
      created_at: new Date().toISOString()
    })
    .select();

  if (errorCategory) {
    console.error("Insert category error:", errorCategory);
    return { status: "error", message: "Kategori Gagal Dibuat" };
  }

  return { status: "success", message: "Kategori Berhasil Dibuat", data: dataCategory };
}