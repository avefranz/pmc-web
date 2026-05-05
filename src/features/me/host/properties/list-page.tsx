import { Link } from "react-router-dom";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useAssets } from "@/lib/hooks/use-assets";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useMe } from "@/lib/hooks/use-auth";
import { AssetOccupancyStatus } from "@/lib/types/enums";
import type { AssetDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function occupancyLabel(status: AssetOccupancyStatus) {
  switch (status) {
    case AssetOccupancyStatus.Vacant: return { label: "Vacant", className: "bg-success/10 text-success border-success/20" };
    case AssetOccupancyStatus.Occupied: return { label: "Occupied", className: "bg-info/10 text-[var(--color-info)] border-[var(--color-info)]/20" };
    case AssetOccupancyStatus.ActionRequired: return { label: "Action needed", className: "bg-warning/10 text-warning border-warning/20" };
    default: return { label: status, className: "" };
  }
}

function PropertyCard({ asset }: { asset: AssetDto }) {
  const badge = occupancyLabel(asset.occupancyStatus);
  const specs = [
    asset.bedrooms && `${asset.bedrooms} bed`,
    asset.bathrooms && `${asset.bathrooms} bath`,
    asset.maxOccupancy && `${asset.maxOccupancy} guests`,
  ].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/me/host/properties/${asset.id}`}
      className="group bg-bg-card rounded-xl shadow-card hover:shadow-hover transition-shadow overflow-hidden flex flex-col"
    >
      <div className="aspect-[4/3] bg-bg-subtle overflow-hidden">
        {asset.primaryImageUrl ? (
          <img
            src={asset.primaryImageUrl}
            alt={asset.internalName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-subtle">
            <Building2 size={40} />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-fg text-sm leading-snug line-clamp-1">{asset.internalName}</h3>
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", badge.className)}>
            {badge.label}
          </span>
        </div>
        {specs && <p className="text-xs text-fg-muted">{specs}</p>}
        {asset.currentTenantName && (
          <p className="text-xs text-fg-muted">Tenant: {asset.currentTenantName}</p>
        )}
      </div>
    </Link>
  );
}

function PropertyGrid({ assets, title }: { assets: AssetDto[]; title?: string }) {
  if (!assets.length) return null;
  return (
    <div className="mb-8">
      {title && <h2 className="text-base font-semibold text-fg mb-4">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assets.map((a) => <PropertyCard key={a.id} asset={a} />)}
      </div>
    </div>
  );
}

export function PropertiesListPage() {
  const { data: assets, isLoading } = useAssets();
  const { data: caps } = useCapabilities();
  const { data: me } = useMe();

  const addBtn = (
    <Button asChild className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
      <Link to="/me/host/properties/new"><Plus size={16} className="mr-1.5" />Add property</Link>
    </Button>
  );

  if (isLoading) {
    return (
      <div>
        <PageHeader title="My properties" actions={addBtn} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const list = assets ?? [];
  const ownedAssets = me ? list.filter((a) => a.ownerId === me.id) : list;
  const managedAssets = me ? list.filter((a) => a.ownerId !== me.id) : [];

  if (!list.length) {
    return (
      <div>
        <PageHeader title="My properties" actions={addBtn} />
        <EmptyState
          icon={<Building2 size={40} />}
          title="No properties yet"
          description="Add your first property to start hosting on Siamo."
        />
      </div>
    );
  }

  const showSections = caps?.isManager && managedAssets.length > 0;

  return (
    <div>
      <PageHeader title="My properties" actions={addBtn} />
      {showSections ? (
        <>
          <PropertyGrid assets={ownedAssets} title="Owned" />
          <PropertyGrid assets={managedAssets} title="Managed" />
        </>
      ) : (
        <PropertyGrid assets={list} />
      )}
    </div>
  );
}
