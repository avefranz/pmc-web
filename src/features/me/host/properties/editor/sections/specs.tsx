import React from "react";
import { Building, Building2, Home, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useReferences } from "@/lib/hooks/use-references";
import type { PropertyDraft, SectionDef, SectionDialogProps } from "../types";
import { ChipGroup, Field, NumberStepper, PickerCard, Row } from "../ui";

const ICONS: Record<string, React.ReactElement> = {
  apartment: <Building2 size={20} />,
  condo: <Building size={20} />,
  house: <Home size={20} />,
  other: <Box size={20} />,
};

function pickIcon(code?: string, label?: string): React.ReactElement {
  const key = (code ?? label ?? "").toLowerCase();
  if (key.includes("apart")) return ICONS.apartment;
  if (key.includes("condo")) return ICONS.condo;
  if (key.includes("house") || key.includes("villa")) return ICONS.house;
  return ICONS.other;
}

function isHouseVilla(types: { id: number; code?: string; name: string | Record<string, string> }[], assetTypeId: number | null): boolean {
  if (assetTypeId === null) return false;
  const t = types.find((t) => t.id === assetTypeId);
  if (!t) return false;
  const nameStr = typeof t.name === "string" ? t.name : (t.name["en"] ?? Object.values(t.name)[0] ?? "");
  const key = (t.code ?? nameStr).toLowerCase();
  return key.includes("house") || key.includes("villa");
}

function SpecsDialog({ draft, patch }: SectionDialogProps) {
  const { data: refs } = useReferences();
  const types = refs?.unitTypes ?? [];
  const isHouse = isHouseVilla(types, draft.assetTypeId);

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

      <Row cols={3}>
        <Field label="Bedrooms" required>
          <NumberStepper value={draft.bedrooms ?? 0} onChange={(n) => patch({ bedrooms: n })} />
        </Field>
        <Field label="Bathrooms" required>
          <NumberStepper value={draft.bathrooms} onChange={(n) => patch({ bathrooms: n })} min={1} />
        </Field>
        <Field label="Max guests" required>
          <NumberStepper value={draft.maxOccupancy} onChange={(n) => patch({ maxOccupancy: n })} min={1} />
        </Field>
      </Row>

      <Row cols={isHouse ? 1 : 3}>
        <Field label="Area (m²)" required>
          <Input
            type="number"
            value={draft.areaSqm ?? ""}
            onChange={(e) => patch({ areaSqm: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </Field>
        {!isHouse && (
          <>
            <Field label="Unit floor" required>
              <NumberStepper value={draft.floor ?? 0} onChange={(n) => patch({ floor: n })} />
            </Field>
            <Field label="Floors in building" required>
              <NumberStepper value={draft.totalFloors ?? 1} onChange={(n) => patch({ totalFloors: n })} min={1} />
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
          <NumberStepper value={draft.parkingSpaces} onChange={(n) => patch({ parkingSpaces: n })} />
          <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
            <Checkbox
              checked={draft.parkingIncluded}
              onCheckedChange={(c) => patch({ parkingIncluded: !!c })}
            />
            Included in rent
          </label>
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
  isComplete: (d) => d.assetTypeId !== null && d.bedrooms !== null && d.areaSqm !== null && d.furnished !== null,
  summary: (d) => {
    if (d.assetTypeId === null || d.bedrooms === null) return "—";
    const parts = [
      `${d.bedrooms === 0 ? "Studio" : `${d.bedrooms} bed`}`,
      `${d.bathrooms} bath`,
      d.areaSqm ? `${d.areaSqm} m²` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  },
  Form: SpecsDialog,
};
