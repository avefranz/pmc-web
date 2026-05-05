import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMe } from "@/lib/hooks/use-auth";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "Admin" | "Landlord" | "Tenant";
}

/**
 * AuthGuard — wraps protected routes.
 *
 * Key design decisions:
 * - `user` is NOT persisted in Zustand (only `token`), so on a hard refresh
 *   `user` is null until `useMe` resolves. We resolve the user from either
 *   the store OR the live `meData` query so the role check is never skipped.
 * - While the token exists but the user is still loading we render nothing
 *   (avoids a flash of protected content with the wrong role).
 */
export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { token, user, setUser } = useAuthStore();
  const { data: meData, isLoading } = useMe();
  const location = useLocation();

  // Sync meData → store so other components can read the user
  useEffect(() => {
    if (meData && !user) setUser(meData);
  }, [meData, user, setUser]);

  // Not logged in → go to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Resolve user from store (persisted across renders) or live query
  const resolvedUser = user ?? meData;

  // User identity not known yet:
  //  - still loading → blank (avoid flash of wrong role)
  //  - done loading but still null → token invalid, send to login
  if (!resolvedUser) {
    return isLoading ? null : <Navigate to="/login" replace />;
  }

  // Wrong role → send to role-router which will route them to the right portal
  if (requiredRole) {
    const allowed =
      resolvedUser.roles.includes(requiredRole) ||
      resolvedUser.roles.includes("Admin");
    if (!allowed) {
      return <Navigate to="/role-router" replace />;
    }
  }

  return <>{children}</>;
}

/**
 * PublicOnlyGuard — wraps login / register.
 * Redirects already-authenticated users to their role portal.
 */
export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (token) {
    return <Navigate to="/role-router" replace />;
  }
  return <>{children}</>;
}
