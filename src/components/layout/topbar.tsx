import { Link, NavLink, useLocation } from "react-router-dom";
import { MapPin } from "lucide-react";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils/cn";

const HOST_NAV = [
  { to: "/me/host/properties", label: "Properties" },
  { to: "/me/host/tickets",    label: "Tickets" },
  { to: "/me/host/finance",    label: "Finance" },
];

function HostTopBar() {
  return (
    <header className="sticky top-0 z-40 h-[var(--topbar-h)] bg-bg-card border-b border-border flex items-center">
      <div className="w-full px-4 md:px-8 lg:px-12 flex items-center gap-8">
        {/* Logo */}
        <Link to="/me/host/properties" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <span className="text-white font-bold text-sm leading-none">S</span>
          </div>
          <span className="font-semibold text-lg text-fg hidden sm:block">Siamo</span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {HOST_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "relative px-3 py-2 text-sm font-medium transition-colors rounded-lg",
                isActive
                  ? "text-fg font-semibold after:absolute after:bottom-0 after:inset-x-3 after:h-[2px] after:bg-fg after:rounded-full"
                  : "text-fg-muted hover:text-fg hover:bg-bg-subtle",
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: browse link + avatar */}
        <div className="flex items-center gap-3 ml-auto">
          <Link
            to="/listings"
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-fg px-3 py-2 rounded-full hover:bg-bg-subtle transition-colors whitespace-nowrap"
          >
            <MapPin size={14} />
            Browse rentals
          </Link>
          <UserMenu compact />
        </div>
      </div>
    </header>
  );
}

function DefaultTopBar() {
  return (
    <header className="sticky top-0 z-40 h-[var(--topbar-h)] bg-bg-card border-b border-border flex items-center">
      <div className="w-full px-4 md:px-8 lg:px-12 flex items-center justify-between">
        <Link to="/me/trips" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <span className="text-white font-bold text-sm leading-none">S</span>
          </div>
          <span className="font-semibold text-lg text-fg hidden sm:block">Siamo</span>
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}

export function TopBar() {
  const { pathname } = useLocation();
  const isHost = pathname.startsWith("/me/host");
  return isHost ? <HostTopBar /> : <DefaultTopBar />;
}
