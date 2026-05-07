import { Download, FileText, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useMyTm30 } from "@/lib/hooks/use-profile";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

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
            TM30 documents will appear here once your booking begins.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div
              key={rec.bookingId}
              className="bg-bg-card rounded-xl shadow-card p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-fg text-sm line-clamp-1">{rec.listingTitle}</p>
                <p className="text-xs text-fg-muted mt-0.5">
                  {formatDate(rec.checkInDate)} → {formatDate(rec.checkOutDate)}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  {rec.status === "Filed" ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                        ✓ Filed
                      </span>
                      {rec.filedAt && (
                        <span className="text-xs text-fg-muted">
                          on {formatDate(rec.filedAt)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                      "text-fg-muted bg-bg-subtle"
                    )}>
                      <Clock size={10} />
                      Pending
                    </span>
                  )}
                </div>
              </div>
              {rec.status === "Filed" && rec.documentUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  asChild
                >
                  <a href={rec.documentUrl} target="_blank" rel="noopener noreferrer">
                    <Download size={14} className="mr-1.5" />
                    Download PDF
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
