'use client';

import { useEffect } from 'react';
import { useAutoNotificationPrompt } from '@/hooks/useAutoNotificationPrompt';
import AutoNotificationPrompt from '@/components/AutoNotificationPrompt';

export default function SmartNotificationTrigger({ 
  userId, 
  context = 'dashboard', // 'dashboard', 'setoran', 'profile', 'success'
  triggerConditions = {}
}) {
  const {
    shouldShowPrompt,
    handlePromptAction,
    triggerPrompt,
    setPromptConfig
  } = useAutoNotificationPrompt(userId);

  useEffect(() => {
    // Configure prompt based on context
    const config = getContextConfig(context, triggerConditions);
    setPromptConfig(config);

    // Trigger prompt based on context
    handleContextTrigger(context, config);
  }, [context, userId]);

  const getContextConfig = (context, conditions) => {
    const baseConfig = {
      trigger: context,
      delay: 3000,
      conditions: {
        minVisits: 1,
        minDaysSinceSignup: 0,
        afterSuccessfulSetoran: false,
        ...conditions
      }
    };

    switch (context) {
      case 'dashboard':
        return {
          ...baseConfig,
          delay: 5000, // Delay lebih lama di dashboard
          conditions: {
            ...baseConfig.conditions,
            minVisits: 2 // Minimal 2x visit dashboard
          }
        };

      case 'setoran':
        return {
          ...baseConfig,
          delay: 2000, // Delay lebih cepat saat akan setoran
          conditions: {
            ...baseConfig.conditions,
            minVisits: 1,
            contextRelevant: true // Sangat relevan saat mau setoran
          }
        };

      case 'success':
        return {
          ...baseConfig,
          delay: 1000, // Prompt cepat setelah sukses
          conditions: {
            ...baseConfig.conditions,
            afterSuccessfulSetoran: true,
            minVisits: 1
          }
        };

      case 'profile':
        return {
          ...baseConfig,
          delay: 8000, // Delay lebih lama di profile
          conditions: {
            ...baseConfig.conditions,
            minVisits: 3 // User sudah familiar dengan app
          }
        };

      default:
        return baseConfig;
    }
  };

  const handleContextTrigger = (context, config) => {
    switch (context) {
      case 'dashboard':
        // Trigger setelah user idle sebentar di dashboard
        const idleTimer = setTimeout(() => {
          triggerPrompt('dashboard', config.delay);
        }, 10000); // 10 detik idle

        return () => clearTimeout(idleTimer);

      case 'setoran':
        // Trigger saat user akan mulai setoran
        triggerPrompt('setoran', config.delay);
        break;

      case 'success':
        // Trigger setelah aksi sukses (setoran berhasil, dll)
        triggerPrompt('success', config.delay);
        break;

      case 'profile':
        // Trigger saat user di profile (lebih gentle)
        triggerPrompt('profile', config.delay);
        break;

      default:
        triggerPrompt('default', config.delay);
    }
  };

  return (
    <>
      {shouldShowPrompt && (
        <AutoNotificationPrompt
          userId={userId}
          onClose={() => handlePromptAction('closed')}
          onEnable={() => handlePromptAction('enabled')}
          onDismiss={() => handlePromptAction('dismissed')}
          onRemindLater={() => handlePromptAction('remindLater')}
          context={context}
        />
      )}
    </>
  );
}

// Hook untuk trigger manual dari komponen lain
export function useNotificationTrigger(userId) {
  const { triggerPrompt, handlePromptAction } = useAutoNotificationPrompt(userId);

  const triggerAfterSuccess = (delay = 2000) => {
    // Trigger setelah user berhasil melakukan aksi penting
    localStorage.setItem('recentSuccessfulSetoran', Date.now().toString());
    triggerPrompt('afterSuccess', delay);
  };

  const triggerOnImportantAction = (action, delay = 3000) => {
    // Trigger berdasarkan aksi penting user
    const triggers = {
      'firstSetoran': () => triggerPrompt('firstSetoran', delay),
      'weeklyStreak': () => triggerPrompt('weeklyStreak', delay),
      'monthlyGoal': () => triggerPrompt('monthlyGoal', delay),
      'profileComplete': () => triggerPrompt('profileComplete', delay)
    };

    if (triggers[action]) {
      triggers[action]();
    }
  };

  return {
    triggerAfterSuccess,
    triggerOnImportantAction,
    triggerManual: (delay = 0) => triggerPrompt('manual', delay)
  };
}
