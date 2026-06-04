import {
  Train, Utensils, ShoppingBag, HeartPulse, GraduationCap, Sparkles, Wind, Sunset,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useReverseGeocode, useNearbyPoisWithFallback, useCurrentWeather, useAirQuality,
} from "@/lib/hooks/use-neighborhood";
import { walkingMinutes, formatDistance } from "@/lib/utils/geo";
import { buildVibeScorecard, type VibeScore } from "@/lib/utils/vibe-scores";
import { weatherCodeLabel, aqiTier } from "@/lib/api/open-meteo.api";
import { cn } from "@/lib/utils/cn";
import type { NearbyPoi, PoiCategory } from "@/lib/api/assets.api";

interface Props {
  assetId: string;
  latitude?: number | null;
  longitude?: number | null;
  fallbackCityName?: string | null;
}

function staticMapUrl(lat: number, lng: number, zoom = 15, w = 1200, h = 360): string {
  return `https://maps.wikimedia.org/img/osm-intl,${zoom},${lat},${lng},${w}x${h}.png`;
}

const CATEGORY_META: Record<PoiCategory, {
  label: string;
  icon: React.ElementType;
  tile: string;
  iconWrap: string;
}> = {
  Transit:   {
    label: "Getting around", icon: Train,
    tile:     "from-sky-500/10 to-blue-500/5 border-sky-500/20",
    iconWrap: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  },
  Food:      {
    label: "Eat & drink", icon: Utensils,
    tile:     "from-orange-500/10 to-amber-500/5 border-orange-500/20",
    iconWrap: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
  },
  Shopping:  {
    label: "Shopping", icon: ShoppingBag,
    tile:     "from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
    iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  Health:    {
    label: "Health & care", icon: HeartPulse,
    tile:     "from-rose-500/10 to-pink-500/5 border-rose-500/20",
    iconWrap: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
  Education: {
    label: "Learn", icon: GraduationCap,
    tile:     "from-violet-500/10 to-fuchsia-500/5 border-violet-500/20",
    iconWrap: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  },
};

const AQI_TONE: Record<ReturnType<typeof aqiTier>["tone"], string> = {
  good:        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  fair:        "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  moderate:    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  poor:        "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "very-poor": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  extreme:     "bg-red-600/20 text-red-700 dark:text-red-300",
  unknown:     "bg-bg-subtle text-fg-muted",
};

function CategoryTile({ category, items }: { category: PoiCategory; items: NearbyPoi[] }) {
  if (items.length === 0) return null;
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <div className={cn(
      "rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-sm",
      meta.tile,
    )}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn("flex items-center justify-center w-9 h-9 rounded-xl", meta.iconWrap)}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-fg leading-tight">{meta.label}</p>
          <p className="text-[11px] text-fg-muted leading-tight">{items.length} nearby</p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 4).map((poi, i) => {
          const walk = walkingMinutes(poi.distanceMeters);
          return (
            <li key={`${poi.name}-${i}`} className="flex items-start justify-between gap-3 text-[13px]">
              <span className="text-fg leading-snug min-w-0 truncate">{poi.name}</span>
              <span className="text-[11px] text-fg-muted shrink-0 tabular-nums leading-snug pt-0.5">
                {walk}m · {formatDistance(poi.distanceMeters)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function VibeMeter({ label, emoji, score }: VibeScore) {
  // Color the bar by score band: high = emerald, mid = amber, low = rose.
  const tone =
    score >= 7 ? "from-emerald-400 to-teal-400" :
    score >= 4 ? "from-amber-400 to-yellow-400" :
                 "from-rose-400 to-pink-400";
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold">
            {emoji} {label}
          </p>
        </div>
        <span className="text-lg font-bold text-fg tabular-nums leading-none">
          {score}<span className="text-xs text-fg-muted font-medium">/10</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-subtle overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all", tone)}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
}

function formatSunset(iso: string | undefined, timezone?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return null;
  }
}

export function NeighborhoodCard({ assetId, latitude, longitude, fallbackCityName }: Props) {
  const hasCoords = typeof latitude === "number" && typeof longitude === "number";

  const { data: geo, isLoading: geoLoading } = useReverseGeocode(latitude, longitude);
  const { data: pois, isLoading: poisLoading } = useNearbyPoisWithFallback(
    assetId, latitude, longitude, 800,
  );
  const { data: weather, isLoading: weatherLoading } = useCurrentWeather(latitude, longitude);
  const { data: air, isLoading: airLoading } = useAirQuality(latitude, longitude);

  if (!hasCoords) return null;

  const districtName = geo?.suburb ?? geo?.neighbourhood ?? geo?.city ?? fallbackCityName ?? "Your neighbourhood";

  const totalPois =
    (pois?.transit.length ?? 0) +
    (pois?.food.length ?? 0) +
    (pois?.shopping.length ?? 0) +
    (pois?.health.length ?? 0) +
    (pois?.education.length ?? 0);

  const vibe = pois ? buildVibeScorecard(pois) : null;

  const weatherMeta = weather ? weatherCodeLabel(weather.weatherCode, weather.isDay) : null;
  const aqi = aqiTier(air?.europeanAqi);
  const sunsetText = formatSunset(weather?.sunsetIso, weather?.timezone);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-border bg-bg-card shadow-card">
      {/* ── Hero band ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {hasCoords && (
          <img
            src={staticMapUrl(latitude!, longitude!, 15, 1200, 360)}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/60 via-violet-600/40 to-cyan-500/30 mix-blend-multiply dark:from-indigo-900/80 dark:via-violet-900/70 dark:to-cyan-900/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/30 to-transparent" />

        {/* Pin */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 w-5 h-5 rounded-full bg-rose-500/40 animate-ping" />
            <div className="relative w-5 h-5 rounded-full bg-rose-500 border-2 border-white shadow-lg" />
          </div>
        </div>

        <div className="relative px-6 pt-8 pb-12 min-h-[180px] flex flex-col justify-end">
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] uppercase tracking-wider font-semibold text-white">
            <Sparkles size={11} />
            Your neighbourhood
          </div>
          {geoLoading ? (
            <Skeleton className="h-9 w-64 mt-3 bg-white/20" />
          ) : (
            <h2 className="mt-3 text-3xl font-bold text-white drop-shadow-md leading-tight">
              {districtName}
              {geo?.city && geo.city !== districtName && (
                <span className="ml-2 text-base font-medium opacity-80">· {geo.city}</span>
              )}
              {geo?.country && (
                <span className="ml-2 text-base font-medium opacity-70">{geo.country}</span>
              )}
            </h2>
          )}
        </div>
      </div>

      {/* ── Now-bar: weather / AQI / sunset ─────────────────────────────────── */}
      {(weatherLoading || airLoading || weather || air) && (
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-bg-subtle/50 to-transparent">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Temperature */}
            {weatherLoading ? (
              <Skeleton className="h-9 w-32 rounded-xl" />
            ) : weather && weatherMeta ? (
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-card border border-border">
                <span className="text-2xl leading-none">{weatherMeta.emoji}</span>
                <div className="leading-tight">
                  <div className="text-base font-bold text-fg tabular-nums">
                    {Math.round(weather.temperatureC)}°C
                  </div>
                  <div className="text-[10px] text-fg-muted -mt-0.5">
                    feels {Math.round(weather.apparentTemperatureC)}° · {weatherMeta.label}
                  </div>
                </div>
              </div>
            ) : null}

            {/* AQI */}
            {airLoading ? (
              <Skeleton className="h-9 w-36 rounded-xl" />
            ) : air?.europeanAqi != null ? (
              <div className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl",
                AQI_TONE[aqi.tone],
              )}>
                <Wind size={15} className="shrink-0" />
                <div className="leading-tight">
                  <div className="text-sm font-bold tabular-nums">
                    AQI {Math.round(air.europeanAqi)}
                  </div>
                  <div className="text-[10px] opacity-80 -mt-0.5">
                    {aqi.label}
                    {air.pm25 != null && ` · PM2.5 ${air.pm25.toFixed(0)}`}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Sunset */}
            {sunsetText && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <Sunset size={15} className="shrink-0" />
                <div className="leading-tight">
                  <div className="text-sm font-bold tabular-nums">{sunsetText}</div>
                  <div className="text-[10px] opacity-80 -mt-0.5">Sunset today</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vibe scorecard ──────────────────────────────────────────────────── */}
      {(poisLoading || vibe) && (
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-sm font-semibold text-fg mb-3">Neighbourhood vibe</h3>
          {poisLoading || !vibe ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border p-4 space-y-2.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <VibeMeter {...vibe.walkability} />
              <VibeMeter {...vibe.food} />
              <VibeMeter {...vibe.transit} />
              <VibeMeter {...vibe.calm} />
            </div>
          )}
        </div>
      )}

      {/* ── POI tile grid ───────────────────────────────────────────────────── */}
      {(poisLoading || (pois && totalPois > 0)) && (
        <div className="px-6 py-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm font-semibold text-fg">What's around</h3>
            <span className="text-[11px] text-fg-muted">within 800 m</span>
          </div>
          {poisLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border p-4 space-y-2.5">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ))}
            </div>
          ) : pois ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <CategoryTile category="Transit"   items={pois.transit} />
              <CategoryTile category="Food"      items={pois.food} />
              <CategoryTile category="Shopping"  items={pois.shopping} />
              <CategoryTile category="Health"    items={pois.health} />
              <CategoryTile category="Education" items={pois.education} />
            </div>
          ) : null}
        </div>
      )}

      {/* ── Attribution footer ──────────────────────────────────────────────── */}
      <div className="px-6 py-2.5 bg-bg-subtle text-[10px] text-fg-muted text-right border-t border-border">
        Maps © OpenStreetMap contributors · weather © Open-Meteo
      </div>
    </div>
  );
}
