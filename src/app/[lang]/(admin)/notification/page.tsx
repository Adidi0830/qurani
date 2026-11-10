"use client"

import { Notifikasi } from "@/components/admin/notifikasi"
import { useAuth } from "@/hooks"

export default function Page() {

    const { userId, loading } = useAuth()

    if (loading || !userId) return null

    return <Notifikasi userId={userId} />
}