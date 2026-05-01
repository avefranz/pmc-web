import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAsset, useAssetSummary } from "@/lib/hooks/use-assets";
import { useBookingsByAsset } from "@/lib/hooks/use-bookings";
import { useTicketsByAsset } from "@/lib/hooks/use-tickets";
import { formatThb, formatDate } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";

export default function LandlordAssetDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: asset, isLoading } = useAsset(id!);
  const { data: summary } = useAssetSummary(id!);
  const { data: bookings } = useBookingsByAsset(id!);
  const { data: tickets } = useTicketsByAsset(id!);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!asset) return <div className="p-4 text-muted-foreground">Not found.</div>;

  return (
    <div className="p-4 pb-6">
      <Link to="/landlord" className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{asset.internalName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {asset.bedrooms}bd · {asset.bathrooms}ba · max {asset.maxOccupancy}
          </p>
        </div>
        <Badge className={`text-xs border-0 ${
          asset.occupancyStatus === "Occupied" ? "bg-green-100 text-green-700"
          : asset.occupancyStatus === "ActionRequired" ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-500"
        }`}>{asset.occupancyStatus}</Badge>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
              <p className="font-bold text-sm">{formatThb(summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Expenses</p>
              <p className="font-bold text-sm">{formatThb(summary.totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Net</p>
              <p className={`font-bold text-sm ${summary.netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                {formatThb(summary.netProfit)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="bookings">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="bookings" className="flex-1">Bookings</TabsTrigger>
          <TabsTrigger value="tickets" className="flex-1">Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          {!bookings?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{b.tenantName ?? "No tenant"}</p>
                      <Badge className={`text-xs border-0 ${b.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}
                    </p>
                    <p className="text-sm font-medium mt-1">{formatThb(b.rentAmount)}/mo</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets">
          {!tickets?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No tickets.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <Link key={t.id} to={`/landlord/tickets/${t.id}`}>
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <span className="text-xl shrink-0">{ticketKindIcon(t.kind)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.displayId}</p>
                      </div>
                      <Badge className={`text-xs border-0 shrink-0 ${ticketStatusColor(t.status)}`}>{t.status}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
