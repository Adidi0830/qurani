"use server";

import { createAdminClient } from "@/utils/supabase/server";

export type CountryItem = {
  id: number;
  name: string;
  iso2?: string;
  iso3?: string;
  phone_code?: string;
};

export async function fetchCountries(): Promise<{
  success: boolean;
  message: string;
  data: CountryItem[];
}> {
  try {
    const supabase = await createAdminClient();

    console.log("[fetchCountries] Fetching countries from Supabase...");
    const { data, error } = await supabase
      .from("countries")
      .select("id, name, iso2")
      .order("name");

    if (error) {
      console.error("[fetchCountries] Error:", error.message);
      return { success: false, message: error.message, data: [] };
    }

    console.log(`[fetchCountries] Success! Found ${data?.length || 0} countries.`);
    return { 
      success: true, 
      message: "Countries fetched successfully", 
      data: (data || []) as CountryItem[] 
    };
  } catch (error) {
    console.error("[fetchCountries] Catch Error:", error);
    return { success: false, message: "Server error", data: [] };
  }
}
