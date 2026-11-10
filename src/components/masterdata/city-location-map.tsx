"use client"

import { useEffect, useRef } from "react"

interface CityLocationMapProps {
    latitude: number
    longitude: number
    cityName: string
    countryEmoji?: string
}

/**
 * Leaflet map component showing a single city marker pin.
 * Uses dynamic import so Leaflet (which needs window) is only loaded client-side.
 * Height is fixed at 300px to match the design in gambar 2.
 */
export function CityLocationMap({
    latitude,
    longitude,
    cityName,
    countryEmoji,
}: CityLocationMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<import("leaflet").Map | null>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        if (!mapContainerRef.current) return
        // Prevent double-init
        if (mapRef.current) return

        // Dynamically import leaflet so it's not bundled server-side
        import("leaflet").then((L) => {
            // Fix default icon paths broken by webpack
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl
            L.Icon.Default.mergeOptions({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            })

            const map = L.map(mapContainerRef.current!, {
                center: [latitude, longitude],
                zoom: 12,
                zoomControl: true,
                scrollWheelZoom: false,    // avoid accidental scroll-zoom on page
                attributionControl: true,
            })

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map)

            // Custom popup content
            const popupHtml = `
                <div style="text-align:center;padding:4px 8px;min-width:120px;">
                    <div style="font-size:20px;margin-bottom:4px;">${countryEmoji || "📍"}</div>
                    <div style="font-weight:600;font-size:13px;color:#1a1a1a;">${cityName}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">
                        ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
                    </div>
                </div>
            `

            L.marker([latitude, longitude])
                .addTo(map)
                .bindPopup(popupHtml, { maxWidth: 200 })
                .openPopup()

            mapRef.current = map
        })

        return () => {
            // Cleanup on unmount
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
        // Only run once when coordinates are stable
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div
            ref={mapContainerRef}
            style={{ height: 300, width: "100%", borderRadius: "inherit" }}
            className="z-0"
        />
    )
}
