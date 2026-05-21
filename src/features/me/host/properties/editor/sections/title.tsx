import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useReferences } from "@/lib/hooks/use-references";
import { useMarketplaceCities } from "@/lib/hooks/use-marketplace";
import { aiApi, type AiPropertyType } from "@/lib/api/ai.api";
import { cn } from "@/lib/utils/cn";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

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
`;

function TitleDialog({ draft, patch }: SectionDialogProps) {
  const { data: refs } = useReferences();
  const { data: cities } = useMarketplaceCities();
  const [variation, setVariation] = useState(0);
  const [genTitle, setGenTitle] = useState(false);
  const [genDesc, setGenDesc] = useState(false);
  const suggestSeq = useRef(0);

  const propTypeName =
    refs?.unitTypes?.find((t) => t.id === draft.assetTypeId)?.name &&
    (typeof refs.unitTypes.find((t) => t.id === draft.assetTypeId)!.name === "string"
      ? (refs.unitTypes.find((t) => t.id === draft.assetTypeId)!.name as unknown as string)
      : (refs.unitTypes.find((t) => t.id === draft.assetTypeId)!.name as { en: string }).en);

  const cityName = cities?.find((c) => c.id === draft.cityId)?.name?.en ?? "";

  const canGenerate = !!draft.assetTypeId && draft.bedrooms !== null && cityName.length > 0;

  async function generateTitle() {
    if (!canGenerate || !propTypeName) return;
    const seq = ++suggestSeq.current;
    setGenTitle(true);
    try {
      const resp = await aiApi.suggestListingTitle({
        propertyType: propTypeName as AiPropertyType,
        area: cityName,
        bedrooms: draft.bedrooms!,
        variation,
      });
      if (seq !== suggestSeq.current) return;
      patch({ title: resp.title.slice(0, TITLE_MAX) });
    } finally {
      if (seq === suggestSeq.current) setGenTitle(false);
    }
  }

  // Build a structured, fact-based Airbnb-style description from the draft.
  // Uses ONLY data the landlord entered — no AI features endpoint (avoids
  // hallucinations like "mountain view" / "corner unit") and no exact street
  // address (privacy: exact address is shared after booking confirmation).
  async function generateDescription() {
    if (!canGenerate || !propTypeName) return;
    setGenDesc(true);
    try {
      const bedLabel  = draft.bedrooms === 0 ? "studio" : `${draft.bedrooms}-bedroom`;
      const typeLower = propTypeName.toLowerCase();

      const furnishedLabel =
        draft.furnished === "Fully"       ? "fully furnished" :
        draft.furnished === "Semi"        ? "partially furnished" :
        draft.furnished === "Unfurnished" ? "unfurnished" : null;

      const petsLabel =
        draft.petsExplicitlySet && draft.petsAllowed ? "pet-friendly" : null;

      const aboutTags = [furnishedLabel, petsLabel].filter(Boolean).join(" and ");
      const about = `A welcoming ${bedLabel} ${typeLower} in ${cityName}${aboutTags ? ", " + aboutTags : ""}. Ideal for monthly stays.`;

      // ── The space — facts only
      const space: string[] = [];
      const bedNum  = draft.bedrooms ?? 0;
      const bathNum = draft.bathrooms;
      if (bedNum > 0 || bathNum > 0) {
        const bedPart  = bedNum === 0 ? "Studio" : `${bedNum} ${bedNum === 1 ? "bedroom" : "bedrooms"}`;
        const bathPart = `${bathNum} ${bathNum === 1 ? "bathroom" : "bathrooms"}`;
        space.push(`${bedPart} · ${bathPart}`);
      }
      if (draft.maxOccupancy > 0) space.push(`Sleeps up to ${draft.maxOccupancy}`);
      if (draft.areaSqm)          space.push(`${draft.areaSqm} m² of living space`);
      if (draft.floor !== null && draft.totalFloors) {
        space.push(`Floor ${draft.floor} of ${draft.totalFloors}`);
      }
      if (furnishedLabel) space.push(furnishedLabel.charAt(0).toUpperCase() + furnishedLabel.slice(1));
      if (draft.parkingSpaces > 0) {
        const incl = draft.parkingIncluded ? " (included in rent)" : "";
        space.push(`Parking: ${draft.parkingSpaces} space${draft.parkingSpaces > 1 ? "s" : ""}${incl}`);
      }

      // ── Guest access — method only; never expose codes/passwords
      const checkInLabel: Record<string, string> = {
        KeyHandover: "Key handover at meeting",
        Smartlock:   "Smart lock access",
        Keybox:      "Lockbox pickup",
        Reception:   "Doorman / building reception",
        Other:       "Hosted access",
      };
      const guestAccess = draft.checkInMethod && checkInLabel[draft.checkInMethod]
        ? `${checkInLabel[draft.checkInMethod]}. Full details shared once your booking is confirmed.`
        : null;

      // ── Other things to note — rules + pets
      const notes: string[] = [];
      const ruleLines = draft.houseRules.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      notes.push(...ruleLines);
      if (draft.petsExplicitlySet && !ruleLines.some((r) => /pet/i.test(r))) {
        notes.push(draft.petsAllowed ? "Pets welcome" : "No pets allowed");
      }

      // Assemble markdown
      const parts: string[] = [
        "## About the place",
        about,
      ];
      if (space.length) {
        parts.push("", "## The space", ...space.map((s) => `- ${s}`));
      }
      if (guestAccess) {
        parts.push("", "## Guest access", guestAccess);
      }
      if (notes.length) {
        parts.push("", "## Other things to note", ...notes.map((n) => `- ${n}`));
      }
      patch({ description: parts.join("\n") });
    } finally {
      setGenDesc(false);
    }
  }

  // Auto-suggest a title once when the dialog opens and the field is empty.
  useEffect(() => {
    if (draft.title.trim().length > 0) return;
    if (!canGenerate) return;
    const t = setTimeout(() => generateTitle(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <style>{AI_SHIMMER_STYLE}</style>

      <Field
        label="Listing title"
        required
        hint={
          canGenerate
            ? "We drafted this from your details — edit anything you like."
            : "Fill in property type, bedrooms and location first to enable AI suggestions."
        }
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold", canGenerate ? "ai-shimmer-title" : "text-fg-muted")}>
            {genTitle ? (
              <>
                <Loader2 size={11} className="animate-spin" /> AI is drafting…
              </>
            ) : (
              <>
                <Sparkles size={11} /> AI-assisted
              </>
            )}
          </span>
          <button
            type="button"
            disabled={!canGenerate || genTitle}
            onClick={() => {
              const next = variation + 1;
              setVariation(next);
              generateTitle();
            }}
            className="text-[11px] text-fg-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <RefreshCw size={10} /> try another
          </button>
        </div>
        <div className="relative">
          <Input
            value={draft.title}
            maxLength={TITLE_MAX}
            onChange={(e) => patch({ title: e.target.value })}
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
        hint="What makes your place special — neighbourhood, views, transport, what's near."
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold", canGenerate ? "ai-shimmer-title" : "text-fg-muted")}>
            {genDesc ? (
              <>
                <Loader2 size={11} className="animate-spin" /> Drafting…
              </>
            ) : (
              <>
                <Sparkles size={11} /> AI-assisted
              </>
            )}
          </span>
          <button
            type="button"
            disabled={!canGenerate || genDesc}
            onClick={generateDescription}
            className="text-[11px] text-fg-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Sparkles size={10} /> {draft.description ? "rewrite" : "draft for me"}
          </button>
        </div>
        <Textarea
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={6}
          placeholder="Describe what makes your place special…"
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
