import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserMenu } from "./user-menu";
import { SiamoLogo } from "./siamo-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { cn } from "@/lib/utils/cn";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useUnseenApplications } from "@/lib/hooks/use-unseen-applications";

const HOST_NAV_KEYS = [
  { to: "/me/host/properties", labelKey: "nav.properties", badgeKey: undefined },
  { to: "/me/host/requests",   labelKey: "nav.requests",   badgeKey: "pendingRequestsCount" as const },
  { to: "/me/host/bookings",   labelKey: "nav.bookings",   badgeKey: undefined },
  { to: "/me/host/finance",    labelKey: "nav.finance",    badgeKey: undefined },
];

const GUEST_NAV_KEYS = [
  { to: "/me/guest/applications", labelKey: "nav.applications", badgeKey: "pendingApplicationsCount" as const },
  { to: "/me/guest/bookings",     labelKey: "nav.myStays",      badgeKey: undefined },
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
  const { t } = useTranslation();

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
        label={t("nav.hosting")}
        meta={ownedAssets > 0 ? String(ownedAssets) : undefined}
        emptyHint={currentRole === "host" && ownedAssets === 0 ? t("host.listHint") : undefined}
        onClick={() => navigate("/me/host/properties")}
      />
      <div className="w-px bg-border" />
      <RoleCapsule
        active={currentRole === "guest"}
        icon="🧳"
        label={t("nav.renting")}
        meta={pendingApps > 0 ? String(pendingApps) : undefined}
        emptyHint={currentRole === "guest" && pendingApps === 0 ? t("guest.browseHint") : undefined}
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
          ? "bg-fg text-white"
          : "text-fg-muted hover:text-fg hover:bg-bg-subtle",
      )}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
      {meta && (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-white/70" : "text-fg-subtle",
          )}
        >
          · {meta}
        </span>
      )}
      {emptyHint && <span className="text-white/80 font-medium">· {emptyHint}</span>}
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
  const { t } = useTranslation();
  const isHost  = pathname.startsWith("/me/host");
  const isGuest = pathname.startsWith("/me/guest");

  const { data: caps } = useCapabilities();
  const unseenApps = useUnseenApplications();

  // Hide host nav tabs until at least one property exists (or user is a manager)
  const ownedAssets = caps?.stats.ownedAssetsCount ?? 0;
  const hostHasContent = !caps || ownedAssets > 0 || caps.isManager;
  const navKeys = isHost ? (hostHasContent ? HOST_NAV_KEYS : null) : isGuest ? GUEST_NAV_KEYS : null;

  function getBadge(item: typeof HOST_NAV_KEYS[number] | typeof GUEST_NAV_KEYS[number]) {
    if (!item.badgeKey) return undefined;
    if (item.badgeKey === "pendingApplicationsCount") return unseenApps || undefined;
    if (caps) return caps.stats[item.badgeKey as keyof typeof caps.stats] as number ?? 0;
    return undefined;
  }

  const showToggle = !isToggleHidden(pathname);

  return (
    <header className="sticky top-0 z-40 h-[var(--topbar-h)] bg-bg-card border-b border-border flex items-center">
      <div className="w-full px-4 md:px-8 lg:px-12 flex items-center gap-4">
        {/* Left: logo + role toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <Logo to={isHost ? "/me/host/properties" : isGuest ? "/me/guest/bookings" : "/me"} />
          {showToggle && (
            <div className="hidden md:block">
              <RoleToggle />
            </div>
          )}
        </div>

        {/* Center: nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center min-w-0 overflow-x-auto">
          {navKeys && navKeys.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={t(item.labelKey)}
              badge={getBadge(item)}
            />
          ))}
        </nav>

        {/* Right: Browse CTA + theme/lang + user menu */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Link
            to="/listings"
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-fg px-3 py-2 rounded-full hover:bg-bg-subtle transition-colors whitespace-nowrap"
          >
            <MapPin size={14} />{t("nav.browseRentals")}
          </Link>
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
