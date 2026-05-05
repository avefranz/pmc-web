import { Outlet, Link } from "react-router-dom";
import { UserMenu } from "./user-menu";

export function PublicShell() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="sticky top-0 z-40 h-[var(--topbar-h)] bg-bg-card border-b border-border flex items-center">
        <div className="max-w-[var(--container)] mx-auto w-full px-6 flex items-center justify-between">
          <Link to="/listings" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-white font-bold text-sm leading-none">S</span>
            </div>
            <span className="font-semibold text-lg text-fg hidden sm:block">Siamo</span>
          </Link>
          <UserMenu />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
