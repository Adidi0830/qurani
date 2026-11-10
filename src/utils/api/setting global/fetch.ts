"use server";

import { fetchWithAutoRefresh } from "@/utils/api/token-refresh";
import { SettingGlobal } from "@/types/setting global";
import { createClient } from "@/utils/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// Helper to fetch from Supabase
async function fetchSupabaseSettings(): Promise<SettingGlobal[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("setting_global").select("*");
    
    if (error || !data) {
      console.warn("[fetchSupabaseSettings] Error or no data:", error?.message);
      return [];
    }
    
    return data as SettingGlobal[];
  } catch (err) {
    console.warn("[fetchSupabaseSettings] Catch Error:", err);
    return [];
  }
}

export async function fetchSettingGlobal() {
  try {
    // 1. Ambil data dari Supabase (Sebagai Fallback / Data Lama)
    const supabasePromise = fetchSupabaseSettings();

    // 2. Ambil data dari API Qurani
    let apiData: SettingGlobal[] = [];
    try {
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/v1/qurani/settings/effective`, {
        method: 'GET',
      });

      if (response.ok) {
        const result = await response.json();
        let rawData = result.data || result;

        if (!Array.isArray(rawData)) {
            if (rawData && Array.isArray(rawData.items)) {
                rawData = rawData.items;
            } else {
                rawData = [];
            }
        }

        // Map API data structure to UI data structure
        apiData = rawData.map((item: any) => ({
          id: item.id || Math.floor(Math.random() * 1000000), // Generate temporary ID if null
          key: item.code,
          value: item.name,
          color: item.color,
          status: item.isActive !== undefined ? item.isActive : 1,
        }));
      } else {
        console.warn("[fetchSettingGlobal] API Error response:", response.status);
      }
    } catch (apiError) {
      console.warn("[fetchSettingGlobal] Failed to fetch from API:", apiError);
    }

    // 3. Gabungkan Data (API Data akan menimpa Supabase Data jika key/code sama)
    const sbData = await supabasePromise;
    
    // Gunakan Map untuk merge berdasarkan "key"
    const mergedMap = new Map<string, SettingGlobal>();
    
    // Masukkan Supabase data terlebih dahulu
    sbData.forEach(item => {
      if (item.key) mergedMap.set(item.key, item);
    });
    
    // Timpa dengan API data jika ada
    apiData.forEach(item => {
      if (item.key) mergedMap.set(item.key, item);
    });

    return {
      status: "success",
      data: Array.from(mergedMap.values()),
      source: "hybrid",
    };
  } catch (error) {
    console.error("[fetchSettingGlobal] Error:", error);
    return { status: "error", message: "Terjadi kesalahan sistem saat memuat setting global" };
  }
}

// Helper function to invalidate cache (now a no-op since we removed Redis)
export async function invalidateSettingGlobalCache() {
  // No longer needed, but kept for backward compatibility
  console.log("ℹ️ Cache invalidation called for setting global");
}
