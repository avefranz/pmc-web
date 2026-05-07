import { Link } from "react-router-dom";
import { Home, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useHostBookings } from "@/lib/hooks/use-bookings";
import { formatDate, formatThb } from "@/lib/utils/format";
import { BookingStatus } from "@/lib/types/enums";
import type { BookingDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const ACTIVE_STATUSES = [BookingStatus.Active, BookingStatus.Confirmed, BookingStatus.Pending];

const STATUS_CLASS: Record<string, string> = {
  [BookingStatus.Active]:    "bg-success/10 text-success",
  [BookingStatus.Confirmed]: "bg-fg/10 text-fg",
  [BookingStatus.Pending]:   "bg-warning/10 text-warning",
  [BookingStatus.Completed]: "bg-bg-subtle text-fg-muted",
  [BookingStatus.Cancelled]: "bg-danger/10 text-danger",
};

function BookingRow({ booking }: { booking: BookingDto }) {
  return (
    <Link
      to={`/me/host/bookings/${booking.id}`}
      className="flex items-center gap-4 bg-bg-card rounded-xl shadow-card hover:shadow-hover transition-shadow p-4"
    >
      <div className="w-12 h-12 rounded-lg bg-bg-subtle flex items-center justify-center shrink-0 overflow-hidden">
        {booking.primaryImageUrl ? (
          <img src={booking.primaryImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Home size={18} className="text-fg-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg truncate">
          {booking.tenantName ?? "Unnamed tenant"}
        </p>
        <p className="text-xs text-fg-muted truncate">{booking.listingTitle ?? booking.assetName ?? "—"}</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-fg-muted">
          <Calendar size={11} />
          <span>{formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-sm font-semibold text-fg">{formatThb(booking.rentAmount)}<span className="text-xs font-normal text-fg-muted">/mo</span></span>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_CLASS[booking.status] ?? "bg-bg-subtle text-fg-muted")}>
          {booking.status}
        </span>
      </div>
    </Link>
  );
}

function BookingList({ bookings }: { bookings: BookingDto[] }) {
  if (!bookings.length) {
    return (
      <EmptyState
        icon={<Home size={36} />}
        title="Nothing here"
        description="No bookings in this category."
      />
    );
  }
  return (
    <div className="space-y-2">
      {bookings.map((b) => <BookingRow key={b.id} booking={b} />)}
    </div>
  );
}

export function HostBookingsPage() {
  const { data: bookings, isLoading } = useHostBookings();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Bookings" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!bookings?.length) {
    return (
      <div>
        <PageHeader title="Bookings" />
        <EmptyState
          icon={<Home size={40} />}
          title="No bookings yet"
          description="Once guests book your properties, their reservations will appear here."
        />
      </div>
    );
  }

  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status as BookingStatus));
  const past   = bookings.filter((b) => !ACTIVE_STATUSES.includes(b.status as BookingStatus));

  return (
    <div>
      <PageHeader title="Bookings" />
      <Tabs defaultValue="active">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active"><BookingList bookings={active} /></TabsContent>
        <TabsContent value="past"><BookingList bookings={past} /></TabsContent>
      </Tabs>
    </div>
  );
}
