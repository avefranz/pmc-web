// OpenStreetMap Overpass API — direct frontend access.
// Used as a fallback when the BE /nearby-pois endpoint is unavailable
// (e.g. the tenant role is not authorised to call it).
//
// Public Overpass instances are community-run; we cache aggressively in
// localStorage (keyed by geohash) so any given coordinate is queried at most
// once per month per browser.

import type { NearbyPoi, NearbyPoisResponse, PoiCategory } from "./assets.api";
import { haversineMeters } from "../utils/geo";

// Extended response with nightlife count used by the vibe scorecard.
// (We don't surface nightlife venues as a tile — they only count for "calm".)
export interface NeighborhoodPois extends NearbyPoisResponse {
  nightlifeCount: number;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days
const CACHE_KEY_PREFIX = "pmc_osm_pois_";

interface OverpassNode {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassNode[];
}

/**
 * Geohash-style coarse cache key (~150 m precision at p=7) so neighbouring
 * coordinates share the same cached response.
 */
function geohashKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

type Bucket = PoiCategory | "Nightlife";

function categoriseTag(tags: Record<string, string>): Bucket | null {
  const a = tags.amenity;
  const s = tags.shop;
  const r = tags.railway;
  const pt = tags.public_transport;

  if (r === "station" || r === "halt" || r === "tram_stop" || pt === "station" || pt === "platform") {
    return "Transit";
  }
  // Nightlife is counted separately (not shown as a tile) — feeds the calm score.
  if (a === "bar" || a === "pub" || a === "nightclub" || a === "biergarten") {
    return "Nightlife";
  }
  if (a === "restaurant" || a === "cafe" || a === "fast_food" ||
      a === "food_court" || a === "marketplace" || a === "ice_cream") {
    return "Food";
  }
  if (s) return "Shopping";
  if (a === "hospital" || a === "clinic" || a === "pharmacy" || a === "doctors" || a === "dentist") {
    return "Health";
  }
  if (a === "school" || a === "university" || a === "college" || a === "kindergarten" || a === "library") {
    return "Education";
  }
  return null;
}

function poiName(tags: Record<string, string>): string {
  return tags["name:en"] ?? tags.name ?? tags.brand ?? tags.operator ?? humanizeTag(tags);
}

function humanizeTag(tags: Record<string, string>): string {
  const key = tags.amenity ?? tags.shop ?? tags.railway ?? tags.public_transport ?? "place";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildQuery(lat: number, lng: number, radius: number): string {
  // Single combined query — cheaper for Overpass than multiple round-trips.
  return `
[out:json][timeout:15];
(
  node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|nightclub|biergarten|food_court|marketplace|ice_cream|atm|bank|hospital|clinic|pharmacy|doctors|dentist|school|university|college|kindergarten|library)$"](around:${radius},${lat},${lng});
  node["shop"](around:${radius},${lat},${lng});
  node["railway"~"^(station|halt|tram_stop)$"](around:${radius},${lat},${lng});
  node["public_transport"~"^(station|platform)$"](around:${radius},${lat},${lng});
);
out body 200;
`.trim();
}

function readCache(key: string): NeighborhoodPois | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: NeighborhoodPois };
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: NeighborhoodPois) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Quota exceeded or disabled — just skip, the request will run next time.
  }
}

/**
 * Query Overpass for POIs around a point, returning the same shape as the
 * BE /nearby-pois endpoint so callers can use the two interchangeably.
 */
export async function fetchOverpassPois(
  lat: number,
  lng: number,
  radius = 800,
): Promise<NeighborhoodPois | null> {
  const key = `${geohashKey(lat, lng)}_${radius}`;
  const cached = readCache(key);
  if (cached) return { ...cached, cached: true };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(buildQuery(lat, lng, radius)),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json: OverpassResponse = await res.json();

    const buckets: Record<PoiCategory, NearbyPoi[]> = {
      Transit: [], Food: [], Shopping: [], Health: [], Education: [],
    };
    let nightlifeCount = 0;

    for (const el of json.elements ?? []) {
      const tags = el.tags ?? {};
      const cat = categoriseTag(tags);
      if (!cat) continue;
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (typeof elLat !== "number" || typeof elLng !== "number") continue;
      if (cat === "Nightlife") {
        nightlifeCount += 1;
        continue;
      }
      const distance = haversineMeters({ lat, lng }, { lat: elLat, lng: elLng });
      buckets[cat].push({
        name:           poiName(tags),
        kind:           tags.amenity ?? tags.shop ?? tags.railway ?? tags.public_transport ?? "",
        category:       cat,
        distanceMeters: Math.round(distance),
        latitude:       elLat,
        longitude:      elLng,
      });
    }

    // Sort each bucket by distance, ascending, and de-duplicate by name+kind+distance bucket
    for (const k of Object.keys(buckets) as PoiCategory[]) {
      const seen = new Set<string>();
      buckets[k] = buckets[k]
        .filter((p) => {
          const sig = `${p.name.toLowerCase()}_${p.kind}_${Math.round(p.distanceMeters / 25)}`;
          if (seen.has(sig)) return false;
          seen.add(sig);
          return true;
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 30);
    }

    const result: NeighborhoodPois = {
      assetId:      "",
      latitude:     lat,
      longitude:    lng,
      radiusMeters: radius,
      transit:      buckets.Transit,
      food:         buckets.Food,
      shopping:     buckets.Shopping,
      health:       buckets.Health,
      education:    buckets.Education,
      source:       "osm",
      cached:       false,
      degraded:     false,
      nightlifeCount,
    };

    writeCache(key, result);
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
