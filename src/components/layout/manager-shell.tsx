import {
  LayoutDashboard, Building2, Ticket,
  DollarSign, Users, Wallet,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import type { NavGroup } from "@/components/layout/admin-shell";
import { useCashOnHand } from "@/lib/hooks/use-finance";
import { formatThb } from "@/lib/utils/format";

// ── Cash balance pill shown in the sidebar above the user block ──────────────
function CashBadge() {
  const { data } = useCashOnHand();
  if (!data) return null;
  return (
    <div style={{
      margin: "0 16px 12px",
      padding: "10px 14px",
      background: "rgba(224,148,92,0.10)",
      border: "1px solid rgba(224,148,92,0.25)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: "'JetBrains Mono',monospace", fontWeight: 500,
        fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
        color: "rgba(224,148,92,0.7)", marginBottom: 4,
      }}>
        <Wallet size={11} />
        CASH ON HAND
      </div>
      <div style={{
        fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, lineHeight: 1,
        letterSpacing: "-0.02em", color: "#FFF8EC",
      }}>
        {formatThb(data.amount)}
      </div>
    </div>
  );
}

// ── Manager nav ──────────────────────────────────────────────────────────────
const managerNav: NavGroup[] = [
  {
    items: [
      { to: "/manager",              icon: <LayoutDashboard size={16} strokeWidth={1.6} />, label: "Dashboard",  end: true },
      { to: "/manager/assets",       icon: <Building2      size={16} strokeWidth={1.6} />, label: "Properties" },
      { to: "/manager/tickets",      icon: <Ticket         size={16} strokeWidth={1.6} />, label: "Tickets" },
      { to: "/manager/finance",      icon: <DollarSign     size={16} strokeWidth={1.6} />, label: "Finance" },
    ],
  },
  {
    title: "Admin",
    items: [
      { to: "/manager/team", icon: <Users size={16} strokeWidth={1.6} />, label: "Team" },
    ],
  },
];

// ── Shell ────────────────────────────────────────────────────────────────────
export function ManagerShell() {
  return (
    <AdminShell
      role="MGR"
      navGroups={managerNav}
      sidebarExtra={<CashBadge />}
    />
  );
}
