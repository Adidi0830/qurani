import { useCallback } from 'react'

interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
}

export function useRetry(options: RetryOptions = {}) {
  const { maxRetries = 2, baseDelay = 1000 } = options

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> => {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (onError) {
          onError(lastError, attempt)
        }

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = baseDelay * (attempt + 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }, [maxRetries, baseDelay])

  return { executeWithRetry }
}
