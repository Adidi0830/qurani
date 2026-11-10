"use client"

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/components/providers/i18n-provider'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// Global variable to store the prompt
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null

// Setup global event listener once
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    globalDeferredPrompt = e as BeforeInstallPromptEvent
    console.log('Global PWA install prompt captured')
  })

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null
    console.log('PWA app installed - prompt cleared')
  })
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const { t } = useI18n()

  // Sync local state with global prompt
  useEffect(() => {
    const checkPrompt = () => {
      if (globalDeferredPrompt && !deferredPrompt) {
        setDeferredPrompt(globalDeferredPrompt)
      }
    }

    checkPrompt()
    
    // Check periodically in case we missed the event
    const interval = setInterval(checkPrompt, 1000)
    
    return () => clearInterval(interval)
  }, [deferredPrompt])

  const install = useCallback(async () => {
    console.log('PWA install triggered, prompt available:', !!globalDeferredPrompt)
    
    const prompt = globalDeferredPrompt || deferredPrompt
    
    if (!prompt) {
      console.log('No PWA install prompt available - showing fallback')
      toast.info(t('navigation.install_manually', 'Untuk menginstal aplikasi, gunakan menu "Add to Home Screen" di browser Anda'))
      return false
    }

    try {
      console.log('Showing PWA install prompt')
      await prompt.prompt()
      
      const { outcome } = await prompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted PWA install')
        toast.success(t('navigation.installing_app', 'Sedang menginstal aplikasi...'))
        globalDeferredPrompt = null
        setDeferredPrompt(null)
        return true
      } else {
        console.log('User dismissed PWA install')
        return false
      }
    } catch (error) {
      console.error('Error during PWA installation:', error)
      toast.error(t('navigation.install_error', 'Gagal menginstal aplikasi'))
      return false
    }
  }, [deferredPrompt, t])

  const isAvailable = useCallback(() => {
    return !!(globalDeferredPrompt || deferredPrompt)
  }, [deferredPrompt])

  return {
    install,
    isAvailable,
    canInstall: !!(globalDeferredPrompt || deferredPrompt)
  }
}
