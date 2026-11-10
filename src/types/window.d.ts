declare global {
  interface Window {
    realtimeThrottle?: Record<string, NodeJS.Timeout>
  }
}

export {}
