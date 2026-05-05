import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthGuard, PublicOnlyGuard } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";

// Auth pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import LineCallbackPage from "@/pages/line-callback";
import RoleRouterPage from "@/pages/role-router";
import InviteAcceptPage from "@/pages/invite-accept";

// Trips
import { TripsPage } from "@/features/me/trips/trips-page";
import { TripDetailPage } from "@/features/me/trips/trip-detail-page";
import ProfilePage from "@/pages/profile";

// Host managed
import { ManagedListPage } from "@/features/me/host/managed/list-page";
import { InviteLandlordPage } from "@/features/me/host/managed/invite-page";

// Host deep features
import { TicketsListPage } from "@/features/me/host/tickets/list-page";
import { FinancePage } from "@/features/me/host/finance/page";
import { BookingDetailPage } from "@/features/me/host/bookings/detail-page";

// Marketplace
import { ListingsPage } from "@/features/marketplace/listings-page";
import { ListingDetailPage } from "@/features/marketplace/listing-detail-page";

// Host
import { HostHomePage } from "@/features/me/host/host-home-page";
import { PropertiesListPage } from "@/features/me/host/properties/list-page";
import { PropertyCreateWizard } from "@/features/me/host/properties/create-wizard";
import { PropertyDetailPage } from "@/features/me/host/properties/detail-page";

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-14 h-14 rounded-2xl bg-bg-subtle flex items-center justify-center text-2xl mb-4">🚧</div>
      <p className="text-lg font-semibold text-fg">{label}</p>
      <p className="text-sm text-fg-muted mt-1">This section is coming soon.</p>
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
      <Route element={<PublicShell />}>
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
      </Route>

      {/* /me — unified cabinet */}
      <Route element={<AuthGuard><AppShell /></AuthGuard>}>
        <Route path="/me" element={<Navigate to="/me/trips" replace />} />
        <Route path="/me/trips" element={<TripsPage />} />
        <Route path="/me/trips/:id" element={<TripDetailPage />} />
        <Route path="/me/wishlist" element={<ComingSoon label="Wishlist" />} />
        <Route path="/me/profile" element={<ProfilePage />} />
        <Route path="/me/host" element={<HostHomePage />} />
        <Route path="/me/host/properties" element={<PropertiesListPage />} />
        <Route path="/me/host/properties/new" element={<PropertyCreateWizard />} />
        <Route path="/me/host/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/me/host/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/me/host/tickets" element={<TicketsListPage />} />
        <Route path="/me/host/finance" element={<FinancePage />} />
        <Route element={<AuthGuard require="manager"><Outlet /></AuthGuard>}>
          <Route path="/me/host/managed" element={<ManagedListPage />} />
          <Route path="/me/host/managed/invite" element={<InviteLandlordPage />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<AuthGuard require="admin"><AppShell /></AuthGuard>}>
        <Route path="/admin" element={<ComingSoon label="Admin panel" />} />
      </Route>

      {/* Catch-all */}
      <Route path="/" element={<Navigate to="/listings" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
