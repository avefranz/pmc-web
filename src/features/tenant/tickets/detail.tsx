import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicket, usePostTicketMessage } from "@/lib/hooks/use-tickets";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { formatRelative, formatDate } from "@/lib/utils/format";
import { MessageVisibility } from "@/lib/types/enums";
import { toast } from "sonner";

function ticketStatusBm(s: string) {
  if (["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(s)) return "bm-status bm-status--neutral";
  if (["Blocked", "Rejected"].includes(s)) return "bm-status bm-status--live";
  if (["InProgress", "Approved"].includes(s)) return "bm-status bm-status--ok";
  if (["PendingApproval", "Pending", "Triaging", "Quoted"].includes(s)) return "bm-status bm-status--warn";
  return "bm-status bm-status--neutral";
}

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

  if (isLoading) {
    return (
      <div className="bm-page">
        <Skeleton className="h-7 w-48 mb-3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!ticket) return <div className="bm-page"><p className="bm-meta">Not found.</p></div>;

  return (
    <div className="bm-page">
      <button onClick={() => navigate(-1)} className="bm-pagehead__back">← Back</button>

      {/* Header */}
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{ticketKindIcon(ticket.kind)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: "var(--bm-sans)",
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.3,
              marginBottom: 4,
            }}>{ticket.title}</h1>
            <p className="bm-meta">{formatDate(ticket.createdAt)}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span className={ticketStatusBm(ticket.status)}>{ticket.status}</span>
          <span className="bm-status bm-status--neutral">{ticket.type}</span>
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <>
          <div className="bm-divider">— Your report</div>
          <div className="bm-cell bm-cell--first">
            <p style={{
              fontFamily: "var(--bm-sans)",
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}>{ticket.description}</p>
          </div>
        </>
      )}

      {/* Messages */}
      <div className="bm-divider">— Messages</div>
      {publicMessages.length === 0 ? (
        <div className="bm-cell bm-cell--first">
          <p className="bm-meta">No messages yet. Your manager will reply here.</p>
        </div>
      ) : (
        publicMessages.map((m, i) => (
          <div key={m.id} className={`bm-cell${i === 0 ? " bm-cell--first" : ""}`}>
            <div className="bm-cell__head">
              <span style={{ fontFamily: "var(--bm-mono)", fontSize: 11, fontWeight: 600 }}>
                {m.authorName ?? "Manager"}
              </span>
              <span className="bm-meta">{formatRelative(m.createdAt)}</span>
            </div>
            <p style={{
              fontFamily: "var(--bm-sans)",
              fontSize: 13,
              lineHeight: 1.6,
              marginTop: 4,
              whiteSpace: "pre-wrap",
            }}>{m.body}</p>
          </div>
        ))
      )}

      {/* Compose */}
      <div style={{ marginTop: 20 }}>
        <div className="bm-divider">— Add comment</div>
        <textarea
          className="bm-input"
          placeholder="Add a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{ width: "100%", resize: "vertical", marginBottom: 10 }}
        />
        <button
          className="bm-btn"
          onClick={handleSend}
          disabled={postMessage.isPending || !body.trim()}
          style={{ width: "100%" }}
        >
          {postMessage.isPending ? "[Sending…]" : "[Send]"}
        </button>
      </div>
    </div>
  );
}
