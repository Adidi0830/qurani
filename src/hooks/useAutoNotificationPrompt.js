'use client';

import { useState, useEffect } from 'react';

export function useAutoNotificationPrompt(userId) {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [promptConfig, setPromptConfig] = useState({
    trigger: 'onLogin', // 'onLogin', 'onDashboard', 'onSetoran', 'delayed'
    delay: 3000, // ms
    conditions: {
      minVisits: 1,
      minDaysSinceSignup: 0,
      afterSuccessfulSetoran: false
    }
  });

  useEffect(() => {
    if (userId) {
      checkPromptConditions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Helper function untuk deteksi mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  };

  const checkPromptConditions = async () => {
    try {
      // 1. Cek browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return;
      }

      // 2. Cek permission status
      const permission = Notification.permission;
      if (permission !== 'default') {
        return; // Sudah granted atau denied
      }

      // 3. Untuk mobile device, jangan auto-show prompt
      // Karena mobile browser memerlukan user gesture
      const isMobile = isMobileDevice();
      if (isMobile) {
        // Set flag bahwa prompt tersedia tapi tidak auto-show
        const promptData = getPromptData();
        promptData.availableForMobile = true;
        savePromptData(promptData);
        return;
      }

      // 4. Cek apakah sudah subscribe
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        return; // Sudah subscribe
      }

      // 5. Cek localStorage conditions
      const promptData = getPromptData();
      
      // Jika user sudah dismiss permanently
      if (promptData.dismissedPermanently) {
        return;
      }

      // Jika baru dismiss dan belum saatnya muncul lagi
      if (promptData.lastDismissed && !shouldShowAgain(promptData.lastDismissed)) {
        return;
      }

      // 6. Cek kondisi tambahan
      if (!(await checkAdditionalConditions(promptData))) {
        return;
      }

      // 7. Semua kondisi terpenuhi, show prompt (hanya untuk desktop)
      setShouldShowPrompt(true);

    } catch (error) {
      console.error('Error checking prompt conditions:', error);
    }
  };

  const getPromptData = () => {
    const data = localStorage.getItem('notificationPromptData');
    return data ? JSON.parse(data) : {
      dismissedPermanently: false,
      lastDismissed: null,
      dismissCount: 0,
      firstShown: null,
      visitCount: 0
    };
  };

  const savePromptData = (data) => {
    localStorage.setItem('notificationPromptData', JSON.stringify(data));
  };

  const shouldShowAgain = (lastDismissed) => {
    const now = Date.now();
    const timeDiff = now - lastDismissed;
    
    const promptData = getPromptData();
    
    // Progressive delay: semakin sering dismiss, semakin lama delay
    const delays = [
      1 * 24 * 60 * 60 * 1000,  // 1 hari
      3 * 24 * 60 * 60 * 1000,  // 3 hari  
      7 * 24 * 60 * 60 * 1000,  // 1 minggu
      30 * 24 * 60 * 60 * 1000  // 1 bulan
    ];
    
    const delayIndex = Math.min(promptData.dismissCount, delays.length - 1);
    const requiredDelay = delays[delayIndex];
    
    return timeDiff >= requiredDelay;
  };

  const checkAdditionalConditions = async (promptData) => {
    // Increment visit count
    promptData.visitCount = (promptData.visitCount || 0) + 1;
    savePromptData(promptData);

    // Cek minimum visits
    if (promptData.visitCount < promptConfig.conditions.minVisits) {
      return false;
    }

    // Cek minimum days since signup (jika ada data user)
    if (promptConfig.conditions.minDaysSinceSignup > 0) {
      // Implementasi sesuai struktur user data Anda
      // const daysSinceSignup = calculateDaysSinceSignup(user);
      // if (daysSinceSignup < promptConfig.conditions.minDaysSinceSignup) {
      //   return false;
      // }
    }

    // Cek kondisi setelah setoran sukses
    if (promptConfig.conditions.afterSuccessfulSetoran) {
      const hasRecentSetoran = localStorage.getItem('recentSuccessfulSetoran');
      if (!hasRecentSetoran) {
        return false;
      }
    }

    return true;
  };

  const handlePromptAction = (action) => {
    const promptData = getPromptData();
    const now = Date.now();

    switch (action) {
      case 'enabled':
        // User enabled notifications
        promptData.enabled = true;
        promptData.enabledAt = now;
        break;
        
      case 'dismissed':
        // User dismissed (Jangan Tampilkan Lagi)
        promptData.dismissedPermanently = true;
        promptData.lastDismissed = now;
        break;
        
      case 'remindLater':
        // User chose remind later
        promptData.lastDismissed = now;
        promptData.dismissCount = (promptData.dismissCount || 0) + 1;
        break;
        
      case 'closed':
        // User just closed without action
        promptData.lastClosed = now;
        break;
    }

    savePromptData(promptData);
    setShouldShowPrompt(false);
  };

  const triggerPrompt = (delay = 0) => {
    setTimeout(() => {
      checkPromptConditions();
    }, delay);
  };

  // Khusus untuk mobile - trigger manual dengan user gesture
  const triggerMobilePrompt = async () => {
    try {
      // 1. Cek browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return { success: false, error: 'Browser tidak mendukung notifikasi' };
      }

      // 2. Cek permission status
      const permission = Notification.permission;
      if (permission !== 'default') {
        return { success: false, error: 'Permission sudah di-set sebelumnya' };
      }

      // 3. Cek service worker registration (dengan timeout)
      try {
        // Register service worker jika belum ada
        try {
          await navigator.serviceWorker.register('/swPushNotification.js');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (swError) {
          // Continue anyway, mungkin sudah ter-register
        }

        // Check existing subscription dengan timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Service worker timeout')), 3000);
        });

        const subscriptionPromise = navigator.serviceWorker.ready.then(reg => 
          reg.pushManager.getSubscription()
        );

        const subscription = await Promise.race([subscriptionPromise, timeoutPromise]);
        
        if (subscription) {
          return { success: false, error: 'Sudah berlangganan notifikasi' };
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (swError) {
        // Continue anyway - registerPush akan handle service worker registration
      }

      // 4. Set flag untuk menampilkan prompt
      setShouldShowPrompt(true);
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Check apakah notification tersedia untuk mobile
  const isNotificationAvailableForMobile = () => {
    const isMobile = isMobileDevice();
    if (!isMobile) return false;

    const promptData = getPromptData();
    return promptData.availableForMobile && 
           !promptData.dismissedPermanently && 
           Notification.permission === 'default';
  };

  const resetPromptData = () => {
    localStorage.removeItem('notificationPromptData');
    setShouldShowPrompt(false);
  };

  return {
    shouldShowPrompt,
    promptConfig,
    setPromptConfig,
    handlePromptAction,
    triggerPrompt,
    triggerMobilePrompt,
    resetPromptData,
    getPromptData: () => getPromptData(),
    isMobileDevice,
    isNotificationAvailableForMobile
  };
}
