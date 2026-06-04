import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useReferences } from "@/lib/hooks/use-references";
import { useReferenceCities, useAmenities } from "@/lib/hooks/use-references";
import { aiApi, type AiPropertyType, type AiDescriptionStyle } from "@/lib/api/ai.api";
import { cn } from "@/lib/utils/cn";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

// Tracks whether the user has manually edited the title field in this render.
// Checked before any async AI response is applied so the AI never overwrites
// something the user typed (BUG-02).
let _titleFocused = false;

const TITLE_MAX = 60;

const AI_SHIMMER_STYLE = `
  @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
  .ai-shimmer-title {
    background: linear-gradient(90deg, #6366f1, #a855f7, #6366f1);
    background-size: 200% auto;
    animation: shimmer 2s linear infinite;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  @keyframes ai-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.5), 0 4px 14px rgba(99, 102, 241, 0.4); }
    50%      { box-shadow: 0 0 0 6px rgba(168, 85, 247, 0),   0 4px 14px rgba(99, 102, 241, 0.4); }
  }
  .ai-cta-pulse { animation: ai-pulse 2.4s ease-in-out infinite; }
`;

const DESCRIPTION_STYLES: { id: AiDescriptionStyle; label: string; emoji: string }[] = [
  { id: "Professional", label: "Professional", emoji: "🎩" },
  { id: "Emotional",    label: "Emotional",    emoji: "💛" },
  { id: "Playful",      label: "Playful",      emoji: "🎈" },
];

function TitleDialog({ draft, patch }: SectionDialogProps) {
  const { data: refs } = useReferences();
  const { data: cities } = useReferenceCities();
  const [variation, setVariation] = useState(0);
  const [genTitles, setGenTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [genDesc, setGenDesc] = useState(false);
  const [descStyle, setDescStyle] = useState<AiDescriptionStyle>("Professional");
  const [descNonce, setDescNonce] = useState(0);
  const suggestSeq = useRef(0);
  const descSeq = useRef(0);
  const userEditedTitle = useRef(false);

  const propTypeName =
    refs?.unitTypes?.find((t) => t.id === draft.assetTypeId)?.name &&
    (typeof refs.unitTypes.find((t) => t.id === draft.assetTypeId)!.name === "string"
      ? (refs.unitTypes.find((t) => t.id === draft.assetTypeId)!.name as unknown as string)
      : (refs.unitTypes.find((t) => t.id === draft.assetTypeId)!.name as { en: string }).en);

  const cityName = cities?.find((c) => c.id === draft.cityId)?.name?.en ?? "";

  // UX-324: the AI payload's `propertyType` must come from the *building
  // category* (House / Villa / Condo / Townhouse), NOT the unit type
  // (Entire place / Private room…) — the latter never matches the
  // AiPropertyType enum, so every listing was sent as "Other" and the prose
  // read "…3-bedroom Other property…". Map the chosen category onto the enum.
  const propCategory = refs?.propertyCategories?.find((c) => c.id === draft.propertyCategoryId);
  const propCategoryKey = (
    propCategory?.code ??
    (typeof propCategory?.name === "string" ? propCategory?.name : propCategory?.name?.en) ??
    ""
  ).toLowerCase();
  const aiPropertyType: AiPropertyType =
    propCategoryKey.includes("villa") ? "Villa"
    : propCategoryKey.includes("townhouse") ? "Townhouse"
    : /house|cottage|bungalow/.test(propCategoryKey) ? "House"
    : /condo|apart/.test(propCategoryKey) ? "Condo"
    : draft.bedrooms === 0 ? "Studio"
    : "Other";

  // UX-324: feed the neighbourhood (subdistrict / district) into the
  // description so the BE centres it on the area, not the city the tenant
  // already picked. Sent as discrete fields the BE expects (not folded into
  // `area`). Title stays city-only — district names transliterate awkwardly
  // into short headlines.
  // UX-347: the municipal district (e.g. "Mueang Chiang Mai") is far too broad
  // to be useful — a listing on Nimman shouldn't be described as "the Mueang
  // Chiang Mai District". When we have the narrower subdistrict/tambon, send
  // ONLY that as the locality and drop the municipal district, so the AI
  // centres on the real neighbourhood. Fall back to the district only when no
  // subdistrict is set. (BE should ideally map subdistrict → known landmark.)
  const descSubdistrict = draft.subdistrict?.trim() || undefined;
  const descDistrict = descSubdistrict ? undefined : (draft.district?.trim() || undefined);

  // UX-347: ground the AI description in the host's REAL amenities instead of
  // letting the model invent features (the owner saw fabricated "garden /
  // parking / built-in wardrobes" on a listing that declared none). We resolve
  // the selected amenityIds to their names and pass them as `features`; the BE
  // must describe only these and not embellish with unverified amenities.
  const { data: allAmenities } = useAmenities();
  const selectedIds = new Set(draft.amenityIds.map((id) => String(id)));
  const selectedFeatures: string[] = (allAmenities ?? [])
    .filter((a) => selectedIds.has(String(a.id)))
    .map((a) => a.name)
    .filter(Boolean);

  const canGenerate = !!draft.assetTypeId && draft.bedrooms !== null && cityName.length > 0;

  // BUG-315: accept an explicit variation. The Regenerate handler used to call
  // setVariation(next) then generateTitles(), but generateTitles closed over
  // the STALE `variation` state (setState is async) — so every Regenerate sent
  // the same variation and the titles never changed. Passing the next value
  // directly fixes it.
  async function generateTitles(variationOverride?: number) {
    if (!canGenerate || !propTypeName) return;
    const seq = ++suggestSeq.current;
    setGenTitles(true);
    try {
      const resp = await aiApi.suggestListingTitle({
        propertyType: aiPropertyType,
        area: cityName,
        bedrooms: draft.bedrooms!,
        variation: variationOverride ?? variation,
      });
      if (seq !== suggestSeq.current) return;
      const trimmed = (resp.titles ?? []).map((t) => t.slice(0, TITLE_MAX)).filter(Boolean);
      setTitleSuggestions(trimmed);
      // First load: pre-fill the title with the first suggestion so the user
      // sees something concrete immediately (matches old "auto-suggest on
      // open" behaviour). Don't overwrite a title they've already touched.
      if (!userEditedTitle.current && !_titleFocused && !draft.title.trim()) {
        if (trimmed[0]) patch({ title: trimmed[0] });
      }
    } finally {
      if (seq === suggestSeq.current) setGenTitles(false);
    }
  }

  async function generateDescription(style: AiDescriptionStyle, nonceBump = false) {
    if (!canGenerate || !propTypeName) return;
    const seq = ++descSeq.current;
    setGenDesc(true);
    const nonce = nonceBump ? descNonce + 1 : descNonce;
    if (nonceBump) setDescNonce(nonce);
    setDescStyle(style);
    try {
      const resp = await aiApi.suggestListingDescription({
        propertyType: aiPropertyType,
        area: cityName,
        district: descDistrict,
        subdistrict: descSubdistrict,
        bedrooms: draft.bedrooms!,
        // UX-347: only the host's real amenities — keeps the prose truthful.
        features: selectedFeatures.length ? selectedFeatures : undefined,
        style,
        nonce,
      });
      if (seq !== descSeq.current) return;
      patch({ description: resp.description });
    } finally {
      if (seq === descSeq.current) setGenDesc(false);
    }
  }

  // Auto-suggest a title once when the dialog opens and the field is empty.
  useEffect(() => {
    if (draft.title.trim().length > 0) return;
    if (!canGenerate) return;
    const t = setTimeout(() => generateTitles(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasDescription = draft.description.trim().length > 0;

  return (
    <div>
      <style>{AI_SHIMMER_STYLE}</style>

      <Field
        label="Listing title"
        required
        hint={
          canGenerate
            ? "Tap a chip to pick a draft — edit anything you like."
            : "Fill in property type, bedrooms and location first to enable AI suggestions."
        }
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold", canGenerate ? "ai-shimmer-title" : "text-fg-muted")}>
            {genTitles ? (
              <>
                <Loader2 size={11} className="animate-spin" /> AI is drafting 3 options…
              </>
            ) : (
              <>
                <Sparkles size={11} /> AI-assisted
              </>
            )}
          </span>
          <button
            type="button"
            disabled={!canGenerate || genTitles}
            onClick={() => {
              const next = variation + 1;
              setVariation(next);
              generateTitles(next);
            }}
            className="text-[11px] text-fg-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <RefreshCw size={10} /> regenerate
          </button>
        </div>

        {/* UX-257: 3-chip picker — Location / Action / Lifestyle shapes. */}
        {titleSuggestions.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {titleSuggestions.map((t, i) => {
              const selected = t === draft.title;
              return (
                <button
                  key={`${t}-${i}`}
                  type="button"
                  onClick={() => {
                    userEditedTitle.current = false;
                    patch({ title: t });
                  }}
                  className={cn(
                    "text-left text-xs rounded-full border px-3 py-1.5 transition-colors max-w-full truncate",
                    selected
                      ? "bg-indigo-500 border-indigo-500 text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
                      : "bg-bg-card border-border text-fg hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10",
                  )}
                  title={t}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}

        <div className="relative">
          <Input
            value={draft.title}
            maxLength={TITLE_MAX}
            onChange={(e) => {
              userEditedTitle.current = true;
              patch({ title: e.target.value });
            }}
            onFocus={() => { _titleFocused = true; }}
            onBlur={() => { _titleFocused = false; }}
            placeholder="3BR Chiang Mai Condo · Fully Furnished"
            className="pr-14"
          />
          <span
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tabular-nums pointer-events-none",
              draft.title.length > TITLE_MAX - 10 ? "text-warning" : "text-fg-subtle",
            )}
          >
            {draft.title.length}/{TITLE_MAX}
          </span>
        </div>
      </Field>

      <Field
        label="Description"
        hint="Tap “Write with AI” to draft 4 short paragraphs you can then tweak — space, neighbourhood, amenities, who it's for."
      >
        {/* UX-258: Prominent CTA. Pulses while the field is empty so first-time
            hosts notice it. After generation the CTA collapses into a row of
            style pills + Regenerate. */}
        {!hasDescription ? (
          <div className="rounded-2xl border border-dashed border-indigo-300/60 bg-gradient-to-br from-indigo-50/60 via-violet-50/40 to-indigo-50/60 dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-indigo-500/10 p-5 mb-2 flex flex-col items-center text-center">
            <p className="text-sm font-medium text-fg max-w-md mb-3">
              Start with a draft — we'll write a Space / Neighbourhood / Amenities / Perfect-for breakdown from your details, then you edit.
            </p>
            <Button
              type="button"
              disabled={!canGenerate || genDesc}
              onClick={() => generateDescription(descStyle, false)}
              className={cn(
                "h-11 px-5 font-semibold rounded-full text-white border-0",
                "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500",
                !genDesc && canGenerate && "ai-cta-pulse",
              )}
            >
              {genDesc ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Drafting…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Wand2 size={14} /> Write with AI ✨
                </span>
              )}
            </Button>
            {!canGenerate && (
              <p className="text-[11px] text-fg-muted mt-2">
                Fill property type, bedrooms and location first.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold mr-1", canGenerate ? "ai-shimmer-title" : "text-fg-muted")}>
              {genDesc ? (
                <>
                  <Loader2 size={11} className="animate-spin" /> Rewriting…
                </>
              ) : (
                <>
                  <Sparkles size={11} /> Tone
                </>
              )}
            </span>
            {DESCRIPTION_STYLES.map((s) => {
              const active = s.id === descStyle;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!canGenerate || genDesc}
                  onClick={() => generateDescription(s.id, true)}
                  className={cn(
                    "text-[11px] font-semibold rounded-full px-3 py-1 border transition-colors",
                    active
                      ? "bg-indigo-500 border-indigo-500 text-white shadow-[0_3px_10px_rgba(99,102,241,0.35)]"
                      : "bg-bg-card border-border text-fg hover:border-indigo-300",
                    (!canGenerate || genDesc) && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <span className="mr-1">{s.emoji}</span>
                  {s.label}
                </button>
              );
            })}
            <button
              type="button"
              disabled={!canGenerate || genDesc}
              onClick={() => generateDescription(descStyle, true)}
              className="ml-auto text-[11px] text-fg-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RefreshCw size={10} /> regenerate
            </button>
          </div>
        )}

        <Textarea
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={8}
          placeholder={hasDescription ? "" : "Or write your own from scratch…"}
        />
      </Field>
    </div>
  );
}

export const titleSection: SectionDef = {
  id: "title",
  label: "Listing title & description",
  group: "host",
  required: true,
  estTime: "1 min",
  isComplete: (d) => d.title.trim().length >= 3,
  summary: (d) => (d.title.trim() ? d.title : "—"),
  Form: TitleDialog,
};
