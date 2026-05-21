import { Input } from "@/components/ui/input";
import { formatThb } from "@/lib/utils/format";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

const MIN_RENT  = 1000;       // ~$30 — under this is almost certainly a typo
const MAX_RENT  = 2_000_000;  // ~$60k/mo — luxury cap; above is almost certainly a typo
const MAX_DEPOSIT = 10_000_000;

function formatWithCommas(n: number): string {
  if (!n) return "";
  return n.toLocaleString("en-US");
}

function PricingDialog({ draft, patch }: SectionDialogProps) {
  const rent = draft.baseMonthlyRate;
  const deposit = draft.depositAmount;

  const rentError =
    rent > 0 && rent < MIN_RENT  ? `Minimum ${formatThb(MIN_RENT)}/month — under this is usually a typo.` :
    rent > MAX_RENT              ? `Above ${formatThb(MAX_RENT)} looks unrealistic — please double-check.` :
    null;

  const depositWarning =
    rent > 0 && deposit > 0 && deposit > rent * 3
      ? `Deposit is ${(deposit / rent).toFixed(1)}× the rent — most Thai landlords charge 1–2 months.`
      : null;

  return (
    <div>
      <Field
        label="Monthly rent (THB)"
        required
        hint={rentError ? <span className="text-danger">{rentError}</span> : "Set a fair monthly rate — tenants compare across listings."}
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted font-semibold text-sm pointer-events-none">
            ฿
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={formatWithCommas(rent)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^\d]/g, "") || 0);
              patch({ baseMonthlyRate: Math.min(n, MAX_RENT + 1) });
            }}
            className={`pl-7 font-semibold ${rentError ? "border-destructive" : ""}`}
            placeholder="22,000"
          />
        </div>
      </Field>

      <Field
        label="Security deposit (THB)"
        optional
        hint={
          depositWarning
            ? <span className="text-warning">{depositWarning}</span>
            : "Typically 1–2 months of rent. Enter 0 if no deposit required."
        }
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted font-semibold text-sm pointer-events-none">
            ฿
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={formatWithCommas(deposit)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^\d]/g, "") || 0);
              patch({ depositAmount: Math.min(n, MAX_DEPOSIT) });
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
  isComplete: (d) => d.baseMonthlyRate >= MIN_RENT && d.baseMonthlyRate <= MAX_RENT,
  summary: (d) => (d.baseMonthlyRate ? `${formatThb(d.baseMonthlyRate)}/mo` : "—"),
  Form: PricingDialog,
};
