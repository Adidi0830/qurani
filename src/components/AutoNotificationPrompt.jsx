'use client';

import { useState, useEffect } from 'react';
import { registerPush } from '@/lib/registerPush';
import { Bell, X, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AutoNotificationPrompt({
  userId,
  onClose,
  onEnable,
  onDismiss,
  onRemindLater,
  context = 'dashboard'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    checkShouldShow();
  }, [userId]);

  const checkShouldShow = async () => {
    // Jangan tampilkan jika tidak ada userId
    if (!userId) return;

    // Cek browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return;
    }

    // Cek permission status
    const permission = Notification.permission;

    // Jangan tampilkan jika sudah granted atau denied
    if (permission !== 'default') {
      return;
    }

    // Cek apakah user sudah dismiss popup ini sebelumnya
    const dismissed = localStorage.getItem('notificationPromptDismissed');
    const lastDismissed = localStorage.getItem('notificationPromptLastDismissed');

    // Jika pernah dismiss, cek apakah sudah lebih dari 7 hari
    if (dismissed && lastDismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Masih dalam periode 7 hari, jangan tampilkan
      }
    }

    // Cek apakah user sudah subscribe
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        return; // Sudah subscribe, jangan tampilkan
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }

    // Delay sedikit agar tidak mengganggu loading awal
    setTimeout(() => {
      setIsVisible(true);
    }, 3000); // Tampilkan setelah 3 detik  
  };

  const handleEnable = async () => {
    setIsLoading(true);

    try {
      const result = await registerPush(userId);

      if (result && result.success) {
        setIsEnabled(true);

        // Show success notification (mobile compatible)
        if (Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('Notifikasi Qurani Aktif!', {
                  body: 'Anda akan mendapatkan reminder setoran dan update progress',
                  icon: '/icons/qurani-192.png',
                  badge: '/icons/qurani-192.png',
                  tag: 'success-notification'
                });
              });
            } else {
              // Fallback untuk desktop
              new Notification('Notifikasi Qurani Aktif!', {
                body: 'Anda akan mendapatkan reminder setoran dan update progress',
                icon: '/icons/qurani-192.png'
              });
            }
          } catch (error) {
            // Silent error - notification still works
          }
        }

        // Callback success
        if (onEnable) onEnable();

        // Auto close setelah 3 detik
        setTimeout(() => {
          handleClose();
        }, 3000);
      }
    } catch (error) {
      // ✅ Improved error handling with detailed logging
      console.error('AutoNotificationPrompt handleEnable error:', error);

      // Show error message to user (if there's no custom error handling)
      if (!onEnable) {
        const errorMessage = `Gagal mengaktifkan notifikasi: ${error.message}`;
        console.error(errorMessage);
        alert(errorMessage);
      } else {
        // Call onEnable with error info if provided
        onEnable({ success: false, error: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Simpan bahwa user sudah dismiss
    localStorage.setItem('notificationPromptDismissed', 'true');
    localStorage.setItem('notificationPromptLastDismissed', Date.now().toString());
    if (onDismiss) onDismiss();
    handleClose();
  };

  const handleRemindLater = () => {
    // Simpan untuk remind dalam 1 hari
    localStorage.setItem('notificationPromptLastDismissed', (Date.now() - (6 * 24 * 60 * 60 * 1000)).toString());
    if (onRemindLater) onRemindLater();
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <Card className="max-w-md w-full shadow-2xl border-0">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Aktifkan Notifikasi</h2>
                  <p className="text-green-100 text-sm">Jangan lewatkan reminder setoran</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isEnabled ? (
              // Success State
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Notifikasi Berhasil Diaktifkan! 🎉
                </h3>
                <p className="text-gray-600 text-sm">
                  Anda akan mendapatkan reminder dan update progress hafalan
                </p>
              </div>
            ) : (
              // Prompt State
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Dapatkan Notifikasi Langsung ke Perangkat Anda
                  </h3>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                      <span>Reminder setoran hafalan harian</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                      <span>Update progress dan pencapaian</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                      <span>Notifikasi dari /examiner</span>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                    <p className="text-amber-800 text-xs">
                      <strong>Catatan:</strong> Setelah memberikan izin, permission akan tersimpan permanen di browser.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={handleEnable}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Bell className="w-5 h-5 mr-2" />
                    )}
                    {isLoading ? 'Mengaktifkan...' : 'Ya, Aktifkan Notifikasi'}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleRemindLater}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Ingatkan Besok
                    </Button>
                    <Button
                      onClick={handleDismiss}
                      variant="ghost"
                      className="flex-1"
                      size="sm"
                    >
                      Jangan Tampilkan Lagi
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
