import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus, BedDouble, Bath, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAssets } from "@/lib/hooks/use-assets";
import { CreatePropertyWizard } from "./create-wizard";
import type { AssetDto } from "@/lib/types";

const STATUS_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
  Occupied:       { badge: "bg-green-100 text-green-700", dot: "bg-green-500", label: "Occupied" },
  Vacant:         { badge: "bg-gray-100 text-gray-600",  dot: "bg-gray-400",  label: "Vacant" },
  ActionRequired: { badge: "bg-red-100 text-red-700",    dot: "bg-red-500",   label: "Action required" },
};

function OccupancyBadge({ status }: { status: AssetDto["occupancyStatus"] }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.Vacant;
  return (
    <Badge className={`text-xs border-0 flex items-center gap-1 ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </Badge>
  );
}

function PropertyCard({ asset }: { asset: AssetDto }) {
  return (
    <Link to={`/manager/assets/${asset.id}`}>
      <Card className="hover:shadow-md transition-all h-full group overflow-hidden">
        {/* Photo or placeholder */}
        <div className="h-40 bg-muted overflow-hidden relative">
          {asset.primaryImageUrl ? (
            <img
              src={asset.primaryImageUrl}
              alt={asset.internalName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <Building2 className="h-10 w-10 text-slate-300" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <OccupancyBadge status={asset.occupancyStatus} />
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-1 truncate">{asset.internalName}</h3>

          {asset.currentTenantName ? (
            <p className="text-xs text-muted-foreground mb-2 truncate">
              {asset.currentTenantName}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-2 italic">No tenant</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" />{asset.bedrooms}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />{asset.bathrooms}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />max {asset.maxOccupancy}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AssetsPage() {
  const { data: assets, isLoading } = useAssets();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Manage all your rental units and buildings."
        action={
          assets?.length ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add property
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : !assets?.length ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No properties yet"
          description="Add your first property to start managing leases, tickets, and finances."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add property
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <PropertyCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      <CreatePropertyWizard open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
