"use client";

import { useAuth } from "./use-auth";

export const useCurrentUserImage = () => {
  const { profile } = useAuth();
  return profile?.avatar || null;
};
