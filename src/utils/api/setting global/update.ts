"use server";

import { fetchWithAutoRefresh } from "@/utils/api/token-refresh";
import { EditLabelData } from "@/types/setting global";
import { fetchSettingGlobal } from "./fetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export async function updateSettingGlobal(id: number, data: EditLabelData) {
  try {
    let code = data.key;

    // Fallback: If key/code is missing, fetch it first
    if (!code) {
      const result = await fetchSettingGlobal();
      if (result.status === "success" && result.data) {
        const existing = result.data.find(s => s.id === id);
        if (existing) {
          code = existing.key;
        }
      }
    }

    if (!code) {
      return { 
        status: "error", 
        message: "Data setting global tidak ditemukan (key/code kosong)" 
      };
    }

    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/v1/qurani/settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        code: code,
        name: data.value,
        color: data.color && data.color !== "NULL" ? data.color : null,
        isActive: data.status,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[updateSettingGlobal] API Error:", response.status, errorText);
      return { 
        status: "error", 
        message: "Gagal mengupdate setting global di server",
      };
    }

    const result = await response.json();
    const updatedData = result.data || result;

    return {
      status: "success",
      message: "Setting global berhasil diupdate",
      data: {
        id: updatedData.id,
        key: updatedData.code,
        value: updatedData.name,
        color: updatedData.color,
        status: updatedData.isActive !== undefined ? updatedData.isActive : data.status,
      },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { 
      status: "error", 
      message: "Terjadi kesalahan tidak terduga",
    };
  }
}

// Fungsi untuk update status saja (enable/disable)
export async function updateSettingGlobalStatus(id: number, status: number) {
  try {
    // We need the full data to update via API because PUT requires code and name.
    // Fetch existing setting first
    const result = await fetchSettingGlobal();
    if (result.status !== "success" || !result.data) {
       return { 
        status: "error", 
        message: "Gagal mengambil data setting untuk update status" 
      };
    }

    const existing = result.data.find(s => s.id === id);
    if (!existing) {
      return { 
        status: "error", 
        message: "Data setting global tidak ditemukan" 
      };
    }

    return await updateSettingGlobal(id, {
      key: existing.key,
      value: existing.value,
      color: existing.color || "",
      status: status
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return { 
      status: "error", 
      message: "Terjadi kesalahan tidak terduga",
    };
  }
}
