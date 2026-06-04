import type { JSX } from "react";
import { Building, Building2, Home, Box, DoorOpen, Users, BedDouble, Castle, House, Hotel as HotelIcon, Tent, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useReferences } from "@/lib/hooks/use-references";
import type { ReferenceItem } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import type { PropertyDraft, SectionDef, SectionDialogProps } from "../types";
import { ChipGroup, Field, NumberStepper, PickerCard, Row } from "../ui";

const ICONS: Record<string, JSX.Element> = {
  // Building-type variants (older seed data)
  apartment: <Building2 size={20} />,
  condo:     <Building size={20} />,
  house:     <Home size={20} />,
  // Airbnb-style variants (current seed: Entire / Private / Shared / Hotel)
  entire:    <Home size={20} />,
  private:   <DoorOpen size={20} />,
  shared:    <Users size={20} />,
  hotel:     <BedDouble size={20} />,
  other:     <Box size={20} />,
};

function pickIcon(code?: string, label?: string): JSX.Element {
  const key = (code ?? label ?? "").toLowerCase();
  if (key.includes("entire"))  return ICONS.entire;
  if (key.includes("private")) return ICONS.private;
  if (key.includes("shared"))  return ICONS.shared;
  if (key.includes("hotel"))   return ICONS.hotel;
  if (key.includes("apart"))   return ICONS.apartment;
  if (key.includes("condo"))   return ICONS.condo;
  if (key.includes("house") || key.includes("villa")) return ICONS.house;
  return ICONS.other;
}

function refName(item: ReferenceItem | undefined): string {
  if (!item) return "";
  return typeof item.name === "string" ? item.name : (item.name.en ?? Object.values(item.name)[0] ?? "");
}

// UX-253: house-style detection now reads `propertyCategoryId` (House /
// Villa / Townhouse / Cottage / Bungalow). The previous check looked at
// `unitTypes` which only carries Entire-place / Private-room / Shared /
// Hotel — none of which include "house" or "villa" — so the carve-out
// never fired and Unit floor was always shown.
function isHouseVilla(categories: ReferenceItem[], propertyCategoryId: number | null): boolean {
  if (propertyCategoryId === null) return false;
  const cat = categories.find((c) => c.id === propertyCategoryId);
  if (!cat) return false;
  const key = (cat.code ?? refName(cat)).toLowerCase();
  return /(house|villa|townhouse|cottage|bungalow)/.test(key);
}

function pickCategoryIcon(code?: string, label?: string): JSX.Element {
  const key = (code ?? label ?? "").toLowerCase();
  if (key.includes("villa"))     return <Castle size={18} />;
  if (key.includes("townhouse")) return <Warehouse size={18} />;
  if (key.includes("house"))     return <House size={18} />;
  if (key.includes("cottage"))   return <Tent size={18} />;
  if (key.includes("hotel"))     return <HotelIcon size={18} />;
  if (key.includes("apart"))     return <Building2 size={18} />;
  if (key.includes("condo"))     return <Building size={18} />;
  return <Box size={18} />;
}

function SpecsDialog({ draft, patch }: SectionDialogProps) {
  const { data: refs } = useReferences();
  const types = refs?.unitTypes ?? [];
  const categories = refs?.propertyCategories ?? [];
  const isHouse = isHouseVilla(categories, draft.propertyCategoryId);

  // BUG-292: any explicit touch of the specs section commits the suggested
  // bedrooms default (1) so the "1 (suggested)" counter doesn't silently
  // leave bedrooms=null and the section stuck on "Not set". `touchPatch`
  // wraps every onChange that sets `specsTouched: true` so the upgrade
  // happens uniformly without sprinkling the fallback into each handler.
  const touchPatch = (p: Parameters<typeof patch>[0]) => {
    if (draft.bedrooms === null && !("bedrooms" in p)) {
      patch({ ...p, bedrooms: 1, specsTouched: true });
    } else {
      patch({ ...p, specsTouched: true });
    }
  };

  return (
    <div>
      <Field label="Property type" required>
        <div className="grid grid-cols-2 gap-2.5">
          {types.map((t) => {
            const name = typeof t.name === "string" ? t.name : t.name.en;
            return (
              <PickerCard
                key={t.id}
                active={draft.assetTypeId === t.id}
                onClick={() => patch({ assetTypeId: t.id })}
                icon={pickIcon(t.code, name)}
                label={name}
              />
            );
          })}
        </div>
      </Field>

      {/* UX-253: pick the building style so the wizard knows whether to ask
          for a unit floor (condo/apartment) or storeys (house/villa). Also
          drives the propertyCategoryId on POST /api/listings — used to live
          as a hard-coded fallback to APARTMENT(1). */}
      <Field
        label="Property category"
        required
        hint={isHouse
          ? "Whole standalone home — we'll ask about storeys, not unit floor."
          : "What kind of building is it? Condo, apartment, house, villa…"}
      >
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const label = refName(c);
            const active = draft.propertyCategoryId === c.id;
            // UX-309: a standalone home can't be a "Studio" — if the host
            // switches to a House/Villa while bedrooms is 0, bump to 1.
            const willBeHouse = isHouseVilla(categories, c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  touchPatch({
                    propertyCategoryId: c.id,
                    ...(willBeHouse && (draft.bedrooms ?? 0) < 1 ? { bedrooms: 1 } : {}),
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-indigo-500 border-indigo-500 text-white shadow-[0_3px_10px_rgba(99,102,241,0.35)]"
                    : "bg-bg-card border-border text-fg hover:border-indigo-300",
                )}
              >
                {pickCategoryIcon(c.code, label)}
                {label}
              </button>
            );
          })}
        </div>
      </Field>

      <Row cols={3}>
        <Field
          label="Bedrooms"
          required
          hint={
            draft.bedrooms === 0
              ? "✓ Studio — one open living space"
              : isHouse
              ? "Number of bedrooms in the home"
              : "Step down to “Studio” for a single open space"
          }
        >
          {/* UX-309: single aligned stepper. 0 renders as “Studio” (only for
              unit-style places — a House/Villa starts at 1 bedroom). No more
              separate Studio chip that wrapped and broke the row alignment. */}
          <NumberStepper
            value={draft.bedrooms ?? 1}
            onChange={(n) => patch({ bedrooms: n, specsTouched: true })}
            min={isHouse ? 1 : 0}
            zeroLabel={isHouse ? undefined : "Studio"}
            dimValue={draft.bedrooms === null}
          />
        </Field>
        <Field label="Bathrooms" required>
          <NumberStepper
            value={draft.bathrooms}
            onChange={(n) => touchPatch({ bathrooms: n })}
            min={1}
            dimValue={!draft.specsTouched}
          />
        </Field>
        <Field label="Max guests" required>
          <NumberStepper
            value={draft.maxOccupancy}
            onChange={(n) => touchPatch({ maxOccupancy: n })}
            min={1}
            dimValue={!draft.specsTouched}
          />
        </Field>
      </Row>

      <Row cols={isHouse ? 2 : 3}>
        <Field
          label="Area (m²)"
          required
          hint={
            draft.areaSqm !== null && draft.areaSqm < 10
              ? "Most studios are 18-25 m²; double-check this value."
              : "Total living area in square metres."
          }
        >
          <Input
            type="number"
            min={1}
            max={10000}
            placeholder="e.g. 45"
            value={draft.areaSqm ?? ""}
            onChange={(e) => {
              // BUG-347: cap the area so a typo like "12343 m²" can't slip
              // through (HTML max alone doesn't block typed values).
              const raw = e.target.value === "" ? null : Number(e.target.value);
              const v = raw === null ? null : Math.min(Math.max(raw, 0), 10000);
              touchPatch({ areaSqm: v });
            }}
          />
        </Field>
        {isHouse ? (
          <Field label="Floors in your home" required hint="How many storeys the home has">
            <NumberStepper
              value={draft.totalFloors ?? 1}
              onChange={(n) => touchPatch({ totalFloors: n, floor: null })}
              min={1}
              dimValue={!draft.specsTouched}
            />
          </Field>
        ) : (
          <>
            <Field
              label="Unit floor"
              required
              hint={
                draft.floor !== null && draft.totalFloors !== null && draft.floor > draft.totalFloors
                  ? `Can't be higher than the building (${draft.totalFloors} floors).`
                  : draft.floor === 0
                  ? "✓ Ground floor (G)"
                  : draft.floor === null
                  ? "Step down to “Ground (G)” for ground level"
                  : "Which floor your unit is on"
              }
            >
              {/* UX-323: single aligned stepper — 0 renders as “Ground (G)”,
                  mirroring how Bedrooms steps down to “Studio”. Replaces the
                  old separate Ground(G) button + “suggested” stepper combo
                  that read as two disconnected controls for one value. */}
              <NumberStepper
                value={draft.floor ?? 1}
                onChange={(n) => touchPatch({ floor: n })}
                min={0}
                max={draft.totalFloors ?? 200}
                zeroLabel="Ground (G)"
                dimValue={draft.floor === null}
              />
            </Field>
            <Field label="Floors in building" required hint="Total storeys in the whole building">
              <NumberStepper
                value={draft.totalFloors ?? 1}
                onChange={(n) => touchPatch({ totalFloors: n, floor: draft.floor !== null && draft.floor > n ? n : draft.floor })}
                min={1}
                dimValue={!draft.specsTouched}
              />
            </Field>
          </>
        )}
      </Row>

      <Field label="Furnishing" required>
        <ChipGroup
          value={draft.furnished ?? undefined}
          onChange={(v) => patch({ furnished: v as PropertyDraft["furnished"] })}
          options={[
            { value: "Fully", label: "Fully furnished" },
            { value: "Semi", label: "Partially furnished" },
            { value: "Unfurnished", label: "Unfurnished" },
          ]}
        />
      </Field>

      <Field label="Parking">
        <div className="flex items-center gap-3">
          <NumberStepper value={draft.parkingSpaces} onChange={(n) => patch({ parkingSpaces: n, parkingIncluded: n === 0 ? false : draft.parkingIncluded })} />
          {draft.parkingSpaces > 0 && (
            <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
              <Checkbox
                checked={draft.parkingIncluded}
                onCheckedChange={(c) => patch({ parkingIncluded: !!c })}
              />
              Included in rent
            </label>
          )}
        </div>
      </Field>
    </div>
  );
}

export const specsSection: SectionDef = {
  id: "specs",
  label: "Property type & size",
  group: "basics",
  required: true,
  estTime: "2 min",
  isComplete: (d) =>
    d.assetTypeId !== null &&
    d.propertyCategoryId !== null &&
    d.bedrooms !== null &&
    d.areaSqm !== null &&
    d.furnished !== null,
  summary: (d) => {
    if (d.assetTypeId === null || d.bedrooms === null) return "—";
    // UX-338: bedroom count is already shown as the right-aligned headline
    // (headlineFor → "1 bed" / "Studio"), so leaving it here too produced a
    // duplicate ("1 bed · 1 bath · 42 m² · 1 bed"). Drop it from the summary
    // and surface furnishing instead.
    const furnishLabel =
      d.furnished === "Fully" ? "Fully furnished"
      : d.furnished === "Semi" ? "Partially furnished"
      : d.furnished === "Unfurnished" ? "Unfurnished"
      : null;
    const parts = [
      `${d.bathrooms} bath`,
      d.areaSqm ? `${d.areaSqm} m²` : null,
      furnishLabel,
    ].filter(Boolean);
    return parts.join(" · ");
  },
  Form: SpecsDialog,
};
