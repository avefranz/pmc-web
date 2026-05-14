import { Download, FileText, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useMyTm30 } from "@/lib/hooks/use-profile";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function tm30Urgency(checkInDate: string): {
  hoursIntoWindow: number;
  daysOverdue: number;
  level: "future" | "open" | "overdueMinor" | "overdueSerious";
} {
  const checkIn = new Date(checkInDate).getTime();
  const hours = (Date.now() - checkIn) / 3_600_000;
  if (hours < 0) return { hoursIntoWindow: 0, daysOverdue: 0, level: "future" };
  if (hours < 24) return { hoursIntoWindow: hours, daysOverdue: 0, level: "open" };
  const days = Math.floor((hours - 24) / 24);
  return { hoursIntoWindow: hours, daysOverdue: days + 1, level: days >= 3 ? "overdueSerious" : "overdueMinor" };
}

export function GuestTm30Page() {
  const { data: records, isLoading } = useMyTm30();

  return (
    <div>
      <PageHeader title="TM30 Documents" />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !records?.length ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-subtle flex items-center justify-center text-2xl mb-4">
            <FileText size={28} className="text-fg-muted" />
          </div>
          <p className="text-lg font-semibold text-fg">No TM30 records yet</p>
          <p className="text-sm text-fg-muted mt-1">
            TM30 documents will appear here once your reservation begins.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const pending = rec.status !== "Filed";
            const urg = pending ? tm30Urgency(rec.checkInDate) : null;
            const isOverdue = urg?.level === "overdueMinor" || urg?.level === "overdueSerious";
            const isOpen = urg?.level === "open";
            return (
              <div
                key={rec.bookingId}
                className={cn(
                  "rounded-xl shadow-card p-4 flex items-start justify-between gap-4 border",
                  isOverdue ? "bg-danger/5 border-danger/30"
                    : isOpen ? "bg-warning/8 border-warning/30"
                    : "bg-bg-card border-border",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg text-sm line-clamp-1">{rec.listingTitle}</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {formatDate(rec.checkInDate)} → {formatDate(rec.checkOutDate)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {!pending ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                          ✓ Filed
                        </span>
                        {rec.filedAt && (
                          <span className="text-xs text-fg-muted">on {formatDate(rec.filedAt)}</span>
                        )}
                      </>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={10} /> Overdue {urg!.daysOverdue}d
                      </span>
                    ) : isOpen ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        <Clock size={10} /> 24h window — {Math.max(0, Math.floor(24 - urg!.hoursIntoWindow))}h left
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted bg-bg-subtle px-2 py-0.5 rounded-full">
                        <Clock size={10} />Pending — opens at check-in
                      </span>
                    )}
                  </div>
                  {pending && (isOverdue || isOpen) && (
                    <p className="text-[11px] text-fg-muted mt-2 leading-relaxed">
                      Thai immigration requires landlords to file TM-30 within 24 hours of foreign-guest
                      check-in. Your host risks a fine of up to ฿2,000 per unfiled guest.
                      {isOverdue && " Nudge them if they haven't acted."}
                    </p>
                  )}
                </div>
                {rec.status === "Filed" && rec.documentUrl ? (
                  <Button size="sm" variant="outline" className="shrink-0" asChild>
                    <a href={rec.documentUrl} target="_blank" rel="noopener noreferrer">
                      <Download size={14} className="mr-1.5" />Download PDF
                    </a>
                  </Button>
                ) : pending ? (
                  <p className="text-xs text-fg-muted shrink-0 max-w-[110px] text-right leading-snug">
                    Filed by your host
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
