import { TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { useFinanceSummary, useFinanceOverview } from "@/lib/hooks/use-finance";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { formatThb } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const CHART_COLORS = ["#E0945C", "#C97D44", "#7A4A2B", "#463B2D", "#A89B85", "#C9BEA8"];

function KpiCard({ label, value, loading, delta }: {
  label: string;
  value: string;
  loading?: boolean;
  delta?: { pct: number };
}) {
  return (
    <div className="bg-bg-card rounded-xl shadow-card p-5">
      <p className="text-xs text-fg-muted mb-1">{label}</p>
      {loading ? (
        <Skeleton className="h-7 w-32 mt-1" />
      ) : (
        <p className="text-2xl font-semibold text-fg">{value}</p>
      )}
      {delta && !loading && (
        <div className={cn(
          "flex items-center gap-1 text-xs mt-1 font-medium",
          delta.pct > 0 ? "text-success" : delta.pct < 0 ? "text-danger" : "text-fg-muted",
        )}>
          {delta.pct > 0 ? <TrendingUp size={11} /> : delta.pct < 0 ? <TrendingDown size={11} /> : null}
          {delta.pct > 0 ? "+" : ""}{delta.pct.toFixed(1)}% vs prev
        </div>
      )}
    </div>
  );
}

export function FinancePage() {
  const { data: caps, isLoading: capsLoading } = useCapabilities();
  const { data: overview, isLoading: ovLoading } = useFinanceOverview();
  const { data: summary, isLoading: sumLoading } = useFinanceSummary();

  // BUG-116: block the page entirely until capabilities are known — prevents
  // tenants from briefly seeing finance charts before the access check fires.
  if (capsLoading) {
    return (
      <div>
        <PageHeader title="Finance" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl shadow-card p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (caps && !caps.isLandlord) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-6">
        <p className="text-4xl">🔒</p>
        <p className="text-lg font-semibold text-fg">Host finances only</p>
        <p className="text-sm text-fg-muted">This section is for property owners. You don't have any properties listed.</p>
      </div>
    );
  }
  // BUG-104/UX-105: show all revenue categories including deposits in the chart.
  // Deposits are real cash received — label them "(held by Siamo)" so landlords
  // understand they're not earned income yet.
  const allRevByType = summary?.revenueByType ?? [];
  const depositTotal = allRevByType
    .filter((r) => r.category === "Deposit")
    .reduce((sum, r) => sum + r.amount, 0);
  // Chart: relabel "Deposit" → "Deposit (held)" so bars match KPI total
  const revenueChartData = allRevByType.map((r) => ({
    name: r.category === "Deposit" ? "Deposit (held)" : r.category,
    value: r.amount,
    isDeposit: r.category === "Deposit",
  }));
  // KPIs: totalRevenue from API already includes deposit; keep consistent with "This month"
  const trueRevenue = summary?.totalRevenue ?? 0;
  const trueNetProfit = summary?.netProfit ?? 0;
  const expenseChartData = (summary?.expensesByType ?? []).map((e, i) => ({
    name: e.category, value: e.amount,
    pct: summary?.totalExpenses ? (e.amount / summary.totalExpenses) * 100 : 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const pct = overview?.changePercent ?? 0;

  return (
    <div>
      <PageHeader title="Finance" />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="This month"
          value={formatThb(overview?.currentMonthIncome ?? 0)}
          loading={ovLoading}
          delta={{ pct }}
        />
        <KpiCard
          label="Projected EOM"
          value={formatThb(overview?.projectedEndOfMonth ?? 0)}
          loading={ovLoading}
        />
        <KpiCard
          label="Total revenue"
          value={formatThb(trueRevenue)}
          loading={sumLoading}
        />
        <KpiCard
          label="Net profit"
          value={formatThb(trueNetProfit)}
          loading={sumLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-semibold text-fg">Revenue by type</p>
            {depositTotal > 0 && (
              <p className="text-[11px] text-fg-muted text-right leading-tight max-w-[140px]">
                {formatThb(depositTotal)} deposit held by Siamo
              </p>
            )}
          </div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChartData} barSize={36} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#717171" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#717171" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
                  width={52}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  formatter={(v, _name, props) => [
                    formatThb(v as number),
                    props.payload?.isDeposit ? "Held by Siamo" : "Earned",
                  ]}
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", background: "#fff", borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {revenueChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isDeposit ? "#A89B85" : "#E0945C"} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v: number) => `฿${(v / 1000).toFixed(0)}k`}
                    style={{ fontSize: 10, fill: "#717171", fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-fg-muted text-center py-8">No revenue data yet.</p>
          )}
        </div>

        <div className="bg-bg-card rounded-xl shadow-card p-5">
          <p className="text-sm font-semibold text-fg mb-4">Expense breakdown</p>
          {expenseChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={expenseChartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#717171" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#717171" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
                    width={48}
                  />
                  <Tooltip
                    formatter={(v) => [formatThb(v as number), "Expense"]}
                    contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", background: "#fff", borderRadius: 8 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {expenseChartData.map((item, i) => (
                      <Cell key={i} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {expenseChartData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-fg">{item.name}</span>
                    </div>
                    <span className="text-xs text-fg-muted">{item.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-fg-muted text-center py-8">No expense data yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}
