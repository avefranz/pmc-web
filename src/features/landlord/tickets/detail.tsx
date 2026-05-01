import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useTicket } from "@/lib/hooks/use-tickets";
import { ticketStatusColor, ticketPriorityColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { formatRelative, formatDate } from "@/lib/utils/format";
import { MessageVisibility } from "@/lib/types/enums";

export default function LandlordTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading } = useTicket(id!);

  if (isLoading) return <div className="p-4 space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;
  if (!ticket) return <div className="p-4 text-muted-foreground">Ticket not found.</div>;

  const publicMessages = ticket.messages.filter((m) => m.visibility === MessageVisibility.Public);

  return (
    <div className="p-4 pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">{ticketKindIcon(ticket.kind)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono mb-1">{ticket.displayId}</p>
          <h1 className="font-bold text-lg leading-tight">{ticket.title}</h1>
          {ticket.assetName && <p className="text-sm text-muted-foreground mt-1">{ticket.assetName}</p>}
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge className={`border-0 ${ticketStatusColor(ticket.status)}`}>{ticket.status}</Badge>
        <Badge className={`border-0 ${ticketPriorityColor(ticket.priority)}`}>{ticket.priority}</Badge>
        <Badge className="border-0 bg-gray-100 text-gray-600">{ticket.kind}</Badge>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 text-sm">
          <p className="text-muted-foreground text-xs mb-1">Description</p>
          <p className="whitespace-pre-wrap">{ticket.description || "—"}</p>
          <p className="text-xs text-muted-foreground mt-3">{formatDate(ticket.createdAt)}</p>
        </CardContent>
      </Card>

      <h2 className="font-semibold text-sm mb-3">Messages</h2>
      <div className="space-y-2">
        {publicMessages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {publicMessages.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-medium text-xs">{m.authorName ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{formatRelative(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
