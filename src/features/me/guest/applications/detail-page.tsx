import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle, CalendarDays, Timer, Coins, Search, BedDouble, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { formatThb } from "@/lib/utils/format";
import { useMyApplication } from "@/lib/hooks/use-booking-requests";
import type { BookingRequestStatus } from "@/lib/api/booking-requests.api";
import { format, parseISO, addMonths } from "date-fns";

const STATUS_CONFIG: Record<
  BookingRequestStatus,
  { icon: React.ElementType; color: string; bg: string; ring: string; label: string; description: string }
> = {
  Pending: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    ring: "ring-warning/30",
    label: "Awaiting response",
    description: "Your request has been sent. The host will typically respond within 24 hours.",
  },
  Approved: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    ring: "ring-success/30",
    label: "Approved",
    description: "Great news — your booking request has been approved! The host will be in touch shortly.",
  },
  Rejected: {
    icon: XCircle,
    color: "text-danger",
    bg: "bg-danger/10",
    ring: "ring-danger/30",
    label: "Not available",
    description: "Unfortunately the host wasn't able to accommodate this request.",
  },
  Expired: {
    icon: Clock,
    color: "text-fg-muted",
    bg: "bg-bg-subtle",
    ring: "ring-border",
    label: "Expired",
    description: "This request expired without a response.",
  },
};

export function GuestApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: app, isLoading } = useMyApplication(id!);

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/me/guest/applications" className="p-1.5 rounded-xl hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-semibold text-fg">Application</h1>
        </div>
        <div className="bg-bg-card rounded-2xl shadow-card p-8 text-center">
          <p className="text-fg-muted">Application not found.</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[app.status];
  const Icon = cfg.icon;
  const moveIn = parseISO(app.moveInDate);
  const moveOut = addMonths(moveIn, app.durationMonths);
  const total = app.monthlyRate * app.durationMonths;

  return (
    <div className="w-full pb-8">
      {/* Back + title */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          to="/me/guest/applications"
          className="p-1.5 rounded-xl hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-fg line-clamp-1">
          {app.listingTitle ?? "Application"}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

        {/* LEFT — listing image */}
        <div className="space-y-4">
          <div className="h-56 sm:h-72 bg-bg-subtle rounded-2xl overflow-hidden">
            {app.listingImageUrl ? (
              <img
                src={app.listingImageUrl}
                alt={app.listingTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-fg-subtle">
                <Home size={48} />
              </div>
            )}
          </div>

          {/* Status banner */}
          <div className={cn("rounded-2xl p-5 ring-1 flex items-start gap-4", cfg.bg, cfg.ring)}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/60">
              <Icon size={20} className={cfg.color} />
            </div>
            <div>
              <p className={cn("font-semibold", cfg.color)}>{cfg.label}</p>
              <p className="text-sm text-fg-muted mt-0.5">{cfg.description}</p>
            </div>
          </div>
        </div>

        {/* RIGHT — booking details */}
        <div className="space-y-3 lg:sticky lg:top-8">
          {/* Dates + financials */}
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-fg">Booking details</h3>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <CalendarDays size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Move-in</span>
                <span className="font-medium text-fg">{format(moveIn, "d MMM yyyy")}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <CalendarDays size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Move-out</span>
                <span className="font-medium text-fg">{format(moveOut, "d MMM yyyy")}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <Timer size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Duration</span>
                <span className="font-medium text-fg">
                  {app.durationMonths} month{app.durationMonths !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <Coins size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Monthly rate</span>
                <span className="font-medium text-fg">{formatThb(app.monthlyRate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <span className="w-[15px] shrink-0" />
              <div className="flex-1 flex justify-between text-sm font-semibold text-fg">
                <span>Total estimate</span>
                <span>{formatThb(total)}</span>
              </div>
            </div>
          </div>

          {/* CTAs based on status */}
          {app.status === "Approved" && (
            <Button asChild className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-10 text-sm">
              <Link to="/me/guest/bookings">
                <BedDouble size={15} className="mr-2" />View your stays
              </Link>
            </Button>
          )}
          {(app.status === "Rejected" || app.status === "Expired") && (
            <Button asChild variant="outline" className="w-full rounded-xl h-10 text-sm border-border hover:bg-bg-subtle">
              <Link to="/listings">
                <Search size={15} className="mr-2" />Browse other listings
              </Link>
            </Button>
          )}

          {/* Submitted at */}
          {app.createdAt && (
            <p className="text-xs text-fg-muted text-center pt-1">
              Submitted {format(parseISO(app.createdAt), "d MMM yyyy 'at' HH:mm")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
