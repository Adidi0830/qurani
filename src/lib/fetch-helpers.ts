import { CityData } from './api'

/**
 * Mengambil semua cities dengan metode "Proxy Bundle".
 * Komponen memanggil endpoint lokal (kita sendiri), lalu server kita yang
 * melakukan multiple fetching ke backend aslinya.
 * 
 * Hasil di browser: Hanya 1 Request (Network Tab bersih).
 */
export async function fetchAllCitiesByCountry(
    countryId: number,
    onProgress?: (data: CityData[]) => void,
    signal?: AbortSignal
): Promise<CityData[]> {
    try {
        const response = await fetch('/api/masterdata/cities', {
            method: 'POST',
            body: JSON.stringify({ countryId }),
            headers: { 'Content-Type': 'application/json' },
            signal
        });

        if (!response.ok) throw new Error("Failed to fetch cities bundle");

        const json = await response.json();
        if (json.success && json.data) {
            if (onProgress) onProgress(json.data);
            return json.data;
        }
        return [];
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err
        console.error("Error in fetchAllCitiesByCountry proxy:", err);
        return [];
    }
}

/**
 * Proxy Bundle untuk State Cities.
 */
export async function fetchAllCitiesByState(
    stateId: number,
    onProgress?: (data: CityData[]) => void,
    signal?: AbortSignal
): Promise<CityData[]> {
    try {
        const response = await fetch('/api/masterdata/cities', {
            method: 'POST',
            body: JSON.stringify({ stateId }),
            headers: { 'Content-Type': 'application/json' },
            signal
        });

        if (!response.ok) throw new Error("Failed to fetch cities bundle");

        const json = await response.json();
        if (json.success && json.data) {
            if (onProgress) onProgress(json.data);
            return json.data;
        }
        return [];
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err
        console.error("Error in fetchAllCitiesByState proxy:", err);
        return [];
    }
}
