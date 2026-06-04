import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useBookingsByAsset } from "@/lib/hooks/use-bookings";
import type { SectionDef, SectionDialogProps } from "../types";
import { ChipGroup, Field } from "../ui";

// UX-354: keep the pet-deposit input visually consistent with the formatted
// ฿-prefixed Monthly rent / Security deposit fields (pricing.tsx) — no native
// number spinner, thousands separators, leading ฿.
const MAX_PET_DEPOSIT = 10_000_000;
function formatWithCommas(n: number): string {
  if (!n) return "";
  return n.toLocaleString("en-US");
}

function PetsDialog({ draft, patch, mode, assetId }: SectionDialogProps) {
  // BUG-262: pet deposit считается частью pricing — лочим вместе с rent/deposit.
  const { data: bookings } = useBookingsByAsset(assetId ?? "");
  const activeStatuses = ["Confirmed", "Active", "AwaitingPayment", "PendingPayment"];
  const activeCount =
    mode === "edit" && assetId
      ? (bookings ?? []).filter((b) => activeStatuses.includes(b.status)).length
      : 0;
  const lockDeposit = activeCount > 0;

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
        <Field
          label="Pet deposit (THB)"
          optional
          hint={
            lockDeposit
              ? <span className="text-fg-muted">Locked — can't change while you have active reservations.</span>
              : "Extra refundable deposit for pet damages."
          }
        >
          {lockDeposit && (
            <div className="mb-2 rounded-md bg-danger/8 border border-danger/20 px-2 py-1.5 text-[11px] flex items-center gap-1.5">
              <Lock size={11} className="text-danger" />
              <span className="text-fg-muted">
                {activeCount} active {activeCount === 1 ? "reservation" : "reservations"} — pet deposit is part of pricing
              </span>
            </div>
          )}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted font-semibold text-sm pointer-events-none">
              ฿
            </span>
            <Input
              type="text"
              inputMode="numeric"
              value={formatWithCommas(draft.petDeposit ?? 0)}
              disabled={lockDeposit}
              title={lockDeposit ? "Cannot change pet deposit while you have active reservations." : undefined}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                if (lockDeposit) return;
                const n = Number(e.target.value.replace(/[^\d]/g, "") || 0);
                patch({ petDeposit: Math.min(n, MAX_PET_DEPOSIT) });
              }}
              className={`pl-7 ${lockDeposit ? "opacity-60 cursor-not-allowed" : ""}`}
              placeholder="8,000"
            />
          </div>
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
