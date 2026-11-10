"use client";

import useSWR from "swr";

export type NotificationRecipient = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  profile_user: string | null;
};

const fetcher = async (url: string): Promise<NotificationRecipient[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    // Silently return empty array for auth errors
    if (res.status === 401 || res.status === 403) {
      console.log('[Recipients] Auth failed, returning empty array');
      return [];
    }
    throw new Error("Failed to fetch recipients");
  }
  const data = await res.json();
  return data.recipients ?? [];
};

export function useNotificationRecipients(userId?: string) {
  const shouldFetch = Boolean(userId);

  const {
    data: recipients,
    error,
    isLoading,
    mutate,
  } = useSWR<NotificationRecipient[]>(
    shouldFetch
      ? `/api/recipients?userId=${encodeURIComponent(userId!)}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 5, // cache 5 menit
      errorRetryCount: 0, // Don't retry on error
    }
  );

  return {
    recipients: recipients ?? [],
    isLoading,
    error,
    refreshRecipients: mutate,
  };
}
