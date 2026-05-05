import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickets } from "@/lib/hooks/use-tickets";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { formatRelative } from "@/lib/utils/format";

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

export default function LandlordTickets() {
  const { data: tickets, isLoading } = useTickets();

  return (
    <div className="bm-page">
      <div className="bm-divider">— Tickets</div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : !tickets?.length ? (
        <div className="bm-cell bm-cell--first">
          <p className="bm-meta" style={{ textAlign: "center", padding: "20px 0" }}>
            No tickets yet.
          </p>
        </div>
      ) : (
        <div>
          {tickets.map((t, i) => (
            <Link key={t.id} to={`/landlord/tickets/${t.id}`} style={{ textDecoration: "none" }}>
              <div className={`bm-cell${i === 0 ? " bm-cell--first" : ""}`}>
                <div className="bm-cell__head">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{ticketKindIcon(t.kind)}</span>
                    <span className={priorityBm(t.priority)}>{t.priority}</span>
                    <span className={ticketStatusBm(t.status)}>{t.status}</span>
                  </div>
                  <span className="bm-meta">{formatRelative(t.createdAt)}</span>
                </div>
                <div className="bm-cell__title">{t.title}</div>
                {t.assetName && <div className="bm-cell__sub">{t.assetName}</div>}
                <span className="bm-cell__arrow">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="bm-meta" style={{ marginTop: 16, textAlign: "center" }}>
        {tickets?.length ?? 0} ticket{tickets?.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
