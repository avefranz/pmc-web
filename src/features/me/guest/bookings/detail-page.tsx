import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Home, Wifi, Eye, EyeOff, Copy, Check, MessageCircle, CreditCard, DoorOpen, CalendarDays, Timer, Coins, Key, Lock, Building2, ConciergeBell, MapPin, Bus, FileText, CheckCircle2, Shield, Users, Plus, Trash2, ExternalLink, Camera, Phone, XCircle, Wrench } from "lucide-react";
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
import { useBooking, useBookingInvoices, useBookingCancellation, useRequestCancellation, useWithdrawCancellation, useBookingPayment, useBookingContract, useBookingGuests, useAddGuest, useRemoveGuest, useUpdatePassport, useBookingTm30, useBookingTickets, useMarkBookingSeen } from "@/lib/hooks/use-bookings";
import { useCreateTicket } from "@/lib/hooks/use-tickets";
import { useMyTm30 } from "@/lib/hooks/use-profile";
import { TicketKind, TicketType, TicketPriority } from "@/lib/types/enums";
import { ticketStatusColor, ticketKindIcon, tenantTicketStatusLabel } from "@/lib/utils/ticket-status";
import { CountdownPill, cancellationDeadline } from "@/components/shared/countdown-pill";
import { TenantPaymentBanner, TenantOtherInvoicesBanner, computePaymentHealth } from "@/components/shared/payment-status-banner";
import { DepositSettlementCard } from "@/components/shared/deposit-settlement-card";
import { LandlordTerminationBanner } from "@/components/shared/landlord-termination-banner";
import { GuestPeaBillCard } from "@/components/shared/pea-bill-card";
import { bookingsApi } from "@/lib/api/bookings.api";
import { useListing } from "@/lib/hooks/use-listings";
import { useAsset } from "@/lib/hooks/use-assets";
import { GatewayOverlay } from "./gateway-overlay";
import { formatDate, formatThb } from "@/lib/utils/format";
import { BookingStatus, VisaType } from "@/lib/types/enums";
import type { CheckInMethod, UpsertPassportRequest, LandlordContact, ContactChannel } from "@/lib/types";
import { contractSigningDeadline } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const INVOICE_TYPE_LABELS: Record<string, string> = {
  Rent: "Total rent",
  Deposit: "Security deposit",
  Utilities: "Utilities",
  Cleaning: "Cleaning fee",
  Damage: "Damage fee",
  Other: "Other",
};

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
  // LINE doesn't need a phone number — it uses the handle
  if (channel === "Line") return contact.lineHandle ? `https://line.me/ti/p/~${contact.lineHandle}` : null;
  if (channel === "WeChat") return null;
  // All remaining channels require a phone number
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
        {/* Phone number — only shown if landlord has set one */}
        {hasPhone && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-fg-muted">Phone</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-fg font-mono">{phoneDisplay}</span>
              <CopyBtn text={`${contact.phoneCountryCode}${contact.phone}`} />
            </div>
          </div>
        )}

        {/* Channel buttons */}
        {hasChannels && (
          <div className="flex flex-wrap gap-2 pt-1">
            {contact.contactChannels.map((ch) => {
              const meta = CHANNEL_META[ch];
              const href = getContactLink(ch, contact);
              const isWeChat = ch === "WeChat";

              if (isWeChat) {
                // WeChat: no deep link, just show as info chip
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

  // Co-residents must be confirmed before signing — stored in localStorage so it survives refresh
  const guestsStorageKey = `siamo_guests_confirmed_${id}`;
  const [guestsConfirmed, setGuestsConfirmed] = useState(() => localStorage.getItem(guestsStorageKey) === "1");
  function confirmGuestsAlone() { localStorage.setItem(guestsStorageKey, "1"); setGuestsConfirmed(true); }

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
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!booking) return <p className="text-fg-muted">Booking not found.</p>;

  const isActive = booking.status === BookingStatus.Active;
  const isConfirmed = booking.status === BookingStatus.Confirmed;
  // Handle both new "PendingPayment" and legacy "Pending" from backend
  const isPendingPayment = booking.status === BookingStatus.PendingPayment || booking.status === ("Pending" as string);
  const isCompleted = booking.status === BookingStatus.Completed;
  const isCancelled = booking.status === BookingStatus.Cancelled;
  const isUpcoming = !isCompleted && !isCancelled;
  const coResidents = (guests ?? []).filter((g) => !g.isMainTenant);
  const guestsReady = guestsConfirmed || coResidents.length > 0;
  const presentAmenities = listing?.amenities?.filter((a) => a.isPresent) ?? [];
  const daysLeft = booking.daysRemaining;
  const heroUrl = listing?.media?.[0]?.url ?? booking.primaryImageUrl;

  // Lease duration & monthly rate
  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const durationMonths = (checkOut.getFullYear() - checkIn.getFullYear()) * 12 + (checkOut.getMonth() - checkIn.getMonth());
  const monthlyRate = durationMonths > 0 ? Math.round(booking.rentAmount / durationMonths) : booking.rentAmount;
  const totalDays = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
  const leaseProgress = (isActive && daysLeft != null && totalDays > 0)
    ? Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))
    : null;
  const monthsLeft = (daysLeft != null && daysLeft > 0) ? Math.ceil(daysLeft / 30) : null;

  return (
    <div className="pb-8">
      {/* Back + title */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          to="/me/guest/bookings"
          className="p-1.5 rounded-xl hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-fg line-clamp-1 flex-1">
          {listing?.title ?? booking.assetName ?? "My stay"}
        </h1>
        {listing?.slug && (
          <Link
            to={`/listings/${listing.slug}`}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs text-brand hover:underline font-medium"
          >
            <ExternalLink size={13} />
            View listing
          </Link>
        )}
      </div>

      {/* Listing changes since last visit */}
      {(isActive || isConfirmed) && listingChanges.length > 0 && (
        <div className="bg-brand/8 border border-brand/30 rounded-2xl p-4 flex items-start gap-3 mb-4">
          <Wifi size={16} className="text-brand shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">
              Your host updated: {listingChanges.join(", ")}
            </p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Check the latest below before continuing. Tap "Got it" to dismiss this banner.
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
      )}

      {/* CRITICAL: landlord-initiated termination notice */}
      {cancellation && cancellation.status === "Requested" && cancellation.initiator === "Landlord" && (() => {
        // Backend usually fills outstandingAmount; if it doesn't, sum the tenant's
        // overdue MonthlyRent records so the cure amount is never just "all of it".
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const fallback = (payment?.payments ?? [])
          .filter((p) => p.type === "MonthlyRent" && p.status !== "Paid" && p.dueDate && new Date(p.dueDate) < today)
          .reduce((sum, p) => sum + p.amount, 0);
        return (
          <LandlordTerminationBanner
            cancellation={cancellation}
            bookingId={id!}
            fallbackOutstandingAmount={fallback}
            onPay={() => {
              const target = document.getElementById("monthly-rent-section");
              target?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        );
      })()}

      {/* Hero photo — full width, links to listing */}
      {listing?.slug ? (
        <Link
          to={`/listings/${listing.slug}`}
          className="group relative block h-48 sm:h-64 bg-bg-subtle rounded-2xl overflow-hidden mb-6 cursor-pointer"
        >
          {heroUrl ? (
            <img
              src={heroUrl}
              alt="Property"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              style={{ imageOrientation: "from-image" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-fg-subtle">
              <Home size={48} />
            </div>
          )}
          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 rounded-2xl" />
          {/* CTA label — slides up on hover */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 bg-white/95 text-fg text-sm font-semibold px-4 py-2 rounded-full shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
              <ExternalLink size={14} />
              View listing
            </span>
          </div>
        </Link>
      ) : (
        <div className="h-48 sm:h-64 bg-bg-subtle rounded-2xl overflow-hidden mb-6">
          {heroUrl ? (
            <img src={heroUrl} alt="Property" className="w-full h-full object-cover" style={{ imageOrientation: "from-image" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-fg-subtle">
              <Home size={48} />
            </div>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

        {/* LEFT — action items */}
        <div className="space-y-4">

          {/* ── What's next (Confirmed = paid, waiting for check-in) ── */}
          {isConfirmed && (() => {
            const method = listing?.checkInMethod as CheckInMethod | null | undefined;

            // Per-method action guidance
            type ActionGuide = { urgent: boolean; title: string; body: string; Icon: React.ElementType };
            const ACTION_GUIDE: Partial<Record<CheckInMethod, ActionGuide>> = {
              KeyHandover: {
                urgent: true,
                title: "Contact your host to arrange check-in",
                body: "You'll receive the keys in person — reach out before your check-in date to agree on a meeting time.",
                Icon: MessageCircle,
              },
              Smartlock: {
                urgent: false,
                title: "Your door code is on its way",
                body: "Your host will send you the smart lock code before check-in. No action needed from you.",
                Icon: Lock,
              },
              Keybox: {
                urgent: false,
                title: "Your keybox code is on its way",
                body: "Your host will share the keybox code before check-in. No action needed from you.",
                Icon: Lock,
              },
              Reception: {
                urgent: false,
                title: "Head to the reception when you arrive",
                body: "Staff will check you in at the front desk — no prior coordination needed.",
                Icon: ConciergeBell,
              },
              Other: {
                urgent: false,
                title: "Check your host's instructions",
                body: "Your host has provided check-in details below.",
                Icon: Key,
              },
            };
            const guide: ActionGuide | null = method ? (ACTION_GUIDE[method] ?? null) : null;

            return (
              <>
                {/* Status hero — adapts to booking phase */}
                {isCompleted ? (
                  <div className="space-y-3">
                    <div className="bg-bg-card rounded-2xl shadow-card px-5 py-6 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-success/10 mx-auto flex items-center justify-center">
                        <Check size={22} className="text-success" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-fg">Lease completed</p>
                        <p className="text-xs text-fg-muted mt-1">
                          Your stay ended on {formatDate(booking.checkOutDate)}. Thank you!
                        </p>
                      </div>
                    </div>
                    {payment?.payments?.find((p) => p.type === "Deposit" && p.status === "Paid") && (
                      <DepositSettlementCard
                        bookingId={id!}
                        role="tenant"
                        depositAmount={booking.depositAmount}
                        checkOutDate={booking.checkOutDate}
                      />
                    )}
                  </div>
                ) : isCancelled ? (() => {
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
                })() : (
                  <div className="bg-success/8 border border-success/20 rounded-2xl px-5 py-4 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-success flex items-center justify-center shrink-0">
                      <Check size={16} className="text-white" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-success">Booking confirmed</p>
                      <p className="text-xs text-fg-muted mt-0.5">Your stay is secured. See your check-in plan below.</p>
                    </div>
                  </div>
                )}

                {/* Payment status banner — only shown when there's something to surface */}
                {(isActive || isConfirmed) && payment?.payments && (
                  <TenantPaymentBanner
                    health={computePaymentHealth(payment.payments)}
                    onPay={() => {
                      const target = document.getElementById("monthly-rent-section");
                      target?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                )}

                {/* Non-rent invoices (utilities, damage, cleaning, etc.) — separate signal */}
                {(isActive || isConfirmed) && invoices && (
                  <TenantOtherInvoicesBanner invoices={invoices} />
                )}

                {/* Check-in plan card */}
                <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
                  {/* Header */}
                  <div className="px-5 pt-4 pb-3 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-0.5">
                      Check-in · {formatDate(booking.checkInDate)}
                    </p>
                    <h3 className="text-sm font-semibold text-fg">Your check-in plan</h3>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Action callout */}
                    {guide && (
                      <div className={cn(
                        "rounded-xl px-4 py-3 flex items-start gap-3",
                        guide.urgent
                          ? "bg-warning/10 border border-warning/20"
                          : "bg-brand/8 border border-brand/15"
                      )}>
                        <guide.Icon size={15} className={cn("shrink-0 mt-0.5", guide.urgent ? "text-warning" : "text-brand")} />
                        <div>
                          <p className={cn("text-sm font-semibold", guide.urgent ? "text-warning" : "text-brand")}>
                            {guide.title}
                          </p>
                          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{guide.body}</p>
                        </div>
                      </div>
                    )}

                    {/* Host's custom instructions */}
                    {listing?.checkInInstructions && (
                      <div className="rounded-xl bg-bg-subtle px-4 py-3">
                        <p className="text-xs font-semibold text-fg-muted mb-1">From your host</p>
                        <p className="text-sm text-fg whitespace-pre-line leading-relaxed">
                          {listing.checkInInstructions}
                        </p>
                      </div>
                    )}

                    {/* CTA for key-handover — tenant needs to act */}
                    {guide?.urgent && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-xl h-9 text-sm border-warning/30 text-warning hover:bg-warning/5"
                      >
                        <Link to={`/me/guest/tickets`}>
                          <MessageCircle size={14} className="mr-1.5" />Contact your host
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Getting there */}
                {(listing?.transportInfo || listing?.nearbyPlaces || asset?.googleMapsUrl || asset?.legalAddress) && (
                  <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
                      <MapPin size={14} className="text-fg-muted" />
                      <h3 className="text-sm font-semibold text-fg">Getting there</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {asset?.legalAddress && (
                        <div className="flex items-start gap-3 px-5 py-3.5">
                          <FileText size={14} className="text-fg-muted shrink-0 mt-0.5" />
                          <p className="text-sm text-fg-muted leading-relaxed">{asset.legalAddress}</p>
                        </div>
                      )}
                      {asset?.googleMapsUrl && (
                        <div className="flex items-start gap-3 px-5 py-3.5">
                          <ExternalLink size={14} className="text-fg-muted shrink-0 mt-0.5" />
                          <a
                            href={asset.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-brand hover:underline"
                          >
                            View on Google Maps
                          </a>
                        </div>
                      )}
                      {listing?.transportInfo && (
                        <div className="flex items-start gap-3 px-5 py-3.5">
                          <Bus size={14} className="text-fg-muted shrink-0 mt-0.5" />
                          <p className="text-sm text-fg-muted whitespace-pre-line leading-relaxed">
                            {listing.transportInfo}
                          </p>
                        </div>
                      )}
                      {listing?.nearbyPlaces && (
                        <div className="flex items-start gap-3 px-5 py-3.5">
                          <Building2 size={14} className="text-fg-muted shrink-0 mt-0.5" />
                          <p className="text-sm text-fg-muted whitespace-pre-line leading-relaxed">
                            {listing.nearbyPlaces}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Co-residents — required step before signing ── */}
          {isPendingPayment && contract?.status === "PendingTenantSignature" && (
            <div className={cn(
              "bg-bg-card rounded-2xl shadow-card overflow-hidden",
              !guestsReady && "ring-2 ring-warning/40",
            )}>
              <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={15} className={guestsReady ? "text-success" : "text-warning"} />
                  <h3 className="text-sm font-semibold text-fg">Who will be living here?</h3>
                </div>
                {guestsReady && (
                  <span className="text-xs font-semibold text-success flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Confirmed
                  </span>
                )}
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-fg-muted leading-relaxed">
                  For TM-30 immigration registration, all residents must be listed before you sign the agreement. Add co-residents below, or confirm you'll be living alone.
                </p>
                {/* Guest list */}
                {(guests ?? []).map((g) => (
                  <div key={g.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-bg-subtle flex items-center justify-center text-[10px] font-bold text-fg-muted">
                        {(g.firstName?.[0] ?? "?").toUpperCase()}
                      </div>
                      <p className="text-sm text-fg">
                        {[g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest"}
                      </p>
                      {g.isMainTenant && (
                        <span className="text-[10px] font-semibold text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded-md">You</span>
                      )}
                    </div>
                    {!g.isMainTenant && (
                      <button
                        onClick={async () => {
                          try { await removeGuest.mutateAsync(g.id); toast.success("Removed"); }
                          catch { toast.error("Failed to remove"); }
                        }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-fg-muted hover:text-danger hover:bg-danger/5 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl h-9 text-xs"
                    onClick={() => { setNewResident({}); setResidentPhotos([]); setAddGuestOpen(true); }}
                  >
                    <Plus size={12} className="mr-1.5" />Add co-resident
                  </Button>
                  {!guestsConfirmed && coResidents.length === 0 && (
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl h-9 text-xs bg-fg text-bg hover:bg-fg/90"
                      onClick={confirmGuestsAlone}
                    >
                      I'll be living alone
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Contract status banner ── */}
          {(isPendingPayment || isConfirmed) && contract && (
            <>
              {contract.status === "PendingTenantSignature" && (() => {
                const deadline = contractSigningDeadline(contract);
                const msLeft = new Date(deadline).getTime() - Date.now();
                const hoursLeft = msLeft / 3600_000;
                // Visual escalation: <12h → danger, <36h → warning, else neutral
                const isUrgent = hoursLeft < 12;
                const isElevated = hoursLeft < 36;
                const palette = isUrgent
                  ? "bg-danger/10 border-danger/30"
                  : isElevated
                    ? "bg-warning/15 border-warning/30"
                    : "bg-warning/10 border-warning/20";
                const accent = isUrgent ? "text-danger" : "text-warning";
                return (
                  <div className={cn("rounded-2xl border p-4 space-y-3", palette)}>
                    <div className="flex items-start gap-3">
                      <FileText size={18} className={cn("shrink-0 mt-0.5", accent)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className={cn("text-sm font-semibold", accent)}>
                            {isUrgent ? "Sign now — booking expires soon" : "Sign your rental agreement"}
                          </p>
                          <CountdownPill deadline={deadline} prefix="Expires in" expiredLabel="Expired — booking cancelled" />
                        </div>
                        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                          {guestsReady
                            ? "Both signatures are required before your booking is confirmed."
                            : "Confirm who will be living at the property above, then sign the agreement."}
                          {" "}
                          <span className="font-medium text-fg">
                            If unsigned by the deadline, this booking will be automatically cancelled and any payments refunded.
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button
                      disabled={!guestsReady}
                      asChild={guestsReady}
                      className={cn(
                        "w-full rounded-xl h-9 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed",
                        isUrgent
                          ? "bg-danger hover:bg-danger/90 text-white"
                          : "bg-warning hover:bg-warning/90 text-white",
                      )}
                    >
                      {guestsReady ? (
                        <Link to={`/me/guest/bookings/${id}/contract`}>
                          Read &amp; sign agreement
                        </Link>
                      ) : (
                        <span>Read &amp; sign agreement</span>
                      )}
                    </Button>
                  </div>
                );
              })()}

              {contract.status === "PendingLandlordSignature" && (
                <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-success">You've signed ✓</p>
                    <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                      Waiting for your landlord's signature. Payment is now unlocked.
                    </p>
                  </div>
                </div>
              )}

              {contract.status === "FullySigned" && (
                <div className="bg-bg-subtle border border-border rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-fg">Agreement fully signed ✓</p>
                    {contract.finalPdfUrl && (
                      <a
                        href={contract.finalPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline mt-1"
                      >
                        <FileText size={12} />Download signed agreement
                      </a>
                    )}
                  </div>
                </div>
              )}

              {contract.status === "Voided" && (
                <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg">Agreement was voided</p>
                      <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                        The signing window closed before both parties signed.
                        This booking is cancelled and any payments will be refunded automatically.
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-xl h-9 text-sm font-medium"
                  >
                    <Link to="/listings">Browse other properties</Link>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* ── TM-30 urgency banner ── */}
          {isActive && (() => {
            const rec = (myTm30 ?? []).find((r) => r.bookingId === id);
            if (!rec || rec.status === "Filed") return null;
            // Prefer the server-computed deadline; fall back to checkIn + 24h for legacy.
            const deadlineMs = rec.filingDeadline
              ? new Date(rec.filingDeadline).getTime()
              : new Date(rec.checkInDate).getTime() + 24 * 3600_000;
            const windowOpensMs = deadlineMs - 24 * 3600_000;
            const nowMs = Date.now();
            if (nowMs < windowOpensMs) return null; // window not yet open
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
                      Your host files this — but if it's still pending, nudge them. They risk a fine of up
                      to ฿2,000 per unfiled guest.
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-8 text-xs ml-7"
                >
                  <Link to="/me/guest/tm30">View TM-30 status</Link>
                </Button>
              </div>
            );
          })()}

          {/* ── End-of-stay coordination (last 14 days of an active lease) ── */}
          {isActive && daysLeft != null && daysLeft <= 14 && daysLeft >= 0 && (() => {
            const urgent = daysLeft <= 3;
            const palette = urgent
              ? "bg-danger/8 border-danger/30"
              : daysLeft <= 7
                ? "bg-warning/10 border-warning/30"
                : "bg-warning/5 border-warning/20";
            const accent = urgent ? "text-danger" : "text-warning";
            return (
              <div className={cn("rounded-2xl border p-4 space-y-3", palette)}>
                <div className="flex items-start gap-3">
                  <DoorOpen size={18} className={cn("shrink-0 mt-0.5", accent)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold", accent)}>
                      {daysLeft === 0
                        ? "Move-out today"
                        : `Move-out in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                      Your lease ends {formatDate(booking.checkOutDate)}. Before you leave, sort the items below so the
                      deposit settlement goes smoothly — the host has a 7-day window to inspect after check-out.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 pl-1 text-sm">
                  <li className="flex items-start gap-2.5">
                    <Camera size={14} className="text-fg-muted shrink-0 mt-0.5" />
                    <span className="text-fg-muted leading-snug">
                      <span className="text-fg font-medium">Photo the property</span> on the day you leave (every room,
                      fridge, walls, appliances). Your evidence if the host claims damage later.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Key size={14} className="text-fg-muted shrink-0 mt-0.5" />
                    <span className="text-fg-muted leading-snug">
                      <span className="text-fg font-medium">Agree key/access return</span> with your host —
                      handover, keybox code reset, or front-desk drop-off.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={14} className="text-fg-muted shrink-0 mt-0.5" />
                    <span className="text-fg-muted leading-snug">
                      <span className="text-fg font-medium">Check final utilities/cleaning charges</span> are settled —
                      anything unpaid will be deducted from your deposit.
                    </span>
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 text-xs"
                    onClick={() => {
                      setIssueTitle("Interested in renewing my stay");
                      setIssueDescription("Hi! I'd like to discuss extending this lease — please let me know if it's possible and on what terms.");
                      setIssueType(TicketType.Request);
                      setIssuePriority(TicketPriority.Normal);
                      setReportIssueOpen(true);
                    }}
                  >
                    Discuss renewal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 text-xs"
                    onClick={() => {
                      setIssueTitle("Move-out coordination");
                      setIssueDescription(`I'm checking out on ${formatDate(booking.checkOutDate)}. Can we agree on time and key/access return?`);
                      setIssueType(TicketType.Request);
                      setIssuePriority(TicketPriority.Normal);
                      setReportIssueOpen(true);
                    }}
                  >
                    Coordinate move-out
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* ── Payment tracker (active / confirmed bookings) ── */}
          {(isActive || isConfirmed) && payment && (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Source of truth: MonthlyRent payment records — complete, have dueDate + id
            const rentPayments = (payment.payments ?? [])
              .filter((p) => p.type === "MonthlyRent")
              .sort((a, b) => (a.monthIndex ?? 0) - (b.monthIndex ?? 0));

            if (rentPayments.length === 0) return null;

            const paidRentCount = rentPayments.filter((p) => p.status === "Paid").length;
            const nextPayment = rentPayments.find((p) => p.status === "Pending") ?? null;

            const depositPayment = payment.payments.find(
              (p) => p.type === "Deposit" && p.status === "Paid",
            );

            const totalMonths = rentPayments.length;
            const progressPct = Math.round((paidRentCount / totalMonths) * 100);

            const nextDueDate = nextPayment?.dueDate ? (() => {
              const d = new Date(nextPayment.dueDate!);
              d.setHours(0, 0, 0, 0);
              return d;
            })() : null;
            const payWindowOpen = nextDueDate
              ? (() => { const d = new Date(nextDueDate); d.setDate(d.getDate() - 7); return d; })()
              : null;
            const daysUntilWindow = payWindowOpen
              ? Math.ceil((payWindowOpen.getTime() - today.getTime()) / 86_400_000)
              : null;
            const windowIsOpen = daysUntilWindow !== null && daysUntilWindow <= 0;
            const daysUntilDue = nextDueDate
              ? Math.ceil((nextDueDate.getTime() - today.getTime()) / 86_400_000)
              : null;

            const pmtLabel = (p: typeof rentPayments[0]) =>
              p.dueDate
                ? new Date(p.dueDate).toLocaleString("en", { month: "long", year: "numeric" })
                : `Month ${p.monthIndex}`;

            const firstPmt = rentPayments[0];
            const lastPmt = rentPayments[rentPayments.length - 1];

            return (
              <div id="monthly-rent-section" className="bg-bg-card rounded-2xl shadow-card overflow-hidden scroll-mt-24">

                {/* ── Header with segmented progress bar ── */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-fg">Monthly rent</h3>
                    <span className="text-xs font-bold text-fg-muted">
                      <span className="text-success">{paidRentCount}</span>
                      <span className="text-fg-subtle"> / {totalMonths} months</span>
                    </span>
                  </div>
                  {/* Segmented bar — one slot per month, hover shows tooltip */}
                  <div className="flex gap-0.5 h-2.5">
                    {rentPayments.map((p, i) => {
                      const isPaid = p.status === "Paid";
                      const dueDate = p.dueDate ? new Date(p.dueDate) : null;
                      dueDate?.setHours(0, 0, 0, 0);
                      const isOverdue = !isPaid && dueDate ? dueDate < today : false;
                      const isDueThisMonth = !isPaid && dueDate
                        ? dueDate.getFullYear() === today.getFullYear() && dueDate.getMonth() === today.getMonth()
                        : false;
                      const label = p.dueDate
                        ? new Date(p.dueDate).toLocaleString("en", { month: "short", year: "numeric" })
                        : `Month ${p.monthIndex}`;
                      const statusText = isPaid ? "Paid" : isOverdue ? "Overdue" : isDueThisMonth ? "Due this month" : "Upcoming";
                      const isFirst = i === 0;
                      const isLast = i === totalMonths - 1;
                      return (
                        <div
                          key={p.id}
                          className="relative flex-1 group cursor-default"
                        >
                          <div className={cn(
                            "h-full transition-all duration-150 group-hover:scale-y-150 group-hover:brightness-90",
                            isFirst ? "rounded-l-full" : "",
                            isLast ? "rounded-r-full" : "",
                            isPaid ? "bg-success" : isOverdue || isDueThisMonth ? "bg-warning" : "bg-border",
                          )} />
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                            <div className="bg-fg text-bg text-[11px] font-medium px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                              {label} · {statusText}
                            </div>
                            <div className="w-1.5 h-1.5 bg-fg rotate-45 -mt-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-fg-subtle">
                      {firstPmt?.dueDate ? new Date(firstPmt.dueDate).toLocaleString("en", { month: "short" }) : ""}
                    </span>
                    <span className="text-[10px] text-fg-subtle">
                      {lastPmt?.dueDate ? (() => {
                        const d = new Date(lastPmt.dueDate!);
                        return `${d.toLocaleString("en", { month: "short" })} '${d.getFullYear().toString().slice(2)}`;
                      })() : ""}
                    </span>
                  </div>
                </div>

                {/* ── Next payment ── */}
                {nextPayment ? (
                  <div className={cn(
                    "mx-4 mb-4 rounded-xl overflow-hidden border",
                    windowIsOpen ? "border-brand/30" : "border-border",
                  )}>
                    <div className={cn(
                      "px-4 py-2 flex items-center justify-between",
                      windowIsOpen
                        ? "bg-brand text-white"
                        : daysUntilWindow !== null && daysUntilWindow <= 5
                          ? "bg-warning/10"
                          : "bg-bg-subtle",
                    )}>
                      {windowIsOpen ? (
                        <span className="text-xs font-bold">⚡ Pay now — window is open</span>
                      ) : daysUntilWindow !== null && daysUntilWindow <= 5 ? (
                        <span className="text-xs font-semibold text-warning">
                          Payment window opens in {daysUntilWindow} day{daysUntilWindow !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-fg-muted">Next payment</span>
                      )}
                      {daysUntilDue !== null && daysUntilDue >= 0 && (
                        <span className={cn(
                          "text-[10px] font-bold",
                          windowIsOpen ? "text-white/80"
                          : daysUntilDue <= 3 ? "text-danger"
                          : daysUntilDue <= 7 ? "text-warning"
                          : "text-fg-muted",
                        )}>
                          {daysUntilDue === 0 ? "Due today" : daysUntilDue <= 30 ? `${daysUntilDue}d left` : ""}
                        </span>
                      )}
                    </div>

                    <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-fg">{pmtLabel(nextPayment)}</p>
                        {nextDueDate && (
                          <p className="text-xs text-fg-muted mt-0.5">
                            Due {formatDate(nextDueDate.toISOString().slice(0, 10))}
                          </p>
                        )}
                        {payWindowOpen && !windowIsOpen && (
                          <p className="text-[11px] text-fg-subtle mt-0.5">
                            You can pay from {formatDate(payWindowOpen.toISOString().slice(0, 10))}
                          </p>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-fg shrink-0">{formatThb(nextPayment.amount)}</p>
                    </div>

                    <div className="px-4 pb-3">
                      <Button
                        className={cn(
                          "w-full rounded-xl h-9 text-sm font-semibold",
                          windowIsOpen
                            ? "bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                            : "bg-bg-subtle hover:bg-border text-fg border border-border",
                        )}
                        onClick={() => openGateway(nextPayment.amount, nextPayment.id)}
                      >
                        <CreditCard size={14} className="mr-1.5" />
                        Pay {pmtLabel(nextPayment)} now
                      </Button>
                      {!windowIsOpen && (
                        <p className="text-[10px] text-fg-subtle text-center mt-1.5">
                          You can pay early — no extra charge
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mx-4 mb-4 rounded-xl bg-success/8 border border-success/20 px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">🎉</span>
                    <div>
                      <p className="text-sm font-bold text-success">All months paid!</p>
                      <p className="text-xs text-fg-muted mt-0.5">Lease ends {formatDate(booking.checkOutDate)}</p>
                    </div>
                  </div>
                )}

                {/* ── Paid history ── */}
                <div className="border-t border-border">
                  <div className="px-4 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle">Paid</span>
                  </div>
                  <div className="divide-y divide-border">
                    {rentPayments.filter((p) => p.status === "Paid").map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-success font-bold w-4 text-center">✓</span>
                          <p className="text-sm text-fg">{pmtLabel(p)}</p>
                        </div>
                        <span className="text-sm font-semibold text-success">{formatThb(p.amount)}</span>
                      </div>
                    ))}
                    {depositPayment && (
                      <div className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-success font-bold w-4 text-center">✓</span>
                          <div>
                            <p className="text-sm text-fg">Security deposit</p>
                            <p className="text-[11px] text-fg-subtle">Held by Siamo until move-out</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-success">{formatThb(depositPayment.amount)}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ── Passport / identity notice ── */}
          {isPendingPayment && contract?.status === "PendingTenantSignature" && (
            <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
                <Shield size={15} className="text-fg-muted" />
                <h3 className="text-sm font-semibold text-fg">Passport details required</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-fg-muted leading-relaxed">
                  Your passport details and a photo are required for TM-30 immigration reporting. They will be collected when you sign the rental agreement.
                </p>
                <p className="text-xs text-fg-muted">
                  🔒 Stored encrypted, accessible only to you and this property's landlord.
                </p>
              </div>
            </div>
          )}

          {/* Payment status card — shown while booking is PendingPayment */}
          {isPendingPayment && (
            <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Payment</h3>
                {pendingPayments.length > 0 && (
                  <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                    {formatThb(totalPending)} due
                  </span>
                )}
              </div>

              {/* Per-payment breakdown */}
              {payment && initialPayments.length > 0 ? (
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
              ) : (
                /* Payment data not loaded yet — show skeleton rows */
                <div className="divide-y divide-border">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="space-y-1.5">
                        <div className="h-3 w-32 bg-bg-subtle rounded animate-pulse" />
                        <div className="h-2.5 w-16 bg-bg-subtle rounded animate-pulse" />
                      </div>
                      <div className="h-5 w-10 bg-bg-subtle rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {/* Pay button — only if there's something to pay */}
              {pendingPayments.length > 0 && (
                <div className="px-5 py-4 border-t border-border">
                  {contract?.status === "PendingTenantSignature" ? (
                    <>
                      <Button
                        disabled
                        className="w-full bg-brand/50 text-white rounded-xl h-10 text-sm font-semibold cursor-not-allowed opacity-60"
                      >
                        <CreditCard size={14} className="mr-1.5" />Sign the agreement first
                      </Button>
                      <p className="text-[11px] text-fg-muted text-center mt-2">
                        Sign your rental agreement above to unlock payment
                      </p>
                    </>
                  ) : (
                    <>
                      <Button
                        className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-10 text-sm font-semibold"
                        onClick={() => openGateway(totalPending)}
                      >
                        <CreditCard size={14} className="mr-1.5" />Pay {formatThb(totalPending)} now
                      </Button>
                      <p className="text-[11px] text-fg-muted text-center mt-2">
                        Complete payment to activate your booking
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Guests — shown after signing (read-only list for active/confirmed bookings) */}
          {(isActive || isConfirmed) && (guests ?? []).length > 0 && (
            <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
                <Users size={15} className="text-fg-muted" />
                <h3 className="text-sm font-semibold text-fg">Co-residents</h3>
              </div>
              <div className="divide-y divide-border">
                {(guests ?? []).map((g) => (
                  <div key={g.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-fg">
                      {[g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest"}
                      {g.isMainTenant && <span className="ml-2 text-xs text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded-md">Main tenant</span>}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-bg-subtle border-t border-border">
                <p className="text-[11px] text-fg-muted">
                  All guests residing at the property must be listed for TM-30 registration.
                </p>
              </div>
            </div>
          )}

          {/* Early-exit: request button — only when there's no active cancellation; landlord-initiated takes precedence */}
          {(isConfirmed || isActive) &&
            (!cancellation || cancellation.status === "Declined" || cancellation.status === "Expired" || cancellation.status === "Withdrawn") &&
            (cancellation?.initiator ?? "Tenant") === "Tenant" && (
            <Button
              variant="outline"
              className="w-full rounded-xl h-10 text-sm border-border hover:bg-bg-subtle"
              onClick={() => setExitDialogOpen(true)}
            >
              <DoorOpen size={15} className="mr-2" />
              {cancellation ? "Submit new request" : "Request early exit"}
            </Button>
          )}

          {/* Early-exit: pending response from host (own request only) */}
          {cancellation && cancellation.status === "Requested" && (cancellation.initiator ?? "Tenant") === "Tenant" && (
            <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
              <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-border">
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
                className="w-full text-xs text-fg-muted hover:text-fg py-2 transition-colors disabled:opacity-50"
              >
                {withdrawCancellation.isPending ? "Withdrawing…" : "Withdraw request"}
              </button>
            </div>
          )}

          {/* Early-exit: declined — host rejected with reason */}
          {cancellation && cancellation.status === "Declined" && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 space-y-1.5">
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

          {/* Early-exit: expired — no host response */}
          {cancellation && cancellation.status === "Expired" && (
            <div className="bg-bg-subtle border border-border rounded-xl px-4 py-3 space-y-1">
              <p className="text-sm font-medium text-fg">Your request expired</p>
              <p className="text-xs text-fg-muted">The host didn't respond within 72 hours. You can submit a new request.</p>
            </div>
          )}
        </div>

        {/* RIGHT — info & details */}
        <div className="space-y-3 lg:sticky lg:top-8">

          {/* Status */}
          <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4">
            <StatusPill status={booking.status} />
          </div>

          {/* Lease progress (active bookings) */}
          {isActive && daysLeft != null && leaseProgress !== null && (
            <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className={cn("text-2xl font-bold", daysLeft <= 14 ? "text-danger" : daysLeft <= 30 ? "text-warning" : "text-fg")}>
                    {daysLeft} <span className="text-base font-semibold">days left</span>
                  </p>
                  {monthsLeft != null && monthsLeft > 0 && (
                    <p className="text-xs text-fg-muted mt-0.5">≈ {monthsLeft} month{monthsLeft !== 1 ? "s" : ""} remaining</p>
                  )}
                </div>
                <p className="text-sm font-medium text-fg-muted">{leaseProgress}% used</p>
              </div>
              <div className="h-2 bg-bg-subtle rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", daysLeft <= 14 ? "bg-danger" : daysLeft <= 30 ? "bg-warning" : "bg-success")} style={{ width: `${leaseProgress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-fg-muted mt-1.5">
                <span>{formatDate(booking.checkInDate)}</span>
                <span>{formatDate(booking.checkOutDate)}</span>
              </div>
            </div>
          )}

          {/* Dates + lease details */}
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <CalendarDays size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Check-in</span>
                <span className="font-medium text-fg">{formatDate(booking.checkInDate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <CalendarDays size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Check-out</span>
                <span className="font-medium text-fg">{formatDate(booking.checkOutDate)}</span>
              </div>
            </div>
            {durationMonths > 0 && (
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
                <Timer size={15} className="text-fg-muted shrink-0" />
                <div className="flex-1 flex justify-between text-sm">
                  <span className="text-fg-muted">Duration</span>
                  <span className="font-medium text-fg">{durationMonths} month{durationMonths !== 1 ? "s" : ""}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <Coins size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Monthly rent</span>
                <span className="font-bold text-fg">{formatThb(monthlyRate)}</span>
              </div>
            </div>
            {booking.depositAmount > 0 && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Timer size={15} className="text-fg-muted shrink-0 opacity-0" />
                <div className="flex-1 flex justify-between text-sm">
                  <span className="text-fg-muted">Deposit</span>
                  <span className="font-medium text-fg">{formatThb(booking.depositAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* TM-30 */}
          {(isActive || isConfirmed || isPendingPayment) && (
            <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border">
                <h3 className="text-sm font-semibold text-fg">TM-30 Registration</h3>
                <p className="text-xs text-fg-muted mt-0.5">
                  Your host registers each guest with Thai immigration within 24 hours of check-in.
                </p>
              </div>
              {guests && guests.filter(g => !!g.passportNumber).length > 0 ? (
                <div className="px-5">
                  {guests.filter(g => !!g.passportNumber).map((g) => (
                    <GuestTm30Row
                      key={g.id}
                      bookingId={id!}
                      guestId={g.id}
                      guestName={[g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest"}
                      isMain={g.isMainTenant}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-5 py-3.5">
                  <p className="text-xs text-fg-muted leading-relaxed">
                    Passport details required before TM-30 can be filed. Add them above.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Landlord contact */}
          {(isActive || isConfirmed) && booking.landlordContact && (
            booking.landlordContact.contactChannels.length > 0 || booking.landlordContact.phone
          ) && (
            <LandlordContactCard contact={booking.landlordContact} />
          )}

          {/* Open issues (tickets) */}
          {(isActive || isConfirmed) && (() => {
            const tickets = bookingTickets ?? [];
            const openTickets = tickets.filter(
              (t) => !["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(t.status),
            );
            return (
              <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wrench size={14} className="text-fg-muted" />
                    <h3 className="text-sm font-semibold text-fg">
                      Issues {openTickets.length > 0 && <span className="text-fg-muted">· {openTickets.length} open</span>}
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 text-xs"
                    onClick={() => setReportIssueOpen(true)}
                  >
                    <Plus size={12} className="mr-1" />Report
                  </Button>
                </div>
                {tickets.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-fg-muted leading-relaxed">
                    Anything broken, dirty, or unsafe? Report it here and your host gets notified.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {tickets.slice(0, 5).map((t) => (
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
                    {tickets.length > 5 && (
                      <Link
                        to="/me/guest/tickets"
                        className="block px-5 py-2.5 text-xs text-brand hover:underline text-center"
                      >
                        View all {tickets.length} issues →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* PEA electricity */}
          {(isActive || isConfirmed) && (
            <GuestPeaBillCard bookingId={id!} />
          )}

          {/* WiFi — shown when active/confirmed */}
          {(isActive || isConfirmed) && listing && (listing.wifiName || listing.wifiPassword) && (
            <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border">
                <h3 className="text-sm font-semibold text-fg">WiFi</h3>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-none">
                <Wifi size={16} className="text-fg-muted shrink-0" />
                <div className="flex-1 text-sm font-medium text-fg">{listing.wifiName ?? "Network"}</div>
                {listing.wifiName && <CopyBtn text={listing.wifiName} />}
              </div>
              {listing.wifiPassword && (
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="w-4 shrink-0" />
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

          {/* House rules */}
          {(isActive || isConfirmed) && listing?.houseRules && (
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
              <div className="flex flex-wrap gap-2 px-5 py-4">
                {presentAmenities.map((a) => (
                  <span key={a.amenityId} className="inline-flex items-center gap-1.5 bg-bg-subtle rounded-full px-3 py-1.5 text-xs font-medium text-fg">
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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

            {/* Name */}
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

            {/* Gender */}
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

            {/* Passport details */}
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

            {/* Visa & Entry */}
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

            {/* Passport photos */}
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

      {/* Report issue dialog */}
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

      {/* Payment gateway */}
      {gatewayOpen && (
        <GatewayOverlay
          amount={gatewayAmount}
          promptPayId={payment?.promptPayId}
          onSuccess={async () => {
            const isInitialPayment = !gatewayPaymentId;
            // Confirm the specific payment. If sandboxConfirm fails, surface it —
            // a silent swallow here let users believe they'd paid when the
            // invoice was still Pending, and they could be charged again on retry.
            const paymentIdToConfirm = gatewayPaymentId
              ?? (payment?.payments ?? []).find((p) => p.status !== "Paid")?.id;
            if (paymentIdToConfirm) {
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
