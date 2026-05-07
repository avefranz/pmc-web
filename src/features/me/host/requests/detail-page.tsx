import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle, User, Calendar, Home, Mail, Phone, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHostRequest, useApproveRequest, useRejectRequest } from "@/lib/hooks/use-booking-requests";
import { formatThb } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

export function HostRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: req, isLoading } = useHostRequest(id!);
  const approve = useApproveRequest(id!);
  const reject  = useRejectRequest(id!);

  async function handleApprove() {
    try {
      await approve.mutateAsync();
      toast.success("Request approved");
      navigate("/me/host/requests");
    } catch {
      toast.error("Failed to approve request");
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync();
      toast.success("Request rejected");
      navigate("/me/host/requests");
    } catch {
      toast.error("Failed to reject request");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!req) return <p className="text-sm text-fg-muted">Request not found.</p>;

  const isPending = req.status === "Pending";
  const busy = approve.isPending || reject.isPending;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link
          to="/me/host/requests"
          className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <PageHeader title="Booking request" className="mb-0" />
      </div>

      <div className="bg-bg-card rounded-xl shadow-card p-6 space-y-5">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-muted">Request #{req.id.slice(0, 8)}</span>
          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium", {
            "bg-warning/10 text-warning":  req.status === "Pending",
            "bg-success/10 text-success":  req.status === "Approved",
            "bg-danger/10 text-danger":    req.status === "Rejected",
            "bg-bg-subtle text-fg-muted":  req.status === "Expired",
          })}>
            {req.status === "Pending"  && <Clock size={11} />}
            {req.status === "Approved" && <CheckCircle size={11} />}
            {req.status === "Rejected" && <XCircle size={11} />}
            {req.status}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-3">
            <User size={15} className="text-fg-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-fg-muted">Guest</p>
              <p className="text-sm font-semibold text-fg">{req.guestName}</p>
            </div>
          </div>
          {req.guestEmail && (
            <div className="flex items-start gap-3">
              <Mail size={15} className="text-fg-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-fg-muted">Email</p>
                <a href={`mailto:${req.guestEmail}`} className="text-sm font-medium text-brand hover:underline">
                  {req.guestEmail}
                </a>
              </div>
            </div>
          )}
          {req.guestPhone && (
            <div className="flex items-start gap-3">
              <Phone size={15} className="text-fg-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-fg-muted">Phone</p>
                <a href={`tel:${req.guestPhone}`} className="text-sm font-medium text-brand hover:underline">
                  {req.guestPhone}
                </a>
              </div>
            </div>
          )}
          {req.message && (
            <div className="flex items-start gap-3">
              <MessageSquare size={15} className="text-fg-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-fg-muted">Message from guest</p>
                <p className="text-sm text-fg mt-0.5 whitespace-pre-wrap">{req.message}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Home size={15} className="text-fg-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-fg-muted">Listing</p>
              <p className="text-sm font-semibold text-fg">{req.listingTitle}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar size={15} className="text-fg-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-fg-muted">Stay</p>
              <p className="text-sm font-semibold text-fg">
                From {req.moveInDate} · {req.durationMonths} month{req.durationMonths !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Rate */}
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <p className="text-sm text-fg-muted">Monthly rate</p>
          <p className="text-lg font-semibold text-fg">{formatThb(req.monthlyRate)}</p>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="border-t border-border pt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-danger/30 text-danger hover:bg-danger/5 hover:text-danger"
              disabled={busy}
              onClick={handleReject}
            >
              <XCircle size={15} className="mr-1.5" />
              {reject.isPending ? "Rejecting…" : "Reject"}
            </Button>
            <Button
              className="flex-1 bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              disabled={busy}
              onClick={handleApprove}
            >
              <CheckCircle size={15} className="mr-1.5" />
              {approve.isPending ? "Approving…" : "Approve"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
