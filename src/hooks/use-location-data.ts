"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchStates } from "@/utils/api/states/fetch";
import { fetchCities } from "@/utils/api/city/fetch";
import { fetchCountries } from "@/utils/api/countries/fetch";
import { CityData } from "@/types/cities";
import { ProvinceData } from "@/types/provinces";
import { CountryData } from "@/types/countries";

type CountrySelection = {
  id: number;
  name: string;
  iso2?: string;
};

type StateSelection = {
  id: number;
  name: string;
};

type CitySelection = {
  id: number;
  name: string;
  timezone: string;
};

type TimezoneRow = {
  id: string;
  code: string;
  name: string;
  countryCode?: string;
  countryName?: string;
  stateName?: string;
  cityName?: string;
  offset?: string;
};

const EMPTY_COUNTRY: CountrySelection = { id: 0, name: "", iso2: "" };
const EMPTY_STATE: StateSelection = { id: 0, name: "" };
const EMPTY_CITY: CitySelection = { id: 0, name: "", timezone: "" };

const normalize = (v: string | undefined | null) => (v || "").trim().toLowerCase();

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function resolveIndonesiaTimezone(stateName: string, cityName: string): string {
  const s = normalize(stateName);
  const c = normalize(cityName);
  const combined = `${s} ${c}`;

  // WIT (UTC+9)
  if (
    combined.includes("papua") ||
    combined.includes("maluku")
  ) {
    return "Asia/Jayapura";
  }

  // WITA (UTC+8)
  if (
    combined.includes("bali") ||
    combined.includes("nusa tenggara") ||
    combined.includes("sulawesi") ||
    combined.includes("kalimantan timur") ||
    combined.includes("kalimantan selatan") ||
    combined.includes("kalimantan utara")
  ) {
    return "Asia/Makassar";
  }

  // WIB (UTC+7)
  return "Asia/Jakarta";
}

export function useLocationData(enabled: boolean = true) {
  const [states, setStates] = useState<ProvinceData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [openState, setOpenState] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const [openCountry, setOpenCountry] = useState(false);

  const [currentState, setCurrentState] = useState<StateSelection>(EMPTY_STATE);
  const [currentCity, setCurrentCity] = useState<CitySelection>(EMPTY_CITY);
  const [currentCountry, setCurrentCountry] = useState<CountrySelection>(EMPTY_COUNTRY);

  const [selectedStateState, setSelectedStateState] = useState<StateSelection>(EMPTY_STATE);
  const [selectedCityState, setSelectedCityState] = useState<CitySelection>(EMPTY_CITY);
  const [selectedCountryState, setSelectedCountryState] = useState<CountrySelection>(EMPTY_COUNTRY);

  const [resolvedTimezone, setResolvedTimezone] = useState("");
  const [isResolvingTimezone, setIsResolvingTimezone] = useState(false);
  const [countryTimezoneCodes, setCountryTimezoneCodes] = useState<string[]>([]);

  const countriesLoadedRef = useRef(false);

  const setSelectedCountry = useCallback((country: CountrySelection) => {
    setSelectedCountryState(country);
    setSelectedStateState(EMPTY_STATE);
    setSelectedCityState(EMPTY_CITY);
    setResolvedTimezone("");
  }, []);

  const setSelectedState = useCallback((state: StateSelection) => {
    setSelectedStateState(state);
    setSelectedCityState(EMPTY_CITY);
    setResolvedTimezone("");
  }, []);

  const setSelectedCity = useCallback((city: CitySelection) => {
    setSelectedCityState(city);
  }, []);

  const isCountryTouched = selectedCountryState.id !== 0;
  const isStateTouched = selectedStateState.id !== 0;

  const effectiveCountry =
    selectedCountryState.id !== 0 ? selectedCountryState : currentCountry;
  const effectiveCountryId = effectiveCountry.id || 0;

  const effectiveState =
    isStateTouched
      ? selectedStateState
      : isCountryTouched
        ? EMPTY_STATE
        : currentState;
  const effectiveStateId = effectiveState.id || 0;

  const effectiveCity =
    selectedCityState.id !== 0
      ? selectedCityState
      : isCountryTouched || isStateTouched
        ? EMPTY_CITY
        : currentCity;

  const timezoneApi = useCallback(
    async (params: Record<string, string>) => {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`/api/masterdata/timezones?${query}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) return [] as TimezoneRow[];
      const json = await res.json();
      if (!json?.success || !Array.isArray(json.data)) return [] as TimezoneRow[];
      return json.data as TimezoneRow[];
    },
    []
  );

  useEffect(() => {
    if (!enabled || countriesLoadedRef.current) return;

    const cached = localStorage.getItem("countries_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCountries(parsed);
          countriesLoadedRef.current = true;
          return;
        }
        localStorage.removeItem("countries_cache");
      } catch {
        localStorage.removeItem("countries_cache");
      }
    }

    const load = async () => {
      countriesLoadedRef.current = true;
      const result = await fetchCountries();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setCountries(result.data);
        localStorage.setItem("countries_cache", JSON.stringify(result.data));
      } else {
        countriesLoadedRef.current = false;
      }
    };

    load();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setStates([]);
      return;
    }

    if (!effectiveCountryId) {
      setStates([]);
      return;
    }

    const cacheKey = `states_cache_${effectiveCountryId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStates(parsed);
          return;
        }
        localStorage.removeItem(cacheKey);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    const load = async () => {
      const result = await fetchStates(effectiveCountryId);
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setStates(result.data);
        localStorage.setItem(cacheKey, JSON.stringify(result.data));
      } else {
        setStates([]);
      }
    };

    load();
  }, [enabled, effectiveCountryId]);

  useEffect(() => {
    if (!enabled) return;

    if (!effectiveStateId) {
      setCities([]);
      return;
    }

    const cacheKey = `cities_cache_${effectiveStateId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCities(parsed);
          return;
        }
        localStorage.removeItem(cacheKey);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    const load = async () => {
      const result = await fetchCities(effectiveStateId);
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setCities(result.data);
        localStorage.setItem(cacheKey, JSON.stringify(result.data));
      } else {
        setCities([]);
      }
    };

    load();
  }, [enabled, effectiveStateId]);

  useEffect(() => {
    if (currentCity.id === 0 || cities.length === 0) return;
    const found = cities.find((city) => city.id === currentCity.id);
    if (!found) return;

    if (!currentCity.name || !currentCity.timezone) {
      setCurrentCity((prev) => ({
        ...prev,
        name: prev.name || found.name || "",
        timezone: prev.timezone || found.timezone || "",
      }));
    }
  }, [currentCity.id, currentCity.name, currentCity.timezone, cities]);

  useEffect(() => {
    if (!enabled || !effectiveCountryId) {
      setCountryTimezoneCodes([]);
      return;
    }

    const fromSelection =
      selectedCountryState.iso2 ||
      currentCountry.iso2 ||
      countries.find((c) => c.id === effectiveCountryId)?.iso2 ||
      "";
    const countryCode = fromSelection.trim().toUpperCase();

    if (!countryCode) {
      setCountryTimezoneCodes([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const rows = await timezoneApi({ countryCode });
      if (cancelled) return;
      const codes = uniq(
        rows.map((row) => (row.code || row.name || "").trim()).filter(Boolean)
      );
      setCountryTimezoneCodes(codes);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    effectiveCountryId,
    selectedCountryState.iso2,
    currentCountry.iso2,
    countries,
    timezoneApi,
  ]);

  useEffect(() => {
    if (!enabled) {
      setResolvedTimezone("");
      return;
    }

    if (!effectiveCity.id) {
      setResolvedTimezone("");
      return;
    }

    let cancelled = false;

    const resolveTimezone = async () => {
      setIsResolvingTimezone(true);
      try {
        const cityName = effectiveCity.name.trim();
        const stateName = effectiveState.name.trim();
        const countryCode = (
          effectiveCountry.iso2 ||
          countries.find((c) => c.id === effectiveCountry.id)?.iso2 ||
          ""
        )
          .trim()
          .toUpperCase();

        const directCityTimezone = effectiveCity.timezone?.trim() || "";
        const isIndonesia = countryCode === "ID";

        if (isIndonesia) {
          const forcedCode = resolveIndonesiaTimezone(stateName, cityName);
          if (!cancelled) {
            setResolvedTimezone(forcedCode);
          }
          return;
        }

        const queries = uniq([
          `${cityName} ${stateName}`.trim(),
          cityName,
          stateName,
          `${stateName} ${effectiveCountry.name}`.trim(),
          `${cityName} ${effectiveCountry.name}`.trim(),
        ]);

        let bestCode = "";
        let bestScore = Number.NEGATIVE_INFINITY;

        for (const q of queries) {
          if (!q) continue;
          const rows = await timezoneApi({ q, page: "1", pageSize: "20" });
          for (const row of rows) {
            const code = row.code || row.name || "";
            if (!code) continue;

            let score = 0;
            const rowName = normalize(row.name);
            const rowCity = normalize(row.cityName);
            const rowState = normalize(row.stateName);
            const rowCountryCode = normalize(row.countryCode);
            const cityNorm = normalize(cityName);
            const stateNorm = normalize(stateName);
            const countryNorm = normalize(countryCode);

            if (countryTimezoneCodes.includes(code)) score += 5;
            if (countryNorm && rowCountryCode === countryNorm) score += 4;
            if (cityNorm && (rowCity.includes(cityNorm) || rowName.includes(cityNorm))) score += 3;
            if (stateNorm && (rowState.includes(stateNorm) || rowName.includes(stateNorm))) score += 2;
            if (code.includes("/")) score += 1;

            if (score > bestScore) {
              bestScore = score;
              bestCode = code;
            }
          }
        }

        if (!bestCode && directCityTimezone && countryTimezoneCodes.length <= 1) {
          const byCode = await timezoneApi({ code: directCityTimezone });
          bestCode = byCode[0]?.code || byCode[0]?.name || directCityTimezone;
        }

        if (!bestCode && countryTimezoneCodes.length === 1) {
          bestCode = countryTimezoneCodes[0];
        }

        if (!cancelled) {
          setResolvedTimezone(bestCode || "");
        }
      } finally {
        if (!cancelled) setIsResolvingTimezone(false);
      }
    };

    resolveTimezone();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    effectiveCity.id,
    effectiveCity.name,
    effectiveCity.timezone,
    effectiveState.name,
    effectiveCountry.id,
    effectiveCountry.name,
    effectiveCountry.iso2,
    countries,
    countryTimezoneCodes,
    timezoneApi,
  ]);

  return {
    states,
    cities,
    countries,
    openState,
    setOpenState,
    openCity,
    setOpenCity,
    openCountry,
    setOpenCountry,
    currentState,
    setCurrentState,
    currentCity,
    setCurrentCity,
    currentCountry,
    setCurrentCountry,
    selectedState: selectedStateState,
    setSelectedState,
    selectedCity: selectedCityState,
    setSelectedCity,
    selectedCountry: selectedCountryState,
    setSelectedCountry,
    resolvedTimezone,
    isResolvingTimezone,
  };
}
