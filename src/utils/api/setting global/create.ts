"use server";

import { fetchWithAutoRefresh } from "@/utils/api/token-refresh";
import { SettingGlobal } from "@/types/setting global";
import { fetchSettingGlobal } from "./fetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

interface CreateSettingGlobalData {
  key: string;
  value: string;
  color: string;
  status: number;
}

interface ApiResponse {
  status: "success" | "error";
  message: string;
  data?: SettingGlobal;
}

// Get next available key for sa (kesalahan ayat) or sk (kesalahan kata)
export async function getNextKey(type: "sa" | "sk"): Promise<string> {
  try {
    const result = await fetchSettingGlobal();
    
    if (result.status !== "success" || !result.data) {
      return `${type}-1`;
    }

    const data = result.data.filter(item => item.key.startsWith(`${type}-`));

    if (data.length === 0) {
      return `${type}-1`;
    }

    // Extract numbers from all keys and find the maximum
    const numbers = data
      .map((item) => {
        const match = item.key.match(/(\w+)-(\d+)/);
        return match ? parseInt(match[2]) : 0;
      })
      .filter((num) => num > 0);

    if (numbers.length === 0) {
      return `${type}-1`;
    }

    const maxNumber = Math.max(...numbers);
    return `${type}-${maxNumber + 1}`;
  } catch (error) {
    console.error("Error in getNextKey:", error);
    return `${type}-1`;
  }
}

// Create new setting global
export async function createSettingGlobal(
  data: CreateSettingGlobalData
): Promise<ApiResponse> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/v1/qurani/settings`, {
      method: 'POST',
      body: JSON.stringify({
        scope: "public",
        scopeId: null,
        code: data.key,
        name: data.value,
        color: data.color && data.color !== "NULL" ? data.color : null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[createSettingGlobal] API Error:", response.status, errorText);
      return {
        status: "error",
        message: "Gagal membuat setting global di server",
      };
    }

    const result = await response.json();
    const createdData = result.data || result;

    return {
      status: "success",
      message: "Setting global berhasil dibuat",
      data: {
        id: createdData.id,
        key: createdData.code,
        value: createdData.name,
        color: createdData.color,
        status: createdData.isActive !== undefined ? createdData.isActive : 1,
      },
    };
  } catch (error) {
    console.error("Error in createSettingGlobal:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat membuat setting global",
    };
  }
}
