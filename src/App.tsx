import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet, useParams, useNavigate } from "react-router-dom";
import { AuthGuard, PublicOnlyGuard } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";

// ─── Lazy page chunks ─────────────────────────────────────────────────────────

// Auth pages
const LoginPage            = lazy(() => import("@/pages/login"));
const RegisterPage         = lazy(() => import("@/pages/register"));
const LineCallbackPage     = lazy(() => import("@/pages/line-callback"));
const RoleRouterPage       = lazy(() => import("@/pages/role-router"));
const InviteAcceptPage     = lazy(() => import("@/pages/invite-accept"));
const ProfilePage          = lazy(() => import("@/pages/profile"));
const LandingPage          = lazy(() => import("@/pages/landing"));

// /me dashboard
const MeDashboard          = lazy(() => import("@/features/me/me-dashboard").then((m) => ({ default: m.MeDashboard })));

// Guest context
const GuestHome                  = lazy(() => import("@/features/me/guest/guest-home").then((m) => ({ default: m.GuestHome })));
const GuestBookingsPage          = lazy(() => import("@/features/me/guest/bookings/list-page").then((m) => ({ default: m.GuestBookingsPage })));
const GuestBookingDetailPage     = lazy(() => import("@/features/me/guest/bookings/detail-page").then((m) => ({ default: m.GuestBookingDetailPage })));
const GuestContractSignPage      = lazy(() => import("@/features/me/guest/bookings/contract-sign-page").then((m) => ({ default: m.GuestContractSignPage })));
const GuestApplicationsPage      = lazy(() => import("@/features/me/guest/applications/list-page").then((m) => ({ default: m.GuestApplicationsPage })));
const GuestApplicationDetailPage = lazy(() => import("@/features/me/guest/applications/detail-page").then((m) => ({ default: m.GuestApplicationDetailPage })));
const GuestTicketsListPage       = lazy(() => import("@/features/me/guest/tickets/list-page").then((m) => ({ default: m.GuestTicketsListPage })));
const GuestTicketDetailPage      = lazy(() => import("@/features/me/guest/tickets/detail-page").then((m) => ({ default: m.GuestTicketDetailPage })));
const GuestTm30Page              = lazy(() => import("@/features/me/guest/tm30/page").then((m) => ({ default: m.GuestTm30Page })));

// Onboarding
const PassportOnboardingStep = lazy(() => import("@/features/me/onboarding/passport-step").then((m) => ({ default: m.PassportOnboardingStep })));
const IntentOnboardingStep   = lazy(() => import("@/features/me/onboarding/intent-step").then((m) => ({ default: m.IntentOnboardingStep })));

// Host — managed
const ManagedListPage    = lazy(() => import("@/features/me/host/managed/list-page").then((m) => ({ default: m.ManagedListPage })));
const InviteLandlordPage = lazy(() => import("@/features/me/host/managed/invite-page").then((m) => ({ default: m.InviteLandlordPage })));

// Host — properties
const HostHomePage       = lazy(() => import("@/features/me/host/host-home-page").then((m) => ({ default: m.HostHomePage })));
const PropertiesListPage = lazy(() => import("@/features/me/host/properties/list-page").then((m) => ({ default: m.PropertiesListPage })));
const PropertyEditorPage = lazy(() => import("@/features/me/host/properties/editor/property-editor-page").then((m) => ({ default: m.PropertyEditorPage })));

// Host — requests
const HostRequestsPage     = lazy(() => import("@/features/me/host/requests/list-page").then((m) => ({ default: m.HostRequestsPage })));
const HostRequestDetailPage = lazy(() => import("@/features/me/host/requests/detail-page").then((m) => ({ default: m.HostRequestDetailPage })));

// Host — bookings
const HostBookingsPage  = lazy(() => import("@/features/me/host/bookings/list-page").then((m) => ({ default: m.HostBookingsPage })));
const BookingDetailPage = lazy(() => import("@/features/me/host/bookings/detail-page").then((m) => ({ default: m.BookingDetailPage })));
const CreateBookingPage = lazy(() => import("@/features/me/host/bookings/create-page").then((m) => ({ default: m.CreateBookingPage })));

// Host — tickets & finance
const TicketsListPage  = lazy(() => import("@/features/me/host/tickets/list-page").then((m) => ({ default: m.TicketsListPage })));
const TicketDetailPage = lazy(() => import("@/features/me/host/tickets/detail-page").then((m) => ({ default: m.TicketDetailPage })));
const FinancePage      = lazy(() => import("@/features/me/host/finance/page").then((m) => ({ default: m.FinancePage })));

// Host — settings
const PaymentSettingsPage = lazy(() => import("@/features/me/host/settings/payment-settings-page").then((m) => ({ default: m.PaymentSettingsPage })));
const ContactSettingsPage = lazy(() => import("@/features/me/host/settings/contact-settings-page").then((m) => ({ default: m.ContactSettingsPage })));

// Marketplace
const ListingsPage     = lazy(() => import("@/features/marketplace/listings-page").then((m) => ({ default: m.ListingsPage })));
const ListingDetailPage = lazy(() => import("@/features/marketplace/listing-detail-page").then((m) => ({ default: m.ListingDetailPage })));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-6 h-6 rounded-full border-2 border-fg/20 border-t-fg animate-spin" />
    </div>
  );
}

function TripDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/me/guest/bookings/${id}`} replace />;
}

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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

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
          <Route path="/me" element={<MeDashboard />} />
          <Route path="/me/profile" element={<ProfilePage />} />

          {/* Guest context */}
          <Route path="/me/guest" element={<GuestHome />} />
          <Route path="/me/guest/bookings" element={<GuestBookingsPage />} />
          <Route path="/me/guest/bookings/:id" element={<GuestBookingDetailPage />} />
          <Route path="/me/guest/bookings/:id/contract" element={<GuestContractSignPage />} />
          <Route path="/me/guest/applications" element={<GuestApplicationsPage />} />
          <Route path="/me/guest/applications/:id" element={<GuestApplicationDetailPage />} />
          <Route path="/me/guest/tickets" element={<GuestTicketsListPage />} />
          <Route path="/me/guest/tickets/:id" element={<GuestTicketDetailPage />} />
          <Route path="/me/guest/tm30" element={<GuestTm30Page />} />

          {/* Onboarding */}
          <Route path="/me/onboarding/intent" element={<IntentOnboardingStep />} />
          <Route path="/me/onboarding/passport" element={<PassportOnboardingStep />} />

          {/* Legacy trips */}
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
          <Route path="/me/host/tickets" element={<TicketsListPage />} />
          <Route path="/me/host/tickets/:id" element={<TicketDetailPage />} />
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
