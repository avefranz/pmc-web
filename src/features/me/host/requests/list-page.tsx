import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Inbox, Home, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CountdownPill } from "@/components/shared/countdown-pill";
import { cn } from "@/lib/utils/cn";
import { formatThb } from "@/lib/utils/format";
import { useHostRequests } from "@/lib/hooks/use-booking-requests";
import { useMe } from "@/lib/hooks/use-auth";
import { bookingRequestDeadline } from "@/lib/api/booking-requests.api";
import type { HostBookingRequestDto } from "@/lib/api/booking-requests.api";

// ─── Fate helpers ─────────────────────────────────────────────────────────────

function getApprovedFate(req: HostBookingRequestDto) {
  const moveIn = new Date(req.moveInDate);
  moveIn.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((moveIn.getTime() - today.getTime()) / 86_400_000);

  if (daysUntil < 0)   return { label: "Currently living", badgeCls: "bg-success/10 text-success", stripe: "border-success" };
  if (daysUntil === 0) return { label: "Moving in today!", badgeCls: "bg-brand/10 text-brand font-semibold", stripe: "border-brand" };
  if (daysUntil <= 3)  return { label: `Move-in in ${daysUntil}d`, badgeCls: "bg-brand/10 text-brand font-semibold", stripe: "border-brand" };
  if (daysUntil <= 14) return { label: `Move-in in ${daysUntil}d`, badgeCls: "bg-fg/8 text-fg", stripe: "border-fg/20" };
  return { label: `Move-in ${format(moveIn, "d MMM")}`, badgeCls: "bg-fg/8 text-fg-muted", stripe: "border-fg/10" };
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({ req }: { req: HostBookingRequestDto }) {
  const isApproved = req.status === "Approved";
  const isPending  = req.status === "Pending";

  const fate = isApproved ? getApprovedFate(req) : null;

  // Pending escalation: warning by default, danger once the auto-expiry window
  // is mostly used up (under 24h of the 72h budget). Without this signal a
  // request that's been sitting 50h looks like one that arrived 5min ago.
  const hoursLeft = isPending && req.createdAt
    ? (new Date(bookingRequestDeadline(req)).getTime() - Date.now()) / 3600_000
    : null;
  const pendingUrgent = hoursLeft != null && hoursLeft < 24;

  const badgeLabel = isPending
    ? pendingUrgent ? "Respond soon" : "Awaiting your response"
    : fate
      ? fate.label
      : req.status === "Rejected" ? "Rejected" : "Expired";

  const badgeCls = isPending
    ? pendingUrgent ? "bg-danger/10 text-danger font-semibold" : "bg-warning/10 text-warning"
    : fate
      ? fate.badgeCls
      : "bg-bg-subtle text-fg-muted";

  const stripeColor = isPending
    ? pendingUrgent ? "border-danger" : "border-warning"
    : fate
      ? fate.stripe
      : "border-transparent";

  return (
    <Link
      to={`/me/host/requests/${req.id}`}
      className={cn(
        "flex gap-0 bg-bg-card rounded-xl shadow-card hover:shadow-hover transition-all overflow-hidden",
        "border-l-[3px]",
        stripeColor,
      )}
    >
      {/* Listing photo */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-bg-subtle overflow-hidden self-stretch">
        {req.listingCoverImageUrl ? (
          <img src={req.listingCoverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home size={20} className="text-fg-subtle" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3 pr-4 pl-4 flex flex-col justify-between">
        <div>
          <p className="text-sm font-semibold text-fg truncate leading-snug">{req.listingTitle}</p>
          <p className="text-xs text-fg-muted truncate mt-0.5">{req.guestName}</p>
        </div>

        <div className="flex items-end justify-between gap-2 mt-2">
          <div className="text-xs text-fg-muted">
            <span>{req.moveInDate ? format(parseISO(req.moveInDate), "d MMM yyyy") : "—"}</span>
            <span className="mx-1">·</span>
            <span>{req.durationMonths} month{req.durationMonths !== 1 ? "s" : ""}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold text-fg">
              {formatThb(req.monthlyRate)}<span className="text-[11px] font-normal text-fg-muted"> /month</span>
            </span>
            <div className="flex flex-col items-end gap-1">
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap", badgeCls)}>
                {badgeLabel}
              </span>
              {isPending && req.createdAt && (
                <CountdownPill
                  deadline={bookingRequestDeadline(req)}
                  prefix="Auto-expires in"
                  expiredLabel="Auto-expired"
                  className="text-[10px]"
                />
              )}
            </div>
            {isPending && <ArrowRight size={14} className={cn("shrink-0", pendingUrgent ? "text-danger" : "text-warning")} />}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent }: { label: string; count: number; accent: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <p className={cn("text-[11px] font-bold uppercase tracking-widest", accent)}>{label}</p>
      <span className="text-[10px] text-fg-subtle">{count}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HostRequestsPage() {
  const { data: requests, isLoading } = useHostRequests();
  const { data: me } = useMe();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Booking requests" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div>
        <PageHeader title="Booking requests" />
        <EmptyState
          icon={<Inbox size={40} />}
          title="No requests yet"
          description="When guests apply to your listings, their requests will appear here."
        />
      </div>
    );
  }

  // BUG-159: a host who also has a tenant account could have applied to their
  // own listing. Exclude those requests from the host inbox — they are already
  // visible in the guest's "My applications" view. Match by email (best we can
  // do without a guestId field in the DTO).
  const filtered = me?.email
    ? requests.filter((r) => r.guestEmail !== me.email)
    : requests;

  // Sort newest first within each group
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const pending  = sorted.filter((r) => r.status === "Pending");
  const approved = sorted.filter((r) => r.status === "Approved");
  const other    = sorted.filter((r) => r.status === "Rejected" || r.status === "Expired");

  return (
    <div>
      <PageHeader title="Booking requests" />
      <div className="space-y-6">

        {pending.length > 0 && (
          <section>
            <SectionHeader label="Awaiting your response" count={pending.length} accent="text-warning" />
            <div className="space-y-2">{pending.map((r) => <RequestCard key={r.id} req={r} />)}</div>
          </section>
        )}

        {approved.length > 0 && (
          <section>
            <SectionHeader label="Approved" count={approved.length} accent="text-success" />
            <div className="space-y-2">{approved.map((r) => <RequestCard key={r.id} req={r} />)}</div>
          </section>
        )}

        {other.length > 0 && (
          <section>
            <SectionHeader label="Rejected / Expired" count={other.length} accent="text-fg-subtle" />
            <div className="space-y-2">{other.map((r) => <RequestCard key={r.id} req={r} />)}</div>
          </section>
        )}

      </div>
    </div>
  );
}
