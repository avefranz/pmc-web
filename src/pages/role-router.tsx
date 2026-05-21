import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function RoleRouter() {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to="/me" replace />;
}
