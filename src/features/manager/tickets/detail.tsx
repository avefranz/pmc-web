import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { X, ZoomIn, Plus, Paperclip } from "lucide-react";
import { Lightbox, useLightbox, type LightboxImage } from "@/components/ui/lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTicket,
  useUpdateTicketStatus,
  usePostTicketMessage,
  useToggleChecklistItem,
  useAddChecklistItem,
} from "@/lib/hooks/use-tickets";
import { ticketKeys } from "@/lib/hooks/use-tickets";
import { ticketsApi } from "@/lib/api/tickets.api";
import { useQueryClient } from "@tanstack/react-query";
import { ticketKindIcon, ticketKindLabel } from "@/lib/utils/ticket-status";
import { formatDate, formatDateTime, formatRelative, formatThb } from "@/lib/utils/format";
import { MessageVisibility, TicketKind } from "@/lib/types/enums";
import { toast } from "sonner";

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

// ─── Checklist Panel ─────────────────────────────────────────────────────────

function ChecklistPanel({ ticketId }: { ticketId: string }) {
  const { data } = useTicket(ticketId);
  const toggle = useToggleChecklistItem(ticketId);
  const addItem = useAddChecklistItem(ticketId);
  const [newTitle, setNewTitle] = useState("");

  const items = data?.checklistItems ?? [];
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  return (
    <div>
      <div className="adm-card__head" style={{ padding: "12px 16px" }}>
        <div className="adm-card__title">Checklist</div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{done}/{items.length}</span>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        {/* Progress bar */}
        {items.length > 0 && (
          <div style={{ height: 2, background: "var(--ink-6)", marginBottom: 12 }}>
            <div style={{ height: 2, background: "var(--ink)", width: `${pct}%`, transition: "width 0.2s" }} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {items.map((item) => (
            <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => toggle.mutate({ itemId: item.id, done: e.target.checked })}
                style={{ marginTop: 2, cursor: "pointer" }}
              />
              <span style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                textDecoration: item.done ? "line-through" : "none",
                color: item.done ? "var(--ink-4)" : "var(--ink)",
              }}>{item.title}</span>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="bm-input"
            placeholder="Add item…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                addItem.mutate(newTitle.trim());
                setNewTitle("");
              }
            }}
          />
          <button
            className="adm-btn adm-btn--ghost adm-btn--sm"
            disabled={!newTitle.trim() || addItem.isPending}
            onClick={() => { addItem.mutate(newTitle.trim()); setNewTitle(""); }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Thread ───────────────────────────────────────────────────────────────────

function TicketThread({ ticketId }: { ticketId: string }) {
  const { data } = useTicket(ticketId);
  const postMessage = usePostTicketMessage(ticketId);
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>(MessageVisibility.Public);
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msgLightbox, setMsgLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  const timeline = [
    ...(data?.messages ?? []).map((m) => ({ type: "message" as const, time: m.createdAt, data: m })),
    ...(data?.events ?? []).map((e) => ({ type: "event" as const, time: e.createdAt, data: e })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newImages = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setAttachedImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setAttachedImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSend() {
    if (!body.trim() && attachedImages.length === 0) return;
    setUploading(true);
    const imagesToSend = [...attachedImages];
    try {
      const { id: messageId } = await postMessage.mutateAsync({
        body: body.trim() || "📎",
        visibility,
      });
      for (const img of imagesToSend) {
        await ticketsApi.uploadMessageAttachment(ticketId, messageId, img.file);
      }
      setBody("");
      if (imagesToSend.length > 0) {
        qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      imagesToSend.forEach((img) => URL.revokeObjectURL(img.preview));
      setAttachedImages([]);
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="adm-card__head" style={{ padding: "12px 16px" }}>
        <div className="adm-card__title">Thread</div>
      </div>

      {/* Timeline */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {timeline.map((item) => {
          if (item.type === "event") {
            const e = item.data;
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ height: 1, flex: 1, background: "var(--ink-6)" }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)" }}>
                  {e.eventType === "StatusChanged"
                    ? `${e.fromValue} → ${e.toValue}`
                    : e.eventType === "Created"
                    ? "created"
                    : e.eventType}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)" }}>
                  {formatRelative(e.createdAt)}
                </span>
                <div style={{ height: 1, flex: 1, background: "var(--ink-6)" }} />
              </div>
            );
          }

          const msg = item.data;
          const isInternal = msg.visibility === MessageVisibility.Internal;
          return (
            <div
              key={msg.id}
              style={{
                border: "1px solid",
                borderColor: isInternal ? "var(--warn)" : "var(--ink-5)",
                background: isInternal ? "rgba(184,132,26,0.06)" : "transparent",
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700 }}>
                  {msg.authorName ?? "Unknown"}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {isInternal && <span className="adm-tag adm-tag--warn">Internal</span>}
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)" }}>
                    {formatRelative(msg.createdAt)}
                  </span>
                </div>
              </div>
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {msg.body}
              </p>
              {msg.attachments.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {msg.attachments.map((a, ai) => (
                    <button
                      key={a.id}
                      type="button"
                      style={{ position: "relative", border: "1px solid var(--ink-5)", overflow: "hidden" }}
                      onClick={() => setMsgLightbox({
                        images: msg.attachments.map((x) => ({ url: x.url, name: x.fileName ?? undefined })),
                        index: ai,
                      })}
                    >
                      <img
                        src={a.url}
                        alt={a.fileName ?? "Attachment"}
                        style={{ width: 80, height: 80, objectFit: "cover", display: "block" }}
                      />
                      <div style={{
                        position: "absolute", inset: 0, background: "rgba(0,0,0,0)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <ZoomIn size={16} color="white" style={{ opacity: 0 }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {timeline.length === 0 && (
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>No messages yet.</p>
        )}
      </div>

      {/* Compose */}
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          className="bm-input"
          placeholder="Write a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{ width: "100%", resize: "vertical" }}
        />

        {attachedImages.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {attachedImages.map((img, idx) => (
              <div key={idx} style={{ position: "relative" }}>
                <img src={img.preview} alt="" style={{ width: 64, height: 64, objectFit: "cover", border: "1px solid var(--ink-5)" }} />
                <button
                  onClick={() => removeImage(idx)}
                  style={{
                    position: "absolute", top: -4, right: -4,
                    background: "var(--ink)", color: "var(--bm-paper)",
                    border: "none", width: 16, height: 16, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="adm-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as MessageVisibility)}
              style={{ fontSize: 11 }}
            >
              <option value={MessageVisibility.Public}>Public</option>
              <option value={MessageVisibility.Internal}>Internal</option>
            </select>
            <button
              className="adm-btn adm-btn--ghost adm-btn--sm"
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <Paperclip size={11} /> Attach
            </button>
          </div>
          <button
            className="adm-btn adm-btn--ink adm-btn--sm"
            onClick={handleSend}
            disabled={uploading || postMessage.isPending || (!body.trim() && attachedImages.length === 0)}
          >
            {uploading ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {msgLightbox && (
        <Lightbox
          images={msgLightbox.images}
          initialIndex={msgLightbox.index}
          open={true}
          onClose={() => setMsgLightbox(null)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id!);
  const updateStatus = useUpdateTicketStatus();
  const mediaImages = (ticket?.mediaUrls ?? []).map((url) => ({ url }));
  const { openAt: openMedia, lightbox: mediaLightbox } = useLightbox(mediaImages);

  async function handleStatusChange(status: string) {
    try {
      await updateStatus.mutateAsync({ id: id!, status: status as never });
      toast.success(`Status → ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!ticket) return <div className="adm-empty">Ticket not found.</div>;

  return (
    <div>
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/manager/tickets" className="bm-pagehead__back">← Tickets</Link>
      </div>

      {/* ── Header ── */}
      <div className="adm-pagehead">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
          <span style={{ fontSize: 28, lineHeight: 1, marginTop: 4 }}>{ticketKindIcon(ticket.kind)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span className="adm-table__num">{ticket.displayId}</span>
              <span className="adm-tag adm-tag--neutral">{ticketKindLabel(ticket.kind)}</span>
              <span className={ticketStatusBm(ticket.status)}>{ticket.status}</span>
              <span className={priorityBm(ticket.priority)}>{ticket.priority}</span>
            </div>
            <h1 className="adm-pagehead__title" style={{ marginBottom: 0 }}>{ticket.title}</h1>
            {ticket.assetName && <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{ticket.assetName}</p>}
          </div>
        </div>
        {ticket.allowedNextStatuses.length > 0 && (
          <div className="adm-pagehead__actions">
            <div style={{ position: "relative" }}>
              <select
                className="adm-select"
                onChange={(e) => { if (e.target.value) handleStatusChange(e.target.value); }}
                defaultValue=""
                disabled={updateStatus.isPending}
              >
                <option value="" disabled>Change status…</option>
                {ticket.allowedNextStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── 3-col layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginTop: 8 }}>

        {/* ── LEFT: meta ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Details card */}
          <div className="adm-card">
            <div className="adm-card__head">
              <div className="adm-card__title">Details</div>
            </div>
            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="adm-kv">
                <span className="adm-kv__k">Description</span>
              </div>
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", color: "var(--ink-2)" }}>
                {ticket.description || "—"}
              </p>
              <div style={{ borderTop: "1px solid var(--ink-6)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {ticket.estimatedCost > 0 && (
                  <div className="adm-kv">
                    <span className="adm-kv__k">Est. cost</span>
                    <span className="adm-kv__v">{formatThb(ticket.estimatedCost)}</span>
                  </div>
                )}
                {ticket.actualCost != null && (
                  <div className="adm-kv">
                    <span className="adm-kv__k">Actual cost</span>
                    <span className="adm-kv__v">{formatThb(ticket.actualCost)}</span>
                  </div>
                )}
                {ticket.dueDate && (
                  <div className="adm-kv">
                    <span className="adm-kv__k">Due date</span>
                    <span className="adm-kv__v">{formatDate(ticket.dueDate)}</span>
                  </div>
                )}
                {ticket.scheduledFor && (
                  <div className="adm-kv">
                    <span className="adm-kv__k">Scheduled</span>
                    <span className="adm-kv__v">{formatDateTime(ticket.scheduledFor)}</span>
                  </div>
                )}
                <div className="adm-kv">
                  <span className="adm-kv__k">Created</span>
                  <span className="adm-kv__v">{formatDate(ticket.createdAt)}</span>
                </div>
                {ticket.bookingId && (
                  <div className="adm-kv">
                    <span className="adm-kv__k">Booking</span>
                    <Link to={`/manager/bookings/${ticket.bookingId}`} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>
                      View →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sub-tickets */}
          {ticket.children.length > 0 && (
            <div className="adm-card">
              <div className="adm-card__head">
                <div className="adm-card__title">Sub-tickets</div>
              </div>
              <div style={{ padding: "0 0 8px" }}>
                {ticket.children.map((c) => (
                  <Link key={c.id} to={`/manager/tickets/${c.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--ink-6)" }}>
                      <span style={{ fontSize: 14 }}>{ticketKindIcon(c.kind)}</span>
                      <span style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                      <span className={ticketStatusBm(c.status)}>{c.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Media */}
          {ticket.mediaUrls.length > 0 && (
            <div className="adm-card">
              <div className="adm-card__head">
                <div className="adm-card__title">Media</div>
              </div>
              <div style={{ padding: "8px 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {ticket.mediaUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    style={{ border: "1px solid var(--ink-5)", overflow: "hidden", cursor: "pointer" }}
                    onClick={() => openMedia(i)}
                  >
                    <img src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {mediaLightbox}
        </div>

        {/* ── RIGHT: thread + checklist ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ticket.kind === TicketKind.Checklist && (
            <div className="adm-card">
              <ChecklistPanel ticketId={id!} />
            </div>
          )}
          <div className="adm-card">
            <TicketThread ticketId={id!} />
          </div>
        </div>
      </div>
    </div>
  );
}
