import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  accent?: boolean;
}

export function StatCard({ label, value, sub, subColor, icon, loading, accent }: StatCardProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <Skeleton className="h-3 w-20 mb-4" />
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-sm overflow-hidden transition-shadow hover:shadow-md", accent && "ring-1 ring-primary/20")}>
      {accent && <div className="h-0.5 w-full bg-gradient-to-r from-primary to-primary/30" />}
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          {icon && (
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}>
              {icon}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground leading-none">{value}</p>
        {sub && <p className={cn("text-xs mt-1.5", subColor ?? "text-muted-foreground")}>{sub}</p>}
      </CardContent>
    </Card>
  );
}
