import { Navigate, Link } from "react-router-dom";
import { Search, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useMyBookings } from "@/lib/hooks/use-bookings";
import { useMyApplications } from "@/lib/hooks/use-booking-requests";

/**
 * Smart entry point for /me.
 * Uses both capabilities (fast) and real data (reliable) so Draft-status
 * bookings and other edge cases are always caught.
 */
export function MeDashboard() {
  const { data: caps, isLoading: loadingCaps } = useCapabilities();
  const { data: bookings, isLoading: loadingBookings } = useMyBookings();
  const { data: applications, isLoading: loadingApps } = useMyApplications();

  const isLoading = loadingCaps || loadingBookings || loadingApps;

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

  // Any bookings at all → guest cabinet (real data takes precedence over caps counters)
  if (bookings && bookings.length > 0) {
    return <Navigate to="/me/guest/bookings" replace />;
  }

  // Any applications → guest applications
  if (applications && applications.length > 0) {
    return <Navigate to="/me/guest/applications" replace />;
  }

  // Caps-based fallbacks (for hosts with properties but no bookings as tenant)
  if (caps) {
    if (caps.stats.ownedAssetsCount > 0 || caps.stats.managedAssetsCount > 0) {
      return <Navigate to="/me/host/properties" replace />;
    }
  }

  // Dual CTA for brand new users
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
