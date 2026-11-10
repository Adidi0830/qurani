export const defaultLocale = "en" as const;
export const locales = ["id", "en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  id: "Indonesia",
  en: "English",
  ar: "Arabic",
};
