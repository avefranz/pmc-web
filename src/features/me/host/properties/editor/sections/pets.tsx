import { Input } from "@/components/ui/input";
import type { SectionDef, SectionDialogProps } from "../types";
import { ChipGroup, Field } from "../ui";

function PetsDialog({ draft, patch }: SectionDialogProps) {
  return (
    <div>
      <Field label="Are pets allowed?">
        {/* UX-79: pass undefined when host hasn't made a choice — neither chip highlighted */}
        <ChipGroup
          value={draft.petsExplicitlySet ? (draft.petsAllowed ? "yes" : "no") : undefined}
          onChange={(v) => patch({ petsAllowed: v === "yes", petsExplicitlySet: true })}
          options={[
            { value: "no", label: "Not allowed" },
            { value: "yes", label: "Pets welcome" },
          ]}
        />
      </Field>
      {draft.petsAllowed && (
        <Field label="Pet deposit (THB)" optional hint="Extra refundable deposit for pet damages.">
          <Input
            type="number"
            value={draft.petDeposit || ""}
            onChange={(e) => patch({ petDeposit: Number(e.target.value || 0) })}
            placeholder="0"
          />
        </Field>
      )}
    </div>
  );
}

export const petsSection: SectionDef = {
  id: "pets",
  label: "Pets",
  group: "stay",
  required: true,
  estTime: "20 sec",
  // Require explicit acknowledgement — default "Not allowed" is not a choice the host made.
  isComplete: (d) => d.petsExplicitlySet === true,
  summary: (d) => (d.petsAllowed ? "Welcome" : "Not allowed"),
  Form: PetsDialog,
};
