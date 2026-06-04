import { useEffect, useRef, useState } from "react";
import { BedDouble, Bath, Eye, Home, Users, Trash2, Ruler, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatThb } from "@/lib/utils/format";
import { useReferenceCities, useReferences } from "@/lib/hooks/use-references";
import type { ReferenceItem } from "@/lib/types";
import type { PropertyDraft, SectionGroup } from "./types";

// UX-337: short category word for the preview headline so it matches the
// real listing title ("1-bed Condo"), not a generic "home". Mirrors the
// AiPropertyType mapping used when generating the actual title.
function categoryWord(categories: ReferenceItem[], categoryId: number | null): string | null {
  if (categoryId === null) return null;
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return null;
  const key = (
    cat.code ?? (typeof cat.name === "string" ? cat.name : cat.name?.en ?? "")
  ).toLowerCase();
  if (key.includes("villa")) return "villa";
  if (key.includes("townhouse")) return "townhouse";
  if (/house|cottage|bungalow/.test(key)) return "house";
  if (/condo|apart/.test(key)) return "condo";
  return null;
}

interface Props {
  draft: PropertyDraft;
  groups: SectionGroup[];
  // Group IDs that have at least one visible section. Groups not in this set
  // get hidden from the nav so an empty "Your details" doesn't dangle once
  // host profile is filled.
  visibleGroupIds?: Set<string>;
  mode: "create" | "edit";
  primaryImageUrl?: string;
  occupancyStatus?: string;
  status?: string;
  activeGroup?: string;
  onGroupClick?: (id: string) => void;
  onDelete?: () => void;
}

export function EditorSidebar({
  draft,
  groups,
  visibleGroupIds,
  mode,
  primaryImageUrl,
  occupancyStatus,
  status,
  activeGroup,
  onGroupClick,
  onDelete,
}: Props) {
  const navGroups = visibleGroupIds ? groups.filter((g) => visibleGroupIds.has(g.id)) : groups;

  return (
    <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-6 lg:self-start space-y-4">
      {/* UX-343: the "Properties" back-link now lives above the two-column row
          (in property-editor-page) so the Live-preview card and the right-hand
          header banner line up at the same top edge instead of being offset by
          the link's height. */}

      {/* Live preview — Airbnb-style marketplace card that updates as the
          host edits. Gives them a concrete sense of the result. */}
      <PreviewCard draft={draft} mode={mode} primaryImageUrl={primaryImageUrl} status={status} />

      {/* Group nav — meta-row (beds/baths/guests) moved into PreviewCard
          per UX-289 so live edits register visually as part of the preview. */}
      <div className="rounded-2xl bg-bg-card border border-border overflow-hidden">
        {occupancyStatus && (
          <div className="px-4 pt-3 text-xs">
            <span
              className={cn(
                "font-semibold",
                occupancyStatus === "Occupied" ? "text-success" : "text-fg-muted",
              )}
            >
              {occupancyStatus}
            </span>
          </div>
        )}

        <div className={cn("py-1.5", occupancyStatus ? "border-t border-border mt-2" : "")}>
          {navGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onGroupClick?.(g.id)}
              className={cn(
                "w-full text-left px-4 py-2 text-sm transition-colors",
                activeGroup === g.id ? "text-fg font-semibold" : "text-fg-muted hover:text-fg",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {onDelete && (
          // Generous separator + dimmer styling so this destructive action
          // isn't visually adjacent to the navigation items above it.
          <div className="mt-3 border-t border-border bg-bg-subtle/30 p-3">
            <button
              type="button"
              onClick={onDelete}
              className="w-full text-[11px] text-fg-subtle hover:text-danger transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 size={11} />
              Delete property
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// Stylistic mirror of `ListingCard` in marketplace listings-page.tsx — same
// proportions, badge, info layout. Updates live as the draft changes so the
// host sees what tenants will see.
function PreviewCard({
  draft,
  mode,
  primaryImageUrl,
  status,
}: {
  draft: PropertyDraft;
  mode: "create" | "edit";
  primaryImageUrl?: string;
  status?: string;
}) {
  const { data: cities } = useReferenceCities();
  const { data: refs } = useReferences();
  const cityName = cities?.find((c) => c.id === draft.cityId)?.name?.en;

  const hasTitle = draft.title.trim().length > 0;
  const hasPrice = draft.baseMonthlyRate > 0;
  const isEmpty = !hasTitle && !hasPrice && !primaryImageUrl;

  // UX-337: reflect the chosen category (condo/house/villa…) in the fallback
  // headline instead of a generic "home" so the preview lines up with the
  // auto-generated listing title.
  const catWord = categoryWord(refs?.propertyCategories ?? [], draft.propertyCategoryId) ?? "home";
  const fallbackType =
    draft.bedrooms === null ? "Place" : draft.bedrooms === 0 ? "Studio" : `${draft.bedrooms}-bed ${catWord}`;
  const previewTitle = hasTitle
    ? draft.title
    : `${fallbackType}${cityName ? ` in ${cityName}` : ""}`;

  // UX-336: until the host has actually touched the specs section, the meta
  // row would otherwise show seed defaults (1 bath · 2 guests · Fully
  // furnished) as if they were real data. Show em-dashes until touched.
  const specsSet = draft.specsTouched;

  // UX-289: flash a tiny "Saved" indicator whenever ANY draft field changes
  // so the host gets immediate feedback even when the field they edited
  // doesn't appear in the preview card (e.g. Furnishing, House rules,
  // Wi-Fi). Without this they think their edit didn't register because the
  // visible preview is unchanged.
  const savedFlash = useDraftFlash(draft, mode);

  return (
    <div className="rounded-2xl bg-bg-card border border-border overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted inline-flex items-center gap-1">
          <Eye size={11} /> Live preview
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold inline-flex items-center gap-1 transition-opacity duration-300",
            savedFlash
              ? "text-success opacity-100"
              : "text-fg-subtle opacity-100 font-medium",
          )}
        >
          {savedFlash ? (
            <>
              <Check size={10} /> Saved as draft
            </>
          ) : (
            "how tenants see it"
          )}
        </span>
      </div>
      <div className="p-3">
        {/* Photo */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-bg-subtle">
          {primaryImageUrl ? (
            <img src={primaryImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            // Theme-aware placeholder: stays neutral against bg-bg-card so it
            // doesn't clash with dark navy when there's no photo yet.
            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-bg-subtle to-bg-subtle/60">
              <Home size={32} strokeWidth={1.25} className="text-fg-muted/40" />
              {/* UX-344: give the empty preview a job — tell the host what will
                  land here instead of showing a blank box. */}
              <span className="text-[10px] font-medium text-fg-muted/70 px-3 text-center leading-tight">
                Your cover photo appears here
              </span>
            </div>
          )}
          {/* Badges — top-left */}
          {mode === "create" ? (
            <span className="absolute top-2 left-2 bg-bg-card text-fg text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
              ★ New
            </span>
          ) : (
            status && (
              <span className="absolute top-2 left-2 bg-bg-card text-fg text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                {status}
              </span>
            )
          )}
        </div>

        {/* Info */}
        <div className="mt-2 px-0.5 min-h-[44px]">
          <p
            className={cn(
              "text-[13px] font-semibold leading-snug line-clamp-1",
              isEmpty ? "text-fg-subtle" : "text-fg",
            )}
          >
            {previewTitle}
          </p>
          <p className="text-[12px] leading-snug mt-0.5">
            {hasPrice ? (
              <span className="text-fg-muted">
                <span className="text-fg font-semibold tabular-nums">{formatThb(draft.baseMonthlyRate)}</span>{" "}
                / month
              </span>
            ) : (
              <span className="text-fg-subtle">Set monthly rent to see the price tag</span>
            )}
          </p>
        </div>

        {/* UX-344: earnings teaser — turns the preview into a motivator. Once a
            rent is set we show projected yearly income so the host feels the
            upside of finishing the listing (anticipation / earnings-preview). */}
        {hasPrice && (
          <div className="mt-2 mx-0.5 rounded-lg bg-success/8 px-2.5 py-1.5">
            <p className="text-[10px] font-medium text-fg-muted leading-tight">
              Projected yearly income
            </p>
            <p className="text-[13px] font-bold text-success tabular-nums leading-tight">
              ≈ {formatThb(draft.baseMonthlyRate * 12)}
            </p>
          </div>
        )}

        {/* UX-289: spec icon row so changes to bedrooms / bathrooms / max
            guests / area produce visible movement in the preview. The
            sidebar already had a meta-row below this card, but the host
            doesn't perceive that as part of "Live preview" — moving it
            into the card itself fixes the false-negative feedback. */}
        <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 px-0.5 text-[11px] text-fg-muted">
          <span className="flex items-center gap-1">
            <BedDouble size={11} />
            {draft.bedrooms === null
              ? "—"
              : draft.bedrooms === 0
              ? "Studio"
              : `${draft.bedrooms} bed`}
          </span>
          <span className="flex items-center gap-1">
            <Bath size={11} /> {specsSet ? draft.bathrooms : "—"}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} /> {specsSet ? draft.maxOccupancy : "—"}
          </span>
          {draft.areaSqm !== null && (
            <span className="flex items-center gap-1">
              <Ruler size={11} /> {draft.areaSqm} m²
            </span>
          )}
        </div>
        {specsSet && draft.furnished && (
          <p className="mt-1.5 px-0.5 text-[11px] text-fg-muted">
            {draft.furnished === "Fully"
              ? "Fully furnished"
              : draft.furnished === "Semi"
              ? "Partially furnished"
              : "Unfurnished"}
          </p>
        )}
      </div>
    </div>
  );
}

// UX-289: flash a "Saved as draft" indicator whenever the draft mutates.
// Stays on for 1.2s after the last change so the host always sees feedback
// for the field they just edited even when the visible preview is unchanged.
function useDraftFlash(draft: PropertyDraft, mode: "create" | "edit"): boolean {
  const [on, setOn] = useState(false);
  const firstRender = useRef(true);
  // Cheap-but-good change signal — JSON.stringify is fine for ~50 small
  // primitive fields and avoids us having to manually enumerate every key.
  const sig = JSON.stringify(draft);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (mode !== "create") return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 1200);
    return () => clearTimeout(t);
  }, [sig, mode]);
  return on;
}
