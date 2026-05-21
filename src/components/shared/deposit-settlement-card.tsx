import { useRef, useState } from "react";
import { Banknote, AlertCircle, CheckCircle2, Shield, Camera, X as XIcon, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lightbox } from "@/components/ui/lightbox";
import { formatThb, formatDate } from "@/lib/utils/format";
import { CountdownPill } from "@/components/shared/countdown-pill";
import {
  useDepositSettlement,
  useSubmitCheckoutInspection,
  useAcceptDepositSettlement,
  useDisputeDepositSettlement,
  useConfirmRefund,
} from "@/lib/hooks/use-bookings";
import { bookingsApi } from "@/lib/api/bookings.api";
import { cn } from "@/lib/utils/cn";
import type { DepositSettlementDto } from "@/lib/types";

/**
 * DepositSettlementCard
 *
 * Renders the deposit-settlement state machine UI for both host (decides outcome)
 * and tenant (accepts or disputes a partial hold).
 *
 * Role determines which actions are visible:
 *  - host: chooses Full return / Partial hold / Wait
 *  - tenant: when status="PartialHold", can Accept or Dispute
 */
export function DepositSettlementCard({
  bookingId,
  role,
  depositAmount,
  checkOutDate,
}: {
  bookingId: string;
  role: "host" | "tenant";
  depositAmount: number;
  checkOutDate: string;
}) {
  const { data: settlement, isLoading } = useDepositSettlement(bookingId);

  if (isLoading) {
    return (
      <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4 animate-pulse">
        <div className="h-4 w-32 bg-bg-subtle rounded mb-2" />
        <div className="h-3 w-48 bg-bg-subtle rounded" />
      </div>
    );
  }

  // No settlement record yet — host gets the "Inspect property" prompt, tenant sees waiting state
  if (!settlement) {
    return role === "host" ? (
      <HostInspectionPrompt bookingId={bookingId} depositAmount={depositAmount} checkOutDate={checkOutDate} />
    ) : (
      <TenantWaitingState depositAmount={depositAmount} checkOutDate={checkOutDate} />
    );
  }

  // Settled — show outcome (terminal state)
  if (settlement.status === "Released" || settlement.status === "FullReturn") {
    return <SettlementCompleteState settlement={settlement} />;
  }

  // Partial hold proposed — tenant must respond
  if (settlement.status === "PartialHold") {
    return role === "host" ? (
      <HostPendingTenantResponseState settlement={settlement} />
    ) : (
      <TenantHoldResponseState settlement={settlement} bookingId={bookingId} />
    );
  }

  // Disputed — both sides see the same status
  if (settlement.status === "Disputed") {
    return <DisputedState settlement={settlement} />;
  }

  // Pending refund transfer from landlord to tenant
  if (settlement.status === "PendingRefund") {
    return role === "host" ? (
      <HostPendingRefundState settlement={settlement} bookingId={bookingId} />
    ) : (
      <TenantPendingRefundState settlement={settlement} />
    );
  }

  return null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HostInspectionPrompt({
  bookingId, depositAmount, checkOutDate,
}: { bookingId: string; depositAmount: number; checkOutDate: string }) {
  const [holdOpen, setHoldOpen] = useState(false);
  const inspect = useSubmitCheckoutInspection(bookingId);
  // Inspection deadline: checkOutDate + 7 days (informational fallback if backend doesn't compute it)
  const deadline = new Date(new Date(checkOutDate).getTime() + 7 * 86_400_000).toISOString();
  const deadlinePassed = new Date(deadline).getTime() < Date.now();

  if (deadlinePassed) {
    return (
      <div className="bg-success/5 border border-success/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-fg">Inspection window closed</p>
          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
            The 7-day inspection window has passed. The deposit of{" "}
            <span className="font-medium text-fg">{formatThb(depositAmount)}</span> is being auto-released
            to the tenant — this can take a few minutes to reflect. If it doesn't update soon, contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Banknote size={16} className="text-fg-muted shrink-0" />
            <h3 className="text-sm font-semibold text-fg">Deposit settlement</h3>
          </div>
          <CountdownPill deadline={deadline} prefix="Decide in" expiredLabel="Auto-released" />
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-fg-muted leading-relaxed">
            Inspect the property and confirm the outcome. If you take no action, the full deposit of{" "}
            <span className="font-semibold text-fg">{formatThb(depositAmount)}</span> will be released to
            the tenant automatically on the deadline.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="flex-1 bg-success hover:bg-success/90 text-white rounded-xl h-10"
              disabled={inspect.isPending}
              onClick={async () => {
                try {
                  await inspect.mutateAsync({ outcome: "full_return" });
                  toast.success("Deposit released in full");
                } catch {
                  toast.error("Failed to release deposit");
                }
              }}
            >
              Return {formatThb(depositAmount)} fully
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-10 border-warning/40 text-warning hover:bg-warning/5"
              onClick={() => setHoldOpen(true)}
              disabled={inspect.isPending}
            >
              Withhold part of deposit
            </Button>
          </div>
        </div>
      </div>

      <PartialHoldDialog
        open={holdOpen}
        onOpenChange={setHoldOpen}
        depositAmount={depositAmount}
        bookingId={bookingId}
        isPending={inspect.isPending}
      />
    </>
  );
}

function PartialHoldDialog({
  open, onOpenChange, depositAmount, bookingId, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  depositAmount: number;
  bookingId: string;
  isPending: boolean;
}) {
  const [holdAmount, setHoldAmount] = useState("");
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inspect = useSubmitCheckoutInspection(bookingId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedAmount = Number(holdAmount);
  const validAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= depositAmount;
  const validReason = reason.trim().length >= 10;
  const submitting = inspect.isPending || uploading;
  const canSubmit = validAmount && validReason && !submitting && !isPending;

  async function handleSubmit() {
    setUploading(true);
    try {
      // Upload first so the URLs land in the same settlement record. Failure
      // here aborts the hold rather than submitting a hold with no evidence.
      const photoUrls = photos.length > 0
        ? await bookingsApi.uploadInspectionPhotos(bookingId, photos)
        : undefined;
      await inspect.mutateAsync({
        outcome: "partial_hold",
        holdAmount: parsedAmount,
        reason: reason.trim(),
        photoUrls,
      });
      toast.success("Hold submitted — tenant will be notified");
      onOpenChange(false);
      setHoldAmount("");
      setReason("");
      setPhotos([]);
    } catch {
      toast.error("Failed to submit");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Withhold from deposit</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            The tenant will see your reason and photos and has 7 days to accept or dispute. Be specific —
            this is the record if the case is escalated.
          </p>
          <div className="space-y-1.5">
            <Label className="text-sm">Amount to withhold (max {formatThb(depositAmount)})</Label>
            <Input
              type="number"
              min={0}
              max={depositAmount}
              value={holdAmount}
              onChange={(e) => setHoldAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="font-mono"
            />
            {validAmount && (
              <p className="text-xs text-fg-muted">
                Refund to tenant: <span className="font-semibold text-fg">{formatThb(depositAmount - parsedAmount)}</span>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broken bathroom mirror, replacement quote ฿4,200."
              className="min-h-24"
            />
            <p className="text-[11px] text-fg-muted">Minimum 10 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Evidence photos</Label>
            <label
              className={cn(
                "flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors",
                photos.length > 0
                  ? "border-success/40 bg-success/5"
                  : "border-border hover:border-brand hover:bg-brand/5",
              )}
            >
              <Camera size={16} className={photos.length > 0 ? "text-success" : "text-fg-muted"} />
              <div className="flex-1 min-w-0">
                {photos.length > 0 ? (
                  <p className="text-sm font-medium text-success">
                    {photos.length} photo{photos.length !== 1 ? "s" : ""} attached
                  </p>
                ) : (
                  <p className="text-sm text-fg-muted">Tap to attach (up to 10)</p>
                )}
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Tenant sees these alongside your reason — strongly recommended.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const next = [...photos, ...Array.from(e.target.files ?? [])].slice(0, 10);
                  setPhotos(next);
                  e.target.value = "";
                }}
              />
            </label>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {photos.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs bg-bg-subtle text-fg-muted rounded-full pl-2.5 pr-1 py-0.5"
                  >
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}
                      className="w-4 h-4 rounded-full hover:bg-border flex items-center justify-center text-fg-muted hover:text-fg"
                    >
                      <XIcon size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-warning hover:bg-warning/90 text-white"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {uploading ? "Uploading…" : inspect.isPending ? "Submitting…" : "Submit hold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HostPendingTenantResponseState({ settlement }: { settlement: DepositSettlementDto }) {
  const deadline = settlement.tenantResponseDeadline ?? null;
  const deadlinePassed = deadline != null && new Date(deadline).getTime() < Date.now();

  if (deadlinePassed) {
    return (
      <div className="bg-success/5 border border-success/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-fg">Hold auto-accepted</p>
          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
            The tenant didn't respond within 7 days, so your hold of{" "}
            <span className="font-medium text-fg">{formatThb(settlement.holdAmount)}</span> is being
            processed. Allow a few minutes for it to reflect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-warning/5 border border-warning/20 rounded-2xl px-5 py-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg">Hold proposed — waiting for tenant</h3>
        {deadline && <CountdownPill deadline={deadline} prefix="Tenant responds in" expiredLabel="Auto-accepted" />}
      </div>
      <p className="text-xs text-fg-muted leading-relaxed">
        You proposed to withhold <span className="font-semibold text-fg">{formatThb(settlement.holdAmount)}</span>.
        The tenant has 7 days to accept or dispute. If they don't respond, it's automatically accepted.
      </p>
    </div>
  );
}

function TenantWaitingState({ depositAmount, checkOutDate }: { depositAmount: number; checkOutDate: string }) {
  const deadline = new Date(new Date(checkOutDate).getTime() + 7 * 86_400_000);
  const deadlinePassed = deadline.getTime() < Date.now();

  if (deadlinePassed) {
    return (
      <div className="bg-success/5 border border-success/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-fg">Deposit auto-released</p>
          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
            Your host's inspection window closed without action. Your full deposit of{" "}
            <span className="font-semibold text-fg">{formatThb(depositAmount)}</span> is being released —
            allow a few minutes for it to reflect. If it doesn't update soon, contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4 flex items-start gap-3">
      <Shield size={18} className="text-fg-muted shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-fg">Deposit settlement pending</p>
        <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
          Your host has until <span className="font-medium text-fg">{formatDate(deadline.toISOString())}</span> to
          inspect the property and confirm the deposit return. If no issues are raised, your full deposit of{" "}
          <span className="font-semibold text-fg">{formatThb(depositAmount)}</span> is released automatically.
        </p>
      </div>
    </div>
  );
}

function EvidencePhotos({ urls }: { urls: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  if (!urls.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide flex items-center gap-1.5">
        <Camera size={11} />Host's evidence ({urls.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIdx(i)}
            className="w-16 h-16 rounded-lg overflow-hidden bg-bg-subtle shrink-0 hover:opacity-90 hover:scale-[1.03] transition-all"
          >
            <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <Lightbox
        images={urls.map((url, i) => ({ url, name: `Evidence ${i + 1}` }))}
        initialIndex={lightboxIdx ?? 0}
        open={lightboxIdx !== null}
        onClose={() => setLightboxIdx(null)}
      />
    </div>
  );
}

function TenantHoldResponseState({
  settlement, bookingId,
}: { settlement: DepositSettlementDto; bookingId: string }) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const accept = useAcceptDepositSettlement(bookingId);
  const deadline = settlement.tenantResponseDeadline ?? null;
  const deadlinePassed = deadline != null && new Date(deadline).getTime() < Date.now();
  const photos = settlement.photoUrls ?? [];

  if (deadlinePassed) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl px-5 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg">Response window closed — hold auto-accepted</p>
            <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
              You didn't respond in 7 days, so the host's hold of{" "}
              <span className="font-medium text-fg">{formatThb(settlement.holdAmount)}</span> was
              automatically accepted. You'll receive{" "}
              <span className="font-medium text-fg">{formatThb(settlement.returnAmount)}</span>.
              If you believe this is wrong, contact Siamo support — recourse may still be possible.
            </p>
          </div>
        </div>
        {photos.length > 0 && (
          <div className="pl-7">
            <EvidencePhotos urls={photos} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-warning/5 border border-warning/30 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-warning/20 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-fg">Host requests partial deposit hold</h3>
          {deadline && <CountdownPill deadline={deadline} prefix="Respond in" expiredLabel="Auto-accepted" />}
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-fg-muted">Total deposit</p>
              <p className="font-medium text-fg">{formatThb(settlement.totalDeposit)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Host wants to withhold</p>
              <p className="font-semibold text-danger">−{formatThb(settlement.holdAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">You'd receive</p>
              <p className="font-semibold text-fg">{formatThb(settlement.returnAmount)}</p>
            </div>
          </div>
          {settlement.holdReason && (
            <div className="rounded-lg bg-bg-subtle px-3 py-2">
              <p className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Host's reason</p>
              <p className="text-xs text-fg mt-1 leading-relaxed italic">"{settlement.holdReason}"</p>
            </div>
          )}
          <EvidencePhotos urls={photos} />
          <p className="text-[11px] text-fg-muted leading-relaxed">
            If the reason seems fair, accept and the funds will be released. If you disagree, dispute and
            Siamo's support team will mediate.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-9 text-sm border-danger/40 text-danger hover:bg-danger/5"
              onClick={() => setDisputeOpen(true)}
              disabled={accept.isPending}
            >
              Dispute
            </Button>
            <Button
              className="flex-1 bg-fg hover:bg-fg/90 text-white rounded-xl h-9 text-sm"
              disabled={accept.isPending}
              onClick={async () => {
                try {
                  await accept.mutateAsync();
                  toast.success("Hold accepted — refund will be processed");
                } catch {
                  toast.error("Failed to accept");
                }
              }}
            >
              {accept.isPending ? "Accepting…" : "Accept"}
            </Button>
          </div>
        </div>
      </div>

      <DisputeDialog open={disputeOpen} onOpenChange={setDisputeOpen} bookingId={bookingId} />
    </>
  );
}

function DisputeDialog({
  open, onOpenChange, bookingId,
}: { open: boolean; onOpenChange: (v: boolean) => void; bookingId: string }) {
  const [reason, setReason] = useState("");
  const dispute = useDisputeDepositSettlement(bookingId);
  const canSubmit = reason.trim().length >= 20 && !dispute.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Dispute deposit hold</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            Siamo's support team will review the case within 5 business days. Please describe what you disagree with — the more
            specific, the better.
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. The mirror was already cracked when I moved in — I have photos from check-in dated…"
            className="min-h-32"
          />
          <p className="text-[11px] text-fg-muted">Minimum 20 characters.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={dispute.isPending}>Cancel</Button>
          <Button
            className="bg-danger hover:bg-danger/90 text-white"
            disabled={!canSubmit}
            onClick={async () => {
              try {
                await dispute.mutateAsync(reason.trim());
                toast.success("Dispute submitted — Siamo will review");
                onOpenChange(false);
              } catch {
                toast.error("Failed to submit dispute");
              }
            }}
          >
            {dispute.isPending ? "Submitting…" : "Submit dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HostPendingRefundState({
  settlement, bookingId,
}: { settlement: DepositSettlementDto; bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const confirmRefund = useConfirmRefund(bookingId);
  const amount = settlement.refundAmount ?? settlement.returnAmount;

  return (
    <>
      <div className="bg-warning/5 border border-warning/20 rounded-2xl px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-warning shrink-0" />
          <h3 className="text-sm font-semibold text-fg">Refund transfer required</h3>
        </div>
        <p className="text-xs text-fg-muted leading-relaxed">
          The deposit settlement has been finalised. Please transfer{" "}
          <span className="font-semibold text-fg">{formatThb(amount)}</span> to the tenant via bank
          transfer or PromptPay, then confirm below.
        </p>
        <Button
          className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white rounded-xl h-10"
          onClick={() => setOpen(true)}
        >
          I have transferred the refund
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm refund transfer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">
              Confirm that you have transferred{" "}
              <span className="font-semibold text-fg">{formatThb(amount)}</span> to the tenant.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">Bank reference / slip link (optional)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. SCB ref 123456 or https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={confirmRefund.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-white"
              disabled={confirmRefund.isPending}
              onClick={async () => {
                try {
                  await confirmRefund.mutateAsync({ reference: reference.trim() || undefined, idempotencyKey });
                  toast.success("Refund confirmed — settlement complete");
                  setOpen(false);
                } catch {
                  toast.error("Failed to confirm refund");
                }
              }}
            >
              {confirmRefund.isPending ? "Confirming…" : "Confirm transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TenantPendingRefundState({ settlement }: { settlement: DepositSettlementDto }) {
  const amount = settlement.refundAmount ?? settlement.returnAmount;
  return (
    <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4 flex items-start gap-3">
      <ArrowRightLeft size={18} className="text-brand shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-fg">Awaiting refund transfer from landlord</p>
        <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
          Your landlord is transferring{" "}
          <span className="font-semibold text-fg">{formatThb(amount)}</span> to you. Once they confirm,
          this will update to "Settled". If you haven't received the funds within a few business days,
          reach out to your landlord or contact Siamo support.
        </p>
      </div>
    </div>
  );
}

function SettlementCompleteState({ settlement }: { settlement: DepositSettlementDto }) {
  const fullReturn = settlement.holdAmount === 0;
  return (
    <div className="bg-success/5 border border-success/20 rounded-2xl px-5 py-4 flex items-start gap-3">
      <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-fg">
          Deposit {fullReturn ? "returned in full" : "settled"}
        </p>
        <p className="text-xs text-fg-muted mt-0.5">
          Released <span className="font-medium text-fg">{formatThb(settlement.returnAmount)}</span>
          {!fullReturn && (
            <> · Withheld <span className="font-medium text-fg">{formatThb(settlement.holdAmount)}</span></>
          )}
          {settlement.refundConfirmedAt && (
            <> · Refund confirmed {formatDate(settlement.refundConfirmedAt)}
              {settlement.refundReference && (
                <> (ref: <span className="font-mono">{settlement.refundReference}</span>)</>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function DisputedState({ settlement }: { settlement: DepositSettlementDto }) {
  const photos = settlement.photoUrls ?? [];
  return (
    <div className="bg-bg-card border border-border rounded-2xl px-5 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-fg">Deposit dispute under review</p>
          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
            Siamo's support team is reviewing the case. You'll be notified once a decision is made.
            {settlement.disputeReason && (
              <> Reason on record: <span className="italic">"{settlement.disputeReason}"</span></>
            )}
          </p>
          <p className="text-[11px] text-fg-muted mt-1.5">
            Submitted {settlement.tenantResponseAt && formatDate(settlement.tenantResponseAt)}
          </p>
        </div>
      </div>
      {photos.length > 0 && (
        <div className="pl-7">
          <EvidencePhotos urls={photos} />
        </div>
      )}
    </div>
  );
}
