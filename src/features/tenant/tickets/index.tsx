import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickets, useCreateTicket } from "@/lib/hooks/use-tickets";
import { useMyBookings } from "@/lib/hooks/use-bookings";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { formatRelative } from "@/lib/utils/format";
import { TicketType, BookingStatus } from "@/lib/types/enums";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function ticketStatusBm(s: string) {
  if (["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(s)) return "bm-status bm-status--neutral";
  if (["Blocked", "Rejected"].includes(s)) return "bm-status bm-status--live";
  if (["InProgress", "Approved"].includes(s)) return "bm-status bm-status--ok";
  if (["PendingApproval", "Pending", "Triaging", "Quoted"].includes(s)) return "bm-status bm-status--warn";
  return "bm-status bm-status--neutral";
}

export default function TenantTickets() {
  const { data: tickets, isLoading } = useTickets();
  const { data: bookings } = useMyBookings();
  const createTicket = useCreateTicket();
  const navigate = useNavigate();

  const activeBooking = bookings?.find(
    (b) => b.status !== BookingStatus.Completed && b.status !== BookingStatus.Cancelled,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>(TicketType.Maintenance);

  async function handleCreate() {
    if (!activeBooking || !title.trim()) return;
    try {
      const result = await createTicket.mutateAsync({
        assetId: activeBooking.assetId,
        bookingId: activeBooking.id,
        title: title.trim(),
        description,
        type,
        estimatedCost: 0,
      });
      toast.success("Ticket submitted");
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      navigate(`/tenant/tickets/${result.id}`);
    } catch {
      toast.error("Failed to submit ticket");
    }
  }

  return (
    <div className="bm-page">
      {/* Page head */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 className="bm-display" style={{ marginBottom: 0 }}>My <em className="acc">Tickets</em></h1>
        {activeBooking && (
          <button className="bm-btn bm-btn--sm" onClick={() => setCreateOpen(true)}>
            [Report issue]
          </button>
        )}
      </div>

      <div className="bm-divider">— Open &amp; Recent</div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : !tickets?.length ? (
        <div className="bm-cell bm-cell--first" style={{ textAlign: "center" }}>
          <p className="bm-meta" style={{ padding: "20px 0" }}>No tickets yet.</p>
          {activeBooking && (
            <button className="bm-btn" onClick={() => setCreateOpen(true)} style={{ marginBottom: 16 }}>
              [Report an issue]
            </button>
          )}
        </div>
      ) : (
        <div>
          {tickets.map((t, i) => (
            <Link key={t.id} to={`/tenant/tickets/${t.id}`} style={{ textDecoration: "none" }}>
              <div className={`bm-cell${i === 0 ? " bm-cell--first" : ""}`}>
                <div className="bm-cell__head">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{ticketKindIcon(t.kind)}</span>
                    <span className={ticketStatusBm(t.status)}>{t.status}</span>
                  </div>
                  <span className="bm-meta">{formatRelative(t.createdAt)}</span>
                </div>
                <div className="bm-cell__title">{t.title}</div>
                <span className="bm-cell__arrow">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create ticket dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="adm-modal max-w-md p-0 gap-0 overflow-hidden [&>button]:hidden">
          <div className="adm-modal__head">
            <div>
              <div className="adm-modal__title">Report an issue</div>
              <div className="adm-modal__sub">Describe what you need help with.</div>
            </div>
          </div>
          <div className="adm-modal__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontFamily: "var(--bm-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--bm-ink-4)", display: "block", marginBottom: 6 }}>
                Category
              </label>
              <select
                className="bm-input"
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                style={{ width: "100%" }}
              >
                {Object.values(TicketType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "var(--bm-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--bm-ink-4)", display: "block", marginBottom: 6 }}>
                Title *
              </label>
              <input
                className="bm-input"
                placeholder="Brief description of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontFamily: "var(--bm-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--bm-ink-4)", display: "block", marginBottom: 6 }}>
                Details
              </label>
              <textarea
                className="bm-input"
                placeholder="What happened? When? Where?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
          </div>
          <div className="adm-modal__foot">
            <button className="adm-btn adm-btn--ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button
              className="adm-btn adm-btn--ink"
              onClick={handleCreate}
              disabled={createTicket.isPending || !title.trim()}
            >
              {createTicket.isPending ? "Submitting…" : "Submit"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
