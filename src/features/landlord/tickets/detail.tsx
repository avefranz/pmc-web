import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicket } from "@/lib/hooks/use-tickets";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { formatRelative, formatDate } from "@/lib/utils/format";
import { MessageVisibility } from "@/lib/types/enums";

function ticketStatusBm(s: string) {
  if (["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(s)) return "bm-status bm-status--neutral";
  if (["Blocked", "Rejected"].includes(s)) return "bm-status bm-status--live";
  if (["InProgress", "Approved"].includes(s)) return "bm-status bm-status--ok";
  if (["PendingApproval", "Pending", "Triaging", "Quoted"].includes(s)) return "bm-status bm-status--warn";
  return "bm-status bm-status--neutral";
}

function priorityBm(p: string) {
  if (p === "Urgent") return "bm-status bm-status--live";
  if (p === "High")   return "bm-status bm-status--warn";
  return "bm-status bm-status--neutral";
}

export default function LandlordTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading } = useTicket(id!);

  if (isLoading) {
    return (
      <div className="bm-page">
        <Skeleton className="h-7 w-48 mb-3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!ticket) return <div className="bm-page"><p className="bm-meta">Ticket not found.</p></div>;

  const publicMessages = ticket.messages.filter((m) => m.visibility === MessageVisibility.Public);

  return (
    <div className="bm-page">
      <button onClick={() => navigate(-1)} className="bm-pagehead__back">← Back</button>

      {/* Header */}
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{ticketKindIcon(ticket.kind)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bm-meta" style={{ marginBottom: 4 }}>{ticket.displayId}</p>
            <h1 style={{
              fontFamily: "var(--bm-sans)",
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.3,
              marginBottom: 6,
            }}>{ticket.title}</h1>
            {ticket.assetName && <p className="bm-meta">{ticket.assetName}</p>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span className={ticketStatusBm(ticket.status)}>{ticket.status}</span>
          <span className={priorityBm(ticket.priority)}>{ticket.priority}</span>
          <span className="bm-status bm-status--neutral">{ticket.kind}</span>
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <>
          <div className="bm-divider">— Description</div>
          <div className="bm-cell bm-cell--first">
            <p style={{
              fontFamily: "var(--bm-sans)",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--bm-ink)",
              whiteSpace: "pre-wrap",
            }}>{ticket.description}</p>
            <p className="bm-meta" style={{ marginTop: 8 }}>Created {formatDate(ticket.createdAt)}</p>
          </div>
        </>
      )}

      {/* Messages */}
      <div className="bm-divider">— Messages</div>
      {publicMessages.length === 0 ? (
        <div className="bm-cell bm-cell--first">
          <p className="bm-meta">No messages yet.</p>
        </div>
      ) : (
        publicMessages.map((m, i) => (
          <div key={m.id} className={`bm-cell${i === 0 ? " bm-cell--first" : ""}`}>
            <div className="bm-cell__head">
              <span style={{ fontFamily: "var(--bm-mono)", fontSize: 11, fontWeight: 600 }}>
                {m.authorName ?? "—"}
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
    </div>
  );
}
