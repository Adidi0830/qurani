/**
 * Order Detail — Format helpers
 *
 * Locale-aware formatting: currency, date, time, relative time, avatar, username.
 * Mengikuti pola features/support/model/format.ts
 */

// ============================================
// Currency
// ============================================

export function formatCurrency(amount: number, locale: string = "id"): string {
    const intlLocale = locale === "en" ? "en-US" : "id-ID" // always IDR, western digits
    return new Intl.NumberFormat(intlLocale, {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

// ============================================
// Date / Time
// ============================================

function toIntlLocale(locale: string): string {
    if (locale === "ar") return "ar-SA"
    if (locale === "en") return "en-US"
    return "id-ID"
}

export function formatDate(
    iso: string | null | undefined,
    locale: string = "id",
    options?: Intl.DateTimeFormatOptions,
): string {
    if (!iso) return "—"
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString(toIntlLocale(locale), options ?? {
        day: "2-digit",
        month: "long",
        year: "numeric",
        numberingSystem: "latn",
    } as any)
}

export function formatDateTime(iso: string | null | undefined, locale: string = "id"): string {
    if (!iso) return "—"
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleString(toIntlLocale(locale), {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        numberingSystem: "latn",
    } as any)
}

export function formatRelativeTime(iso: string | null | undefined, locale: string = "id"): string {
    if (!iso) return "—"
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    const diffMs  = Date.now() - d.getTime()
    const diffMin = Math.floor(diffMs / 60_000)
    if (diffMin < 1)  return locale === "ar" ? "الآن" : locale === "en" ? "Just now" : "Baru saja"
    if (diffMin < 60) return locale === "ar" ? `${diffMin} دقيقة` : locale === "en" ? `${diffMin}m ago` : `${diffMin} menit lalu`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24)   return locale === "ar" ? `${diffH} ساعة` : locale === "en" ? `${diffH}h ago` : `${diffH} jam lalu`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7)    return locale === "ar" ? `${diffD} أيام` : locale === "en" ? `${diffD}d ago` : `${diffD} hari lalu`
    return formatDateTime(iso, locale)
}

// ============================================
// Avatar
// ============================================

export function getAvatarUrl(src: string | null | undefined, name: string, bgColor = "10b981"): string {
    if (src && src.startsWith("http")) return src
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Q")}&background=${bgColor}&color=fff&size=128`
}

// ============================================
// Username
// ============================================

export function deriveUsername(email?: string, name?: string): string {
    if (email?.includes("@")) {
        return "@" + email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "")
    }
    return "@" + (name || "user").toLowerCase().replace(/[^a-z0-9._-]/g, "")
}
