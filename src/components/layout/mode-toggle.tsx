import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils/cn";

export function ModeToggle() {
  const { pathname } = useLocation();
  const isHost = pathname.startsWith("/me/host");

  return (
    <div className="inline-flex bg-bg-subtle rounded-pill p-1 border border-border">
      <NavLink
        to="/me/trips"
        className={cn(
          "px-5 py-2 rounded-pill text-sm font-medium transition-all",
          !isHost ? "bg-bg-card shadow-sm text-fg" : "text-fg-muted hover:text-fg"
        )}
      >
        Travelling
      </NavLink>
      <NavLink
        to="/me/host"
        className={cn(
          "px-5 py-2 rounded-pill text-sm font-medium transition-all",
          isHost ? "bg-bg-card shadow-sm text-fg" : "text-fg-muted hover:text-fg"
        )}
      >
        Hosting
      </NavLink>
    </div>
  );
}
