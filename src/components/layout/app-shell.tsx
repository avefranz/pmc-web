import { Outlet, NavLink, useLocation } from "react-router-dom";
import { TopBar } from "./topbar";
import { cn } from "@/lib/utils/cn";
import { useHostNotificationPoller, useGuestNotificationPoller } from "@/lib/hooks/use-notification-poller";
import { useCapabilities } from "@/lib/hooks/use-capabilities";

function MobileBottomNav() {
  const { pathname } = useLocation();
  const isHost  = pathname.startsWith("/me/host");
  const isGuest = pathname.startsWith("/me/guest") || pathname.startsWith("/me/trips");
  const isProfile = pathname.startsWith("/me/profile");

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-card border-t border-border flex">
      {/* Renting */}
      <NavLink
        to="/me/guest"
        className={cn(
          "flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors",
          isGuest ? "text-brand" : "text-fg-muted",
        )}
      >
        <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Renting
      </NavLink>

      {/* Hosting */}
      <NavLink
        to="/me/host"
        className={cn(
          "flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors",
          isHost ? "text-brand" : "text-fg-muted",
        )}
      >
        <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Hosting
      </NavLink>

      {/* Profile */}
      <NavLink
        to="/me/profile"
        className={cn(
          "flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors",
          isProfile ? "text-brand" : "text-fg-muted",
        )}
      >
        <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Profile
      </NavLink>
    </nav>
  );
}

// Runs pollers based on user role — no rendered output
function NotificationPollers() {
  const { data: caps } = useCapabilities();
  useHostNotificationPoller();
  useGuestNotificationPoller();
  // caps is used by pollers via useCapabilities (same query key, no extra request)
  void caps;
  return null;
}

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <TopBar />
      <NotificationPollers />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="w-full px-4 md:px-8 lg:px-12 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
