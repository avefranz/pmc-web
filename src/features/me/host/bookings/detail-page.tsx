import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Trash2, FileText, Upload,
  Eye,
  PenLine, CheckCircle2, Clock, AlertCircle, Download, ExternalLink, Globe, FileCheck, XCircle, Loader2,
  Settings, Home, Zap, Users, ListChecks, Wrench,
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

// ─── Tabs nav ─────────────────────────────────────────────────────────────────

type TabId = "overview" | "payments" | "guests" | "tickets" | "utilities";

function TabsNav({
  active,
  onChange,
  counts,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  counts: { payments?: string; guests?: string | number; tickets?: number };
}) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: string | number }[] = [
    { id: "overview",  label: "Overview",  icon: <Home size={13} /> },
    { id: "payments",  label: "Payments",  icon: <ListChecks size={13} />, count: counts.payments },
    { id: "guests",    label: "Guests",    icon: <Users size={13} />,      count: counts.guests },
    { id: "tickets",   label: "Tickets",   icon: <Wrench size={13} />,     count: counts.tickets },
    { id: "utilities", label: "Utilities", icon: <Zap size={13} /> },
  ];
  return (
    <div className="border-b border-border overflow-x-auto">
      <div role="tablist" className="flex gap-1 min-w-max">
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              onClick={() => onChange(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                on ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              <span className={cn("transition-colors", on ? "text-fg" : "text-fg-subtle")}>{t.icon}</span>
              {t.label}
              {t.count != null && t.count !== "" && t.count !== 0 && (
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums",
                  on ? "bg-fg text-bg" : "bg-bg-subtle text-fg-muted",
                )}>
                  {t.count}
                </span>
              )}
              {on && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-fg rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── At-a-glance strip ────────────────────────────────────────────────────────

function GlanceCell({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 min-w-0">
      <p className="text-[11px] text-fg-muted uppercase tracking-wide font-semibold">{label}</p>
      <div className="mt-1 text-base font-semibold text-fg truncate">{value}</div>
      {sub && <div className="text-[11px] text-fg-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

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

  const [tab, setTab] = useState<TabId>("overview");
  const [tm30DrawerOpen, setTm30DrawerOpen] = useState(false);

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
  void contractUploading;
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
  void handleUploadContract;

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
      <div className="space-y-5">
        {/* Back */}
        <Skeleton className="h-5 w-40" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-8 w-80 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Glance strip */}
        <Skeleton className="h-24 rounded-2xl" />

        {/* Tabs */}
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />

        {/* Tab panel */}
        <Skeleton className="h-[480px] rounded-2xl" />
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
  void firstMonthPayment;
  // "All paid" is only trustworthy once the booking is over — while active, the backend may
  // mark the full-rent invoice as Paid after just the first gateway payment.
  const bookingIsOver = booking.status === BookingStatus.Completed;
  const openTickets = (tickets ?? []).filter(
    (t) => !["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(t.status),
  );

  const foreignGuests = (guests ?? []).filter((g) => !!g.passportNumber);
  // Wait for every foreign guest's TM-30 query to resolve before classifying
  // the booking as compliant / overdue. Without this, the UI flashes a scary
  // "TM-30 X days overdue" banner while per-guest queries are still in flight.
  const tm30Resolved =
    foreignGuests.length === 0 ||
    foreignGuests.every((g) => tm30StatusMap.has(g.id));
  const tm30Summary = {
    total: foreignGuests.length,
    filed: foreignGuests.filter((g) => tm30StatusMap.get(g.id) === true).length,
    allFiled:
      tm30Resolved &&
      foreignGuests.length > 0 &&
      foreignGuests.every((g) => tm30StatusMap.get(g.id) === true),
    hasGuests: foreignGuests.length > 0,
    resolved: tm30Resolved,
  };
  const bookingDone = booking.status === BookingStatus.Completed || booking.status === BookingStatus.Cancelled;
  const daysSinceCheckIn = Math.floor((Date.now() - checkInDate.getTime()) / 86_400_000);
  const tm30Overdue =
    !bookingDone &&
    tm30Summary.hasGuests &&
    tm30Summary.resolved &&
    !tm30Summary.allFiled &&
    daysSinceCheckIn >= 0 &&
    daysSinceCheckIn <= 30;
  const unfiledCount = tm30Summary.total - tm30Summary.filed;
  const maxFine = unfiledCount * 2000;

  // Rent payments (new per-month model)
  const rentPayments = (paymentData?.payments ?? [])
    .filter((p) => p.type === "MonthlyRent")
    .sort((a, b) => (a.monthIndex ?? 0) - (b.monthIndex ?? 0));
  const paidRentCount = rentPayments.filter((p) => p.status === "Paid").length;

  // Tab count labels — TM-30 progress hangs off the Guests tab now that the
  // two are merged. Hide the TM-30 fraction until every per-guest query has
  // resolved so the count doesn't flicker from "0/N" → "N/N".
  const guestCountLabel = guests?.length
    ? tm30Summary.hasGuests && tm30Summary.resolved
      ? `${guests.length} · ${tm30Summary.filed}/${tm30Summary.total} TM-30`
      : `${guests.length}`
    : undefined;
  const counts = {
    payments: rentPayments.length > 0 ? `${paidRentCount}/${rentPayments.length}` : undefined,
    guests: guestCountLabel,
    tickets: openTickets.length,
  };

  // ── Single most-urgent alert (banner) ─────────────────────────────────────
  // Priority order: most actionable / time-sensitive first.
  const closeLeaseAvailable = booking.status === BookingStatus.Active && new Date(booking.checkOutDate) <= new Date();
  const payoutsMissing = booking.status === BookingStatus.PendingPayment && profile && !profile.promptPayId && !profile.bankAccountNumber;
  const tenantCancelPending = !!cancellation && cancellation.status === "Requested" && (cancellation.initiator ?? "Tenant") === "Tenant";

  type Alert =
    | { kind: "contract-voided" }
    | { kind: "landlord-sign" }
    | { kind: "tenant-cancel" }
    | { kind: "close-lease" }
    | { kind: "tm30-overdue" }
    | { kind: "payouts-missing" }
    | { kind: "tenant-sign-pending"; deadline: string; hoursLeft: number }
    | { kind: "lease-completed" }
    | null;

  const alert: Alert = (() => {
    if (contractData?.status === "Voided") return { kind: "contract-voided" };
    if (contractData?.status === "PendingLandlordSignature") return { kind: "landlord-sign" };
    if (tenantCancelPending) return { kind: "tenant-cancel" };
    if (closeLeaseAvailable) return { kind: "close-lease" };
    if (tm30Overdue) return { kind: "tm30-overdue" };
    if (payoutsMissing) return { kind: "payouts-missing" };
    if (contractData?.status === "PendingTenantSignature") {
      const deadline = contractSigningDeadline(contractData);
      const hoursLeft = (new Date(deadline).getTime() - Date.now()) / 3600_000;
      return { kind: "tenant-sign-pending", deadline, hoursLeft };
    }
    if (booking.status === BookingStatus.Completed) return { kind: "lease-completed" };
    return null;
  })();

  // Title meta string for the header (compact)
  const tenantLabel = booking.tenantName ?? "—";
  const headerSubtitle = `${formatDate(booking.checkInDate)} → ${formatDate(booking.checkOutDate)}`;

  // Compliance items for Overview
  const complianceItems = [
    {
      label: "TM-30",
      ok: !tm30Summary.hasGuests || tm30Summary.allFiled,
      value: tm30Summary.hasGuests ? (tm30Summary.allFiled ? `${tm30Summary.total} / ${tm30Summary.total} filed` : `${tm30Summary.filed} / ${tm30Summary.total}`) : "N/A",
    },
    {
      label: "Contract",
      ok: contractData?.status === "FullySigned",
      value: contractData?.status === "FullySigned"
        ? "Signed"
        : contractData?.status === "PendingLandlordSignature"
          ? "Your turn"
          : contractData?.status === "PendingTenantSignature"
            ? "Awaiting tenant"
            : contractData?.status === "Voided"
              ? "Voided"
              : booking.hasContract ? "On file" : "Not uploaded",
    },
    {
      label: "Payouts",
      ok: !!(profile?.promptPayId || profile?.bankAccountNumber),
      value: profile?.promptPayId || profile?.bankAccountNumber ? "Set" : "Not set",
    },
  ];

  // Glance cells
  const glance = (
    <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y divide-x divide-border sm:divide-y-0">
        <GlanceCell
          label="Monthly rent"
          value={formatThb(monthlyRate)}
          sub={
            rentPayments.length > 0
              ? `${paidRentCount} of ${rentPayments.length} collected`
              : durationMonths > 0
                ? `${durationMonths}-month total ${formatThb(booking.rentAmount)}`
                : undefined
          }
        />
        <GlanceCell
          label="Deposit"
          value={formatThb(booking.depositAmount)}
          sub="Held by Siamo"
        />
        <GlanceCell
          label="Contract"
          value={
            contractData?.status === "FullySigned"
              ? <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success" />Signed</span>
              : contractData?.status === "PendingLandlordSignature"
                ? <span className="inline-flex items-center gap-1.5 text-brand"><PenLine size={14} />Your turn</span>
                : contractData?.status === "PendingTenantSignature"
                  ? <span className="inline-flex items-center gap-1.5 text-warning"><Clock size={14} />Awaiting tenant</span>
                  : contractData?.status === "Voided"
                    ? <span className="inline-flex items-center gap-1.5 text-danger"><XCircle size={14} />Voided</span>
                    : booking.hasContract
                      ? <span className="inline-flex items-center gap-1.5"><FileText size={14} />On file</span>
                      : <span className="text-warning">Not uploaded</span>
          }
          sub={
            (contractData?.finalPdfUrl ?? contractData?.draftPdfUrl ?? booking.contractUrl)
              ? <a href={contractData?.finalPdfUrl ?? contractData?.draftPdfUrl ?? booking.contractUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-fg transition-colors"><FileText size={11} />Download PDF</a>
              : undefined
          }
        />
        <GlanceCell
          label="TM-30 filing"
          value={
            !tm30Summary.hasGuests
              ? <span className="text-fg-muted">—</span>
              : tm30Summary.allFiled
                ? <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success" />{tm30Summary.total} / {tm30Summary.total} filed</span>
                : <span className="inline-flex items-center gap-1.5 text-warning"><AlertCircle size={14} />{tm30Summary.filed} / {tm30Summary.total} filed</span>
          }
          sub={
            !tm30Summary.hasGuests
              ? "No foreign guests"
              : tm30Summary.allFiled
                ? "Compliant"
                : `${unfiledCount} remaining · fine up to ฿${maxFine.toLocaleString()}`
          }
        />
      </div>
    </div>
  );

  // Render alert banner based on resolved alert
  const alertBanner = !alert ? null : (() => {
    if (alert.kind === "contract-voided") {
      return (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 flex items-start gap-3">
          <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Contract was voided</p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              The signing window closed before both parties signed. This booking is cancelled and the tenant will be refunded automatically.
            </p>
          </div>
        </div>
      );
    }
    if (alert.kind === "landlord-sign") {
      return (
        <div className="bg-brand rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-lg">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <PenLine size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-white">Action required — sign the rental agreement</p>
                {contractData && (
                  <CountdownPill
                    deadline={contractSigningDeadline(contractData)}
                    prefix="Booking expires in"
                    expiredLabel="Expired — booking will be cancelled"
                    className="bg-white/20 text-white"
                  />
                )}
              </div>
              <p className="text-sm text-white/80 mt-1">
                The tenant has paid and signed. Your signature finalises the booking.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab("guests")}
            className="shrink-0 bg-white text-brand font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-center"
          >
            Sign now →
          </button>
        </div>
      );
    }
    if (alert.kind === "tenant-cancel") {
      return (
        <div className="bg-danger/8 border border-danger/25 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-fg">Early-exit request needs your response</p>
              {cancellation && <CountdownPill deadline={cancellationDeadline(cancellation)} prefix="Respond in" expiredLabel="Deadline passed" />}
            </div>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Auto-declined if no response. Decide on the Payments tab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTab("payments")}
            className="shrink-0 bg-danger text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-danger/90 transition-colors"
          >
            Review →
          </button>
        </div>
      );
    }
    if (alert.kind === "close-lease") {
      return (
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-fg-muted shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Checkout date has passed — close the lease</p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Close the lease to start the deposit settlement. TM-30 must be filed for all foreign guests first.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTab("overview")}
            className="shrink-0 bg-fg text-bg font-semibold text-sm px-4 py-2 rounded-xl hover:bg-fg/90 transition-colors"
          >
            Close lease →
          </button>
        </div>
      );
    }
    if (alert.kind === "tm30-overdue") {
      const isDay0 = daysSinceCheckIn === 0;
      const isOverdue = daysSinceCheckIn >= 1;
      const isCritical = daysSinceCheckIn >= 3;
      const headline = isDay0
        ? "File TM-30 NOW — 24-hour window is open"
        : isCritical
          ? `TM-30 ${daysSinceCheckIn} days overdue — file immediately`
          : isOverdue
            ? `TM-30 overdue by ${daysSinceCheckIn} day${daysSinceCheckIn > 1 ? "s" : ""}`
            : "TM-30 still pending";
      return (
        <div className="relative bg-danger text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-2xl overflow-hidden tm30-pulse">
          <style>{`
            @keyframes tm30-pulse-ring {
              0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.55); }
              50%      { box-shadow: 0 0 0 12px rgba(220,38,38,0); }
            }
            .tm30-pulse { animation: tm30-pulse-ring 1.8s ease-in-out infinite; }
            @keyframes tm30-emoji-shake {
              0%, 100% { transform: rotate(0); }
              25%      { transform: rotate(-8deg); }
              75%      { transform: rotate(8deg); }
            }
            .tm30-emoji { animation: tm30-emoji-shake 1.2s ease-in-out infinite; display: inline-block; }
          `}</style>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="tm30-emoji text-3xl shrink-0">🚨</span>
            <div className="flex-1 min-w-0">
              <p className="text-base sm:text-lg font-extrabold leading-tight">{headline}</p>
              <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
                <b>Thai law:</b> {unfiledCount} foreign guest{unfiledCount !== 1 ? "s" : ""} unreported.
                Fine exposure <b className="bg-white/20 px-1.5 py-0.5 rounded">up to ฿{maxFine.toLocaleString()}</b>.
                Takes 5 minutes.
              </p>
              {tm30Summary.total > 1 && (
                <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.round((tm30Summary.filed / tm30Summary.total) * 100)}%` }} />
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab("guests")}
            className="shrink-0 bg-white text-danger font-bold text-sm px-5 py-3 rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            File now →
          </button>
        </div>
      );
    }
    if (alert.kind === "payouts-missing") {
      return (
        <Link
          to="/me/host/settings/payment"
          className="block rounded-2xl border border-warning/40 bg-warning/8 p-4 hover:brightness-95 transition"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg">Set up payouts so tenant can pay</p>
              <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                No PromptPay or bank account on file. Booking auto-cancels at the signing deadline.
              </p>
            </div>
            <span className="text-sm font-semibold text-warning shrink-0 self-center inline-flex items-center gap-1"><Settings size={14} />Set up →</span>
          </div>
        </Link>
      );
    }
    if (alert.kind === "tenant-sign-pending") {
      const isUrgent = alert.hoursLeft >= 0 && alert.hoursLeft < 12;
      const isElevated = alert.hoursLeft >= 0 && alert.hoursLeft < 36;
      const palette = isUrgent ? "bg-danger/8 border-danger/30" : isElevated ? "bg-warning/8 border-warning/30" : "bg-bg-card border-border";
      const accent = isUrgent ? "text-danger" : isElevated ? "text-warning" : "text-fg-muted";
      return (
        <div className={cn("rounded-2xl border p-4 flex items-start gap-3", palette)}>
          <Clock size={18} className={cn("shrink-0 mt-0.5", accent)} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-fg">
                {isUrgent ? "Tenant about to miss the signing deadline" : "Awaiting tenant signature"}
              </p>
              <CountdownPill deadline={alert.deadline} prefix="Tenant has" expiredLabel="Expired — booking will be cancelled" />
            </div>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              If unsigned by the deadline the booking auto-cancels and any payment is refunded.
              {isElevated && " Consider nudging the tenant directly."}
            </p>
          </div>
        </div>
      );
    }
    if (alert.kind === "lease-completed") {
      return (
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg">Lease completed — confirm deposit settlement</p>
            <p className="text-xs text-fg-muted mt-1">Tenancy ended on {formatDate(booking.checkOutDate)}. Settlement actions are on the Payments tab.</p>
          </div>
          <button
            type="button"
            onClick={() => setTab("payments")}
            className="shrink-0 bg-fg text-bg font-semibold text-sm px-4 py-2 rounded-xl hover:bg-fg/90 transition-colors"
          >
            Open settlement →
          </button>
        </div>
      );
    }
    return null;
  })();

  // ─── Tab panels ─────────────────────────────────────────────────────────────

  const overviewPane = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Left column */}
      <div className="space-y-5">

        {/* Next payment — only when there's a useful payment to surface */}
        {rentPayments.length > 0 && (() => {
          const next = rentPayments.find((p) => p.status === "Pending") ?? null;
          const pct = Math.round((paidRentCount / rentPayments.length) * 100);
          if (!next) {
            return (
              <div className="bg-success/8 border border-success/20 rounded-2xl p-5">
                <p className="text-sm font-semibold text-success">✓ All rent collected</p>
                <p className="text-xs text-fg-muted mt-1">
                  {formatThb(rentPayments.reduce((s, p) => s + p.amount, 0))} received over {rentPayments.length} month{rentPayments.length !== 1 ? "s" : ""}.
                </p>
              </div>
            );
          }
          const dueLabel = next.dueDate
            ? new Date(next.dueDate).toLocaleString("en", { month: "long", year: "numeric" })
            : `Month ${next.monthIndex}`;
          // Sharper status: how far is this payment from today?
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const due = next.dueDate ? new Date(next.dueDate) : null;
          due?.setHours(0, 0, 0, 0);
          const daysToDue = due ? Math.round((due.getTime() - today.getTime()) / 86_400_000) : null;
          const dueStatus = daysToDue == null
            ? { label: "Upcoming", tone: "muted" as const }
            : daysToDue < 0
              ? { label: `Overdue ${Math.abs(daysToDue)}d`, tone: "danger" as const }
              : daysToDue === 0
                ? { label: "Due today", tone: "warning" as const }
                : daysToDue <= 7
                  ? { label: `Due in ${daysToDue}d`, tone: "warning" as const }
                  : { label: `Due in ${daysToDue}d`, tone: "muted" as const };
          return (
            <div className="bg-bg-card rounded-2xl shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-fg">Next payment</h3>
                <button type="button" onClick={() => setTab("payments")} className="text-xs text-fg-muted hover:text-fg transition-colors">
                  View schedule →
                </button>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold text-fg tabular-nums">{formatThb(next.amount)}</p>
                  <p className="text-xs text-fg-muted mt-0.5">{dueLabel} · due {next.dueDate ? formatDate(next.dueDate) : "—"}</p>
                </div>
                <span className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-full shrink-0",
                  dueStatus.tone === "danger"  && "bg-danger/10 text-danger",
                  dueStatus.tone === "warning" && "bg-warning/10 text-warning",
                  dueStatus.tone === "muted"   && "bg-bg-subtle text-fg-muted",
                )}>
                  {dueStatus.label}
                </span>
              </div>
              <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-fg rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-fg-muted">
                <span>{paidRentCount} of {rentPayments.length} months collected</span>
                <span>{formatThb(rentPayments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0))} of {formatThb(rentPayments.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
            </div>
          );
        })()}

        {/* Close lease (host action for Active past checkout) */}
        {closeLeaseAvailable && (() => {
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
      </div>

      {/* Right column */}
      <div className="space-y-5">

        {/* Tenancy summary */}
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Tenancy</h3>
            {booking.assetId && (
              <Link to={`/me/host/properties/${booking.assetId}`} className="text-xs text-fg-muted hover:text-fg transition-colors">
                Open property →
              </Link>
            )}
          </div>
          <dl className="divide-y divide-border text-sm">
            <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Property</dt><dd className="text-fg text-right truncate">{booking.assetName ?? booking.listingTitle ?? "—"}</dd></div>
            <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Move-in</dt><dd className="text-fg">{formatDate(booking.checkInDate)}</dd></div>
            <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Move-out</dt><dd className="text-fg">{formatDate(booking.checkOutDate)}</dd></div>
            <div className="px-5 py-2.5 flex justify-between gap-3">
              <dt className="text-fg-muted">{isActive ? "Time remaining" : "Term"}</dt>
              <dd className="text-fg">
                {isActive && daysLeft != null && leaseProgress !== null
                  ? <><span className={cn("font-medium", daysLeft <= 14 ? "text-danger" : daysLeft <= 30 ? "text-warning" : undefined)}>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>{monthsLeft != null && monthsLeft > 0 && <span className="text-fg-muted"> · ≈{monthsLeft} mo</span>}</>
                  : durationMonths > 0 ? `${durationMonths} month${durationMonths !== 1 ? "s" : ""}` : "—"}
              </dd>
            </div>
            <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Tenants</dt><dd className="text-fg">{(guests?.length ?? 0)} guest{(guests?.length ?? 0) !== 1 ? "s" : ""}</dd></div>
            {booking.tenantName && (
              <div className="px-5 py-2.5 flex justify-between items-center gap-3">
                <dt className="text-fg-muted">Main tenant</dt>
                <dd className="text-fg flex items-center gap-2 min-w-0">
                  <span className="truncate">{tenantLabel}</span>
                  {!bookingDone && booking.status !== BookingStatus.Active && booking.status !== BookingStatus.Confirmed && (
                    <button
                      type="button"
                      onClick={() => setUnlinkTenantOpen(true)}
                      className="p-1 rounded hover:bg-danger/10 text-fg-muted hover:text-danger transition-colors"
                      title="Release booking slot (only available before move-in)"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </dd>
              </div>
            )}
          </dl>
          {isActive && leaseProgress !== null && (
            <div className="px-5 pb-4">
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", (daysLeft ?? 0) <= 14 ? "bg-danger" : (daysLeft ?? 0) <= 30 ? "bg-warning" : "bg-success")}
                  style={{ width: `${leaseProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Compliance strip */}
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Compliance</h3>
            <button type="button" onClick={() => setTab("guests")} className="text-xs text-fg-muted hover:text-fg transition-colors">
              TM-30 →
            </button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            {complianceItems.map((c) => (
              <div key={c.label} className="px-3 py-3.5 text-center">
                <p className={cn("text-[11px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1", c.ok ? "text-success" : "text-warning")}>
                  {c.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                  {c.label}
                </p>
                <p className={cn("text-sm mt-1 font-medium", c.ok ? "text-fg" : "text-warning")}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  // PAYMENTS PANE — full monthly schedule + invoices + cancellation/termination flows
  const paymentsPane = (
    <div className="space-y-5">
      {/* Lease completed + deposit settlement */}
      {booking.status === BookingStatus.Completed && (
        <DepositSettlementCard
          bookingId={id!}
          role="host"
          depositAmount={booking.depositAmount}
          checkOutDate={booking.checkOutDate}
        />
      )}

      {/* Monthly rent schedule */}
      <div>
        <h3 className="text-sm font-semibold text-fg mb-3">Monthly rent schedule</h3>
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (rentPayments.length > 0) {
            const paidCount = paidRentCount;
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

          // Legacy single full-Rent invoice — keep enforcement actions here too
          const legacyRentInvoice = (invoices ?? []).find(
            (inv) => inv.type === "Rent" && (inv.monthIndex == null),
          );
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
                        title={!canReminder ? "Available from day 3 of overdue" : reminderOnCooldown ? "Cooldown: once per 3 days" : "Send a friendly reminder via email + in-app"}
                        onClick={async () => {
                          try { await sendPaymentNotice.mutateAsync("reminder"); setLastReminderAt(Date.now()); toast.success("Reminder sent to tenant"); }
                          catch { toast.error("Failed to send reminder"); }
                        }}
                      >
                        Send reminder
                        {!canReminder && <span className="ml-1 opacity-60">· from day 3</span>}
                        {canReminder && reminderOnCooldown && <span className="ml-1 opacity-60">· cooldown</span>}
                      </Button>
                      <Button
                        variant="outline"
                        className={cn("h-8 text-xs rounded-lg border-warning/40 text-warning", !canFormal && "opacity-60")}
                        disabled={!canFormal || formalOnCooldown || sendPaymentNotice.isPending}
                        title={!canFormal ? "Available from day 7 of overdue" : formalOnCooldown ? "Cooldown: once per 7 days" : "Issue a formal Notice of Outstanding Payment — recorded in timeline as evidence"}
                        onClick={async () => {
                          try { await sendPaymentNotice.mutateAsync("formal"); setLastFormalAt(Date.now()); toast.success("Formal notice issued"); }
                          catch { toast.error("Failed to send notice"); }
                        }}
                      >
                        Issue formal notice
                        {!canFormal && <span className="ml-1 opacity-60">· from day 7</span>}
                      </Button>
                      <Button
                        variant="outline"
                        className={cn("h-8 text-xs rounded-lg border-danger/40 text-danger", !canTerminate && "opacity-60")}
                        disabled={!canTerminate}
                        title={!canTerminate ? "Available from day 14 of overdue" : "Initiate termination for non-payment (gives tenant 7 days to cure)"}
                        onClick={() => { setTerminationReason("NonPayment"); setTerminationNote(""); setTerminateOpen(true); }}
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
      </div>

      {/* Deposit + other invoices */}
      <div className="bg-bg-card rounded-xl shadow-card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg">Security deposit</p>
          <p className="text-xs text-fg-muted mt-0.5">Held in escrow · released after move-out {formatDate(booking.checkOutDate)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-fg">{formatThb(booking.depositAmount)}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-bg-subtle text-fg-muted">Held</span>
        </div>
      </div>

      {(invoices ?? []).filter((inv) => inv.type !== "Rent" && inv.type !== "Deposit").length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-fg">Other invoices</h3>
          {(invoices ?? []).filter((inv) => inv.type !== "Rent" && inv.type !== "Deposit").map((inv) => (
            <div key={inv.id} className="bg-bg-card rounded-xl shadow-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{inv.description || INVOICE_TYPE_LABELS[inv.type] || inv.type}</p>
                {inv.dueDate && <p className="text-xs text-fg-muted">Due {formatDate(inv.dueDate)}</p>}
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

      {/* Tenant-initiated early-exit request */}
      {cancellation && cancellation.status === "Requested" && (cancellation.initiator ?? "Tenant") === "Tenant" && (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-fg">Early exit request</h3>
            <CountdownPill deadline={cancellationDeadline(cancellation)} prefix="Respond in" expiredLabel="Deadline passed" />
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            If you don't respond by the deadline, this request will be automatically declined and the tenant may submit a new one.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-fg-muted">Earliest exit</p><p className="font-medium text-fg">{formatDate(cancellation.earliestExitDate)}</p></div>
            <div><p className="text-xs text-fg-muted">Penalty</p><p className="font-medium text-fg">{formatThb(cancellation.penaltyAmount)}</p></div>
            <div><p className="text-xs text-fg-muted">Deposit refund</p><p className="font-medium text-fg">{formatThb(cancellation.depositRefundAmount)}</p></div>
            <div><p className="text-xs text-fg-muted">Net refund to tenant</p><p className="font-semibold text-fg">{formatThb(cancellation.netRefund)}</p></div>
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
                try { await confirmCancellation.mutateAsync(cancellation.id); toast.success("Early exit confirmed — booking cancelled"); }
                catch { toast.error("Failed to confirm"); }
              }}
            >
              {confirmCancellation.isPending ? "Confirming…" : "Confirm early exit"}
            </Button>
          </div>
        </div>
      )}

      {/* Cancellation aftermath */}
      {cancellation && (cancellation.status === "Declined" || cancellation.status === "Expired" || cancellation.status === "Withdrawn") && (
        <div className="bg-bg-subtle border border-border rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-fg">Early exit request — {cancellation.status.toLowerCase()}</h3>
          </div>
          {cancellation.status === "Declined" && cancellation.declineReason && (
            <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Reason:</span> {cancellation.declineReason}</p>
          )}
          {cancellation.status === "Expired" && (
            <p className="text-xs text-fg-muted">The 72-hour response window passed without action.</p>
          )}
          {cancellation.status === "Withdrawn" && (
            <p className="text-xs text-fg-muted">The tenant withdrew their request.</p>
          )}
        </div>
      )}

      <div className="bg-bg-subtle border border-border rounded-xl p-3 text-[11px] text-fg-muted leading-relaxed">
        All payments flow through Siamo escrow. Funds release to your payout account on each due date.
      </div>
    </div>
  );

  // GUESTS PANE — TM-30 compliance hero + guest cards + (when needed) landlord signing form.
  // Was previously split into Guests + TM-30 tabs; merged into one so the
  // landlord sees passport details and filing status side by side.
  const tm30MissingLegalAddress = !asset?.legalAddress;
  const tm30NeedsAction = tm30Summary.hasGuests && tm30Summary.resolved && !tm30Summary.allFiled;
  const guestsPane = (
    <div className="space-y-5">

      {/* TM-30 compliance hero */}
      {tm30Summary.hasGuests && !tm30Summary.resolved ? (
        <div className="bg-bg-subtle border border-border rounded-2xl px-5 py-4 flex items-center gap-3">
          <Loader2 size={16} className="text-fg-muted animate-spin shrink-0" />
          <p className="text-sm text-fg-muted">Checking TM-30 status…</p>
        </div>
      ) : tm30Summary.hasGuests && tm30Summary.allFiled ? (
        <div className="bg-success/8 border border-success/20 rounded-2xl px-5 py-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg">You're fully compliant — TM-30 filed for all guests</p>
            <p className="text-xs text-fg-muted mt-0.5">{tm30Summary.total} of {tm30Summary.total} filings on record. No action needed until a new guest arrives.</p>
          </div>
        </div>
      ) : tm30NeedsAction ? (
        <div className="relative bg-danger/8 border-2 border-danger/40 rounded-2xl px-5 py-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-danger/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0" aria-hidden>🚨</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-extrabold text-danger leading-tight">
                  {daysSinceCheckIn >= 1
                    ? `TM-30 ${daysSinceCheckIn} day${daysSinceCheckIn > 1 ? "s" : ""} overdue`
                    : daysSinceCheckIn === 0
                      ? "24-hour TM-30 window is OPEN"
                      : "TM-30 filing required"}
                </p>
                <p className="text-sm text-fg-muted mt-1 leading-relaxed">
                  <b className="text-fg">{unfiledCount}</b> of <b className="text-fg">{tm30Summary.total}</b> foreign guest{tm30Summary.total !== 1 ? "s" : ""} unreported.
                  Thai immigration fine exposure: <b className="text-danger">up to ฿{maxFine.toLocaleString()}</b>.
                </p>
                <div className="mt-3 h-2 bg-bg-subtle rounded-full overflow-hidden">
                  <div className="h-full bg-danger rounded-full" style={{ width: `${Math.round((tm30Summary.filed / tm30Summary.total) * 100)}%` }} />
                </div>
                <p className="text-[11px] text-fg-muted mt-1.5">
                  {tm30Summary.filed} of {tm30Summary.total} filed · upload the receipt PDF on each guest below
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={tm30MissingLegalAddress || tm30Downloading || !(guests ?? []).some((g) => !!g.passportNumber)}
                onClick={handleDownloadTm30Template}
                className="bg-danger hover:bg-danger/90 text-white rounded-xl gap-2"
              >
                <Download size={14} />
                {tm30Downloading ? "Downloading…" : "Download TM-30 template"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTm30DrawerOpen(true)}
                className="rounded-xl gap-2"
              >
                <FileCheck size={14} />How to file
              </Button>
              <a
                href="https://tm30.immigration.go.th"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors px-3 py-2"
              >
                <Globe size={14} />Open immigration portal <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {/* Missing legal address warning (blocks template download) */}
      {tm30MissingLegalAddress && tm30Summary.hasGuests && tm30Summary.resolved && !tm30Summary.allFiled && (
        <div className="rounded-2xl bg-danger/8 border border-danger/20 px-4 py-3 flex items-start gap-2.5">
          <AlertCircle size={15} className="text-danger shrink-0 mt-px" />
          <p className="text-xs text-danger leading-relaxed">
            Legal address is missing for this property — it is required for the TM-30 template.{" "}
            <Link to={`/me/host/properties/${booking.assetId}`} className="font-semibold underline underline-offset-2">
              Add it in property settings →
            </Link>
          </p>
        </div>
      )}

      {/* Landlord signing form — appears here when contract is awaiting your signature */}
      {contractData?.status === "PendingLandlordSignature" && (
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
              <a href={contractData.draftPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                <FileText size={14} />View draft agreement (PDF)
              </a>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Full name</label>
              <Input placeholder="Your full legal name" value={landlordTypedName} onChange={(e) => setLandlordTypedName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Signing as</label>
              <Select value={landlordSigningCapacity} onValueChange={setLandlordSigningCapacity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Authorised Representative">Authorised Representative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {landlordSigningCapacity === "Authorised Representative" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-fg">Company name</label>
                <Input placeholder="Company or organisation name" value={landlordCompanyName} onChange={(e) => setLandlordCompanyName(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">
                Draw your signature <span className="text-fg-muted font-normal">(optional)</span>
              </label>
              <SignatureCanvas onChange={setLandlordSignatureFile} />
            </div>
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3">
                <Checkbox id="landlordAgreedTerms" checked={landlordAgreedTerms} onCheckedChange={(v) => setLandlordAgreedTerms(!!v)} className="mt-0.5 shrink-0" />
                <Label htmlFor="landlordAgreedTerms" className="text-sm text-fg leading-snug cursor-pointer">
                  I have read the full{" "}
                  <a href="/legal/rental-terms" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">Rental Agreement</a>{" "}
                  and confirm that its contents are accurate and complete. <span className="text-danger">*</span>
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="landlordAgreedEta" checked={landlordAgreedEta} onCheckedChange={(v) => setLandlordAgreedEta(!!v)} className="mt-0.5 shrink-0" />
                <Label htmlFor="landlordAgreedEta" className="text-sm text-fg leading-snug cursor-pointer">
                  I understand that by typing my full name above, I am providing an{" "}
                  <a href="/legal/e-signature" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">electronic signature</a>{" "}
                  that is legally binding under Thailand's Electronic Transactions Act B.E. 2544 (2001). <span className="text-danger">*</span>
                </Label>
              </div>
              {landlordSigningCapacity === "Authorised Representative" && (
                <div className="flex items-start gap-3">
                  <Checkbox id="landlordAgreedAuth" checked={landlordAgreedAuth} onCheckedChange={(v) => setLandlordAgreedAuth(!!v)} className="mt-0.5 shrink-0" />
                  <Label htmlFor="landlordAgreedAuth" className="text-sm text-fg leading-snug cursor-pointer">
                    I confirm that I am duly authorised to sign this agreement on behalf of{" "}
                    <span className="font-semibold">{landlordCompanyName.trim() || "the company"}</span>{" "}
                    and have full legal authority to bind it to these terms. <span className="text-danger">*</span>
                  </Label>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 text-xs text-fg-muted bg-bg-subtle rounded-xl px-3 py-2.5">
              <AlertCircle size={12} className="shrink-0 mt-0.5 opacity-50" />
              <p>Your full name, IP address, and timestamp are cryptographically recorded. Fields marked <span className="text-danger">*</span> are required.</p>
            </div>
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

      {/* Guests grid */}
      {!guests?.length ? (
        <div className="bg-bg-card rounded-xl shadow-card px-5 py-8 text-center">
          <Users size={24} className="text-fg-subtle mx-auto mb-2" />
          <p className="text-sm text-fg-muted">No residents added yet.</p>
          <p className="text-xs text-fg-subtle mt-1">Once the tenant joins the portal, their co-residents will appear here.</p>
        </div>
      ) : (
        <>
          {tm30Summary.hasGuests && (
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-xs text-fg-muted">
                Each non-Thai guest needs a TM-30 receipt uploaded after you file.
              </p>
              <button
                type="button"
                onClick={() => setTm30DrawerOpen(true)}
                className="text-xs font-semibold text-fg-muted hover:text-fg transition-colors inline-flex items-center gap-1 shrink-0"
              >
                <FileCheck size={12} />How to file TM-30
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guests.map((g) => <GuestCard key={g.id} guest={g} bookingId={id!} onTm30Status={handleTm30Status} />)}
          </div>
        </>
      )}
    </div>
  );


  const ticketsPane = (
    <div>
      {!tickets?.length ? (
        <div className="bg-bg-card rounded-xl shadow-card px-5 py-10 text-center">
          <Wrench size={28} className="text-fg-subtle mx-auto mb-2" />
          <p className="text-sm font-semibold text-fg">No tickets for this booking</p>
          <p className="text-xs text-fg-muted mt-1">When your tenant submits a maintenance request or question, it'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              to={`/me/host/tickets/${t.id}`}
              className="bg-bg-card rounded-xl shadow-card p-3 flex items-center gap-3 hover:brightness-95 transition"
            >
              <span className="text-base shrink-0">{ticketKindIcon(t.kind)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                <p className="text-xs text-fg-muted">{t.displayId}</p>
              </div>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", ticketStatusClass(t.status))}>
                {TICKET_STATUS_LABELS[t.status] ?? t.status}
              </span>
            </Link>
          ))}
          {openTickets.length > 0 && (
            <p className="text-xs text-fg-muted px-1">{openTickets.length} open ticket{openTickets.length > 1 ? "s" : ""}</p>
          )}
        </div>
      )}
    </div>
  );

  const utilitiesPane = (
    <div className="space-y-3">
      {booking.assetId && <PeaBillCard assetId={booking.assetId} />}
      <div className="bg-bg-subtle border border-border rounded-xl px-4 py-3 text-[11px] text-fg-muted leading-relaxed">
        Utility setup (PEA / water / internet) is managed at the property level. Open the property page to add or edit contracts.
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
        onClick={() => navigate("/me/host/bookings")}
      >
        <ArrowLeft size={16} />Back to reservations
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-fg">
            {booking.listingTitle ?? booking.assetName ?? "Reservation"}
            {booking.tenantName && (
              <span className="text-fg-muted font-normal"> · {booking.tenantName}</span>
            )}
          </h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-fg-muted mt-1">
            <span className="font-medium text-fg">{headerSubtitle}</span>
            <span className="w-1 h-1 rounded-full bg-fg-subtle" />
            <span>{durationMonths > 0 ? `${durationMonths} month${durationMonths !== 1 ? "s" : ""}` : "—"} · {formatThb(booking.rentAmount)} total</span>
            <span className="w-1 h-1 rounded-full bg-fg-subtle" />
            <span>{(guests?.length ?? 0)} guest{(guests?.length ?? 0) !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium shrink-0 self-start", statusClass[booking.status] ?? "bg-bg-subtle text-fg-muted")}>
          {booking.status === BookingStatus.Expired
            ? booking.noShowAt ? "Expired (no-show)" : "Expired"
            : booking.status === BookingStatus.PendingPayment ? "Pending payment"
              : booking.status}
        </span>
      </div>

      {/* At-a-glance strip */}
      {glance}

      {/* Single most-urgent alert */}
      {alertBanner}

      {/* Tabs */}
      <TabsNav active={tab} onChange={setTab} counts={counts} />

      <div role="tabpanel">
        {tab === "overview" && overviewPane}
        {tab === "payments" && paymentsPane}
        {tab === "guests" && guestsPane}
        {tab === "tickets" && ticketsPane}
        {tab === "utilities" && utilitiesPane}
      </div>

      {/* ─── Dialogs ─── */}

      {/* TM-30 how-to-file drawer */}
      <Dialog open={tm30DrawerOpen} onOpenChange={setTm30DrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How to file TM-30</DialogTitle>
            <p className="text-xs text-fg-muted mt-1">Required within 24 hours of check-in · for non-Thai guests</p>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            <div className="bg-bg-subtle rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Why this matters</p>
              <p className="text-xs text-fg leading-relaxed mt-1">
                Thai immigration requires landlords to report every foreign guest. Fine: <b>฿800–2,000 per guest</b>. Applies to non-Thai nationals only.
              </p>
            </div>

            {[
              {
                title: "Download the pre-filled template",
                body: <>We pre-fill all guest passport details and your property's legal address into the Excel file. Open it in Excel or Google Sheets and verify before submitting.</>,
                cta: (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!asset?.legalAddress || tm30Downloading || !(guests ?? []).some((g) => !!g.passportNumber)}
                    onClick={handleDownloadTm30Template}
                    className="gap-2 mt-2"
                  >
                    <Download size={13} />{tm30Downloading ? "Downloading…" : "Download TM-30 Excel template"}
                  </Button>
                ),
              },
              {
                title: "Register on the immigration portal",
                body: <><b>First time only.</b> Create a landlord account at the official portal using your Thai ID or passport and your property title deed. After online sign-up, visit your local immigration office once to verify — then everything's online.</>,
                cta: (
                  <a
                    href="https://tm30.immigration.go.th"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                  >
                    Open TM-30 portal <ExternalLink size={11} />
                  </a>
                ),
              },
              {
                title: "Upload the file on the portal",
                body: <>Log in, go to <b>"Notification of Residence"</b>, and upload the Excel file. No manual entry needed — all guest details are already in the file. Review the preview and submit.</>,
              },
              {
                title: "Download the confirmation receipt",
                body: <>After submission, download the PDF receipt. This is your legal proof of compliance — share a copy with your tenant too (they may need it when extending their visa).</>,
              },
              {
                title: "Upload the receipt here",
                body: <>Use <b>Replace</b> on each guest's row in the Filings list. Their status will update to <b className="text-success">Filed</b>.</>,
              },
            ].map((step, i, all) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">{i + 1}</div>
                  {i < all.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-sm font-semibold text-fg leading-tight">{step.title}</p>
                  <div className="text-xs text-fg-muted leading-relaxed mt-1">{step.body}</div>
                  {step.cta}
                </div>
              </div>
            ))}

            <div className="bg-bg-subtle rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Alternative · in person</p>
              <p className="text-xs text-fg leading-relaxed mt-1">
                Print the Excel template and bring it to your local immigration office with passport copies. You'll receive a stamped receipt on the spot — no online account needed.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                handles deposit refunds, penalties, and notice periods properly.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTenantOpen(false)} disabled={unlinkTenant.isPending}>Cancel</Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={unlinkTenant.isPending}
              onClick={async () => {
                try { await unlinkTenant.mutateAsync(); toast.success("Tenant removed"); setUnlinkTenantOpen(false); }
                catch { toast.error("Failed to remove tenant"); }
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
              The tenant will see your reason and can submit a new request after a short cooldown.
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
                try { await declineCancellation.mutateAsync({ cancellationId: cancellation.id, reason: declineReason.trim() }); toast.success("Request declined"); setDeclineOpen(false); }
                catch { toast.error("Failed to decline"); }
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
              This sends a formal termination notice to the tenant. Depending on the reason, financial consequences differ.
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
                    <input type="radio" name="termination-reason" checked={terminationReason === r.id} onChange={() => setTerminationReason(r.id)} className="mt-1 shrink-0" />
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
                try { await initiateTermination.mutateAsync({ reason: terminationReason, note: terminationNote.trim() }); toast.success("Termination notice sent to tenant"); setTerminateOpen(false); }
                catch { toast.error("Failed to initiate termination"); }
              }}
            >
              {initiateTermination.isPending ? "Sending…" : "Send notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

