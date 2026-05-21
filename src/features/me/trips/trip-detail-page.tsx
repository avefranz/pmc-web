import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Home, Wifi, Eye, EyeOff, Copy, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBooking, useBookingInvoices } from "@/lib/hooks/use-bookings";
import { useListing } from "@/lib/hooks/use-listings";
import { formatDate, formatThb } from "@/lib/utils/format";
import { BookingStatus, InvoiceStatus } from "@/lib/types/enums";
import { cn } from "@/lib/utils/cn";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} className="p-1 text-fg-muted hover:text-fg transition-colors">
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
    </button>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-none">
      <span className="text-sm text-fg-muted">{label}</span>
      <div className="text-sm font-medium text-fg flex items-center gap-1">{children}</div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-bg-card rounded-xl shadow-card p-5", className)}>{children}</div>;
}

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id!);
  const { data: invoices } = useBookingInvoices(id!);
  const { data: listing } = useListing(booking?.listingId ?? "");
  const [showWifiPwd, setShowWifiPwd] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!booking) return <p className="text-fg-muted">Booking not found.</p>;

  const isActive = booking.status === BookingStatus.Active || booking.status === BookingStatus.Confirmed;
  const presentAmenities = listing?.amenities?.filter((a) => a.isPresent) ?? [];
  const daysLeft = booking.daysRemaining;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Link to="/me/trips" className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-fg">{listing?.title ?? booking.assetName ?? "My stay"}</h1>
      </div>

      {/* Hero image */}
      <div className="aspect-[21/9] bg-bg-subtle rounded-xl overflow-hidden">
        {listing?.media?.[0] ? (
          <img src={listing.media[0].url} alt="Property" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-subtle">
            <Home size={48} />
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("text-xs", isActive ? "text-success border-success/30" : "")}>
          {booking.status}
        </Badge>
        {isActive && daysLeft != null && (
          <span className={cn("text-xs font-medium", daysLeft <= 14 ? "text-danger" : daysLeft <= 30 ? "text-warning" : "text-fg-muted")}>
            {daysLeft} days remaining
          </span>
        )}
      </div>

      {/* Lease info */}
      <Card>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">Lease</h3>
        <InfoRow label="Rent">
          <span className="font-semibold">{formatThb(booking.rentAmount ?? 0)}</span>
        </InfoRow>
        <InfoRow label="Check-in">{formatDate(booking.checkInDate)}</InfoRow>
        <InfoRow label="Check-out">{formatDate(booking.checkOutDate)}</InfoRow>
      </Card>

      {/* WiFi */}
      {listing && (listing.wifiName || listing.wifiPassword) && (
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2 flex items-center gap-1.5">
            <Wifi size={13} />WiFi
          </h3>
          {listing.wifiName && (
            <InfoRow label="Network">
              <span className="font-mono">{listing.wifiName}</span>
              <CopyBtn text={listing.wifiName} />
            </InfoRow>
          )}
          {listing.wifiPassword && (
            <InfoRow label="Password">
              <span className="font-mono">
                {showWifiPwd ? listing.wifiPassword : "•".repeat(Math.min(listing.wifiPassword.length, 12))}
              </span>
              <button onClick={() => setShowWifiPwd((v) => !v)} className="p-1 text-fg-muted hover:text-fg">
                {showWifiPwd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <CopyBtn text={listing.wifiPassword} />
            </InfoRow>
          )}
        </Card>
      )}

      {/* Amenities */}
      {presentAmenities.length > 0 && (
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-3">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {presentAmenities.map((a) => (
              <span key={a.amenityId} className="inline-flex items-center gap-1 bg-bg-subtle rounded-full px-3 py-1 text-xs font-medium text-fg">
                {(a as any).icon && [...(a as any).icon].length <= 2 && <span>{(a as any).icon}</span>}
                {a.name}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Invoices */}
      {invoices?.length ? (
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-3">Invoices</h3>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-none">
                <div>
                  <p className="text-sm font-medium text-fg">{inv.description ?? inv.type}</p>
                  <p className="text-xs text-fg-muted">{formatDate(inv.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-fg">{formatThb(inv.amount ?? 0)}</p>
                  <span className={cn("text-xs font-medium", inv.status === InvoiceStatus.Paid ? "text-success" : "text-warning")}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Support CTA */}
      <Button
        asChild
        className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white"
      >
        <Link to="/me/host/tickets">
          <Plus size={14} className="mr-1.5" />Contact support
        </Link>
      </Button>
    </div>
  );
}
