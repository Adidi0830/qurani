export function resolveUserTimezone(): string {
    const isValidTimezone = (tz: string) => {
        try {
            new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date())
            return true
        } catch {
            return false
        }
    }

    let cachedTimezone = ""
    try {
        if (typeof window !== 'undefined') {
            const raw = localStorage.getItem('myqurani_user_profile_v2')
            if (raw) {
                const parsed = JSON.parse(raw)
                cachedTimezone = (parsed?.timezone || "").trim()
            }
        }
    } catch {
        // no-op
    }

    if (cachedTimezone && isValidTimezone(cachedTimezone)) return cachedTimezone

    // Fallback ke browser timezone (e.g. "Asia/Makassar") sebelum "UTC"
    try {
        if (typeof window !== 'undefined') {
            const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
            if (browserTz) return browserTz
        }
    } catch {
        // no-op
    }
    return "UTC"
}

export function formatTooltipDate(dateInput: Date | string | null | undefined): string {
    if (!dateInput) return ""
    try {
        let date: Date;
        if (dateInput instanceof Date) {
            date = dateInput
        } else {
            let dateStr = String(dateInput).trim()
            if (!dateStr.includes('Z') && !dateStr.includes('+')) {
                if (dateStr.includes(' ')) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z'
                } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
                    dateStr = dateStr + ':00Z'
                }
            }
            date = new Date(dateStr)
        }
        
        if (Number.isNaN(date.getTime())) return ""

        const tz = resolveUserTimezone()

        // Generate format like "21 Jun 2026, 16.18 WIB (Asia/Jakarta)"
        // Note: Intl doesn't easily allow dot as time separator, so we replace colon with dot
        const formatter = new Intl.DateTimeFormat('en-GB', {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: tz,
            timeZoneName: "short",
        })
        
        let formatted = formatter.format(date)
        
        // "21 Jun 2026, 16:18 GMT+7" -> "21 Jun 2026, 16.18 GMT+7"
        // Replace the first colon that appears between numbers
        formatted = formatted.replace(/(\d{2}):(\d{2})/, "$1.$2")

        return `${formatted} (${tz})`
    } catch {
        return ""
    }
}

import { formatDistanceToNow } from 'date-fns'
import { enUS, id as idLocale } from 'date-fns/locale'

export function formatTimeAgo(dateInput: Date | string | null | undefined, localeStr = 'en'): string {
    if (!dateInput) return ""
    try {
        let date: Date;
        if (dateInput instanceof Date) {
            date = dateInput
        } else {
            let dateStr = String(dateInput).trim()
            if (!dateStr.includes('Z') && !dateStr.includes('+')) {
                if (dateStr.includes(' ')) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z'
                } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
                    dateStr = dateStr + ':00Z'
                }
            }
            date = new Date(dateStr)
        }
        
        if (Number.isNaN(date.getTime())) return ""

        return formatDistanceToNow(date, { 
            addSuffix: true,
            locale: localeStr === 'id' ? idLocale : enUS
        })
    } catch {
        return ""
    }
}

export function formatDateShort(dateInput: Date | string | null | undefined, localeStr = 'id-ID'): string {
    if (!dateInput) return "-";
    let d: Date;
    if (dateInput instanceof Date) {
        d = dateInput;
    } else {
        d = new Date(String(dateInput));
    }
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(localeStr, { day: "2-digit", month: "short", year: "numeric" });
}
