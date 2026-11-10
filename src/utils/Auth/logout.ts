"use client"

import { clearStoredAuth } from "@/lib/api";
import { authApi } from "@/lib/api";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export default async function signOut(status: boolean, router?: AppRouterInstance) {
  if (!status) return;

  try {
    // 1. Logout via API Qurani (revoke token server-side)
    try {
      await authApi.logout();
    } catch {
      // Silently ignore API errors - we still want to clear local data
    }

    // 2. Clear all local auth data (localStorage + cookies)
    if (typeof window !== 'undefined') {
      clearStoredAuth();

      // Clear profile cache
      localStorage.removeItem('myqurani_user_profile_v2');
      localStorage.removeItem('myqurani_user_profile');

      // Clear all ticket/session cache
      Object.keys(localStorage).forEach(key => {
        if (
          key.startsWith('ticket_cache_') ||
          key.startsWith('ticket_replies_') ||
          key.startsWith('myqurani_')
        ) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('Error during signout:', error);
  }

  // ✅ Always redirect to login page
  if (router) {
    router.push("/login");
    router.refresh();
  } else {
    window.location.href = "/login";
  }
}
