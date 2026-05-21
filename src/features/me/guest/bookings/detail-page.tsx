import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Wifi, Eye, EyeOff, Copy, Check, MessageCircle, CreditCard, DoorOpen,
  CalendarDays, Key, Lock, ConciergeBell, MapPin, Bus, Building2, FileText,
  CheckCircle2, Shield, Users, Plus, Trash2, ExternalLink, Camera, Phone,
  Wrench, Home, ListChecks, AlertCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PassportPageGuide } from "@/components/shared/passport-page-guide";
import { DateInput } from "@/components/ui/date-input";
import { NationalityInput } from "@/components/ui/nationality-input";
import {
  useBooking, useBookingInvoices, useBookingCancellation, useRequestCancellation,
  useWithdrawCancellation, useBookingPayment, useBookingContract, useBookingGuests,
  useAddGuest, useRemoveGuest, useUpdatePassport, useBookingTm30, useBookingTickets,
  useMarkBookingSeen, useRenewBooking,
} from "@/lib/hooks/use-bookings";
import { useCreateTicket } from "@/lib/hooks/use-tickets";
import { useMyTm30 } from "@/lib/hooks/use-profile";
import { TicketKind, TicketType, TicketPriority } from "@/lib/types/enums";
import { ticketStatusColor, ticketKindIcon, tenantTicketStatusLabel } from "@/lib/utils/ticket-status";
import { CountdownPill, cancellationDeadline } from "@/components/shared/countdown-pill";
import { TenantPaymentBanner, computePaymentHealth } from "@/components/shared/payment-status-banner";
import { DepositSettlementCard } from "@/components/shared/deposit-settlement-card";
import { LandlordTerminationBanner } from "@/components/shared/landlord-termination-banner";
import { bookingsApi } from "@/lib/api/bookings.api";
import { useListing } from "@/lib/hooks/use-listings";
import { useAsset } from "@/lib/hooks/use-assets";
import { GatewayOverlay } from "./gateway-overlay";
import { formatDate, formatThb } from "@/lib/utils/format";
import { BookingStatus, VisaType } from "@/lib/types/enums";
import type { CheckInMethod, UpsertPassportRequest, LandlordContact, ContactChannel } from "@/lib/types";
import { contractSigningDeadline } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-bg-subtle hover:bg-border text-fg-muted hover:text-fg transition-colors"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  let text = status;
  let cls = "bg-bg-subtle text-fg-muted";
  if (status === BookingStatus.Active)         { text = "Active";          cls = "bg-success/10 text-success"; }
  if (status === BookingStatus.Confirmed)      { text = "Confirmed";       cls = "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"; }
  if (status === BookingStatus.PendingPayment || status === "Pending") { text = "Payment pending"; cls = "bg-warning/10 text-warning"; }
  if (status === BookingStatus.Completed)      { text = "Completed";       cls = "bg-bg-subtle text-fg-muted"; }
  if (status === BookingStatus.Cancelled)      { text = "Cancelled";       cls = "bg-danger/10 text-danger"; }
  if (status === BookingStatus.Expired)        { text = "Expired";         cls = "bg-danger/10 text-danger"; }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full", cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {text}
    </span>
  );
}

// ─── Per-guest TM-30 status row ───────────────────────────────────────────────

function GuestTm30Row({ bookingId, guestId, guestName, isMain }: {
  bookingId: string;
  guestId: string;
  guestName: string;
  isMain: boolean;
}) {
  const { data: tm30, isLoading } = useBookingTm30(bookingId, guestId);
  const filed = tm30?.status === "Filed";

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-none">
      <div className="min-w-0">
        <p className="text-sm text-fg truncate">
          {guestName}
          {isMain && <span className="ml-2 text-[11px] text-fg-muted font-medium">(you)</span>}
        </p>
        {filed && tm30?.filedAt && (
          <p className="text-xs text-fg-muted mt-0.5">Filed {formatDate(tm30.filedAt)}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isLoading ? (
          <span className="text-xs text-fg-muted">…</span>
        ) : filed ? (
          <>
            <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">✓ Filed</span>
            {tm30?.documentUrl && (
              <a
                href={tm30.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand hover:underline"
              >
                PDF
              </a>
            )}
          </>
        ) : (
          <span className="text-xs font-semibold text-fg-muted bg-bg-subtle px-2 py-0.5 rounded-full">Pending</span>
        )}
      </div>
    </div>
  );
}

// ─── Landlord contact ─────────────────────────────────────────────────────────

const CHANNEL_META: Record<ContactChannel, { label: string; emoji: string }> = {
  Call:     { label: "Call",      emoji: "📞" },
  Sms:      { label: "SMS",       emoji: "💬" },
  WhatsApp: { label: "WhatsApp",  emoji: "🟢" },
  Telegram: { label: "Telegram",  emoji: "✈️" },
  Line:     { label: "LINE",      emoji: "🟩" },
  WeChat:   { label: "WeChat",    emoji: "🟢" },
};

function getContactLink(channel: ContactChannel, contact: LandlordContact): string | null {
  if (channel === "Line") return contact.lineHandle ? `https://line.me/ti/p/~${contact.lineHandle}` : null;
  if (channel === "WeChat") return null;
  if (!contact.phone) return null;
  const phone = `${contact.phoneCountryCode}${contact.phone}`.replace(/\+/g, "");
  const phoneWithPlus = `${contact.phoneCountryCode}${contact.phone}`;
  switch (channel) {
    case "Call":     return `tel:${phoneWithPlus}`;
    case "Sms":      return `sms:${phoneWithPlus}`;
    case "WhatsApp": return `https://wa.me/${phone}`;
    case "Telegram": return `https://t.me/${phoneWithPlus}`;
    default:         return null;
  }
}

function LandlordContactCard({ contact }: { contact: LandlordContact }) {
  const hasChannels = contact.contactChannels.length > 0;
  const hasPhone = !!contact.phone;
  const phoneDisplay = `${contact.phoneCountryCode} ${contact.phone}`;

  return (
    <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
        <Phone size={15} className="text-fg-muted" />
        <h3 className="text-sm font-semibold text-fg">Contact your host</h3>
      </div>
      <div className="px-5 py-4 space-y-3">
        {hasPhone && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-fg-muted">Phone</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-fg font-mono">{phoneDisplay}</span>
              <CopyBtn text={`${contact.phoneCountryCode}${contact.phone}`} />
            </div>
          </div>
        )}
        {hasChannels && (
          <div className="flex flex-wrap gap-2 pt-1">
            {contact.contactChannels.map((ch) => {
              const meta = CHANNEL_META[ch];
              const href = getContactLink(ch, contact);
              const isWeChat = ch === "WeChat";

              if (isWeChat) {
                return (
                  <span
                    key={ch}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-bg-subtle text-fg-muted"
                  >
                    {meta.emoji} {meta.label}
                  </span>
                );
              }

              if (!href) return null;

              return (
                <a
                  key={ch}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand/30 bg-brand/5 text-brand hover:bg-brand/10 transition-colors"
                >
                  {meta.emoji} {meta.label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const CHECK_IN_METHOD_LABEL: Record<CheckInMethod, { label: string; Icon: React.ElementType }> = {
  KeyHandover: { label: "Key handover", Icon: Key },
  Smartlock:   { label: "Smart lock",   Icon: Lock },
  Keybox:      { label: "Key box",      Icon: Lock },
  Reception:   { label: "Reception",    Icon: ConciergeBell },
  Other:       { label: "Other",        Icon: Key },
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
  Rent: "Total rent",
  Deposit: "Security deposit",
  Utilities: "Utilities",
  Cleaning: "Cleaning fee",
  Damage: "Damage fee",
  Other: "Other",
};
void INVOICE_TYPE_LABELS;

// ─── Tabs nav ─────────────────────────────────────────────────────────────────

type TabId = "stay" | "payments" | "property" | "residents" | "issues";

function TabsNav({
  active,
  onChange,
  counts,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  counts: { payments?: string; residents?: number; issues?: number };
}) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: string | number }[] = [
    { id: "stay",      label: "Stay",         icon: <Key size={13} /> },
    { id: "payments",  label: "Payments",     icon: <ListChecks size={13} />, count: counts.payments },
    { id: "property",  label: "Property",     icon: <Home size={13} /> },
    { id: "residents", label: "Co-residents", icon: <Users size={13} />,      count: counts.residents },
    { id: "issues",    label: "Issues",       icon: <Wrench size={13} />,     count: counts.issues },
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

export function GuestBookingDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: booking, isLoading } = useBooking(id!);
  const { data: invoices } = useBookingInvoices(id!);
  const { data: listing } = useListing(booking?.listingId);
  const { data: asset } = useAsset(booking?.assetId ?? "");
  const cancellationEnabled = booking?.status === BookingStatus.Active || booking?.status === BookingStatus.Confirmed;
  const { data: cancellation } = useBookingCancellation(id!, cancellationEnabled);
  const requestCancellation = useRequestCancellation(id!);
  const withdrawCancellation = useWithdrawCancellation(id!);
  const { data: payment, refetch: refetchPayment } = useBookingPayment(id!);
  const { refetch: refetchBooking } = useBooking(id!);
  const { data: contract } = useBookingContract(id!);
  const { data: guests } = useBookingGuests(id!);
  const { data: bookingTickets } = useBookingTickets(id!);
  const { data: myTm30 } = useMyTm30();
  const createTicket = useCreateTicket();
  const addGuest = useAddGuest(id!);
  const removeGuest = useRemoveGuest(id!);
  const updatePassport = useUpdatePassport(id!);

  // Initial payment = Deposit + MonthlyRent[1]. All other months are separate transactions.
  const initialPayments = (payment?.payments ?? []).filter(
    (p) => p.type === "Deposit" || p.type === "EarlyExitPenalty" || (p.type === "MonthlyRent" && (p.monthIndex === 1 || p.monthIndex == null)),
  );
  const pendingPayments = initialPayments.filter((p) => p.status === "Pending");
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  const [tab, setTab] = useState<TabId>("stay");

  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [gatewayAmount, setGatewayAmount] = useState(0);
  const [gatewayPaymentId, setGatewayPaymentId] = useState<string | null>(null);
  function openGateway(amount: number, paymentId?: string) {
    setGatewayAmount(amount);
    setGatewayPaymentId(paymentId ?? null);
    setGatewayOpen(true);
  }

  const [showWifiPwd, setShowWifiPwd] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitNote, setExitNote] = useState("");
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [newResident, setNewResident] = useState<UpsertPassportRequest>({});
  const [residentPhotos, setResidentPhotos] = useState<File[]>([]);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueType, setIssueType] = useState<TicketType>(TicketType.Maintenance);
  const [issuePriority, setIssuePriority] = useState<TicketPriority>(TicketPriority.Normal);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewMonths, setRenewMonths] = useState(1);
  const renewIdempotencyKey = useState(() => crypto.randomUUID())[0];
  const renewBooking = useRenewBooking(id!);

  // Listing-change detection — backend exposes `listingChangesAfter` (short keys
  // for the fields edited since the tenant's lastSeenListingAt). Dismissing calls
  // mark-seen, which resets the list on the server so it doesn't reappear.
  const markSeen = useMarkBookingSeen(id!);
  const CHANGE_LABEL: Record<string, string> = {
    wifi: "WiFi",
    houseRules: "House rules",
    checkInInstructions: "Check-in instructions",
  };
  const listingChanges = (booking?.listingChangesAfter ?? [])
    .map((k) => CHANGE_LABEL[k] ?? k);
  function dismissListingChanges() {
    markSeen.mutate();
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        {/* Breadcrumb */}
        <Skeleton className="h-5 w-24" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
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

  const isActive = booking.status === BookingStatus.Active;
  const isConfirmed = booking.status === BookingStatus.Confirmed;
  // Handle both new "PendingPayment" and legacy "Pending" from backend
  const isPendingPayment = booking.status === BookingStatus.PendingPayment || booking.status === ("Pending" as string);
  const isCompleted = booking.status === BookingStatus.Completed;
  const isCancelled = booking.status === BookingStatus.Cancelled;
  const isUpcoming = !isCompleted && !isCancelled;
  void isUpcoming;
  const coResidents = (guests ?? []).filter((g) => !g.isMainTenant);
  void coResidents;
  const presentAmenities = listing?.amenities?.filter((a) => a.isPresent) ?? [];
  void booking.daysRemaining;

  // Lease duration & monthly rate
  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const durationMonths = (checkOut.getFullYear() - checkIn.getFullYear()) * 12 + (checkOut.getMonth() - checkIn.getMonth());
  const monthlyRate = durationMonths > 0 ? Math.round(booking.rentAmount / durationMonths) : booking.rentAmount;

  // Days-to-checkin label
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const checkInDay = new Date(booking.checkInDate); checkInDay.setHours(0, 0, 0, 0);
  const daysToCheckIn = Math.round((checkInDay.getTime() - today.getTime()) / 86_400_000);
  const checkInRelative =
    daysToCheckIn === 0 ? "Today"
    : daysToCheckIn === 1 ? "Tomorrow"
    : daysToCheckIn > 1   ? `in ${daysToCheckIn} days`
    : daysToCheckIn === -1 ? "Yesterday"
    : `${Math.abs(daysToCheckIn)} days ago`;

  // ── Rent payments (per-month model) ──
  const rentPayments = (payment?.payments ?? [])
    .filter((p) => p.type === "MonthlyRent")
    .sort((a, b) => (a.monthIndex ?? 0) - (b.monthIndex ?? 0));
  const paidRentCount = rentPayments.filter((p) => p.status === "Paid").length;
  const nextRent = rentPayments.find((p) => p.status === "Pending") ?? null;
  const paidSoFar = rentPayments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const totalRent = rentPayments.reduce((s, p) => s + p.amount, 0);

  // Open tickets
  const openTickets = (bookingTickets ?? []).filter(
    (t) => !["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(t.status),
  );

  // Foreign-guest TM-30 summary
  const foreignGuests = (guests ?? []).filter((g) => !!g.passportNumber);

  // Payment health (used in alert resolver)
  const paymentHealth = payment?.payments ? computePaymentHealth(payment.payments) : null;

  // Tab counts
  const counts = {
    payments: rentPayments.length > 0 ? `${paidRentCount}/${rentPayments.length}` : undefined,
    residents: guests?.length ?? 0,
    issues: openTickets.length,
  };

  // ── Glance strip ──
  const glance = (
    <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y divide-x divide-border sm:divide-y-0">
        <GlanceCell
          label="Check-in"
          value={formatDate(booking.checkInDate)}
          sub={checkInRelative}
        />
        <GlanceCell
          label="Next payment"
          value={
            isPendingPayment && totalPending > 0
              ? formatThb(totalPending)
              : nextRent
                ? formatThb(nextRent.amount)
                : <span className="text-success">All paid</span>
          }
          sub={
            isPendingPayment && totalPending > 0
              ? "Before signing deadline"
              : nextRent?.dueDate
                ? `Due ${formatDate(nextRent.dueDate)}`
                : isCompleted
                  ? "Lease completed"
                  : "Nothing owed"
          }
        />
        <GlanceCell
          label="Co-residents"
          value={`${guests?.length ?? 1} ${(guests?.length ?? 1) === 1 ? "person" : "people"}`}
          sub={
            (guests?.length ?? 1) > 1
              ? `You + ${(guests?.length ?? 1) - 1} other${(guests?.length ?? 1) - 1 === 1 ? "" : "s"}`
              : "Just you"
          }
        />
        <GlanceCell
          label="Deposit"
          value={formatThb(booking.depositAmount)}
          sub="Held by Siamo · refundable"
        />
      </div>
    </div>
  );

  // ── Single most-urgent alert (priority resolver) ──
  type Alert =
    | { kind: "tenant-sign-pending"; deadline: string; hoursLeft: number }
    | { kind: "payment-overdue"; daysOverdue: number }
    | { kind: "landlord-termination" }
    | { kind: "listing-changes" }
    | { kind: "checkin-coming-up" }
    | { kind: "lease-completed" }
    | { kind: "own-cancel-pending" }
    | null;

  const alert: Alert = (() => {
    // 1. Contract signing
    if (contract?.status === "PendingTenantSignature") {
      const deadline = contractSigningDeadline(contract);
      const hoursLeft = (new Date(deadline).getTime() - Date.now()) / 3600_000;
      return { kind: "tenant-sign-pending", deadline, hoursLeft };
    }
    // 2. Payment overdue
    if ((isActive || isConfirmed) && paymentHealth && paymentHealth.daysOverdue >= 1) {
      return { kind: "payment-overdue", daysOverdue: paymentHealth.daysOverdue };
    }
    // 3. Landlord-initiated termination
    if (cancellation && cancellation.status === "Requested" && cancellation.initiator === "Landlord") {
      return { kind: "landlord-termination" };
    }
    // 4. Listing changes
    if ((isActive || isConfirmed) && listingChanges.length > 0) {
      return { kind: "listing-changes" };
    }
    // 5. Check-in coming up (within 7 days, but not past)
    if (isConfirmed && daysToCheckIn >= 0 && daysToCheckIn <= 7) {
      return { kind: "checkin-coming-up" };
    }
    // 6. Lease completed
    if (isCompleted) {
      return { kind: "lease-completed" };
    }
    // 7. Tenant's own cancellation pending
    if (cancellation && cancellation.status === "Requested" && (cancellation.initiator ?? "Tenant") === "Tenant") {
      return { kind: "own-cancel-pending" };
    }
    return null;
  })();

  const alertBanner = !alert ? null : (() => {
    if (alert.kind === "tenant-sign-pending") {
      const isUrgent = alert.hoursLeft < 12;
      const isElevated = alert.hoursLeft < 36;
      const palette = isUrgent
        ? "bg-danger/10 border-danger/30"
        : isElevated
          ? "bg-warning/15 border-warning/30"
          : "bg-warning/10 border-warning/20";
      const accent = isUrgent ? "text-danger" : "text-warning";
      return (
        <div className={cn("rounded-2xl border p-4 flex items-start gap-3", palette)}>
          <FileText size={18} className={cn("shrink-0 mt-0.5", accent)} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={cn("text-sm font-semibold", accent)}>
                {isUrgent ? "Sign now — booking expires soon" : "Sign your rental agreement"}
              </p>
              <CountdownPill deadline={alert.deadline} prefix="Expires in" expiredLabel="Expired — booking cancelled" />
            </div>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Both signatures are required before your booking is confirmed.
              If unsigned by the deadline, this booking will be automatically cancelled and any payments refunded.
            </p>
          </div>
          <Button asChild className={cn(
            "shrink-0 rounded-xl h-9 text-sm font-semibold",
            isUrgent ? "bg-danger hover:bg-danger/90 text-white" : "bg-warning hover:bg-warning/90 text-white",
          )}>
            <Link to={`/me/guest/bookings/${id}/contract`}>Sign now →</Link>
          </Button>
        </div>
      );
    }
    if (alert.kind === "payment-overdue") {
      return (
        <TenantPaymentBanner
          health={paymentHealth!}
          onPay={() => setTab("payments")}
        />
      );
    }
    if (alert.kind === "landlord-termination" && cancellation) {
      const fallback = (payment?.payments ?? [])
        .filter((p) => p.type === "MonthlyRent" && p.status !== "Paid" && p.dueDate && new Date(p.dueDate) < today)
        .reduce((sum, p) => sum + p.amount, 0);
      return (
        <LandlordTerminationBanner
          cancellation={cancellation}
          bookingId={id!}
          fallbackOutstandingAmount={fallback}
          onPay={() => setTab("payments")}
        />
      );
    }
    if (alert.kind === "listing-changes") {
      return (
        <div className="bg-brand/8 border border-brand/30 rounded-2xl p-4 flex items-start gap-3">
          <Wifi size={16} className="text-brand shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">
              Your host updated: {listingChanges.join(", ")}
            </p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Check the latest in the Stay / Property tabs.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-8 text-xs shrink-0"
            disabled={markSeen.isPending}
            onClick={dismissListingChanges}
          >
            {markSeen.isPending ? "…" : "Got it"}
          </Button>
        </div>
      );
    }
    if (alert.kind === "checkin-coming-up") {
      return (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4 flex items-start gap-3">
          <Key size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Coordinate check-in with your host</p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Your stay starts <b className="text-fg">{formatDate(booking.checkInDate)}</b> · {checkInRelative}. Message your host to agree on time and key handoff.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 rounded-xl h-9 text-sm bg-fg text-bg hover:bg-fg/90"
            onClick={() => toast.info("In-app messaging is coming soon — for now, use the contact details on the Property tab.")}
          >
            <MessageCircle size={14} className="mr-1.5" />Message host
          </Button>
        </div>
      );
    }
    if (alert.kind === "lease-completed") {
      return (
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Lease completed — deposit settlement in progress</p>
            <p className="text-xs text-fg-muted mt-1">
              Your stay ended on {formatDate(booking.checkOutDate)}. Track the deposit return on the Payments tab.
            </p>
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
    if (alert.kind === "own-cancel-pending" && cancellation) {
      return (
        <div className="bg-warning/8 border border-warning/25 rounded-2xl p-4 flex items-start gap-3">
          <Clock size={18} className="text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-fg">Awaiting host response on your early-exit request</p>
              <CountdownPill deadline={cancellationDeadline(cancellation)} prefix="Respond in" expiredLabel="Expired" />
            </div>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              You can withdraw or update your request from the Stay tab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTab("stay")}
            className="shrink-0 bg-fg text-bg font-semibold text-sm px-4 py-2 rounded-xl hover:bg-fg/90 transition-colors"
          >
            Manage →
          </button>
        </div>
      );
    }
    return null;
  })();

  // ─── STAY PANE ───────────────────────────────────────────────────────────────
  const stayPane = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Left column: emotional / context */}
      <div className="space-y-5">

        {/* Check-in countdown — only when active or about to start */}
        {(isConfirmed || (isActive && daysToCheckIn >= 0)) && (
          <div className="bg-bg-card rounded-2xl shadow-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Check-in countdown</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-fg tabular-nums">
                    {daysToCheckIn >= 0 ? daysToCheckIn : 0}
                  </span>
                  <span className="text-sm text-fg-muted">
                    days · {new Date(booking.checkInDate).toLocaleString("en", { weekday: "long", month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-fg-muted mt-2 leading-relaxed">
                  {listing?.checkInMethod === "KeyHandover"
                    ? "Your host will hand over keys in person — coordinate a meeting time first."
                    : listing?.checkInMethod === "Smartlock"
                      ? "Your host will send you the smart lock code before check-in."
                      : listing?.checkInMethod === "Keybox"
                        ? "Your host will share the keybox code before check-in."
                        : listing?.checkInMethod === "Reception"
                          ? "Staff will check you in at the front desk."
                          : "Your host will share check-in details below."}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                {contract?.status === "FullySigned" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <Check size={11} strokeWidth={3} /> Agreement signed
                  </span>
                )}
                {contract?.finalPdfUrl && (
                  <a
                    href={contract.finalPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
                  >
                    <FileText size={12} />View agreement
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending payment hero — before booking confirmed */}
        {isPendingPayment && (
          <div className="bg-warning/8 border border-warning/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <CreditCard size={18} className="text-warning shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg">Complete the steps to confirm your booking</p>
                <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                  Sign the agreement and pay the initial amount — your booking activates as soon as both are done.
                </p>
              </div>
            </div>
            {totalPending > 0 && (
              <div className="rounded-xl bg-bg-card border border-border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-fg-muted">Initial payment</p>
                  <p className="text-lg font-bold text-fg">{formatThb(totalPending)}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                  onClick={() => setTab("payments")}
                >
                  Go to payment →
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Cancelled / completed status hero */}
        {isCancelled && (() => {
          const c = cancellation;
          const voided = contract?.status === "Voided";
          let headline = "Booking cancelled";
          let detail = "This stay has been ended.";
          if (voided) {
            headline = "Booking cancelled — contract expired";
            detail = "The 72h signing window passed without both parties signing. Any payments will be refunded.";
          } else if (c?.reason === "NonPayment") {
            headline = "Booking terminated — unpaid rent";
            detail = "The cure deadline passed without payment. Your deposit was applied to the outstanding rent.";
          } else if (c?.reason === "Breach") {
            headline = "Booking terminated — breach of agreement";
            detail = "Contact Siamo support if you believe this was wrong.";
          } else if (c?.reason === "TenantEarlyExit") {
            headline = "Booking ended early";
            detail = "Your early-exit request was confirmed. The 1-month penalty applies.";
          } else if (c?.reason === "MutualAgreement") {
            headline = "Booking cancelled by mutual agreement";
            detail = "Your full deposit will be returned after the deposit-settlement window.";
          }
          return (
            <div className="bg-bg-subtle border border-border rounded-2xl px-5 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-fg-subtle/20 flex items-center justify-center shrink-0">
                  <DoorOpen size={16} className="text-fg-muted" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg">{headline}</p>
                  <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{detail}</p>
                  {c?.initiatorNote && (
                    <p className="text-xs text-fg mt-2 italic">"{c.initiatorNote}"</p>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full rounded-lg h-9 text-xs">
                <Link to="/listings">Browse other properties</Link>
              </Button>
            </div>
          );
        })()}

        {/* Landlord contact card */}
        {(isActive || isConfirmed || isPendingPayment) && booking.landlordContact && (
          booking.landlordContact.contactChannels.length > 0 || booking.landlordContact.phone
        ) && (
          <LandlordContactCard contact={booking.landlordContact} />
        )}

        {/* Getting there mini-block */}
        {(asset?.legalAddress || asset?.googleMapsUrl) && (
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
              <MapPin size={14} className="text-fg-muted" />
              <h3 className="text-sm font-semibold text-fg">Get there</h3>
            </div>
            <div className="divide-y divide-border">
              {asset?.legalAddress && (
                <div className="px-5 py-3 flex items-start gap-3">
                  <FileText size={14} className="text-fg-muted shrink-0 mt-0.5" />
                  <p className="text-sm text-fg-muted leading-relaxed">{asset.legalAddress}</p>
                </div>
              )}
              {asset?.googleMapsUrl && (
                <div className="px-5 py-3 flex items-start gap-3">
                  <ExternalLink size={14} className="text-fg-muted shrink-0 mt-0.5" />
                  <a
                    href={asset.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              )}
              {listing?.transportInfo && (
                <div className="px-5 py-3 flex items-start gap-3">
                  <Bus size={14} className="text-fg-muted shrink-0 mt-0.5" />
                  <p className="text-sm text-fg-muted whitespace-pre-line leading-relaxed">{listing.transportInfo}</p>
                </div>
              )}
              {listing?.nearbyPlaces && (
                <div className="px-5 py-3 flex items-start gap-3">
                  <Building2 size={14} className="text-fg-muted shrink-0 mt-0.5" />
                  <p className="text-sm text-fg-muted whitespace-pre-line leading-relaxed">{listing.nearbyPlaces}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Early-exit: own request status */}
        {cancellation && cancellation.status === "Requested" && (cancellation.initiator ?? "Tenant") === "Tenant" && (
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-border">
              <div className="flex items-start gap-2 min-w-0">
                <DoorOpen size={14} className="text-fg-muted shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">Early exit requested</p>
                  <p className="text-xs text-fg-muted">Earliest exit: {formatDate(cancellation.earliestExitDate)}</p>
                </div>
              </div>
              <CountdownPill deadline={cancellationDeadline(cancellation)} prefix="Host responds in" expiredLabel="Expired" />
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await withdrawCancellation.mutateAsync(cancellation.id);
                  toast.success("Request withdrawn");
                } catch {
                  toast.error("Failed to withdraw");
                }
              }}
              disabled={withdrawCancellation.isPending}
              className="w-full text-xs text-fg-muted hover:text-fg py-3 transition-colors disabled:opacity-50"
            >
              {withdrawCancellation.isPending ? "Withdrawing…" : "Withdraw request"}
            </button>
          </div>
        )}

        {cancellation && cancellation.status === "Declined" && (
          <div className="bg-danger/5 border border-danger/20 rounded-2xl px-4 py-3 space-y-1.5">
            <p className="text-sm font-medium text-fg">Your request was declined</p>
            {cancellation.declineReason ? (
              <p className="text-xs text-fg-muted leading-relaxed">
                <span className="font-medium text-fg">Host's reason:</span> {cancellation.declineReason}
              </p>
            ) : (
              <p className="text-xs text-fg-muted">The host declined without providing a reason.</p>
            )}
          </div>
        )}

        {cancellation && cancellation.status === "Expired" && (
          <div className="bg-bg-subtle border border-border rounded-2xl px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-fg">Your request expired</p>
            <p className="text-xs text-fg-muted">The host didn't respond within 72 hours. You can submit a new request below.</p>
          </div>
        )}
      </div>

      {/* Right column: facts */}
      <div className="space-y-5">

        {/* Booking summary */}
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Booking</h3>
            <button
              type="button"
              onClick={() => setTab("payments")}
              className="text-xs text-fg-muted hover:text-fg transition-colors"
            >
              Payments →
            </button>
          </div>
          <dl className="divide-y divide-border text-sm">
            <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Check-in</dt><dd className="text-fg">{formatDate(booking.checkInDate)}</dd></div>
            <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Check-out</dt><dd className="text-fg">{formatDate(booking.checkOutDate)}</dd></div>
            {durationMonths > 0 && (
              <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Duration</dt><dd className="text-fg">{durationMonths} month{durationMonths !== 1 ? "s" : ""}</dd></div>
            )}
            <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Monthly rent</dt><dd className="text-fg font-semibold">{formatThb(monthlyRate)}</dd></div>
            {booking.depositAmount > 0 && (
              <div className="px-5 py-2.5 flex justify-between gap-3"><dt className="text-fg-muted">Deposit</dt><dd className="text-fg">{formatThb(booking.depositAmount)}</dd></div>
            )}
            {totalRent > 0 && (
              <div className="px-5 py-2.5 flex justify-between gap-3">
                <dt className="text-fg-muted">Paid so far</dt>
                <dd className="text-fg">{formatThb(paidSoFar)} of {formatThb(totalRent)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* WiFi */}
        {(isActive || isConfirmed) && listing && (listing.wifiName || listing.wifiPassword) && (
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
              <Wifi size={15} className="text-fg-muted" />
              <h3 className="text-sm font-semibold text-fg">Wi-Fi</h3>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-none">
              <div className="flex-1 text-sm font-medium text-fg">{listing.wifiName ?? "Network"}</div>
              {listing.wifiName && <CopyBtn text={listing.wifiName} />}
            </div>
            {listing.wifiPassword && (
              <div className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 text-sm font-mono text-fg">
                  {showWifiPwd ? listing.wifiPassword : "•".repeat(Math.min(listing.wifiPassword.length, 14))}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowWifiPwd((v) => !v)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-bg-subtle hover:bg-border text-fg-muted hover:text-fg transition-colors"
                  >
                    {showWifiPwd ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <CopyBtn text={listing.wifiPassword} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* House rules preview */}
        {(isActive || isConfirmed) && listing?.houseRules && (() => {
          const rules = listing.houseRules.split(/\r?\n/).map((r) => r.trim()).filter(Boolean).slice(0, 5);
          if (rules.length === 0) return null;
          return (
            <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">House rules</h3>
                <button
                  type="button"
                  onClick={() => setTab("property")}
                  className="text-xs text-fg-muted hover:text-fg transition-colors"
                >
                  View all →
                </button>
              </div>
              <ul className="divide-y divide-border">
                {rules.map((r, i) => (
                  <li key={i} className="px-5 py-2.5 text-sm text-fg-muted">{r}</li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Renew / early-exit actions */}
        {(isActive || isConfirmed) && (
          <div className="space-y-3">
            {isActive && (
              <div className="bg-bg-card rounded-2xl shadow-card p-5 space-y-3">
                <h4 className="text-sm font-semibold text-fg">Loving the stay?</h4>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Extend your lease — your deposit carries over, no extra payment until activation.
                </p>
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-9 text-sm"
                  onClick={() => setRenewOpen(true)}
                >
                  <CalendarDays size={14} className="mr-1.5" />Renew lease
                </Button>
              </div>
            )}
            {(!cancellation || cancellation.status === "Declined" || cancellation.status === "Expired" || cancellation.status === "Withdrawn") &&
              (cancellation?.initiator ?? "Tenant") === "Tenant" && (
              <div className="bg-bg-card rounded-2xl shadow-card p-5 space-y-3">
                <h4 className="text-sm font-semibold text-fg">Need to leave early?</h4>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Submit an early-exit request. Your host will review — terms depend on your agreement (1-month penalty typically applies).
                </p>
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-9 text-sm"
                  onClick={() => setExitDialogOpen(true)}
                >
                  <DoorOpen size={14} className="mr-1.5" />
                  {cancellation ? "Submit new request" : "Request early exit"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ─── PAYMENTS PANE ───────────────────────────────────────────────────────────
  const paymentsPane = (
    <div className="space-y-5">

      {/* Lease completed + deposit settlement */}
      {isCompleted && payment?.payments?.find((p) => p.type === "Deposit" && p.status === "Paid") && (
        <DepositSettlementCard
          bookingId={id!}
          role="tenant"
          depositAmount={booking.depositAmount}
          checkOutDate={booking.checkOutDate}
        />
      )}

      {/* Initial payments — when booking is PendingPayment */}
      {isPendingPayment && initialPayments.length > 0 && (
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Initial payment</h3>
            {pendingPayments.length > 0 && (
              <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                {formatThb(totalPending)} due
              </span>
            )}
          </div>
          <div className="divide-y divide-border">
            {initialPayments.map((p) => {
              const isPaid = p.status === "Paid";
              const label = p.type === "Deposit" ? "Security deposit"
                : p.type === "MonthlyRent" ? "First month's rent"
                : p.type === "EarlyExitPenalty" ? "Early exit penalty"
                : "Payment";
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-fg">{label}</p>
                    <p className="text-xs text-fg-muted">{formatThb(p.amount)}</p>
                  </div>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2.5 py-0.5 rounded-full">
                      <Check size={10} strokeWidth={3} /> Paid
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-warning bg-warning/10 px-2.5 py-0.5 rounded-full">Due</span>
                  )}
                </div>
              );
            })}
          </div>

          {pendingPayments.length > 0 && (
            <div className="px-5 py-4 border-t border-border space-y-3">
              {contract?.status === "PendingTenantSignature" ? (
                <>
                  <Button
                    disabled
                    className="w-full bg-brand/50 text-white rounded-xl h-10 text-sm font-semibold cursor-not-allowed opacity-60"
                  >
                    <CreditCard size={14} className="mr-1.5" />Sign the agreement first
                  </Button>
                  <p className="text-[11px] text-fg-muted text-center">
                    Sign your rental agreement to unlock payment
                  </p>
                </>
              ) : payment && payment.isLandlordReady === false ? (
                <>
                  <Button
                    disabled
                    className="w-full bg-brand/50 text-white rounded-xl h-10 text-sm font-semibold cursor-not-allowed opacity-60"
                  >
                    <CreditCard size={14} className="mr-1.5" />Payment not yet available
                  </Button>
                  <div className="rounded-xl bg-warning/8 border border-warning/20 px-3 py-2.5 space-y-1">
                    <p className="text-xs font-semibold text-warning">Landlord payment details not ready</p>
                    {(payment.notReadyReasons ?? []).map((r, i) => (
                      <p key={i} className="text-xs text-fg-muted leading-relaxed">{r}</p>
                    ))}
                    <p className="text-[11px] text-fg-muted mt-1">Reach out to your landlord before paying.</p>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-10 text-sm font-semibold"
                    onClick={() => openGateway(totalPending)}
                  >
                    <CreditCard size={14} className="mr-1.5" />Pay {formatThb(totalPending)} now
                  </Button>
                  <p className="text-[11px] text-fg-muted text-center">
                    Complete payment to activate your booking
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next payment card (monthly rent) */}
      {(isActive || isConfirmed) && rentPayments.length > 0 && (
        <div className="bg-bg-card rounded-2xl shadow-card p-5">
          {nextRent ? (() => {
            const dueDate = nextRent.dueDate ? new Date(nextRent.dueDate) : null;
            dueDate?.setHours(0, 0, 0, 0);
            const daysToDue = dueDate ? Math.round((dueDate.getTime() - today.getTime()) / 86_400_000) : null;
            const payWindowOpen = dueDate ? (() => { const d = new Date(dueDate); d.setDate(d.getDate() - 7); return d; })() : null;
            const windowIsOpen = payWindowOpen ? today >= payWindowOpen : false;
            const dueLabel = nextRent.dueDate
              ? new Date(nextRent.dueDate).toLocaleString("en", { month: "long", year: "numeric" })
              : `Month ${nextRent.monthIndex}`;
            return (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Next payment</p>
                    <h3 className="text-sm font-semibold text-fg">{dueLabel}</h3>
                  </div>
                  {daysToDue != null && (
                    <span className={cn(
                      "text-xs font-semibold px-2 py-1 rounded-full",
                      daysToDue < 0   ? "bg-danger/10 text-danger"
                      : daysToDue === 0 ? "bg-warning/10 text-warning"
                      : daysToDue <= 7  ? "bg-warning/10 text-warning"
                      : "bg-bg-subtle text-fg-muted",
                    )}>
                      {daysToDue < 0 ? `Overdue ${Math.abs(daysToDue)}d`
                        : daysToDue === 0 ? "Due today"
                        : `Due in ${daysToDue}d`}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-fg tabular-nums">{formatThb(nextRent.amount)}</p>
                {nextRent.dueDate && <p className="text-xs text-fg-muted mt-1">Due {formatDate(nextRent.dueDate)}</p>}
                <Button
                  className={cn(
                    "w-full mt-4 rounded-xl h-10 text-sm font-semibold",
                    windowIsOpen
                      ? "bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                      : "bg-bg-subtle hover:bg-border text-fg border border-border",
                  )}
                  onClick={() => openGateway(nextRent.amount, nextRent.id)}
                >
                  <CreditCard size={14} className="mr-1.5" />Pay {formatThb(nextRent.amount)} now
                </Button>
                {!windowIsOpen && payWindowOpen && (
                  <p className="text-[11px] text-fg-muted text-center mt-2">
                    Pay window opens {formatDate(payWindowOpen.toISOString().slice(0, 10))} — early payment also fine, no extra charge.
                  </p>
                )}
              </>
            );
          })() : (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-bold text-success">All rent paid</p>
                <p className="text-xs text-fg-muted mt-0.5">Lease ends {formatDate(booking.checkOutDate)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Totals strip */}
      {rentPayments.length > 0 && (
        <div className="bg-bg-card rounded-2xl shadow-card p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-fg-muted">Paid so far</p>
              <p className="text-lg font-bold text-fg tabular-nums">
                {formatThb(paidSoFar)}{" "}
                <small className="text-sm font-medium text-fg-muted">of {formatThb(totalRent)}</small>
              </p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-xs text-fg-muted">Deposit held</p>
              <p className="text-lg font-bold text-fg tabular-nums">{formatThb(booking.depositAmount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly schedule */}
      {rentPayments.length > 0 && (
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Monthly schedule</h3>
            <span className="text-xs font-semibold text-fg-muted">
              {paidRentCount} / {rentPayments.length} months
            </span>
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
              const isNext = !isPaid && nextRent?.id === p.id;
              const label = p.dueDate
                ? new Date(p.dueDate).toLocaleString("en", { month: "long", year: "numeric" })
                : `Month ${p.monthIndex}`;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "px-5 py-3 flex items-center justify-between gap-3",
                    isDueThisMonth && "bg-warning/5",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isPaid ? "bg-success" : isOverdue || isDueThisMonth ? "bg-warning" : "bg-fg-subtle/40",
                    )} />
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium", isUpcoming ? "text-fg-muted" : "text-fg")}>
                        {label}{isNext && <span className="text-fg-muted"> · next</span>}
                      </p>
                      {p.dueDate && (
                        <p className="text-[11px] text-fg-subtle">
                          {isPaid ? "Paid" : isOverdue ? "Overdue" : isDueThisMonth ? "Due this month" : `Due ${formatDate(p.dueDate)}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={cn("text-sm font-semibold tabular-nums", isUpcoming ? "text-fg-muted" : "text-fg")}>
                      {formatThb(p.amount)}
                    </span>
                    {isPaid ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-success/10 text-success">Paid</span>
                    ) : isOverdue ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-danger/10 text-danger">Overdue</span>
                    ) : isDueThisMonth || isNext ? (
                      <Button
                        size="sm"
                        className="h-7 text-[11px] rounded-lg bg-brand hover:bg-[var(--color-primary-hover)] text-white px-2.5"
                        onClick={() => openGateway(p.amount, p.id)}
                      >
                        Pay
                      </Button>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-bg-subtle text-fg-subtle">Upcoming</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deposit row (always visible if there's a deposit) */}
      {booking.depositAmount > 0 && (
        <div className="bg-bg-card rounded-2xl shadow-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-bg-subtle flex items-center justify-center shrink-0">
            <Shield size={16} className="text-fg-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Security deposit</p>
            <p className="text-xs text-fg-muted">Held in escrow · refunded after move-out {formatDate(booking.checkOutDate)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-fg tabular-nums">{formatThb(booking.depositAmount)}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-bg-subtle text-fg-muted">Held</span>
          </div>
        </div>
      )}

      {/* Cancellation status — declined / expired / withdrawn (already shown on Stay, but also surface on Payments) */}
      {cancellation && (cancellation.status === "Declined" || cancellation.status === "Expired" || cancellation.status === "Withdrawn") && (
        <div className="bg-bg-subtle border border-border rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-fg">Early exit — {cancellation.status.toLowerCase()}</h3>
          {cancellation.status === "Declined" && cancellation.declineReason && (
            <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Reason:</span> {cancellation.declineReason}</p>
          )}
          {cancellation.status === "Expired" && (
            <p className="text-xs text-fg-muted">The 72-hour response window passed without action.</p>
          )}
        </div>
      )}

      {/* Landlord termination banner (also at top-level alert when active) */}
      {cancellation && cancellation.status === "Requested" && cancellation.initiator === "Landlord" && (() => {
        const fallback = (payment?.payments ?? [])
          .filter((p) => p.type === "MonthlyRent" && p.status !== "Paid" && p.dueDate && new Date(p.dueDate) < today)
          .reduce((sum, p) => sum + p.amount, 0);
        return (
          <LandlordTerminationBanner
            cancellation={cancellation}
            bookingId={id!}
            fallbackOutstandingAmount={fallback}
          />
        );
      })()}

      {/* Other invoices */}
      {(invoices ?? []).filter((inv) => inv.type !== "Rent" && inv.type !== "Deposit").length > 0 && (
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-fg">Other invoices</h3>
          </div>
          <div className="divide-y divide-border">
            {(invoices ?? []).filter((inv) => inv.type !== "Rent" && inv.type !== "Deposit").map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{inv.description || INVOICE_TYPE_LABELS[inv.type] || inv.type}</p>
                  {inv.dueDate && <p className="text-xs text-fg-muted">Due {formatDate(inv.dueDate)}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {inv.amount != null && <p className="text-sm font-semibold text-fg tabular-nums">{formatThb(inv.amount)}</p>}
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", {
                    "bg-success/10 text-success": inv.status === "Paid",
                    "bg-warning/10 text-warning": inv.status === "Pending",
                  })}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escrow footer */}
      <div className="bg-bg-subtle border border-border rounded-xl p-3 text-[11px] text-fg-muted leading-relaxed">
        Payments are protected by Siamo escrow. If anything goes wrong, you're covered until your host has met their obligations.
      </div>
    </div>
  );

  // ─── PROPERTY PANE ───────────────────────────────────────────────────────────
  const propertyPane = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Left column: address + rules + amenities */}
      <div className="space-y-5">

        {/* Address / get there */}
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
            <MapPin size={15} className="text-fg-muted" />
            <h3 className="text-sm font-semibold text-fg">Address</h3>
          </div>
          <div className="divide-y divide-border">
            {asset?.legalAddress ? (
              <div className="px-5 py-3.5">
                <p className="text-sm text-fg leading-relaxed">{asset.legalAddress}</p>
              </div>
            ) : (
              <div className="px-5 py-3.5">
                <p className="text-sm text-fg-muted">Exact address shared after check-in confirmed.</p>
              </div>
            )}
            {asset?.googleMapsUrl && (
              <div className="px-5 py-3 flex items-start gap-3">
                <ExternalLink size={14} className="text-fg-muted shrink-0 mt-0.5" />
                <a
                  href={asset.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:underline"
                >
                  Open in Google Maps
                </a>
              </div>
            )}
            {listing?.transportInfo && (
              <div className="px-5 py-3 flex items-start gap-3">
                <Bus size={14} className="text-fg-muted shrink-0 mt-0.5" />
                <p className="text-sm text-fg-muted whitespace-pre-line leading-relaxed">{listing.transportInfo}</p>
              </div>
            )}
            {listing?.nearbyPlaces && (
              <div className="px-5 py-3 flex items-start gap-3">
                <Building2 size={14} className="text-fg-muted shrink-0 mt-0.5" />
                <p className="text-sm text-fg-muted whitespace-pre-line leading-relaxed">{listing.nearbyPlaces}</p>
              </div>
            )}
          </div>
        </div>

        {/* House rules */}
        {listing?.houseRules && (
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-fg">House rules</h3>
            </div>
            <p className="px-5 py-4 text-sm text-fg-muted whitespace-pre-line leading-relaxed">
              {listing.houseRules}
            </p>
          </div>
        )}

        {/* Amenities */}
        {presentAmenities.length > 0 && (
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-fg">Amenities</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 px-5 py-4">
              {presentAmenities.map((a) => (
                <div key={a.amenityId} className="inline-flex items-center gap-2 text-sm text-fg">
                  <Check size={12} className="text-success shrink-0" />
                  <span className="truncate">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column: wifi / host / documents / check-in instructions */}
      <div className="space-y-5">

        {/* WiFi */}
        {listing && (listing.wifiName || listing.wifiPassword) && (
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
              <Wifi size={15} className="text-fg-muted" />
              <h3 className="text-sm font-semibold text-fg">Wi-Fi</h3>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-none">
              <div className="flex-1 text-sm font-medium text-fg">{listing.wifiName ?? "Network"}</div>
              {listing.wifiName && <CopyBtn text={listing.wifiName} />}
            </div>
            {listing.wifiPassword && (
              <div className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 text-sm font-mono text-fg">
                  {showWifiPwd ? listing.wifiPassword : "•".repeat(Math.min(listing.wifiPassword.length, 14))}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowWifiPwd((v) => !v)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-bg-subtle hover:bg-border text-fg-muted hover:text-fg transition-colors"
                  >
                    {showWifiPwd ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <CopyBtn text={listing.wifiPassword} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Host contact */}
        {booking.landlordContact && (
          booking.landlordContact.contactChannels.length > 0 || booking.landlordContact.phone
        ) && <LandlordContactCard contact={booking.landlordContact} />}

        {/* Check-in instructions */}
        {(listing?.checkInInstructions || listing?.checkInMethod) && (
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
              <Key size={15} className="text-fg-muted" />
              <h3 className="text-sm font-semibold text-fg">Check-in instructions</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {listing?.checkInMethod && (() => {
                const meta = CHECK_IN_METHOD_LABEL[listing.checkInMethod];
                if (!meta) return null;
                return (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-fg-muted bg-bg-subtle px-2.5 py-1 rounded-full">
                    <meta.Icon size={12} />{meta.label}
                  </div>
                );
              })()}
              {listing?.checkInInstructions && (
                <p className="text-sm text-fg whitespace-pre-line leading-relaxed">{listing.checkInInstructions}</p>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
            <FileText size={15} className="text-fg-muted" />
            <h3 className="text-sm font-semibold text-fg">Documents</h3>
          </div>
          <div className="divide-y divide-border">
            {contract?.finalPdfUrl ? (
              <a
                href={contract.finalPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-bg-subtle transition-colors"
              >
                <span className="inline-flex items-center gap-2 text-sm text-fg">
                  <FileText size={14} className="text-fg-muted" />Tenancy agreement
                </span>
                <span className="text-xs text-fg-muted">PDF →</span>
              </a>
            ) : (
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
                  <FileText size={14} />Tenancy agreement
                </span>
                <span className="text-xs text-fg-muted">Not yet finalised</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── CO-RESIDENTS PANE ───────────────────────────────────────────────────────
  const residentsPane = (
    <div className="space-y-5">

      {/* TM-30 summary banner */}
      {foreignGuests.length > 0 ? (
        <TmSummaryBanner bookingId={id!} guests={foreignGuests} />
      ) : (
        <div className="bg-bg-subtle border border-border rounded-2xl px-5 py-4 flex items-start gap-3">
          <Shield size={16} className="text-fg-muted shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-fg">No foreign-guest filings needed</p>
            <p className="text-xs text-fg-muted mt-0.5">TM-30 only applies to non-Thai nationals — none on this booking.</p>
          </div>
        </div>
      )}

      {/* TM-30 status per guest (also shown in summary) */}
      {foreignGuests.length > 0 && (
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">TM-30 filings</p>
          </div>
          <div className="px-5">
            {foreignGuests.map((g) => (
              <GuestTm30Row
                key={g.id}
                bookingId={id!}
                guestId={g.id}
                guestName={[g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest"}
                isMain={g.isMainTenant}
              />
            ))}
          </div>
        </div>
      )}

      {/* TM-30 urgency banner (when overdue / window open) */}
      {isActive && (() => {
        const rec = (myTm30 ?? []).find((r) => r.bookingId === id);
        if (!rec || rec.status === "Filed") return null;
        const deadlineMs = rec.filingDeadline
          ? new Date(rec.filingDeadline).getTime()
          : new Date(rec.checkInDate).getTime() + 24 * 3600_000;
        const windowOpensMs = deadlineMs - 24 * 3600_000;
        const nowMs = Date.now();
        if (nowMs < windowOpensMs) return null;
        const inWindow = nowMs < deadlineMs;
        const hoursLeft = inWindow ? Math.floor((deadlineMs - nowMs) / 3_600_000) : 0;
        const daysOverdue = inWindow ? 0 : Math.floor((nowMs - deadlineMs) / 86_400_000) + 1;
        return (
          <div
            className={cn(
              "rounded-2xl border p-4 space-y-2",
              inWindow
                ? "bg-warning/8 border-warning/30"
                : daysOverdue >= 3
                  ? "bg-danger/8 border-danger/30"
                  : "bg-danger/5 border-danger/20",
            )}
          >
            <div className="flex items-start gap-3">
              <Shield size={18} className={cn("shrink-0 mt-0.5", inWindow ? "text-warning" : "text-danger")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg">
                  {inWindow
                    ? `TM-30 filing — 24h window open (${hoursLeft}h left)`
                    : `TM-30 overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`}
                </p>
                <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                  Thai immigration requires landlords to report foreign-guest check-in within 24 hours.
                  Your host files this — but if it's still pending, nudge them.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Guest cards grid */}
      <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Residents</h3>
          {(isPendingPayment || isActive || isConfirmed) && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-8 text-xs"
              onClick={() => { setNewResident({}); setResidentPhotos([]); setAddGuestOpen(true); }}
            >
              <Plus size={12} className="mr-1" />Add resident
            </Button>
          )}
        </div>
        {!guests?.length ? (
          <div className="px-5 py-8 text-center">
            <Users size={24} className="text-fg-subtle mx-auto mb-2" />
            <p className="text-sm text-fg-muted">No residents listed yet.</p>
            <p className="text-xs text-fg-subtle mt-1">Add yourself and anyone else who'll be living here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {guests.map((g) => {
              const name = [g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest";
              const initials = `${g.firstName?.[0] ?? ""}${g.lastName?.[0] ?? ""}`.toUpperCase() || "?";
              const hasPassport = !!(g.passportNumber || g.nationality || g.visaType);
              return (
                <div key={g.id} className="bg-bg rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-bg-subtle flex items-center justify-center text-xs font-semibold text-fg shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg">
                        {name}
                        {g.isMainTenant && <span className="ml-2 text-[10px] font-normal text-fg-muted">(you)</span>}
                      </p>
                      {hasPassport && (
                        <div className="mt-1 space-y-0.5 text-xs text-fg-muted">
                          {g.nationality && <p>{g.nationality}{g.gender ? ` · ${g.gender === "M" ? "Male" : "Female"}` : ""}</p>}
                          {g.passportNumber && <p className="font-mono">Passport {g.passportNumber}</p>}
                        </div>
                      )}
                      {!hasPassport && (
                        <p className="text-[11px] text-fg-subtle mt-1 italic">Passport not submitted</p>
                      )}
                    </div>
                    {!g.isMainTenant && (
                      <button
                        onClick={async () => {
                          try { await removeGuest.mutateAsync(g.id); toast.success("Removed"); }
                          catch { toast.error("Failed to remove"); }
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-muted hover:text-danger hover:bg-danger/5 transition-colors"
                        title="Remove resident"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {/* TM-30 row inline (only when passport on file) */}
                  {g.passportNumber && (
                    <div className="pt-3 border-t border-border">
                      <GuestTm30Row
                        bookingId={id!}
                        guestId={g.id}
                        guestName=""
                        isMain={false}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* What is TM-30 explainer */}
      <div className="bg-bg-subtle border border-border rounded-2xl px-5 py-4 space-y-1">
        <p className="text-sm font-semibold text-fg">What is TM-30?</p>
        <p className="text-xs text-fg-muted leading-relaxed">
          By Thai law, your landlord must report every foreign guest staying at their property within 24h of arrival. Keep your receipt PDF in case immigration asks for it during visa extension.
        </p>
      </div>
    </div>
  );

  // ─── ISSUES PANE ─────────────────────────────────────────────────────────────
  const issuesPane = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Left column: inline form */}
      <div className="space-y-5">
        <div className="bg-bg-card rounded-2xl shadow-card p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-fg">Report an issue</h3>
            <p className="text-xs text-fg-muted leading-relaxed">
              Describe what's wrong. Your host gets notified instantly and you can track progress here.
            </p>
          </div>

          {/* Category chips */}
          <div className="space-y-1.5">
            <Label className="text-xs text-fg-muted">Category</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: TicketType.Maintenance, label: "Maintenance" },
                { id: TicketType.Cleaning,    label: "Cleaning" },
                { id: TicketType.Utilities,   label: "Utilities (Wi-Fi, water…)" },
                { id: TicketType.Complaint,   label: "Complaint" },
                { id: TicketType.Request,     label: "Request" },
                { id: TicketType.Other,       label: "Other" },
              ] as const).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setIssueType(c.id)}
                  className={cn(
                    "flex items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium transition-colors",
                    issueType === c.id
                      ? "border-brand bg-brand/5 text-brand"
                      : "border-border text-fg-muted hover:border-fg-muted",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs text-fg-muted">Title</Label>
            <Input
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="e.g. AC not cooling in bedroom"
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-fg-muted">Describe what's wrong</Label>
            <Textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="When did it start? What have you tried?"
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Urgency */}
          <div className="space-y-1.5">
            <Label className="text-xs text-fg-muted">Urgency</Label>
            <Select value={issuePriority} onValueChange={(v) => setIssuePriority(v as TicketPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TicketPriority.Low}>Low — can wait a few days</SelectItem>
                <SelectItem value={TicketPriority.Normal}>Normal — within 24-48h please</SelectItem>
                <SelectItem value={TicketPriority.High}>High — affects daily life</SelectItem>
                <SelectItem value={TicketPriority.Urgent}>Emergency — unsafe / no utilities</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
            <p className="text-[11px] text-fg-muted">
              Your host will be notified instantly.
            </p>
            <Button
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-9"
              disabled={
                createTicket.isPending ||
                issueTitle.trim().length < 3 ||
                issueDescription.trim().length < 5
              }
              onClick={async () => {
                try {
                  await createTicket.mutateAsync({
                    assetId: booking.assetId,
                    bookingId: id!,
                    title: issueTitle.trim(),
                    description: issueDescription.trim(),
                    type: issueType,
                    kind: TicketKind.Incident,
                    priority: issuePriority,
                    estimatedCost: 0,
                  });
                  toast.success("Issue reported — your host has been notified");
                  setIssueTitle("");
                  setIssueDescription("");
                  setIssueType(TicketType.Maintenance);
                  setIssuePriority(TicketPriority.Normal);
                } catch {
                  toast.error("Failed to report issue");
                }
              }}
            >
              {createTicket.isPending ? "Submitting…" : "Submit report"}
            </Button>
          </div>
        </div>
      </div>

      {/* Right column: existing reports + emergency */}
      <div className="space-y-5">

        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">
              Your reports {openTickets.length > 0 && <span className="text-fg-muted font-normal">· {openTickets.length} open</span>}
            </h3>
          </div>
          {!bookingTickets?.length ? (
            <div className="px-5 py-8 text-center">
              <Wrench size={24} className="text-fg-subtle mx-auto mb-2" />
              <p className="text-sm font-semibold text-fg">No active reports</p>
              <p className="text-xs text-fg-muted mt-1">Submitted reports show up here with your host's reply and resolution status.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {bookingTickets.map((t) => (
                <Link
                  key={t.id}
                  to={`/me/guest/tickets/${t.id}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-bg-subtle transition-colors"
                >
                  <span className="text-base shrink-0 mt-0.5">{ticketKindIcon(t.kind)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-fg-muted mt-0.5">{formatDate(t.createdAt)}</p>
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0", ticketStatusColor(t.status))}>
                    {tenantTicketStatusLabel(t.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-card rounded-2xl shadow-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-danger" />
            <h3 className="text-sm font-semibold text-fg">Emergency?</h3>
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            For life-safety issues (gas, fire, flood, break-in) — call emergency services first, then your host.
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-fg-muted">Police</span><a href="tel:191" className="font-mono font-semibold text-fg">191</a></div>
            <div className="flex justify-between"><span className="text-fg-muted">Ambulance</span><a href="tel:1669" className="font-mono font-semibold text-fg">1669</a></div>
            <div className="flex justify-between"><span className="text-fg-muted">Tourist police</span><a href="tel:1155" className="font-mono font-semibold text-fg">1155</a></div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Header meta ──
  const metaParts: React.ReactNode[] = [];
  metaParts.push(<span key="dates" className="font-medium text-fg">{formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}</span>);
  if (durationMonths > 0) metaParts.push(<span key="dur">{durationMonths} month{durationMonths !== 1 ? "s" : ""}</span>);
  metaParts.push(<span key="host">Hosted by <span className="text-fg font-medium">your host</span></span>);

  return (
    <div className="space-y-5">

      {/* Breadcrumb */}
      <Link
        to="/me/guest/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
      >
        <ArrowLeft size={16} />My stays
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-fg">
            {listing?.title ?? booking.assetName ?? "My stay"}
          </h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-fg-muted mt-1">
            {metaParts.map((node, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="w-1 h-1 rounded-full bg-fg-subtle" />}
                {node}
              </React.Fragment>
            ))}
          </div>
        </div>
        <StatusPill status={booking.status} />
      </div>

      {/* Glance strip */}
      {glance}

      {/* Single most-urgent alert */}
      {alertBanner}

      {/* Tabs */}
      <TabsNav active={tab} onChange={setTab} counts={counts} />

      <div role="tabpanel">
        {tab === "stay"      && stayPane}
        {tab === "payments"  && paymentsPane}
        {tab === "property"  && propertyPane}
        {tab === "residents" && residentsPane}
        {tab === "issues"    && issuesPane}
      </div>

      {/* ─── Dialogs ─── */}

      {/* Add co-resident dialog — full passport form */}
      <Dialog open={addGuestOpen} onOpenChange={(v) => { setAddGuestOpen(v); if (!v) { setNewResident({}); setResidentPhotos([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle>Add co-resident</DialogTitle>
            <p className="text-xs text-fg-muted mt-0.5">
              All residents must be registered for Thai immigration (TM-30). Fill in as much as possible.
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Name</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-fg-muted">First name <span className="text-danger">*</span></Label>
                  <Input autoFocus value={newResident.firstName ?? ""} onChange={(e) => setNewResident((p) => ({ ...p, firstName: e.target.value }))} placeholder="As on passport" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-fg-muted">Last name <span className="text-danger">*</span></Label>
                  <Input value={newResident.lastName ?? ""} onChange={(e) => setNewResident((p) => ({ ...p, lastName: e.target.value }))} placeholder="As on passport" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Gender</p>
              <div className="flex gap-3">
                {(["M", "F"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setNewResident((p) => ({ ...p, gender: g }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                      newResident.gender === g
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-border text-fg-muted hover:border-fg-muted",
                    )}
                  >
                    {g === "M" ? "Male" : "Female"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Passport</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">Nationality</Label>
                    <NationalityInput value={newResident.nationality ?? ""} onChange={(v) => setNewResident((p) => ({ ...p, nationality: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">Date of birth</Label>
                    <DateInput value={newResident.dateOfBirth} onChange={(v) => setNewResident((p) => ({ ...p, dateOfBirth: v }))} maxYear={new Date().getFullYear()} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">Passport number</Label>
                    <Input className="font-mono" value={newResident.passportNumber ?? ""} onChange={(e) => setNewResident((p) => ({ ...p, passportNumber: e.target.value }))} placeholder="e.g. 7123456789" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">Passport expiry</Label>
                    <DateInput value={newResident.passportExpiry} onChange={(v) => setNewResident((p) => ({ ...p, passportExpiry: v }))} minYear={2000} maxYear={2060} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Visa & Entry into Thailand</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-fg-muted">Visa type</Label>
                  <Select value={newResident.visaType ?? ""} onValueChange={(v) => setNewResident((p) => ({ ...p, visaType: v as VisaType }))}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={VisaType.VisaExempt}>Visa Exempt (30-day stamp)</SelectItem>
                      <SelectItem value={VisaType.Tourist}>Tourist Visa (TR)</SelectItem>
                      <SelectItem value={VisaType.NonImmigrantB}>Non-Immigrant B (Business/Work)</SelectItem>
                      <SelectItem value={VisaType.NonImmigrantO}>Non-Immigrant O (Retirement/Family)</SelectItem>
                      <SelectItem value={VisaType.NonImmigrantOA}>Non-Immigrant O-A (Long Stay)</SelectItem>
                      <SelectItem value={VisaType.Education}>Education / Student (ED)</SelectItem>
                      <SelectItem value={VisaType.SpecialTourist}>Special Tourist Visa (STV)</SelectItem>
                      <SelectItem value={VisaType.Other}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">Entry date</Label>
                    <DateInput value={newResident.entryDate} onChange={(v) => setNewResident((p) => ({ ...p, entryDate: v }))} minYear={2015} maxYear={new Date().getFullYear()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">Entry port</Label>
                    <Input value={newResident.entryPort ?? ""} onChange={(e) => setNewResident((p) => ({ ...p, entryPort: e.target.value }))} placeholder="Suvarnabhumi…" />
                  </div>
                </div>
                <p className="text-[11px] text-fg-muted leading-relaxed">
                  Entry date &amp; port come from the immigration stamp in your passport — the date and airport/border crossing of your most recent Thai entry.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Passport photos</p>
              <PassportPageGuide />
              <label className={cn(
                "mt-3 flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors",
                residentPhotos.length > 0 ? "border-success bg-success/5" : "border-border hover:border-brand hover:bg-brand/5"
              )}>
                <Camera size={16} className={residentPhotos.length > 0 ? "text-success" : "text-fg-muted"} />
                <div className="flex-1 min-w-0">
                  {residentPhotos.length > 0 ? (
                    <p className="text-sm font-medium text-success">{residentPhotos.length} photo{residentPhotos.length > 1 ? "s" : ""} selected</p>
                  ) : (
                    <p className="text-sm text-fg-muted">Upload passport pages (up to 3)</p>
                  )}
                  <p className="text-xs text-fg-muted mt-0.5">Select multiple files at once</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setResidentPhotos(Array.from(e.target.files ?? []))}
                />
              </label>
              {residentPhotos.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {residentPhotos.map((f, i) => (
                    <li key={i} className="text-xs text-fg-muted truncate">· {f.name}</li>
                  ))}
                </ul>
              )}
            </div>

          </div>

          <DialogFooter className="px-5 py-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={() => setAddGuestOpen(false)}>Cancel</Button>
            <Button
              disabled={!newResident.firstName?.trim() || addGuest.isPending || updatePassport.isPending}
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              onClick={async () => {
                try {
                  await addGuest.mutateAsync(newResident);
                  toast.success("Co-resident added");
                  setAddGuestOpen(false);
                  setNewResident({});
                  setResidentPhotos([]);
                } catch { toast.error("Failed to add co-resident"); }
              }}
            >
              {addGuest.isPending ? "Adding…" : "Add co-resident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early exit dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request early exit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-fg-muted">
              An early exit penalty of 1 month's rent applies. The exact calculation will be shown after submission.
            </p>
            <Textarea
              placeholder="Optional note for your host…"
              value={exitNote}
              onChange={(e) => setExitNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={requestCancellation.isPending}
              onClick={async () => {
                try {
                  await requestCancellation.mutateAsync(exitNote || undefined);
                  setExitDialogOpen(false);
                  toast.success("Early exit request submitted");
                } catch {
                  toast.error("Failed to submit request");
                }
              }}
            >
              {requestCancellation.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report issue dialog — kept for any external trigger callers */}
      <Dialog
        open={reportIssueOpen}
        onOpenChange={(v) => {
          setReportIssueOpen(v);
          if (!v) {
            setIssueTitle("");
            setIssueDescription("");
            setIssueType(TicketType.Maintenance);
            setIssuePriority(TicketPriority.Normal);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-fg-muted leading-relaxed">
              Describe what's wrong. Your host gets notified and you can track progress here.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-fg-muted">Title</Label>
              <Input
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="e.g. AC not cooling in bedroom"
                maxLength={120}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Category</Label>
                <Select value={issueType} onValueChange={(v) => setIssueType(v as TicketType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketType.Maintenance}>Maintenance / repair</SelectItem>
                    <SelectItem value={TicketType.Cleaning}>Cleaning</SelectItem>
                    <SelectItem value={TicketType.Utilities}>Utilities</SelectItem>
                    <SelectItem value={TicketType.Complaint}>Complaint</SelectItem>
                    <SelectItem value={TicketType.Request}>Request</SelectItem>
                    <SelectItem value={TicketType.Other}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Priority</Label>
                <Select value={issuePriority} onValueChange={(v) => setIssuePriority(v as TicketPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketPriority.Low}>Low</SelectItem>
                    <SelectItem value={TicketPriority.Normal}>Normal</SelectItem>
                    <SelectItem value={TicketPriority.High}>High</SelectItem>
                    <SelectItem value={TicketPriority.Urgent}>Urgent (safety / can't live without it)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-fg-muted">Details</Label>
              <Textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="When did it start? What have you tried?"
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportIssueOpen(false)}
              disabled={createTicket.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              disabled={
                createTicket.isPending ||
                issueTitle.trim().length < 3 ||
                issueDescription.trim().length < 5
              }
              onClick={async () => {
                try {
                  await createTicket.mutateAsync({
                    assetId: booking.assetId,
                    bookingId: id!,
                    title: issueTitle.trim(),
                    description: issueDescription.trim(),
                    type: issueType,
                    kind: TicketKind.Incident,
                    priority: issuePriority,
                    estimatedCost: 0,
                  });
                  toast.success("Issue reported — your host has been notified");
                  setReportIssueOpen(false);
                } catch {
                  toast.error("Failed to report issue");
                }
              }}
            >
              {createTicket.isPending ? "Submitting…" : "Report issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew lease dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Renew your lease</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-fg-muted leading-relaxed">
              How many additional months would you like to add? Your deposit will carry over — no re-payment needed.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">Additional months</Label>
              <Select
                value={String(renewMonths)}
                onValueChange={(v) => setRenewMonths(Number(v))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} month{m !== 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-fg-muted bg-bg-subtle rounded-lg px-3 py-2 leading-relaxed">
              After renewal you'll receive a new lease to sign, then pay the first month's rent to activate it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)} disabled={renewBooking.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              disabled={renewBooking.isPending}
              onClick={async () => {
                try {
                  const { bookingId: newBookingId } = await renewBooking.mutateAsync({
                    additionalMonths: renewMonths,
                    idempotencyKey: renewIdempotencyKey,
                  });
                  toast.success("Lease renewed! Sign your new agreement to continue.");
                  setRenewOpen(false);
                  window.location.href = `/me/guest/bookings/${newBookingId}`;
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  toast.error(msg ?? "Failed to renew lease");
                }
              }}
            >
              {renewBooking.isPending ? "Renewing…" : `Renew ${renewMonths} month${renewMonths !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment gateway */}
      {gatewayOpen && (
        <GatewayOverlay
          amount={gatewayAmount}
          promptPayId={payment?.promptPayId}
          onSuccess={async () => {
            const isInitialPayment = !gatewayPaymentId;
            const paymentIdToConfirm = gatewayPaymentId
              ?? (payment?.payments ?? []).find((p) => p.status !== "Paid")?.id;
            if (paymentIdToConfirm && import.meta.env.DEV) {
              await bookingsApi.sandboxConfirm(id!, paymentIdToConfirm);
            }
            await refetchPayment();
            await refetchBooking();
            toast.success(
              isInitialPayment
                ? "Payment confirmed — your booking is now active!"
                : "Payment confirmed! ✓",
            );
          }}
          onClose={() => setGatewayOpen(false)}
        />
      )}
    </div>
  );
}

// ─── TM-30 summary banner used in Co-residents tab ────────────────────────────

function TmSummaryBanner({
  bookingId,
  guests,
}: {
  bookingId: string;
  guests: { id: string; firstName?: string; lastName?: string; isMainTenant: boolean }[];
}) {
  // We need the filing status for each guest. Re-use the row hook in aggregate.
  // For a banner we don't need detail — just count.
  return (
    <div className="bg-success/8 border border-success/20 rounded-2xl px-5 py-4 flex items-start gap-3">
      <Shield size={18} className="text-success shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg">TM-30 registration in progress</p>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          Your host registers each guest with Thai immigration within 24h of check-in. Status per guest is shown below — keep your receipt PDF in case you need it for visa extension.
        </p>
        <p className="sr-only">Booking {bookingId} · {guests.length} foreign guests</p>
      </div>
    </div>
  );
}
