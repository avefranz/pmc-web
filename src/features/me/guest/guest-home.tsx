import { Navigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCapabilities } from "@/lib/hooks/use-capabilities";

export function GuestHome() {
  const { data: caps, isLoading } = useCapabilities();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  // Active bookings → booking list
  if (caps && caps.stats.activeBookingsCount > 0) {
    return <Navigate to="/me/guest/bookings" replace />;
  }

  // Pending applications → applications list
  if (caps && caps.stats.pendingApplicationsCount > 0) {
    return <Navigate to="/me/guest/applications" replace />;
  }

  // Empty state — no bookings or applications yet
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-bg-subtle flex items-center justify-center mb-6">
        <Home size={28} className="text-fg-muted" />
      </div>
      <h1 className="text-2xl font-bold text-fg mb-2">Find your next home</h1>
      <p className="text-fg-muted max-w-sm mb-8">
        Browse furnished mid-term rentals across Thailand. Apply directly and move in within days.
      </p>
      <Button asChild className="bg-brand hover:bg-[var(--color-primary-hover)] text-white px-8">
        <Link to="/listings"><Search size={15} className="mr-2" />Browse listings</Link>
      </Button>
    </div>
  );
}
