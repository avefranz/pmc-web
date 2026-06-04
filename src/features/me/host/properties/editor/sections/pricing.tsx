import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatThb } from "@/lib/utils/format";
import { useBookingsByAsset } from "@/lib/hooks/use-bookings";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

const MIN_RENT  = 1000;       // ~$30 — under this is almost certainly a typo
const MAX_RENT  = 2_000_000;  // ~$60k/mo — luxury cap; above is almost certainly a typo
const MAX_DEPOSIT = 10_000_000;

function formatWithCommas(n: number): string {
  if (!n) return "";
  return n.toLocaleString("en-US");
}

function PricingDialog({ draft, patch, mode, assetId }: SectionDialogProps) {
  const rent = draft.baseMonthlyRate;
  const deposit = draft.depositAmount;
  // UX-311: deposit-rules explainer modal — reassures the host that the
  // deposit is escrowed by Siamo and how/when they get their share.
  const [depositInfoOpen, setDepositInfoOpen] = useState(false);
  // UX-339: auto-suggest the deposit as 2× rent while the host hasn't set it
  // themselves. Seed as "user-owned" if a deposit already exists (edit mode /
  // restored draft) so we never clobber a real figure; once the host edits the
  // deposit field directly we stop tracking rent.
  const [depositUserEdited, setDepositUserEdited] = useState(() => draft.depositAmount > 0);

  // BUG-262: при наличии активных бронирований цена/депозит залочены — изменения
  // не должны влиять на уже подписанные контракты, а нынешний BE ещё не блокирует
  // PATCH на 409. FE-side гард: считаем заявку «активной» если booking в одном из
  // committed-статусов. Pending booking-requests пока не проверяем — на их DTO нет
  // listingId/assetId, фильтровать нечем; этот кусок BUG-262 ждёт BE.
  const { data: bookings } = useBookingsByAsset(assetId ?? "");
  const activeStatuses = ["Confirmed", "Active", "AwaitingPayment", "PendingPayment"];
  const activeBookings = (bookings ?? []).filter((b) => activeStatuses.includes(b.status));
  const activeCount = mode === "edit" && assetId ? activeBookings.length : 0;
  const hasActiveBooking = activeCount > 0;
  const locked = hasActiveBooking;

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
      {locked && (
        <div className="rounded-lg bg-danger/8 border border-danger/30 p-3 text-xs mb-4 flex items-start gap-2">
          <Lock size={14} className="text-danger shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-fg">
              Pricing locked · {activeCount} active {activeCount === 1 ? "reservation" : "reservations"}
            </p>
            <p className="text-fg-muted mt-0.5 leading-relaxed">
              You can't change the monthly rent or deposit while you have active tenants — their signed contracts already lock in the rate. Wait until all stays complete or cancel them first.
            </p>
          </div>
        </div>
      )}

      <Field
        label="Monthly rent (THB)"
        required
        hint={
          locked
            ? <span className="text-fg-muted">Locked — see notice above.</span>
            : rentError
              ? <span className="text-danger">{rentError}</span>
              : "Set a fair monthly rate — tenants compare across listings."
        }
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted font-semibold text-sm pointer-events-none">
            ฿
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={formatWithCommas(rent)}
            disabled={locked}
            title={locked ? "Cannot change rent while you have active reservations." : undefined}
            onChange={(e) => {
              if (locked) return;
              const n = Number(e.target.value.replace(/[^\d]/g, "") || 0);
              const nextRent = Math.min(n, MAX_RENT + 1);
              // UX-339: mirror a suggested 2× deposit until the host takes it
              // over. Clamped to the deposit ceiling like a manual entry.
              const nextPatch: { baseMonthlyRate: number; depositAmount?: number } = { baseMonthlyRate: nextRent };
              if (!depositUserEdited) nextPatch.depositAmount = Math.min(nextRent * 2, MAX_DEPOSIT);
              patch(nextPatch);
            }}
            className={`pl-7 font-semibold ${rentError ? "border-destructive" : ""} ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
            placeholder="22,000"
          />
        </div>
      </Field>

      <Field
        label="Security deposit (THB)"
        optional
        hint={
          locked
            ? <span className="text-fg-muted">Locked — see notice above.</span>
            : depositWarning
              ? <span className="text-warning">{depositWarning}</span>
              : !depositUserEdited && deposit > 0
                ? "Suggested at 2× rent — edit to set your own, or leave as is."
                : "Typically 1–2 months of rent. Leave blank for no deposit."
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
            disabled={locked}
            title={locked ? "Cannot change deposit while you have active reservations." : undefined}
            // BUG-365: the auto-suggested 2× value is a real input value, not a
            // placeholder — typing over it without selecting first concatenated
            // the digits ("56,000" → "56,00056000") and clamped to the 10M cap.
            // Select-all on focus so the first keystroke replaces the suggestion
            // cleanly (same pattern as the postal-code field, BUG-80).
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              if (locked) return;
              setDepositUserEdited(true); // UX-339: host owns it now — stop auto-tracking rent.
              const n = Number(e.target.value.replace(/[^\d]/g, "") || 0);
              patch({ depositAmount: Math.min(n, MAX_DEPOSIT) });
            }}
            className={`pl-7 ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
            placeholder="44,000"
          />
        </div>
      </Field>

      {/* UX-311: deposit escrow reassurance. Always shown once a deposit is
          set — landlords worry the money goes straight to the tenant. */}
      {deposit > 0 && (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/[0.07] p-3.5 mb-4 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-[13px] leading-relaxed">
            <p className="text-fg">
              The <strong className="font-semibold">{formatThb(deposit)}</strong> deposit is{" "}
              <strong className="font-semibold">held securely by Siamo</strong> — never paid straight to
              the tenant. At move-out you can claim deductions for damage or unpaid rent; Siamo
              releases your share and returns the rest.
            </p>
            <button
              type="button"
              onClick={() => setDepositInfoOpen(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <Info size={12} /> How the deposit works
            </button>
          </div>
        </div>
      )}

      {draft.baseMonthlyRate > 0 && (
        <div className="rounded-lg bg-bg-subtle p-3 text-xs text-fg-muted">
          Tenants will pay{" "}
          <strong className="text-fg">{formatThb(draft.baseMonthlyRate)}</strong> per month
          {draft.depositAmount > 0 && (
            <>
              {" "}plus a{" "}
              <strong className="text-fg">{formatThb(draft.depositAmount)}</strong> deposit
              {" "}(held in escrow)
            </>
          )}
          .
        </div>
      )}

      {/* Deposit rules modal */}
      <Dialog open={depositInfoOpen} onOpenChange={setDepositInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              How the security deposit works
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[13.5px] leading-relaxed text-fg-muted">
            <p>
              When a tenant books, their deposit goes into{" "}
              <strong className="text-fg">Siamo escrow</strong> — a neutral hold, not the tenant's
              pocket and not yours. It sits there untouched for the whole stay.
            </p>
            <div className="rounded-xl bg-bg-subtle p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                <p className="text-fg"><strong className="font-semibold">At move-out</strong>, you have a window to report any damage or unpaid rent — with photos / receipts as evidence.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                <p className="text-fg"><strong className="font-semibold">Siamo settles it.</strong> Your claimed amount (backed by the receipts) is transferred to you; the remaining balance goes back to the tenant.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                <p className="text-fg"><strong className="font-semibold">No claim, no problem.</strong> If everything's fine, the full deposit returns to the tenant and nobody has to chase anyone.</p>
              </div>
            </div>
            <p className="flex items-start gap-2 text-fg">
              <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>You're never left out of pocket waiting on a tenant — and tenants trust the listing more knowing it's protected. Both sides win.</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
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
