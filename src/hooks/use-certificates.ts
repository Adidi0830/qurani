"use client";

/**
 * use-certificates hook
 *
 * Custom SWR hooks untuk data sertifikat.
 * Memanggil service functions di certificates.ts yang sudah memiliki
 * dummy data fallback ketika API tidak dapat diakses (401/error).
 */

import useSWR from "swr";
import type {
  CertificateSearchParams,
} from "@/services/api/certificates";
import {
  searchCertificates,
  getCertificateStatistics,
  getCertificateTemplates,
} from "@/services/api/certificates";

// ============================================
// Hooks
// ============================================

/**
 * Fetch daftar sertifikat dengan filter.
 * Otomatis refresh saat `params` berubah.
 * Fallback ke dummy data jika API tidak tersedia.
 */
export function useCertificates(params: CertificateSearchParams, enabled: boolean = true) {
  // Buat stable key dari params
  const key = enabled
    ? ["certificates-search", JSON.stringify(params)]
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      const result = await searchCertificates(params);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Gagal mengambil data sertifikat");
      }
      return result.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 15_000,
      errorRetryCount: 1,
    }
  );

  return {
    certificates: data?.data ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

/**
 * Fetch statistik sertifikat.
 * Fallback ke dummy data jika API tidak tersedia.
 */
export function useCertificateStatistics(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? "certificates-statistics" : null,
    async () => {
      const result = await getCertificateStatistics();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Gagal mengambil statistik");
      }
      return result.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      errorRetryCount: 1,
    }
  );

  return {
    statistics: data ?? null,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

/**
 * Fetch template sertifikat.
 * Fallback ke dummy data jika API tidak tersedia.
 */
export function useCertificateTemplates(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? "certificates-templates" : null,
    async () => {
      const result = await getCertificateTemplates();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Gagal mengambil template");
      }
      return result.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      errorRetryCount: 1,
    }
  );

  return {
    templates: data ?? [],
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}
