import { Link } from "react-router-dom";
import { Building2, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useAssets } from "@/lib/hooks/use-assets";
import { useMe } from "@/lib/hooks/use-auth";
import { AssetOccupancyStatus } from "@/lib/types/enums";
import type { AssetDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function occupancyBadge(status: AssetOccupancyStatus) {
  const map: Record<AssetOccupancyStatus, { label: string; className: string }> = {
    [AssetOccupancyStatus.Vacant]: { label: "Vacant", className: "bg-success/10 text-success" },
    [AssetOccupancyStatus.Occupied]: { label: "Occupied", className: "bg-[var(--color-info-bg)] text-[var(--color-info)]" },
    [AssetOccupancyStatus.ActionRequired]: { label: "Action needed", className: "bg-warning/10 text-warning" },
  };
  return map[status] ?? { label: status, className: "bg-bg-subtle text-fg-muted" };
}

function ManagedRow({ asset }: { asset: AssetDto }) {
  const badge = occupancyBadge(asset.occupancyStatus);
  return (
    <div className="flex items-center gap-4 p-4 bg-bg-card rounded-xl shadow-card hover:shadow-hover transition-shadow">
      <div className="w-16 h-12 rounded-lg bg-bg-subtle overflow-hidden shrink-0">
        {asset.primaryImageUrl
          ? <img src={asset.primaryImageUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-fg-subtle"><Building2 size={18} /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg line-clamp-1">{asset.internalName}</p>
        {asset.currentTenantName && (
          <p className="text-xs text-fg-muted">Tenant: {asset.currentTenantName}</p>
        )}
      </div>
      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", badge.className)}>
        {badge.label}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <Button asChild variant="outline" size="sm">
          <Link to="/me/host/managed/invite">
            <UserPlus size={13} className="mr-1" />Invite landlord
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/me/host/properties/${asset.id}`}>View</Link>
        </Button>
      </div>
    </div>
  );
}

export function ManagedListPage() {
  const { data: assets, isLoading } = useAssets();
  const { data: me } = useMe();

  const managedAssets = me
    ? (assets ?? []).filter((a: any) => a.ownerId !== me.id)
    : (assets ?? []);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Managed properties" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Managed properties"
        subtitle="Properties you manage on behalf of landlords"
        actions={
          <Button asChild variant="outline">
            <Link to="/me/host/managed/invite">
              <Plus size={14} className="mr-1.5" />Invite landlord
            </Link>
          </Button>
        }
      />
      {managedAssets.length === 0 ? (
        <EmptyState
          icon={<Building2 size={36} />}
          title="No managed properties"
          description="Invite a landlord to link their property to your management account."
          action={
            <Button asChild variant="outline">
              <Link to="/me/host/managed/invite">Invite landlord</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {managedAssets.map((a: AssetDto) => <ManagedRow key={a.id} asset={a} />)}
        </div>
      )}
    </div>
  );
}
