import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { totalPets } from "@/components/shared/pets-selector";
import {
  ArrowLeft, Clock, CheckCircle, XCircle, CalendarDays, Timer,
  Coins, Home, Mail, Phone, MessageSquare, AlertCircle, ChevronLeft, ChevronRight, X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CountdownPill } from "@/components/shared/countdown-pill";
import { useHostRequest, useApproveRequest, useRejectRequest } from "@/lib/hooks/use-booking-requests";
import { bookingRequestDeadline } from "@/lib/api/booking-requests.api";
import { formatThb } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

function isConflict(err: unknown): boolean {
  const status = (err as { response?: { status?: number } } | null)?.response?.status;
  return status === 409 || status === 410 || status === 422;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REJECT_PRESETS = [
  "The property has already been reserved for those dates.",
  "We've decided to go with another applicant.",
  "The requested move-in date doesn't work for us.",
  "We're unable to accommodate pets at this time.",
  "The property will be undergoing maintenance during that period.",
];

const PET_ROWS: { key: "petCatsCount" | "petDogsCount" | "petOtherCount"; emoji: string; singular: string; plural: string }[] = [
  { key: "petCatsCount",  emoji: "🐱", singular: "cat",       plural: "cats"       },
  { key: "petDogsCount",  emoji: "🐶", singular: "dog",       plural: "dogs"       },
  { key: "petOtherCount", emoji: "🐾", singular: "other pet", plural: "other pets" },
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

// ─── Photo lightbox ───────────────────────────────────────────────────────────

function PhotoLightbox({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setIdx((i) => (i + 1) % urls.length);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        onClick={onClose}
      >
        <XIcon size={20} />
      </button>

      {/* Counter */}
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {idx + 1} / {urls.length}
      </span>

      {/* Prev */}
      {urls.length > 1 && (
        <button
          className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); prev(); }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Image */}
      <img
        src={urls[idx]}
        alt=""
        className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {urls.length > 1 && (
        <button
          className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); next(); }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {urls.map((u, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={cn(
                "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0",
                i === idx ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80",
              )}
            >
              <img src={u} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pet photo grid ───────────────────────────────────────────────────────────

function PetPhotoGrid({ urls }: { urls: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  if (!urls.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 p-4">
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightboxIdx(i)}
            className="w-24 h-24 rounded-xl overflow-hidden bg-bg-subtle shrink-0 hover:opacity-90 hover:scale-[1.03] transition-all"
          >
            <img src={url} alt={`Pet photo ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {lightboxIdx !== null && (
        <PhotoLightbox urls={urls} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HostRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const qc = useQueryClient();
  const { data: req, isLoading } = useHostRequest(id!);
  const approve = useApproveRequest(id!);
  const reject  = useRejectRequest(id!);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const approveIdempotencyKey = useState(() => crypto.randomUUID())[0];

  async function handleApprove() {
    try {
      await approve.mutateAsync(approveIdempotencyKey);
      toast.success("Request approved");
      navigate("/me/host/requests");
    } catch (err) {
      // Refetch so the UI reflects current state (another tab may have already
      // approved or rejected, or the request expired between page load and click).
      await qc.invalidateQueries({ queryKey: ["host-booking-requests", id] });
      if (isConflict(err)) {
        toast.error("This request was already handled — refreshing");
      } else {
        toast.error("Failed to approve request");
      }
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync(rejectReason.trim() || undefined);
      toast.success("Request rejected");
      navigate("/me/host/requests");
    } catch (err) {
      await qc.invalidateQueries({ queryKey: ["host-booking-requests", id] });
      if (isConflict(err)) {
        toast.error("This request was already handled — refreshing");
      } else {
        toast.error("Failed to reject request");
      }
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!req) return <p className="text-sm text-fg-muted">Request not found.</p>;

  const isPending = req.status === "Pending";
  const busy = approve.isPending || reject.isPending;
  const hasPets = totalPets({ cats: req.petCatsCount, dogs: req.petDogsCount, other: req.petOtherCount }) > 0;

  const STATUS_CFG = {
    Pending:  { icon: Clock,       color: "text-warning", bg: "bg-warning/10", ring: "ring-warning/30",  label: "Pending",  desc: "Awaiting your response." },
    Approved: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", ring: "ring-success/30",  label: "Approved", desc: "You approved this request." },
    Rejected: { icon: XCircle,     color: "text-danger",  bg: "bg-danger/10",  ring: "ring-danger/30",   label: "Rejected", desc: "You declined this request." },
    Expired:  { icon: Clock,       color: "text-fg-muted",bg: "bg-bg-subtle",  ring: "ring-border",      label: "Expired",  desc: "This request expired without a response." },
  }[req.status];
  const StatusIcon = STATUS_CFG.icon;

  return (
    <div className="max-w-5xl mx-auto pb-8">
      {/* Back + title */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/me/host/requests" className="p-1.5 rounded-xl hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-fg line-clamp-1">{req.listingTitle}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

        {/* ── LEFT ── */}
        <div className="space-y-4">

          {/* Property image */}
          <div className="h-56 sm:h-72 bg-bg-subtle rounded-2xl overflow-hidden">
            {req.listingCoverImageUrl ? (
              <img src={req.listingCoverImageUrl} alt={req.listingTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-fg-subtle">
                <Home size={48} />
              </div>
            )}
          </div>

          {/* Status banner */}
          <div className={cn("rounded-2xl p-5 ring-1 flex items-start gap-4", STATUS_CFG.bg, STATUS_CFG.ring)}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/60">
              <StatusIcon size={20} className={STATUS_CFG.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cn("font-semibold", STATUS_CFG.color)}>{STATUS_CFG.label}</p>
                {isPending && req.createdAt && (
                  <CountdownPill
                    deadline={bookingRequestDeadline(req)}
                    prefix="Auto-expires in"
                    expiredLabel="Auto-expired"
                  />
                )}
              </div>
              <p className="text-sm text-fg-muted mt-0.5">{STATUS_CFG.desc}</p>
              {req.status === "Rejected" && req.rejectionReason && (
                <p className="text-sm text-fg mt-2 pt-2 border-t border-danger/20">
                  <span className="font-medium">Your message: </span>{req.rejectionReason}
                </p>
              )}
            </div>
          </div>

          {/* Guest card */}
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-brand">{initials(req.guestName)}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-fg text-base leading-tight">{req.guestName}</p>
                <p className="text-xs text-fg-muted mt-0.5">Request #{req.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {req.guestEmail && (
                <div className="flex items-center gap-3 px-5 py-3">
                  <Mail size={14} className="text-fg-muted shrink-0" />
                  <a href={`mailto:${req.guestEmail}`} className="text-sm text-brand hover:underline truncate">{req.guestEmail}</a>
                </div>
              )}
              {req.guestPhone && (
                <div className="flex items-center gap-3 px-5 py-3">
                  <Phone size={14} className="text-fg-muted shrink-0" />
                  <a href={`tel:${req.guestPhone}`} className="text-sm text-brand hover:underline">{req.guestPhone}</a>
                </div>
              )}
              {req.message && (
                <div className="flex items-start gap-3 px-5 py-4">
                  <MessageSquare size={14} className="text-fg-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-1">Message</p>
                    <p className="text-sm text-fg whitespace-pre-wrap leading-relaxed">{req.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pets */}
          {hasPets && (
            <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                <span className="text-base">🐾</span>
                <p className="text-sm font-semibold text-fg">Pets</p>
              </div>
              <div className="divide-y divide-border">
                {PET_ROWS.filter((r) => req[r.key] > 0).map(({ key, emoji, singular, plural }) => (
                  <div key={key} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-base w-5 text-center shrink-0">{emoji}</span>
                    <span className="text-sm text-fg">
                      {req[key] === 1 ? `1 ${singular}` : `${req[key]} ${plural}`}
                    </span>
                  </div>
                ))}
              </div>
              {req.petPhotoUrls.length > 0 ? (
                <div className="border-t border-border">
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide px-5 pt-4 pb-1">
                    Pet photos
                  </p>
                  <PetPhotoGrid urls={req.petPhotoUrls} />
                </div>
              ) : (
                <p className="px-5 py-3 text-xs text-fg-muted border-t border-border bg-bg-subtle">
                  No pet photos submitted.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-4 lg:sticky lg:top-8">

          {/* Reservation details */}
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-fg">Reservation details</h3>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <CalendarDays size={14} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Move-in</span>
                <span className="font-medium text-fg">
                  {req.moveInDate ? format(parseISO(req.moveInDate), "d MMM yyyy") : "—"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <CalendarDays size={14} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Move-out</span>
                <span className="font-medium text-fg">
                  {req.moveOutDate ? format(parseISO(req.moveOutDate), "d MMM yyyy") : "—"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <Timer size={14} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Duration</span>
                <span className="font-medium text-fg">{req.durationMonths} month{req.durationMonths !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <Coins size={14} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Monthly rate</span>
                <span className="font-semibold text-fg">{formatThb(req.monthlyRate)} per month</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <span className="w-[14px] shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <div>
                  <span className="text-fg-muted">Refundable deposit</span>
                  <div className="text-[11px] text-fg-muted">held securely by Siamo</div>
                </div>
                <span className="font-medium text-fg">{formatThb(req.monthlyRate)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-danger/30 text-danger hover:bg-danger/5 hover:text-danger h-10"
                disabled={busy}
                onClick={() => setShowRejectModal(true)}
              >
                <XCircle size={14} className="mr-1.5" />Reject
              </Button>
              <Button
                className="flex-1 bg-brand hover:bg-[var(--color-primary-hover)] text-white h-10"
                disabled={busy}
                onClick={handleApprove}
              >
                <CheckCircle size={14} className="mr-1.5" />
                {approve.isPending ? "Approving…" : "Approve"}
              </Button>
            </div>
          )}

          {req.createdAt && (
            <p className="text-xs text-fg-muted text-center">
              Submitted {format(parseISO(req.createdAt), "d MMM yyyy 'at' HH:mm")}
            </p>
          )}
        </div>
      </div>

      {/* ── Reject modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-bg-card rounded-2xl shadow-pop w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-fg">Reject request</h3>
              <p className="text-sm text-fg-muted mt-0.5">Let the guest know why — it helps them find better options.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {REJECT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectReason(preset)}
                  className={cn(
                    "text-left text-sm px-3 py-2 rounded-lg border transition-colors",
                    rejectReason === preset
                      ? "border-danger/40 bg-danger/5 text-fg"
                      : "border-border hover:border-border-strong hover:bg-bg-subtle text-fg-muted hover:text-fg",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Or write your own message…"
              className="min-h-[72px] resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={reject.isPending}
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}>
                Cancel
              </Button>
              <Button className="flex-1 bg-danger hover:bg-danger/90 text-white" disabled={reject.isPending} onClick={handleReject}>
                {reject.isPending ? "Rejecting…" : "Confirm reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
