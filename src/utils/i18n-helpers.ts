import { type Locale } from "../../i18n.config";

// Indonesian month abbreviations
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_ID_UPPERCASE = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

/**
 * Format date to Indonesian format: "18 Des 2025"
 * This is the standard date format for the application
 */
export function formatDateID(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";

  try {
    let dateStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();

    // Handle UTC timestamp from database - append Z if no timezone info
    if (typeof dateInput === 'string' && !dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : "-";

    const day = date.getDate().toString().padStart(2, "0");
    const month = MONTHS_ID[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : "-";
  }
}

/**
 * Format date with time to Indonesian format: "18 Des 2025 14:30"
 */
export function formatDateTimeID(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";

  try {
    let dateStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();

    // Handle UTC timestamp from database - append Z if no timezone info
    if (typeof dateInput === 'string' && !dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : "-";

    const day = date.getDate().toString().padStart(2, "0");
    const month = MONTHS_ID[date.getMonth()];
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");

    return `${day} ${month} ${year} ${hour}:${minute}`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : "-";
  }
}

/**
 * Format date with time to uppercase Indonesian format: "18 DES 2025 14:30"
 */
export function formatDateTimeIDUppercase(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";

  try {
    let dateStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();

    // Handle UTC timestamp from database - append Z if no timezone info
    if (typeof dateInput === 'string' && !dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : "-";

    const day = date.getDate().toString().padStart(2, "0");
    const month = MONTHS_ID_UPPERCASE[date.getMonth()];
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");

    return `${day} ${month} ${year} ${hour}:${minute}`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : "-";
  }
}

/**
 * Get locale-specific date formatting options
 */
export function getDateFormatOptions(
  locale: Locale
): Intl.DateTimeFormatOptions {
  const baseOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  switch (locale) {
    case "en":
      return baseOptions;
    case "id":
      return baseOptions;
    default:
      return baseOptions;
  }
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date, locale: Locale): string {
  const options = getDateFormatOptions(locale);
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format number according to locale
 */
export function formatNumber(number: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(number);
}
