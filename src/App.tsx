import { Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard, PublicOnlyGuard } from "@/components/layout/auth-guard";
import { ManagerShell } from "@/components/layout/manager-shell";
import { LandlordShell, TenantShell } from "@/components/layout/mobile-shell";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";

// Auth pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import LineCallbackPage from "@/pages/line-callback";
import RoleRouterPage from "@/pages/role-router";
import InviteAcceptPage from "@/pages/invite-accept";
import ProfilePage from "@/pages/profile";
import NoAccessPage from "@/pages/no-access";

// Manager pages
import ManagerDashboard from "@/features/manager/dashboard";
import AssetsPage from "@/features/manager/assets";
import AssetDetailPage from "@/features/manager/assets/detail";
import BookingDetailPage from "@/features/manager/bookings/detail";
import TicketsPage from "@/features/manager/tickets";
import TicketDetailPage from "@/features/manager/tickets/detail";
import CreateTicketPage from "@/features/manager/tickets/create";
import FinancePage from "@/features/manager/finance";
import TeamPage from "@/features/manager/team";
import ListingDetailPage from "@/features/manager/listings/detail";
import CreateBookingPage from "@/features/manager/bookings/create";

// Landlord pages
import LandlordPortfolio from "@/features/landlord/portfolio";
import LandlordAssetDetail from "@/features/landlord/assets/detail";
import LandlordIncome from "@/features/landlord/income";
import LandlordTickets from "@/features/landlord/tickets";
import LandlordTicketDetail from "@/features/landlord/tickets/detail";

// Marketplace pages
import MarketplaceListingsPage from "@/features/marketplace/listings";
import MarketplaceListingDetailPage from "@/features/marketplace/listings/detail";

// Tenant pages
import TenantHome from "@/features/tenant/home";
import TenantTickets from "@/features/tenant/tickets";
import TenantTicketDetail from "@/features/tenant/tickets/detail";
import TenantInvoices from "@/features/tenant/invoices";

export default function App() {
  return (
    <Routes>
      {/* Public — redirect to portal if already logged in */}
      <Route path="/login"    element={<PublicOnlyGuard><LoginPage /></PublicOnlyGuard>} />
      <Route path="/register" element={<PublicOnlyGuard><RegisterPage /></PublicOnlyGuard>} />
      <Route path="/line-callback" element={<LineCallbackPage />} />
      <Route path="/role-router" element={<RoleRouterPage />} />
      <Route path="/invite" element={<InviteAcceptPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route path="/no-access" element={<NoAccessPage />} />

      {/* Public marketplace */}
      <Route path="/listings" element={<MarketplaceShell />}>
        <Route index element={<MarketplaceListingsPage />} />
        <Route path=":id" element={<MarketplaceListingDetailPage />} />
      </Route>

      {/* Manager (Admin) */}
      <Route
        path="/manager"
        element={
          <AuthGuard requiredRole="Admin">
            <ManagerShell />
          </AuthGuard>
        }
      >
        <Route index element={<ManagerDashboard />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route path="bookings" element={<Navigate to="/manager/assets" replace />} />
        <Route path="bookings/new" element={<CreateBookingPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/new" element={<CreateTicketPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="listings/:id" element={<ListingDetailPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="team" element={<TeamPage />} />
      </Route>

      {/* Landlord */}
      <Route
        path="/landlord"
        element={
          <AuthGuard requiredRole="Landlord">
            <LandlordShell />
          </AuthGuard>
        }
      >
        <Route index element={<LandlordPortfolio />} />
        <Route path="assets/:id" element={<LandlordAssetDetail />} />
        <Route path="income" element={<LandlordIncome />} />
        <Route path="tickets" element={<LandlordTickets />} />
        <Route path="tickets/:id" element={<LandlordTicketDetail />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Tenant */}
      <Route
        path="/tenant"
        element={
          <AuthGuard requiredRole="Tenant">
            <TenantShell />
          </AuthGuard>
        }
      >
        <Route index element={<TenantHome />} />
        <Route path="tickets" element={<TenantTickets />} />
        <Route path="tickets/:id" element={<TenantTicketDetail />} />
        <Route path="invoices" element={<TenantInvoices />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all */}
      <Route path="/" element={<Navigate to="/listings" replace />} />
      <Route path="*" element={<Navigate to="/role-router" replace />} />
    </Routes>
  );
}
