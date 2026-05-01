import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { useFinanceOverview, useFinanceAnalytics } from "@/lib/hooks/use-finance";
import { formatThb, changePercentColor } from "@/lib/utils/format";

const PERIODS = [
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
];

export default function LandlordIncome() {
  const [period, setPeriod] = useState("3m");
  const { data: overview, isLoading } = useFinanceOverview();
  const { data: analytics } = useFinanceAnalytics(period);

  return (
    <div className="p-4 pb-6">
      <h1 className="text-xl font-bold mb-4">Income</h1>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="This month"
          value={isLoading ? "—" : formatThb(overview?.currentMonthIncome ?? 0)}
          sub={overview ? `${overview.changePercent >= 0 ? "+" : ""}${overview.changePercent.toFixed(1)}% vs last month` : undefined}
          subColor={changePercentColor(overview?.changePercent ?? 0)}
          loading={isLoading}
        />
        <StatCard
          label="Projected EOM"
          value={isLoading ? "—" : formatThb(overview?.projectedEndOfMonth ?? 0)}
          loading={isLoading}
        />
      </div>

      {analytics && (
        <Card className="mb-4">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Revenue vs Expenses</CardTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                <p className="font-bold text-green-700">{formatThb(analytics.revenue)}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                <p className="font-bold text-red-600">{formatThb(analytics.expenses)}</p>
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg mb-4">
              <p className="text-xs text-muted-foreground mb-1">Net Profit · ROI: {analytics.roi.toFixed(1)}%</p>
              <p className={`font-bold text-lg ${analytics.profit >= 0 ? "text-blue-700" : "text-red-600"}`}>
                {formatThb(analytics.profit)}
              </p>
            </div>

            {analytics.expenseStructure.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-2">Expense breakdown</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={analytics.expenseStructure.map((e) => ({ name: e.category, value: e.value }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatThb(v)} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
