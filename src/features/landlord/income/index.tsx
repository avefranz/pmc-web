import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <div style={{ padding: "16px 16px 48px" }}>
      {/* Page title */}
      <div style={{ borderBottom: "2px solid var(--bm-ink)", paddingBottom: 10, marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--bm-mono)", fontSize: 18, fontWeight: 700, letterSpacing: "0.04em" }}>
          Income
        </h1>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, border: "1px solid var(--bm-rule)", marginBottom: 20 }}>
        <div style={{ padding: "14px 16px", borderRight: "1px solid var(--bm-rule)" }}>
          <p style={{ fontFamily: "var(--bm-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--bm-ink-3)", marginBottom: 6 }}>
            This month
          </p>
          <p style={{ fontFamily: "var(--bm-mono)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {isLoading ? "—" : formatThb(overview?.currentMonthIncome ?? 0)}
          </p>
          {overview && (
            <p style={{ fontFamily: "var(--bm-mono)", fontSize: 9, marginTop: 4, color: "var(--bm-ink-3)" }}>
              <span style={{ color: overview.changePercent >= 0 ? "var(--bm-good)" : "var(--bm-bad)" }}>
                {overview.changePercent >= 0 ? "+" : ""}{overview.changePercent.toFixed(1)}%
              </span>
              {" "}vs last month
            </p>
          )}
        </div>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontFamily: "var(--bm-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--bm-ink-3)", marginBottom: 6 }}>
            Projected EOM
          </p>
          <p style={{ fontFamily: "var(--bm-mono)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {isLoading ? "—" : formatThb(overview?.projectedEndOfMonth ?? 0)}
          </p>
        </div>
      </div>

      {/* Revenue vs Expenses */}
      {analytics && (
        <div style={{ border: "1px solid var(--bm-rule)", marginBottom: 20 }}>
          {/* Card head */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--bm-rule)" }}>
            <span style={{ fontFamily: "var(--bm-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>
              Revenue vs Expenses
            </span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div style={{ padding: "14px" }}>
            {/* Revenue / Expenses / Net row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, border: "1px solid var(--bm-rule)", marginBottom: 12 }}>
              <div style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid var(--bm-rule)" }}>
                <p style={{ fontFamily: "var(--bm-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bm-ink-3)", marginBottom: 4 }}>
                  Revenue
                </p>
                <p style={{ fontFamily: "var(--bm-mono)", fontSize: 14, fontWeight: 700, color: "var(--bm-good)" }}>
                  {formatThb(analytics.revenue)}
                </p>
              </div>
              <div style={{ padding: "10px 12px", textAlign: "center" }}>
                <p style={{ fontFamily: "var(--bm-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bm-ink-3)", marginBottom: 4 }}>
                  Expenses
                </p>
                <p style={{ fontFamily: "var(--bm-mono)", fontSize: 14, fontWeight: 700, color: "var(--bm-bad)" }}>
                  {formatThb(analytics.expenses)}
                </p>
              </div>
            </div>

            {/* Net profit */}
            <div style={{ border: "1px solid var(--bm-rule)", padding: "10px 12px", textAlign: "center", marginBottom: 16 }}>
              <p style={{ fontFamily: "var(--bm-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bm-ink-3)", marginBottom: 4 }}>
                Net Profit · ROI: {analytics.roi.toFixed(1)}%
              </p>
              <p style={{ fontFamily: "var(--bm-mono)", fontSize: 18, fontWeight: 700, color: analytics.profit >= 0 ? "var(--bm-good)" : "var(--bm-bad)" }}>
                {formatThb(analytics.profit)}
              </p>
            </div>

            {/* Bar chart */}
            {analytics.expenseStructure.length > 0 && (
              <>
                <p style={{ fontFamily: "var(--bm-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bm-ink-3)", marginBottom: 8 }}>
                  Expense breakdown
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={analytics.expenseStructure.map((e) => ({ name: e.category, value: e.value }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "var(--bm-mono)" }} />
                    <YAxis tick={{ fontSize: 9, fontFamily: "var(--bm-mono)" }} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatThb(v)} />
                    <Bar dataKey="value" fill="var(--bm-ink)" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
