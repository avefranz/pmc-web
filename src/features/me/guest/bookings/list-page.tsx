import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, ChevronRight, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useMyBookings } from "@/lib/hooks/use-bookings";
import { formatDate } from "@/lib/utils/format";
import { BookingStatus } from "@/lib/types/enums";
import { cn } from "@/lib/utils/cn";
import type { BookingDto } from "@/lib/types";

const PAST_STATUSES = [BookingStatus.Completed, BookingStatus.Cancelled];

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function StatusBadge({ booking }: { booking: BookingDto }) {
  const s = booking.status as BookingStatus;
  let text = s as string;
  let cls = "bg-bg-subtle text-fg-muted";
  if (s === BookingStatus.Active)         { text = "Active";          cls = "bg-success/10 text-success"; }
  if (s === BookingStatus.Confirmed)      { text = "Confirmed";       cls = "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"; }
  if (s === BookingStatus.PendingPayment) { text = "Payment pending"; cls = "bg-warning/10 text-warning"; }
  if (s === BookingStatus.Completed)      { text = "Completed";       cls = "bg-bg-subtle text-fg-muted"; }
  if (s === BookingStatus.Cancelled)      { text = "Cancelled";       cls = "bg-danger/10 text-danger"; }
  return <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cls)}>{text}</span>;
}

function CountdownChip({ booking }: { booking: BookingDto }) {
  const s = booking.status as BookingStatus;
  if (s === BookingStatus.Active) {
    const d = booking.daysRemaining;
    if (d == null) return null;
    return (
      <span className={cn("text-xs", d <= 14 ? "text-danger" : d <= 30 ? "text-warning" : "text-fg-muted")}>
        {d} day{d !== 1 ? "s" : ""} remaining
      </span>
    );
  }
  if (s === BookingStatus.Confirmed || s === BookingStatus.PendingPayment) {
    const d = daysUntil(booking.checkInDate);
    if (d <= 0) return null;
    return <span className="text-xs text-fg-muted">Check-in in {d} day{d !== 1 ? "s" : ""}</span>;
  }
  return null;
}

function StayCard({ booking }: { booking: BookingDto }) {
  return (
    <Link
      to={`/me/guest/bookings/${booking.id}`}
      className="group flex items-center gap-4 bg-bg-card rounded-2xl shadow-card hover:shadow-hover transition-all p-4"
    >
      <div className="w-24 h-24 shrink-0 rounded-xl bg-bg-subtle overflow-hidden">
        {booking.primaryImageUrl ? (
          <img
            src={booking.primaryImageUrl}
            alt="Property"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-subtle">
            <Home size={24} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-fg line-clamp-1 mb-0.5">
          {booking.listingTitle ?? booking.assetName ?? "Property"}
        </p>
        {booking.assetName && booking.listingTitle && (
          <p className="text-xs text-fg-muted flex items-center gap-1 mb-1">
            <MapPin size={10} />{booking.assetName}
          </p>
        )}
        <p className="text-sm text-fg-muted mb-2">
          {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge booking={booking} />
          <CountdownChip booking={booking} />
        </div>
      </div>

      <ChevronRight size={16} className="text-fg-subtle shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

function EmptyTab({ title, desc }: { title: string; desc: string }) {
  return (
    <EmptyState icon={<Home size={36} />} title={title} description={desc} />
  );
}

export function GuestBookingsPage() {
  const { data: bookings, isLoading } = useMyBookings();

  const upcoming = (bookings ?? []).filter((b) => !PAST_STATUSES.includes(b.status as BookingStatus));
  const past     = (bookings ?? []).filter((b) =>  PAST_STATUSES.includes(b.status as BookingStatus));

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (!isLoading && upcoming.length === 0 && past.length > 0) setTab("past");
  }, [isLoading, upcoming.length, past.length]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32 mb-6" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!bookings?.length) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-fg mb-6">My stays</h1>
        <EmptyState
          icon={<Home size={40} />}
          title="No stays yet"
          description="Time to find your next place in Thailand."
          action={
            <Button asChild className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              <Link to="/listings">Browse listings</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-fg mb-6">My stays</h1>

      <div className="flex gap-1 mb-6 bg-bg-subtle rounded-xl p-1 w-fit">
        {(["upcoming", "past"] as const).map((t) => {
          const count = t === "upcoming" ? upcoming.length : past.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                tab === t
                  ? "bg-bg-card text-fg shadow-card"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {t === "upcoming" ? "Upcoming" : "Past"}{count > 0 && ` (${count})`}
            </button>
          );
        })}
      </div>

      {tab === "upcoming" && (
        upcoming.length > 0
          ? <div className="space-y-3">{upcoming.map((b) => <StayCard key={b.id} booking={b} />)}</div>
          : <EmptyTab title="No upcoming stays" description="Your confirmed stays will appear here." />
      )}
      {tab === "past" && (
        past.length > 0
          ? <div className="space-y-3">{past.map((b) => <StayCard key={b.id} booking={b} />)}</div>
          : <EmptyTab title="No past stays" description="Your completed stays will appear here." />
      )}
    </div>
  );
}
