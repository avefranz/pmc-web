import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle, CalendarDays, Timer, Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
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
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/me/guest/applications" className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <PageHeader title="Application" className="mb-0" />
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
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link
          to="/me/guest/applications"
          className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <PageHeader title="Application" className="mb-0" />
      </div>

      {/* Status banner */}
      <div className={cn("rounded-2xl p-5 ring-1 flex items-start gap-4 mb-4", cfg.bg, cfg.ring)}>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/60")}>
          <Icon size={20} className={cfg.color} />
        </div>
        <div>
          <p className={cn("font-semibold", cfg.color)}>{cfg.label}</p>
          <p className="text-sm text-fg-muted mt-0.5">{cfg.description}</p>
        </div>
      </div>

      {/* Listing */}
      <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden mb-4">
        {app.listingImageUrl && (
          <img
            src={app.listingImageUrl}
            alt={app.listingTitle}
            className="w-full h-40 object-cover"
          />
        )}
        <div className="p-4">
          <p className="font-semibold text-fg text-base line-clamp-2">{app.listingTitle}</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-bg-card rounded-2xl shadow-card p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-1">Booking details</h3>

        <div className="flex items-center gap-3">
          <CalendarDays size={16} className="text-fg-muted shrink-0" />
          <div className="flex-1 flex justify-between text-sm">
            <span className="text-fg-muted">Move-in</span>
            <span className="font-medium text-fg">{format(moveIn, "MMMM d, yyyy")}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CalendarDays size={16} className="text-fg-muted shrink-0" />
          <div className="flex-1 flex justify-between text-sm">
            <span className="text-fg-muted">Move-out</span>
            <span className="font-medium text-fg">{format(moveOut, "MMMM d, yyyy")}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Timer size={16} className="text-fg-muted shrink-0" />
          <div className="flex-1 flex justify-between text-sm">
            <span className="text-fg-muted">Duration</span>
            <span className="font-medium text-fg">
              {app.durationMonths} month{app.durationMonths !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-3 flex items-center gap-3">
          <Coins size={16} className="text-fg-muted shrink-0" />
          <div className="flex-1 flex justify-between text-sm">
            <span className="text-fg-muted">Monthly rate</span>
            <span className="font-medium text-fg">{formatThb(app.monthlyRate)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-4 shrink-0" />
          <div className="flex-1 flex justify-between text-sm font-semibold text-fg">
            <span>Total estimate</span>
            <span>{formatThb(total)}</span>
          </div>
        </div>
      </div>

      {/* Submitted at */}
      {app.createdAt && (
        <p className="text-xs text-fg-muted text-center mt-4">
          Submitted {format(parseISO(app.createdAt), "MMMM d, yyyy 'at' HH:mm")}
        </p>
      )}
    </div>
  );
}
