"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Halaman ini dipindahkan ke /teachers/applications
export default function RedirectPage() {
    const router = useRouter()
    useEffect(() => {
        router.replace("/teachers/applications")
    }, [router])
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
    )
}
