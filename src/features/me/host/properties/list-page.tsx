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
    <>
      <style>{`
        @keyframes crystalFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes diamondGlint {
          0%, 70%, 100% { opacity: 0; transform: scale(0) rotate(20deg); }
          25%, 50%      { opacity: 0.55; transform: scale(1) rotate(20deg); }
        }
        .add-prop-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            110deg,
            #111118 0%, #1a1635 22%, #2e2060 38%,
            #3a1f72 50%, #2e2060 62%, #1a1635 78%, #111118 100%
          ) !important;
          background-size: 250% 100% !important;
          animation: crystalFlow 6s ease-in-out infinite !important;
          transition: opacity 0.2s !important;
        }
        .add-prop-btn:hover { opacity: 0.85; }
        .add-prop-sparkle {
          position: absolute;
          pointer-events: none;
          color: rgba(220,230,255,0.7);
          line-height: 1;
          text-shadow: 0 0 2px rgba(255,255,255,0.6), 0 0 6px rgba(180,210,255,0.4);
        }
      `}</style>
      <Button asChild className="add-prop-btn text-white">
        <Link to="/me/host/properties/new">
          {[
            { top: "20%", left: "10%", fs: 7,  dur: "5.5s", delay: "0s"   },
            { top: "55%", left: "72%", fs: 5,  dur: "6.2s", delay: "1.8s" },
            { top: "18%", left: "82%", fs: 8,  dur: "7.0s", delay: "3.2s" },
            { top: "70%", left: "25%", fs: 5,  dur: "5.8s", delay: "0.9s" },
          ].map((s, i) => (
            <span
              key={i}
              className="add-prop-sparkle"
              style={{
                top: s.top, left: s.left,
                fontSize: s.fs,
                animation: `diamondGlint ${s.dur} ${s.delay} infinite`,
              }}
            >✦</span>
          ))}
          <Plus size={16} className="mr-1.5 relative z-10" />
          <span className="relative z-10">Add property</span>
        </Link>
      </Button>
    </>
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
