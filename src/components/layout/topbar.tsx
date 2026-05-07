import { Link, NavLink, useLocation } from "react-router-dom";
import { MapPin } from "lucide-react";
import { UserMenu } from "./user-menu";
import { SiamoLogo } from "./siamo-logo";
import { cn } from "@/lib/utils/cn";
import { useCapabilities } from "@/lib/hooks/use-capabilities";

const HOST_NAV = [
  { to: "/me/host/properties", label: "Properties",  badgeKey: undefined },
  { to: "/me/host/requests",   label: "Requests",    badgeKey: "pendingRequestsCount" as const },
  { to: "/me/host/bookings",   label: "Bookings",    badgeKey: undefined },
  { to: "/me/host/tickets",    label: "Tickets",     badgeKey: undefined },
  { to: "/me/host/finance",    label: "Finance",     badgeKey: undefined },
];

const GUEST_NAV = [
  { to: "/me/guest/applications", label: "Applications", badgeKey: "pendingApplicationsCount" as const },
  { to: "/me/guest/bookings",     label: "My stays",     badgeKey: undefined },
  { to: "/me/guest/tm30",         label: "TM30",         badgeKey: undefined },
];

function NavItem({ to, label, badge }: { to: string; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        "relative px-3 py-2 text-sm font-medium transition-colors rounded-lg whitespace-nowrap flex items-center gap-1.5",
        isActive
          ? "text-fg font-semibold after:absolute after:bottom-0 after:inset-x-3 after:h-[2px] after:bg-fg after:rounded-full"
          : "text-fg-muted hover:text-fg hover:bg-bg-subtle",
      )}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-brand text-white leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </NavLink>
  );
}

function Logo({ to }: { to: string }) {
  return (
    <Link to={to} className="shrink-0">
      <SiamoLogo className="h-9" />
    </Link>
  );
}

function ContextSwitcher({ isHost }: { isHost: boolean }) {
  return (
    <div className="flex items-center bg-bg-subtle rounded-full p-0.5 gap-0.5">
      <Link
        to="/me/guest"
        className={cn(
          "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
          !isHost ? "bg-bg-card text-fg shadow-sm" : "text-fg-muted hover:text-fg",
        )}
      >
        Renting
      </Link>
      <Link
        to="/me/host"
        className={cn(
          "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
          isHost ? "bg-bg-card text-fg shadow-sm" : "text-fg-muted hover:text-fg",
        )}
      >
        Hosting
      </Link>
    </div>
  );
}

export function TopBar() {
  const { pathname } = useLocation();
  const isHost  = pathname.startsWith("/me/host");
  const isGuest = pathname.startsWith("/me/guest");
  const inMe    = pathname.startsWith("/me");

  const { data: caps } = useCapabilities();
  const nav = isHost ? HOST_NAV : isGuest ? GUEST_NAV : null;

  return (
    <header className="sticky top-0 z-40 h-[var(--topbar-h)] bg-bg-card border-b border-border flex items-center">
      <div className="w-full px-4 md:px-8 lg:px-12 flex items-center gap-6">
        <Logo to={isHost ? "/me/host/properties" : isGuest ? "/me/guest/applications" : "/me"} />

        {/* Desktop: sub-nav tabs */}
        <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          {nav && nav.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              badge={item.badgeKey && caps ? (caps.stats[item.badgeKey] ?? 0) : undefined}
            />
          ))}
          {!nav && inMe && <div className="flex-1" />}
        </nav>

        {/* Right: context switcher + Browse + avatar */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {inMe && (
            <div className="hidden md:block">
              <ContextSwitcher isHost={isHost} />
            </div>
          )}
          <Link
            to="/listings"
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-fg px-3 py-2 rounded-full hover:bg-bg-subtle transition-colors whitespace-nowrap"
          >
            <MapPin size={14} />Browse rentals
          </Link>
          <UserMenu compact={!!(isHost || isGuest)} />
        </div>
      </div>
    </header>
  );
}
