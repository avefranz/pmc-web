import { cn } from "@/lib/utils/cn";
import type { PropertyDraft, SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

interface Policy {
  id: string;
  title: string;
  desc: string;
  noticeDays: number;
  penaltyMonths: number;
}

const POLICIES: Policy[] = [
  { id: "flexible", title: "Flexible", desc: "Full refund up to 7 days before move-in", noticeDays: 7, penaltyMonths: 0 },
  { id: "moderate", title: "Moderate", desc: "Full refund up to 14 days before move-in", noticeDays: 14, penaltyMonths: 0 },
  { id: "strict", title: "Strict", desc: "Notice 30 days · 1 month penalty otherwise", noticeDays: 30, penaltyMonths: 1 },
  { id: "non-refundable", title: "Non-refundable", desc: "No refund after booking", noticeDays: 0, penaltyMonths: 1 },
];

function activePolicy(d: PropertyDraft): string {
  return (
    POLICIES.find((p) => p.noticeDays === d.cancellationNoticeDays && p.penaltyMonths === d.cancellationPenaltyMonths)?.id ??
    "moderate"
  );
}

function CancelDialog({ draft, patch }: SectionDialogProps) {
  const active = activePolicy(draft);
  return (
    <div>
      <Field label="Cancellation policy" hint="Affects how flexible tenants find your listing.">
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
                  "text-left p-3 rounded-xl border-2 flex items-center gap-3 transition-all",
                  isActive ? "border-fg bg-bg-subtle" : "border-border bg-bg hover:border-fg-subtle",
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                    isActive ? "border-fg" : "border-fg-subtle",
                  )}
                >
                  {isActive && <div className="w-2.5 h-2.5 rounded-full bg-fg" />}
                </div>
                <div>
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-xs text-fg-muted mt-0.5">{p.desc}</div>
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
  // UX-76: only complete once host has explicitly chosen a policy
  isComplete: (d) => d.cancellationTouched,
  summary: (d) => POLICIES.find((p) => p.id === activePolicy(d))?.title ?? "Moderate",
  Form: CancelDialog,
};
