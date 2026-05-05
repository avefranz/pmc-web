import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthGuard, PublicOnlyGuard } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

// Auth pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import LineCallbackPage from "@/pages/line-callback";
import RoleRouterPage from "@/pages/role-router";
import InviteAcceptPage from "@/pages/invite-accept";

// Host
import { HostHomePage } from "@/features/me/host/host-home-page";
import { PropertiesListPage } from "@/features/me/host/properties/list-page";

// Placeholder — replaced in subsequent commits
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-lg font-medium text-fg">{label}</p>
      <p className="text-sm text-fg-muted mt-1">Coming in next commit…</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route element={<PublicOnlyGuard><Outlet /></PublicOnlyGuard>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/line-callback" element={<LineCallbackPage />} />
      <Route path="/role-router" element={<RoleRouterPage />} />
      <Route path="/invite" element={<InviteAcceptPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />

      {/* Public marketplace */}
      <Route path="/listings" element={<ComingSoon label="Marketplace" />} />
      <Route path="/listings/:id" element={<ComingSoon label="Listing detail" />} />

      {/* /me — unified cabinet */}
      <Route element={<AuthGuard><AppShell /></AuthGuard>}>
        <Route path="/me" element={<Navigate to="/me/trips" replace />} />
        <Route path="/me/trips" element={<ComingSoon label="My trips" />} />
        <Route path="/me/trips/:id" element={<ComingSoon label="Trip detail" />} />
        <Route path="/me/wishlist" element={<ComingSoon label="Wishlist" />} />
        <Route path="/me/profile" element={<ComingSoon label="Profile" />} />
        <Route path="/me/host" element={<HostHomePage />} />
        <Route path="/me/host/properties" element={<PropertiesListPage />} />
        <Route path="/me/host/properties/new" element={<ComingSoon label="New property" />} />
        <Route path="/me/host/properties/:id" element={<ComingSoon label="Property detail" />} />
        <Route path="/me/host/bookings/:id" element={<ComingSoon label="Booking detail" />} />
        <Route path="/me/host/tickets" element={<ComingSoon label="Tickets" />} />
        <Route path="/me/host/finance" element={<ComingSoon label="Finance" />} />
        <Route element={<AuthGuard require="manager"><Outlet /></AuthGuard>}>
          <Route path="/me/host/managed" element={<ComingSoon label="Managed properties" />} />
          <Route path="/me/host/managed/invite" element={<ComingSoon label="Invite landlord" />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<AuthGuard require="admin"><AppShell /></AuthGuard>}>
        <Route path="/admin" element={<ComingSoon label="Admin panel — coming soon" />} />
      </Route>

      {/* Catch-all */}
      <Route path="/" element={<Navigate to="/listings" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
