'use client';

import { useState, useEffect } from 'react';
import { registerPush } from '@/lib/registerPush';
import { Bell, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SimpleAutoNotificationPrompt({ userId }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-check apakah harus tampil
    const checkAndShow = async () => {
      // Jangan tampilkan jika tidak ada userId
      if (!userId) return;

      // Cek browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      // Cek permission - hanya tampilkan jika masih 'default'
      if (Notification.permission !== 'default') return;

      // Cek apakah user sudah dismiss sebelumnya
      const dismissed = localStorage.getItem('autoNotificationDismissed');
      if (dismissed) return;

      // Mobile-friendly subscription check dengan timeout
      try {
        // Register service worker dulu jika belum ada
        await navigator.serviceWorker.register('/swPushNotification.js');
        
        // Check subscription dengan timeout untuk mobile
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 2000);
        });
        
        const subscriptionPromise = navigator.serviceWorker.ready.then(reg => 
          reg.pushManager.getSubscription()
        );
        
        const subscription = await Promise.race([subscriptionPromise, timeoutPromise]);
        if (subscription) return;
        
      } catch (error) {
        // Continue anyway jika service worker check gagal
      }

      // Delay 4 detik setelah load halaman
      setTimeout(() => {
        setShowPrompt(true);
      }, 4000);
    };

    checkAndShow();
  }, [userId]);

  const handleEnable = async () => {
    setIsLoading(true);
    
    try {
      const result = await registerPush(userId);
      
      if (result && result.success) {
        // Show success notification (mobile compatible)
        if (Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('🎉 Notifikasi Aktif!', {
                  body: 'Anda akan mendapatkan reminder setoran hafalan',
                  icon: '/icons/qurani-192.png',
                  badge: '/icons/qurani-192.png',
                  tag: 'success-notification'
                });
              });
            } else {
              // Fallback untuk desktop
              new Notification('🎉 Notifikasi Aktif!', {
                body: 'Anda akan mendapatkan reminder setoran hafalan',
                icon: '/icons/qurani-192.png'
              });
            }
            } catch (error) {
              // Silent error - notification still works
            }
        }
        
        // Close prompt
        setShowPrompt(false);
      }
    } catch (error) {
      // ✅ Improved error handling instead of silent error
      console.error('SimpleAutoNotificationPrompt handleEnable error:', error);
      
      // Show error to user instead of silent fail
      const errorMessage = `Gagal mengaktifkan notifikasi: ${error.message}`;
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('autoNotificationDismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 right-4 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-right duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-sm">Aktifkan Notifikasi</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Dapatkan reminder setoran hafalan langsung ke perangkat Anda
      </p>
      
      <div className="flex gap-2">
        <Button
          onClick={handleEnable}
          disabled={isLoading}
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Aktifkan'
          )}
        </Button>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="sm"
          className="text-gray-600 dark:text-gray-400"
        >
          Nanti
        </Button>
      </div>
    </div>
  );
}
