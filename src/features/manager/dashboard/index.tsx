import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Building2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceOverview } from "@/lib/hooks/use-finance";
import { useTickets } from "@/lib/hooks/use-tickets";
import { useAssets } from "@/lib/hooks/use-assets";
import { formatThb, formatRelative, formatDate } from "@/lib/utils/format";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { useAuthStore } from "@/lib/stores/auth.store";

const CLOSED_STATUSES = new Set(["Closed", "Completed", "Cancelled", "Canceled", "Verified"]);
const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };

function priorityTag(p: string) {
  if (p === "Urgent") return "adm-tag adm-tag--danger";
  if (p === "High")   return "adm-tag adm-tag--warn";
  if (p === "Normal") return "adm-tag adm-tag--neutral";
  return "adm-tag adm-tag--neutral";
}

function occupancyTag(status: string) {
  if (status === "Occupied")       return "adm-tag adm-tag--success";
  if (status === "ActionRequired") return "adm-tag adm-tag--danger";
  return "adm-tag adm-tag--neutral";
}

function occupancyLabel(status: string) {
  if (status === "ActionRequired") return "Action needed";
  return status;
}

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const { data: overview, isLoading: overviewLoading } = useFinanceOverview();
  const { data: allTickets, isLoading: ticketsLoading } = useTickets();
  const { data: assets, isLoading: assetsLoading } = useAssets();

  const openTickets = (allTickets ?? [])
    .filter((t) => !CLOSED_STATUSES.has(t.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const pct = overview?.changePercent ?? 0;
  const pctUp = pct > 0;
  const pctFlat = pct === 0;
  const occupied = assets?.filter((a) => a.occupancyStatus === "Occupied").length ?? 0;
  const todayStr = formatDate(new Date().toISOString());

  return (
    <div>
      {/* ── PAGE HEAD ──────────────────────────────────────────────────────── */}
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">
            {todayStr} · PMC Workspace
          </div>
          <h1 className="adm-pagehead__title">
            {user?.firstName ? <>Good morning, <em>{user.firstName}</em></> : "Dashboard"}
          </h1>
        </div>
        <div className="adm-pagehead__actions">
          <Link to="/manager/tickets/new" className="adm-btn adm-btn--sm">
            <Plus size={13} /> New ticket
          </Link>
        </div>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────────────────── */}
      <div className="adm-kpi-row" style={{ marginBottom: 24 }}>
        <div className="adm-kpi">
          <div className="adm-kpi__label">This month</div>
          {overviewLoading
            ? <Skeleton className="h-7 w-32 mt-1" />
            : <div className="adm-kpi__value">{formatThb(overview?.currentMonthIncome ?? 0)}</div>
          }
          {!overviewLoading && (
            <div className={`adm-kpi__delta ${pctFlat ? "adm-kpi__delta--flat" : pctUp ? "adm-kpi__delta--up" : "adm-kpi__delta--down"}`}>
              {pctUp ? <TrendingUp size={11} /> : pctFlat ? null : <TrendingDown size={11} />}
              {pct > 0 ? "+" : ""}{pct.toFixed(1)}% vs last month
            </div>
          )}
        </div>

        <div className="adm-kpi">
          <div className="adm-kpi__label">Projected (EOM)</div>
          {overviewLoading
            ? <Skeleton className="h-7 w-32 mt-1" />
            : <div className="adm-kpi__value">{formatThb(overview?.projectedEndOfMonth ?? 0)}</div>
          }
        </div>

        <div className="adm-kpi">
          <div className="adm-kpi__label">Properties</div>
          {assetsLoading
            ? <Skeleton className="h-7 w-16 mt-1" />
            : <div className="adm-kpi__value">{assets?.length ?? 0}</div>
          }
          {!assetsLoading && (
            <div className="adm-kpi__delta adm-kpi__delta--flat">
              {occupied} occupied · {(assets?.length ?? 0) - occupied} vacant
            </div>
          )}
        </div>

        <div className="adm-kpi">
          <div className="adm-kpi__label">Open tickets</div>
          {ticketsLoading
            ? <Skeleton className="h-7 w-16 mt-1" />
            : <div className="adm-kpi__value">{openTickets.length}</div>
          }
          {!ticketsLoading && openTickets.length > 0 && (
            <div className="adm-kpi__delta adm-kpi__delta--down">
              {openTickets.filter(t => t.priority === "Urgent" || t.priority === "High").length} high-priority
            </div>
          )}
        </div>
      </div>

      {/* ── 2-COL GRID ─────────────────────────────────────────────────────── */}
      <div className="adm-2col-wide">

        {/* Open Tickets ─────────────────────────────────────────── */}
        <div className="adm-card">
          <div className="adm-card__head">
            <div>
              <div className="adm-card__title">Open tickets</div>
              {!ticketsLoading && openTickets.length > 0 && (
                <div className="adm-card__sub">sorted by priority</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link to="/manager/tickets/new" className="adm-btn adm-btn--sm">
                <Plus size={12} />New
              </Link>
              <Link to="/manager/tickets" className="adm-btn adm-btn--sm adm-btn--ghost">
                View all
              </Link>
            </div>
          </div>

          {ticketsLoading ? (
            <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !openTickets.length ? (
            <div className="adm-empty">
              <span style={{ fontSize: 24 }}>🎉</span>
              <div style={{ fontWeight: 500, fontSize: 14 }}>All clear</div>
              <div style={{ fontSize: 12 }}>No open tickets right now.</div>
            </div>
          ) : (
            <table className="adm-table">
              <tbody>
                {openTickets.slice(0, 7).map((t) => (
                  <tr key={t.id}>
                    <td style={{ width: 28, paddingLeft: 20 }}>
                      <span style={{ fontSize: 15 }}>{ticketKindIcon(t.kind)}</span>
                    </td>
                    <td>
                      <Link to={`/manager/tickets/${t.id}`} style={{ textDecoration: "none", display: "block" }}>
                        <div className="adm-table__title">{t.title}</div>
                        <div className="adm-table__sub">{t.assetName}</div>
                      </Link>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 8 }}>
                      <span className={priorityTag(t.priority)}>{t.priority}</span>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 20 }}>
                      <span className="adm-table__num">{formatRelative(t.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Properties ───────────────────────────────────────────── */}
        <div className="adm-card">
          <div className="adm-card__head">
            <div className="adm-card__title">Properties</div>
            <Link to="/manager/assets" className="adm-btn adm-btn--sm adm-btn--ghost">
              View all
            </Link>
          </div>

          {assetsLoading ? (
            <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !assets?.length ? (
            <div className="adm-empty">
              <Building2 size={24} style={{ opacity: 0.4 }} />
              <div style={{ fontWeight: 500, fontSize: 14 }}>No properties yet</div>
              <div style={{ fontSize: 12 }}>Add your first property to get started.</div>
            </div>
          ) : (
            <table className="adm-table">
              <tbody>
                {assets.slice(0, 7).map((a) => (
                  <tr key={a.id}>
                    <td style={{ paddingLeft: 20 }}>
                      <Link to={`/manager/assets/${a.id}`} style={{ textDecoration: "none", display: "block" }}>
                        <div className="adm-table__title">{a.internalName}</div>
                        {a.currentTenantName && (
                          <div className="adm-table__sub">{a.currentTenantName}</div>
                        )}
                      </Link>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 20 }}>
                      <span className={occupancyTag(a.occupancyStatus)}>
                        {occupancyLabel(a.occupancyStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
