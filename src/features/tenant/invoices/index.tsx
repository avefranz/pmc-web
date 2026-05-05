import { Skeleton } from "@/components/ui/skeleton";
import { useMyBookings, useBookingInvoices } from "@/lib/hooks/use-bookings";
import { formatDate, formatThb } from "@/lib/utils/format";
import { InvoiceStatus, BookingStatus } from "@/lib/types/enums";
import type { BookingDto } from "@/lib/types";

function invoiceStatusBm(s: string) {
  if (s === InvoiceStatus.Paid)          return "bm-status bm-status--ok";
  if (s === InvoiceStatus.Overdue)       return "bm-status bm-status--live";
  if (s === InvoiceStatus.Pending)       return "bm-status bm-status--warn";
  if (s === InvoiceStatus.PartiallyPaid) return "bm-status bm-status--warn";
  return "bm-status bm-status--neutral";
}

function InvoiceList({ booking }: { booking: BookingDto }) {
  const { data: invoices, isLoading } = useBookingInvoices(booking.id);

  if (isLoading) return <Skeleton className="h-20" />;
  if (!invoices?.length) {
    return (
      <div className="bm-cell bm-cell--first">
        <p className="bm-meta" style={{ padding: "12px 0" }}>No invoices yet.</p>
      </div>
    );
  }

  const total   = invoices.reduce((s, inv) => s + (inv.amount ?? 0), 0);
  const pending = invoices
    .filter((i) => i.status === InvoiceStatus.Pending || i.status === InvoiceStatus.Overdue)
    .reduce((s, inv) => s + (inv.amount ?? 0), 0);

  return (
    <div>
      {/* Summary KPI */}
      <div className="bm-kpi-row" style={{ marginBottom: 20 }}>
        <div className="bm-kpi">
          <div className="bm-kpi__label">Pending</div>
          <div className="bm-kpi__value" style={{
            fontSize: 22,
            color: pending > 0 ? "var(--bm-accent)" : "var(--bm-ink)",
          }}>{formatThb(pending)}</div>
        </div>
        <div className="bm-kpi">
          <div className="bm-kpi__label">Total</div>
          <div className="bm-kpi__value" style={{ fontSize: 22 }}>{formatThb(total)}</div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bm-divider">— Invoices</div>
      {invoices.map((inv, i) => (
        <div key={inv.id} className={`bm-cell${i === 0 ? " bm-cell--first" : ""}`}>
          <div className="bm-cell__head">
            <span className={invoiceStatusBm(inv.status)}>{inv.status}</span>
            {inv.amount != null && (
              <span style={{ fontFamily: "var(--bm-mono)", fontSize: 13, fontWeight: 700 }}>
                {formatThb(inv.amount)}
              </span>
            )}
          </div>
          <div className="bm-cell__title">{inv.type}</div>
          {inv.dueDate && <div className="bm-cell__sub">Due {formatDate(inv.dueDate)}</div>}
        </div>
      ))}
    </div>
  );
}

export default function TenantInvoices() {
  const { data: bookings, isLoading } = useMyBookings();
  const activeBooking = bookings?.find(
    (b) => b.status !== BookingStatus.Completed && b.status !== BookingStatus.Cancelled,
  );

  return (
    <div className="bm-page">
      <div className="bm-display" style={{ marginBottom: 20 }}>
        Invoices <em className="acc">&amp;</em> Payments
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton className="h-16" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : !activeBooking ? (
        <div className="bm-cell bm-cell--first">
          <div className="bm-cell__title">No active booking</div>
          <div className="bm-cell__sub">Your invoices will appear here once you have an active lease.</div>
        </div>
      ) : (
        <InvoiceList booking={activeBooking} />
      )}
    </div>
  );
}
