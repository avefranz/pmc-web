import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useTicket,
  useUpdateTicketStatus,
  usePostTicketMessage,
  useToggleChecklistItem,
} from "@/lib/hooks/use-tickets";
import { formatDate, formatDateTime, formatThb, formatRelative } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon, ticketKindLabel } from "@/lib/utils/ticket-status";
import { MessageVisibility } from "@/lib/types/enums";
import type { TicketMessageDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const TICKET_STATUS_LABELS: Record<string, string> = {
  Triaging: "Under review",
  PendingApproval: "Pending approval",
  InProgress: "In progress",
  Verified: "Work done",
  Reopened: "Re-opened",
};

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-none">
      <span className="text-xs text-fg-muted">{label}</span>
      <div className="text-xs font-medium text-fg flex items-center gap-1">{children}</div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: TicketMessageDto }) {
  const isInternal = msg.visibility === MessageVisibility.Internal;
  return (
    <div className={cn("flex gap-3", isInternal && "opacity-75")}>
      <div className="w-7 h-7 rounded-full bg-bg-subtle shrink-0 flex items-center justify-center text-xs font-semibold text-fg-muted mt-0.5">
        {(msg.authorName ?? "?")[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-fg">{msg.authorName ?? "Unknown"}</span>
          {isInternal && (
            <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded font-medium">Internal</span>
          )}
          <span className="text-xs text-fg-muted">{formatRelative(msg.createdAt)}</span>
        </div>
        <div className="bg-bg-subtle rounded-xl rounded-tl-sm px-4 py-3 text-sm text-fg whitespace-pre-wrap leading-relaxed">
          {msg.body}
        </div>
        {msg.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {msg.attachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Paperclip size={11} />
                {a.fileName ?? "Attachment"}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id!);
  const updateStatus = useUpdateTicketStatus();
  const postMessage = usePostTicketMessage(id!);
  const toggleChecklist = useToggleChecklistItem(id!);

  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const body = msgBody.trim();
    if (!body) return;
    setSending(true);
    try {
      await postMessage.mutateAsync({ body, visibility: MessageVisibility.Public });
      setMsgBody("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await updateStatus.mutateAsync({ id: id!, status: newStatus as never });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
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
          <Link to="/me/host/tickets">Back to maintenance</Link>
        </Button>
      </div>
    );
  }

  const publicMessages = ticket.messages.filter((m) => m.visibility === MessageVisibility.Public);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Link to="/me/host/tickets" className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-fg-muted">{ticket.displayId}</span>
          <span className="text-base">{ticketKindIcon(ticket.kind)}</span>
          <h1 className="text-lg font-semibold text-fg leading-snug">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 items-start">
        {/* LEFT: Description + checklist + messages */}
        <div className="space-y-5">
          {/* Description */}
          {ticket.description && (
            <div className="bg-bg-card rounded-xl shadow-card p-5">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          {/* Checklist */}
          {(ticket.checklistItems?.length ?? 0) > 0 && (
            <div className="bg-bg-card rounded-xl shadow-card p-5">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-3">Checklist</p>
              <div className="space-y-2">
                {ticket.checklistItems!.map((item) => (
                  <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => toggleChecklist.mutate({ itemId: item.id, done: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-border accent-brand"
                    />
                    <span className={cn("text-sm", item.done ? "line-through text-fg-muted" : "text-fg")}>
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="bg-bg-card rounded-xl shadow-card p-5">
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-4">
              Messages {publicMessages.length > 0 && `(${publicMessages.length})`}
            </p>
            {publicMessages.length > 0 ? (
              <div className="space-y-4 mb-5">
                {publicMessages.map((m) => <MessageBubble key={m.id} msg={m} />)}
              </div>
            ) : (
              <p className="text-sm text-fg-muted mb-4">No messages yet.</p>
            )}

            {/* Compose */}
            <div className="border-t border-border pt-4">
              <Textarea
                placeholder="Write a message..."
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                rows={3}
                className="mb-2 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                }}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                  onClick={handleSend}
                  disabled={!msgBody.trim() || sending}
                >
                  <Send size={13} className="mr-1.5" />Send
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Meta card */}
        <div className="space-y-4 lg:sticky lg:top-24">
          {/* Status + actions */}
          <div className="bg-bg-card rounded-xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={cn("text-xs font-medium", ticketStatusColor(ticket.status))}>
                {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
              </Badge>
              <span className="text-sm">{ticketKindIcon(ticket.kind)}</span>
              <span className="text-xs text-fg-muted">{ticketKindLabel(ticket.kind)}</span>
            </div>

            {ticket.allowedNextStatuses.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-fg-muted mb-1.5">Change status</p>
                <Select onValueChange={handleStatusChange} disabled={updateStatus.isPending}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticket.allowedNextStatuses.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-0.5">
              <InfoRow label="Priority">{ticket.priority}</InfoRow>
              {ticket.assetName && <InfoRow label="Property">{ticket.assetName}</InfoRow>}
              {ticket.scheduledFor && <InfoRow label="Scheduled">{formatDate(ticket.scheduledFor)}</InfoRow>}
              {ticket.dueDate && <InfoRow label="Due">{formatDate(ticket.dueDate)}</InfoRow>}
              {ticket.estimatedCost > 0 && (
                <InfoRow label="Est. cost">{formatThb(ticket.estimatedCost)}</InfoRow>
              )}
              {ticket.actualCost != null && (
                <InfoRow label="Actual cost">{formatThb(ticket.actualCost)}</InfoRow>
              )}
              <InfoRow label="Opened">{formatDateTime(ticket.createdAt)}</InfoRow>
              {ticket.completedAt && <InfoRow label="Completed">{formatDate(ticket.completedAt)}</InfoRow>}
            </div>
          </div>

          {/* Media */}
          {ticket.mediaUrls.length > 0 && (
            <div className="bg-bg-card rounded-xl shadow-card p-5">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-3">Photos</p>
              <div className="grid grid-cols-3 gap-1.5">
                {ticket.mediaUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden rounded-lg">
                    <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Child tickets */}
          {ticket.children.length > 0 && (
            <div className="bg-bg-card rounded-xl shadow-card p-5">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-3">Sub-tickets</p>
              <div className="space-y-1.5">
                {ticket.children.map((c) => (
                  <Link
                    key={c.id}
                    to={`/me/host/tickets/${c.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-subtle transition-colors"
                  >
                    <span className="text-sm">{ticketKindIcon(c.kind)}</span>
                    <span className="text-xs text-fg flex-1 line-clamp-1">{c.title}</span>
                    <Badge className={cn("text-[10px] font-medium shrink-0", ticketStatusColor(c.status))}>
                      {TICKET_STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
