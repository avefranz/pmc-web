import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMe } from "@/lib/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { initials } from "@/lib/utils/format";

export default function ProfilePage() {
  const { clearAuth } = useAuthStore();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const name = me?.firstName
    ? me.lastName ? `${me.firstName} ${me.lastName}` : me.firstName
    : me?.lineName ?? "User";

  function handleLogout() {
    clearAuth();
    localStorage.removeItem("pmc_token");
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-fg mb-6">Profile</h1>

      <div className="bg-bg-card rounded-xl shadow-card p-6 flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials(name)}
        </div>
        <div>
          <p className="font-semibold text-fg">{name}</p>
          {me?.email && <p className="text-sm text-fg-muted">{me.email}</p>}
          {me?.roles?.length ? (
            <p className="text-xs text-fg-subtle mt-0.5">{me.roles.join(", ")}</p>
          ) : null}
        </div>
      </div>

      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </div>
  );
}
