"use server";

import { MonthRecap, MonthUser } from "@/types/recap";
import { createAdminClient, createClient } from "@/utils/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com";

interface RecapDataItem {
  city_id: number | null;
  total_recaps: number;
}

interface UserDataItem {
  city_id: number | null;
  total_recaps: number;
}

export interface CityData {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  total?: number;
}

type FetchCityItem = {
  id: number;
  name: string;
  timezone: string;
  state_id: number;
  latitude: number | null;
  longitude: number | null;
};

export async function fetchCities(stateId: number): Promise<{
  success: boolean;
  message: string;
  data: FetchCityItem[];
  error?: unknown;
}> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("cities")
      .select("id, name, timezone, state_id, latitude, longitude")
      .eq("state_id", stateId)
      .order("name");

    if (error) {
      console.error("[fetchCities] Error:", error.message, "stateId:", stateId);
      return { success: false, message: error.message, data: [] };
    }

    return { 
      success: true, 
      message: "Cities fetched successfully", 
      data: (data || []) as FetchCityItem[] 
    };
  } catch (error) {
    console.error("[fetchCities] Catch Error:", error);
    return { success: false, message: "Server error", data: [], error };
  }
}

export async function fetchCitiesWithRecapData(
  selectedMonthRecap: MonthRecap | "all"
): Promise<{ success: boolean; message: string; data?: CityData[] }> {
  const supabase = await createClient();

  if (selectedMonthRecap === "all") {
    const { data: recapData, error: recapError } = await supabase.rpc(
      "get_city_recap_counts"
    );
    if (recapError) {
      return { success: false, message: "Error fetching recap data" };
    }

    console.log("Recap Data:", recapData);

    // Extract unique city_ids from recapData
    const cityIds = [
      ...new Set(
        (recapData as RecapDataItem[])
          .map((item) => item.city_id)
          .filter((id) => id !== null)
      ),
    ];

    console.log("City IDs with recap data:", cityIds);

    if (cityIds.length === 0) {
      return {
        success: true,
        message: "No cities with recap data",
        data: [],
      };
    }

    const { data: cityData, error: cityError } = await supabase
      .from("cities")
      .select("id, name, latitude, longitude")
      .in("id", cityIds)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    console.log("City Data:", cityData);
    if (cityError) {
      console.error("Error fetching cities data:", cityError);
      return { success: false, message: "Error fetching cities data" };
    }

    // Transform the data to the desired format
    const transformedData = cityData
      .map((city) => {
        // Find matching recap data for this city
        const recapItem = (recapData as RecapDataItem[]).find(
          (item) => item.city_id === city.id
        );
        return {
          longitude: city.longitude,
          latitude: city.latitude,
          name: city.name,
          total: recapItem ? recapItem.total_recaps : 0,
        };
      })
      .filter((city) => city.total > 0); // Only include cities with recap data

    return {
      success: true,
      message: "Cities with recap data fetched successfully",
      data: transformedData,
    };
  } else {
    // For specific month, you might need to modify the RPC call or use a different approach
    const { data: recapData, error: recapError } = await supabase.rpc(
      "get_city_recap_counts_by_month",
      {
        month_text: selectedMonthRecap.value,
      }
    );
    if (recapError) {
      return { success: false, message: "Error fetching recap data" };
    }

    // Extract unique city_ids from recapData
    const cityIds = [
      ...new Set(
        (recapData as RecapDataItem[])
          .map((item) => item.city_id)
          .filter((id) => id !== null)
      ),
    ];

    if (cityIds.length === 0) {
      return {
        success: true,
        message: "No cities with recap data",
        data: [],
      };
    }

    const { data: cityData, error: cityError } = await supabase
      .from("cities")
      .select("id, name, latitude, longitude")
      .in("id", cityIds)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (cityError) {
      return { success: false, message: "Error fetching cities data" };
    }

    // Transform the data to the desired format
    const transformedData = cityData
      .map((city) => {
        // Find matching recap data for this city
        const recapItem = (recapData as RecapDataItem[]).find(
          (item) => item.city_id === city.id
        );
        return {
          longitude: city.longitude,
          latitude: city.latitude,
          name: city.name,
          total: recapItem ? recapItem.total_recaps : 0,
        };
      })
      .filter((city) => city.total > 0); // Only include cities with recap data

    return {
      success: true,
      message: "Cities with recap data fetched successfully",
      data: transformedData,
    };
  }
}

export async function fetchCitiesWithUserData(
  selectedMonthUser: MonthUser | "all"
): Promise<{ success: boolean; message: string; data?: CityData[] }> {
  const supabase = await createClient();

  if (selectedMonthUser === "all") {
    const { data: userData, error: userError } = await supabase.rpc(
      "get_city_user_counts"
    );
    if (userError) {
      return { success: false, message: "Error fetching user data" };
    }

    console.log("user Data:", userData);

    // Extract unique city_ids from recapData
    const cityIds = [
      ...new Set(
        (userData as UserDataItem[])
          .map((item) => item.city_id)
          .filter((id) => id !== null)
      ),
    ];

    console.log("City IDs with user data:", cityIds);

    if (cityIds.length === 0) {
      return {
        success: true,
        message: "No cities with user data",
        data: [],
      };
    }

    const { data: cityData, error: cityError } = await supabase
      .from("cities")
      .select("id, name, latitude, longitude")
      .in("id", cityIds)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    console.log("City Data:", cityData);
    if (cityError) {
      console.error("Error fetching cities data:", cityError);
      return { success: false, message: "Error fetching cities data" };
    }

    // Transform the data to the desired format
    const transformedData = cityData
      .map((city) => {
        // Find matching recap data for this city
        const userItem = (userData as UserDataItem[]).find(
          (item) => item.city_id === city.id
        );
        return {
          longitude: city.longitude,
          latitude: city.latitude,
          name: city.name,
          total: userItem ? userItem.total_recaps : 0,
        };
      })
      .filter((city) => city.total > 0); // Only include cities with recap data

    return {
      success: true,
      message: "Cities with user data fetched successfully",
      data: transformedData,
    };
  } else {
    // For specific month, you might need to modify the RPC call or use a different approach
    const { data: userData, error: userError } = await supabase.rpc(
      "get_city_user_counts_by_month",
      {
        month_text: selectedMonthUser.value,
      }
    );
    if (userError) {
      return { success: false, message: "Error fetching user data" };
    }

    // Extract unique city_ids from recapData
    const cityIds = [
      ...new Set(
        (userData as UserDataItem[])
          .map((item) => item.city_id)
          .filter((id) => id !== null)
      ),
    ];

    if (cityIds.length === 0) {
      return {
        success: true,
        message: "No cities with user data",
        data: [],
      };
    }

    const { data: cityData, error: cityError } = await supabase
      .from("cities")
      .select("id, name, latitude, longitude")
      .in("id", cityIds)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (cityError) {
      return { success: false, message: "Error fetching cities data" };
    }

    // Transform the data to the desired format
    const transformedData = cityData
      .map((city) => {
        // Find matching recap data for this city
        const userItem = (userData as UserDataItem[]).find(
          (item) => item.city_id === city.id
        );
        return {
          longitude: city.longitude,
          latitude: city.latitude,
          name: city.name,
          total: userItem ? userItem.total_recaps : 0,
        };
      })
      .filter((city) => city.total > 0); // Only include cities with recap data

    return {
      success: true,
      message: "Cities with users data fetched successfully",
      data: transformedData,
    };
  }
}

export async function fetchCityById(id: number) {
  try {
    const url = `${API_BASE_URL}/api/v1/Cities/${id}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      console.error("[fetchCityById] API Error:", response.status);
      return { success: false, message: `Failed to fetch city: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: "City fetched successfully",
      data,
    };
  } catch (error) {
    console.error("[fetchCityById] Error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}
