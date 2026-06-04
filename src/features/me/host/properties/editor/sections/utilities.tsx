import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";

const UTILITY_FIELDS = [
  { key: "utilityElectricity", label: "Electricity" },
  { key: "utilityWater", label: "Water" },
  { key: "utilityInternet", label: "Internet / WiFi" },
  { key: "utilityAircon", label: "Air-conditioning" },
  { key: "utilityGarbage", label: "Garbage collection" },
] as const;

function UtilitiesDialog({ draft, patch }: SectionDialogProps) {
  const anyChecked = UTILITY_FIELDS.some((u) => draft[u.key]);
  const noneIncludedConfirmed = draft.utilitiesTouched && !anyChecked;

  return (
    <Field
      label="Utilities included in rent"
      hint="Anything checked here is covered. Unchecked = tenant pays separately."
    >
      <label
        className={cn(
          "flex items-center gap-2.5 p-3 rounded-xl border-2 bg-bg cursor-pointer mb-2.5 transition-colors",
          noneIncludedConfirmed
            ? "border-fg bg-fg/5"
            : "border-border hover:border-fg-subtle",
        )}
      >
        <Checkbox
          checked={noneIncludedConfirmed}
          onCheckedChange={(c) => {
            if (c) {
              patch({
                utilityElectricity: false,
                utilityWater: false,
                utilityInternet: false,
                utilityAircon: false,
                utilityGarbage: false,
                utilitiesTouched: true,
              });
            } else {
              patch({ utilitiesTouched: false });
            }
          }}
        />
        <span className="text-sm font-medium text-fg">
          Nothing included — tenant pays for everything separately
        </span>
      </label>
      <div className={cn("grid grid-cols-2 gap-2.5 transition-opacity", noneIncludedConfirmed && "opacity-50 pointer-events-none")}>
        {UTILITY_FIELDS.map((u) => {
          const checked = draft[u.key];
          return (
            <label
              key={u.key}
              className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-border bg-bg cursor-pointer hover:border-fg-subtle"
            >
              <Checkbox checked={checked} onCheckedChange={(c) => patch({ [u.key]: !!c, utilitiesTouched: true } as never)} />
              <span className="text-sm font-medium text-fg">{u.label}</span>
            </label>
          );
        })}
      </div>
    </Field>
  );
}

export const utilitiesSection: SectionDef = {
  id: "utilities",
  label: "Utilities included",
  group: "included",
  required: false,
  estTime: "1 min",
  // UX-75: only complete once host has explicitly interacted with the section
  isComplete: (d) => d.utilitiesTouched,
  summary: (d) => {
    const yes = UTILITY_FIELDS.filter((u) => d[u.key]).map((u) => u.label);
    if (yes.length === 0) return "None included — tenant pays separately";
    if (yes.length <= 2) return yes.join(", ");
    return `${yes.length} utilities included`;
  },
  Form: UtilitiesDialog,
};
