"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { type Locale } from '../../../i18n.config';

interface I18nContextType {
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  changeLocale: (locale: Locale) => void;
  isLoading: boolean;
  dictionary: Record<string, unknown>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  namespaces?: string[];
}

export function I18nProvider({ children, namespaces = ['common'] }: I18nProviderProps) {
  const translation = useTranslation(namespaces);

  return (
    <I18nContext.Provider value={translation}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
