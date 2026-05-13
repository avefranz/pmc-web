import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Trash2, FileText, Upload,
  Eye,
  PenLine, CheckCircle2, Clock, AlertCircle,
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
} from "@/lib/hooks/use-bookings";
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
function GuestCard({ guest, bookingId }: { guest: BookingGuestDto; bookingId: string }) {
  const { data: tm30 } = useBookingTm30(bookingId, guest.id);
  const uploadTm30 = useUploadTm30(bookingId, guest.id);

  const hasPassport = !!(guest.passportNumber || guest.nationality || guest.visaType);
  const tm30Filed = tm30?.status === Tm30Status.Filed;

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
            {(guest.nationality || guest.visaType) && <p>{[guest.nationality, guest.visaType].filter(Boolean).join(" · ")}</p>}
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
  const cancellationEnabled = booking?.status === BookingStatus.Active || booking?.status === BookingStatus.Confirmed;
  const { data: cancellation } = useBookingCancellation(id!, cancellationEnabled);

  const confirmCancellation = useConfirmCancellation(id!);
  const landlordSignContract = useLandlordSignContract(id!);

  const [unlinkTenantOpen, setUnlinkTenantOpen] = useState(false);
  const unlinkTenant = useUnlinkTenant(id!);

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
            {booking.tenantName && (
              <button
                className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-muted hover:text-danger transition-colors"
                title="Remove tenant"
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
            {booking.status}
          </span>
        )}
      </div>

      {/* ── URGENT: Landlord must sign ── */}
      {contractData?.status === "PendingLandlordSignature" && (
        <div className="bg-brand rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-lg">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <PenLine size={20} className="text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Action required — sign the rental agreement</p>
              <p className="text-sm text-white/80 mt-0.5">
                The tenant has paid and signed. Your signature finalises the booking. Scroll down to sign.
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
              return (
                <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
                  <div className="px-5 pt-4 pb-3.5 flex items-center justify-between border-b border-border">
                    <div>
                      <p className="text-sm font-semibold text-fg">Monthly rent</p>
                      <p className="text-xs text-fg-muted mt-0.5">{formatThb(monthlyRate)} / month · {durationMonths} months total</p>
                    </div>
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
                {guests.map((g) => <GuestCard key={g.id} guest={g} bookingId={id!} />)}
              </div>
            )}
          </div>

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
        </div>
      </div>

      {/* ── Contract signing section ── */}
      {contractData && (
        <>
          {contractData.status === "PendingTenantSignature" && (
            <div className="bg-bg-card border border-border rounded-2xl p-5 flex items-start gap-3">
              <Clock size={18} className="text-fg-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-fg">Awaiting tenant signature</p>
                <p className="text-xs text-fg-muted mt-1">
                  The rental agreement has been sent to the tenant for signing. You'll be notified when they've signed.
                </p>
              </div>
            </div>
          )}

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


      {/* ── Early exit confirmation ── */}
      {cancellation && cancellation.status === "Requested" && (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-fg">Early exit request</h3>
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
          <Button
            className="w-full bg-danger hover:bg-danger/90 text-white rounded-xl h-10"
            disabled={confirmCancellation.isPending}
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
      )}

      {/* ── Dialogs ── */}

      {/* Unlink tenant */}
      <Dialog open={unlinkTenantOpen} onOpenChange={setUnlinkTenantOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove tenant</DialogTitle></DialogHeader>
          <p className="text-sm text-fg-muted">
            Remove{" "}
            <span className="font-semibold text-fg">{booking.tenantName}</span>{" "}
            from this booking? The booking status will reset to <strong>Pending</strong>. You can send a new invite afterwards.
          </p>
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

      {/* Pay invoice dialog removed — payments are gateway-only */}
    </div>
  );
}
