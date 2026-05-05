import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useGenerateInvite } from "@/lib/hooks/use-invites";
import { useAssets } from "@/lib/hooks/use-assets";
import { useBookings } from "@/lib/hooks/use-bookings";
import { InviteType } from "@/lib/types/enums";
import { formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

type InviteMode = "landlord" | "tenant";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--ink-4)",
  display: "block",
  marginBottom: 6,
};

export default function TeamPage() {
  const generate = useGenerateInvite();
  const { data: assets } = useAssets();
  const { data: bookings } = useBookings();

  const [mode, setMode] = useState<InviteMode>("landlord");
  const [assetId, setAssetId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [generated, setGenerated] = useState<{ link: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = mode === "landlord" ? !!assetId : !!bookingId;

  async function handleGenerate() {
    const entityId = mode === "landlord" ? assetId : bookingId;
    const type = mode === "landlord" ? InviteType.OwnerInvite : InviteType.TenantInvite;
    if (!entityId) {
      toast.error(mode === "landlord" ? "Select a property first" : "Select a booking first");
      return;
    }
    try {
      const result = await generate.mutateAsync({ entityId, type } as never);
      setGenerated({ link: result.link, expiresAt: result.expiresAt });
    } catch {
      toast.error("Failed to generate invite");
    }
  }

  function handleCopy() {
    if (!generated) return;
    navigator.clipboard.writeText(generated.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied");
  }

  function handleModeChange(m: InviteMode) {
    setMode(m);
    setAssetId("");
    setBookingId("");
    setGenerated(null);
  }

  return (
    <div>
      {/* Page head */}
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">Workspace · Team</div>
          <h1 className="adm-pagehead__title">Team &amp; Access</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Generate invite card */}
        <div className="adm-card">
          <div className="adm-card__head">
            <div>
              <div className="adm-card__title">Generate invite link</div>
              <div className="adm-card__sub">Landlords get property access. Tenants get booking access.</div>
            </div>
          </div>
          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Mode toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["landlord", "tenant"] as InviteMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  style={{
                    padding: "10px 12px",
                    border: `1px solid ${mode === m ? "var(--ink)" : "var(--ink-5)"}`,
                    background: mode === m ? "var(--ink)" : "transparent",
                    color: mode === m ? "var(--bm-paper)" : "var(--ink-3)",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {m === "landlord" ? "Landlord" : "Tenant"}<br />
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {m === "landlord" ? "Property access" : "Booking access"}
                  </span>
                </button>
              ))}
            </div>

            {/* Selector */}
            {mode === "landlord" ? (
              <div>
                <label style={labelStyle}>Property</label>
                {!assets?.length ? (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>No properties yet.</p>
                ) : (
                  <select
                    className="adm-select"
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">Select a property…</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>{a.internalName}</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Booking</label>
                {!bookings?.length ? (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>No bookings yet.</p>
                ) : (
                  <select
                    className="adm-select"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">Select a booking…</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.listingTitle ?? "Booking"} — {b.checkInDate?.slice(0, 10)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <button
              className="adm-btn adm-btn--ink"
              onClick={handleGenerate}
              disabled={generate.isPending || !canSubmit}
              style={{ width: "100%" }}
            >
              {generate.isPending ? "Generating…" : "Generate invite link"}
            </button>
          </div>
        </div>

        {/* Result */}
        {generated ? (
          <div className="adm-card" style={{ borderColor: "var(--bm-ok)" }}>
            <div className="adm-card__head">
              <div>
                <div className="adm-card__title" style={{ color: "var(--bm-ok)" }}>Invite link ready</div>
                <div className="adm-card__sub">Expires {formatDate(generated.expiresAt)}</div>
              </div>
            </div>
            <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{
                border: "1px solid var(--ink-5)",
                padding: "10px 12px",
                wordBreak: "break-all",
              }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>{generated.link}</p>
              </div>
              <button
                className="adm-btn adm-btn--ink"
                onClick={handleCopy}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy link</>}
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            border: "1px dashed var(--ink-5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 180,
          }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
              Generated link will appear here
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
