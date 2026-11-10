"use client"

import { use } from "react"
import LanguageDetailView from "@/components/masterdata/language-detail-view"

// Tipe props untuk Next.js 15+ (params adalah Promise)
interface PageProps {
    params: Promise<{ id: string }>
}

export default function LanguageDetailPage({ params }: PageProps) {
    // Unwrap params menggunakan React.use() karena ini adalah Promise di Next.js 15
    const resolvedParams = use(params)
    const id = decodeURIComponent(resolvedParams.id)

    return (
            <LanguageDetailView id={id} />
    )
}
