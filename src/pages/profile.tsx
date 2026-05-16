import { LogOut, ChevronRight, FileText, Shield, CreditCard, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMe } from "@/lib/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { initials } from "@/lib/utils/format";

function ProfileLink({ to, icon: Icon, label, description }: {
  to: string;
  icon: React.ElementType;
  label: string;
  description?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 px-5 py-4 hover:bg-bg-subtle transition-colors border-b border-border last:border-none"
    >
      <div className="w-9 h-9 rounded-xl bg-bg-subtle flex items-center justify-center shrink-0">
        <Icon size={16} className="text-fg-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {description && <p className="text-xs text-fg-muted mt-0.5">{description}</p>}
      </div>
      <ChevronRight size={16} className="text-fg-subtle shrink-0" />
    </Link>
  );
}

export default function ProfilePage() {
  const { clearAuth } = useAuthStore();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const name = me?.firstName
    ? me.lastName ? `${me.firstName} ${me.lastName}` : me.firstName
    : me?.lineName ?? "User";

  function handleLogout() {
    clearAuth();
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-fg mb-6">Profile</h1>

      {/* Avatar card */}
      <div className="bg-bg-card rounded-2xl shadow-card p-5 flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials(name)}
        </div>
        <div>
          <p className="font-semibold text-fg">{name}</p>
          {me?.email && <p className="text-sm text-fg-muted">{me.email}</p>}
          {me?.roles?.length ? (
            <p className="text-xs text-fg-subtle mt-0.5">{me.roles.join(" · ")}</p>
          ) : null}
        </div>
      </div>

      {/* Links */}
      <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden mb-4">
        <ProfileLink
          to="/me/onboarding/passport"
          icon={FileText}
          label="Personal details & passport"
          description="Nationality, visa type, passport info"
        />
        <ProfileLink
          to="/me/guest/tm30"
          icon={Shield}
          label="TM30 documents"
          description="View your immigration filings"
        />
        {me?.roles?.some((r) => r === "Landlord" || r === "Admin") && (
          <>
            <ProfileLink
              to="/me/host/settings/payment"
              icon={CreditCard}
              label="Payment details"
              description="PromptPay and bank transfer info for tenants"
            />
            <ProfileLink
              to="/me/host/settings/contact"
              icon={Phone}
              label="Contact details"
              description="Phone number and messaging apps shown after booking"
            />
          </>
        )}
      </div>

      {/* Sign out */}
      <Button variant="outline" className="w-full rounded-2xl h-12 border-border text-danger hover:bg-danger/5 hover:border-danger/30" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </div>
  );
}
