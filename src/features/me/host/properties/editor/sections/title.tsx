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

  async function generateDescription() {
    if (!canGenerate || !propTypeName) return;
    setGenDesc(true);
    try {
      // We don't have a separate description endpoint — reuse title gen with
      // a richer signal as a stop-gap, then fall back to a template.
      const featureResp = await aiApi
        .suggestFeatures({
          propertyType: propTypeName as AiPropertyType,
          area: cityName,
          bedrooms: draft.bedrooms!,
        })
        .catch(() => null);

      const features = featureResp?.features?.slice(0, 4) ?? [];
      const bedLabel = draft.bedrooms === 0 ? "studio" : `${draft.bedrooms}-bedroom`;
      const blurb = [
        `A welcoming ${bedLabel} ${propTypeName.toLowerCase()} in ${cityName}.`,
        features.length > 0
          ? `Highlights include ${features.join(", ").toLowerCase()}.`
          : "",
        draft.streetAddress
          ? `Located on ${draft.streetAddress}, with easy access to nearby amenities.`
          : `Tenants will enjoy quick access to local cafes, markets, and transit.`,
        "Move-in ready and ideal for monthly stays.",
      ]
        .filter(Boolean)
        .join(" ");
      patch({ description: blurb });
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
