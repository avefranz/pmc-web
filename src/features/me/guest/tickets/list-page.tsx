import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useTickets } from "@/lib/hooks/use-tickets";
import { formatRelative } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon, tenantTicketStatusLabel } from "@/lib/utils/ticket-status";
import { cn } from "@/lib/utils/cn";

const OPEN_STATUSES = new Set([
  "Draft", "Reported", "Pending", "PendingApproval", "Triaging", "Quoted",
  "InProgress", "Approved", "Blocked", "Reopened",
]);

export function GuestTicketsListPage() {
  const { data: tickets, isLoading } = useTickets();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Issues" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!tickets?.length) {
    return (
      <div>
        <PageHeader title="Issues" />
        <EmptyState
          icon={<Wrench size={40} />}
          title="No issues reported"
          description="Anything broken in your rental? Open the booking and use 'Report an issue'."
        />
      </div>
    );
  }

  const open = tickets.filter((t) => OPEN_STATUSES.has(t.status));
  const closed = tickets.filter((t) => !OPEN_STATUSES.has(t.status));

  return (
    <div>
      <PageHeader title="Issues" />
      <div className="space-y-5">
        {open.length > 0 && (
          <TicketGroup label="Open" tickets={open} />
        )}
        {closed.length > 0 && (
          <TicketGroup label="Resolved" tickets={closed} muted />
        )}
      </div>
    </div>
  );
}

function TicketGroup({ label, tickets, muted }: { label: string; tickets: NonNullable<ReturnType<typeof useTickets>["data"]>; muted?: boolean }) {
  return (
    <div>
      <p className={cn("text-[11px] font-bold uppercase tracking-widest mb-2", muted ? "text-fg-subtle" : "text-fg-muted")}>
        {label} · {tickets.length}
      </p>
      <div className="space-y-2">
        {tickets.map((t) => (
          <Link
            key={t.id}
            to={`/me/guest/tickets/${t.id}`}
            className="block bg-bg-card rounded-xl shadow-card hover:shadow-hover transition-shadow px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span className="text-base shrink-0 mt-0.5">{ticketKindIcon(t.kind)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg line-clamp-1">{t.title}</p>
                <p className="text-xs text-fg-muted mt-0.5">
                  {t.assetName ?? "Property"} · {formatRelative(t.createdAt)}
                </p>
              </div>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0", ticketStatusColor(t.status))}>
                {tenantTicketStatusLabel(t.status)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
