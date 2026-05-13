import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Inbox, Home, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils/cn";
import { formatThb } from "@/lib/utils/format";
import { useHostRequests } from "@/lib/hooks/use-booking-requests";
import type { HostBookingRequestDto, BookingRequestStatus } from "@/lib/api/booking-requests.api";

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

  const badgeLabel = isPending
    ? "Awaiting your response"
    : fate
      ? fate.label
      : req.status === "Rejected" ? "Rejected" : "Expired";

  const badgeCls = isPending
    ? "bg-warning/10 text-warning"
    : fate
      ? fate.badgeCls
      : "bg-bg-subtle text-fg-muted";

  const stripeColor = isPending
    ? "border-warning"
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
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap", badgeCls)}>
              {badgeLabel}
            </span>
            {isPending && <ArrowRight size={14} className="text-warning shrink-0" />}
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

  // Sort newest first within each group
  const sorted = [...requests].sort(
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
