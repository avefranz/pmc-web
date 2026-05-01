import { Link } from "react-router-dom";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useAssets } from "@/lib/hooks/use-assets";
import { useFinanceOverview } from "@/lib/hooks/use-finance";
import { formatThb, changePercentColor } from "@/lib/utils/format";

export default function LandlordPortfolio() {
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: overview, isLoading: ovLoading } = useFinanceOverview();

  return (
    <div className="p-4 pb-6">
      <h1 className="text-xl font-bold mb-4">My Properties</h1>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="This month"
          value={ovLoading ? "—" : formatThb(overview?.currentMonthIncome ?? 0)}
          sub={overview ? `${(overview.changePercent >= 0 ? "+" : "")}${overview.changePercent.toFixed(1)}%` : undefined}
          subColor={changePercentColor(overview?.changePercent ?? 0)}
          icon={(overview?.changePercent ?? 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          loading={ovLoading}
        />
        <StatCard
          label="Properties"
          value={assetsLoading ? "—" : String(assets?.length ?? 0)}
          sub={assets ? `${assets.filter((a) => a.occupancyStatus === "Occupied").length} occupied` : undefined}
          icon={<Building2 className="h-4 w-4" />}
          loading={assetsLoading}
        />
      </div>

      {assetsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !assets?.length ? (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="No properties" description="Contact your manager to get access." />
      ) : (
        <div className="space-y-3">
          {assets.map((a) => (
            <Link key={a.id} to={`/landlord/assets/${a.id}`}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{a.internalName}</p>
                    {a.currentTenantName && <p className="text-xs text-muted-foreground">{a.currentTenantName}</p>}
                  </div>
                  <Badge className={`text-xs border-0 shrink-0 ${
                    a.occupancyStatus === "Occupied" ? "bg-green-100 text-green-700"
                    : a.occupancyStatus === "ActionRequired" ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-500"
                  }`}>{a.occupancyStatus}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
