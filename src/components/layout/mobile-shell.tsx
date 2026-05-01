import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils/cn";

interface MobileShellProps {
  navItems: { to: string; icon: React.ReactNode; label: string; end?: boolean }[];
  title?: string;
}

export function MobileShell({ navItems, title }: MobileShellProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Topbar */}
      {title && (
        <header className="h-14 flex items-center px-4 border-b bg-white shrink-0">
          <span className="font-semibold text-base">{title}</span>
        </header>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-2 z-40">
        {navItems.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <span className="h-5 w-5">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function LandlordShell() {
  return (
    <MobileShell
      navItems={[
        {
          to: "/landlord",
          end: true,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          ),
          label: "Portfolio",
        },
        {
          to: "/landlord/income",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          ),
          label: "Income",
        },
        {
          to: "/landlord/tickets",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ),
          label: "Tickets",
        },
        {
          to: "/landlord/profile",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ),
          label: "Profile",
        },
      ]}
    />
  );
}

export function TenantShell() {
  return (
    <MobileShell
      navItems={[
        {
          to: "/tenant",
          end: true,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          ),
          label: "Home",
        },
        {
          to: "/tenant/tickets",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ),
          label: "Tickets",
        },
        {
          to: "/tenant/invoices",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          ),
          label: "Invoices",
        },
        {
          to: "/tenant/profile",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ),
          label: "Profile",
        },
      ]}
    />
  );
}
