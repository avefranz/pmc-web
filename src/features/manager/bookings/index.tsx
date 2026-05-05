import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssets } from "@/lib/hooks/use-assets";
import { useBookingsByAsset } from "@/lib/hooks/use-bookings";
import { formatDate, formatThb } from "@/lib/utils/format";

function bookingStatusBm(s: string) {
  if (s === "Active")     return "adm-tag adm-tag--success";
  if (s === "Confirmed")  return "adm-tag adm-tag--ink";
  if (s === "Draft")      return "adm-tag adm-tag--neutral";
  if (s === "Completed")  return "adm-tag adm-tag--neutral";
  if (s === "Cancelled")  return "adm-tag adm-tag--danger";
  return "adm-tag adm-tag--neutral";
}

function AssetBookings({ assetId, assetName }: { assetId: string; assetName: string }) {
  const { data: bookings, isLoading } = useBookingsByAsset(assetId);

  if (isLoading) return <Skeleton className="h-12 w-full" style={{ marginBottom: 4 }} />;
  if (!bookings?.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="adm-card__head" style={{ padding: "10px 20px" }}>
        <div className="adm-card__title" style={{ fontSize: 12 }}>{assetName}</div>
      </div>
      <table className="adm-table">
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td style={{ paddingLeft: 20, width: 48 }}>
                {b.primaryImageUrl ? (
                  <img src={b.primaryImageUrl} alt="" style={{ width: 36, height: 36, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 36, height: 36, background: "var(--ink-6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18 }}>🏠</span>
                  </div>
                )}
              </td>
              <td>
                <Link to={`/manager/bookings/${b.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <div className="adm-table__title">{b.tenantName ?? "No tenant"}</div>
                  <div className="adm-table__sub">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</div>
                </Link>
              </td>
              <td style={{ textAlign: "right" }}>
                <span className="adm-table__num">{formatThb(b.rentAmount)}/mo</span>
              </td>
              <td style={{ textAlign: "right", paddingRight: 20 }}>
                <span className={bookingStatusBm(b.status)}>{b.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BookingsPage() {
  const { data: assets, isLoading } = useAssets();

  return (
    <div>
      {/* Page head */}
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">Workspace · Bookings</div>
          <h1 className="adm-pagehead__title">Bookings</h1>
        </div>
        <div className="adm-pagehead__actions">
          <Link to="/manager/bookings/new" className="adm-btn adm-btn--ink">
            <Plus size={13} /> New booking
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="adm-card">
          <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      ) : !assets?.length ? (
        <div className="adm-empty">
          <span style={{ fontSize: 28 }}>📋</span>
          <div style={{ fontWeight: 600, fontSize: 15 }}>No properties</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Add a property first to create bookings.</div>
        </div>
      ) : (
        <div className="adm-card">
          {assets.map((a) => (
            <AssetBookings key={a.id} assetId={a.id} assetName={a.internalName} />
          ))}
        </div>
      )}
    </div>
  );
}
