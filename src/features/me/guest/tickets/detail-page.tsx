import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle2, RotateCcw, AlertCircle, Paperclip, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTicket, usePostTicketMessage, useUpdateTicketStatus } from "@/lib/hooks/use-tickets";
import { formatRelative } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon, tenantTicketStatusLabel } from "@/lib/utils/ticket-status";
import { MessageVisibility, TicketStatus } from "@/lib/types/enums";
import type { TicketMessageDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

// What each status means to the tenant + (optionally) what they should expect next.
const TENANT_STATUS_HINTS: Record<string, string> = {
  Reported: "Your host has been notified and will review this soon.",
  Triaging: "Your host is reviewing the report.",
  Quoted: "Your host has a quote — they're deciding whether to proceed.",
  PendingApproval: "Your host is reviewing an approval before scheduling work.",
  Approved: "Approved — work should be scheduled shortly.",
  InProgress: "Work is underway.",
  Blocked: "Stuck on something. Check messages for context — your host may need information from you.",
  Verified: "Your host marked the work as done. Confirm it's resolved or reopen if not.",
  Closed: "This issue is closed. If it recurs, reopen below.",
  Completed: "This issue is closed. If it recurs, reopen below.",
  Reopened: "Re-opened — your host has been notified again.",
  Cancelled: "This ticket was cancelled.",
  Rejected: "Your host declined to act on this.",
};

function isImageAttachment(a: { contentType?: string; fileName?: string; url: string }): boolean {
  // Server-provided contentType is the source of truth when present; fall back
  // to the filename heuristic for legacy records that lack it.
  if (a.contentType) return a.contentType.startsWith("image/");
  return /\.(png|jpe?g|gif|webp|heic)$/i.test(a.fileName ?? a.url);
}

function MessageBubble({ msg, isMine }: { msg: TicketMessageDto; isMine: boolean }) {
  const imageAttachments = (msg.attachments ?? []).filter(isImageAttachment);
  const otherAttachments = (msg.attachments ?? []).filter((a) => !imageAttachments.includes(a));
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
        {msg.body && (
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
        )}
        {imageAttachments.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5 mt-2", isMine && "justify-end")}>
            {imageAttachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-20 h-20 rounded-lg overflow-hidden bg-bg-subtle"
              >
                <img src={a.url} alt={a.fileName ?? ""} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        )}
        {otherAttachments.length > 0 && (
          <div className={cn("flex flex-wrap gap-2 mt-2", isMine && "justify-end")}>
            {otherAttachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
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

export function GuestTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id!);
  const postMessage = usePostTicketMessage(id!);
  const updateStatus = useUpdateTicketStatus();

  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSend() {
    const text = body.trim();
    if (!text && attachments.length === 0) return;
    setSending(true);
    try {
      await postMessage.mutateAsync({
        body: text,
        visibility: MessageVisibility.Public,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setBody("");
      setAttachments([]);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus: string, successMsg: string) {
    try {
      await updateStatus.mutateAsync({ id: id!, status: newStatus as TicketStatus });
      toast.success(successMsg);
    } catch {
      toast.error("Failed to update status");
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
  const statusLabel = tenantTicketStatusLabel(ticket.status);
  const statusHint = TENANT_STATUS_HINTS[ticket.status] ?? null;

  // Surface the two transitions a tenant ever needs: confirm Verified work as Closed,
  // or reopen something marked done/closed. Anything else is host-side.
  const allowed = ticket.allowedNextStatuses ?? [];
  const canConfirmClose = allowed.includes("Closed" as TicketStatus);
  const canReopen = allowed.includes("Reopened" as TicketStatus);
  const isVerified = ticket.status === "Verified";
  const isClosedLike = ticket.status === "Closed" || ticket.status === "Completed";

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
            {statusLabel}
          </span>
        </div>
        {statusHint && (
          <p className="text-xs text-fg-muted leading-relaxed mt-3 pt-3 border-t border-border">
            {statusHint}
          </p>
        )}
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

      {/* Verified prompt — tenant must confirm or reopen */}
      {isVerified && (canConfirmClose || canReopen) && (
        <div className="bg-warning/8 border border-warning/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">Your host marked this as done</p>
              <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                If the issue is truly fixed, close it. If it's still broken or came back, reopen it so your host knows.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {canReopen && (
              <Button
                variant="outline"
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => handleStatusChange("Reopened", "Re-opened — your host will be notified")}
                className="flex-1 rounded-lg h-9 text-xs border-danger/30 text-danger hover:bg-danger/5"
              >
                <RotateCcw size={12} className="mr-1.5" />Not fixed — reopen
              </Button>
            )}
            {canConfirmClose && (
              <Button
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => handleStatusChange("Closed", "Issue confirmed fixed — thanks!")}
                className="flex-1 bg-success hover:bg-success/90 text-white rounded-lg h-9 text-xs"
              >
                <CheckCircle2 size={12} className="mr-1.5" />Confirm fixed
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Reopen-only prompt for closed tickets that recur */}
      {!isVerified && isClosedLike && canReopen && (
        <Button
          variant="outline"
          size="sm"
          disabled={updateStatus.isPending}
          onClick={() => handleStatusChange("Reopened", "Re-opened — your host will be notified")}
          className="w-full rounded-lg h-9 text-xs"
        >
          <RotateCcw size={12} className="mr-1.5" />
          {updateStatus.isPending ? "Re-opening…" : "Reopen this issue"}
        </Button>
      )}

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
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs bg-bg-subtle text-fg-muted rounded-full pl-2.5 pr-1 py-0.5"
                >
                  <Paperclip size={10} />
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((arr) => arr.filter((_, j) => j !== i))}
                    className="w-4 h-4 rounded-full hover:bg-border flex items-center justify-center text-fg-muted hover:text-fg"
                  >
                    <XIcon size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              setAttachments((arr) => [...arr, ...Array.from(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sending}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg gap-1.5 h-8 text-xs"
            >
              <Paperclip size={12} />
              Attach
            </Button>
            <Button
              size="sm"
              disabled={(!body.trim() && attachments.length === 0) || sending}
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
