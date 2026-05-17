import { Textarea } from "@/components/ui/textarea";
import type { CheckInMethod } from "@/lib/types";
import type { SectionDef, SectionDialogProps } from "../types";
import { ChipGroup, Field } from "../ui";

const METHOD_LABEL: Record<CheckInMethod, string> = {
  KeyHandover: "Key handover",
  Keybox: "Lockbox",
  Smartlock: "Smart lock",
  Reception: "Doorman / reception",
  Other: "Other",
};

function CheckInDialog({ draft, patch }: SectionDialogProps) {
  return (
    <div>
      <Field label="Check-in method" required>
        <ChipGroup
          value={draft.checkInMethod || undefined}
          onChange={(v) => patch({ checkInMethod: v as CheckInMethod })}
          options={Object.entries(METHOD_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <Field label="Access instructions" required>
        <Textarea
          value={draft.checkInInstructions}
          onChange={(e) => patch({ checkInInstructions: e.target.value })}
          rows={4}
          placeholder="Gate code: 1234 · Parking: B1 · Call +66 81 xxx if any issue"
        />
      </Field>
    </div>
  );
}

export const checkinSection: SectionDef = {
  id: "checkin",
  label: "Check-in",
  group: "stay",
  required: true,
  estTime: "1 min",
  isComplete: (d) => !!d.checkInMethod && d.checkInInstructions.trim().length > 0,
  summary: (d) => (d.checkInMethod ? METHOD_LABEL[d.checkInMethod as CheckInMethod] : "—"),
  Form: CheckInDialog,
};
