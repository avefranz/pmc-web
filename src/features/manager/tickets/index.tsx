import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickets } from "@/lib/hooks/use-tickets";
import { formatRelative } from "@/lib/utils/format";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { TicketStatus, TicketKind, TicketPriority } from "@/lib/types/enums";

function priorityTag(p: string) {
  if (p === "Urgent") return "adm-tag adm-tag--danger";
  if (p === "High")   return "adm-tag adm-tag--warn";
  if (p === "Normal") return "adm-tag adm-tag--neutral";
  return "adm-tag adm-tag--neutral";
}

function statusTag(s: string) {
  if (["Closed", "Completed", "Cancelled", "Canceled"].includes(s)) return "adm-tag adm-tag--neutral";
  if (["Verified"].includes(s))                                       return "adm-tag adm-tag--success";
  if (["Blocked", "Rejected"].includes(s))                           return "adm-tag adm-tag--danger";
  if (["InProgress", "Approved"].includes(s))                        return "adm-tag adm-tag--ink";
  if (["PendingApproval", "Pending", "Triaging", "Quoted"].includes(s)) return "adm-tag adm-tag--warn";
  return "adm-tag adm-tag--neutral";
}

export default function TicketsPage() {
  const [params, setParams] = useSearchParams();
  const { data: tickets, isLoading } = useTickets();

  const statusFilter   = params.get("status")   ?? "all";
  const kindFilter     = params.get("kind")      ?? "all";
  const priorityFilter = params.get("priority")  ?? "all";
  const hasFilter = statusFilter !== "all" || kindFilter !== "all" || priorityFilter !== "all";

  const filtered = (tickets ?? []).filter((t) => {
    if (statusFilter   !== "all" && t.status   !== statusFilter)   return false;
    if (kindFilter     !== "all" && t.kind     !== kindFilter)     return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  return (
    <div>
      {/* ── PAGE HEAD ──────────────────────────────────────────────────────── */}
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">Workspace · Tickets</div>
          <h1 className="adm-pagehead__title">Tickets</h1>
        </div>
        <div className="adm-pagehead__actions">
          <Link to="/manager/tickets/new" className="adm-btn adm-btn--ink">
            <Plus size={13} /> New ticket
          </Link>
        </div>
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────────────────── */}
      <div className="adm-filterbar">
        <select
          className={`adm-select${statusFilter !== "all" ? " adm-select--active" : ""}`}
          value={statusFilter}
          onChange={e => setFilter("status", e.target.value)}
        >
          <option value="all">All statuses</option>
          {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className={`adm-select${kindFilter !== "all" ? " adm-select--active" : ""}`}
          value={kindFilter}
          onChange={e => setFilter("kind", e.target.value)}
        >
          <option value="all">All kinds</option>
          {Object.values(TicketKind).map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <select
          className={`adm-select${priorityFilter !== "all" ? " adm-select--active" : ""}`}
          value={priorityFilter}
          onChange={e => setFilter("priority", e.target.value)}
        >
          <option value="all">All priorities</option>
          {Object.values(TicketPriority).map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {hasFilter && (
          <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setParams({})}>
            Clear filters
          </button>
        )}

        {!isLoading && (
          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.08em" }}>
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── LIST ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="adm-card">
          <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      ) : !filtered.length ? (
        <div className="adm-empty" style={{ marginTop: 0 }}>
          <span style={{ fontSize: 28 }}>🎫</span>
          <div style={{ fontWeight: 600, fontSize: 15 }}>No tickets found</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
            {tickets?.length ? "Try adjusting your filters." : "Create your first ticket to get started."}
          </div>
          {!tickets?.length && (
            <Link to="/manager/tickets/new" className="adm-btn adm-btn--ink">
              <Plus size={13} /> Create ticket
            </Link>
          )}
        </div>
      ) : (
        <div className="adm-card">
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Ticket</th>
                <th>Priority</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ paddingLeft: 20 }}>
                    <span style={{ fontSize: 15 }}>{ticketKindIcon(t.kind)}</span>
                  </td>
                  <td>
                    <Link to={`/manager/tickets/${t.id}`} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="adm-table__num">{t.displayId}</span>
                        {t.assetName && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.08em" }}>· {t.assetName}</span>}
                      </div>
                      <div className="adm-table__title" style={{ marginTop: 2 }}>{t.title}</div>
                    </Link>
                  </td>
                  <td>
                    <span className={priorityTag(t.priority)}>{t.priority}</span>
                  </td>
                  <td>
                    <span className={statusTag(t.status)}>{t.status}</span>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 20 }}>
                    <span className="adm-table__num">{formatRelative(t.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
