import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketplaceCities } from "@/lib/hooks/use-marketplace";
import { cn } from "@/lib/utils/cn";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field, Row } from "../ui";

const LocationPicker = lazy(() =>
  import("@/components/shared/location-picker").then((m) => ({ default: m.LocationPicker })),
);

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

// Roughly ±0.5° box around the city centre. Nominatim's `viewbox` + `bounded=1`
// means results outside the city are filtered out — so typing "Sukhumvit"
// while city = Bangkok won't return matches in other countries.
const CITY_RADIUS = 0.5;

function LocationDialog({ draft, patch }: SectionDialogProps) {
  const { data: cities } = useMarketplaceCities();
  const city = cities?.find((c) => c.id === draft.cityId);
  const lat = draft.latitude ?? city?.latitude ?? 13.7563;
  const lng = draft.longitude ?? city?.longitude ?? 100.5018;

  // ── Street address autocomplete (Nominatim, city-biased) ────────────────
  const [searchQuery, setSearchQuery] = useState(draft.streetAddress);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // Suppresses the next debounce-driven search — used when we set the input
  // value programmatically (city change, suggestion picked).
  const suppressNext = useRef(false);
  const lastSeq = useRef(0);

  useEffect(() => {
    if (suppressNext.current) {
      suppressNext.current = false;
      return;
    }
    if (!city) return;
    const q = searchQuery.trim();
    if (q.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const seq = ++lastSeq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const vb = [
          city.longitude - CITY_RADIUS,
          city.latitude + CITY_RADIUS,
          city.longitude + CITY_RADIUS,
          city.latitude - CITY_RADIUS,
        ].join(",");
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q,
        )}&addressdetails=1&limit=8&viewbox=${vb}&bounded=1`;
        const resp = await fetch(url, {
          headers: { "Accept-Language": "en" },
        });
        if (seq !== lastSeq.current) return;
        const data: NominatimResult[] = await resp.json();
        setResults(data);
        setShowResults(true);
      } catch {
        /* network failed — leave results empty, user can pick on map */
      } finally {
        if (seq === lastSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, city]);

  function pickResult(r: NominatimResult) {
    const la = parseFloat(r.lat);
    const ln = parseFloat(r.lon);
    // Compose a tidy street line — prefer house_number + road, fall back to
    // display_name's leading segment so we never end up empty.
    const a = r.address ?? {};
    const street =
      (a.house_number ? `${a.house_number} ` : "") + (a.road ?? "") ||
      r.display_name.split(",")[0]?.trim() ||
      "";
    suppressNext.current = true;
    setSearchQuery(street);
    setShowResults(false);
    patch({
      streetAddress: street,
      latitude: la,
      longitude: ln,
      zipCode: a.postcode ?? draft.zipCode,
    });
  }

  return (
    <div>
      <Field label="City" required>
        <Select
          value={draft.cityId ? String(draft.cityId) : ""}
          onValueChange={(v) => patch({ cityId: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            {(cities ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Search-as-you-type street address. Disabled until city is set so we
          always have a search bias. */}
      <Field
        label="Street address"
        hint={
          city
            ? "Start typing — we'll search inside this city and drop the pin for you."
            : "Pick a city first to enable address search."
        }
      >
        <div className="relative">
          <div className="relative">
            <MapPin
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
            />
            <Input
              value={searchQuery}
              disabled={!city}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Push raw text into draft so closing the dialog doesn't lose it.
                patch({ streetAddress: e.target.value });
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 150)}
              placeholder="e.g. Sukhumvit Rd, 123"
              className="pl-9 pr-9"
              autoComplete="off"
            />
            {searching && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle animate-spin"
              />
            )}
          </div>
          {showResults && !searching && results.length === 0 && searchQuery.trim().length >= 3 && (
            <div className="absolute z-30 left-0 right-0 top-[calc(100%+4px)] bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              <p className="px-4 py-3 text-sm text-fg-muted">No results — try a different address or pin on map</p>
            </div>
          )}
          {showResults && results.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-[calc(100%+4px)] bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickResult(r);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg-subtle transition-colors flex items-start gap-2 border-b border-border last:border-b-0",
                  )}
                >
                  <MapPin size={14} className="text-fg-subtle shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-snug">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {city && searchQuery.trim().length >= 3 && (draft.latitude === null || draft.longitude === null) && !searching && (
          <p className="mt-2 text-xs text-warning flex items-start gap-1.5">
            <MapPin size={12} className="shrink-0 mt-0.5" />
            <span>Pick a suggestion above or tap the map below to confirm coordinates — we need a precise pin to publish.</span>
          </p>
        )}
      </Field>

      <Field label="Map" hint="Or tap on the map to drop a pin directly.">
        <div className="h-48 rounded-xl overflow-hidden border border-border">
          <Suspense fallback={<div className="h-full bg-bg-subtle animate-pulse" />}>
            <LocationPicker
              lat={lat}
              lng={lng}
              zoom={draft.latitude ? 16 : 11}
              onChange={async (la, ln) => {
                patch({ latitude: la, longitude: ln });
                try {
                  const resp = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}&addressdetails=1`,
                    { headers: { "Accept-Language": "en" } },
                  );
                  const data = await resp.json();
                  if (data.address) {
                    const a = data.address;
                    const street =
                      (a.house_number ? `${a.house_number} ` : "") + (a.road ?? "") ||
                      data.display_name.split(",")[0]?.trim() ||
                      "";
                    suppressNext.current = true;
                    setSearchQuery(street);
                    patch({
                      streetAddress: street,
                      zipCode: a.postcode ?? draft.zipCode,
                    });
                  }
                } catch {
                  /* reverse geocode failed — coordinates still saved */
                }
              }}
            />
          </Suspense>
        </div>
      </Field>

      <Row cols={2}>
        <Field label="Unit number" optional>
          <Input
            value={draft.unitNumber}
            onChange={(e) => patch({ unitNumber: e.target.value })}
            placeholder="A-1234"
          />
        </Field>
        <Field label="Postal code" required>
          <Input value={draft.zipCode} onChange={(e) => patch({ zipCode: e.target.value })} placeholder="10110" />
        </Field>
      </Row>

      <Field label="Legal address" required hint="The full address as it appears on official documents.">
        <Textarea
          value={draft.legalAddress}
          onChange={(e) => patch({ legalAddress: e.target.value })}
          rows={3}
        />
      </Field>

      <Field label="Google Maps URL" optional>
        <Input
          value={draft.googleMapsUrl}
          onChange={(e) => patch({ googleMapsUrl: e.target.value })}
          placeholder="https://maps.app.goo.gl/…"
        />
      </Field>
    </div>
  );
}

export const locationSection: SectionDef = {
  id: "location",
  label: "Address & location",
  group: "basics",
  required: true,
  estTime: "1 min",
  isComplete: (d) =>
    d.cityId !== null &&
    d.latitude !== null &&
    d.longitude !== null &&
    d.zipCode.trim().length > 0 &&
    d.legalAddress.trim().length > 0,
  summary: (d) => {
    if (d.cityId === null) return "—";
    const street = d.streetAddress || "Pinned on map";
    return d.unitNumber ? `${street}, ${d.unitNumber}` : street;
  },
  Form: LocationDialog,
};
