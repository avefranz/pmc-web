// OpenStreetMap Nominatim reverse-geocoding.
// Free, no key, but capped at 1 req/sec — we wrap calls in TanStack Query with
// staleTime Infinity so the same coordinates resolve once per browser session.
//
// Docs: https://nominatim.org/release-docs/develop/api/Reverse/
// Usage policy: must identify the app via a referer or descriptive UA, and
// avoid hammering the public server.

export interface ReverseGeocodeResult {
  /** Most specific neighbourhood-level name available */
  suburb?: string;
  neighbourhood?: string;
  /** City / town / village — whichever is present */
  city?: string;
  country?: string;
  countryCode?: string;          // ISO 3166-1 alpha-2, lowercase
  displayName: string;
}

const BASE = "https://nominatim.openstreetmap.org/reverse";

/**
 * Best-effort reverse geocode. Returns null on network failure / timeout
 * so the caller can degrade gracefully (we still have OSM POIs from BE).
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  lang = "en",
): Promise<ReverseGeocodeResult | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 6000);

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    zoom: "16",                  // suburb-level precision
    "accept-language": lang,
  });

  try {
    const res = await fetch(`${BASE}?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address ?? {};
    return {
      suburb:        addr.suburb,
      neighbourhood: addr.neighbourhood ?? addr.quarter ?? addr.residential,
      city:          addr.city ?? addr.town ?? addr.village ?? addr.municipality,
      country:       addr.country,
      countryCode:   addr.country_code,
      displayName:   data?.display_name ?? "",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
