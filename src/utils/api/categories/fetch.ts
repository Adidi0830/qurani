"use server";

import { createClient } from "@/utils/supabase/server";

export const getCategories = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      created_at,
      group:grup (
        id,
        name,
        photo_path,
        category_id
      )
    `)
  
  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "categories fetched successfully",
    data,
  };
};

// export const getUserBySearch = async (search: string) => {
//   const supabase = await createClient();
//   const { data, error } = await supabase.from("user_profiles").select("*").like("username", `%${search}%`).or(`full_name.ilike.%${search}%,email.ilike.%${search}%`).order("full_name", { ascending: true }).order("role", { ascending: true });

//   if (error) {
//     return {
//       success: false,
//       message: error.message,
//     };
//   }

//   return {
//     success: true,
//     message: "users fetched successfully",
//     data,
//   };
// };

// export const getUserById = async (id: string) => {
//   const supabase = await createClient();

//   const { data, error } = await supabase
//     .from("user_profiles")
//     .select("*")
//     .eq("id", id)
//     .single();

//   if (error) {
//     return {
//       success: false,
//       message: error.message,
//     };
//   }

//   if (data.length === 0) {
//     return {
//       success: false,
//       message: "user not found",
//     };
//   }

//   return {
//     success: true,
//     message: "user get by id successfully",
//     data: data as UserProfile,
//   };
// };

// export const getUserByUsername = async (username: string) => {
//   const supabase = await createClient();

//   const { data, error } = await supabase
//     .from("user_profiles")
//     .select("*")
//     .eq("username", `@${username}`)
//     .single();

//   if (error) {
//     return {
//       success: false,
//       message: error.message,
//     };
//   }

//   if (!data) {
//     return {
//       success: false,
//       message: "user not found",
//     };
//   }

//   return {
//     success: true,
//     message: "user get by username successfully",
//     data: data as UserProfile,
//   };
// };

// export const checkUserHasUsername = async (userId: string) => {
//   const supabase = await createClient();

//   const { data, error } = await supabase
//     .from("user_profiles")
//     .select("username")
//     .eq("id", userId)
//     .single();

//   if (error) {
//     if (error.code === "PGRST116") {
//       // User profile doesn't exist
//       return {
//         success: true,
//         hasUsername: false,
//         profileExists: false,
//       };
//     }
//     return {
//       success: false,
//       message: error.message,
//     };
//   }

//   return {
//     success: true,
//     hasUsername: !!data?.username,
//     profileExists: true,
//   };
// };
