import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Wifi, Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useMyBookings } from "@/lib/hooks/use-bookings";
import { useListing } from "@/lib/hooks/use-listings";
import { formatDate, formatThb } from "@/lib/utils/format";
import { BookingStatus } from "@/lib/types/enums";
import type { BookingDto } from "@/lib/types";
import { toast } from "sonner";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-500" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ActiveBookingCard({ booking }: { booking: BookingDto }) {
  const { data: listing } = useListing(booking.listingId);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const daysLeft = booking.daysRemaining ?? 0;
  const daysColor =
    daysLeft <= 14 ? "text-red-600 font-bold" :
    daysLeft <= 30 ? "text-amber-600 font-bold" :
    "text-foreground font-bold";

  const presentAmenities = listing?.amenities.filter((a) => a.isPresent) ?? [];

  return (
    <div className="space-y-4">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        {listing?.media[0] ? (
          <img
            src={listing.media[0].url}
            alt={listing.title}
            className="w-full h-52 object-cover"
          />
        ) : (
          <div className="w-full h-52 bg-muted flex items-center justify-center text-5xl">🏠</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4">
          <h1 className="text-white font-bold text-xl leading-tight">
            {listing?.title ?? "My unit"}
          </h1>
          <Badge className={`border-0 text-xs mt-1.5 backdrop-blur-sm ${
            booking.status === BookingStatus.Active
              ? "bg-green-400/90 text-green-950"
              : "bg-white/25 text-white"
          }`}>
            {booking.status === BookingStatus.Active ? "Active lease" : booking.status}
          </Badge>
        </div>
      </div>

      {/* Lease */}
      <Card>
        <CardContent className="p-4 divide-y divide-border">
          <div className="flex items-center justify-between py-2.5 first:pt-0">
            <p className="text-sm text-muted-foreground">Monthly rent</p>
            <p className="font-bold">{formatThb(booking.rentAmount)}</p>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <p className="text-sm text-muted-foreground">Lease ends</p>
            <p className="text-sm">{formatDate(booking.checkOutDate)}</p>
          </div>
          {booking.daysRemaining != null && (
            <div className="flex items-center justify-between py-2.5 last:pb-0">
              <p className="text-sm text-muted-foreground">Days remaining</p>
              <p className={`text-sm ${daysColor}`}>{booking.daysRemaining} days</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WiFi */}
      {listing && (listing.wifiName || listing.wifiPassword) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold text-sm">WiFi</p>
            </div>
            <div className="space-y-2.5">
              {listing.wifiName && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground shrink-0">Network</p>
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-mono truncate">{listing.wifiName}</p>
                    <CopyButton text={listing.wifiName} />
                  </div>
                </div>
              )}
              {listing.wifiPassword && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground shrink-0">Password</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono">
                      {showPassword
                        ? listing.wifiPassword
                        : "•".repeat(Math.min(listing.wifiPassword.length, 12))}
                    </p>
                    <button
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    >
                      {showPassword
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <CopyButton text={listing.wifiPassword} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amenities */}
      {presentAmenities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Amenities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presentAmenities.map((a) => (
              <Badge key={a.amenityId} variant="secondary" className="text-xs">
                {a.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Report issue CTA */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate("/tenant/tickets")}
      >
        <Plus className="h-4 w-4 mr-2" />
        Report an issue
      </Button>
    </div>
  );
}

export default function TenantHome() {
  const { data: bookings, isLoading } = useMyBookings();
  const activeBooking = bookings?.find(
    (b) => b.status !== BookingStatus.Completed && b.status !== BookingStatus.Cancelled,
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-28" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-6">
      {!activeBooking ? (
        <EmptyState
          icon="🏠"
          title="No active lease"
          description="Contact your manager to get set up."
        />
      ) : (
        <ActiveBookingCard booking={activeBooking} />
      )}
    </div>
  );
}
