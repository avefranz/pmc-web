import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useMyBookings, useBookingInvoices } from "@/lib/hooks/use-bookings";
import { formatDate, formatThb } from "@/lib/utils/format";
import { InvoiceStatus, BookingStatus } from "@/lib/types/enums";
import type { BookingDto } from "@/lib/types";

function InvoiceList({ booking }: { booking: BookingDto }) {
  const { data: invoices, isLoading } = useBookingInvoices(booking.id);

  if (isLoading) return <Skeleton className="h-20" />;
  if (!invoices?.length) return <p className="text-sm text-muted-foreground">No invoices yet.</p>;

  const total = invoices.reduce((s, inv) => s + (inv.amount ?? 0), 0);
  const pending = invoices.filter((i) => i.status === InvoiceStatus.Pending || i.status === InvoiceStatus.Overdue)
    .reduce((s, inv) => s + (inv.amount ?? 0), 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700 mb-1">Pending</p>
            <p className="font-bold text-amber-800">{formatThb(pending)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="font-bold">{formatThb(total)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {invoices.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{inv.type}</p>
                {inv.dueDate && (
                  <p className="text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</p>
                )}
              </div>
              <div className="text-right">
                {inv.amount != null && <p className="font-semibold text-sm">{formatThb(inv.amount)}</p>}
                <Badge className={`text-xs border-0 mt-1 ${
                  inv.status === InvoiceStatus.Paid ? "bg-green-100 text-green-700"
                  : inv.status === InvoiceStatus.Overdue ? "bg-red-100 text-red-700"
                  : inv.status === InvoiceStatus.Pending ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-500"
                }`}>{inv.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function TenantInvoices() {
  const { data: bookings, isLoading } = useMyBookings();
  const activeBooking = bookings?.find(
    (b) => b.status !== BookingStatus.Completed && b.status !== BookingStatus.Cancelled,
  );

  if (isLoading) return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20" />
      <Skeleton className="h-16" />
    </div>
  );

  return (
    <div className="p-4 pb-6">
      <h1 className="text-xl font-bold mb-4">Invoices & Payments</h1>

      {!activeBooking ? (
        <EmptyState icon="📄" title="No booking" description="You'll see your invoices here once you have an active lease." />
      ) : (
        <InvoiceList booking={activeBooking} />
      )}
    </div>
  );
}
