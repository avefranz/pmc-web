import { useQuery } from "@tanstack/react-query";
import { reverseGeocode } from "../api/nominatim.api";
import { fetchOverpassPois, type NeighborhoodPois } from "../api/overpass.api";
import { assetsApi } from "../api/assets.api";
import { getCurrentWeather, getAirQuality } from "../api/open-meteo.api";

// Stale Infinity — neighbourhoods don't move, and these external services
// have polite-use policies we should not stress.
const FOREVER = Number.POSITIVE_INFINITY;

export function useReverseGeocode(lat?: number | null, lng?: number | null) {
  return useQuery({
    queryKey: ["nominatim", "reverse", lat, lng],
    queryFn: () => reverseGeocode(lat!, lng!),
    enabled: typeof lat === "number" && typeof lng === "number",
    staleTime: FOREVER,
    gcTime: FOREVER,
    retry: 0,
  });
}

/**
 * Tries the BE endpoint first; on failure (403 for tenants, or anything else)
 * falls back to a direct Overpass query with localStorage caching.
 * Returns the unified NeighborhoodPois shape (includes nightlifeCount when
 * sourced from Overpass; BE source surfaces 0 since BE doesn't currently
 * count it).
 */
export function useNearbyPoisWithFallback(
  assetId: string | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
  radius = 800,
) {
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  return useQuery({
    queryKey: ["pois-with-fallback", assetId, lat, lng, radius],
    enabled: !!assetId && hasCoords,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 0,
    queryFn: async (): Promise<NeighborhoodPois | null> => {
      try {
        const fromBe = await assetsApi.getNearbyPois(assetId!, radius);
        // BE may return an empty payload (asset never enriched) — fall back too.
        const total = (fromBe.transit?.length ?? 0)
          + (fromBe.food?.length ?? 0)
          + (fromBe.shopping?.length ?? 0)
          + (fromBe.health?.length ?? 0)
          + (fromBe.education?.length ?? 0);
        if (total > 0) return { ...fromBe, nightlifeCount: 0 };
      } catch {
        // 403 for tenants, 5xx, network — fall through to Overpass.
      }
      return fetchOverpassPois(lat!, lng!, radius);
    },
  });
}

// ── Weather + air quality ──────────────────────────────────────────────────

export function useCurrentWeather(lat?: number | null, lng?: number | null) {
  return useQuery({
    queryKey: ["open-meteo", "weather", lat, lng],
    queryFn: () => getCurrentWeather(lat!, lng!),
    enabled: typeof lat === "number" && typeof lng === "number",
    // Refresh every 30 min; in dev that's effectively never per page view.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });
}

export function useAirQuality(lat?: number | null, lng?: number | null) {
  return useQuery({
    queryKey: ["open-meteo", "air", lat, lng],
    queryFn: () => getAirQuality(lat!, lng!),
    enabled: typeof lat === "number" && typeof lng === "number",
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 0,
  });
}
