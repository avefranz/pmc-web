import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTicket, usePostTicketMessage } from "@/lib/hooks/use-tickets";
import { formatRelative } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { MessageVisibility } from "@/lib/types/enums";
import type { TicketMessageDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function MessageBubble({ msg, isMine }: { msg: TicketMessageDto; isMine: boolean }) {
  return (
    <div className={cn("flex gap-3", isMine && "flex-row-reverse")}>
      <div className="w-7 h-7 rounded-full bg-bg-subtle shrink-0 flex items-center justify-center text-xs font-semibold text-fg-muted mt-0.5">
        {(msg.authorName ?? "?")[0]?.toUpperCase()}
      </div>
      <div className={cn("flex-1 min-w-0", isMine && "text-right")}>
        <div className={cn("flex items-center gap-2 mb-1", isMine && "justify-end")}>
          <span className="text-xs font-medium text-fg">{msg.authorName ?? "Unknown"}</span>
          <span className="text-xs text-fg-muted">{formatRelative(msg.createdAt)}</span>
        </div>
        <div
          className={cn(
            "inline-block max-w-full rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed text-left",
            isMine
              ? "bg-brand/10 text-fg rounded-tr-sm"
              : "bg-bg-subtle text-fg rounded-tl-sm",
          )}
        >
          {msg.body}
        </div>
      </div>
    </div>
  );
}

export function GuestTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id!);
  const postMessage = usePostTicketMessage(id!);

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await postMessage.mutateAsync({ body: text, visibility: MessageVisibility.Public });
      setBody("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-fg mb-1">Ticket not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/me/guest/tickets">Back to issues</Link>
        </Button>
      </div>
    );
  }

  const publicMessages = ticket.messages.filter((m) => m.visibility === MessageVisibility.Public);
  const backHref = ticket.bookingId ? `/me/guest/bookings/${ticket.bookingId}` : "/me/guest/tickets";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
      >
        <ArrowLeft size={16} />Back
      </Link>

      {/* Header */}
      <div className="bg-bg-card rounded-2xl shadow-card p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5">{ticketKindIcon(ticket.kind)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-fg-muted">{ticket.displayId}</p>
            <h1 className="text-lg font-semibold text-fg leading-snug mt-0.5">{ticket.title}</h1>
          </div>
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full shrink-0", ticketStatusColor(ticket.status))}>
            {ticket.status}
          </span>
        </div>
        {ticket.description && (
          <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap mt-4 pt-4 border-t border-border">
            {ticket.description}
          </p>
        )}
        {ticket.mediaUrls?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {ticket.mediaUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-16 h-16 rounded-lg overflow-hidden bg-bg-subtle"
              >
                <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="bg-bg-card rounded-2xl shadow-card p-5">
        <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-4">
          Messages {publicMessages.length > 0 && `· ${publicMessages.length}`}
        </p>
        {publicMessages.length > 0 ? (
          <div className="space-y-4 mb-5">
            {publicMessages.map((m) => (
              <MessageBubble key={m.id} msg={m} isMine={m.authorId === ticket.creatorId} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted mb-4">
            No messages yet. Your host will reply here.
          </p>
        )}

        {/* Compose */}
        <div className="border-t border-border pt-4">
          <Textarea
            placeholder="Add details, ask a question, or share an update…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mb-2 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!body.trim() || sending}
              onClick={handleSend}
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-lg gap-1.5"
            >
              <Send size={13} />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
