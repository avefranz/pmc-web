import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Ticket,
  DollarSign,
  LogOut,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useCashOnHand } from "@/lib/hooks/use-finance";
import { formatThb } from "@/lib/utils/format";

const nav = [
  { to: "/manager", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/manager/assets", icon: Building2, label: "Properties" },
  { to: "/manager/tickets", icon: Ticket, label: "Tickets" },
  { to: "/manager/finance", icon: DollarSign, label: "Finance" },
];

function CashBadge() {
  const { data } = useCashOnHand();
  if (!data) return null;
  return (
    <div className="mx-3 mb-3 rounded-lg bg-sidebar-accent/80 border border-sidebar-border/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Wallet className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
        <p className="text-sidebar-foreground/60 text-xs">Cash on hand</p>
      </div>
      <p className="text-sidebar-foreground font-bold text-base mt-0.5 pl-0.5">{formatThb(data.amount)}</p>
    </div>
  );
}

export function ManagerShell() {
  const { clearAuth, user } = useAuthStore();

  function handleLogout() {
    clearAuth();
    localStorage.removeItem("pmc_token");
    window.location.replace("/login");
  }

  const initials = (user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-[220px] flex flex-col shrink-0 bg-[hsl(var(--sidebar-background))] border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sidebar-primary to-blue-400 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm tracking-tight">P</span>
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground text-sm leading-none">PMC</p>
              <p className="text-sidebar-foreground/40 text-[10px] leading-none mt-0.5 font-medium tracking-wide uppercase">Manager</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Cash badge */}
        <CashBadge />

        {/* User */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer group transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sidebar-primary to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-xs font-semibold truncate">
                {user?.firstName ?? user?.email ?? "Manager"}
              </p>
              {user?.email && user?.firstName && (
                <p className="text-sidebar-foreground/40 text-[10px] truncate">{user.email}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-sidebar-border"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5 text-sidebar-foreground/50" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export { ChevronRight };
