import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, CreditCard, Inbox, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  const { token, clearAuth } = useAuthStore();
  const { data: caps } = useCapabilities();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const name = me?.firstName ?? me?.lineName ?? me?.email ?? "Account";

  if (!token) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-2 rounded-pill border border-border px-4 py-1.5 text-sm font-medium text-fg bg-bg-card hover:shadow-card transition-shadow"
      >
        Sign in
      </Link>
    );
  }

  function handleSignOut() {
    setOpen(false);
    clearAuth();
    qc.clear();
    navigate("/login", { replace: true });
  }

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
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
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-fg-muted font-normal truncate">
          {me?.email ?? me?.lineName ?? "Account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => go("/me/profile")} className="gap-2">
          <User size={13} className="text-fg-muted" />Profile
        </DropdownMenuItem>
        {(caps?.isLandlord || caps?.isManager) && (
          <DropdownMenuItem onClick={() => go("/me/host/properties")} className="gap-2">
            <Building2 size={13} className="text-fg-muted" />My properties
          </DropdownMenuItem>
        )}
        {(caps?.isLandlord || caps?.isManager) && (
          <DropdownMenuItem onClick={() => go("/me/host/requests")} className="gap-2">
            <Inbox size={13} className="text-fg-muted" />Booking requests
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => go("/me/guest/bookings")} className="gap-2">
          <CreditCard size={13} className="text-fg-muted" />My stays
        </DropdownMenuItem>
        {caps?.isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go("/admin")}>
              Admin panel
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
