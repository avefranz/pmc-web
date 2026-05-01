import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Building2, DollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useFinanceOverview } from "@/lib/hooks/use-finance";
import { useTickets } from "@/lib/hooks/use-tickets";
import { useAssets } from "@/lib/hooks/use-assets";
import { formatThb, formatRelative, changePercentColor } from "@/lib/utils/format";
import { ticketPriorityColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { useAuthStore } from "@/lib/stores/auth.store";

const CLOSED_STATUSES = new Set(["Closed", "Completed", "Cancelled", "Canceled", "Verified"]);

const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const { data: overview, isLoading: overviewLoading } = useFinanceOverview();
  const { data: allTickets, isLoading: ticketsLoading } = useTickets();
  const { data: assets, isLoading: assetsLoading } = useAssets();

  const openTickets = (allTickets ?? [])
    .filter((t) => !CLOSED_STATUSES.has(t.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const pctPositive = (overview?.changePercent ?? 0) >= 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.firstName ? `, ${user.firstName}` : ""}`}
        description="Here's what's happening across your properties."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="This month"
          value={overviewLoading ? "—" : formatThb(overview?.currentMonthIncome ?? 0)}
          sub={
            overviewLoading
              ? undefined
              : `${pctPositive ? "+" : ""}${overview?.changePercent.toFixed(1)}% vs last month`
          }
          subColor={changePercentColor(overview?.changePercent ?? 0)}
          icon={pctPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          loading={overviewLoading}
          accent
        />
        <StatCard
          label="Projected (EOM)"
          value={overviewLoading ? "—" : formatThb(overview?.projectedEndOfMonth ?? 0)}
          icon={<DollarSign className="h-4 w-4" />}
          loading={overviewLoading}
        />
        <StatCard
          label="Properties"
          value={assetsLoading ? "—" : String(assets?.length ?? 0)}
          sub={
            assetsLoading
              ? undefined
              : `${assets?.filter((a) => a.occupancyStatus === "Occupied").length ?? 0} occupied`
          }
          icon={<Building2 className="h-4 w-4" />}
          loading={assetsLoading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Open Tickets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Open Tickets
              <div className="flex items-center gap-2">
                <Link to="/manager/tickets/new">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" />New
                  </Button>
                </Link>
                <Link to="/manager/tickets" className="text-sm font-normal text-primary hover:underline">
                  View all
                </Link>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ticketsLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !openTickets.length ? (
              <EmptyState
                icon="🎉"
                title="All clear"
                description="No open tickets right now."
                className="py-10"
              />
            ) : (
              <ul className="divide-y">
                {openTickets.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/manager/tickets/${t.id}`}
                      className="flex items-start gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-lg shrink-0 mt-0.5">{ticketKindIcon(t.kind)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.assetName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={`text-xs ${ticketPriorityColor(t.priority)} border-0`}>
                          {t.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatRelative(t.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Properties overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Properties
              <Link to="/manager/assets" className="text-sm font-normal text-primary hover:underline">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {assetsLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !assets?.length ? (
              <EmptyState
                icon={<Building2 className="h-8 w-8" />}
                title="No properties yet"
                description="Add your first property to get started."
                className="py-10"
              />
            ) : (
              <ul className="divide-y">
                {assets.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/manager/assets/${a.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.internalName}</p>
                        {a.currentTenantName && (
                          <p className="text-xs text-muted-foreground">{a.currentTenantName}</p>
                        )}
                      </div>
                      <Badge
                        className={`text-xs border-0 ${
                          a.occupancyStatus === "Occupied"
                            ? "bg-green-100 text-green-700"
                            : a.occupancyStatus === "ActionRequired"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {a.occupancyStatus}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
