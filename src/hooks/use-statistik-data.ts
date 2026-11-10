"use client"

import useSWR from "swr"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch data")
  return res.json()
}

export function useStatistikData(params: {
  startDate?: string
  endDate?: string
}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null) as [string, string][]
  ).toString()

  const url = `/api/statistik?${query}`
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 1000 * 60,
  })

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  }
}
