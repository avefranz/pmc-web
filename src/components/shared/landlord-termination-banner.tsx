import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CountdownPill } from "@/components/shared/countdown-pill";
import { formatThb, formatDate } from "@/lib/utils/format";
import { useCureCancellation } from "@/lib/hooks/use-bookings";
import type { BookingCancellationDto } from "@/lib/types";

/**
 * Critical alert shown to the **tenant** when the landlord has initiated termination.
 *
 * For "NonPayment" reason, the tenant has a cure right: paying the outstanding amount
 * cancels the termination. The component surfaces the cure deadline and a "Pay now" CTA.
 *
 * For "Breach" / "MutualAgreement" reasons, no cure — just an acknowledgement view.
 */
export function LandlordTerminationBanner({
  cancellation,
  bookingId,
  onPay,
  fallbackOutstandingAmount,
}: {
  cancellation: BookingCancellationDto;
  bookingId: string;
  onPay?: () => void;
  /** Client-side fallback if backend didn't compute outstandingAmount. */
  fallbackOutstandingAmount?: number;
}) {
  const cure = useCureCancellation(bookingId);
  const reason = cancellation.reason ?? "Breach";
  const isNonPayment = reason === "NonPayment";
  const cureDeadline = cancellation.cureDeadline ??
    new Date(new Date(cancellation.createdAt).getTime() + 7 * 86_400_000).toISOString();
  const outstanding = cancellation.outstandingAmount ?? fallbackOutstandingAmount ?? 0;
  const hasKnownAmount = outstanding > 0;

  return (
    <div className="bg-danger/10 border-2 border-danger/40 rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-danger" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-bold text-danger">
              {isNonPayment ? "Termination notice — non-payment" : reason === "Breach" ? "Termination notice — breach of agreement" : "Termination notice — mutual agreement"}
            </p>
            <CountdownPill
              deadline={isNonPayment ? cureDeadline : (cancellation.expiresAt ?? cureDeadline)}
              prefix={isNonPayment ? "Pay or vacate in" : "Effective in"}
              expiredLabel="Deadline passed"
              className="bg-white/60"
            />
          </div>

          {cancellation.initiatorNote && (
            <p className="text-sm text-fg mt-2 leading-relaxed">
              <span className="font-medium">Host's reason:</span> "{cancellation.initiatorNote}"
            </p>
          )}

          {isNonPayment ? (
            <div className="mt-3 space-y-2">
              {hasKnownAmount ? (
                <p className="text-sm text-fg">
                  Outstanding: <span className="font-bold">{formatThb(outstanding)}</span>.
                  Pay this in full by <span className="font-bold">{formatDate(cureDeadline)}</span> to cancel
                  the termination and stay in the property.
                </p>
              ) : (
                <p className="text-sm text-fg">
                  Pay <span className="font-bold">every overdue rent invoice</span> by{" "}
                  <span className="font-bold">{formatDate(cureDeadline)}</span> to cancel the termination.
                  The exact amount is shown on each invoice — make sure none are left Pending.
                </p>
              )}
              <p className="text-xs text-fg-muted">
                After paying, tap "I've paid — confirm" so we re-check your invoices.
                If the deadline passes unpaid, the booking terminates and your deposit is applied to the
                unpaid rent. Any remainder is refunded.
              </p>
              <div className="flex gap-2 pt-1 flex-wrap">
                {onPay && (
                  <Button
                    onClick={onPay}
                    className="bg-danger hover:bg-danger/90 text-white rounded-xl h-10 px-5 font-semibold"
                  >
                    {hasKnownAmount ? `Pay ${formatThb(outstanding)} now` : "Pay outstanding now"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="rounded-xl h-10 border-border"
                  disabled={cure.isPending}
                  onClick={async () => {
                    try {
                      await cure.mutateAsync(cancellation.id);
                      toast.success("Termination cancelled — your stay continues");
                    } catch (err) {
                      const status = (err as { response?: { status?: number } } | null)?.response?.status;
                      if (status === 409 || status === 422) {
                        toast.error("Some rent is still unpaid — pay every overdue invoice first");
                      } else {
                        toast.error("Couldn't cure — make sure all rent is paid first");
                      }
                    }
                  }}
                >
                  {cure.isPending ? "Checking…" : "I've paid — confirm"}
                </Button>
              </div>
            </div>
          ) : reason === "Breach" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-fg">
                Effective on <span className="font-bold">{formatDate(cancellation.earliestExitDate)}</span>.
                You can dispute the host's claim through Siamo support — contact us within 7 days.
              </p>
              <p className="text-xs text-fg-muted">
                Damages may be deducted from your deposit. Net refund:{" "}
                <span className="font-medium text-fg">{formatThb(cancellation.netRefund)}</span>.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-fg">
                Effective on <span className="font-bold">{formatDate(cancellation.earliestExitDate)}</span>.
                No penalties apply.
              </p>
              <p className="text-xs text-fg-muted">
                Your full deposit of{" "}
                <span className="font-medium text-fg">{formatThb(cancellation.depositRefundAmount)}</span> will
                be returned after check-out.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
