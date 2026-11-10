/**
 * Support — Formatter
 *
 * `resolveTimezone` + `formatDateTime` + `formatRelativeTime` sebelumnya
 * ditulis ulang (identik) di SupportTicketsPage.tsx dan TicketDetailClient.tsx.
 */

import { formatDistanceToNowStrict, parseISO } from "date-fns"
import { enUS, id } from "date-fns/locale"

const PROFILE_STORAGE_KEY = "myqurani_user_profile_v2"

function isValidTimezone(tz: string): boolean {
    try {
        new Intl.DateTimeFormat("en-GB", { timeZone: tz }).format(new Date())
        return true
    } catch {
        return false
    }
}

/**
 * Ambil timezone dari cache profil (localStorage), lalu fallback ke profil auth,
 * lalu ke "UTC". `profileTimezone` opsional supaya bisa dipakai tanpa `useAuth`.
 */
export function resolveTimezone(profileTimezone?: string | null): string {
    let cachedTimezone = ""
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            cachedTimezone = String(parsed?.timezone || "").trim()
        }
    } catch {
        // no-op
    }

    const fromProfile = String(profileTimezone || "").trim()
    const preferred = cachedTimezone || fromProfile
    if (preferred && isValidTimezone(preferred)) return preferred
    if (fromProfile && isValidTimezone(fromProfile)) return fromProfile
    return "UTC"
}

/** Normalisasi string tanggal dari API: "2026-01-01 08:00" → "2026-01-01T08:00Z". */
function normalizeDateString(dateString: string): string {
    let dateStr = dateString.trim()
    if (!dateStr.includes("Z") && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
        if (dateStr.includes(" ") && !dateStr.includes("T")) {
            dateStr = dateStr.replace(" ", "T")
        }
        if (!dateStr.endsWith("Z")) {
            dateStr = dateStr + "Z"
        }
    }
    return dateStr
}

export type DateVariant = "short" | "long" | "relative"

/**
 * Format tanggal sadar timezone.
 * - `short`    → 02 Jan
 * - `long`     → 02 Jan 2026, 08:00 WIB
 * - `relative` → "2 hours ago"
 */
export function formatDate(
    dateString: string | null,
    variant: DateVariant = "long",
    timezone = "UTC",
    locale = "en",
): string {
    if (!dateString) return "-"
    try {
        const date = new Date(normalizeDateString(dateString))
        if (Number.isNaN(date.getTime())) return dateString

        if (variant === "relative") {
            return formatDistanceToNowStrict(date, {
                addSuffix: true,
                locale: locale === "id" ? id : enUS,
            })
        }

        const options: Intl.DateTimeFormatOptions = {
            day: "2-digit",
            month: "short",
            timeZone: timezone,
        }

        if (variant === "long") {
            options.year = "numeric"
            options.hour = "2-digit"
            options.minute = "2-digit"
            options.hour12 = false
            options.timeZoneName = "short"
        }

        return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", options).format(date)
    } catch {
        return dateString
    }
}

/** Versi `formatDate` khusus detail tiket: selalu `en-GB` + timezone viewer's. */
export function formatDateTime(dateString: string | null, timezone = "UTC"): string {
    return formatDate(dateString, "long", timezone, "en")
}

export function formatRelativeTime(dateString: string | null): string {
    if (!dateString) return "-"
    try {
        const date = parseISO(normalizeDateString(dateString))
        if (Number.isNaN(date.getTime())) return dateString
        return formatDistanceToNowStrict(date, { addSuffix: true })
    } catch {
        return dateString
    }
}

const MONTHS_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

/**
 * Parser string murni untuk input `datetime-local` — tanpa `new Date()`, tanpa konversi timezone.
 * "2026-04-20T08:34" → "20 Apr 2026 08:34"
 */
export function formatReminderDateForDisplay(datetimeLocal: string): string {
    const m = datetimeLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (!m) return datetimeLocal
    const [, yr, mo, dy, hr, mn] = m
    const monthName = MONTHS_SHORT_ID[parseInt(mo, 10) - 1] ?? mo
    return `${dy} ${monthName} ${yr} ${hr}:${mn}`
}

export function toIsoDate(d: Date): string {
    return d.toISOString().split("T")[0]
}