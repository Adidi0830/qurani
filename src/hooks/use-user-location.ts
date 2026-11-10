import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { createClient } from "@/utils/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CityData } from "@/types/cities";

interface UserLocation {
  cityId: number | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function useUserLocation() {
  const { userId } = useAuth();
  const [userLocation, setUserLocation] = useState<UserLocation>({
    cityId: null,
    cityName: null,
    latitude: null,
    longitude: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();

        // Get user profile with city_id
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("cityId")
          .eq("id", userId)
          .single();

        if (profileError || !profile?.cityId) {
          console.log("No city_id found in user profile");
          setLoading(false);
          return;
        }

        // Get city coordinates
        const { data: city, error: cityError } = await supabase
          .from("cities")
          .select("id, name, latitude, longitude")
          .eq("id", profile.cityId)
          .single();

        if (cityError || !city) {
          console.log("City not found:", cityError);
          setLoading(false);
          return;
        }

        setUserLocation({
          cityId: city.id,
          cityName: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
        });
      } catch (error) {
        console.error("Error fetching user location:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLocation();
  }, [userId]);

  return { userLocation, loading };
}
