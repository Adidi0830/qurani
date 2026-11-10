"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import { fetchCitiesWithRecapData, CityData, fetchCitiesWithUserData } from "@/utils/api/city/fetch";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ArrowLeft, BookOpen, UserRound, UsersRound } from "lucide-react";
import L from "leaflet";
import { MonthRecap } from "@/types/recap";
import { useUserLocation } from "@/hooks/use-user-location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAllMonthRecap } from "@/utils/api/recaps/fetch";
import { I18nProvider, useI18n } from "../providers/i18n-provider";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";



// Atur default icon agar tidak error
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png",
});

// Fungsi untuk membuat custom icon berdasarkan total recap
const createCustomIcon = (totalRecap: number) => {
  const getColor = (count: number) => {
    if (count >= 100) return '#dc2626'; // Red for high activity
    if (count >= 50) return '#ea580c'; // Orange for medium-high activity
    if (count >= 20) return '#d97706'; // Yellow for medium activity
    if (count >= 10) return '#65a30d'; // Light green for low-medium activity
    return '#16a34a'; // Green for low activity
  };

  const getSize = (count: number) => {
    if (count >= 100) return 33;
    if (count >= 50) return 27;
    if (count >= 20) return 25;
    if (count >= 10) return 20;
    return 15;
  };

  const color = getColor(totalRecap);
  const size = getSize(totalRecap);

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size > 20 ? '10px' : '8px'};
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${totalRecap}
      </div>
    `,
    className: 'custom-recap-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};


// Komponen untuk mengatur view berdasarkan lokasi user
function IndonesiaView() {
  const map = useMap();
  const { userLocation, loading } = useUserLocation();

  useEffect(() => {
    // Check if map is valid before setting up
    if (!map || !map.getContainer) {
      console.warn('Map not ready, skipping initialization');
      return;
    }

    // Wait for user location to load
    if (loading) {
      return;
    }

    // Set view berdasarkan lokasi user atau default Indonesia
    if (userLocation.latitude && userLocation.longitude) {
      // Jika user memiliki lokasi, set view ke lokasi user dengan zoom yang lebih dekat
      map.setView([userLocation.latitude, userLocation.longitude], 8.5);
      console.log('Map centered on user location:', userLocation.cityName);
    } else {
      // Jika tidak ada lokasi user, set view ke Indonesia dengan koordinat yang lebih tepat
      map.setView([-0.7893, 113.9213], 4.5);
      console.log('Map centered on Indonesia (default)');
    }

    // Force map resize and invalidate size to ensure proper rendering
    const resizeMap = () => {
      setTimeout(() => {
        // Check if map is still valid before invalidating size
        if (map && map.getContainer && map.getContainer()) {
          try {
            map.invalidateSize();
          } catch (error) {
            console.warn('Error invalidating map size:', error);
          }
        }
      }, 100);
    };

    // Initial resize
    resizeMap();

    // Listen for window resize events
    window.addEventListener('resize', resizeMap);

    // Handle tile loading errors
    map.on('tileerror', (e: L.TileErrorEvent) => {
      console.warn('Tile loading error, attempting to reload:', e);
      // Retry loading after a short delay
      setTimeout(() => {
        if (map && map.getContainer && map.getContainer()) {
          try {
            map.invalidateSize();
          } catch (error) {
            console.warn('Error invalidating map size in tile error handler:', error);
          }
        }
      }, 1000);
    });

    return () => {
      window.removeEventListener('resize', resizeMap);
      // Clean up map event listeners
      if (map && map.off) {
        map.off('tileerror');
      }
    };
  }, [map, userLocation, loading]);

  return null;
}

// Komponen untuk menampilkan markers kota dengan data recap
function CityRecapMarkers(
  { selectedMonthRecap, viewMode, onLoadingChange }: 
  { selectedMonthRecap: MonthRecap | "all", viewMode: string, onLoadingChange?: (isLoading: boolean) => void }
) {
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n()

  useEffect(() => {
    const loadCities = async () => {
      setLoading(true);
      onLoadingChange?.(true);
      try {
        const resultRecaps = await fetchCitiesWithRecapData(selectedMonthRecap);
        const resultUsers = await fetchCitiesWithUserData(selectedMonthRecap);
        // console.log(result.data);
        // console.log("user", result2.data);

        if (viewMode === "recitation") {
          if (resultRecaps.success && resultRecaps.data) {
            setCities(resultRecaps.data);
          }
        } else {
          if (resultUsers.success && resultUsers.data) {
            setCities(resultUsers.data);
          }

        }
      } catch (error) {
        console.error("Error loading cities with recap data:", error);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };
    loadCities();
  }, [selectedMonthRecap, viewMode, onLoadingChange]);

  if (loading) return null;

  return (
    <>
      {cities.map((city, index) => (
        <Marker
          key={index}
          position={[city?.latitude || 0, city?.longitude || 0]}
          icon={createCustomIcon(city.total || 0)}
        >
          <Popup>
            <div className="text-center">
              <h3 className="font-bold text-lg">{city.name || t("recitation.map.unknown_city", "Unknown City")}</h3>
              <p className="text-sm text-gray-600">
                Total {t(`recitation.tab.${viewMode}`)}: <span className="font-semibold text-blue-600">{city.total || 0}</span>
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function MapForm() {
  const { userLocation, loading: userLocationLoading } = useUserLocation();
  const [monthRecap, setMonthRecap] = useState<MonthRecap[]>([])
  const [selectedMonthRecap, setSelectedMonthRecap] = useState<MonthRecap | "all">("all")
  const [viewMode, setViewMode] = useState<"recitation" | "user">("recitation")
  const [markersLoading, setMarkersLoading] = useState(true)
  const { t } = useI18n()
  const router = useRouter()

  useEffect(() => {
    const loadMonthRecap = async () => {
      const result = await getAllMonthRecap();
      if (result?.success && result?.data) {
        setMonthRecap(result.data);
      }
    };
    loadMonthRecap();
  }, [])


  // Determine map center based on user location
  const getMapCenter = () => {
    if (!userLocationLoading && userLocation.latitude && userLocation.longitude) {
      return [userLocation.latitude, userLocation.longitude] as [number, number];
    }
    return [-0.7893, 113.9213] as [number, number]; // Default Indonesia center
  };

  const getMapZoom = () => {
    if (!userLocationLoading && userLocation.latitude && userLocation.longitude) {
      return 8; // Closer zoom for user location
    }
    return 4.5; // Default zoom for Indonesia
  };


  // Helper function to get select value
  const getSelectValue = () => {
    return typeof selectedMonthRecap === 'string'
      ? selectedMonthRecap
      : selectedMonthRecap?.value || "all";
  };

  // Helper function to handle month selection
  const handleMonthChange = (value: string) => {
    const newSelection = value === "all"
      ? "all"
      : monthRecap.find(m => m.value === value) || "all";
    setSelectedMonthRecap(newSelection);
  };

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header Section */}
      <header className="flex justify-between items-center p-2 sm:p-4 shadow-sm border-b border-gray-200 dark:border-gray-700">
        {/* Back Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 sm:p-2 rounded-lg transition-all duration-300"
          >
            <ArrowLeft className="text-gray-600 dark:text-gray-400 w-5 h-5 md:h-6 md:w-6" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {t('recitation.interactive_map')}
            </h1>
          </div>
        </div>

        {/* Title Section */}
        {/* <div className="flex items-center gap-3">
          <div className="text-center">
            <h1 className=" sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
              {t('recitation.interactive_map')}
            </h1>
          </div>
        </div> */}

        {/* Month Filter */}
        <div className="min-w-0 flex gap-2 items-center">
          <div className="flex gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 w-full sm:max-w-fit">
            {/* Buttons */}
            <button
              onClick={() => setViewMode("recitation")}
              className={`flex-1 px-4 py-1 text-sm rounded-md transition-all duration-300 ease-out font-medium transform hover:scale-105 active:scale-95 whitespace-nowrap min-w-max cursor-pointer ${viewMode === "recitation"
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-700/50"
                }`}
            >
              <span className="flex items-center justify-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:block">
                  {t("recitation.tab.recitation")}
                </span>
              </span>
            </button>
            <button
              onClick={() => setViewMode("user")}
              className={`flex-1 px-4 text-sm rounded-md transition-all duration-300 ease-out font-medium transform hover:scale-105 active:scale-95 whitespace-nowrap min-w-max cursor-pointer ${viewMode === "user"
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-700/50"
                }`}
            >
              <span className="flex items-center justify-center gap-1">
                <UsersRound className="w-4 h-4" />
                <span className="hidden sm:block">
                  {t("recitation.tab.user")}
                </span>
              </span>
            </button>
          </div>
          <Select
            value={getSelectValue()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-auto sm:w-40">
              <SelectValue placeholder={t("recitation.search.select_month", "Select Month")} />
            </SelectTrigger>
            <SelectContent className="z-[99999]">
              <SelectItem value="all">
                <span className="font-medium">{t('recitation.search.all', 'All')}</span>
              </SelectItem>
              {monthRecap.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Map Container */}
      <main className="flex-1 relative">
        <MapContainer
          center={getMapCenter()}
          zoom={getMapZoom()}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
          preferCanvas={true}
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            maxZoom={18}
            tileSize={256}
            zoomOffset={0}
            crossOrigin={true}
            errorTileUrl="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Map View Controller */}
          <IndonesiaView />

          {/* City Markers with Recap Data */}
          <CityRecapMarkers
            selectedMonthRecap={selectedMonthRecap || "all"}
            viewMode={viewMode}
            onLoadingChange={setMarkersLoading}
          />
        </MapContainer>

        {markersLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("recitation.loading.preparing", "Loading data...")}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MapFormPage() {
  return (
    <I18nProvider namespaces={[
      'common',
      'dashboard'
    ]}>
      <MapForm />
    </I18nProvider>
  )
}
