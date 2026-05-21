import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { UserMenu } from "./user-menu";
import { SiamoLogo } from "./siamo-logo";
import { TopbarShell } from "./topbar-shell";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils/cn";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useUnseenApplications } from "@/lib/hooks/use-unseen-applications";

const HOST_NAV = [
  { to: "/me/host/properties", label: "Properties",  badgeKey: undefined },
  { to: "/me/host/requests",   label: "Requests",    badgeKey: "pendingRequestsCount" as const },
  { to: "/me/host/bookings",   label: "Reservations", badgeKey: undefined },
  { to: "/me/host/finance",    label: "Finance",     badgeKey: undefined },
];

const GUEST_NAV = [
  { to: "/me/guest/applications", label: "Applications", badgeKey: "pendingApplicationsCount" as const },
  { to: "/me/guest/bookings",     label: "My stays",     badgeKey: undefined },
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

type CurrentRole = "host" | "guest" | null;

// Two-capsule role toggle. Active capsule = current role; inactive capsules
// are nav targets to that role's home. On role-neutral routes (Profile,
// onboarding etc.) neither capsule is "active" — the toggle becomes a
// "where would you like to go" control. Hidden entirely on onboarding flows
// and outside `/me`.
function RoleToggle() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: caps } = useCapabilities();

  const currentRole: CurrentRole = pathname.startsWith("/me/host")
    ? "host"
    : pathname.startsWith("/me/guest")
    ? "guest"
    : null;

  const ownedAssets = caps?.stats.ownedAssetsCount ?? 0;
  const pendingApps = caps?.stats.pendingApplicationsCount ?? 0;

  return (
    <div className="inline-flex h-9 rounded-pill border border-border bg-bg-card overflow-hidden shadow-sm">
      <RoleCapsule
        active={currentRole === "host"}
        icon="🏡"
        label="Hosting"
        meta={ownedAssets > 0 ? String(ownedAssets) : undefined}
        emptyHint={currentRole === "host" && ownedAssets === 0 ? "+ List" : undefined}
        onClick={() => navigate("/me/host/properties")}
      />
      <div className="w-px bg-border" />
      <RoleCapsule
        active={currentRole === "guest"}
        icon="🧳"
        label="Renting"
        meta={pendingApps > 0 ? String(pendingApps) : undefined}
        emptyHint={currentRole === "guest" && pendingApps === 0 ? "Browse →" : undefined}
        onClick={() => navigate("/me/guest/bookings")}
      />
    </div>
  );
}

function RoleCapsule({
  active,
  icon,
  label,
  meta,
  emptyHint,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  meta?: string;
  emptyHint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 h-full flex items-center gap-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-fg text-bg-card"
          : "text-fg-muted hover:text-fg hover:bg-bg-subtle",
      )}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
      {meta && (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-bg-card/70" : "text-fg-subtle",
          )}
        >
          · {meta}
        </span>
      )}
      {emptyHint && <span className="text-bg-card/80 font-medium">· {emptyHint}</span>}
    </button>
  );
}

// Routes where the toggle should be hidden entirely — forced flows and
// transient redirects where a role switch doesn't apply.
function isToggleHidden(pathname: string): boolean {
  if (!pathname.startsWith("/me")) return true;
  if (pathname === "/me") return true;
  if (pathname.startsWith("/me/onboarding")) return true;
  return false;
}

export function TopBar() {
  const { pathname } = useLocation();
  const isHost  = pathname.startsWith("/me/host");
  const isGuest = pathname.startsWith("/me/guest");

  const { data: caps } = useCapabilities();
  const unseenApps = useUnseenApplications();

  // Hide host nav tabs until at least one property exists (or user is a manager)
  const ownedAssets = caps?.stats.ownedAssetsCount ?? 0;
  const hostHasContent = !caps || ownedAssets > 0 || caps.isManager;
  const nav = isHost ? (hostHasContent ? HOST_NAV : null) : isGuest ? GUEST_NAV : null;

  function getBadge(item: typeof HOST_NAV[number] | typeof GUEST_NAV[number]) {
    if (!item.badgeKey) return undefined;
    if (item.badgeKey === "pendingApplicationsCount") return unseenApps || undefined;
    if (caps) return caps.stats[item.badgeKey as keyof typeof caps.stats] as number ?? 0;
    return undefined;
  }

  const showToggle = !isToggleHidden(pathname);

  return (
    <TopbarShell
      left={
        <>
          <Logo to={isHost ? "/me/host/properties" : isGuest ? "/me/guest/bookings" : "/me"} />
          {showToggle && (
            <div className="hidden md:block">
              <RoleToggle />
            </div>
          )}
        </>
      }
      center={
        nav && (
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {nav.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                label={item.label}
                badge={getBadge(item)}
              />
            ))}
          </nav>
        )
      }
      right={
        <>
          <Link
            to="/listings"
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-fg px-3 py-2 rounded-full hover:bg-bg-subtle transition-colors whitespace-nowrap"
          >
            <MapPin size={14} />Browse rentals
          </Link>
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu />
        </>
      }
    />
  );
}
