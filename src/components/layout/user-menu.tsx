import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useMe } from "@/lib/hooks/use-auth";
import { initials } from "@/lib/utils/format";
import { useQueryClient } from "@tanstack/react-query";

export function UserMenu() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const { data: caps } = useCapabilities();
  const { data: me } = useMe();
  const qc = useQueryClient();

  const name = me?.firstName ?? me?.lineName ?? me?.email ?? "Account";

  function handleSignOut() {
    clearAuth();
    localStorage.removeItem("pmc_token");
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-pill border border-border px-3 py-1.5 hover:shadow-card transition-shadow bg-bg-card">
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{initials(name)}</span>
          </div>
          <span className="text-sm font-medium text-fg hidden sm:block">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate("/me/profile")}>
          Profile
        </DropdownMenuItem>
        {caps?.isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            Admin panel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
