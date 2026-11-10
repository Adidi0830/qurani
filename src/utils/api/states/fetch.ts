"use server";

import { createAdminClient, createClient } from "@/utils/supabase/server";

type StateItem = {
  id: number;
  name: string;
  country_id: number;
  country_code?: string;
  country_name?: string;
};

export async function fetchStates(country_id?: number): Promise<{
  success: boolean;
  message: string;
  data: StateItem[];
}> {
  try {
    const { createAdminClient } = await import("@/utils/supabase/server");
    const supabase = await createAdminClient();

    let query = supabase
      .from("states")
      .select("id, name, country_id, country_code, country_name")
      .order("name");

    if (country_id) {
      query = query.eq("country_id", country_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[fetchStates] Supabase Error:", error);
      return { success: false, message: "Failed to fetch states", data: [] };
    }

    return { success: true, message: "States fetched successfully", data: (data || []) as StateItem[] };
  } catch (error) {
    console.error("[fetchStates] Error:", error);
    return { success: false, message: "Unknown error", data: [] };
  }
}

export async function fetchStatesById(id: number): Promise<{
  success: boolean;
  message: string;
  data?: StateItem;
}> {
  try {
    const { createAdminClient } = await import("@/utils/supabase/server");
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("states")
      .select("id, name, country_id, country_code, country_name")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("[fetchStatesById] Supabase Error:", error);
      return { success: false, message: "Failed to fetch state" };
    }

    return { success: true, message: "State fetched successfully", data: data as StateItem };
  } catch (error) {
    console.error("[fetchStatesById] Error:", error);
    return { success: false, message: "Unknown error" };
  }
}
