import { Navigate, Link } from "react-router-dom";
import { Search, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCapabilities } from "@/lib/hooks/use-capabilities";

/**
 * Smart entry point for /me.
 * Priority:
 * 1. Active/pending bookings as guest → /me/guest
 * 2. Has properties as host → /me/host/properties
 * 3. Empty state → dual CTA
 */
export function MeDashboard() {
  const { data: caps, isLoading } = useCapabilities();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-3 mt-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    );
  }

  if (caps) {
    if (caps.stats.activeBookingsCount > 0 || caps.stats.pendingApplicationsCount > 0)
      return <Navigate to="/me/guest" replace />;
    if (caps.stats.ownedAssetsCount > 0)    return <Navigate to="/me/host/properties" replace />;
  }

  // Both contexts empty — show dual CTA
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4 gap-6">
      <h1 className="text-3xl font-bold text-fg">Welcome to Siamo</h1>
      <p className="text-fg-muted max-w-sm">
        Find a place to stay, or list your property — you can do both from one account.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/listings"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-border text-sm font-semibold text-fg hover:border-fg transition-colors"
        >
          <Search size={15} />Find a place
        </Link>
        <Link
          to="/me/host/properties/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(110deg,#4f46e5,#7c3aed,#6366f1)" }}
        >
          <Building2 size={15} />List your property
        </Link>
      </div>
    </div>
  );
}
