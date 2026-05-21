import { ArrowLeft, BedDouble, Bath, Eye, Home, Users, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils/cn";
import { formatThb } from "@/lib/utils/format";
import { useMarketplaceCities } from "@/lib/hooks/use-marketplace";
import type { PropertyDraft, SectionGroup } from "./types";

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
      <Link
        to="/me/host/properties"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={14} /> Properties
      </Link>

      {/* Live preview — Airbnb-style marketplace card that updates as the
          host edits. Gives them a concrete sense of the result. */}
      <PreviewCard draft={draft} mode={mode} primaryImageUrl={primaryImageUrl} status={status} />

      {/* Group nav + property meta */}
      <div className="rounded-2xl bg-bg-card border border-border overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 text-xs text-fg-muted">
            <span className="flex items-center gap-1">
              <BedDouble size={12} />
              {draft.bedrooms === null
                ? "—"
                : draft.bedrooms === 0
                ? "Studio"
                : `${draft.bedrooms} bed`}
            </span>
            <span className="flex items-center gap-1">
              <Bath size={12} /> {draft.bathrooms}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} /> {draft.maxOccupancy}
            </span>
          </div>
          {occupancyStatus && (
            <div className="mt-2 text-xs">
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
        </div>

        <div className="border-t border-border py-1.5">
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
  const { data: cities } = useMarketplaceCities();
  const cityName = cities?.find((c) => c.id === draft.cityId)?.name?.en;

  const hasTitle = draft.title.trim().length > 0;
  const hasPrice = draft.baseMonthlyRate > 0;
  const isEmpty = !hasTitle && !hasPrice && !primaryImageUrl;

  const fallbackType =
    draft.bedrooms === null ? "Place" : draft.bedrooms === 0 ? "Studio" : `${draft.bedrooms}-bed home`;
  const previewTitle = hasTitle
    ? draft.title
    : `${fallbackType}${cityName ? ` in ${cityName}` : ""}`;

  return (
    <div className="rounded-2xl bg-bg-card border border-border overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted inline-flex items-center gap-1">
          <Eye size={11} /> Live preview
        </span>
        <span className="text-[10px] font-medium text-fg-subtle">how tenants see it</span>
      </div>
      <div className="p-3">
        {/* Photo */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-bg-subtle">
          {primaryImageUrl ? (
            <img src={primaryImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            // Theme-aware placeholder: stays neutral against bg-bg-card so it
            // doesn't clash with dark navy when there's no photo yet.
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-subtle to-bg-subtle/60">
              <Home size={36} strokeWidth={1.25} className="text-fg-muted/40" />
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
                / month · ★ New
              </span>
            ) : (
              <span className="text-fg-subtle">Set monthly rent to see the price tag</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
