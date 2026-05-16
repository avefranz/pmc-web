import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Trash2, FileText, Upload,
  Eye,
  PenLine, CheckCircle2, Clock, AlertCircle, Download, ExternalLink, Globe, FileCheck, XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignatureCanvas } from "@/components/shared/signature-canvas";
import {
  useBooking,
  useBookingGuests,
  useBookingInvoices,
  useBookingTickets,
  useBookingTm30,
  useBookingContract,
  useLandlordSignContract,
  useUploadTm30,
  useUnlinkTenant,
  useBookingPayment,
  useBookingCancellation,
  useConfirmCancellation,
  useDeclineCancellation,
  useSendPaymentNotice,
  useInitiateLandlordTermination,
  useUpdateBookingStatus,
} from "@/lib/hooks/use-bookings";
import { CountdownPill, cancellationDeadline } from "@/components/shared/countdown-pill";
import { DepositSettlementCard } from "@/components/shared/deposit-settlement-card";
import { contractSigningDeadline } from "@/lib/types";
import { HostPaymentHealthPill, computePaymentHealth } from "@/components/shared/payment-status-banner";
import { Textarea } from "@/components/ui/textarea";
import { useAsset } from "@/lib/hooks/use-assets";
import { useMyProfile } from "@/lib/hooks/use-profile";
import { PeaBillCard } from "@/components/shared/pea-bill-card";
import { bookingsApi } from "@/lib/api/bookings.api";
import { formatDate, formatThb } from "@/lib/utils/format";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { InvoiceStatus, BookingStatus, Tm30Status } from "@/lib/types/enums";
import type { BookingGuestDto } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

// ─── Guest card ───────────────────────────────────────────────────────────────

// Landlord view: read-only guest card. Editing/removing guests is the tenant's responsibility.
// The landlord's job here is TM-30 filing only.
function GuestCard({
  guest,
  bookingId,
  onTm30Status,
}: {
  guest: BookingGuestDto;
  bookingId: string;
  onTm30Status?: (guestId: string, filed: boolean) => void;
}) {
  const { data: tm30 } = useBookingTm30(bookingId, guest.id);
  const uploadTm30 = useUploadTm30(bookingId, guest.id);

  const hasPassport = !!(guest.passportNumber || guest.nationality || guest.visaType);
  const tm30Filed = tm30?.status === Tm30Status.Filed;

  useEffect(() => {
    if (tm30 !== undefined && guest.passportNumber) {
      onTm30Status?.(guest.id, tm30Filed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm30Filed, tm30, guest.id, guest.passportNumber]);

  return (
    <div className="bg-bg-card rounded-xl shadow-card p-4 space-y-3">
      {/* Name row — read-only */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-fg">
            {guest.firstName || guest.lastName
              ? `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()
              : <span className="text-fg-muted italic">No name</span>}
          </span>
          {guest.isMainTenant && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-fg text-bg font-medium">Main tenant</span>
          )}
        </div>
        {hasPassport && (
          <div className="mt-1 space-y-0.5 text-xs text-fg-muted font-mono">
            {guest.passportNumber && <p>Passport: {guest.passportNumber}{guest.passportExpiry ? ` · exp ${formatDate(guest.passportExpiry)}` : ""}</p>}
            {(guest.nationality || guest.visaType || guest.gender) && <p>{[guest.nationality, guest.gender === "M" ? "Male" : guest.gender === "F" ? "Female" : undefined, guest.visaType].filter(Boolean).join(" · ")}</p>}
            {guest.dateOfBirth && <p>DOB: {formatDate(guest.dateOfBirth)}</p>}
            {guest.entryDate && <p>Entry: {formatDate(guest.entryDate)}{guest.entryPort ? ` via ${guest.entryPort}` : ""}</p>}
          </div>
        )}
        {!hasPassport && (
          <p className="text-xs text-fg-subtle mt-1 italic">Passport not yet submitted by tenant</p>
        )}
      </div>

      {/* TM-30 row */}
      <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-fg-muted font-medium">TM-30</span>
          {tm30Filed
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Filed{tm30?.filedAt ? ` ${formatDate(tm30.filedAt)}` : ""}</span>
            : <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">Pending</span>
          }
          {tm30Filed && tm30?.documentUrl && (
            <a href={tm30.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors">
              <Eye size={11} />View
            </a>
          )}
        </div>
        <label className={cn("flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors cursor-pointer", uploadTm30.isPending && "opacity-50 pointer-events-none")}>
          <Upload size={13} />
          {uploadTm30.isPending ? "Uploading…" : tm30Filed ? "Replace" : "Upload PDF"}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            uploadTm30.mutate(file, {
              onSuccess: () => toast.success("TM-30 uploaded"),
              onError: () => toast.error("Failed to upload TM-30"),
            });
            e.target.value = "";
          }} />
        </label>
      </div>
    </div>
  );
}

// ─── Invoice type labels ──────────────────────────────────────────────────────

const INVOICE_TYPE_LABELS: Record<string, string> = {
  Rent: "Total rent",
  Deposit: "Security deposit",
  Utilities: "Utilities",
  Cleaning: "Cleaning fee",
  Damage: "Damage fee",
  Other: "Other",
};

// ─── Ticket status badge ──────────────────────────────────────────────────────

function ticketStatusClass(status: string): string {
  if (["Verified", "Completed"].includes(status)) return "bg-success/10 text-success";
  if (["Blocked", "Rejected"].includes(status)) return "bg-danger/10 text-danger";
  if (["PendingApproval", "Pending", "Triaging", "Quoted"].includes(status)) return "bg-warning/10 text-warning";
  return "bg-bg-subtle text-fg-muted";
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  Triaging: "Under review",
  PendingApproval: "Pending approval",
  InProgress: "In progress",
  Verified: "Work done",
  Reopened: "Re-opened",
};
// ─── Main page ────────────────────────────────────────────────────────────────

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: booking, isLoading } = useBooking(id!);
  const { data: guests } = useBookingGuests(id!);
  const { data: invoices } = useBookingInvoices(id!);
  const { data: tickets } = useBookingTickets(id!);
  const { data: contractData } = useBookingContract(id!);
  const { data: paymentData } = useBookingPayment(id!);
  const { data: asset } = useAsset(booking?.assetId ?? "");
  const { data: profile } = useMyProfile();
  const cancellationEnabled = booking?.status === BookingStatus.Active || booking?.status === BookingStatus.Confirmed;
  const { data: cancellation } = useBookingCancellation(id!, cancellationEnabled);

  const confirmCancellation = useConfirmCancellation(id!);
  const declineCancellation = useDeclineCancellation(id!);
  const landlordSignContract = useLandlordSignContract(id!);

  const [unlinkTenantOpen, setUnlinkTenantOpen] = useState(false);
  const unlinkTenant = useUnlinkTenant(id!);

  // Decline early exit dialog
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Payment notice (reminder / formal)
  const sendPaymentNotice = useSendPaymentNotice(id!);
  const [lastReminderAt, setLastReminderAt] = useState<number | null>(null);
  const [lastFormalAt, setLastFormalAt] = useState<number | null>(null);

  // Landlord-initiated termination
  const initiateTermination = useInitiateLandlordTermination(id!);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState<"NonPayment" | "Breach" | "MutualAgreement">("NonPayment");
  const [terminationNote, setTerminationNote] = useState("");

  // Close lease
  const updateBookingStatus = useUpdateBookingStatus(id!);
  const [closeLeaseError, setCloseLeaseError] = useState<string | null>(null);

  // Landlord signing form state
  const [landlordTypedName, setLandlordTypedName] = useState("");
  const [landlordSigningCapacity, setLandlordSigningCapacity] = useState("Owner");
  const [landlordCompanyName, setLandlordCompanyName] = useState("");
  const [landlordSignatureFile, setLandlordSignatureFile] = useState<File | null>(null);
  const [landlordSignError, setLandlordSignError] = useState<string | null>(null);
  // Landlord legal checkboxes
  const [landlordAgreedTerms, setLandlordAgreedTerms] = useState(false);
  const [landlordAgreedEta, setLandlordAgreedEta] = useState(false);
  const [landlordAgreedAuth, setLandlordAgreedAuth] = useState(false);

  const [contractUploading, setContractUploading] = useState(false);
  const [tm30Downloading, setTm30Downloading] = useState(false);
  const [tm30StatusMap, setTm30StatusMap] = useState<Map<string, boolean>>(new Map());
  const handleTm30Status = useCallback((guestId: string, filed: boolean) => {
    setTm30StatusMap((prev) => {
      if (prev.get(guestId) === filed) return prev;
      return new Map(prev).set(guestId, filed);
    });
  }, []);

  async function handleDownloadTm30Template() {
    setTm30Downloading(true);
    try {
      await bookingsApi.downloadTm30Template(id!);
    } catch {
      toast.error("Failed to download TM-30 template");
    } finally {
      setTm30Downloading(false);
    }
  }

  async function handleUploadContract(file: File) {
    setContractUploading(true);
    try {
      await bookingsApi.uploadContract(id!, file);
      qc.invalidateQueries({ queryKey: ["bookings", id] });
      qc.invalidateQueries({ queryKey: ["bookings", id, "contract"] });
      toast.success("Contract uploaded");
    } catch {
      toast.error("Failed to upload contract");
    } finally {
      setContractUploading(false);
    }
  }

  async function handleLandlordSign(e: React.FormEvent) {
    e.preventDefault();
    setLandlordSignError(null);
    try {
      await landlordSignContract.mutateAsync({
        typedName: landlordTypedName.trim(),
        signingCapacity: landlordSigningCapacity,
        companyName: landlordSigningCapacity === "Authorised Representative" && landlordCompanyName.trim()
          ? landlordCompanyName.trim()
          : undefined,
        signatureImage: landlordSignatureFile ?? undefined,
      });
      toast.success("Agreement signed successfully");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; title?: string } } })?.response?.data?.message ??
        (err as { response?: { data?: { message?: string; title?: string } } })?.response?.data?.title ??
        "Failed to sign agreement. Please try again.";
      setLandlordSignError(msg);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (!booking) return <p className="text-sm text-fg-muted">Booking not found.</p>;

  const statusClass: Record<string, string> = {
    [BookingStatus.Active]:         "bg-success/10 text-success",
    [BookingStatus.Confirmed]:      "bg-bg text-fg",
    [BookingStatus.PendingPayment]: "bg-warning/10 text-warning",
    [BookingStatus.Completed]:      "bg-bg-subtle text-fg-muted",
    [BookingStatus.Cancelled]:      "bg-danger/10 text-danger",
    [BookingStatus.Expired]:        "bg-danger/10 text-danger",
  };

  // Lease duration & monthly rate
  const checkInDate = new Date(booking.checkInDate);
  const checkOutDate = new Date(booking.checkOutDate);
  const durationMonths = (checkOutDate.getFullYear() - checkInDate.getFullYear()) * 12 + (checkOutDate.getMonth() - checkInDate.getMonth());
  const monthlyRate = durationMonths > 0 ? Math.round(booking.rentAmount / durationMonths) : booking.rentAmount;
  const totalDays = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000);
  const daysLeft = booking.daysRemaining;
  const isActive = booking.status === BookingStatus.Active;
  const leaseProgress = (isActive && daysLeft != null && totalDays > 0)
    ? Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))
    : null;
  const monthsLeft = (daysLeft != null && daysLeft > 0) ? Math.ceil(daysLeft / 30) : null;
  const initialPaymentsReceived =
    isActive ||
    booking.status === BookingStatus.Confirmed ||
    (paymentData?.payments ?? [])
      .filter((p) => p.type === "MonthlyRent" && (p.monthIndex === 1 || p.monthIndex == null))
      .some((p) => p.status === "Paid");
  const firstMonthPayment = (paymentData?.payments ?? []).find(
    (p) => p.type === "MonthlyRent" && (p.monthIndex === 1 || p.monthIndex == null),
  );
  // "All paid" is only trustworthy once the booking is over — while active, the backend may
  // mark the full-rent invoice as Paid after just the first gateway payment.
  const bookingIsOver = booking.status === BookingStatus.Completed;
  const openTickets = (tickets ?? []).filter(
    (t) => !["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(t.status),
  );

  const foreignGuests = (guests ?? []).filter((g) => !!g.passportNumber);
  const tm30Summary = {
    total: foreignGuests.length,
    filed: foreignGuests.filter((g) => tm30StatusMap.get(g.id) === true).length,
    allFiled: foreignGuests.length > 0 && foreignGuests.every((g) => tm30StatusMap.get(g.id) === true),
    hasGuests: foreignGuests.length > 0,
  };
  const bookingDone = booking.status === BookingStatus.Completed || booking.status === BookingStatus.Cancelled;
  const daysSinceCheckIn = Math.floor((Date.now() - checkInDate.getTime()) / 86_400_000);
  const showTm30Banner =
    !bookingDone &&
    tm30Summary.hasGuests &&
    !tm30Summary.allFiled &&
    daysSinceCheckIn >= 0 &&
    daysSinceCheckIn <= 30;
  const unfiledCount = tm30Summary.total - tm30Summary.filed;
  const maxFine = unfiledCount * 2000;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
        onClick={() => navigate("/me/host/bookings")}
      >
        <ArrowLeft size={16} />Back to reservations
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-fg">
              {booking.tenantName ?? booking.listingTitle ?? "Booking"}
            </h1>
            {booking.tenantName && !bookingDone && booking.status !== BookingStatus.Active && booking.status !== BookingStatus.Confirmed && (
              <button
                className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-muted hover:text-danger transition-colors"
                title="Release booking slot (only available before move-in)"
                onClick={() => setUnlinkTenantOpen(true)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-fg-muted mt-1">
            {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
          </p>
          {booking.listingTitle && (
            <p className="text-xs text-fg-muted">{booking.listingTitle}</p>
          )}
        </div>
        {contractData?.status === "PendingLandlordSignature" ? (
          <span className="text-xs px-3 py-1 rounded-full font-semibold shrink-0 bg-brand text-white animate-pulse">
            ✍️ Sign required
          </span>
        ) : (
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium shrink-0", statusClass[booking.status] ?? "bg-bg-subtle text-fg-muted")}>
            {booking.status === BookingStatus.Expired
              ? booking.noShowAt ? "Expired (no-show)" : "Expired"
              : booking.status}
          </span>
        )}
      </div>

      {/* ── Close lease (host action for Active bookings past checkout) ── */}
      {booking.status === BookingStatus.Active && new Date(booking.checkOutDate) <= new Date() && (() => {
        const nonThGuests = (guests ?? []).filter((g) => g.nationality !== "TH" && !!g.passportNumber);
        const allTm30Filed = nonThGuests.length === 0 || nonThGuests.every((g) => tm30StatusMap.get(g.id) === true);
        const unfiledGuests = nonThGuests.filter((g) => tm30StatusMap.get(g.id) !== true);
        return (
          <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-fg-muted shrink-0" />
              <h3 className="text-sm font-semibold text-fg">Close lease</h3>
            </div>
            <p className="text-xs text-fg-muted leading-relaxed">
              The checkout date has passed. Once you close the lease, deposit settlement will begin.
            </p>
            {nonThGuests.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide">TM-30 status (required before closing)</p>
                {nonThGuests.map((g) => {
                  const filed = tm30StatusMap.get(g.id) === true;
                  const name = [g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest";
                  return (
                    <div key={g.id} className="flex items-center gap-2">
                      <span className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        filed ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
                      )}>
                        {filed ? "✓" : "!"}
                      </span>
                      <p className="text-xs text-fg">{name}</p>
                      <span className={cn("text-[11px] font-medium ml-auto", filed ? "text-success" : "text-warning")}>
                        {filed ? "Filed" : "Not filed"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {closeLeaseError && (
              <div className="rounded-lg bg-danger/8 border border-danger/20 px-3 py-2">
                <p className="text-xs text-danger leading-relaxed">{closeLeaseError}</p>
              </div>
            )}
            <Button
              className="w-full bg-fg hover:bg-fg/90 text-bg rounded-xl h-10"
              disabled={!allTm30Filed || updateBookingStatus.isPending}
              onClick={async () => {
                setCloseLeaseError(null);
                try {
                  await updateBookingStatus.mutateAsync(BookingStatus.Completed);
                  toast.success("Lease closed — deposit settlement is now active");
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  setCloseLeaseError(msg ?? "Failed to close lease. Please try again.");
                  if (unfiledGuests.length > 0) return;
                }
              }}
            >
              {updateBookingStatus.isPending ? "Closing…" : allTm30Filed ? "Close lease" : `File TM-30 for ${unfiledGuests.length} guest${unfiledGuests.length !== 1 ? "s" : ""} first`}
            </Button>
          </div>
        );
      })()}

      {/* ── Lease completed: header + deposit settlement card ── */}
      {booking.status === BookingStatus.Completed && (
        <div className="space-y-3">
          <div className="bg-bg-card border border-border rounded-2xl p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-fg">Lease completed</p>
              <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                The tenancy ended on {formatDate(booking.checkOutDate)}. Next step: confirm the deposit
                settlement below.
              </p>
            </div>
          </div>
          <DepositSettlementCard
            bookingId={id!}
            role="host"
            depositAmount={booking.depositAmount}
            checkOutDate={booking.checkOutDate}
          />
        </div>
      )}

      {/* ── Host hasn't set up payout details — guest can't pay ── */}
      {booking.status === BookingStatus.PendingPayment && profile && !profile.promptPayId && !profile.bankAccountNumber && (
        <Link
          to="/me/host/settings/payment"
          className="block rounded-2xl border border-warning/40 bg-warning/8 p-4 hover:brightness-95 transition"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg">Add your payment details — tenant can't pay yet</p>
              <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                You haven't set up a PromptPay number or bank account, so this booking is stuck on the
                payment step. If you don't add them before the signing deadline, the booking auto-cancels.
              </p>
            </div>
            <span className="text-xs font-semibold text-warning shrink-0 self-center">Set up →</span>
          </div>
        </Link>
      )}

      {/* ── Contract voided notice ── */}
      {contractData?.status === "Voided" && (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 flex items-start gap-3">
          <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Contract was voided</p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              The signing window closed before both parties signed.
              This booking is cancelled and the tenant will be refunded automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── URGENT: Landlord must sign ── */}
      {contractData?.status === "PendingLandlordSignature" && (
        <div className="bg-brand rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-lg">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <PenLine size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-white">Action required — sign the rental agreement</p>
                <CountdownPill
                  deadline={contractSigningDeadline(contractData)}
                  prefix="Booking expires in"
                  expiredLabel="Expired — booking will be cancelled"
                  className="bg-white/20 text-white"
                />
              </div>
              <p className="text-sm text-white/80 mt-1">
                The tenant has paid and signed. Your signature finalises the booking. If unsigned by the
                deadline, the booking auto-cancels and the tenant is refunded.
              </p>
            </div>
          </div>
          <a
            href="#landlord-sign-form"
            className="shrink-0 bg-white text-brand font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-center"
          >
            Sign now ↓
          </a>
        </div>
      )}

      {/* TM-30 urgency banner */}
      {showTm30Banner && (() => {
        const isDay0 = daysSinceCheckIn === 0;
        const isOverdue = daysSinceCheckIn >= 1;
        const isCritical = daysSinceCheckIn >= 1 && daysSinceCheckIn <= 3;

        let headline: string;
        let sub: string;
        let barColor: string;
        let borderColor: string;
        let bgColor: string;

        if (isDay0) {
          headline = "🚨 File TM-30 now — 24-hour window is open";
          sub = `The clock started at check-in. You have 24 hours to file or face a fine of up to ฿${maxFine.toLocaleString()}. Takes 5 minutes.`;
          barColor = "bg-danger";
          borderColor = "border-danger/40";
          bgColor = "bg-danger/8";
        } else if (isCritical) {
          headline = `🚨 TM-30 overdue by ${daysSinceCheckIn} day${daysSinceCheckIn > 1 ? "s" : ""} — file immediately`;
          sub = `Past the 24h deadline. Fine exposure: up to ฿${maxFine.toLocaleString()} per inspection. Spend 5 minutes, avoid the fine.`;
          barColor = "bg-danger";
          borderColor = "border-danger/40";
          bgColor = "bg-danger/8";
        } else {
          headline = `🚨 TM-30 still pending — ${daysSinceCheckIn} days overdue`;
          sub = `Spend 5 minutes and save up to ฿${maxFine.toLocaleString()}. ${unfiledCount} guest${unfiledCount > 1 ? "s" : ""} left to file.`;
          barColor = "bg-danger";
          borderColor = "border-danger/30";
          bgColor = "bg-danger/5";
        }

        return (
          <a
            href="#tm30-section"
            className={cn(
              "block rounded-2xl border p-4 transition-all hover:brightness-95",
              bgColor, borderColor,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-fg">{headline}</p>
                <p className="text-xs text-fg-muted mt-1 leading-relaxed">{sub}</p>

                {/* Progress bar */}
                {tm30Summary.total > 1 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-fg-muted mb-1">
                      <span>{tm30Summary.filed} of {tm30Summary.total} guests filed</span>
                      <span>{tm30Summary.total - tm30Summary.filed} remaining</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${Math.round((tm30Summary.filed / tm30Summary.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap bg-danger text-white">
                {isOverdue ? "Overdue" : "File now"}
              </div>
            </div>
          </a>
        );
      })()}

      {/* TM-30 all filed celebration */}
      {!bookingDone && tm30Summary.allFiled && (
        <div className="rounded-2xl border border-success/30 bg-success/6 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-success shrink-0" />
          <div>
            <p className="text-sm font-semibold text-fg">TM-30 complete — you're fully compliant ✓</p>
            <p className="text-xs text-fg-muted mt-0.5">All {tm30Summary.total} guest{tm30Summary.total > 1 ? "s" : ""} filed. No action needed.</p>
          </div>
        </div>
      )}

      {/* Key figures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          <p className="text-xs text-fg-muted mb-1">Monthly rent</p>
          <p className="text-xl font-semibold text-fg">{formatThb(monthlyRate)}</p>
          {durationMonths > 0 && <p className="text-xs text-fg-muted mt-1">{durationMonths} month{durationMonths !== 1 ? "s" : ""} · {formatThb(booking.rentAmount)} total</p>}
        </div>
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          <p className="text-xs text-fg-muted mb-1">Deposit</p>
          <p className="text-xl font-semibold text-fg">{formatThb(booking.depositAmount)}</p>
          <p className="text-[11px] text-fg-muted mt-1 leading-snug">Held by Siamo until move-out</p>
        </div>
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          <p className="text-xs text-fg-muted mb-1">Contract</p>
          <div className="mt-1">
            {!contractData ? (
              <span className="text-xs font-medium text-warning">Not available</span>
            ) : contractData.status === "PendingTenantSignature" ? (
              <span className="flex items-center gap-1 text-xs font-medium text-warning"><Clock size={11} />Awaiting tenant</span>
            ) : contractData.status === "PendingLandlordSignature" ? (
              <span className="flex items-center gap-1 text-xs font-medium text-brand"><PenLine size={11} />Your turn to sign</span>
            ) : contractData.status === "FullySigned" ? (
              <div className="space-y-1">
                <span className="flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 size={11} />Fully signed</span>
                {(contractData.finalPdfUrl ?? contractData.draftPdfUrl) && (
                  <a href={contractData.finalPdfUrl ?? contractData.draftPdfUrl!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors">
                    <Eye size={11} />Download PDF
                  </a>
                )}
                {contractData.finalPdfSha256 && (
                  <p className="text-[9px] font-mono text-fg-subtle break-all leading-tight" title={contractData.finalPdfSha256}>
                    SHA-256: {contractData.finalPdfSha256.slice(0, 16)}…
                  </p>
                )}
              </div>
            ) : contractData.status === "Voided" ? (
              <span className="flex items-center gap-1 text-xs font-medium text-danger"><XCircle size={11} />Voided</span>
            ) : (
              <div className="flex items-center gap-2">
                {booking.hasContract
                  ? <span className="flex items-center gap-1 text-xs font-medium text-success"><FileText size={12} />On file</span>
                  : <span className="text-xs font-medium text-warning">Not uploaded</span>
                }
                {(contractData?.finalPdfUrl ?? contractData?.draftPdfUrl ?? booking.contractUrl) && (
                  <a href={contractData?.finalPdfUrl ?? contractData?.draftPdfUrl ?? booking.contractUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors">
                    <Eye size={11} />View
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Time remaining card */}
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          {isActive && daysLeft != null && leaseProgress !== null ? (
            <>
              <p className="text-xs text-fg-muted mb-1">Time remaining</p>
              <p className={cn("text-xl font-semibold", daysLeft <= 14 ? "text-danger" : daysLeft <= 30 ? "text-warning" : "text-fg")}>
                {daysLeft}d
                {monthsLeft != null && monthsLeft > 0 && <span className="text-sm font-normal text-fg-muted ml-1">≈ {monthsLeft} month{monthsLeft !== 1 ? "s" : ""}</span>}
              </p>
              <div className="mt-2 h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", daysLeft <= 14 ? "bg-danger" : daysLeft <= 30 ? "bg-warning" : "bg-success")}
                  style={{ width: `${leaseProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-fg-muted mb-1">Duration</p>
              <p className="text-xl font-semibold text-fg">{durationMonths > 0 ? `${durationMonths} month${durationMonths !== 1 ? "s" : ""}` : "—"}</p>
              <p className="text-xs text-fg-muted mt-1">{formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}</p>
            </>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* LEFT: Payments */}
        <div className="space-y-4">

          {/* ── Prominent: Initial payment received ── */}
          {firstMonthPayment && (
            <div className={cn(
              "rounded-2xl border p-5",
              initialPaymentsReceived
                ? "bg-success/8 border-success/25"
                : "bg-warning/8 border-warning/25"
            )}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={cn("text-sm font-bold", initialPaymentsReceived ? "text-success" : "text-warning")}>
                    {initialPaymentsReceived ? "✓ First month's rent received" : "⏳ Awaiting initial payment"}
                  </p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {initialPaymentsReceived
                      ? "The tenant's first month has been paid via Siamo."
                      : "The tenant will pay the first month via Siamo before check-in."}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-2xl font-bold", initialPaymentsReceived ? "text-success" : "text-fg")}>
                    {formatThb(firstMonthPayment.amount)}
                  </p>
                  <p className="text-[11px] text-fg-muted mt-0.5">First month</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Monthly rent timeline ── */}
          <div>
          <h2 className="text-sm font-semibold text-fg mb-3">Monthly rent schedule</h2>
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // New model: per-month PaymentRecords are the source of truth
            const rentPayments = (paymentData?.payments ?? [])
              .filter((p) => p.type === "MonthlyRent")
              .sort((a, b) => (a.monthIndex ?? 0) - (b.monthIndex ?? 0));

            // Legacy model: single full-Rent invoice (monthIndex null)
            const legacyRentInvoice = (invoices ?? []).find(
              (inv) => inv.type === "Rent" && (inv.monthIndex == null),
            );

            if (rentPayments.length > 0) {
              const paidCount = rentPayments.filter((p) => p.status === "Paid").length;
              const totalCount = rentPayments.length;
              const allPaid = paidCount === totalCount;

              const pmtLabel = (p: typeof rentPayments[0]) =>
                p.dueDate
                  ? new Date(p.dueDate).toLocaleString("en", { month: "long", year: "numeric" })
                  : `Month ${p.monthIndex}`;

              return (
                <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
                  <div className="px-5 pt-4 pb-3.5 flex items-center justify-between border-b border-border">
                    <div>
                      <p className="text-sm font-semibold text-fg">Monthly rent</p>
                      <p className="text-xs text-fg-muted mt-0.5">{formatThb(monthlyRate)} / month · {totalCount} months total</p>
                    </div>
                    {allPaid ? (
                      <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">✓ All paid</span>
                    ) : (
                      <span className="text-xs font-semibold text-fg-muted bg-bg-subtle px-2.5 py-1 rounded-full">{paidCount} / {totalCount} paid</span>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {rentPayments.map((p) => {
                      const isPaid = p.status === "Paid";
                      const dueDate = p.dueDate ? new Date(p.dueDate) : null;
                      dueDate?.setHours(0, 0, 0, 0);
                      const isPast = dueDate ? dueDate < today : false;
                      const isCurrent = dueDate
                        ? dueDate.getFullYear() === today.getFullYear() && dueDate.getMonth() === today.getMonth()
                        : false;
                      const isOverdue = !isPaid && isPast && !isCurrent;
                      const isDueThisMonth = !isPaid && isCurrent;
                      const isUpcoming = !isPaid && !isPast && !isCurrent;

                      return (
                        <div key={p.id} className={cn(
                          "px-5 py-3 flex items-center justify-between gap-3",
                          isDueThisMonth && "bg-warning/5",
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              isPaid ? "bg-success" : isOverdue || isDueThisMonth ? "bg-warning" : "bg-fg-subtle/40",
                            )} />
                            <div>
                              <p className={cn("text-sm font-medium", isUpcoming ? "text-fg-muted" : "text-fg")}>{pmtLabel(p)}</p>
                              {isDueThisMonth && <p className="text-[10px] text-warning font-medium">Due this month</p>}
                              {isOverdue && <p className="text-[10px] text-danger font-medium">Overdue</p>}
                              {isUpcoming && <p className="text-[10px] text-fg-subtle">Upcoming</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className={cn("text-sm font-semibold", isUpcoming ? "text-fg-muted" : "text-fg")}>
                              {formatThb(p.amount)}
                            </span>
                            {isPaid ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-success/10 text-success">Paid</span>
                            ) : isOverdue || isDueThisMonth ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-warning/10 text-warning">Due</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-bg-subtle text-fg-subtle">Upcoming</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {allPaid && (
                    <div className="px-5 py-3 bg-success/5 border-t border-success/10">
                      <span className="text-xs text-success font-semibold">✓ Fully paid — {formatThb(rentPayments.reduce((s, p) => s + p.amount, 0))} received</span>
                    </div>
                  )}
                </div>
              );
            }

            // Legacy fallback: single full-Rent invoice
            if (legacyRentInvoice) {
              const trulyAllPaid = legacyRentInvoice.status === InvoiceStatus.Paid && bookingIsOver;
              const months: { label: string; date: Date; isPast: boolean; isCurrent: boolean }[] = [];
              for (let m = 0; m < durationMonths; m++) {
                const d = new Date(booking.checkInDate);
                d.setDate(1);
                d.setMonth(d.getMonth() + m);
                const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                months.push({
                  label: d.toLocaleString("en", { month: "long", year: "numeric" }),
                  date: d,
                  isPast: monthEnd < today,
                  isCurrent: d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth(),
                });
              }
              const dueMonths = months.filter((m) => m.isPast || m.isCurrent).length;
              const overduePending = !trulyAllPaid && !initialPaymentsReceived && dueMonths > 0;

              // Derived payment health from real payment data — drives enforcement actions
              const paymentHealth = paymentData?.payments
                ? computePaymentHealth(paymentData.payments)
                : null;
              const canReminder  = paymentHealth && paymentHealth.daysOverdue >= 3;
              const canFormal    = paymentHealth && paymentHealth.daysOverdue >= 7;
              const canTerminate = paymentHealth && paymentHealth.daysOverdue >= 14;

              const reminderCooldownMs = 3 * 86_400_000;
              const reminderOnCooldown = lastReminderAt != null && (Date.now() - lastReminderAt) < reminderCooldownMs;
              const formalCooldownMs = 7 * 86_400_000;
              const formalOnCooldown = lastFormalAt != null && (Date.now() - lastFormalAt) < formalCooldownMs;

              return (
                <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
                  <div className="px-5 pt-4 pb-3.5 flex items-center justify-between gap-3 border-b border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">Monthly rent</p>
                      <p className="text-xs text-fg-muted mt-0.5">{formatThb(monthlyRate)} / month · {durationMonths} months total</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {paymentHealth && <HostPaymentHealthPill health={paymentHealth} />}
                      {trulyAllPaid ? (
                        <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">✓ All paid</span>
                      ) : initialPaymentsReceived ? (
                        <span className="text-xs font-semibold text-fg-muted bg-bg-subtle px-2.5 py-1 rounded-full">1 / {durationMonths} paid</span>
                      ) : overduePending ? (
                        <span className="text-xs font-semibold text-warning bg-warning/10 px-2.5 py-1 rounded-full">{dueMonths} month{dueMonths !== 1 ? "s" : ""} due</span>
                      ) : (
                        <span className="text-xs font-semibold text-fg-muted bg-bg-subtle px-2.5 py-1 rounded-full">0 / {durationMonths} paid</span>
                      )}
                    </div>
                  </div>

                  {/* Enforcement actions — surfaced only when there's overdue debt */}
                  {paymentHealth?.daysOverdue && paymentHealth.daysOverdue > 0 ? (
                    <div className="px-5 py-3 border-b border-border bg-bg-subtle/40 space-y-2">
                      <p className="text-[11px] text-fg-muted leading-relaxed">
                        Your tenant is {paymentHealth.daysOverdue} days overdue. Siamo's automated reminders already went out at D-7, D-1, D+1, D+3. You can also act directly:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="h-8 text-xs rounded-lg border-border"
                          disabled={!canReminder || reminderOnCooldown || sendPaymentNotice.isPending}
                          title={
                            !canReminder ? "Available from day 3 of overdue"
                              : reminderOnCooldown ? "Cooldown: once per 3 days"
                              : "Send a friendly reminder via email + in-app"
                          }
                          onClick={async () => {
                            try {
                              await sendPaymentNotice.mutateAsync("reminder");
                              setLastReminderAt(Date.now());
                              toast.success("Reminder sent to tenant");
                            } catch {
                              toast.error("Failed to send reminder");
                            }
                          }}
                        >
                          Send reminder
                          {!canReminder && <span className="ml-1 opacity-60">· from day 3</span>}
                          {canReminder && reminderOnCooldown && <span className="ml-1 opacity-60">· cooldown</span>}
                        </Button>

                        <Button
                          variant="outline"
                          className={cn(
                            "h-8 text-xs rounded-lg border-warning/40 text-warning",
                            !canFormal && "opacity-60",
                          )}
                          disabled={!canFormal || formalOnCooldown || sendPaymentNotice.isPending}
                          title={
                            !canFormal ? "Available from day 7 of overdue"
                              : formalOnCooldown ? "Cooldown: once per 7 days"
                              : "Issue a formal Notice of Outstanding Payment — recorded in timeline as evidence"
                          }
                          onClick={async () => {
                            try {
                              await sendPaymentNotice.mutateAsync("formal");
                              setLastFormalAt(Date.now());
                              toast.success("Formal notice issued");
                            } catch {
                              toast.error("Failed to send notice");
                            }
                          }}
                        >
                          Issue formal notice
                          {!canFormal && <span className="ml-1 opacity-60">· from day 7</span>}
                        </Button>

                        <Button
                          variant="outline"
                          className={cn(
                            "h-8 text-xs rounded-lg border-danger/40 text-danger",
                            !canTerminate && "opacity-60",
                          )}
                          disabled={!canTerminate}
                          title={
                            !canTerminate
                              ? "Available from day 14 of overdue"
                              : "Initiate termination for non-payment (gives tenant 7 days to cure)"
                          }
                          onClick={() => {
                            setTerminationReason("NonPayment");
                            setTerminationNote("");
                            setTerminateOpen(true);
                          }}
                        >
                          Initiate termination
                          {!canTerminate && <span className="ml-1 opacity-60">· from day 14</span>}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="divide-y divide-border">
                    {months.map((m, i) => {
                      const rowPaid = trulyAllPaid || (i === 0 && initialPaymentsReceived);
                      const isDue = !rowPaid && (m.isPast || m.isCurrent);
                      const isUpcoming = !rowPaid && !m.isPast && !m.isCurrent;
                      return (
                        <div key={i} className={cn("px-5 py-3 flex items-center justify-between gap-3", m.isCurrent && !rowPaid && "bg-warning/5")}>
                          <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", rowPaid ? "bg-success" : isDue ? "bg-warning" : "bg-fg-subtle/40")} />
                            <div>
                              <p className={cn("text-sm font-medium", isUpcoming ? "text-fg-muted" : "text-fg")}>{m.label}</p>
                              {m.isCurrent && !rowPaid && <p className="text-[10px] text-warning font-medium">Due this month</p>}
                              {m.isPast && !rowPaid && <p className="text-[10px] text-danger font-medium">Overdue</p>}
                              {isUpcoming && <p className="text-[10px] text-fg-subtle">Upcoming</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className={cn("text-sm font-semibold", isUpcoming ? "text-fg-muted" : "text-fg")}>{formatThb(monthlyRate)}</span>
                            {rowPaid ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-success/10 text-success">Paid</span>
                            ) : isDue ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-warning/10 text-warning">Due</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-bg-subtle text-fg-subtle">Upcoming</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return <p className="text-sm text-fg-muted">No payment schedule yet.</p>;
          })()}

          {/* Other invoices: skip per-month Rent (covered above), show Deposit, Utilities, etc. */}
          {(invoices ?? []).filter((inv) => inv.type !== "Rent").length > 0 && (
            <div className="space-y-3 mt-3">
              {(invoices ?? []).filter((inv) => inv.type !== "Rent").map((inv) => (
                <div key={inv.id} className="bg-bg-card rounded-xl shadow-card p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">{inv.description || INVOICE_TYPE_LABELS[inv.type] || inv.type}</p>
                    {inv.dueDate && <p className="text-xs text-fg-muted">Due {formatDate(inv.dueDate)}</p>}
                    {inv.type === "Deposit" && (
                      <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                        Held by Siamo until move-out. Released to you only in case of documented damage or breach of tenancy terms.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inv.amount != null && <p className="text-sm font-semibold text-fg">{formatThb(inv.amount)}</p>}
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", {
                      "bg-success/10 text-success": inv.status === InvoiceStatus.Paid,
                      "bg-warning/10 text-warning": inv.status === InvoiceStatus.Pending,
                    })}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* RIGHT: Guests + Tickets */}
        <div className="space-y-6">
          {/* Guests */}
          <div>
            <h2 className="text-sm font-semibold text-fg mb-3">Guests</h2>
            {!guests?.length ? (
              <p className="text-sm text-fg-muted">No residents added yet. Once the tenant joins the portal, their co-residents will appear here.</p>
            ) : (
              <div className="space-y-3">
                {guests.map((g) => <GuestCard key={g.id} guest={g} bookingId={id!} onTm30Status={handleTm30Status} />)}
              </div>
            )}
          </div>

          {/* TM-30 Filing */}
          {(() => {
            const hasAnyPassport = (guests ?? []).some((g) => !!g.passportNumber);
            const missingLegalAddress = !asset?.legalAddress;
            const { total: tm30Total, filed: tm30Filed2, allFiled: tm30AllFiled } = tm30Summary;

            const steps: { icon: React.ReactNode; title: string; body: React.ReactNode }[] = [
              {
                icon: <Download size={13} />,
                title: "Download the pre-filled template",
                body: (
                  <>
                    <p>We pre-fill all guest passport details and your property's legal address into the Excel file. Open it in Excel or Google Sheets and verify the information is correct before submitting.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!hasAnyPassport || tm30Downloading || missingLegalAddress}
                      onClick={handleDownloadTm30Template}
                      className="mt-3 gap-2 w-full"
                    >
                      <Download size={13} />
                      {tm30Downloading ? "Downloading…" : "Download TM-30 Excel template"}
                    </Button>
                    {!hasAnyPassport && (
                      <p className="mt-2 text-[11px] text-fg-muted">Available once a guest submits their passport details.</p>
                    )}
                  </>
                ),
              },
              {
                icon: <Globe size={13} />,
                title: "Register on the immigration portal",
                body: (
                  <>
                    <p><span className="font-medium text-fg">First time only.</span> Create a landlord account at the official TM-30 portal using your Thai ID or passport and your property title deed. After online sign-up, visit your local immigration office once to verify your identity — after that, everything is done online.</p>
                    <a
                      href="https://tm30.immigration.go.th"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                    >
                      Open TM-30 portal <ExternalLink size={11} />
                    </a>
                  </>
                ),
              },
              {
                icon: <FileText size={13} />,
                title: "Upload the file on the portal",
                body: (
                  <p>Log in, go to <span className="font-medium text-fg">"Notification of Residence"</span>, and upload the Excel file. No manual entry needed — all guest details are already in the file. Review the preview and submit.</p>
                ),
              },
              {
                icon: <FileCheck size={13} />,
                title: "Download the confirmation receipt",
                body: (
                  <p>After submission, download the PDF receipt from the portal. This is your legal proof of compliance — share a copy with your tenant too, as they may need it when extending their visa at immigration.</p>
                ),
              },
              {
                icon: <Upload size={13} />,
                title: "Upload the receipt here",
                body: (
                  <p>Use the <span className="font-medium text-fg">"Upload PDF"</span> button on each guest's card above. Their TM-30 status will update to <span className="font-medium text-success">Filed</span> and you'll have a record on file.</p>
                ),
              },
            ];

            return (
              <div>
                <div className="flex items-center justify-between mb-3" id="tm30-section">
                  <h2 className="text-sm font-semibold text-fg">TM-30 Filing</h2>
                  {tm30Total > 0 && (
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      tm30AllFiled
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning",
                    )}>
                      {tm30AllFiled ? `✓ ${tm30Total}/${tm30Total} filed` : `${tm30Filed2}/${tm30Total} filed`}
                    </span>
                  )}
                </div>
                <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">

                  {/* Deadline banner */}
                  <div className="px-4 py-3 bg-warning/8 border-b border-warning/20 flex items-start gap-2.5">
                    <AlertCircle size={14} className="text-warning shrink-0 mt-px" />
                    <div>
                      <p className="text-xs font-semibold text-fg">Required within 24 hours of check-in</p>
                      <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">
                        Thai law requires landlords to report all foreign guests to immigration. Applies to non-Thai nationals only. Fine: ฿800–2,000 per guest.
                      </p>
                    </div>
                  </div>

                  {/* Missing legal address warning */}
                  {missingLegalAddress && (
                    <div className="px-4 py-3 bg-danger/8 border-b border-danger/20 flex items-start gap-2.5">
                      <AlertCircle size={14} className="text-danger shrink-0 mt-px" />
                      <p className="text-[11px] text-danger leading-relaxed">
                        Legal address is missing for this property — it is required for the TM-30 template.{" "}
                        <a href={`/me/host/properties/${booking.assetId}`} className="font-semibold underline underline-offset-2">
                          Add it in property settings →
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Timeline steps */}
                  <div className="px-4 pt-4 pb-4">
                    {steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        {/* Left column: number circle + connector */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-6 h-6 rounded-full bg-brand/10 text-brand text-[11px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </div>
                          {i < steps.length - 1 && (
                            <div className="w-px flex-1 bg-border my-1.5" />
                          )}
                        </div>

                        {/* Right column: content */}
                        <div className={cn("flex-1 min-w-0", i < steps.length - 1 ? "pb-4" : "pb-0")}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-fg-muted">{step.icon}</span>
                            <p className="text-[13px] font-semibold text-fg leading-tight">{step.title}</p>
                          </div>
                          <div className="text-[12px] text-fg-muted leading-relaxed space-y-1">
                            {step.body}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* In-person alternative */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide mb-1.5">Alternative: In person</p>
                      <p className="text-[12px] text-fg-muted leading-relaxed">
                        Print the Excel template and bring it to your local immigration office with passport copies for each guest. You'll receive a stamped receipt on the spot — no online account needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tickets */}
          <div>
            <h2 className="text-sm font-semibold text-fg mb-3">Tickets</h2>
            {!tickets?.length ? (
              <p className="text-sm text-fg-muted">No tickets for this booking.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="bg-bg-card rounded-xl shadow-card p-3 flex items-center gap-3">
                    <span className="text-base shrink-0">{ticketKindIcon(t.kind)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                      <p className="text-xs text-fg-muted">{t.displayId}</p>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", ticketStatusClass(t.status))}>
                      {TICKET_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                ))}
                {openTickets.length > 0 && (
                  <p className="text-xs text-fg-muted">{openTickets.length} open ticket{openTickets.length > 1 ? "s" : ""}</p>
                )}
              </div>
            )}
          </div>

          {/* PEA electricity */}
          {booking.assetId && (
            <div>
              <h2 className="text-sm font-semibold text-fg mb-3">Utilities</h2>
              <PeaBillCard assetId={booking.assetId} />
            </div>
          )}
        </div>
      </div>

      {/* ── Contract signing section ── */}
      {contractData && (
        <>
          {contractData.status === "PendingTenantSignature" && (() => {
            const deadline = contractSigningDeadline(contractData);
            const hoursLeft = (new Date(deadline).getTime() - Date.now()) / 3600_000;
            // Mirror the tenant-side escalation thresholds so both sides see the same urgency.
            const isUrgent = hoursLeft >= 0 && hoursLeft < 12;
            const isElevated = hoursLeft >= 0 && hoursLeft < 36;
            const palette = isUrgent
              ? "bg-danger/8 border-danger/30"
              : isElevated
                ? "bg-warning/8 border-warning/30"
                : "bg-bg-card border-border";
            const accent = isUrgent ? "text-danger" : isElevated ? "text-warning" : "text-fg-muted";
            return (
              <div className={cn("rounded-2xl border p-5 flex items-start gap-3", palette)}>
                <Clock size={18} className={cn("shrink-0 mt-0.5", accent)} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={cn("text-sm font-semibold", isUrgent ? "text-danger" : isElevated ? "text-warning" : "text-fg")}>
                      {isUrgent ? "Tenant about to miss the signing deadline" : "Awaiting tenant signature"}
                    </p>
                    <CountdownPill
                      deadline={deadline}
                      prefix="Tenant has"
                      expiredLabel="Expired — booking will be cancelled"
                    />
                  </div>
                  <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                    The rental agreement is with the tenant. If they don't sign by the deadline the booking
                    auto-cancels and any payment is refunded.
                    {isElevated && " Consider nudging them via a message or directly."}
                  </p>
                </div>
              </div>
            );
          })()}

          {contractData.status === "PendingLandlordSignature" && (
            <div id="landlord-sign-form" className="bg-bg-card border-2 border-brand/40 rounded-2xl overflow-hidden shadow-lg scroll-mt-8">
              <div className="px-5 pt-4 pb-3 border-b border-brand/20 bg-brand/5 flex items-center gap-2">
                <PenLine size={15} className="text-brand" />
                <h3 className="text-sm font-bold text-brand">Sign the rental agreement</h3>
                <span className="ml-auto text-xs font-semibold text-white bg-brand px-2 py-0.5 rounded-full">Action required</span>
              </div>
              <form onSubmit={handleLandlordSign} className="p-5 space-y-4">
                <p className="text-xs text-fg-muted">
                  The tenant has signed the agreement. Please review and add your signature to finalise.
                </p>
                {contractData.draftPdfUrl && (
                  <a
                    href={contractData.draftPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                  >
                    <FileText size={14} />View draft agreement (PDF)
                  </a>
                )}

                {/* Full name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-fg">Full name</label>
                  <Input
                    placeholder="Your full legal name"
                    value={landlordTypedName}
                    onChange={(e) => setLandlordTypedName(e.target.value)}
                    required
                  />
                </div>

                {/* Signing as */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-fg">Signing as</label>
                  <Select value={landlordSigningCapacity} onValueChange={setLandlordSigningCapacity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Owner">Owner</SelectItem>
                      <SelectItem value="Authorised Representative">Authorised Representative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Company name — only for authorised rep */}
                {landlordSigningCapacity === "Authorised Representative" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-fg">Company name</label>
                    <Input
                      placeholder="Company or organisation name"
                      value={landlordCompanyName}
                      onChange={(e) => setLandlordCompanyName(e.target.value)}
                    />
                  </div>
                )}

                {/* Signature canvas */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-fg">
                    Draw your signature <span className="text-fg-muted font-normal">(optional)</span>
                  </label>
                  <SignatureCanvas onChange={setLandlordSignatureFile} />
                </div>

                {/* ── Legal checkboxes ── */}
                <div className="space-y-4 pt-1">

                  {/* 1 — Agree to terms */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="landlordAgreedTerms"
                      checked={landlordAgreedTerms}
                      onCheckedChange={(v) => setLandlordAgreedTerms(!!v)}
                      className="mt-0.5 shrink-0"
                    />
                    <Label htmlFor="landlordAgreedTerms" className="text-sm text-fg leading-snug cursor-pointer">
                      I have read the full{" "}
                      <a href="/legal/rental-terms" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">
                        Rental Agreement
                      </a>{" "}
                      and confirm that its contents are accurate and complete. <span className="text-danger">*</span>
                    </Label>
                  </div>

                  {/* 2 — Electronic signature / ETA */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="landlordAgreedEta"
                      checked={landlordAgreedEta}
                      onCheckedChange={(v) => setLandlordAgreedEta(!!v)}
                      className="mt-0.5 shrink-0"
                    />
                    <Label htmlFor="landlordAgreedEta" className="text-sm text-fg leading-snug cursor-pointer">
                      I understand that by typing my full name above, I am providing an{" "}
                      <a href="/legal/e-signature" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">
                        electronic signature
                      </a>{" "}
                      that is legally binding under Thailand's Electronic Transactions Act B.E. 2544 (2001). <span className="text-danger">*</span>
                    </Label>
                  </div>

                  {/* 3 — Authorization (Authorised Representative only) */}
                  {landlordSigningCapacity === "Authorised Representative" && (
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="landlordAgreedAuth"
                        checked={landlordAgreedAuth}
                        onCheckedChange={(v) => setLandlordAgreedAuth(!!v)}
                        className="mt-0.5 shrink-0"
                      />
                      <Label htmlFor="landlordAgreedAuth" className="text-sm text-fg leading-snug cursor-pointer">
                        I confirm that I am duly authorised to sign this agreement on behalf of{" "}
                        <span className="font-semibold">{landlordCompanyName.trim() || "the company"}</span>{" "}
                        and have full legal authority to bind it to these terms. <span className="text-danger">*</span>
                      </Label>
                    </div>
                  )}

                </div>

                {/* Security note */}
                <div className="flex items-start gap-2 text-xs text-fg-muted bg-bg-subtle rounded-xl px-3 py-2.5">
                  <AlertCircle size={12} className="shrink-0 mt-0.5 opacity-50" />
                  <p>Your full name, IP address, and timestamp are cryptographically recorded. Fields marked <span className="text-danger">*</span> are required.</p>
                </div>

                {/* Error */}
                {landlordSignError && (
                  <div className="flex items-start gap-2 rounded-xl px-4 py-3 bg-danger/10 border border-danger/20">
                    <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />
                    <p className="text-sm text-danger">{landlordSignError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    !landlordTypedName.trim() ||
                    !landlordAgreedTerms ||
                    !landlordAgreedEta ||
                    (landlordSigningCapacity === "Authorised Representative" && !landlordAgreedAuth) ||
                    landlordSignContract.isPending
                  }
                  className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-10 text-sm font-semibold disabled:opacity-50"
                >
                  {landlordSignContract.isPending ? "Signing…" : "Sign agreement"}
                </Button>
              </form>
            </div>
          )}

        </>
      )}


      {/* ── Early exit request (tenant-initiated, pending host response) ── */}
      {cancellation && cancellation.status === "Requested" && (cancellation.initiator ?? "Tenant") === "Tenant" && (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-fg">Early exit request</h3>
            <CountdownPill deadline={cancellationDeadline(cancellation)} prefix="Respond in" expiredLabel="Deadline passed" />
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            If you don't respond by the deadline, this request will be automatically declined and the tenant
            may submit a new one.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-fg-muted">Earliest exit</p>
              <p className="font-medium text-fg">{formatDate(cancellation.earliestExitDate)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Penalty</p>
              <p className="font-medium text-fg">{formatThb(cancellation.penaltyAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Deposit refund</p>
              <p className="font-medium text-fg">{formatThb(cancellation.depositRefundAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Net refund to tenant</p>
              <p className="font-semibold text-fg">{formatThb(cancellation.netRefund)}</p>
            </div>
          </div>
          {cancellation.tenantNote && (
            <p className="text-xs text-fg-muted italic">"{cancellation.tenantNote}"</p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-10 border-border text-fg"
              disabled={declineCancellation.isPending || confirmCancellation.isPending}
              onClick={() => { setDeclineReason(""); setDeclineOpen(true); }}
            >
              Decline
            </Button>
            <Button
              className="flex-1 bg-danger hover:bg-danger/90 text-white rounded-xl h-10"
              disabled={confirmCancellation.isPending || declineCancellation.isPending}
              onClick={async () => {
                try {
                  await confirmCancellation.mutateAsync(cancellation.id);
                  toast.success("Early exit confirmed — booking cancelled");
                } catch {
                  toast.error("Failed to confirm");
                }
              }}
            >
              {confirmCancellation.isPending ? "Confirming…" : "Confirm early exit"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Declined / Expired / Withdrawn — informational only ── */}
      {cancellation && (cancellation.status === "Declined" || cancellation.status === "Expired" || cancellation.status === "Withdrawn") && (
        <div className="bg-bg-subtle border border-border rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-fg">Early exit request — {cancellation.status.toLowerCase()}</h3>
          </div>
          {cancellation.status === "Declined" && cancellation.declineReason && (
            <p className="text-xs text-fg-muted">
              <span className="font-medium text-fg">Reason:</span> {cancellation.declineReason}
            </p>
          )}
          {cancellation.status === "Expired" && (
            <p className="text-xs text-fg-muted">The 72-hour response window passed without action.</p>
          )}
          {cancellation.status === "Withdrawn" && (
            <p className="text-xs text-fg-muted">The tenant withdrew their request.</p>
          )}
        </div>
      )}

      {/* ── Dialogs ── */}

      {/* Unlink tenant */}
      <Dialog open={unlinkTenantOpen} onOpenChange={setUnlinkTenantOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove tenant from booking</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm text-fg-muted">
            <p>
              This will unlink{" "}
              <span className="font-semibold text-fg">{booking.tenantName}</span>{" "}
              from the booking and reset its status to <strong>Pending</strong> so you can re-invite someone else.
            </p>
            <div className="rounded-lg bg-warning/5 border border-warning/20 px-3 py-2.5 space-y-1.5">
              <p className="text-xs font-semibold text-warning">This is not a tenant eviction.</p>
              <p className="text-[11px] leading-relaxed text-fg-muted">
                If the tenant has already moved in or paid for ongoing months, use the
                <strong className="text-fg"> early-exit / termination flow</strong> instead — that path
                handles deposit refunds, penalties, and notice periods properly. Removing the tenant here
                does <em>not</em> trigger any refund or settlement.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTenantOpen(false)} disabled={unlinkTenant.isPending}>Cancel</Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={unlinkTenant.isPending}
              onClick={async () => {
                try {
                  await unlinkTenant.mutateAsync();
                  toast.success("Tenant removed");
                  setUnlinkTenantOpen(false);
                } catch {
                  toast.error("Failed to remove tenant");
                }
              }}
            >
              {unlinkTenant.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline early-exit request */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Decline early-exit request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">
              The tenant will see your reason and can submit a new request after a short cooldown. Please
              explain your decision — this is your record in case of a dispute.
            </p>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Not a good time to find a replacement tenant. Happy to discuss other exit dates."
              className="min-h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)} disabled={declineCancellation.isPending}>Cancel</Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={declineCancellation.isPending || declineReason.trim().length < 5}
              onClick={async () => {
                if (!cancellation) return;
                try {
                  await declineCancellation.mutateAsync({ cancellationId: cancellation.id, reason: declineReason.trim() });
                  toast.success("Request declined");
                  setDeclineOpen(false);
                } catch {
                  toast.error("Failed to decline");
                }
              }}
            >
              {declineCancellation.isPending ? "Declining…" : "Decline request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Landlord-initiated termination */}
      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Initiate termination</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">
              This sends a formal termination notice to the tenant. Depending on the reason, financial
              consequences differ.
            </p>

            <div className="space-y-2">
              <Label className="text-sm">Reason</Label>
              <div className="grid gap-2">
                {([
                  { id: "NonPayment", label: "Non-payment", body: "14+ days of unpaid rent. Tenant has 7 days to pay before termination is final. Deposit may cover the debt." },
                  { id: "Breach", label: "Breach of agreement", body: "Damages, unauthorised guests, rule violations. Subject to dispute." },
                  { id: "MutualAgreement", label: "Mutual agreement", body: "Both sides agreed verbally. No penalties; deposit returned in full." },
                ] as const).map((r) => (
                  <label
                    key={r.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors",
                      terminationReason === r.id
                        ? "border-danger/40 bg-danger/5"
                        : "border-border bg-bg hover:bg-bg-subtle",
                    )}
                  >
                    <input
                      type="radio"
                      name="termination-reason"
                      checked={terminationReason === r.id}
                      onChange={() => setTerminationReason(r.id)}
                      className="mt-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg">{r.label}</p>
                      <p className="text-[11px] text-fg-muted leading-relaxed mt-0.5">{r.body}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Explanation (shown to tenant)</Label>
              <Textarea
                value={terminationNote}
                onChange={(e) => setTerminationNote(e.target.value)}
                placeholder={
                  terminationReason === "NonPayment" ? "e.g. June rent of ฿25,000 unpaid since 14 Jun despite reminders."
                    : terminationReason === "Breach"  ? "e.g. Repeated noise complaints from neighbours, unauthorised pets."
                    : "e.g. Tenant accepted job abroad, both agreed to end early on Sep 1."
                }
                className="min-h-24"
              />
              <p className="text-[11px] text-fg-muted">Minimum 20 characters. This will be recorded as evidence.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateOpen(false)} disabled={initiateTermination.isPending}>Cancel</Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={initiateTermination.isPending || terminationNote.trim().length < 20}
              onClick={async () => {
                try {
                  await initiateTermination.mutateAsync({ reason: terminationReason, note: terminationNote.trim() });
                  toast.success("Termination notice sent to tenant");
                  setTerminateOpen(false);
                } catch {
                  toast.error("Failed to initiate termination");
                }
              }}
            >
              {initiateTermination.isPending ? "Sending…" : "Send notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay invoice dialog removed — payments are gateway-only */}
    </div>
  );
}
