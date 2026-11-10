"use client";

import { useAuth } from "./use-auth";

export const useCurrentUserName = () => {
  const { profile } = useAuth();
  return profile?.name || profile?.username || "?";
};
