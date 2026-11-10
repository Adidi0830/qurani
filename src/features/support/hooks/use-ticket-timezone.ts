"use client"

import { useEffect, useState } from "react"

import { resolveTimezone } from "../model/format"

/**
 * Timezone aktif untuk format tanggal.
 * Sumber: cache profil di localStorage, lalu `profile.timezone`, lalu "UTC".
 * Nilai di-resolve setelah mount agar tidak ada mismatch antara SSR & client.
 */
export function useTicketTimezone(profileTimezone?: string | null): string {
    const [timezone, setTimezone] = useState("UTC")

    useEffect(() => {
        setTimezone(resolveTimezone(profileTimezone))
    }, [profileTimezone])

    return timezone
}