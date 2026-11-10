"use client";

import { loginMyQurani } from "./login";
import signup from "./register";
import { toast } from "sonner";
import { usersApi, getStoredAuth } from "@/lib/api";
import { getDictionaries, getStoredLocale } from "@/lib/i18n";

/**
 * Helper function to get translated message outside React context
 */
async function getTranslatedMessage(key: string, fallback: string): Promise<string> {
  try {
    const locale = getStoredLocale();
    const dictionary = await getDictionaries(['common'], locale);

    const keys = key.split('.');
    let value: unknown = dictionary;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }

    return typeof value === 'string' ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Login with toast notifications using MyQurani API
 */
export async function loginWithToast(formData: FormData) {
  const res = await loginMyQurani(formData);

  if (res.success) {
    toast.success("Login successful! Redirecting to dashboard...");
  } else {
    if (res.error?.includes("permission") || res.error?.includes("Access denied")) {
      const errorMessage = await getTranslatedMessage("auth.admin_access_required", res.error || "Access denied");
      toast.error(errorMessage);
    } else {
      toast.error(res.error || "Login failed");
    }
  }

  return res;
}

export async function registerWithToast(formData: FormData) {
  const res = await signup(formData);
  if (res?.success) {
    toast.success("Registration successful!");
    toast.info("Please check your email to verify your account.");
  } else {
    toast.error(res?.error);
  }
}

// Validasi email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validasi password
export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter"
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter"
    };
  }
  return { isValid: true };
}

// Validasi username
export function validateUsername(username: string): {
  isValid: boolean;
  message?: string;
} {
  if (username.length < 3) {
    return {
      isValid: false,
      message: "Username must be at least 3 characters",
    };
  }
  if (username.includes(" ")) {
    return {
      isValid: false,
      message: "Username cannot contain spaces. Use underscore (_) instead",
    };
  }
  if (username.includes("-")) {
    return {
      isValid: false,
      message: "Username cannot contain hyphens (-). Use underscore (_) instead",
    };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      message: "Username may only contain letters, numbers, and underscores",
    };
  }
  return { isValid: true };
}

/**
 * Cek ketersediaan username via API Qurani
 * Menggunakan endpoint /api/v1/Users/search
 */
export async function checkUsernameAvailability(username: string): Promise<{
  isAvailable: boolean;
  message?: string;
}> {
  try {
    // Validasi format username terlebih dahulu
    const validation = validateUsername(username);
    if (!validation.isValid) {
      return {
        isAvailable: false,
        message: validation.message,
      };
    }

    const stored = getStoredAuth();
    const token = stored?.accessToken;

    // Cari username via API Qurani
    const normalizedUsername = username.startsWith("@") ? username : `@${username}`;

    const result = await usersApi.search({ keyword: normalizedUsername }, token);
    const items = result?.data?.items || result?.items || result?.data || [];

    // Jika ada user dengan username yang sama, berarti tidak tersedia
    const existingUser = Array.isArray(items)
      ? items.find((u: any) =>
          u.username?.toLowerCase() === normalizedUsername.toLowerCase() ||
          u.username?.toLowerCase() === username.toLowerCase()
        )
      : null;

    if (existingUser) {
      return {
        isAvailable: false,
        message: "Username is already taken",
      };
    }

    return {
      isAvailable: true,
      message: "Username is available",
    };
  } catch {
    return {
      isAvailable: false,
      message: "Error checking username availability",
    };
  }
}
