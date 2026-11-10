"use client";

import { useState, useCallback, useRef } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { usersApi, getStoredAuth } from "@/lib/api";

export function useUsernameValidation(
  userId?: string,
  currentUsername?: string | null
) {
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useI18n();

  // Function to validate username format
  const validateUsernameFormat = useCallback(
    (username: string): string | null => {
      if (!username) return null;

      const usernameWithoutAt = username.startsWith("@")
        ? username.slice(1)
        : username;

      // Check for spaces
      if (usernameWithoutAt.includes(" ")) {
        return t(
          "profile.messages.error.username_no_spaces",
          "Username tidak boleh menggunakan spasi. Gunakan underscore (_) sebagai gantinya."
        );
      }

      // Check for hyphens (not allowed)
      if (usernameWithoutAt.includes("-")) {
        return t(
          "profile.messages.error.username_no_hyphens",
          "Username tidak boleh menggunakan tanda hubung (-). Gunakan underscore (_) sebagai gantinya."
        );
      }

      // Check for valid characters (alphanumeric, underscore only)
      const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!validUsernameRegex.test(usernameWithoutAt)) {
        return t(
          "profile.messages.error.username_invalid_chars",
          "Username hanya boleh menggunakan huruf, angka, dan underscore (_)"
        );
      }

      // Check minimum length
      if (usernameWithoutAt.length < 3) {
        return t(
          "profile.messages.error.username_min_length",
          "Username minimal 3 karakter"
        );
      }

      return null; // No error
    },
    [t]
  );

  const checkUsernameAvailability = useCallback(
    async (username: string) => {
      if (!username || username === currentUsername) {
        setUsernameError("");
        return true;
      }

      setIsCheckingUsername(true);
      try {
        const stored = getStoredAuth();
        const token = stored?.accessToken;
        const normalizedUsername = username.startsWith("@") ? username : `@${username}`;

        const result = await usersApi.search({ keyword: normalizedUsername }, token);
        const items = result?.data?.items || result?.items || result?.data || [];

        // Check if there's any user with the same username (excluding the current user)
        const existingUser = Array.isArray(items)
          ? items.find((u: any) =>
              (u.username?.toLowerCase() === normalizedUsername.toLowerCase() ||
               u.username?.toLowerCase() === username.toLowerCase()) &&
              u.id?.toString() !== userId
            )
          : null;

        if (existingUser) {
          setUsernameError(
            t(
              "profile.messages.error.username_taken",
              "Username sudah digunakan oleh user lain"
            )
          );
          return false;
        }

        setUsernameError("");
        return true;
      } catch (error) {
        console.error("Error checking username:", error);
        setUsernameError(
          t(
            "profile.messages.error.check_username",
            "Error checking username availability"
          )
        );
        return false;
      } finally {
        setIsCheckingUsername(false);
      }
    },
    [userId, currentUsername, t]
  );

  const debouncedCheckUsername = useCallback(
    (username: string) => {
      // Clear previous timeout
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }

      // Debounced username availability check
      if (username && username.length > 1) {
        usernameTimeoutRef.current = setTimeout(() => {
          checkUsernameAvailability(username);
        }, 500);
      } else {
        setUsernameError("");
      }
    },
    [checkUsernameAvailability]
  );

  // Cleanup timeout
  const cleanup = useCallback(() => {
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
  }, []);

  return {
    usernameError,
    setUsernameError,
    isCheckingUsername,
    validateUsernameFormat,
    checkUsernameAvailability,
    debouncedCheckUsername,
    cleanup,
  };
}
