"use client";

import { useAuth } from "./use-auth";

export function useUserRole() {
  const { profile, loading, error } = useAuth();
  
  const role = profile?.role || "member";

  return {
    role,
    isAdmin: role === "admin" || role === "Admin",
    isMember: role === "member" || role === "Member",
    isLoading: loading,
    error,
  };
}
