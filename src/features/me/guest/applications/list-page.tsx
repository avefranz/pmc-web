import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils/cn";
import { useMyApplications } from "@/lib/hooks/use-booking-requests";
import { clearUnseen } from "@/lib/hooks/use-notification-poller";
import type { GuestApplicationDto, BookingRequestStatus } from "@/lib/api/booking-requests.api";

const STATUS_CONFIG: Record<BookingRequestStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Pending:  { icon: Clock,       color: "text-warning",  bg: "bg-warning/10",  label: "Awaiting response" },
  Approved: { icon: CheckCircle, color: "text-success",  bg: "bg-success/10",  label: "Approved" },
  Rejected: { icon: XCircle,     color: "text-danger",   bg: "bg-danger/10",   label: "Rejected" },
  Expired:  { icon: Clock,       color: "text-fg-muted", bg: "bg-bg-subtle",   label: "Expired" },
};

function ApplicationCard({ app }: { app: GuestApplicationDto }) {
  const cfg = STATUS_CONFIG[app.status];
  const Icon = cfg.icon;
  return (
    <Link
      to={`/me/guest/applications/${app.id}`}
      className="flex items-center gap-4 bg-bg-card rounded-xl shadow-card p-4 hover:shadow-hover transition-shadow"
    >
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
        <Icon size={18} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg line-clamp-1">{app.listingTitle}</p>
        <p className="text-xs text-fg-muted mt-0.5">
          Move-in {app.moveInDate} · {app.durationMonths} month{app.durationMonths !== 1 ? "s" : ""}
        </p>
      </div>
      <span className={cn("text-xs font-medium shrink-0", cfg.color)}>{cfg.label}</span>
    </Link>
  );
}

export function GuestApplicationsPage() {
  const { data: applications, isLoading } = useMyApplications();

  // Clear unseen badge when page mounts
  useEffect(() => { clearUnseen(); }, []);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="My applications" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!applications?.length) {
    return (
      <div>
        <PageHeader title="My applications" />
        <EmptyState
          icon={<FileText size={40} />}
          title="No applications yet"
          description="When you request to book an ad, your applications will appear here."
          action={
            <Button asChild className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              <Link to="/listings"><Search size={14} className="mr-1.5" />Browse ads</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const pending  = applications.filter((a) => a.status === "Pending");
  const resolved = applications.filter((a) => a.status !== "Pending");

  return (
    <div>
      <PageHeader title="My applications" />
      <div className="space-y-6">
        {pending.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-3">Awaiting response</h2>
            <div className="space-y-2">{pending.map((a) => <ApplicationCard key={a.id} app={a} />)}</div>
          </section>
        )}
        {resolved.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-3">Previous</h2>
            <div className="space-y-2">{resolved.map((a) => <ApplicationCard key={a.id} app={a} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
