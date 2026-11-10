interface CityData {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  state_id?: number;
  timezone: string;
}

export type { CityData };
