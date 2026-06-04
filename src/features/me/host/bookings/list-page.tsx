import { Link } from "react-router-dom";
import { Home, Calendar, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useHostBookings } from "@/lib/hooks/use-bookings";
import { useMyProfile } from "@/lib/hooks/use-profile";
import { formatDate, formatThb } from "@/lib/utils/format";
import { BookingStatus } from "@/lib/types/enums";
import type { BookingDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  [BookingStatus.Active]:         "Active",
  [BookingStatus.Confirmed]:      "Confirmed",
  [BookingStatus.PendingPayment]: "Awaiting payment",
  [BookingStatus.Completed]:      "Completed",
  [BookingStatus.Cancelled]:      "Cancelled",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  [BookingStatus.Active]:         "bg-success/10 text-success",
  [BookingStatus.Confirmed]:      "bg-fg/8 text-fg",
  [BookingStatus.PendingPayment]: "bg-warning/10 text-warning",
  [BookingStatus.Completed]:      "bg-bg-subtle text-fg-muted",
  [BookingStatus.Cancelled]:      "bg-danger/10 text-danger",
};

const STATUS_STRIPE: Record<string, string> = {
  [BookingStatus.Active]:         "border-l-[3px] border-success",
  [BookingStatus.Confirmed]:      "border-l-[3px] border-fg/20",
  [BookingStatus.PendingPayment]: "border-l-[3px] border-warning",
  [BookingStatus.Completed]:      "border-l-[3px] border-transparent",
  [BookingStatus.Cancelled]:      "border-l-[3px] border-danger/20",
};

// Priority for sorting: lower = shown first
const STATUS_PRIORITY: Record<string, number> = {
  [BookingStatus.Active]:         0,
  [BookingStatus.Confirmed]:      1,
  [BookingStatus.PendingPayment]: 2,
  [BookingStatus.Completed]:      3,
  [BookingStatus.Cancelled]:      4,
};

const ACTIVE_STATUSES = new Set([
  BookingStatus.Active,
  BookingStatus.Confirmed,
  BookingStatus.PendingPayment,
]);

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: BookingDto }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn  = new Date(booking.checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date(booking.checkOutDate);
  checkOut.setHours(0, 0, 0, 0);
  const durationMonths =
    (checkOut.getFullYear() - checkIn.getFullYear()) * 12 +
    (checkOut.getMonth() - checkIn.getMonth());
  const monthlyRate =
    durationMonths > 1
      ? Math.round(booking.rentAmount / durationMonths)
      : booking.rentAmount;

  const isActive    = booking.status === BookingStatus.Active;
  const isConfirmed = booking.status === BookingStatus.Confirmed;

  // Days until check-in (positive = future)
  const daysUntilCheckIn = Math.ceil((checkIn.getTime() - today.getTime()) / 86_400_000);

  // Days remaining in active lease
  const daysLeft = booking.daysRemaining;
  const daysSinceCheckIn = Math.floor((today.getTime() - checkIn.getTime()) / 86_400_000);

  // Sub-label for the status badge
  let statusBadgeText: string;
  let statusBadgeClass: string;
  if (isConfirmed && daysUntilCheckIn > 0) {
    if (daysUntilCheckIn <= 3) {
      statusBadgeText  = `Move-in in ${daysUntilCheckIn}d`;
      statusBadgeClass = "bg-brand/10 text-brand font-semibold";
    } else if (daysUntilCheckIn <= 14) {
      statusBadgeText  = `Move-in in ${daysUntilCheckIn}d`;
      statusBadgeClass = "bg-fg/8 text-fg";
    } else {
      statusBadgeText  = `Move-in ${formatDate(booking.checkInDate)}`;
      statusBadgeClass = "bg-fg/8 text-fg-muted";
    }
  } else {
    statusBadgeText  = STATUS_LABEL[booking.status] ?? booking.status;
    statusBadgeClass = STATUS_BADGE_CLASS[booking.status] ?? "bg-bg-subtle text-fg-muted";
  }

  // Urgency note below dates
  let urgencyText: string | null = null;
  let urgencyClass = "text-warning";
  if (isActive && daysLeft != null) {
    if (daysLeft <= 14)       { urgencyText = `⚠ ${daysLeft}d left`; urgencyClass = "text-danger"; }
    else if (daysLeft <= 60)  { const mo = Math.ceil(daysLeft / 30); urgencyText = `⚠ ${mo} month${mo !== 1 ? "s" : ""} left`; }
  } else if (isConfirmed && daysUntilCheckIn > 0 && daysUntilCheckIn <= 7) {
    urgencyText = `🔑 Check-in in ${daysUntilCheckIn}d`;
    urgencyClass = "text-brand";
  }

  return (
    <Link
      to={`/me/host/bookings/${booking.id}`}
      className={cn(
        "flex gap-0 bg-bg-card rounded-xl shadow-card hover:shadow-hover transition-all overflow-hidden",
        STATUS_STRIPE[booking.status] ?? "border-l-[3px] border-transparent",
      )}
    >
      {/* Property photo */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-bg-subtle overflow-hidden self-stretch">
        {booking.primaryImageUrl ? (
          <img src={booking.primaryImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home size={22} className="text-fg-subtle" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3 pr-4 pl-4 flex flex-col justify-between">
        <div>
          <p className="text-sm font-semibold text-fg truncate leading-snug">
            {booking.listingTitle ?? booking.assetName ?? "Property"}
          </p>
          <p className="text-xs text-fg-muted truncate mt-0.5">
            {booking.tenantName ?? <span className="italic">No tenant linked</span>}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2 mt-2">
          <div>
            <div className="flex items-center gap-1 text-xs text-fg-muted">
              <Calendar size={11} className="shrink-0" />
              <span className="truncate">{formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}</span>
            </div>
            {urgencyText && (
              <p className={cn("text-[11px] font-semibold mt-0.5", urgencyClass)}>
                {urgencyText}
              </p>
            )}
            {isActive && daysSinceCheckIn >= 0 && daysSinceCheckIn <= 30 && (
              <p className="text-[11px] font-semibold mt-0.5 text-danger">
                {daysSinceCheckIn === 0 ? "📋 File TM-30 now — 24h window" : `📋 TM-30 overdue ${daysSinceCheckIn}d`}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm font-bold text-fg">
              {formatThb(monthlyRate)}<span className="text-[11px] font-normal text-fg-muted"> /month</span>
            </span>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full", statusBadgeClass)}>
              {statusBadgeText}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Grouped list ─────────────────────────────────────────────────────────────

interface StatusGroup {
  status: BookingStatus;
  label: string;
  bookings: BookingDto[];
  accent: string;
}

// Group headers use different labels than per-card badges
const GROUP_LABEL: Record<string, string> = {
  [BookingStatus.Active]:         "Active",
  [BookingStatus.Confirmed]:      "Upcoming",
  [BookingStatus.PendingPayment]: "Awaiting payment",
  [BookingStatus.Completed]:      "Completed",
  [BookingStatus.Cancelled]:      "Cancelled",
};

const GROUP_ACCENT: Record<string, string> = {
  [BookingStatus.Active]:         "text-success",
  [BookingStatus.Confirmed]:      "text-fg-muted",
  [BookingStatus.PendingPayment]: "text-warning",
  [BookingStatus.Completed]:      "text-fg-subtle",
  [BookingStatus.Cancelled]:      "text-danger/60",
};

function sortBookings(bookings: BookingDto[]): BookingDto[] {
  return [...bookings].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    // Within same status: soonest check-in first
    return new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime();
  });
}

function groupByStatus(bookings: BookingDto[]): StatusGroup[] {
  const map = new Map<string, BookingDto[]>();
  for (const b of sortBookings(bookings)) {
    const existing = map.get(b.status) ?? [];
    existing.push(b);
    map.set(b.status, existing);
  }
  return Array.from(map.entries()).map(([status, items]) => ({
    status: status as BookingStatus,
    label: GROUP_LABEL[status] ?? STATUS_LABEL[status] ?? status,
    bookings: items,
    accent: GROUP_ACCENT[status] ?? "text-fg-muted",
  }));
}

function ActiveBookingsList({ bookings }: { bookings: BookingDto[] }) {
  if (!bookings.length) {
    return (
      <EmptyState
        icon={<Home size={36} />}
        title="Nothing here"
        description="No reservations in this category."
      />
    );
  }

  const groups = groupByStatus(bookings);
  const hasMultipleGroups = groups.length > 1;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.status}>
          {hasMultipleGroups && (
            <div className="flex items-center gap-2 mb-2">
              <p className={cn("text-[11px] font-bold uppercase tracking-widest", group.accent)}>
                {group.label}
              </p>
              <span className="text-[10px] text-fg-subtle">{group.bookings.length}</span>
            </div>
          )}
          <div className="space-y-2">
            {group.bookings.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PastBookingsList({ bookings }: { bookings: BookingDto[] }) {
  if (!bookings.length) {
    return (
      <EmptyState
        icon={<Home size={36} />}
        title="Nothing here"
        description="No past reservations yet."
      />
    );
  }

  const groups = groupByStatus(bookings);
  const hasMultipleGroups = groups.length > 1;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.status}>
          {hasMultipleGroups && (
            <div className="flex items-center gap-2 mb-2">
              <p className={cn("text-[11px] font-bold uppercase tracking-widest", group.accent)}>
                {group.label}
              </p>
              <span className="text-[10px] text-fg-subtle">{group.bookings.length}</span>
            </div>
          )}
          <div className="space-y-2">
            {group.bookings.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MissingPaymentDetailsBanner({ pendingCount }: { pendingCount: number }) {
  return (
    <Link
      to="/me/host/settings/payment"
      className="block rounded-2xl border border-warning/30 bg-warning/8 px-4 py-3 hover:brightness-95 transition"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg">
            {pendingCount > 0
              ? `${pendingCount} reservation${pendingCount > 1 ? "s" : ""} can't be paid — set up your payment details`
              : "Set up your payment details before guests can pay"}
          </p>
          <p className="text-xs text-fg-muted mt-1 leading-relaxed">
            Tenants can't complete payment until you add a PromptPay number or bank account.
            Without details, bookings will auto-cancel on their signing deadline.
          </p>
        </div>
        <span className="text-xs font-semibold text-warning shrink-0 self-center">Set up →</span>
      </div>
    </Link>
  );
}

export function HostBookingsPage() {
  const { data: bookings, isLoading } = useHostBookings();
  const { data: profile } = useMyProfile();
  const hasPayoutDetails = Boolean(profile?.promptPayId || profile?.bankAccountNumber);
  const pendingPaymentCount = (bookings ?? []).filter(
    (b) => b.status === BookingStatus.PendingPayment,
  ).length;
  const showPayoutBanner = profile && !hasPayoutDetails && (pendingPaymentCount > 0 || (bookings?.length ?? 0) > 0);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Reservations" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!bookings?.length) {
    return (
      <div>
        <PageHeader title="Reservations" />
        {showPayoutBanner && (
          <div className="mb-4">
            <MissingPaymentDetailsBanner pendingCount={0} />
          </div>
        )}
        <EmptyState
          icon={<Home size={40} />}
          title="No reservations yet"
          description="Once guests book your properties, their reservations will appear here."
        />
      </div>
    );
  }

  const active = sortBookings(bookings.filter((b) => ACTIVE_STATUSES.has(b.status as BookingStatus)));
  const past   = sortBookings(bookings.filter((b) => !ACTIVE_STATUSES.has(b.status as BookingStatus)));

  return (
    <div>
      <PageHeader title="Reservations" />
      {showPayoutBanner && (
        <div className="mb-4">
          <MissingPaymentDetailsBanner pendingCount={pendingPaymentCount} />
        </div>
      )}
      <Tabs defaultValue="active">
        <TabsList className="mb-6">
          <TabsTrigger value="active">
            <span className="flex items-center gap-1.5">
              Active
              {active.length > 0 && (
                <span className="text-[10px] font-bold bg-fg text-bg rounded-full px-1.5 py-0.5 leading-none">
                  {active.length}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="past">
            {`Past · ${past.length}`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveBookingsList bookings={active} />
        </TabsContent>

        <TabsContent value="past">
          <PastBookingsList bookings={past} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
