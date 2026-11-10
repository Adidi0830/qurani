import { toast } from 'sonner'

interface ErrorMessages {
  networkError: string
  timeoutError: string
  configError: string
  defaultError: string
}

export function handleApiError(
  error: unknown,
  errorMessages: ErrorMessages
): void {
  console.error('API Error:', error)

  if (error instanceof Error) {
    if (error.message.includes('Network error')) {
      toast.error(errorMessages.networkError)
    } else if (error.message.includes('timeout')) {
      toast.error(errorMessages.timeoutError)
    } else if (error.message.includes('Missing Supabase')) {
      toast.error(errorMessages.configError)
    } else {
      toast.error(errorMessages.defaultError)
    }
  } else {
    toast.error(errorMessages.defaultError)
  }
}
