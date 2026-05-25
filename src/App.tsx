import { Routes, Route, Navigate, Outlet, useParams, useNavigate } from "react-router-dom";
import { AuthGuard, PublicOnlyGuard } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";

// Public pages (partner's additions)
import LandingPage from "@/pages/landing";

// Auth pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import LineCallbackPage from "@/pages/line-callback";
import RoleRouterPage from "@/pages/role-router";
import InviteAcceptPage from "@/pages/invite-accept";
import ProfilePage from "@/pages/profile";

function TripDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/me/guest/bookings/${id}`} replace />;
}

// /me — unified dashboard
import { MeDashboard } from "@/features/me/me-dashboard";

// Guest context
import { GuestHome } from "@/features/me/guest/guest-home";
import { GuestBookingsPage } from "@/features/me/guest/bookings/list-page";
import { GuestBookingDetailPage } from "@/features/me/guest/bookings/detail-page";
import { GuestContractSignPage } from "@/features/me/guest/bookings/contract-sign-page";

import { GuestApplicationsPage } from "@/features/me/guest/applications/list-page";
import { GuestApplicationDetailPage } from "@/features/me/guest/applications/detail-page";
// Ticket pages removed — ticket system not in scope for this release

// Host managed
import { ManagedListPage } from "@/features/me/host/managed/list-page";
import { InviteLandlordPage } from "@/features/me/host/managed/invite-page";

// Host properties
import { HostHomePage } from "@/features/me/host/host-home-page";
import { PropertiesListPage } from "@/features/me/host/properties/list-page";
import { PropertyEditorPage } from "@/features/me/host/properties/editor/property-editor-page";

// Host requests
import { HostRequestsPage } from "@/features/me/host/requests/list-page";
import { HostRequestDetailPage } from "@/features/me/host/requests/detail-page";

// Host bookings
import { HostBookingsPage } from "@/features/me/host/bookings/list-page";
import { BookingDetailPage } from "@/features/me/host/bookings/detail-page";
import { CreateBookingPage } from "@/features/me/host/bookings/create-page";

// Host finance
import { FinancePage } from "@/features/me/host/finance/page";

// Guest TM30 & onboarding
import { GuestTm30Page } from "@/features/me/guest/tm30/page";
import { PassportOnboardingStep } from "@/features/me/onboarding/passport-step";
import { IntentOnboardingStep } from "@/features/me/onboarding/intent-step";

// Host settings
import { PaymentSettingsPage } from "@/features/me/host/settings/payment-settings-page";
import { ContactSettingsPage } from "@/features/me/host/settings/contact-settings-page";

// Marketplace
import { ListingsPage } from "@/features/marketplace/listings-page";
import { ListingDetailPage } from "@/features/marketplace/listing-detail-page";

function ComingSoon({ label }: { label: string }) {
  const nav = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-bg-subtle flex items-center justify-center text-2xl mb-4">🚧</div>
      <p className="text-lg font-semibold text-fg">{label}</p>
      <p className="text-sm text-fg-muted mt-1 mb-6">This section is coming soon.</p>
      <button
        onClick={() => nav(-1)}
        className="text-sm font-medium text-fg-muted hover:text-fg underline underline-offset-4 transition-colors"
      >
        Go back
      </button>
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
        {/* Smart entry: redirects based on capabilities */}
        <Route path="/me" element={<MeDashboard />} />

        {/* Profile */}
        <Route path="/me/profile" element={<ProfilePage />} />

        {/* Guest context */}
        <Route path="/me/guest" element={<GuestHome />} />
        <Route path="/me/guest/bookings" element={<GuestBookingsPage />} />
        <Route path="/me/guest/bookings/:id" element={<GuestBookingDetailPage />} />
        <Route path="/me/guest/bookings/:id/contract" element={<GuestContractSignPage />} />
        <Route path="/me/guest/applications" element={<GuestApplicationsPage />} />
        <Route path="/me/guest/applications/:id" element={<GuestApplicationDetailPage />} />
        <Route path="/me/guest/tm30" element={<GuestTm30Page />} />

        {/* Onboarding */}
        <Route path="/me/onboarding/intent" element={<IntentOnboardingStep />} />
        <Route path="/me/onboarding/passport" element={<PassportOnboardingStep />} />

        {/* Legacy trips — redirect to new paths */}
        <Route path="/me/trips" element={<Navigate to="/me/guest/bookings" replace />} />
        <Route path="/me/trips/:id" element={<TripDetailRedirect />} />

        {/* Host context */}
        <Route path="/me/host" element={<HostHomePage />} />
        <Route path="/me/host/properties" element={<PropertiesListPage />} />
        <Route path="/me/host/properties/new" element={<PropertyEditorPage />} />
        <Route path="/me/host/properties/:id" element={<PropertyEditorPage />} />
        <Route path="/me/host/requests" element={<HostRequestsPage />} />
        <Route path="/me/host/requests/:id" element={<HostRequestDetailPage />} />
        <Route path="/me/host/bookings" element={<HostBookingsPage />} />
        <Route path="/me/host/bookings/new" element={<CreateBookingPage />} />
        <Route path="/me/host/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/me/host/finance" element={<FinancePage />} />
        <Route path="/me/host/settings/payment" element={<PaymentSettingsPage />} />
        <Route path="/me/host/settings/contact" element={<ContactSettingsPage />} />
        <Route path="/me/wishlist" element={<ComingSoon label="Wishlist" />} />
        <Route element={<AuthGuard require="manager"><Outlet /></AuthGuard>}>
          <Route path="/me/host/managed" element={<ManagedListPage />} />
          <Route path="/me/host/managed/invite" element={<InviteLandlordPage />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<AuthGuard require="admin"><AppShell /></AuthGuard>}>
        <Route path="/admin" element={<ComingSoon label="Admin panel" />} />
      </Route>

      {/* Public landing pages (partner's additions) */}
      <Route path="/" element={<LandingPage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
