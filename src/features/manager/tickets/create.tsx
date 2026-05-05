import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useCreateTicket } from "@/lib/hooks/use-tickets";
import { useAssets } from "@/lib/hooks/use-assets";
import { TicketKind, TicketType, TicketPriority } from "@/lib/types/enums";
import { toast } from "sonner";

export default function CreateTicketPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: assets } = useAssets();
  const createTicket = useCreateTicket();

  const [assetId, setAssetId] = useState(searchParams.get("assetId") ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>(TicketType.Maintenance);
  const [kind, setKind] = useState<TicketKind>(TicketKind.Incident);
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.Normal);
  const [estimatedCost, setEstimatedCost] = useState(0);

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--bm-mono)",
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--bm-ink-4)",
    display: "block",
    marginBottom: 6,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !title.trim()) return;
    try {
      const result = await createTicket.mutateAsync({
        assetId,
        title: title.trim(),
        description,
        type,
        kind,
        priority,
        estimatedCost,
      });
      toast.success("Ticket created");
      navigate(`/manager/tickets/${result.id}`);
    } catch {
      toast.error("Failed to create ticket");
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Back */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/manager/tickets" className="bm-pagehead__back">← Tickets</Link>
      </div>

      <div className="adm-pagehead" style={{ marginBottom: 24 }}>
        <div>
          <div className="adm-pagehead__eyebrow">Workspace · Tickets</div>
          <h1 className="adm-pagehead__title">New Ticket</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="adm-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Property */}
          <div>
            <label style={labelStyle}>Property *</label>
            <select
              className="bm-input"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
              style={{ width: "100%" }}
            >
              <option value="">Select property…</option>
              {assets?.map((a) => (
                <option key={a.id} value={a.id}>{a.internalName}</option>
              ))}
            </select>
          </div>

          {/* Kind / Type row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Kind</label>
              <select
                className="bm-input"
                value={kind}
                onChange={(e) => setKind(e.target.value as TicketKind)}
                style={{ width: "100%" }}
              >
                {Object.values(TicketKind).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type</label>
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
          </div>

          {/* Priority / Est. cost row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select
                className="bm-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                style={{ width: "100%" }}
              >
                {Object.values(TicketPriority).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Est. cost (THB)</label>
              <input
                type="number"
                min={0}
                className="bm-input"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              className="bm-input"
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              className="bm-input"
              placeholder="Additional details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="adm-btn adm-btn--ink"
              disabled={createTicket.isPending || !assetId || !title.trim()}
            >
              {createTicket.isPending ? "Creating…" : "Create ticket"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
