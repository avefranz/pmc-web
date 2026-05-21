import { Input } from "@/components/ui/input";
import { formatThb } from "@/lib/utils/format";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

function PricingDialog({ draft, patch }: SectionDialogProps) {
  return (
    <div>
      <Field label="Monthly rent (THB)" required>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted font-semibold text-sm pointer-events-none">
            ฿
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={draft.baseMonthlyRate || ""}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^\d]/g, "") || 0);
              patch({ baseMonthlyRate: n });
            }}
            className="pl-7 font-semibold"
            placeholder="22,000"
          />
        </div>
      </Field>

      <Field
        label="Security deposit (THB)"
        optional
        hint="Typically 1–2 months of rent. Enter 0 if no deposit required."
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted font-semibold text-sm pointer-events-none">
            ฿
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={draft.depositAmount || ""}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^\d]/g, "") || 0);
              patch({ depositAmount: n });
            }}
            className="pl-7"
            placeholder="44,000"
          />
        </div>
      </Field>

      {draft.baseMonthlyRate > 0 && (
        <div className="rounded-lg bg-bg-subtle p-3 text-xs text-fg-muted">
          Tenants will pay{" "}
          <strong className="text-fg">{formatThb(draft.baseMonthlyRate)}</strong> per month
          {draft.depositAmount > 0 && (
            <>
              {" "}plus a{" "}
              <strong className="text-fg">{formatThb(draft.depositAmount)}</strong> refundable deposit
            </>
          )}
          .
        </div>
      )}
    </div>
  );
}

export const pricingSection: SectionDef = {
  id: "pricing",
  label: "Pricing",
  group: "basics",
  required: true,
  estTime: "30 sec",
  isComplete: (d) => d.baseMonthlyRate >= 1000,
  summary: (d) => (d.baseMonthlyRate ? `${formatThb(d.baseMonthlyRate)}/mo` : "—"),
  Form: PricingDialog,
};
