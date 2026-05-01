import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useTicket, usePostTicketMessage } from "@/lib/hooks/use-tickets";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { formatRelative, formatDate } from "@/lib/utils/format";
import { MessageVisibility } from "@/lib/types/enums";
import { toast } from "sonner";

export default function TenantTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading } = useTicket(id!);
  const postMessage = usePostTicketMessage(id!);
  const [body, setBody] = useState("");

  const publicMessages = ticket?.messages.filter((m) => m.visibility === MessageVisibility.Public) ?? [];

  async function handleSend() {
    if (!body.trim()) return;
    try {
      await postMessage.mutateAsync({ body: body.trim(), visibility: MessageVisibility.Public });
      setBody("");
    } catch {
      toast.error("Failed to send");
    }
  }

  if (isLoading) return <div className="p-4 space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;
  if (!ticket) return <div className="p-4 text-muted-foreground">Not found.</div>;

  return (
    <div className="p-4 pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{ticketKindIcon(ticket.kind)}</span>
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-tight">{ticket.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(ticket.createdAt)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Badge className={`border-0 ${ticketStatusColor(ticket.status)}`}>{ticket.status}</Badge>
        <Badge className="border-0 bg-gray-100 text-gray-600">{ticket.type}</Badge>
      </div>

      {ticket.description && (
        <Card className="mb-4">
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground text-xs mb-1">Your report</p>
            <p className="whitespace-pre-wrap">{ticket.description}</p>
          </CardContent>
        </Card>
      )}

      <h2 className="font-semibold text-sm mb-3">Messages</h2>
      <div className="space-y-2 mb-4">
        {publicMessages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet. Your manager will reply here.</p>
        )}
        {publicMessages.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-medium text-xs">{m.authorName ?? "Manager"}</span>
                <span className="text-xs text-muted-foreground">{formatRelative(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[80px]"
        />
        <Button className="w-full" onClick={handleSend} disabled={postMessage.isPending || !body.trim()}>
          <Send className="h-4 w-4 mr-2" />
          {postMessage.isPending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
