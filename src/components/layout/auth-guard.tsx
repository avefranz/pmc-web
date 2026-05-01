import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMe } from "@/lib/hooks/use-auth";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "Admin" | "Landlord" | "Tenant";
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { token, user, setUser } = useAuthStore();
  const { data: meData } = useMe();
  const location = useLocation();

  // Re-hydrate user from API after page refresh (user is not persisted in zustand)
  useEffect(() => {
    if (meData && !user) setUser(meData);
  }, [meData, user, setUser]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user && !user.roles.includes(requiredRole) && !user.roles.includes("Admin")) {
    return <Navigate to="/no-access" replace />;
  }

  return <>{children}</>;
}
