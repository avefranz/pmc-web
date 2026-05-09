import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Building2, Smartphone, AlertCircle } from "lucide-react";
import QRCode from "react-qr-code";
import generatePayload from "promptpay-qr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBookingPayment, useConfirmTransfer } from "@/lib/hooks/use-bookings";
import { formatThb } from "@/lib/utils/format";
import type { PaymentRecordDto } from "@/lib/types";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentRecordDto["status"] }) {
  if (status === "LandlordConfirmed") return (
    <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Confirmed</span>
  );
  if (status === "TenantConfirmed") return (
    <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">Awaiting host</span>
  );
  return (
    <span className="text-xs font-medium text-fg-muted bg-bg-subtle px-2 py-0.5 rounded-full">Pending</span>
  );
}

const PAYMENT_LABELS: Record<PaymentRecordDto["type"], string> = {
  Deposit: "Security deposit",
  FirstMonth: "First month's rent",
  EarlyExitPenalty: "Early exit penalty",
};

export function GuestPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const { data: payment, isLoading } = useBookingPayment(id!);
  const confirmTransfer = useConfirmTransfer(id!);

  const [selectedPayment, setSelectedPayment] = useState<PaymentRecordDto | null>(null);
  const [transferNote, setTransferNote] = useState("");

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Link to={`/me/guest/bookings/${id}`} className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-semibold text-fg">Payment</h1>
        </div>
        <div className="bg-bg-card rounded-2xl shadow-card p-8 text-center">
          <AlertCircle size={32} className="text-fg-muted mx-auto mb-3" />
          <p className="text-fg-muted">Payment information not available.</p>
        </div>
      </div>
    );
  }

  const hasPromptPay = !!payment.promptPayId;
  const hasBankTransfer = !!(payment.bankAccountNumber);
  const pendingPayments = payment.payments.filter((p) => p.status === "Pending");

  let qrPayload: string | null = null;
  if (hasPromptPay && pendingPayments.length > 0) {
    try {
      qrPayload = generatePayload(payment.promptPayId!, { amount: pendingPayments[0].amount });
    } catch {
      // QR won't render if generation fails
    }
  }


  return (
    <div className="max-w-3xl space-y-5 pb-8">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Link
          to={`/me/guest/bookings/${id}`}
          className="p-1.5 rounded-xl hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-fg">Complete payment</h1>
      </div>

      {/* All confirmed */}
      {payment.isFullyPaid && (
        <div className="bg-success/10 border border-success/20 rounded-2xl px-5 py-4">
          <p className="text-sm font-semibold text-success">All payments confirmed</p>
          <p className="text-xs text-fg-muted mt-0.5">Your booking will be confirmed shortly.</p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-bg-card rounded-2xl shadow-card p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">Amount due</h3>
        <div className="flex justify-between text-sm">
          <span className="text-fg-muted">Security deposit</span>
          <span className="font-medium text-fg">{formatThb(payment.depositAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-fg-muted">First month's rent</span>
          <span className="font-medium text-fg">{formatThb(payment.firstMonthAmount)}</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between">
          <span className="font-semibold text-fg">Total</span>
          <span className="font-bold text-fg text-lg">{formatThb(payment.totalDue)}</span>
        </div>
      </div>

      {/* PromptPay */}
      {hasPromptPay && !payment.isFullyPaid && (
        <div className="bg-bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={16} className="text-fg-muted" />
            <h3 className="text-sm font-semibold text-fg">PromptPay</h3>
          </div>
          {qrPayload && (
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="p-4 bg-white rounded-2xl shadow-sm">
                <QRCode value={qrPayload} size={200} />
              </div>
              <p className="text-xs text-fg-muted text-center max-w-xs">
                Scan with any Thai banking app. After transferring, tap "I've paid" below.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-muted mb-1">PromptPay ID</p>
              <span className="font-mono text-base font-semibold text-fg">{payment.promptPayId}</span>
            </div>
            <CopyBtn text={payment.promptPayId!} />
          </div>
        </div>
      )}

      {/* Bank transfer details */}
      {hasBankTransfer && !payment.isFullyPaid && (
        <div className="bg-bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-fg-muted" />
            <h3 className="text-sm font-semibold text-fg">Bank transfer</h3>
          </div>
          <div className="space-y-2.5">
            {payment.bankName && (
              <div className="flex justify-between text-sm">
                <span className="text-fg-muted">Bank</span>
                <span className="font-medium text-fg">{payment.bankName}</span>
              </div>
            )}
            {payment.bankAccountNumber && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-fg-muted">Account number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-fg">{payment.bankAccountNumber}</span>
                  <CopyBtn text={payment.bankAccountNumber} />
                </div>
              </div>
            )}
            {payment.bankAccountName && (
              <div className="flex justify-between text-sm">
                <span className="text-fg-muted">Account name</span>
                <span className="font-medium text-fg">{payment.bankAccountName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment records */}
      <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">Payments</h3>
        </div>
        {payment.payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-none">
            <div>
              <p className="text-sm font-medium text-fg">{PAYMENT_LABELS[p.type]}</p>
              <p className="text-xs text-fg-muted mt-0.5">{formatThb(p.amount)}</p>
            </div>
            <div className="flex items-center gap-3">
              <PaymentStatusBadge status={p.status} />
              {p.status === "Pending" && (
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-lg"
                  onClick={() => { setSelectedPayment(p); setTransferNote(""); }}
                >
                  I've paid
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm transfer dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => { if (!open) setSelectedPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payment sent</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-fg-muted">
              Let your host know you've transferred{" "}
              <strong>{selectedPayment && formatThb(selectedPayment.amount)}</strong>.
              Add a reference note if you like.
            </p>
            <Textarea
              placeholder="e.g. Transfer ref #12345, sent at 13:45"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>Cancel</Button>
            <Button
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              disabled={confirmTransfer.isPending}
              onClick={async () => {
                if (!selectedPayment) return;
                try {
                  await confirmTransfer.mutateAsync({
                    paymentId: selectedPayment.id,
                    note: transferNote || undefined,
                  });
                  setSelectedPayment(null);
                  toast.success("Host notified — awaiting confirmation");
                } catch {
                  toast.error("Failed to confirm transfer");
                }
              }}
            >
              {confirmTransfer.isPending ? "Sending…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
