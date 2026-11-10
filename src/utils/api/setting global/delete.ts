"use server";

import { fetchWithAutoRefresh } from "@/utils/api/token-refresh";
import { updateSettingGlobalStatus } from "./update";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export async function deleteSettingGlobal(id: number) {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/v1/qurani/settings/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[deleteSettingGlobal] API Error:", response.status, errorText);
      return { 
        status: "error", 
        message: "Gagal menghapus setting global di server",
      };
    }

    return {
      status: "success",
      message: `Setting global berhasil dihapus`,
      data: { id },
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { 
      status: "error", 
      message: "Terjadi kesalahan tidak terduga",
    };
  }
}

// Fungsi untuk soft delete (mengubah status menjadi 0/inactive)
export async function softDeleteSettingGlobal(id: number) {
  try {
    const result = await updateSettingGlobalStatus(id, 0);

    if (result.status === "error") {
      return { 
        status: "error", 
        message: "Gagal menonaktifkan setting global",
      };
    }

    return {
      status: "success",
      message: "Setting global berhasil dinonaktifkan",
      data: "data" in result ? result.data : undefined,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { 
      status: "error", 
      message: "Terjadi kesalahan tidak terduga",
    };
  }
}

// Fungsi untuk delete multiple records
export async function deleteMultipleSettingGlobal(ids: number[]) {
  try {
    const deletePromises = ids.map(id => deleteSettingGlobal(id));
    const results = await Promise.all(deletePromises);
    
    const failedDeletes = results.filter(r => r.status === "error");

    if (failedDeletes.length > 0) {
      return { 
        status: "error", 
        message: `Gagal menghapus ${failedDeletes.length} dari ${ids.length} setting global`,
      };
    }

    return {
      status: "success",
      message: `${ids.length} setting global berhasil dihapus`,
      data: ids,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { 
      status: "error", 
      message: "Terjadi kesalahan tidak terduga",
    };
  }
}
