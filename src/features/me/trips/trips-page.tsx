import { Link } from "react-router-dom";
import { Home, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useMyBookings } from "@/lib/hooks/use-bookings";
import { formatDate } from "@/lib/utils/format";
import { BookingStatus } from "@/lib/types/enums";
import type { BookingDto } from "@/lib/types";

const ACTIVE_STATUSES = [BookingStatus.Active, BookingStatus.Confirmed, BookingStatus.PendingPayment];

function TripCard({ booking }: { booking: BookingDto }) {
  return (
    <Link
      to={`/me/trips/${booking.id}`}
      className="group bg-bg-card rounded-xl shadow-card hover:shadow-hover transition-shadow overflow-hidden flex flex-col"
    >
      <div className="aspect-video bg-bg-subtle overflow-hidden">
        {booking.primaryImageUrl ? (
          <img
            src={booking.primaryImageUrl}
            alt="Property"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-subtle">
            <Home size={36} />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-fg line-clamp-1 mb-1">{booking.assetName ?? "Property"}</p>
        <div className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Calendar size={12} />
          <span>{formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}</span>
        </div>
        <div className="mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            ACTIVE_STATUSES.includes(booking.status as BookingStatus)
              ? "bg-success/10 text-success"
              : "bg-bg-subtle text-fg-muted"
          }`}>
            {booking.status}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TripGrid({ bookings }: { bookings: BookingDto[] }) {
  if (!bookings.length) {
    return (
      <EmptyState
        icon={<Home size={36} />}
        title="No trips here"
        description="Your past and upcoming stays will appear here."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookings.map((b) => <TripCard key={b.id} booking={b} />)}
    </div>
  );
}

export function TripsPage() {
  const { data: bookings, isLoading } = useMyBookings();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="My trips" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!bookings?.length) {
    return (
      <div>
        <PageHeader title="My trips" />
        <EmptyState
          icon={<Home size={40} />}
          title="No trips yet"
          description="Time to plan your next stay in Thailand!"
          action={
            <Button asChild className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white">
              <Link to="/listings">Browse ads</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const upcoming = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status as BookingStatus));
  const past = bookings.filter((b) => !ACTIVE_STATUSES.includes(b.status as BookingStatus));

  return (
    <div>
      <PageHeader title="My trips" />
      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming"><TripGrid bookings={upcoming} /></TabsContent>
        <TabsContent value="past"><TripGrid bookings={past} /></TabsContent>
      </Tabs>
    </div>
  );
}
