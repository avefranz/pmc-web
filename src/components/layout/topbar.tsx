import { Link } from "react-router-dom";
import { ModeToggle } from "./mode-toggle";
import { UserMenu } from "./user-menu";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 h-[var(--topbar-h)] bg-bg-card border-b border-border flex items-center">
      <div className="max-w-[var(--container)] mx-auto w-full px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/me/trips" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <span className="text-white font-bold text-sm leading-none">S</span>
          </div>
          <span className="font-semibold text-lg text-fg hidden sm:block">Siamo</span>
        </Link>

        {/* Mode toggle — hidden on mobile, shown in bottom nav */}
        <div className="hidden md:block">
          <ModeToggle />
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
