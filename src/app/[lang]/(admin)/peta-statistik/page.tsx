"use client"

import dynamic from 'next/dynamic';
import React from 'react'

export default function StatisticMapPage() {
    const MapForm = dynamic(() => import("@/components/ui/mapForm"), { ssr: false });

    return (
        <MapForm />
    )
}
