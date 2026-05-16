import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCreateAsset } from "@/lib/hooks/use-assets";
import { useReferences } from "@/lib/hooks/use-references";
import { listingsApi } from "@/lib/api/listings.api";
import { aiApi, type AiPropertyType } from "@/lib/api/ai.api";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";

const ANIM = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.45); }
    50%      { box-shadow: 0 0 0 14px rgba(99,102,241,0); }
  }
  @keyframes shimmer {
    from { background-position: -200% center; }
    to   { background-position: 200% center; }
  }
  @keyframes btn-sheen {
    0%   { transform: translateX(-150%) skewX(-20deg); }
    60%  { transform: translateX(150%) skewX(-20deg); }
    100% { transform: translateX(150%) skewX(-20deg); }
  }
  @keyframes confetti-pop {
    0%   { opacity: 0; transform: translate(0,0) scale(0.3); }
    25%  { opacity: 1; }
    100% { opacity: 0; transform: var(--c-end) scale(1); }
  }
  @keyframes progress-fill {
    from { width: var(--from, 0%); }
    to   { width: var(--to, 0%); }
  }
  .fade-up { animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .btn-pulse { animation: pulse-ring 2.4s ease-in-out infinite; }
  .btn-sheen::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
    animation: btn-sheen 2.6s ease-in-out infinite;
  }
  .ai-shimmer {
    background: linear-gradient(90deg, #6366f1, #a855f7, #6366f1);
    background-size: 200% auto;
    animation: shimmer 2s linear infinite;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const NAME_MAX = 60;

function resolveName(name: Record<string, string> | string): string {
  if (typeof name === "string") return name;
  return name["en"] ?? name["th"] ?? Object.values(name)[0] ?? "";
}

// Calibrated base monthly rent in THB. Adjusted via bedroom / area / feature multipliers.
const BASE_BY_TYPE: Record<number, number> = {
  1: 22000,  // Condo (typical 1BR Bangkok mid-range)
  2: 42000,  // House
  3: 85000,  // Villa
  4: 13000,  // Studio
  5: 32000,  // Townhouse
  6: 26000,  // Other
};

const BED_MULT: Record<number, number> = {
  0: 0.75, 1: 1.0, 2: 1.55, 3: 2.2, 4: 2.75, 5: 3.4,
};

// Area multipliers — only listed areas tighten the estimate; others use 1.0.
const AREA_MULT: Record<string, number> = {
  "sukhumvit": 1.35, "sathorn": 1.35, "silom": 1.3, "asok": 1.4,
  "phrom phong": 1.45, "thonglor": 1.5, "ekkamai": 1.25, "ari": 1.2, "nana": 1.15,
  "chatuchak": 0.9, "lat phrao": 0.85, "victory monument": 0.95,
  "ratchada": 0.95, "on nut": 0.95, "udomsuk": 0.9,
  "phuket": 1.2, "koh samui": 1.25, "pattaya": 0.85, "hua hin": 0.85, "cha-am": 0.8,
  "chiang mai": 0.55, "chiang rai": 0.5,
};

type EstimateRefine = "none" | "type" | "area" | "full";
type Estimate = { mid: number; low: number; high: number; refine: EstimateRefine };

function roundK(n: number): number {
  return Math.max(1000, Math.round(n / 1000) * 1000);
}

function computeEstimate(
  typeId: number | null,
  bedrooms: number | null,
  area: string,
  hasFeature: boolean,
): Estimate {
  // No type yet → market-wide range
  if (typeId == null) {
    return { mid: 35000, low: 8000, high: 180000, refine: "none" };
  }
  const base = BASE_BY_TYPE[typeId];
  const bMult = bedrooms != null ? (BED_MULT[bedrooms] ?? 1) : 1;
  const areaKey = area.trim().toLowerCase();
  const aMult = AREA_MULT[areaKey] ?? 1;
  const knownArea = aMult !== 1;
  const fMult = hasFeature ? 1.08 : 1;
  const mid = base * bMult * aMult * fMult;

  // Band tightens as more signals come in
  let lowMult = 0.55;
  let highMult = 1.6;
  if (bedrooms != null) { lowMult = 0.68; highMult = 1.4; }
  if (knownArea) { lowMult += 0.1; highMult -= 0.12; }
  if (hasFeature)  { lowMult += 0.03; highMult -= 0.03; }

  const refine: EstimateRefine = knownArea ? "full" : bedrooms != null ? "area" : "type";
  return {
    mid:  roundK(mid),
    low:  roundK(mid * lowMult),
    high: roundK(mid * highMult),
    refine,
  };
}

function fmtThb(n: number): string {
  if (n >= 1000) return `฿${Math.round(n / 1000)}k`;
  return `฿${n}`;
}
function fmtThbFull(n: number): string {
  return "฿" + Math.round(n).toLocaleString();
}

function EarningsDisplay({ estimate }: { estimate: Estimate }) {
  // Animate all three values together so range stays in sync with the big number.
  // Track the latest value in a ref so the tick callback always reads the freshest
  // "from" snapshot — otherwise rapid changes leave the tween stuck at stale state.
  const tweenRef = useRef({ mid: estimate.mid, low: estimate.low, high: estimate.high });
  const [tween, setTween] = useState(tweenRef.current);

  useEffect(() => {
    const from = { ...tweenRef.current };
    const to = { mid: estimate.mid, low: estimate.low, high: estimate.high };
    if (from.mid === to.mid && from.low === to.low && from.high === to.high) return;
    let frame: number;
    let start: number | null = null;
    const duration = 700;
    function tick(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const next = {
        mid:  Math.round(from.mid  + (to.mid  - from.mid)  * ease),
        low:  Math.round(from.low  + (to.low  - from.low)  * ease),
        high: Math.round(from.high + (to.high - from.high) * ease),
      };
      tweenRef.current = next;
      setTween(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [estimate.mid, estimate.low, estimate.high]);

  return (
    <div style={{ animation: "countUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
      <p className="text-3xl font-black text-white leading-none tabular-nums">
        {fmtThbFull(tween.mid)}
        <span className="text-white/40 text-sm font-bold ml-1.5">/mo</span>
      </p>
      <p className="text-[11px] text-white/55 mt-1.5">
        Range <span className="text-white/80 font-semibold tabular-nums">{fmtThb(tween.low)}–{fmtThb(tween.high)}</span>
        {estimate.refine === "none" && " · pick type to refine"}
        {estimate.refine === "type" && " · add bedrooms to refine"}
        {estimate.refine === "area" && " · add a known area to refine"}
        {estimate.refine === "full" && " · refining from your details"}
      </p>
      <p className="text-[10px] text-white/30 mt-1">
        * Estimate from similar listings. Set your own price when publishing.
      </p>
    </div>
  );
}

const PROPERTY_TYPES = [
  { id: 1, icon: "🏢", label: "Condo" },
  { id: 2, icon: "🏡", label: "House" },
  { id: 3, icon: "🏖️", label: "Villa" },
  { id: 4, icon: "🏠", label: "Studio" },
  { id: 5, icon: "🏘️", label: "Townhouse" },
  { id: 6, icon: "🏗️", label: "Other" },
];

const AREA_SUGGESTIONS = [
  "Sukhumvit", "Silom", "Sathorn", "Asok", "Phrom Phong", "Thonglor",
  "Ekkamai", "Ari", "Ratchada", "Chatuchak", "On Nut", "Udomsuk",
  "Lat Phrao", "Victory Monument", "Nana", "Pattaya", "Chiang Mai",
  "Hua Hin", "Phuket", "Koh Samui", "Chiang Rai", "Cha-am",
];

// Bangkok-area districts (city resolves to "Bangkok"). Standalone destinations resolve
// to themselves. Used by deriveLocation() to pre-fill the city on the next setup page.
const BANGKOK_DISTRICTS = new Set([
  "sukhumvit", "sathorn", "silom", "asok", "phrom phong", "thonglor",
  "ekkamai", "ari", "nana", "ratchada", "chatuchak", "on nut", "udomsuk",
  "lat phrao", "victory monument",
]);

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveLocation(area: string): { city: string; district?: string } {
  const key = area.trim().toLowerCase();
  if (!key) return { city: "" };
  if (BANGKOK_DISTRICTS.has(key)) return { city: "Bangkok", district: titleCase(area.trim()) };
  return { city: titleCase(area.trim()) };
}

/** Keep the user's currently-selected chip visible even if AI didn't propose it. */
function ensureSelectionVisible(list: string[], selected: string): string[] {
  if (!selected) return list;
  if (list.some((f) => f.toLowerCase() === selected.toLowerCase())) return list;
  return [selected, ...list].slice(0, 10);
}

// Title + features generation live in `lib/api/ai.api.ts`. Both hit the BFF AI gateway
// (Groq → Pollinations → template fallback) and degrade gracefully on 4xx/5xx, so
// callers can `await` / `useQuery` without try/catch.

export function PropertyCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createAsset = useCreateAsset();
  const { data: refs } = useReferences();

  const [typeId, setTypeId] = useState<number | null>(null);
  const [area, setArea] = useState("");
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [feature, setFeature] = useState("");

  // Name field — may be auto-suggested or hand-typed
  const [name, setName] = useState("");
  const [nameIsSuggested, setNameIsSuggested] = useState(false);
  const [titleProvider, setTitleProvider] = useState<"groq" | "pollinations" | "template" | null>(null);
  const [variation, setVariation] = useState(0);
  const [generated, setGenerated] = useState(false);  // did we auto-suggest at least once?
  const [generating, setGenerating] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const typeName = PROPERTY_TYPES.find((t) => t.id === typeId)?.label ?? "";
  const estimate = computeEstimate(typeId, bedrooms, area, !!feature);

  // Progressive reveal: area + bedrooms unlock generation
  const readyToGenerate = typeId !== null && area.trim().length >= 2 && bedrooms !== null;

  const areaSuggestions = area.trim()
    ? AREA_SUGGESTIONS.filter((a) => a.toLowerCase().startsWith(area.toLowerCase()) && a.toLowerCase() !== area.toLowerCase())
    : [];

  const canSubmit = name.trim().length > 0 && name.trim().length <= NAME_MAX && typeId !== null && !isPending;

  // 4 momentum steps: type → area → bedrooms → title. Title is the dopamine moment.
  const stepsTotal = 4;
  const stepsDone =
    (typeId !== null ? 1 : 0) +
    (area.trim().length >= 2 ? 1 : 0) +
    (bedrooms !== null ? 1 : 0) +
    (name.trim().length > 0 ? 1 : 0);
  const progressPct = (stepsDone / stepsTotal) * 100;
  const allDone = stepsDone === stepsTotal;

  // CTA copy adapts to the *next* missing step so the user never feels stuck.
  // The final CTA opens the *details* editor — publish happens later, after photos,
  // pricing, amenities, etc. are filled in.
  const ctaCopy =
    isPending           ? "Setting up your listing…"
    : typeId === null   ? "Pick a property type to start"
    : area.trim().length < 2 ? "Add a location to continue"
    : bedrooms === null ? "How many bedrooms?"
    : name.trim().length === 0 ? "Confirm the listing title"
    : "Continue — add the details →";

  function resolveRefTypeId(displayId: number): number {
    if (!refs?.unitTypes?.length) return displayId;
    const match = refs.unitTypes[displayId - 1];
    return match?.id ?? refs.unitTypes[0].id;
  }

  // Sequence guard — discard responses from stale requests if the user changed inputs
  // (or clicked "try another") while a previous call was still in flight.
  const suggestSeq = useRef(0);

  async function callSuggest(v: number) {
    if (!readyToGenerate) return;
    const seq = ++suggestSeq.current;
    setGenerating(true);
    try {
      const resp = await aiApi.suggestListingTitle({
        propertyType: typeName as AiPropertyType,
        area:         area.trim(),
        bedrooms:     bedrooms!,
        feature:      feature || undefined,
        variation:    v,
      });
      if (seq !== suggestSeq.current) return; // a newer request superseded us
      setName(resp.title);
      setTitleProvider(resp.provider);
      setNameIsSuggested(true);
      setGenerated(true);
    } finally {
      if (seq === suggestSeq.current) setGenerating(false);
    }
  }

  function doSuggest(nextVariation?: number) {
    void callSuggest(nextVariation ?? variation);
  }

  // Auto-suggest when inputs become ready, and re-suggest on input changes as long
  // as the user hasn't taken over the title field. Debounced so rapid edits (typing
  // in the area field) don't burn 30 requests against the per-user rate limit.
  useEffect(() => {
    if (!readyToGenerate) return;
    if (!nameIsSuggested && generated) return; // user is editing manually
    const t = setTimeout(() => { void callSuggest(variation); }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId, area, bedrooms, feature, variation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || typeId === null) return;
    setIsPending(true);
    try {
      const refTypeId = resolveRefTypeId(typeId);
      const { id } = await createAsset.mutateAsync({
        internalName: name.trim(),
        assetTypeId: refTypeId,
        bedrooms: bedrooms ?? 1,
        bathrooms: 1,
        beds: bedrooms ?? 1,
        maxOccupancy: (bedrooms ?? 1) * 2,
      });

      const firstCategory = refs?.propertyCategories?.[0]?.id ?? 1;
      await listingsApi.create({
        assetId: id,
        title: name.trim(),
        description: "",
        houseRules: "",
        wifiName: "",
        wifiPassword: "",
        propertyCategoryId: firstCategory,
        instantBookEnabled: false,
        basePrice: 0,
        baseMonthlyRate: 0,
        depositAmount: undefined,
      });
      qc.invalidateQueries({ queryKey: ["listings"] });
      // Pre-fill the location step on the next page so the host doesn't re-enter the city
      try {
        const loc = deriveLocation(area);
        if (loc.city) {
          localStorage.setItem(
            `siamo_pending_location_${id}`,
            JSON.stringify({ city: loc.city, district: loc.district, rawArea: area.trim() }),
          );
        }
      } catch { /* localStorage may be unavailable in private browsing */ }
      navigate(`/me/host/properties/${id}`);
    } catch {
      toast.error("Failed to create property");
      setIsPending(false);
    }
  }

  // Step-readiness flags for right-column reveal & locked-state messaging
  const areaReady     = typeId !== null && area.trim().length >= 2;
  const bedroomsReady = areaReady && bedrooms !== null;
  const lockedHint    = (msg: string) => (
    <div className="h-11 rounded-xl border-2 border-dashed border-border/70 bg-bg-subtle/40 flex items-center justify-center px-4 text-xs text-fg-subtle">
      {msg}
    </div>
  );

  // AI-curated feature chips. Cached server-side for 60 min; mirror that on the client.
  const featuresQuery = useQuery({
    queryKey: ["ai-features", typeName, area.trim().toLowerCase(), bedrooms],
    queryFn: () => aiApi.suggestFeatures({
      propertyType: typeName as AiPropertyType,
      area:         area.trim(),
      bedrooms:     bedrooms!,
    }),
    enabled:   bedroomsReady,
    staleTime: 60 * 60 * 1000,
    gcTime:    60 * 60 * 1000,
  });

  return (
    <>
      <style>{ANIM}</style>
      <div className="bg-bg flex justify-center px-4 pt-4 pb-10 lg:pt-6">
        <div className="w-full max-w-md lg:max-w-5xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-10 lg:items-start fade-up">

            {/* ───────────────────── LEFT COLUMN ───────────────────── */}
            <div className="space-y-5 lg:sticky lg:top-8 self-start">

              {/* Hero card */}
              <div
                className="rounded-3xl px-7 py-7 relative overflow-hidden"
                style={{ background: "linear-gradient(150deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)" }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(99,102,241,0.2) 0%, transparent 70%)",
                }} />
                <div className="relative">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">
                    Estimated rent
                  </p>
                  <EarningsDisplay estimate={estimate} />
                  <div className="mt-5 flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {["🇮🇩","🇺🇸","🇯🇵","🇷🇺","🇨🇭"].map((f, i) => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-indigo-900 bg-indigo-800 flex items-center justify-center text-xs">{f}</div>
                      ))}
                    </div>
                    <p className="text-xs text-white/50">
                      <span className="text-white/80 font-semibold">200+ tenants</span> looking in Thailand right now
                    </p>
                  </div>
                </div>
              </div>

              {/* Property type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-fg">Property type</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROPERTY_TYPES.map((pt) => {
                    const selected = typeId === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => setTypeId(pt.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all duration-200 text-center",
                          selected
                            ? "border-fg bg-fg text-white scale-[1.04] shadow-lg"
                            : "border-border hover:border-fg-subtle hover:scale-[1.02]",
                        )}
                      >
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                            <Check size={9} strokeWidth={3} className="text-fg" />
                          </div>
                        )}
                        <span className="text-xl">{pt.icon}</span>
                        <span className={cn("text-xs font-medium leading-tight", selected ? "text-white" : "text-fg")}>
                          {pt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* ───────────────────── RIGHT COLUMN ───────────────────── */}
            <div className="space-y-5">

              {/* Where is it? */}
              <div className="space-y-2 relative">
                <label className={cn(
                  "text-sm font-semibold transition-colors",
                  typeId !== null ? "text-fg" : "text-fg-muted/70",
                )}>Where is it?</label>
                {typeId === null ? (
                  lockedHint("Pick a property type first")
                ) : (
                  <>
                    <Input
                      placeholder="e.g. Sukhumvit, Silom, Chiang Mai…"
                      value={area}
                      onChange={(e) => {
                        setArea(e.target.value);
                        setShowAreaSuggestions(true);
                      }}
                      onFocus={() => setShowAreaSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 150)}
                      className="h-11 text-base rounded-xl fade-up"
                      autoComplete="off"
                    />
                    {showAreaSuggestions && areaSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-[calc(100%-2px)] bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                        {areaSuggestions.slice(0, 5).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={() => { setArea(s); setShowAreaSuggestions(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-subtle text-fg transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bedrooms */}
              <div className="space-y-2">
                <label className={cn(
                  "text-sm font-semibold transition-colors",
                  areaReady ? "text-fg" : "text-fg-muted/70",
                )}>
                  Bedrooms
                </label>
                {!areaReady ? (
                  lockedHint(typeId === null ? "Pick a property type first" : "Add a location first")
                ) : (
                  <div className="flex gap-2 fade-up">
                    {[
                      { value: 0, label: "Studio" },
                      { value: 1, label: "1" },
                      { value: 2, label: "2" },
                      { value: 3, label: "3" },
                      { value: 4, label: "4" },
                      { value: 5, label: "5+" },
                    ].map(({ value, label }) => {
                      const sel = bedrooms === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setBedrooms(value)}
                          className={cn(
                            "flex-1 h-9 rounded-xl text-sm font-semibold border-2 transition-all duration-150",
                            sel
                              ? "border-fg bg-fg text-white"
                              : "border-border hover:border-fg-subtle text-fg",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Standout feature — AI-curated */}
              <div className="space-y-2">
                <label className={cn(
                  "text-sm font-semibold flex items-center gap-2 transition-colors",
                  bedroomsReady ? "text-fg" : "text-fg-muted/70",
                )}>
                  Standout feature
                  <span className={cn("font-normal", bedroomsReady ? "text-fg-muted" : "text-fg-muted/60")}>(optional)</span>
                  {bedroomsReady && (() => {
                    const provider = featuresQuery.data?.provider;
                    const isLoading = featuresQuery.isFetching && !featuresQuery.data;
                    if (isLoading) {
                      return (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold ai-shimmer">
                          <Loader2 size={9} className="animate-spin" />curating for your spot…
                        </span>
                      );
                    }
                    if (provider === "groq" || provider === "pollinations") {
                      return (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold ai-shimmer">
                          <Sparkles size={9} />AI-curated for {area.trim()}
                        </span>
                      );
                    }
                    return (
                      <span className="ml-auto text-[10px] font-medium text-fg-muted">
                        tailored to {area.trim()}
                      </span>
                    );
                  })()}
                </label>
                {!bedroomsReady ? (
                  lockedHint("Pick bedrooms to see suggestions")
                ) : featuresQuery.isFetching && !featuresQuery.data ? (
                  <div className="flex flex-wrap gap-2 min-h-[2.25rem]">
                    {[...Array(6)].map((_, i) => (
                      <span
                        key={i}
                        className="h-7 rounded-full bg-bg-subtle animate-pulse"
                        style={{ width: `${60 + ((i * 17) % 50)}px` }}
                      />
                    ))}
                  </div>
                ) : (() => {
                  const chips = ensureSelectionVisible(featuresQuery.data?.features ?? [], feature);
                  return (
                    <div className="flex flex-wrap gap-2 fade-up min-h-[2.25rem]">
                      {chips.map((f) => {
                        const sel = feature === f;
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFeature(sel ? "" : f)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                              sel
                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                : "border-border text-fg-muted hover:border-fg-subtle hover:text-fg",
                            )}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Listing title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={cn(
                    "text-sm font-semibold transition-colors",
                    bedroomsReady ? "text-fg" : "text-fg-muted/70",
                  )}>Listing title</label>
                  {bedroomsReady && (nameIsSuggested || generating) && (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] font-semibold ai-shimmer">
                        {generating
                          ? <><Loader2 size={10} className="animate-spin" />AI is drafting…</>
                          : titleProvider === "template"
                            ? <><Sparkles size={10} />Suggested</>
                            : <><Sparkles size={10} />AI-generated</>}
                      </span>
                      {!generating && (
                        <button
                          type="button"
                          onClick={() => { const v = variation + 1; setVariation(v); doSuggest(v); }}
                          className="text-[11px] text-fg-muted hover:text-fg flex items-center gap-1 transition-colors"
                          title="Try another"
                        >
                          <RefreshCw size={10} />try another
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {!bedroomsReady ? (
                  lockedHint("Complete the basics — we'll draft a title")
                ) : (
                  <>
                    <div className="relative fade-up">
                      <Input
                        ref={nameRef}
                        placeholder="Type your listing title…"
                        value={name}
                        maxLength={NAME_MAX}
                        onChange={(e) => {
                          setName(e.target.value);
                          setNameIsSuggested(false);
                        }}
                        className={cn(
                          "h-11 text-base rounded-xl pr-14 transition-all duration-200",
                          nameIsSuggested ? "border-indigo-300 focus-visible:ring-indigo-300" : "",
                        )}
                      />
                      <span className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tabular-nums pointer-events-none",
                        name.length > NAME_MAX - 10 ? "text-warning" : "text-fg-subtle",
                      )}>
                        {name.length}/{NAME_MAX}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">
                      {nameIsSuggested
                        ? "We've drafted this from your details — edit anything you like."
                        : name.trim().length === 0
                          ? "Keep it short — this is what tenants see first."
                          : "Looks good. This is what tenants see in the marketplace."}
                    </p>
                  </>
                )}
              </div>

              {/* Progress + CTA */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        allDone
                          ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"
                          : "bg-fg",
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[11px] font-semibold tabular-nums shrink-0 transition-colors",
                    allDone ? "text-indigo-500" : "text-fg-muted",
                  )}>
                    {allDone ? "Ready ✨" : `${stepsDone}/${stepsTotal}`}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    "relative w-full h-14 rounded-2xl text-white font-bold text-base overflow-hidden",
                    "transition-all duration-300",
                    canSubmit
                      ? "btn-pulse btn-sheen scale-100 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      : "cursor-not-allowed",
                  )}
                  style={canSubmit
                    ? {
                        background: "linear-gradient(110deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)",
                        boxShadow: "0 8px 28px rgba(99,102,241,0.45), 0 2px 6px rgba(124,58,237,0.3)",
                      }
                    : stepsDone > 0
                      ? {
                          background: `linear-gradient(110deg, rgba(79,70,229,${0.25 + 0.15 * stepsDone}), rgba(124,58,237,${0.25 + 0.15 * stepsDone}))`,
                          boxShadow: `0 2px 12px rgba(99,102,241,${0.1 + 0.05 * stepsDone})`,
                        }
                      : { background: "#9ca3af" }
                  }
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {ctaCopy}
                    {allDone && !isPending && <Sparkles size={16} className="animate-pulse" />}
                  </span>
                </button>

                <p className="text-center text-xs text-fg-muted">
                  {allDone
                    ? "Almost set up — next we'll add photos, price, and amenities"
                    : "Takes 2 minutes · No upfront cost · You set the final price"}
                </p>
              </div>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
