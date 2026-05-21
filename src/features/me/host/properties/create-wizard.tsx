import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AmenityToggleGrid } from "@/components/amenity-toggle-grid";
import { useCreateAsset } from "@/lib/hooks/use-assets";
import { useCreateListing } from "@/lib/hooks/use-listings";
import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { listingsApi } from "@/lib/api/listings.api";
import { RentalType } from "@/lib/types/enums";
import { cn } from "@/lib/utils/cn";

type HousePhase = 0 | 1 | 2 | 3;

// ─── CSS animations ───────────────────────────────────────────────────────────
const ANIM_CSS = `
  @keyframes wizardSlideRight {
    from { opacity: 0; transform: translateX(48px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes wizardSlideLeft {
    from { opacity: 0; transform: translateX(-48px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes wizardFadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes wizardPop {
    0%   { opacity: 0; transform: scale(0.85); }
    70%  { transform: scale(1.04); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes wizardCheckPop {
    0%   { opacity: 0; transform: scale(0) rotate(-20deg); }
    60%  { transform: scale(1.2) rotate(5deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes wizardCounterBounce {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.18); }
    100% { transform: scale(1); }
  }
  @keyframes wizardBarFlash {
    0%   { opacity: 1; }
    40%  { opacity: 0.5; filter: brightness(1.4); }
    100% { opacity: 1; }
  }
  @keyframes wizardEarnings {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .wizard-slide-right    { animation: wizardSlideRight 0.38s cubic-bezier(0.22,1,0.36,1) both; }
  .wizard-slide-left     { animation: wizardSlideLeft  0.38s cubic-bezier(0.22,1,0.36,1) both; }
  .wizard-fade-up        { animation: wizardFadeUp     0.5s  cubic-bezier(0.22,1,0.36,1) both; }
  .wizard-pop            { animation: wizardPop        0.5s  cubic-bezier(0.22,1,0.36,1) both; }
  .wizard-check-pop      { animation: wizardCheckPop   0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
  .wizard-earnings       { animation: wizardEarnings   0.4s  cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes spark-fly {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    100% { transform: translate(var(--sx),var(--sy)) scale(0); opacity: 0; }
  }
  @keyframes live-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
    50%      { box-shadow: 0 0 0 5px rgba(52,211,153,0); }
  }
`;

// ─── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 108, label, sublabel }: {
  pct: number; size?: number; label: string; sublabel?: string;
}) {
  const [fill, setFill] = useState(0);
  useEffect(() => { const t = setTimeout(() => setFill(pct), 120); return () => clearTimeout(t); }, [pct]);
  const sw = 2.5;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - fill);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.1)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.85)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="flex flex-col items-center justify-center relative z-10">
        <span className="font-black text-white leading-none" style={{ fontSize: size * 0.24 }}>{label}</span>
        {sublabel && <span className="text-white/40 mt-1 leading-none" style={{ fontSize: size * 0.11 }}>{sublabel}</span>}
      </div>
    </div>
  );
}


// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ label, sub, value, min = 0, onChange }: {
  label: string; sub?: string; value: number; min?: number; onChange: (v: number) => void;
}) {
  const [bump, setBump] = useState(false);
  function fire(next: number) {
    onChange(next);
    setBump(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setBump(true)));
    setTimeout(() => setBump(false), 280);
  }
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-none">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {sub && <p className="text-xs text-fg-muted mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fire(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-9 h-9 rounded-full border-2 border-border flex items-center justify-center text-fg-muted hover:border-fg hover:text-fg active:scale-90 disabled:opacity-30 transition-all text-lg leading-none"
        >−</button>
        <span
          key={value}
          className="text-base font-semibold text-fg w-6 text-center tabular-nums"
          style={bump ? { animation: "wizardCounterBounce 0.28s cubic-bezier(0.34,1.56,0.64,1) both" } : {}}
        >{value}</span>
        <button
          type="button"
          onClick={() => fire(value + 1)}
          className="w-9 h-9 rounded-full border-2 border-border flex items-center justify-center text-fg-muted hover:border-fg hover:text-fg active:scale-90 transition-all text-lg leading-none"
        >+</button>
      </div>
    </div>
  );
}

// ─── Amenities step ───────────────────────────────────────────────────────────
function WizardAmenities({ listingId }: { listingId: string }) {
  const qc = useQueryClient();
  const { data: amenityDefs, isLoading } = useAmenities();
  const { data: categories } = useAmenityCategories();
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [presentSet, setPresentSet] = useState<Set<number>>(new Set());

  async function onToggle(id: number, isPresent: boolean) {
    const newSet = new Set(presentSet);
    if (!isPresent) newSet.add(id); else newSet.delete(id);
    setPresentSet(newSet);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await listingsApi.updateAmenities(listingId, (amenityDefs ?? []).map((d) => ({
        amenityId: d.id as number, isPresent: newSet.has(d.id as number),
      })));
      qc.invalidateQueries({ queryKey: ["listings"] });
    } catch {
      setPresentSet(presentSet);
      toast.error("Failed to update amenity");
    } finally {
      setPending((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  if (isLoading) return <p className="text-sm text-fg-muted py-8 text-center">Loading amenities…</p>;
  if (!amenityDefs?.length) return <p className="text-sm text-fg-muted">No amenities configured.</p>;

  return (
    <AmenityToggleGrid
      amenities={amenityDefs}
      categories={categories}
      presentSet={presentSet}
      pending={pending}
      onToggle={onToggle}
      compact
    />
  );
}

// ─── Property types ───────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  { id: 1, icon: "🏢", label: "Apartment / Condo", description: "Unit in a multi-story building" },
  { id: 2, icon: "🏡", label: "House",             description: "Standalone residential property" },
  { id: 3, icon: "🏖️", label: "Villa",             description: "Luxury property, often with pool" },
  { id: 4, icon: "🏠", label: "Studio",            description: "Open-plan single room" },
  { id: 5, icon: "🏘️", label: "Townhouse",         description: "Multi-floor terraced house" },
  { id: 6, icon: "🏗️", label: "Other",             description: "Commercial or other type" },
];

// ─── Phase metadata ───────────────────────────────────────────────────────────
const PHASES = [
  { label: "About your place",  steps: 2 },
  { label: "Make it shine",     steps: 2 },
  { label: "Finish up",         steps: 1 },
] as const;

const TOTAL_STEPS = PHASES.reduce((s, p) => s + p.steps, 0); // 5

// step → phase index
function stepToPhase(step: number): number {
  if (step < 2) return 0;
  if (step < 4) return 1;
  return 2;
}

// ─── Phase transition screen ──────────────────────────────────────────────────
const TRANSITION_CONTENT = [
  {
    heading: "Great start!",
    sub: "Now let's add a few more details to make your listing stand out.",
    builtPhase: 0 as HousePhase,
    animating: 1 as HousePhase,
  },
  {
    heading: "Almost there!",
    sub: "One last step — tell guests what your place has to offer.",
    builtPhase: 1 as HousePhase,
    animating: 2 as HousePhase,
  },
];

function PhaseTransitionScreen({
  phase,
  onContinue,
  isCreating,
}: {
  phase: 0 | 1;
  onContinue: () => void;
  isCreating?: boolean;
}) {
  const content = TRANSITION_CONTENT[phase];
  const stats = phase === 0
    ? [{ emoji: "🏠", label: "Type chosen" }, { emoji: "🛏", label: "Rooms set" }]
    : [{ emoji: "✏️", label: "Title ready" }, { emoji: "💰", label: "Price set" }];

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-6 text-center">
      {/* Dark hero card */}
      <div
        className="wizard-pop w-full max-w-sm rounded-3xl px-8 pt-10 pb-8 mb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e1b4b 55%,#0f172a 100%)" }}
      >
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(99,102,241,0.18) 0%, transparent 70%)",
        }} />
        {/* Progress ring */}
        <div className="relative flex justify-center mb-6 wizard-pop">
          <ProgressRing
            pct={(phase + 1) / 3}
            size={112}
            label={`${phase + 1}/3`}
            sublabel="phases done"
          />
        </div>
        {/* Completed stats */}
        <div className="flex justify-center gap-3 relative">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 wizard-fade-up" style={{ animationDelay: "0.5s" }}>
              <span className="text-sm">{s.emoji}</span>
              <span className="text-xs font-medium text-white/80">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-bold text-fg mb-2 wizard-fade-up" style={{ animationDelay: "0.4s" }}>
        {content.heading}
      </h2>
      <p className="text-fg-muted text-sm max-w-xs mb-8 wizard-fade-up" style={{ animationDelay: "0.55s" }}>
        {content.sub}
      </p>
      <div className="wizard-fade-up" style={{ animationDelay: "0.7s" }}>
        <button
          type="button"
          onClick={onContinue}
          disabled={isCreating}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
          style={{ background: "linear-gradient(110deg,#4f46e5,#7c3aed,#6366f1)" }}
        >
          {isCreating ? "Creating…" : "Continue"} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Intro screen ─────────────────────────────────────────────────────────────
function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-16 px-6 text-center">
      {/* Dark intro card */}
      <div
        className="wizard-pop w-full max-w-sm rounded-3xl px-8 py-10 mb-8 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e1b4b 55%,#0f172a 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(99,102,241,0.15) 0%, transparent 70%)",
        }} />
        {/* 3-step track */}
        <div className="relative flex items-center justify-center gap-0 mb-6">
          {["01", "02", "03"].map((n, i) => (
            <div key={n} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-white/50 tabular-nums">{n}</span>
                </div>
              </div>
              {i < 2 && <div className="w-12 h-px bg-white/15 mx-1" />}
            </div>
          ))}
        </div>
        <div className="relative space-y-2">
          {[
            { n: "01", t: "Your property",  d: "Type, size, and basics" },
            { n: "02", t: "Make it shine",  d: "Name, description & price" },
            { n: "03", t: "Amenities",      d: "What your place offers" },
          ].map((item) => (
            <div key={item.n} className="flex items-center gap-3 text-left py-2 border-b border-white/8 last:border-none">
              <span className="text-xs font-mono text-white/30 w-6 shrink-0">{item.n}</span>
              <div>
                <p className="text-sm font-semibold text-white/90">{item.t}</p>
                <p className="text-xs text-white/40">{item.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h1 className="text-3xl font-bold text-fg mb-3 wizard-fade-up" style={{ animationDelay: "0.5s" }}>
        List in minutes.
      </h1>
      <p className="text-fg-muted max-w-sm mb-10 wizard-fade-up" style={{ animationDelay: "0.65s" }}>
        Three steps. That's all it takes to go live.
      </p>
      <div className="wizard-fade-up" style={{ animationDelay: "0.8s" }}>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 px-10 py-3 rounded-full text-white font-semibold text-base"
          style={{ background: "linear-gradient(110deg,#4f46e5,#7c3aed,#6366f1)" }}
        >
          Get started <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ title, assetId, onDone }: {
  title: string;
  assetId: string;
  onDone: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-6 text-center">
      {/* Dark celebration hero */}
      <div
        className="wizard-pop w-full max-w-sm rounded-3xl px-8 pt-10 pb-8 mb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#052e16 0%,#14532d 55%,#0d2818 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(34,197,94,0.18) 0%, transparent 70%)",
        }} />
        {/* Progress ring — 100% */}
        <div className="relative flex justify-center mb-6 wizard-pop">
          <div className="relative flex items-center justify-center" style={{ width: 112, height: 112 }}>
            <svg width={112} height={112} style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}>
              <circle cx={56} cy={56} r={53} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2.5} />
              <circle cx={56} cy={56} r={53} fill="none"
                stroke="rgba(134,239,172,0.85)" strokeWidth={2.5} strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 53}
                strokeDashoffset={0}
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
            </svg>
            <span className="relative z-10 text-2xl font-black text-white">✓</span>
          </div>
        </div>
        {/* Stats row */}
        <div className="relative flex justify-center gap-3 wizard-fade-up" style={{ animationDelay: "0.5s" }}>
          {[{ emoji: "🏠", label: "Created" }, { emoji: "📋", label: "Amenities set" }, { emoji: "🚀", label: "Ready to publish" }].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="text-base">{s.emoji}</span>
              <span className="text-xs text-white/50">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-bold text-fg mb-2 wizard-fade-up" style={{ animationDelay: "0.35s" }}>
        {title} is ready.
      </h2>
      <p className="text-fg-muted text-sm mb-8 wizard-fade-up" style={{ animationDelay: "0.5s" }}>
        Add photos and publish to start receiving booking requests.
      </p>
      <div className="flex gap-3 wizard-fade-up" style={{ animationDelay: "0.65s" }}>
        <button
          type="button"
          onClick={onDone}
          className="px-6 py-2.5 rounded-full border border-border text-sm font-medium text-fg-muted hover:text-fg hover:border-fg transition-colors"
        >
          Back to list
        </button>
        <button
          type="button"
          onClick={() => navigate(`/me/host/properties/${assetId}`)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold text-sm"
          style={{ background: "linear-gradient(110deg,#4f46e5,#7c3aed,#6366f1)" }}
        >
          Open property <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
type Screen = "intro" | "steps" | "transition0" | "transition1" | "success";

export function PropertyCreateWizard() {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const createListing = useCreateListing();

  const [screen, setScreen] = useState<Screen>("intro");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"right" | "left">("right");
  const [animKey, setAnimKey] = useState(0);

  // Form state
  const [propertyType, setPropertyType] = useState<typeof PROPERTY_TYPES[0] | null>(null);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [maxOccupancy, setMaxOccupancy] = useState(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [baseMonthlyRate, setBaseMonthlyRate] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [createdAssetId, setCreatedAssetId] = useState<string | null>(null);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  const isSubmitting = createAsset.isPending || createListing.isPending;

  const priceValid = baseMonthlyRate > 0;

  function canProceed(): boolean {
    if (step === 0) return !!propertyType;
    if (step === 2) return !!title.trim();
    if (step === 3) return priceValid;
    return true;
  }

  function goToStep(next: number, dir: "right" | "left") {
    setDirection(dir);
    setAnimKey((k) => k + 1);
    setStep(next);
  }

  async function handleNext() {
    // step 1 → transition to phase 2
    if (step === 1) {
      setScreen("transition0");
      return;
    }
    // step 3 → API call → transition to phase 3
    if (step === 3) {
      try {
        const asset = await createAsset.mutateAsync({
          internalName: title.trim(),
          assetTypeId: propertyType!.id,
          maxOccupancy,
          bedrooms,
          beds,
          bathrooms,
        });
        const listing = await createListing.mutateAsync({
          assetId: asset.id,
          title: title.trim(),
          description: description.trim() || title.trim(),
          houseRules: houseRules.trim() || "Standard house rules apply.",
          wifiName: wifiName.trim(),
          wifiPassword: wifiPassword.trim(),
          propertyCategoryId: 1,
          instantBookEnabled: false,
          rentalType: RentalType.LongTerm,
          basePrice: Math.round(baseMonthlyRate / 30),
          baseMonthlyRate,
          depositAmount,
        });
        setCreatedAssetId(asset.id);
        setCreatedListingId(listing.id);
        setScreen("transition1");
      } catch {
        toast.error("Failed to create property");
      }
      return;
    }
    // step 4 (amenities) → success
    if (step === 4) {
      setScreen("success");
      return;
    }
    goToStep(step + 1, "right");
  }

  function handleBack() {
    if (step === 0) { setScreen("intro"); return; }
    if (step === 2) { setScreen("transition0"); return; }
    if (step === 4) { setScreen("transition1"); return; }
    goToStep(step - 1, "left");
  }

  // Progress bar: show per-step progress out of total
  const progressPct = screen === "intro" ? 0
    : screen === "success" ? 100
    : screen === "transition0" ? Math.round((2 / TOTAL_STEPS) * 100)
    : screen === "transition1" ? Math.round((4 / TOTAL_STEPS) * 100)
    : Math.round(((step + 1) / TOTAL_STEPS) * 100);

  const currentPhase = stepToPhase(step);
  void (step < 2 ? 0 : step < 4 ? 1 : step < 5 ? 2 : 3);

  const stepAnimClass = direction === "right" ? "wizard-slide-right" : "wizard-slide-left";

  return (
    <>
      <style>{ANIM_CSS}</style>

      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 bg-bg flex flex-col overflow-hidden">

        {/* ── Top bar ── */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 shrink-0">
          {/* Back / step navigation */}
          <button
            type="button"
            onClick={() => {
              if (screen === "intro" || screen === "success") navigate("/me/host/properties");
              else if (screen.startsWith("transition")) setScreen("steps");
              else handleBack();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Progress bar */}
          {screen !== "intro" && screen !== "success" && (
            <div className="flex-1 mx-6 h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-fg rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
          {(screen === "intro" || screen === "success") && <div className="flex-1" />}

          {/* Close — always exits the wizard */}
          <button
            type="button"
            onClick={() => navigate("/me/host/properties")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* INTRO */}
          {screen === "intro" && (
            <div className="min-h-full">
              <IntroScreen onStart={() => { setStep(0); setScreen("steps"); }} />
            </div>
          )}

          {/* TRANSITION 0 (phase 1 → 2) */}
          {screen === "transition0" && (
            <div className="min-h-full">
              <PhaseTransitionScreen
                phase={0}
                onContinue={() => { goToStep(2, "right"); setScreen("steps"); }}
              />
            </div>
          )}

          {/* TRANSITION 1 (phase 2 → 3) */}
          {screen === "transition1" && (
            <div className="min-h-full">
              <PhaseTransitionScreen
                phase={1}
                isCreating={isSubmitting}
                onContinue={() => { goToStep(4, "right"); setScreen("steps"); }}
              />
            </div>
          )}

          {/* SUCCESS */}
          {screen === "success" && createdAssetId && (
            <div className="min-h-full">
              <SuccessScreen
                title={title}
                assetId={createdAssetId}
                onDone={() => navigate("/me/host/properties")}
              />
            </div>
          )}

          {/* STEPS */}
          {screen === "steps" && (
            <div className="max-w-xl mx-auto px-4 md:px-8 py-8 md:py-12">

              {/* Step header — phase label + prominent step counter */}
              <div key={`hdr-${step}`} className={cn(stepAnimClass, "flex items-center justify-between mb-1")}>
                <p className="text-xs font-bold text-fg-muted uppercase tracking-widest">
                  {PHASES[currentPhase].label}
                </p>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-500"
                      style={i < step
                        ? { width: 8, height: 8, background: "var(--color-primary)", opacity: .45 }
                        : i === step
                        ? { width: 22, height: 8, background: "var(--color-primary)" }
                        : { width: 8, height: 8, background: "var(--color-border)" }}
                    />
                  ))}
                </div>
              </div>

              {/* Step content */}
              <div key={`step-${animKey}`} className={stepAnimClass}>

                {/* ── Step 0: Property type ── */}
                {step === 0 && (
                  <div>
                    <h1 className="text-2xl font-bold text-fg mb-1 mt-2">What kind of property is it?</h1>
                    <p className="text-sm text-fg-muted mb-6">This helps categorize it in your portfolio.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PROPERTY_TYPES.map((pt, i) => {
                        const selected = propertyType?.id === pt.id;
                        return (
                          <button
                            key={pt.id}
                            type="button"
                            onClick={() => setPropertyType(pt)}
                            className={cn(
                              "relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-200",
                              selected
                                ? "border-fg bg-fg shadow-md scale-[1.03]"
                                : "border-border hover:border-fg-subtle hover:shadow-sm hover:scale-[1.01]",
                            )}
                            style={{ animationDelay: `${i * 0.05}s` }}
                          >
                            {/* Checkmark badge */}
                            {selected && (
                              <div className="wizard-check-pop absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                <Check size={11} strokeWidth={3} className="text-fg" />
                              </div>
                            )}
                            <span className="text-3xl">{pt.icon}</span>
                            <div>
                              <p className={cn("text-sm font-semibold leading-snug", selected ? "text-white" : "text-fg")}>{pt.label}</p>
                              <p className={cn("text-xs mt-0.5 leading-snug", selected ? "text-white/60" : "text-fg-muted")}>{pt.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 1: Basics ── */}
                {step === 1 && (
                  <div>
                    <h1 className="text-2xl font-bold text-fg mb-1 mt-2">Share the basics</h1>
                    <p className="text-sm text-fg-muted mb-6">You can update these anytime from the property page.</p>
                    <div className="bg-bg-card rounded-2xl shadow-card px-5">
                      <Counter label="Bedrooms" value={bedrooms} min={0} onChange={setBedrooms} />
                      <Counter label="Beds"     value={beds}     min={1} onChange={setBeds} />
                      <Counter label="Bathrooms" value={bathrooms} min={1} onChange={setBathrooms} />
                      <Counter
                        label="Maximum guests"
                        sub="Including all guests"
                        value={maxOccupancy}
                        min={1}
                        onChange={setMaxOccupancy}
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Title & description ── */}
                {step === 2 && (
                  <div>
                    <h1 className="text-2xl font-bold text-fg mb-1 mt-2">Give your place a title</h1>
                    <p className="text-sm text-fg-muted mb-6">A clear title helps identify it across your portfolio.</p>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">Property name *</Label>
                        <Input
                          placeholder="e.g. Baan Rim Nam Villa, Unit 4A"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          autoFocus
                          className="text-base"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">Description</Label>
                        <Textarea
                          placeholder="Describe the property, its surroundings, what makes it special…"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Price + WiFi + Rules ── */}
                {step === 3 && (
                  <div>
                    <h1 className="text-2xl font-bold text-fg mb-1 mt-2">Name your price</h1>
                    <p className="text-sm text-fg-muted mb-6">Monthly rent for furnished mid-term stays. You can adjust anytime.</p>
                    <div className="space-y-5">

                      {/* Monthly rate input */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">Monthly rent (฿) *</Label>
                        <Input
                          type="number"
                          value={baseMonthlyRate || ""}
                          onChange={(e) => setBaseMonthlyRate(Number(e.target.value))}
                          placeholder="e.g. 25,000"
                          min={1}
                          autoFocus
                          className="text-base"
                        />
                      </div>

                      {/* Live earnings preview */}
                      {baseMonthlyRate > 0 && (() => {
                        const fmt = (n: number) =>
                          "฿" + Math.round(n).toLocaleString();
                        return (
                          <div
                            key={`earn-${baseMonthlyRate}`}
                            className="rounded-2xl overflow-hidden"
                            style={{ animation: "wizardEarnings .35s cubic-bezier(.22,1,.36,1) both" }}
                          >
                            <div className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/60"
                              style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e293b 100%)" }}>
                              Your earning potential
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-white/10"
                              style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e293b 100%)" }}>
                              {([
                                { label: "3 months", mult: 3 },
                                { label: "6 months", mult: 6 },
                                { label: "12 months", mult: 12 },
                              ] as const).map(({ label, mult }) => (
                                <div key={mult} className="flex flex-col items-center py-4 gap-0.5">
                                  <span className="text-lg font-black text-white leading-none">
                                    {fmt(baseMonthlyRate * mult)}
                                  </span>
                                  <span className="text-xs text-white/45 mt-1">{label}</span>
                                </div>
                              ))}
                            </div>
                            <div className="px-4 py-2.5 flex items-center gap-2"
                              style={{ background: "linear-gradient(160deg,#052e16 0%,#14532d 100%)" }}>
                              <span className="text-xs text-emerald-300/80">
                                Similar listings in this area earn around this range
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Security deposit */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">Security deposit (฿)</Label>
                        <Input
                          type="number"
                          value={depositAmount || ""}
                          onChange={(e) => setDepositAmount(Number(e.target.value))}
                          placeholder={baseMonthlyRate ? `e.g. ${(baseMonthlyRate * 2).toLocaleString()}` : "e.g. 50,000"}
                          min={0}
                          className="text-base"
                        />
                        <p className="text-xs text-fg-muted">Typically 1–2 months rent. Collected at booking.</p>
                      </div>

                      {/* WiFi */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-fg">WiFi name</Label>
                          <Input placeholder="Network name" value={wifiName} onChange={(e) => setWifiName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-fg">WiFi password</Label>
                          <Input placeholder="Password" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} />
                        </div>
                      </div>

                      {/* House rules */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">House rules</Label>
                        <Textarea
                          placeholder="No smoking indoors, quiet hours after 10 pm…"
                          value={houseRules}
                          onChange={(e) => setHouseRules(e.target.value)}
                          className="min-h-[70px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Amenities ── */}
                {step === 4 && createdListingId && (
                  <div>
                    <h1 className="text-2xl font-bold text-fg mb-1 mt-2">What does this place offer?</h1>
                    <p className="text-sm text-fg-muted mb-6">Select everything available — you can update this anytime.</p>
                    <WizardAmenities listingId={createdListingId} />
                  </div>
                )}
              </div>

              {/* ── Footer nav ── */}
              <div className="mt-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm font-medium text-fg-muted underline underline-offset-4 hover:text-fg transition-colors"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed() || isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold text-sm min-w-[120px] justify-center disabled:opacity-40 transition-opacity active:scale-95 transition-transform"
                  style={{ background: "linear-gradient(110deg,#4f46e5,#7c3aed,#6366f1)" }}
                >
                  {step === 3 ? (isSubmitting ? "Saving…" : "Save & continue") :
                   step === 4 ? <><Check size={14} />Finish</> :
                   <>Next <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
