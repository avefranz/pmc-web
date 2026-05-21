import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";
import { Checkbox } from "@/components/ui/checkbox";

const UTILITY_FIELDS = [
  { key: "utilityElectricity", label: "Electricity" },
  { key: "utilityWater", label: "Water" },
  { key: "utilityInternet", label: "Internet / WiFi" },
  { key: "utilityAircon", label: "Air-conditioning" },
  { key: "utilityGarbage", label: "Garbage collection" },
] as const;

function UtilitiesDialog({ draft, patch }: SectionDialogProps) {
  return (
    <Field
      label="Utilities included in rent"
      hint="Anything checked here is covered. Unchecked = tenant pays separately."
    >
      <div className="grid grid-cols-2 gap-2.5">
        {UTILITY_FIELDS.map((u) => {
          const checked = draft[u.key];
          return (
            <label
              key={u.key}
              className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-border bg-bg cursor-pointer hover:border-fg-subtle"
            >
              <Checkbox checked={checked} onCheckedChange={(c) => patch({ [u.key]: !!c } as never)} />
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
  required: true,
  estTime: "1 min",
  isComplete: () => true,
  summary: (d) => {
    const yes = UTILITY_FIELDS.filter((u) => d[u.key]).map((u) => u.label);
    if (yes.length === 0) return "None included — tenant pays separately";
    if (yes.length <= 2) return yes.join(", ");
    return `${yes.length} utilities included`;
  },
  Form: UtilitiesDialog,
};
