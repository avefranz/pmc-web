import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAssets } from "@/lib/hooks/use-assets";
import { useBookingsByAsset } from "@/lib/hooks/use-bookings";
import { formatDate, formatThb } from "@/lib/utils/format";

function AssetBookings({ assetId, assetName }: { assetId: string; assetName: string }) {
  const { data: bookings, isLoading } = useBookingsByAsset(assetId);

  if (isLoading) return <Skeleton className="h-12 w-full" />;
  if (!bookings?.length) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {assetName}
      </h3>
      <div className="space-y-2 mb-6">
        {bookings.map((b) => (
          <Link key={b.id} to={`/manager/bookings/${b.id}`}>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                {b.primaryImageUrl ? (
                  <img src={b.primaryImageUrl} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-xl shrink-0">🏠</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{b.tenantName ?? "No tenant"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatThb(b.rentAmount)}/mo</p>
                  <Badge className={`text-xs border-0 mt-1 ${b.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {b.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const { data: assets, isLoading } = useAssets();

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="All leases and short-term bookings across your properties."
        action={
          <Link to="/manager/bookings/new">
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />New booking</Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !assets?.length ? (
        <EmptyState
          icon="📋"
          title="No properties"
          description="Add a property first to create bookings."
        />
      ) : (
        <div>
          {assets.map((a) => (
            <AssetBookings key={a.id} assetId={a.id} assetName={a.internalName} />
          ))}
        </div>
      )}
    </div>
  );
}
