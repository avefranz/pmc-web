import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMe } from "@/lib/hooks/use-auth";

export default function RoleRouterPage() {
  const navigate = useNavigate();
  const { user, setUser, token } = useAuthStore();
  const { data: meData, isSuccess, isError } = useMe();

  useEffect(() => {
    if (isError) {
      navigate("/login");
      return;
    }

    const resolvedUser = meData ?? user;
    if (!resolvedUser) return;

    if (meData) setUser(meData);

    const roles = resolvedUser.roles;
    if (roles.includes("Tenant")) {
      navigate("/tenant", { replace: true });
    } else if (roles.includes("Landlord")) {
      navigate("/landlord", { replace: true });
    } else if (roles.includes("Admin")) {
      navigate("/manager", { replace: true });
    } else {
      navigate("/no-access", { replace: true });
    }
  }, [isSuccess, isError, meData, user]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center text-white">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm opacity-70">Loading your workspace...</p>
      </div>
    </div>
  );
}
