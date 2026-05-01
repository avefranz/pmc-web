import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFinanceSummary, useFinanceOverview, useCreateRemittance, useConfirmRemittance } from "@/lib/hooks/use-finance";
import { formatThb, changePercentColor } from "@/lib/utils/format";
import { FileUploadButton } from "@/components/shared/file-upload-button";
import { toast } from "sonner";

const BAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

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
    name: r.category,
    value: r.amount,
  }));

  const expenseChartData = (summary?.expensesByType ?? []).map((e, i) => ({
    name: e.category,
    value: e.amount,
    pct: summary?.totalExpenses ? (e.amount / summary.totalExpenses) * 100 : 0,
    color: BAR_COLORS[i % BAR_COLORS.length],
  }));

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Revenue, expenses, and payment tracking."
        action={
          <Button size="sm" variant="outline" onClick={handleCreateRemittance} disabled={createRemittance.isPending}>
            Create remittance
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="This month"
          value={ovLoading ? "—" : formatThb(overview?.currentMonthIncome ?? 0)}
          sub={`${(overview?.changePercent ?? 0) >= 0 ? "+" : ""}${overview?.changePercent?.toFixed(1) ?? 0}% vs prev`}
          subColor={changePercentColor(overview?.changePercent ?? 0)}
          loading={ovLoading}
        />
        <StatCard
          label="Projected EOM"
          value={ovLoading ? "—" : formatThb(overview?.projectedEndOfMonth ?? 0)}
          loading={ovLoading}
        />
        <StatCard
          label="Total revenue"
          value={sumLoading ? "—" : formatThb(summary?.totalRevenue ?? 0)}
          loading={sumLoading}
        />
        <StatCard
          label="Net profit"
          value={sumLoading ? "—" : formatThb(summary?.netProfit ?? 0)}
          subColor={(summary?.netProfit ?? 0) >= 0 ? "text-green-600" : "text-red-500"}
          loading={sumLoading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by type</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatThb(v)} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">No revenue data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expense breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={expenseChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatThb(v)} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {expenseChartData.map((item, i) => (
                        <Cell key={i} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1">
                  {expenseChartData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="text-muted-foreground">{item.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">No expense data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={remittanceOpen} onOpenChange={(v) => !v && setRemittanceOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm remittance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Batch <span className="font-mono text-xs">{remittanceBatchId}</span> created. Upload a payment slip to confirm.
            </p>
            <div>
              <FileUploadButton
                onFile={async (file) => {
                  const url = URL.createObjectURL(file);
                  setSlipUrl(url);
                  toast.success("Slip ready");
                }}
                accept="image/*,.pdf"
                label="Upload slip"
              />
              {slipUrl && <p className="text-xs text-green-600 mt-1">Slip uploaded ✓</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemittanceOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmRemittance} disabled={!slipUrl || confirmRemittance.isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
