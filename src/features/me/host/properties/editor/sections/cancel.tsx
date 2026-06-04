import { cn } from "@/lib/utils/cn";
import type { PropertyDraft, SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

interface Policy {
  id: string;
  title: string;
  desc: string;
  noticeDays: number;
  penaltyMonths: number;
  examples: { when: string; outcome: string }[];
  appeal: string;
  recommended?: boolean;
}

// UX-314: rewritten for clarity. This policy only covers a tenant cancelling
// BEFORE they move in. Each tier has one free-cancellation window; cancel
// inside it and the late-cancellation fee below applies. Per owner decision
// (2026-06-03) the fee is withheld from the tenant's security deposit — any
// remaining deposit is refunded. (BE TODO: wire noticeDays/penaltyMonths into
// the actual refund calc — currently only EarlyExitPenaltyMonths is used.)
const POLICIES: Policy[] = [
  {
    id: "flexible",
    title: "Flexible",
    desc: "Free cancellation up to 7 days before move-in",
    noticeDays: 7,
    penaltyMonths: 0,
    examples: [
      { when: "More than 7 days before move-in", outcome: "The deposit is refunded in full — you keep nothing." },
      { when: "Within 7 days of move-in", outcome: "You keep half a month's rent from the deposit; the rest of the deposit is refunded." },
    ],
    appeal: "Most attractive to last-minute bookers — expect more requests.",
  },
  {
    id: "moderate",
    title: "Moderate",
    desc: "Free cancellation up to 14 days before move-in",
    noticeDays: 14,
    penaltyMonths: 0,
    examples: [
      { when: "More than 14 days before move-in", outcome: "The deposit is refunded in full — you keep nothing." },
      { when: "Within 14 days of move-in", outcome: "You keep half a month's rent from the deposit; the rest of the deposit is refunded." },
    ],
    appeal: "Balanced — what most hosts in Chiang Mai use.",
    recommended: true,
  },
  {
    id: "strict",
    title: "Strict",
    desc: "Free cancellation only up to 30 days before move-in",
    noticeDays: 30,
    penaltyMonths: 1,
    examples: [
      { when: "More than 30 days before move-in", outcome: "The deposit is refunded in full — you keep nothing." },
      { when: "Within 30 days of move-in", outcome: "You keep one month's rent from the deposit; any remaining deposit is refunded." },
    ],
    appeal: "For long stays where a last-minute drop-out would hurt most.",
  },
  {
    id: "non-refundable",
    title: "Non-refundable",
    desc: "No refund once the booking is confirmed",
    noticeDays: 0,
    penaltyMonths: 1,
    examples: [
      { when: "Any time after booking", outcome: "You keep one month's rent from the deposit. No further refund." },
    ],
    appeal: "Maximum protection — but tenants hesitate to book it.",
  },
];

function matchedPolicy(d: PropertyDraft): Policy | undefined {
  return POLICIES.find(
    (p) => p.noticeDays === d.cancellationNoticeDays && p.penaltyMonths === d.cancellationPenaltyMonths,
  );
}

function activePolicy(d: PropertyDraft): string {
  return matchedPolicy(d)?.id ?? "moderate";
}

function CancelDialog({ draft, patch }: SectionDialogProps) {
  const active = activePolicy(draft);
  return (
    <div>
      <p className="text-[13px] text-fg-muted leading-relaxed mb-3">
        This sets what happens if a tenant cancels <strong className="text-fg">before they move in</strong>.
        Each tier has a free-cancellation window; cancel inside it and a late fee
        is withheld from the <strong className="text-fg">security deposit</strong> —
        anything left in the deposit is refunded.
      </p>
      <Field label="Cancellation policy" hint="Stricter policies protect your calendar; flexible ones attract more bookings.">
        <div className="grid gap-2.5">
          {POLICIES.map((p) => {
            const isActive = active === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  patch({ cancellationNoticeDays: p.noticeDays, cancellationPenaltyMonths: p.penaltyMonths, cancellationTouched: true })
                }
                className={cn(
                  "text-left p-4 rounded-xl border-2 flex items-start gap-3 transition-all w-full",
                  isActive ? "border-fg bg-bg-subtle" : "border-border bg-bg hover:border-fg-subtle",
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5",
                    isActive ? "border-fg" : "border-fg-subtle",
                  )}
                >
                  {isActive && <div className="w-2.5 h-2.5 rounded-full bg-fg" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-sm">{p.title}</div>
                    {p.recommended && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5">{p.desc}</div>
                  {isActive && (
                    <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                      {p.examples.map((ex, i) => (
                        <div key={i} className="grid grid-cols-[auto,1fr] gap-3 text-xs">
                          <span className="text-fg-muted">{ex.when}</span>
                          <span className="font-medium text-fg">{ex.outcome}</span>
                        </div>
                      ))}
                      <div className="text-xs text-fg-muted italic pt-1">{p.appeal}</div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

export const cancelSection: SectionDef = {
  id: "cancel",
  label: "Cancellation policy",
  group: "stay",
  required: false,
  estTime: "30 sec",
  // BUG-362: the editor seeds a concrete default policy (Moderate — 14 days /
  // 0 penalty, see EMPTY_DRAFT) and renders that radio pre-selected, so the
  // default IS genuinely applied and will be saved. Count the section complete
  // whenever the draft resolves to a known tier (the seeded default always
  // does), instead of waiting for an explicit click — otherwise the row read
  // "Not set" while the UI showed Moderate selected and Continue was active.
  // `cancellationTouched` stays as a belt-and-braces signal for edit-mode
  // listings whose stored values don't map onto one of our tiers.
  isComplete: (d) => d.cancellationTouched || matchedPolicy(d) !== undefined,
  summary: (d) => matchedPolicy(d)?.title ?? "Moderate",
  Form: CancelDialog,
};
