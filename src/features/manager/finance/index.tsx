import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceSummary, useFinanceOverview, useCreateRemittance, useConfirmRemittance } from "@/lib/hooks/use-finance";
import { formatThb } from "@/lib/utils/format";
import { FileUploadButton } from "@/components/shared/file-upload-button";
import { toast } from "sonner";
import { TrendingUp, TrendingDown } from "lucide-react";

// Siamo-palette bar colors
const CHART_COLORS = ["#1F1A14", "#E0945C", "#7A4A2B", "#463B2D", "#A89B85", "#C9BEA8"];

export default function FinancePage() {
  const { data: overview, isLoading: ovLoading } = useFinanceOverview();
  const { data: summary, isLoading: sumLoading } = useFinanceSummary();
  const createRemittance = useCreateRemittance();
  const confirmRemittance = useConfirmRemittance();

  const [remittanceBatchId, setRemittanceBatchId] = useState<string | null>(null);
  const [remittanceOpen, setRemittanceOpen] = useState(false);
  const [slipUrl, setSlipUrl] = useState("");

  async function handleCreateRemittance() {
    try {
      const result = await createRemittance.mutateAsync(undefined);
      setRemittanceBatchId(result.batchId);
      setRemittanceOpen(true);
    } catch {
      toast.error("Failed to create remittance batch");
    }
  }

  async function handleConfirmRemittance() {
    if (!remittanceBatchId || !slipUrl) return;
    try {
      await confirmRemittance.mutateAsync({ batchId: remittanceBatchId, slipUrl });
      toast.success("Remittance confirmed");
      setRemittanceOpen(false);
      setRemittanceBatchId(null);
      setSlipUrl("");
    } catch {
      toast.error("Failed to confirm remittance");
    }
  }

  const revenueChartData = (summary?.revenueByType ?? []).map((r) => ({
    name: r.category, value: r.amount,
  }));
  const expenseChartData = (summary?.expensesByType ?? []).map((e, i) => ({
    name: e.category, value: e.amount,
    pct: summary?.totalExpenses ? (e.amount / summary.totalExpenses) * 100 : 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const pct = overview?.changePercent ?? 0;
  const pctUp = pct > 0;

  return (
    <div>
      {/* ── PAGE HEAD ──────────────────────────────────────────────────────── */}
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">Workspace · Finance</div>
          <h1 className="adm-pagehead__title">Finance</h1>
        </div>
        <div className="adm-pagehead__actions">
          <button
            className="adm-btn adm-btn--ghost"
            onClick={handleCreateRemittance}
            disabled={createRemittance.isPending}
          >
            {createRemittance.isPending ? "Creating…" : "Create remittance"}
          </button>
        </div>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────────────────── */}
      <div className="adm-kpi-row" style={{ marginBottom: 24 }}>
        <div className="adm-kpi">
          <div className="adm-kpi__label">This month</div>
          {ovLoading ? <Skeleton className="h-7 w-32 mt-1" />
            : <div className="adm-kpi__value">{formatThb(overview?.currentMonthIncome ?? 0)}</div>}
          {!ovLoading && (
            <div className={`adm-kpi__delta ${pct === 0 ? "adm-kpi__delta--flat" : pctUp ? "adm-kpi__delta--up" : "adm-kpi__delta--down"}`}>
              {pctUp ? <TrendingUp size={11} /> : pct < 0 ? <TrendingDown size={11} /> : null}
              {pct > 0 ? "+" : ""}{pct.toFixed(1)}% vs prev
            </div>
          )}
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Projected EOM</div>
          {ovLoading ? <Skeleton className="h-7 w-32 mt-1" />
            : <div className="adm-kpi__value">{formatThb(overview?.projectedEndOfMonth ?? 0)}</div>}
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Total revenue</div>
          {sumLoading ? <Skeleton className="h-7 w-32 mt-1" />
            : <div className="adm-kpi__value">{formatThb(summary?.totalRevenue ?? 0)}</div>}
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Net profit</div>
          {sumLoading ? <Skeleton className="h-7 w-32 mt-1" />
            : <div className={`adm-kpi__value ${(summary?.netProfit ?? 0) < 0 ? "adm-kpi__delta--down" : ""}`}>
                {formatThb(summary?.netProfit ?? 0)}
              </div>}
        </div>
      </div>

      {/* ── CHARTS ─────────────────────────────────────────────────────────── */}
      <div className="adm-2col" style={{ gap: 16 }}>
        <div className="adm-card">
          <div className="adm-card__head">
            <div className="adm-card__title">Revenue by type</div>
          </div>
          <div style={{ padding: "8px 20px 20px" }}>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueChartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#A89B85" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#A89B85" }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} width={48} />
                  <Tooltip
                    formatter={(v: number) => [formatThb(v), "Revenue"]}
                    contentStyle={{ fontFamily: "var(--mono)", fontSize: 12, border: "1px solid #E8DFCF", background: "#FFFCF7", borderRadius: 0 }}
                  />
                  <Bar dataKey="value" fill="#1F1A14" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="adm-empty" style={{ margin: 0, padding: "32px 0" }}>
                <div style={{ fontSize: 13, color: "var(--ink-4)" }}>No revenue data yet.</div>
              </div>
            )}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card__head">
            <div className="adm-card__title">Expense breakdown</div>
          </div>
          <div style={{ padding: "8px 20px 20px" }}>
            {expenseChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={expenseChartData} barSize={28}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#A89B85" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#A89B85" }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} width={48} />
                    <Tooltip
                      formatter={(v: number) => [formatThb(v), "Expense"]}
                      contentStyle={{ fontFamily: "var(--mono)", fontSize: 12, border: "1px solid #E8DFCF", background: "#FFFCF7", borderRadius: 0 }}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {expenseChartData.map((item, i) => (
                        <Cell key={i} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {expenseChartData.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, background: item.color }} />
                        <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{item.name}</span>
                      </div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>{item.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="adm-empty" style={{ margin: 0, padding: "32px 0" }}>
                <div style={{ fontSize: 13, color: "var(--ink-4)" }}>No expense data yet.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── REMITTANCE DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={remittanceOpen} onOpenChange={(v) => !v && setRemittanceOpen(false)}>
        <DialogContent className="adm-modal max-w-md p-0 gap-0 overflow-hidden [&>button]:hidden">
          <div className="adm-modal__head">
            <div>
              <div className="adm-modal__title">Confirm remittance</div>
              <div className="adm-modal__sub">Upload a payment slip to complete the transfer.</div>
            </div>
          </div>
          <div className="adm-modal__body">
            <p style={{ fontSize: 13, color: "#7A6E5B", marginBottom: 14 }}>
              Batch <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{remittanceBatchId}</span> created.
            </p>
            <FileUploadButton
              onFile={async (file) => {
                const url = URL.createObjectURL(file);
                setSlipUrl(url);
                toast.success("Slip ready");
              }}
              accept="image/*,.pdf"
              label="Upload slip"
            />
            {slipUrl && (
              <p style={{ fontSize: 12, color: "#2D7A4F", marginTop: 8 }}>✓ Slip uploaded</p>
            )}
          </div>
          <div className="adm-modal__foot">
            <button className="adm-btn adm-btn--ghost" onClick={() => setRemittanceOpen(false)}>Cancel</button>
            <button
              className="adm-btn adm-btn--ink"
              onClick={handleConfirmRemittance}
              disabled={!slipUrl || confirmRemittance.isPending}
            >
              {confirmRemittance.isPending ? "Confirming…" : "Confirm transfer"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
