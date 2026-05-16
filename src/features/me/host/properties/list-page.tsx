import { Link } from "react-router-dom";
import { Plus, Building2, ShieldCheck, Wallet, Users, AlertTriangle, UserCheck, DoorOpen, Phone, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useAssets } from "@/lib/hooks/use-assets";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useMe } from "@/lib/hooks/use-auth";
import { useMyProfile } from "@/lib/hooks/use-profile";
import { AssetOccupancyStatus } from "@/lib/types/enums";
import type { AssetDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function statusConfig(asset: AssetDto): {
  dot: string;
  label: string;
  sub: string;
  border: string;
  Icon: React.ElementType;
  iconCls: string;
} {
  const name = asset.currentTenantName;

  switch (asset.occupancyStatus) {
    case AssetOccupancyStatus.Occupied:
      return {
        dot:     "bg-blue-500",
        label:   name ?? "Occupied",
        sub:     name ? "Active tenant" : "Active lease",
        border:  "border-l-blue-400",
        Icon:    UserCheck,
        iconCls: "text-blue-500",
      };
    case AssetOccupancyStatus.ActionRequired:
      return {
        dot:     "bg-warning",
        label:   "Action needed",
        sub:     "Something requires your attention",
        border:  "border-l-warning",
        Icon:    AlertTriangle,
        iconCls: "text-warning",
      };
    default: // Vacant
      return {
        dot:     "bg-success",
        label:   "Vacant",
        sub:     "No active tenant",
        border:  "border-l-success/50",
        Icon:    DoorOpen,
        iconCls: "text-success",
      };
  }
}

function PropertyCard({ asset }: { asset: AssetDto }) {
  const cfg = statusConfig(asset);
  const specs = [
    asset.bedrooms    && `${asset.bedrooms} bed`,
    asset.bathrooms   && `${asset.bathrooms} bath`,
    asset.areaSqm     && `${asset.areaSqm} m²`,
  ].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/me/host/properties/${asset.id}`}
      className={cn(
        "group bg-bg-card rounded-xl shadow-card hover:shadow-hover transition-all overflow-hidden flex flex-col border-l-[3px]",
        cfg.border,
      )}
    >
      {/* Photo */}
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

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-fg text-sm leading-snug line-clamp-1">{asset.internalName}</h3>
        {specs && <p className="text-xs text-fg-muted">{specs}</p>}

        {/* Status row */}
        <div className="flex items-center gap-2 pt-1 border-t border-border mt-0.5">
          <cfg.Icon size={13} className={cn("shrink-0", cfg.iconCls)} />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-fg">{cfg.label}</span>
            <span className="text-xs text-fg-muted"> · {cfg.sub}</span>
          </div>
        </div>
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
  const { data: profile } = useMyProfile();

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

  // TODO: sort by createdAt desc once backend adds the field — using refNo as proxy for now
  const list = [...(assets ?? [])].sort((a, b) => b.refNo - a.refNo);
  const ownedAssets = me ? list.filter((a) => a.ownerId === me.id) : list;
  const managedAssets = me ? list.filter((a) => a.ownerId !== me.id) : [];

  if (!list.length) {
    return (
      <div className="min-h-[calc(100vh-var(--topbar-h)-4rem)] flex flex-col items-center justify-center py-16 px-4 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-6">
          <Building2 size={32} className="text-brand" />
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mb-3">
          List your first property
        </h1>
        <p className="text-fg-muted text-base max-w-md mb-10">
          Publish your apartment or villa on Siamo and start receiving booking requests from vetted tenants.
        </p>

        {/* CTA */}
        <div className="mb-14">
          {addBtn}
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-left">
          {[
            {
              icon: Users,
              title: "Verified tenants",
              desc: "Every applicant goes through identity verification before moving in.",
            },
            {
              icon: Wallet,
              title: "On-time payments",
              desc: "Rent is collected and transferred to you automatically each month.",
            },
            {
              icon: ShieldCheck,
              title: "Full management",
              desc: "Maintenance, contracts, and TM30 filings — we handle the paperwork.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-bg-card rounded-xl border border-border p-5">
              <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center mb-3">
                <Icon size={18} className="text-brand" />
              </div>
              <p className="text-sm font-semibold text-fg mb-1">{title}</p>
              <p className="text-xs text-fg-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const showSections = caps?.isManager && managedAssets.length > 0;

  const noContact = profile !== undefined && !profile.phone;
  const noPayment = profile !== undefined && !profile.promptPayId && !profile.bankAccountNumber;

  return (
    <div>
      <PageHeader title="My properties" actions={addBtn} />

      {(noContact || noPayment) && (
        <div className="space-y-3 mb-6">
          {noContact && (
            <Link
              to="/me/host/settings/contact"
              className="block rounded-2xl border border-brand/30 bg-brand/5 p-4 hover:brightness-95 transition"
            >
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-brand shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg">Add your contact details</p>
                  <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                    Your phone number and messaging apps are shared with tenants after a booking is confirmed, so they can reach you directly.
                  </p>
                </div>
                <span className="text-xs font-semibold text-brand shrink-0 self-center">Add →</span>
              </div>
            </Link>
          )}
          {noPayment && (
            <Link
              to="/me/host/settings/payment"
              className="block rounded-2xl border border-warning/40 bg-warning/8 p-4 hover:brightness-95 transition"
            >
              <div className="flex items-start gap-3">
                <CreditCard size={18} className="text-warning shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg">Set up payment details</p>
                  <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                    Add a PromptPay number or bank account so tenants can pay rent. Without this, bookings will stall at the payment step.
                  </p>
                </div>
                <span className="text-xs font-semibold text-warning shrink-0 self-center">Set up →</span>
              </div>
            </Link>
          )}
        </div>
      )}
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
