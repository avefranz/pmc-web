import { useState } from "react";
import { Banknote, AlertCircle, CheckCircle2, Shield, Camera } from "lucide-react";
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
} from "@/lib/hooks/use-bookings";
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
      <TenantWaitingState depositAmount={depositAmount} />
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
  const inspect = useSubmitCheckoutInspection(bookingId);

  const parsedAmount = Number(holdAmount);
  const validAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= depositAmount;
  const validReason = reason.trim().length >= 10;
  const canSubmit = validAmount && validReason && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Withhold from deposit</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            The tenant will see your reason and have 7 days to accept or dispute. Be specific — this is
            the record if the case is escalated.
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
              placeholder="e.g. Broken bathroom mirror, replacement quote ฿4,200. Photos attached."
              className="min-h-24"
            />
            <p className="text-[11px] text-fg-muted">Minimum 10 characters. Attach photos via support if needed.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inspect.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-warning hover:bg-warning/90 text-white"
            disabled={!canSubmit}
            onClick={async () => {
              try {
                await inspect.mutateAsync({
                  outcome: "partial_hold",
                  holdAmount: parsedAmount,
                  reason: reason.trim(),
                });
                toast.success("Hold submitted — tenant will be notified");
                onOpenChange(false);
              } catch {
                toast.error("Failed to submit");
              }
            }}
          >
            {inspect.isPending ? "Submitting…" : "Submit hold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HostPendingTenantResponseState({ settlement }: { settlement: DepositSettlementDto }) {
  const deadline = settlement.tenantResponseDeadline ?? null;
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

function TenantWaitingState({ depositAmount }: { depositAmount: number }) {
  return (
    <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4 flex items-start gap-3">
      <Shield size={18} className="text-fg-muted shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-fg">Deposit settlement pending</p>
        <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
          Your host has 7 days to inspect the property and confirm the deposit return. If no issues are
          raised, your full deposit of <span className="font-semibold text-fg">{formatThb(depositAmount)}</span> is released
          automatically.
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
  const photos = settlement.photoUrls ?? [];

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
