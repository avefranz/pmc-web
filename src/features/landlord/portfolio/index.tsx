import { Link } from "react-router-dom";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssets } from "@/lib/hooks/use-assets";
import { useFinanceOverview } from "@/lib/hooks/use-finance";
import { formatThb } from "@/lib/utils/format";
import { useAuthStore } from "@/lib/stores/auth.store";

function occupancyTag(status: string) {
  if (status === "Occupied")       return "adm-tag adm-tag--success";
  if (status === "ActionRequired") return "adm-tag adm-tag--danger";
  return "adm-tag adm-tag--neutral";
}

export default function LandlordPortfolio() {
  const { user } = useAuthStore();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: overview, isLoading: ovLoading } = useFinanceOverview();

  const pct = overview?.changePercent ?? 0;
  const pctUp = pct > 0;
  const occupied = assets?.filter((a) => a.occupancyStatus === "Occupied").length ?? 0;

  return (
    <div className="adm-page" style={{ paddingBottom: 100 }}>
      {/* ── PAGE HEAD ──────────────────────────────────────────────────────── */}
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">Landlord · Portfolio</div>
          <h1 className="adm-pagehead__title">
            {user?.firstName ? <>Hello, <em>{user.firstName}</em></> : "My Properties"}
          </h1>
        </div>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────────────────── */}
      <div className="adm-kpi-row" style={{ marginBottom: 24 }}>
        <div className="adm-kpi">
          <div className="adm-kpi__label">This month</div>
          {ovLoading
            ? <Skeleton className="h-7 w-32 mt-1" />
            : <div className="adm-kpi__value">{formatThb(overview?.currentMonthIncome ?? 0)}</div>
          }
          {!ovLoading && (
            <div className={`adm-kpi__delta ${pct === 0 ? "adm-kpi__delta--flat" : pctUp ? "adm-kpi__delta--up" : "adm-kpi__delta--down"}`}>
              {pctUp ? <TrendingUp size={11} /> : pct < 0 ? <TrendingDown size={11} /> : null}
              {pct > 0 ? "+" : ""}{pct.toFixed(1)}% vs last month
            </div>
          )}
        </div>

        <div className="adm-kpi">
          <div className="adm-kpi__label">Projected (EOM)</div>
          {ovLoading
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
              {occupied} occupied
            </div>
          )}
        </div>
      </div>

      {/* ── PROPERTIES LIST ────────────────────────────────────────────────── */}
      <div className="adm-card">
        <div className="adm-card__head">
          <div className="adm-card__title">Properties</div>
        </div>

        {assetsLoading ? (
          <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !assets?.length ? (
          <div className="adm-empty">
            <Building2 size={24} style={{ opacity: 0.4 }} />
            <div style={{ fontWeight: 500, fontSize: 14 }}>No properties</div>
            <div style={{ fontSize: 12 }}>Contact your manager to get access.</div>
          </div>
        ) : (
          <table className="adm-table">
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td style={{ paddingLeft: 20, width: 36 }}>
                    <div style={{
                      width: 32, height: 32,
                      background: "rgba(224,148,92,0.12)",
                      border: "1px solid rgba(224,148,92,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Building2 size={14} style={{ color: "#E0945C" }} />
                    </div>
                  </td>
                  <td>
                    <Link to={`/landlord/assets/${a.id}`} style={{ textDecoration: "none", display: "block" }}>
                      <div className="adm-table__title">{a.internalName}</div>
                      {a.currentTenantName && (
                        <div className="adm-table__sub">{a.currentTenantName}</div>
                      )}
                    </Link>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 20 }}>
                    <span className={occupancyTag(a.occupancyStatus)}>
                      {a.occupancyStatus === "ActionRequired" ? "Action needed" : a.occupancyStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
