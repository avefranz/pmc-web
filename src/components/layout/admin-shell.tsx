import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth.store";

// ── Breadcrumb segment labels ──────────────────────────────────────────────────
const SEG: Record<string, string> = {
  manager:   "WORKSPACE",
  assets:    "PROPERTIES",
  bookings:  "BOOKINGS",
  tickets:   "TICKETS",
  finance:   "FINANCE",
  team:      "TEAM",
  listings:  "LISTINGS",
  landlord:  "OWNER",
  income:    "INCOME",
  portfolio: "PORTFOLIO",
  tenant:    "GUEST",
  invoices:  "INVOICES",
  profile:   "PROFILE",
  new:       "NEW",
};

function isId(s: string) {
  return /^[0-9a-f-]{20,}$/i.test(s) || /^\d+$/.test(s);
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  end?: boolean;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}
interface AdminShellProps {
  role: string;
  navGroups: NavGroup[];
  sidebarExtra?: React.ReactNode;
}

// ── AdminShell ─────────────────────────────────────────────────────────────────
export function AdminShell({ role, navGroups, sidebarExtra }: AdminShellProps) {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const segs = location.pathname.split("/").filter(Boolean);
  const crumbs: string[] = [];
  if (segs.length > 0) {
    crumbs.push(SEG[segs[0]] ?? segs[0].toUpperCase());
  }
  if (segs.length === 1) {
    crumbs.push("DASHBOARD");
  } else {
    for (let i = 1; i < Math.min(segs.length, 3); i++) {
      const s = segs[i];
      crumbs.push(isId(s) ? "DETAIL" : (SEG[s] ?? s.toUpperCase()));
    }
  }

  const initials = (user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();
  const userName = user?.firstName ?? user?.email?.split("@")[0] ?? "User";
  const userMeta = `${role} · ${user?.email ?? ""}`.toUpperCase();

  function logout() {
    clearAuth();
    localStorage.removeItem("pmc_token");
    window.location.replace("/login");
  }

  return (
    <div className="bm">
      {/* Mobile overlay */}
      <div
        className={sidebarOpen ? "bm-overlay bm-overlay--open" : "bm-overlay"}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="bm-layout">

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside
          className={`bm-sidebar${sidebarOpen ? " bm-sidebar--open" : ""}`}
          style={{ background: "var(--bm-ink)", color: "var(--bm-paper)", display: "flex", flexDirection: "column" }}
        >
          {/* Brand */}
          <div className="bm-drawer__top">
            <span className="bm-drawer__brand">Siamo</span>
            <span style={{
              font: "500 9px/1 var(--bm-mono)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--bm-accent)",
              padding: "3px 8px",
              border: "1px solid rgba(224,148,92,0.4)",
            }}>{role}</span>
            <button
              className="bm-drawer__close"
              onClick={() => setSidebarOpen(false)}
              style={{ marginLeft: "auto" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Nav */}
          {navGroups.map((group, gi) => (
            <React.Fragment key={gi}>
              {group.title && (
                <div className="bm-drawer__group">{group.title}</div>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    "bm-drawer__item" + (isActive ? " bm-drawer__item--active" : "")
                  }
                >
                  {item.icon}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.count != null && (
                    <span style={{
                      font: "500 10px/1 var(--bm-mono)",
                      letterSpacing: "0.08em",
                      background: "rgba(255,254,251,0.10)",
                      padding: "2px 7px",
                    }}>{item.count}</span>
                  )}
                </NavLink>
              ))}
            </React.Fragment>
          ))}

          {sidebarExtra}

          {/* User block */}
          <div className="bm-user-block">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="bm-user-block__avatar">{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div className="bm-user-block__name">{userName}</div>
                <div className="bm-user-block__meta">{userMeta}</div>
              </div>
            </div>
            <button className="bm-user-block__logout" onClick={logout}>
              <LogOut size={11} /> Sign out
            </button>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto", minWidth: 0 }}>

          {/* Topbar */}
          <div className="bm-top" style={{ gap: 14 }}>
            <button
              className="bm-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <div className="bm-meta" style={{ color: "var(--bm-ink-3)", flex: "0 0 auto" }}>
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ margin: "0 6px", color: "var(--bm-ink-4)" }}>/</span>}
                  <span style={i === crumbs.length - 1 ? { color: "var(--bm-ink)" } : {}}>
                    {c}
                  </span>
                </React.Fragment>
              ))}
            </div>

            <button className="bm-top__icon-btn bm-top__icon-btn--ghost" title="Notifications" style={{ marginLeft: "auto" }}>
              <Bell size={13} />
            </button>
          </div>

          {/* Page content */}
          <div className="adm-page">
            <Outlet />
          </div>
        </div>

      </div>
    </div>
  );
}
