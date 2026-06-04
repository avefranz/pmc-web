// Open-Meteo — free, no key, no auth.
// We pull two things for the neighbourhood "now-bar":
//   1. Current weather (temp, apparent temp, weather code, is_day) + today's sunset.
//   2. Current air quality (European AQI + PM2.5 µg/m³) — particularly relevant for
//      Bangkok / Chiang Mai during the burning season.
//
// Docs: https://open-meteo.com/en/docs

const WEATHER_URL     = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export interface CurrentWeather {
  temperatureC:        number;
  apparentTemperatureC: number;
  weatherCode:         number;     // WMO weather code
  isDay:               boolean;
  sunsetIso?:          string;     // ISO timestamp of today's sunset
  timezone?:           string;
}

export interface AirQuality {
  europeanAqi?: number;       // 0-100 (good), 100-200 (poor), 200+ (very poor)
  pm25?:        number;       // µg/m³
}

async function safeFetch<T>(url: string, timeoutMs = 6000): Promise<T | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCurrentWeather(lat: number, lng: number): Promise<CurrentWeather | null> {
  const params = new URLSearchParams({
    latitude:       String(lat),
    longitude:      String(lng),
    current:        "temperature_2m,apparent_temperature,weather_code,is_day",
    daily:          "sunset",
    timezone:       "auto",
    forecast_days:  "1",
  });
  const data = await safeFetch<{
    current?: {
      temperature_2m?:        number;
      apparent_temperature?:  number;
      weather_code?:          number;
      is_day?:                number;
    };
    daily?: { sunset?: string[] };
    timezone?: string;
  }>(`${WEATHER_URL}?${params.toString()}`);
  if (!data?.current) return null;
  const c = data.current;
  if (typeof c.temperature_2m !== "number" || typeof c.weather_code !== "number") return null;
  return {
    temperatureC:         c.temperature_2m,
    apparentTemperatureC: c.apparent_temperature ?? c.temperature_2m,
    weatherCode:          c.weather_code,
    isDay:                c.is_day === 1,
    sunsetIso:            data.daily?.sunset?.[0],
    timezone:             data.timezone,
  };
}

export async function getAirQuality(lat: number, lng: number): Promise<AirQuality | null> {
  const params = new URLSearchParams({
    latitude:  String(lat),
    longitude: String(lng),
    current:   "european_aqi,pm2_5",
    timezone:  "auto",
  });
  const data = await safeFetch<{
    current?: { european_aqi?: number; pm2_5?: number };
  }>(`${AIR_QUALITY_URL}?${params.toString()}`);
  if (!data?.current) return null;
  return {
    europeanAqi: data.current.european_aqi,
    pm25:        data.current.pm2_5,
  };
}

// ── Weather code → label + emoji ──────────────────────────────────────────────
// Subset of WMO codes Open-Meteo returns: https://open-meteo.com/en/docs (weather_code)

export function weatherCodeLabel(code: number, isDay: boolean): { emoji: string; label: string } {
  if (code === 0)                        return { emoji: isDay ? "☀️" : "🌙", label: isDay ? "Clear" : "Clear night" };
  if (code === 1 || code === 2)          return { emoji: isDay ? "🌤️" : "☁️", label: "Partly cloudy" };
  if (code === 3)                        return { emoji: "☁️", label: "Overcast" };
  if (code === 45 || code === 48)        return { emoji: "🌫️", label: "Fog" };
  if (code >= 51 && code <= 57)          return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 61 && code <= 67)          return { emoji: "🌧️", label: "Rain" };
  if (code >= 71 && code <= 77)          return { emoji: "❄️", label: "Snow" };
  if (code >= 80 && code <= 82)          return { emoji: "🌧️", label: "Rain showers" };
  if (code >= 85 && code <= 86)          return { emoji: "🌨️", label: "Snow showers" };
  if (code >= 95 && code <= 99)          return { emoji: "⛈️", label: "Thunderstorm" };
  return { emoji: "🌡️", label: "Weather" };
}

// ── AQI → label + color tier ──────────────────────────────────────────────────
// European AQI buckets: 0-20 Good, 20-40 Fair, 40-60 Moderate, 60-80 Poor,
// 80-100 Very poor, 100+ Extremely poor.

export function aqiTier(aqi?: number): { label: string; tone: "good" | "fair" | "moderate" | "poor" | "very-poor" | "extreme" | "unknown" } {
  if (aqi == null) return { label: "Unknown", tone: "unknown" };
  if (aqi <= 20)   return { label: "Good",           tone: "good" };
  if (aqi <= 40)   return { label: "Fair",           tone: "fair" };
  if (aqi <= 60)   return { label: "Moderate",       tone: "moderate" };
  if (aqi <= 80)   return { label: "Poor",           tone: "poor" };
  if (aqi <= 100)  return { label: "Very poor",      tone: "very-poor" };
  return             { label: "Extremely poor", tone: "extreme" };
}
