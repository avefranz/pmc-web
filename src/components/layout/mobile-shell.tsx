/**
 * mobile-shell.tsx
 *
 * Landlord and Tenant authenticated shells.
 * Uses the brutalist-mono design system: bm-page for content, bm-bottom for nav.
 */
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, DollarSign, Ticket,
  Settings, Home, Receipt, MessageSquare, User,
} from "lucide-react";

interface BmNavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

function BmMobileShell({ navItems }: { navItems: BmNavItem[] }) {
  return (
    <div className="bm" style={{ minHeight: "100vh", position: "relative" }}>
      {/* Page content — bm-page has 100px bottom padding; adm-page pages use paddingBottom: 100 */}
      <Outlet />

      {/* Bottom nav — override position: absolute → fixed so it stays on screen */}
      <nav
        className="bm-bottom"
        style={{
          position: "fixed",
          gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
        }}
      >
        {navItems.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              "bm-bottom__item" + (isActive ? " bm-bottom__item--active" : "")
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// ── Landlord shell ───────────────────────────────────────────────────────────
const landlordItems: BmNavItem[] = [
  { to: "/landlord",        icon: <LayoutDashboard size={18} strokeWidth={1.5} />, label: "Portfolio", end: true },
  { to: "/landlord/income", icon: <DollarSign      size={18} strokeWidth={1.5} />, label: "Income" },
  { to: "/landlord/tickets",icon: <Ticket          size={18} strokeWidth={1.5} />, label: "Tickets" },
  { to: "/landlord/profile",icon: <Settings        size={18} strokeWidth={1.5} />, label: "Profile" },
];

export function LandlordShell() {
  return <BmMobileShell navItems={landlordItems} />;
}

// ── Tenant shell ─────────────────────────────────────────────────────────────
const tenantItems: BmNavItem[] = [
  { to: "/tenant",          icon: <Home         size={18} strokeWidth={1.5} />, label: "Home",     end: true },
  { to: "/tenant/tickets",  icon: <MessageSquare size={18} strokeWidth={1.5} />, label: "Support" },
  { to: "/tenant/invoices", icon: <Receipt      size={18} strokeWidth={1.5} />, label: "Invoices" },
  { to: "/tenant/profile",  icon: <User         size={18} strokeWidth={1.5} />, label: "Profile" },
];

export function TenantShell() {
  return <BmMobileShell navItems={tenantItems} />;
}
