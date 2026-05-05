import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsset, useAssetSummary } from "@/lib/hooks/use-assets";
import { useBookingsByAsset } from "@/lib/hooks/use-bookings";
import { useTicketsByAsset } from "@/lib/hooks/use-tickets";
import { formatThb, formatDate } from "@/lib/utils/format";
import { ticketKindIcon } from "@/lib/utils/ticket-status";

function bookingStatusBm(s: string) {
  if (s === "Active") return "bm-status bm-status--ok";
  if (s === "Confirmed") return "bm-status bm-status--warn";
  return "bm-status bm-status--neutral";
}

function ticketStatusBm(s: string) {
  if (["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(s)) return "bm-status bm-status--neutral";
  if (["Blocked", "Rejected"].includes(s)) return "bm-status bm-status--live";
  if (["InProgress", "Approved"].includes(s)) return "bm-status bm-status--ok";
  if (["PendingApproval", "Pending", "Triaging", "Quoted"].includes(s)) return "bm-status bm-status--warn";
  return "bm-status bm-status--neutral";
}

function occupancyBm(s: string) {
  if (s === "Occupied") return "bm-status bm-status--ok";
  if (s === "ActionRequired") return "bm-status bm-status--live";
  return "bm-status bm-status--neutral";
}

function occupancyLabel(s: string) {
  if (s === "ActionRequired") return "Action needed";
  return s;
}

export default function LandlordAssetDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: asset, isLoading } = useAsset(id!);
  const { data: summary } = useAssetSummary(id!);
  const { data: bookings } = useBookingsByAsset(id!);
  const { data: tickets } = useTicketsByAsset(id!);
  const [tab, setTab] = useState<"bookings" | "tickets">("bookings");

  if (isLoading) {
    return (
      <div className="bm-page">
        <Skeleton className="h-7 w-48 mb-3" />
        <Skeleton className="h-20 w-full mb-3" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!asset) return <div className="bm-page"><p className="bm-meta">Not found.</p></div>;

  return (
    <div className="bm-page">
      {/* Back */}
      <Link to="/landlord" className="bm-pagehead__back">← Portfolio</Link>

      {/* Header */}
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <h1 className="bm-display" style={{ fontSize: 24, marginBottom: 4 }}>{asset.internalName}</h1>
            <p className="bm-meta">{asset.bedrooms}bd · {asset.bathrooms}ba · max {asset.maxOccupancy}</p>
          </div>
          <span className={occupancyBm(asset.occupancyStatus)}>{occupancyLabel(asset.occupancyStatus)}</span>
        </div>
      </div>

      {/* KPI row */}
      {summary && (
        <div className="bm-kpi-row" style={{ marginBottom: 20 }}>
          <div className="bm-kpi">
            <div className="bm-kpi__label">Revenue</div>
            <div className="bm-kpi__value" style={{ fontSize: 20 }}>{formatThb(summary.totalRevenue)}</div>
          </div>
          <div className="bm-kpi">
            <div className="bm-kpi__label">Expenses</div>
            <div className="bm-kpi__value" style={{ fontSize: 20 }}>{formatThb(summary.totalExpenses)}</div>
          </div>
          <div className="bm-kpi">
            <div className="bm-kpi__label">Net</div>
            <div className="bm-kpi__value" style={{
              fontSize: 20,
              color: summary.netProfit >= 0 ? "var(--bm-ok)" : "var(--bm-accent)",
            }}>{formatThb(summary.netProfit)}</div>
          </div>
        </div>
      )}

      {/* Tab row */}
      <div className="bm-tab-row" style={{ marginBottom: 0 }}>
        <button
          className={`bm-tab${tab === "bookings" ? " bm-tab--active" : ""}`}
          onClick={() => setTab("bookings")}
        >Bookings</button>
        <button
          className={`bm-tab${tab === "tickets" ? " bm-tab--active" : ""}`}
          onClick={() => setTab("tickets")}
        >Tickets</button>
      </div>

      {/* Bookings */}
      {tab === "bookings" && (
        <div>
          {!bookings?.length ? (
            <div className="bm-cell bm-cell--first">
              <p className="bm-meta" style={{ textAlign: "center", padding: "16px 0" }}>No bookings yet.</p>
            </div>
          ) : bookings.map((b, i) => (
            <div key={b.id} className={`bm-cell${i === 0 ? " bm-cell--first" : ""}`}>
              <div className="bm-cell__head">
                <span className={bookingStatusBm(b.status)}>{b.status}</span>
                <span className="bm-meta">{formatThb(b.rentAmount)}/mo</span>
              </div>
              <div className="bm-cell__title">{b.tenantName ?? "No tenant"}</div>
              <div className="bm-cell__sub">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tickets */}
      {tab === "tickets" && (
        <div>
          {!tickets?.length ? (
            <div className="bm-cell bm-cell--first">
              <p className="bm-meta" style={{ textAlign: "center", padding: "16px 0" }}>No tickets.</p>
            </div>
          ) : tickets.map((t, i) => (
            <Link key={t.id} to={`/landlord/tickets/${t.id}`} style={{ textDecoration: "none" }}>
              <div className={`bm-cell${i === 0 ? " bm-cell--first" : ""}`}>
                <div className="bm-cell__head">
                  <span style={{ fontSize: 16 }}>{ticketKindIcon(t.kind)}</span>
                  <span className={ticketStatusBm(t.status)}>{t.status}</span>
                </div>
                <div className="bm-cell__title">{t.title}</div>
                <div className="bm-cell__sub">{t.displayId}</div>
                <span className="bm-cell__arrow">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
