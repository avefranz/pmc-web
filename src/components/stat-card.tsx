import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: number; suffix?: string };
}

export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <div className="bg-bg-card rounded-lg p-6 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted mb-2">{label}</p>
      <p className="text-3xl font-semibold text-fg">{value}</p>
      {delta !== undefined && (
        <p className={cn("text-sm mt-1", delta.value >= 0 ? "text-success" : "text-danger")}>
          {delta.value >= 0 ? "+" : ""}{delta.value}{delta.suffix ?? ""}
        </p>
      )}
    </div>
  );
}
