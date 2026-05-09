import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Wifi, Eye, EyeOff, Copy, Check, MessageCircle, CreditCard, DoorOpen, CalendarDays, Timer, Coins } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useBooking, useBookingInvoices, useBookingCancellation, useRequestCancellation } from "@/lib/hooks/use-bookings";
import { useListing } from "@/lib/hooks/use-listings";
import { formatDate, formatThb } from "@/lib/utils/format";
import { BookingStatus, InvoiceStatus } from "@/lib/types/enums";
import { cn } from "@/lib/utils/cn";

const INVOICE_TYPE_LABELS: Record<string, string> = {
  Rent: "Monthly rent",
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

export function GuestBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id!);
  const { data: invoices } = useBookingInvoices(id!);
  const { data: listing } = useListing(booking?.listingId ?? "");
  const { data: cancellation } = useBookingCancellation(id!);
  const requestCancellation = useRequestCancellation(id!);
  const [showWifiPwd, setShowWifiPwd] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitNote, setExitNote] = useState("");

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
  const presentAmenities = listing?.amenities?.filter((a) => a.isPresent) ?? [];
  const daysLeft = booking.daysRemaining;
  const heroUrl = listing?.media?.[0]?.url ?? booking.primaryImageUrl;
  const unpaidInvoices = (invoices ?? []).filter((i) => i.status !== InvoiceStatus.Paid && i.status !== InvoiceStatus.Cancelled);

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
        <h1 className="text-xl font-semibold text-fg line-clamp-1">
          {listing?.title ?? booking.assetName ?? "My stay"}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* LEFT — visual content */}
        <div className="space-y-4">
          {/* Hero */}
          <div className="h-56 sm:h-72 bg-bg-subtle rounded-2xl overflow-hidden relative">
            {heroUrl ? (
              <img src={heroUrl} alt="Property" className="w-full h-full object-cover" style={{ imageOrientation: "from-image" }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-fg-subtle">
                <Home size={48} />
              </div>
            )}
            {listing?.media && listing.media.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-lg backdrop-blur-sm">
                1 / {listing.media.length}
              </div>
            )}
          </div>

          {/* WiFi */}
          {isUpcoming && listing && (listing.wifiName || listing.wifiPassword) && (
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
                    <button
                      onClick={() => setShowWifiPwd((v) => !v)}
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
          {isUpcoming && listing?.houseRules && (
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
                  <span
                    key={a.amenityId}
                    className="inline-flex items-center gap-1.5 bg-bg-subtle rounded-full px-3 py-1.5 text-xs font-medium text-fg"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — booking summary */}
        <div className="space-y-3 lg:sticky lg:top-8">

          {/* Status */}
          <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4">
            <StatusPill status={booking.status} />
          </div>

          {/* Pay now — show when there are unpaid invoices */}
          {unpaidInvoices.length > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-fg mb-0.5">Payment required</p>
              <p className="text-xs text-fg-muted mb-3">
                {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? "s" : ""} · complete payment to confirm your stay.
              </p>
              <Button
                className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-9 text-sm"
                onClick={() => navigate(`/me/guest/bookings/${id}/payment`)}
              >
                <CreditCard size={14} className="mr-1.5" />Pay now
              </Button>
            </div>
          )}

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
                <div
                  className={cn("h-full rounded-full transition-all", daysLeft <= 14 ? "bg-danger" : daysLeft <= 30 ? "bg-warning" : "bg-success")}
                  style={{ width: `${leaseProgress}%` }}
                />
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
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <Coins size={15} className="text-fg-muted shrink-0 opacity-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Total rent</span>
                <span className="font-medium text-fg">{formatThb(booking.rentAmount ?? 0)}</span>
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

          {/* Invoices */}
          {(invoices?.length ?? 0) > 0 && (
            <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border">
                <h3 className="text-sm font-semibold text-fg">Payments</h3>
              </div>
              {invoices!.map((inv) => {
                const isPaid = inv.status === InvoiceStatus.Paid;
                const isCancelledInv = inv.status === InvoiceStatus.Cancelled;
                const needsPayment = !isPaid && !isCancelledInv;
                return (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-none gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{inv.description || INVOICE_TYPE_LABELS[inv.type] || inv.type}</p>
                      {inv.dueDate && <p className="text-xs text-fg-muted mt-0.5">Due {formatDate(inv.dueDate)}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-fg">{formatThb(inv.amount ?? 0)}</p>
                        <span className={cn(
                          "text-xs font-medium",
                          isPaid ? "text-success"
                            : inv.status === InvoiceStatus.Overdue ? "text-danger"
                            : isCancelledInv ? "text-fg-muted"
                            : "text-warning",
                        )}>
                          {isPaid ? "Paid" : isCancelledInv ? "Cancelled" : inv.status === InvoiceStatus.Overdue ? "Overdue" : "Pending"}
                        </span>
                      </div>
                      {needsPayment && (
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-lg shrink-0"
                          onClick={() => navigate(`/me/guest/bookings/${id}/payment`)}
                        >
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Early exit request */}
          {(isConfirmed || isActive) && !cancellation && (
            <Button
              variant="outline"
              className="w-full rounded-xl h-10 text-sm border-border hover:bg-bg-subtle"
              onClick={() => setExitDialogOpen(true)}
            >
              <DoorOpen size={15} className="mr-2" />Request early exit
            </Button>
          )}

          {cancellation && cancellation.status !== "Confirmed" && cancellation.status !== "Processed" && (
            <div className="bg-bg-card rounded-xl shadow-card px-4 py-3 flex items-center gap-2">
              <DoorOpen size={14} className="text-fg-muted shrink-0" />
              <div>
                <p className="text-sm font-medium text-fg">Early exit requested</p>
                <p className="text-xs text-fg-muted">Earliest exit: {formatDate(cancellation.earliestExitDate)}</p>
              </div>
            </div>
          )}

          {/* Contact support */}
          <Button
            asChild
            variant="outline"
            className="w-full rounded-xl h-10 text-sm border-border hover:bg-bg-subtle"
          >
            <Link to="/me/host/tickets">
              <MessageCircle size={15} className="mr-2" />Contact support
            </Link>
          </Button>
        </div>
      </div>

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
    </div>
  );
}
