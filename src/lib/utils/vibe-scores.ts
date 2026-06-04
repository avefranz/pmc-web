// Derive a "vibe scorecard" for the neighbourhood from OSM POI counts.
// Inputs are within an 800m walking radius (the same radius the card uses).
//
// The buckets and thresholds are chosen so a typical dense city block scores
// 7-9, a suburban area scores 4-6, and an isolated rural property scores 1-3.
// They are not science — they are heuristics that read sensibly to a renter.

import type { NearbyPoisResponse } from "../api/assets.api";

export interface VibeScore {
  score: number;          // 1-10
  label: string;
  emoji: string;
}

export interface VibeScorecard {
  walkability: VibeScore;
  food:        VibeScore;
  transit:     VibeScore;
  calm:        VibeScore;
}

type CountedPois = NearbyPoisResponse & { nightlifeCount?: number };

function bucket(n: number, thresholds: [number, number, number, number, number]): number {
  // thresholds e.g. [50, 25, 10, 5, 1] → returns 10 / 8 / 6 / 4 / 2 / 1
  if (n >= thresholds[0]) return 10;
  if (n >= thresholds[1]) return 8;
  if (n >= thresholds[2]) return 6;
  if (n >= thresholds[3]) return 4;
  if (n >= thresholds[4]) return 2;
  return 1;
}

function walkabilityLabel(s: number): { label: string; emoji: string } {
  if (s >= 9) return { label: "Very walkable",     emoji: "🚶‍♀️" };
  if (s >= 7) return { label: "Walkable",          emoji: "🚶" };
  if (s >= 5) return { label: "Moderately walkable", emoji: "🚶" };
  if (s >= 3) return { label: "Car-helpful",       emoji: "🚗" };
  return        { label: "Car-needed",       emoji: "🚗" };
}

function foodLabel(s: number): { label: string; emoji: string } {
  if (s >= 9) return { label: "Foodie heaven",     emoji: "🍜" };
  if (s >= 7) return { label: "Strong food scene", emoji: "🍜" };
  if (s >= 5) return { label: "Decent options",    emoji: "🍱" };
  if (s >= 3) return { label: "Few choices",       emoji: "🍙" };
  return        { label: "Bring your own",   emoji: "🥡" };
}

function transitLabel(s: number): { label: string; emoji: string } {
  if (s >= 9) return { label: "Excellent transit",  emoji: "🚇" };
  if (s >= 7) return { label: "Good connections",   emoji: "🚆" };
  if (s >= 5) return { label: "Some transit",       emoji: "🚌" };
  if (s >= 3) return { label: "Limited transit",    emoji: "🚐" };
  return        { label: "Off the grid",      emoji: "🛣️" };
}

function calmLabel(s: number): { label: string; emoji: string } {
  if (s >= 9) return { label: "Very quiet",         emoji: "🌙" };
  if (s >= 7) return { label: "Quiet residential",  emoji: "🌳" };
  if (s >= 5) return { label: "Balanced vibe",      emoji: "⚖️" };
  if (s >= 3) return { label: "Lively after dark",  emoji: "🌃" };
  return        { label: "Buzzing nightlife", emoji: "🎉" };
}

export function buildVibeScorecard(pois: CountedPois): VibeScorecard {
  const food     = pois.food?.length     ?? 0;
  const shop     = pois.shopping?.length ?? 0;
  const transit  = pois.transit?.length  ?? 0;
  const health   = pois.health?.length   ?? 0;
  const edu      = pois.education?.length ?? 0;
  const night    = pois.nightlifeCount   ?? 0;

  // Walkability: total useful nearby POIs.
  const walkabilityRaw = food + shop + transit + health + edu;
  const walkScore = bucket(walkabilityRaw, [40, 20, 10, 5, 1]);

  // Food: density of restaurants/cafes/etc.
  const foodScore = bucket(food, [25, 12, 6, 3, 1]);

  // Transit: number of stations/stops nearby.
  const transitScore = bucket(transit, [6, 3, 2, 1, 1]);

  // Calm: inverse of nightlife density. Many bars/clubs → less calm.
  // Note: nightlife alone is the signal — being walkable doesn't make a place loud.
  const calmScore =
    night === 0 ? 10 :
    night <= 2  ? 8  :
    night <= 5  ? 6  :
    night <= 10 ? 4  : 2;

  return {
    walkability: { score: walkScore,    ...walkabilityLabel(walkScore) },
    food:        { score: foodScore,    ...foodLabel(foodScore) },
    transit:     { score: transitScore, ...transitLabel(transitScore) },
    calm:        { score: calmScore,    ...calmLabel(calmScore) },
  };
}

/** One-line summary built from the strongest signals. */
export function summariseVibe(s: VibeScorecard): string {
  return [s.walkability.label, s.food.label, s.transit.label, s.calm.label].join(" · ");
}
