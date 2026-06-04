import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useCapabilities } from "@/lib/hooks/use-capabilities";

interface AuthGuardProps {
  children: React.ReactNode;
  require?: "admin" | "manager" | "landlord";
}

export function AuthGuard({ children, require }: AuthGuardProps) {
  const token = useAuthStore((s) => s.token);
  const { data: caps, isLoading, isFetching } = useCapabilities();
  const location = useLocation();

  if (!token) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (isLoading) return null;
  if (!caps) return <Navigate to="/login" replace />;

  const lacksRequiredRole =
    (require === "admin" && !caps.isAdmin) ||
    (require === "manager" && !caps.isManager) ||
    (require === "landlord" && !caps.isLandlord);

  // BUG-344: capabilities are refetched on an interval, and a freshly-promoted
  // landlord's caps can briefly report `isLandlord:false` while the BE catches
  // up. Clicking Requests/Reservations during that window bounced the host into
  // the tenant "My stays" view. Don't act on a "missing role" verdict while a
  // refetch is in flight — wait for it to settle, then decide. (Suspected BE
  // capabilities-lag is the root cause; this just stops the spurious bounce.)
  if (lacksRequiredRole && isFetching) return null;

  if (require === "admin" && !caps.isAdmin) return <Navigate to="/me/trips" replace />;
  if (require === "manager" && !caps.isManager) return <Navigate to="/me/host" replace />;
  if (require === "landlord" && !caps.isLandlord) return <Navigate to="/me/guest/bookings" replace />;

  return <>{children}</>;
}

export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/me/trips" replace />;
  return <>{children}</>;
}
