import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Bell, Check, CreditCard, FileText, Lock, LogOut, Mail,
  Phone, ShieldCheck, User, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMe } from "@/lib/hooks/use-auth";
import { useMyProfile, useMyTm30 } from "@/lib/hooks/use-profile";
import { useQueryClient } from "@tanstack/react-query";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { PassportOnboardingStep } from "@/features/me/onboarding/passport-step";
import { PaymentSettingsPage } from "@/features/me/host/settings/payment-settings-page";
import { ContactSettingsPage } from "@/features/me/host/settings/contact-settings-page";

type SectionId =
  | "overview" | "personal" | "payment" | "contact"
  | "documents" | "notifications" | "security";

const NAV: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "overview",       label: "Profile overview",    icon: User },
  { id: "personal",       label: "Personal & passport", icon: FileText },
  { id: "payment",        label: "Payment methods",     icon: CreditCard },
  { id: "contact",        label: "Contact & messaging", icon: Phone },
  { id: "documents",      label: "Documents",           icon: ShieldCheck },
  { id: "notifications",  label: "Notifications",       icon: Bell },
  { id: "security",       label: "Security",            icon: Lock },
];

function VerifyBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-medium border",
      ok
        ? "bg-success/10 text-success border-success/30"
        : "bg-warning/10 text-warning border-warning/30",
    )}>
      {ok ? <Check size={10} /> : <X size={10} />}
      {label}
    </span>
  );
}

function UserCard() {
  const { data: me } = useMe();
  const { data: profile } = useMyProfile();

  const name = me?.firstName
    ? me.lastName ? `${me.firstName} ${me.lastName}` : me.firstName
    : me?.lineName ?? "User";
  const role = me?.roles?.[0] ?? "Tenant";
  const emailOk = !!me?.email;
  const phoneOk = !!profile?.phone;
  const passportOk = !!profile?.passportNumber;

  return (
    <div className="bg-bg-card rounded-2xl border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-full bg-fg flex items-center justify-center text-white text-sm font-bold shrink-0">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-fg truncate">{name}</div>
          {me?.email && <div className="text-xs text-fg-muted truncate">{me.email}</div>}
        </div>
      </div>
      <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-pill bg-bg-subtle border border-border text-xs font-medium text-fg-muted">
        <User size={12} /> {role}
      </span>
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
        <VerifyBadge ok={emailOk} label="Email" />
        <VerifyBadge ok={phoneOk} label="Phone" />
        <VerifyBadge ok={passportOk} label="Passport" />
      </div>
    </div>
  );
}

function SidebarNav({
  active,
  onSelect,
  pips,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  pips: Partial<Record<SectionId, boolean>>;
}) {
  return (
    <div className="bg-bg-card rounded-2xl border border-border p-1.5 flex flex-col">
      {NAV.map((n) => {
        const Icon = n.icon;
        const isActive = active === n.id;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
              isActive
                ? "bg-bg-subtle text-fg"
                : "text-fg-muted hover:text-fg hover:bg-bg-subtle/60",
            )}
          >
            <span className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
              isActive ? "bg-bg-card border border-border" : "",
            )}>
              <Icon size={14} />
            </span>
            <span className="flex-1 min-w-0 truncate">{n.label}</span>
            {pips[n.id] && <span className="w-1.5 h-1.5 rounded-full bg-warning" />}
          </button>
        );
      })}
    </div>
  );
}

function SectionShell({
  title, subtitle, status, children,
}: {
  title: string;
  subtitle?: string;
  status?: { ok: boolean; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-card rounded-2xl shadow-card p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-fg">{title}</h2>
          {subtitle && <p className="text-sm text-fg-muted mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {status && (
          <span className={cn(
            "shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium border",
            status.ok
              ? "bg-success/10 text-success border-success/30"
              : "bg-warning/10 text-warning border-warning/30",
          )}>
            {status.ok ? <Check size={12} /> : <X size={12} />}
            {status.label}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryCard({
  title, value, sub, tone, icon: Icon, onJump,
}: {
  title: string;
  value: string;
  sub: string;
  tone: "ok" | "warn" | "neutral";
  icon: React.ElementType;
  onJump: () => void;
}) {
  const toneCls = tone === "ok"
    ? "border-success/30 bg-success/5"
    : tone === "warn"
    ? "border-warning/30 bg-warning/5"
    : "border-border bg-bg-card";
  const iconCls = tone === "ok"
    ? "bg-success/10 text-success"
    : tone === "warn"
    ? "bg-warning/10 text-warning"
    : "bg-bg-subtle text-fg-muted";
  return (
    <div className={cn("border rounded-xl p-4 flex flex-col gap-1.5", toneCls)}>
      <div className="flex items-center gap-2 text-xs font-medium text-fg-muted">
        <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center", iconCls)}>
          <Icon size={12} />
        </span>
        {title}
      </div>
      <div className="text-sm font-semibold text-fg">{value}</div>
      <div className="text-xs text-fg-muted">{sub}</div>
      <button
        type="button"
        onClick={onJump}
        className="self-start inline-flex items-center gap-1 text-xs font-medium text-fg mt-1 hover:underline"
      >
        {tone === "warn" ? "Complete now" : "Manage"} <ArrowRight size={11} />
      </button>
    </div>
  );
}

function SectionOverview({ onJump }: { onJump: (id: SectionId) => void }) {
  const { data: profile } = useMyProfile();
  const { data: me } = useMe();
  const { data: tm30 } = useMyTm30();

  const passportOk = !!profile?.passportNumber;
  const paymentOk = !!profile?.promptPayId || !!profile?.bankAccountNumber;
  const phoneOk = !!profile?.phone;
  const docCount = tm30?.length ?? 0;
  const isHost = me?.roles?.some((r) => r === "Landlord" || r === "Admin");

  return (
    <SectionShell
      title="Profile"
      subtitle="A snapshot of your account. Most things below take less than a minute to set up."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SummaryCard
          title="Passport & visa"
          value={passportOk ? `On file · ${profile?.passportNumber}` : "Not on file"}
          sub="Required to sign rental contracts and for TM-30."
          tone={passportOk ? "ok" : "warn"}
          icon={FileText}
          onJump={() => onJump("personal")}
        />
        {isHost && (
          <SummaryCard
            title="Payment method"
            value={
              profile?.promptPayId ? `PromptPay · ${profile.promptPayId}`
              : profile?.bankAccountNumber ? `${profile.bankName ?? "Bank"} · ••••${profile.bankAccountNumber.slice(-4)}`
              : "Not set up"
            }
            sub="Used to receive rent from tenants."
            tone={paymentOk ? "ok" : "warn"}
            icon={CreditCard}
            onJump={() => onJump("payment")}
          />
        )}
        {isHost && (
          <SummaryCard
            title="Contact"
            value={phoneOk ? `${profile?.phoneCountryCode ?? ""} ${profile?.phone}` : "Not set"}
            sub="Shared with tenants only after a booking is confirmed."
            tone={phoneOk ? "ok" : "warn"}
            icon={Phone}
            onJump={() => onJump("contact")}
          />
        )}
        <SummaryCard
          title="Documents"
          value={`${docCount} ${docCount === 1 ? "file" : "files"}`}
          sub="TM-30 receipts and signed contracts."
          tone="neutral"
          icon={ShieldCheck}
          onJump={() => onJump("documents")}
        />
      </div>
    </SectionShell>
  );
}

function SectionDocuments() {
  const { data: tm30, isLoading } = useMyTm30();
  return (
    <SectionShell
      title="Documents"
      subtitle="A vault for everything legal: TM-30 receipts, signed contracts, passport scans."
    >
      {isLoading ? (
        <div className="text-sm text-fg-muted">Loading…</div>
      ) : !tm30 || tm30.length === 0 ? (
        <div className="text-sm text-fg-muted py-8 text-center">No documents yet.</div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {tm30.map((t) => (
            <div key={t.bookingId} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-bg-subtle flex items-center justify-center shrink-0">
                <FileText size={14} className="text-fg-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-fg truncate">TM-30 · {t.listingTitle}</div>
                <div className="text-xs text-fg-muted truncate">{t.status}{t.filedAt ? ` · ${new Date(t.filedAt).toLocaleDateString()}` : ""}</div>
              </div>
              <Link
                to="/me/guest/tm30"
                className="text-xs font-medium text-fg-muted hover:text-fg"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function SectionNotifications() {
  return (
    <SectionShell
      title="Notifications"
      subtitle="Pick where each kind of alert reaches you."
    >
      <div className="text-sm text-fg-muted py-10 text-center">
        Coming soon — for now all critical alerts go to email.
      </div>
    </SectionShell>
  );
}

function SectionSecurity() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const { data: me } = useMe();
  const qc = useQueryClient();

  function handleSignOut() {
    clearAuth();
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <SectionShell
      title="Security"
      subtitle="Sign-in details and account actions."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-bg-subtle flex items-center justify-center shrink-0">
              <Mail size={14} className="text-fg-muted" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-fg">Email</div>
              <div className="text-xs text-fg-muted truncate">{me?.email ?? "—"}</div>
            </div>
          </div>
          <span className="text-xs text-fg-muted">Used to sign in</span>
        </div>
        <div className="border-t border-border pt-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-fg">Sign out</div>
            <div className="text-xs text-fg-muted">Ends your session on this device.</div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-border text-danger hover:bg-danger/5 hover:border-danger/30"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}

export default function ProfilePage() {
  const [sp, setSp] = useSearchParams();
  const active = (sp.get("s") as SectionId) || "overview";
  const { data: profile } = useMyProfile();

  const passportMissing = !profile?.passportNumber;
  const pips: Partial<Record<SectionId, boolean>> = { personal: passportMissing };

  const setActive = (id: SectionId) => {
    const next = new URLSearchParams(sp);
    if (id === "overview") next.delete("s");
    else next.set("s", id);
    setSp(next, { replace: true });
  };

  const content = useMemo(() => {
    switch (active) {
      case "personal":      return <PassportOnboardingStep embedded />;
      case "payment":       return <PaymentSettingsPage embedded />;
      case "contact":       return <ContactSettingsPage embedded />;
      case "documents":     return <SectionDocuments />;
      case "notifications": return <SectionNotifications />;
      case "security":      return <SectionSecurity />;
      default:              return <SectionOverview onJump={setActive} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-fg mb-6">Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
        <aside className="flex flex-col gap-3">
          <UserCard />
          <SidebarNav active={active} onSelect={setActive} pips={pips} />
        </aside>
        <main className="min-w-0">{content}</main>
      </div>
    </div>
  );
}
