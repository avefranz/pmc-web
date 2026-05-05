import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useCapabilities } from "@/lib/hooks/use-capabilities";

interface AuthGuardProps {
  children: React.ReactNode;
  require?: "admin" | "manager";
}

export function AuthGuard({ children, require }: AuthGuardProps) {
  const token = useAuthStore((s) => s.token);
  const { data: caps, isLoading } = useCapabilities();
  const location = useLocation();

  if (!token) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (isLoading) return null;
  if (!caps) return <Navigate to="/login" replace />;
  if (require === "admin" && !caps.isAdmin) return <Navigate to="/me/trips" replace />;
  if (require === "manager" && !caps.isManager) return <Navigate to="/me/host" replace />;

  return <>{children}</>;
}

export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/me/trips" replace />;
  return <>{children}</>;
}
