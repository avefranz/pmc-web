import { useNavigate, Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { token, clearAuth } = useAuthStore();
  const { data: caps } = useCapabilities();
  const { data: me } = useMe();
  const qc = useQueryClient();

  const name = me?.firstName ?? me?.lineName ?? me?.email ?? "Account";

  if (!token) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-2 rounded-pill border border-border px-4 py-1.5 text-sm font-medium text-fg bg-bg-card hover:shadow-card transition-shadow"
      >
        {t("auth.signIn")}
      </Link>
    );
  }

  function handleSignOut() {
    clearAuth();
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-pill border border-border pl-2.5 pr-1 py-1 hover:shadow-card transition-shadow bg-bg-card"
          aria-label="Account menu"
        >
          <Menu size={16} className="text-fg-muted" />
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{initials(name)}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate("/me/profile")}>
          {t("nav.profile")}
        </DropdownMenuItem>
        {caps?.isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            {t("auth.adminPanel")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
