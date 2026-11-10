import { useState, useCallback } from 'react'

export interface UseLoadingOptions {
  initialLoading?: boolean
}

export interface UseLoadingReturn {
  loading: boolean
  setLoading: (loading: boolean) => void
  startLoading: () => void
  stopLoading: () => void
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>
}

/**
 * Custom hook untuk mengelola loading state
 * @param options - Opsi konfigurasi
 * @returns Object dengan loading state dan method untuk mengelola loading
 */
export function useLoading(options: UseLoadingOptions = {}): UseLoadingReturn {
  const { initialLoading = false } = options
  const [loading, setLoading] = useState(initialLoading)

  const startLoading = useCallback(() => {
    setLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    setLoading(false)
  }, [])

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true)
      const result = await fn()
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    setLoading,
    startLoading,
    stopLoading,
    withLoading,
  }
}
