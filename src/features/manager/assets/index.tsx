import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BedDouble, Bath, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssets } from "@/lib/hooks/use-assets";
import { CreatePropertyWizard } from "./create-wizard";
import type { AssetDto } from "@/lib/types";

function occupancyTag(status: AssetDto["occupancyStatus"]) {
  if (status === "Occupied")       return "adm-tag adm-tag--success";
  if (status === "ActionRequired") return "adm-tag adm-tag--danger";
  return "adm-tag adm-tag--neutral";
}
function occupancyLabel(status: AssetDto["occupancyStatus"]) {
  if (status === "ActionRequired") return "Action needed";
  return status;
}

export default function AssetsPage() {
  const { data: assets, isLoading } = useAssets();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      {/* ── PAGE HEAD ──────────────────────────────────────────────────────── */}
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">Workspace · Properties</div>
          <h1 className="adm-pagehead__title">Properties</h1>
        </div>
        <div className="adm-pagehead__actions">
          <button className="adm-btn adm-btn--ink" onClick={() => setCreateOpen(true)}>
            <Plus size={13} /> Add property
          </button>
        </div>
      </div>

      {/* ── LIST ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="adm-card">
          <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      ) : !assets?.length ? (
        <div className="adm-empty" style={{ marginTop: 0 }}>
          <span style={{ fontSize: 28 }}>🏠</span>
          <div style={{ fontWeight: 600, fontSize: 15 }}>No properties yet</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
            Add your first property to start managing leases, tickets, and finances.
          </div>
        </div>
      ) : (
        <div className="adm-card">
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 56 }}></th>
                <th>Property</th>
                <th>Specs</th>
                <th>Tenant</th>
                <th style={{ textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td style={{ paddingLeft: 20, width: 56 }}>
                    {asset.primaryImageUrl ? (
                      <img
                        src={asset.primaryImageUrl}
                        alt={asset.internalName}
                        style={{ width: 40, height: 40, objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: 40, height: 40, background: "var(--surface-muted)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18,
                      }}>🏠</div>
                    )}
                  </td>
                  <td>
                    <Link to={`/manager/assets/${asset.id}`} style={{ textDecoration: "none", display: "block" }}>
                      <div className="adm-table__title">{asset.internalName}</div>
                    </Link>
                  </td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <BedDouble size={11} />{asset.bedrooms}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Bath size={11} />{asset.bathrooms}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Users size={11} />max {asset.maxOccupancy}
                      </span>
                    </span>
                  </td>
                  <td>
                    {asset.currentTenantName ? (
                      <span className="adm-table__sub" style={{ fontStyle: "italic" }}>{asset.currentTenantName}</span>
                    ) : (
                      <span className="adm-table__num" style={{ color: "var(--ink-4)" }}>Vacant</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 20 }}>
                    <span className={occupancyTag(asset.occupancyStatus)}>
                      {occupancyLabel(asset.occupancyStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreatePropertyWizard open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
