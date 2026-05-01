import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTickets } from "@/lib/hooks/use-tickets";
import { formatRelative } from "@/lib/utils/format";
import { ticketStatusColor, ticketPriorityColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { TicketStatus, TicketKind, TicketPriority } from "@/lib/types/enums";

export default function TicketsPage() {
  const [params, setParams] = useSearchParams();
  const { data: tickets, isLoading } = useTickets();

  const statusFilter = params.get("status") ?? "all";
  const kindFilter = params.get("kind") ?? "all";
  const priorityFilter = params.get("priority") ?? "all";

  const filtered = (tickets ?? []).filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (kindFilter !== "all" && t.kind !== kindFilter) return false;
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
      <PageHeader
        title="Tickets"
        description="Manage maintenance, incidents, and work orders."
        action={
          <Link to="/manager/tickets/new">
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />New ticket</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.values(TicketStatus).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={kindFilter} onValueChange={(v) => setFilter("kind", v)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {Object.values(TicketKind).map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setFilter("priority", v)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {Object.values(TicketPriority).map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || kindFilter !== "all" || priorityFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setParams({})}>
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon="🎫"
          title="No tickets found"
          description={tickets?.length ? "Try adjusting your filters." : "Create your first ticket to get started."}
          action={
            !tickets?.length ? (
              <Link to="/manager/tickets/new"><Button>Create ticket</Button></Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((t) => (
            <Link key={t.id} to={`/manager/tickets/${t.id}`}>
              <div className="flex items-center gap-3 px-4 py-3 bg-card border rounded-lg hover:shadow-sm transition-shadow">
                <span className="text-xl shrink-0">{ticketKindIcon(t.kind)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-muted-foreground font-mono">{t.displayId}</span>
                    {t.assetName && <span className="text-xs text-muted-foreground">· {t.assetName}</span>}
                  </div>
                  <p className="text-sm font-medium truncate">{t.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-xs border-0 ${ticketPriorityColor(t.priority)}`}>{t.priority}</Badge>
                  <Badge className={`text-xs border-0 ${ticketStatusColor(t.status)}`}>{t.status}</Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">{formatRelative(t.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
