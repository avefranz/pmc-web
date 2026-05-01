import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useTickets } from "@/lib/hooks/use-tickets";
import { ticketStatusColor, ticketPriorityColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { formatRelative } from "@/lib/utils/format";

export default function LandlordTickets() {
  const { data: tickets, isLoading } = useTickets();

  return (
    <div className="p-4 pb-6">
      <h1 className="text-xl font-bold mb-4">Tickets</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !tickets?.length ? (
        <EmptyState icon="🎫" title="No tickets" description="No maintenance or incident tickets." />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} to={`/landlord/tickets/${t.id}`}>
              <div className="bg-white border rounded-xl p-4 flex items-center gap-3 shadow-sm active:bg-gray-50">
                <span className="text-2xl shrink-0">{ticketKindIcon(t.kind)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.assetName} · {formatRelative(t.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge className={`text-xs border-0 ${ticketPriorityColor(t.priority)}`}>{t.priority}</Badge>
                  <Badge className={`text-xs border-0 ${ticketStatusColor(t.status)}`}>{t.status}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
