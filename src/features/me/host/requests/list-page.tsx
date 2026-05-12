import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Inbox, Clock, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils/cn";
import { useHostRequests } from "@/lib/hooks/use-booking-requests";
import type { HostBookingRequestDto, BookingRequestStatus } from "@/lib/api/booking-requests.api";

const STATUS_CONFIG: Record<BookingRequestStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Pending:  { icon: Clock,       color: "text-warning",  bg: "bg-warning/10",  label: "Awaiting action" },
  Approved: { icon: CheckCircle, color: "text-success",  bg: "bg-success/10",  label: "Approved" },
  Rejected: { icon: XCircle,     color: "text-fg-muted", bg: "bg-bg-subtle",   label: "Rejected" },
  Expired:  { icon: Clock,       color: "text-fg-muted", bg: "bg-bg-subtle",   label: "Expired" },
};

function RequestCard({ req }: { req: HostBookingRequestDto }) {
  const cfg = STATUS_CONFIG[req.status];
  const Icon = cfg.icon;
  return (
    <Link
      to={`/me/host/requests/${req.id}`}
      className="flex items-center gap-4 bg-bg-card rounded-xl shadow-card p-4 hover:shadow-hover transition-shadow"
    >
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
        <Icon size={18} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-fg">{req.guestName}</p>
          <span className="text-fg-muted">·</span>
          <p className="text-sm text-fg-muted line-clamp-1">{req.listingTitle}</p>
        </div>
        <p className="text-xs text-fg-muted mt-0.5">
          {req.moveInDate ? format(parseISO(req.moveInDate), "d MMM yyyy") : "—"} · {req.durationMonths} month{req.durationMonths !== 1 ? "s" : ""}
        </p>
      </div>
      <span className={cn("text-xs font-medium shrink-0", cfg.color)}>{cfg.label}</span>
    </Link>
  );
}

export function HostRequestsPage() {
  const { data: requests, isLoading } = useHostRequests();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Booking requests" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div>
        <PageHeader title="Booking requests" />
        <EmptyState
          icon={<Inbox size={40} />}
          title="No requests yet"
          description="When guests apply to your listings, their requests will appear here."
        />
      </div>
    );
  }

  const pending  = requests.filter((r) => r.status === "Pending");
  const resolved = requests.filter((r) => r.status !== "Pending");

  return (
    <div>
      <PageHeader title="Booking requests" />
      <div className="space-y-6">
        {pending.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-3">Need your response</h2>
            <div className="space-y-2">{pending.map((r) => <RequestCard key={r.id} req={r} />)}</div>
          </section>
        )}
        {resolved.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-3">Previous</h2>
            <div className="space-y-2">{resolved.map((r) => <RequestCard key={r.id} req={r} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
