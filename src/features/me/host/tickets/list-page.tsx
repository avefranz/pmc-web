import { useSearchParams, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useTickets } from "@/lib/hooks/use-tickets";
import { formatRelative } from "@/lib/utils/format";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { TicketStatus, TicketKind, TicketPriority } from "@/lib/types/enums";
import { cn } from "@/lib/utils/cn";

const TICKET_STATUS_LABELS: Record<string, string> = {
  Triaging: "Under review",
  PendingApproval: "Pending approval",
  InProgress: "In progress",
  Verified: "Work done",
  Reopened: "Re-opened",
};

function priorityBadge(p: string) {
  if (p === "Urgent") return "bg-danger/10 text-danger";
  if (p === "High")   return "bg-warning/10 text-warning";
  return "bg-bg-subtle text-fg-muted";
}

function statusBadge(s: string) {
  if (["Closed", "Completed", "Cancelled", "Canceled"].includes(s)) return "bg-bg-subtle text-fg-muted";
  if (["Verified"].includes(s))                                       return "bg-success/10 text-success";
  if (["Blocked", "Rejected"].includes(s))                           return "bg-danger/10 text-danger";
  if (["PendingApproval", "Pending", "Triaging", "Quoted"].includes(s)) return "bg-warning/10 text-warning";
  return "bg-bg-subtle text-fg-muted";
}

export function TicketsListPage() {
  const [params, setParams] = useSearchParams();
  const { data: tickets, isLoading } = useTickets();

  const statusFilter   = params.get("status")   ?? "all";
  const kindFilter     = params.get("kind")      ?? "all";
  const priorityFilter = params.get("priority")  ?? "all";
  const hasFilter = statusFilter !== "all" || kindFilter !== "all" || priorityFilter !== "all";

  const filtered = (tickets ?? []).filter((t) => {
    if (statusFilter   !== "all" && t.status   !== statusFilter)   return false;
    if (kindFilter     !== "all" && t.kind     !== kindFilter)     return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  return (
    <div>
      <PageHeader title="Maintenance" />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          className={cn(
            "text-sm rounded-lg border border-border bg-bg-card px-3 py-1.5 text-fg outline-none focus:ring-2 focus:ring-brand/30",
            statusFilter !== "all" && "border-brand text-brand",
          )}
          value={statusFilter}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="all">All statuses</option>
          {Object.values(TicketStatus).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className={cn(
            "text-sm rounded-lg border border-border bg-bg-card px-3 py-1.5 text-fg outline-none focus:ring-2 focus:ring-brand/30",
            kindFilter !== "all" && "border-brand text-brand",
          )}
          value={kindFilter}
          onChange={(e) => setFilter("kind", e.target.value)}
        >
          <option value="all">All kinds</option>
          {Object.values(TicketKind).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>

        <select
          className={cn(
            "text-sm rounded-lg border border-border bg-bg-card px-3 py-1.5 text-fg outline-none focus:ring-2 focus:ring-brand/30",
            priorityFilter !== "all" && "border-brand text-brand",
          )}
          value={priorityFilter}
          onChange={(e) => setFilter("priority", e.target.value)}
        >
          <option value="all">All priorities</option>
          {Object.values(TicketPriority).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        {hasFilter && (
          <button
            className="text-sm text-fg-muted hover:text-fg transition-colors"
            onClick={() => setParams({})}
          >
            Clear filters
          </button>
        )}

        {!isLoading && (
          <span className="ml-auto text-xs text-fg-muted">
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon={<span className="text-4xl">🎫</span>}
          title="No tickets found"
          description={tickets?.length ? "Try adjusting your filters." : "No support tickets yet."}
        />
      ) : (
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((t) => (
              <Link key={t.id} to={`/me/host/tickets/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-subtle transition-colors">
                <span className="text-base shrink-0">{ticketKindIcon(t.kind)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-fg-muted">{t.displayId}</span>
                    {t.assetName && (
                      <span className="text-xs text-fg-subtle">· {t.assetName}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-fg line-clamp-1">{t.title}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", priorityBadge(t.priority))}>
                  {t.priority}
                </span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", statusBadge(t.status))}>
                  {TICKET_STATUS_LABELS[t.status] ?? t.status}
                </span>
                <span className="text-xs text-fg-muted shrink-0 hidden sm:block">
                  {formatRelative(t.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
