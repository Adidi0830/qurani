"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { locales, type Locale } from '../../../i18n.config';
import { useI18n } from '@/components/providers/i18n-provider';
import ReactCountryFlag from 'react-country-flag';

// Mapping kode negara untuk react-country-flag
const localeCountryCodes: Record<Locale, string> = {
  id: 'ID', // Indonesia
  en: 'US', // United States untuk English
  ar: 'SA', // Saudi Arabia untuk Arabic
};

// Mapping kode singkat untuk tampilan
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const localeCodes: Record<Locale, string> = {
  id: 'ID',
  en: 'EN',
  ar: 'AR',
};

// Mapping kode singkat untuk tampilan
const getCountryNameFromLocale: Record<Locale, string> = {
  id: 'Indonesia',
  en: 'English',
  ar: 'Arabic',
};

export function LanguageSwitcher() {
  const { locale, changeLocale } = useI18n();

  const handleLocaleChange = (newLocale: string) => {
    changeLocale(newLocale as Locale);
  };

  return (
    <Select value={locale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="">
        <SelectValue>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200">
              <ReactCountryFlag
                countryCode={localeCountryCodes[locale]}
                svg
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
            <span className="font-semibold text-sm dark:text-white font-inter text-gray-700">{getCountryNameFromLocale[locale]}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200">
                <ReactCountryFlag
                  countryCode={localeCountryCodes[loc]}
                  svg
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
              <span className="font-semibold dark:text-white text-sm font-inter text-gray-700">{getCountryNameFromLocale[loc]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
