// Geo helpers — distance/time estimates for the neighbourhood guide.
// Walking speed 5 km/h with a 1.3 detour factor (real paths aren't straight lines).
// Taxi speed 30 km/h with 1.4 factor (city traffic).

const WALK_KMH = 5;
const TAXI_KMH = 30;
const DETOUR_WALK = 1.3;
const DETOUR_TAXI = 1.4;

/** Haversine distance between two lat/lng pairs, in metres. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Approximate walking time in minutes for a straight-line distance. Floored at 1. */
export function walkingMinutes(distanceMeters: number): number {
  const adjustedKm = (distanceMeters * DETOUR_WALK) / 1000;
  return Math.max(1, Math.round((adjustedKm / WALK_KMH) * 60));
}

/** Approximate taxi/drive time in minutes. Floored at 1. */
export function taxiMinutes(distanceMeters: number): number {
  const adjustedKm = (distanceMeters * DETOUR_TAXI) / 1000;
  return Math.max(1, Math.round((adjustedKm / TAXI_KMH) * 60));
}

/** Human-readable distance: "180 m" or "1.4 km". */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}
