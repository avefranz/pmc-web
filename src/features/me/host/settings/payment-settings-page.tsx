import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile, useUpdateProfile, stashProfileUpdate } from "@/lib/hooks/use-profile";

export function PaymentSettingsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [promptPayId, setPromptPayId] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");

  useEffect(() => {
    if (profile) {
      setPromptPayId(profile.promptPayId ?? "");
      setBankName(profile.bankName ?? "");
      setBankAccountNumber(profile.bankAccountNumber ?? "");
      setBankAccountName(profile.bankAccountName ?? "");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      promptPayId: promptPayId || undefined,
      bankName: bankName || undefined,
      bankAccountNumber: bankAccountNumber || undefined,
      bankAccountName: bankAccountName || undefined,
    };
    try {
      await updateProfile.mutateAsync(payload);
      // Belt-and-braces: also stash directly (the mutation's onSuccess already
      // does this, but stashing here too means it works even if HMR / hook
      // state gets stale during dev).
      stashProfileUpdate(payload as unknown as Record<string, unknown>);
      toast.success("Payment details saved");
    } catch {
      toast.error("Failed to save");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "max-w-3xl"}>
      {!embedded && (
        <div className="flex items-center gap-2 mb-6">
          <Link
            to="/me/profile"
            className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-semibold text-fg">Payment details</h1>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-bg-card rounded-2xl shadow-card p-6 space-y-4">
          <p className="text-sm text-fg-muted">
            These details are shown to tenants when payment is required. At least one method (PromptPay or bank transfer) is recommended.
          </p>

          {(profile?.promptPayId || profile?.bankAccountNumber) && (
            <div className="flex items-start gap-2.5 rounded-xl bg-warning/8 border border-warning/20 px-3 py-2.5">
              <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-fg-muted leading-relaxed">
                <span className="font-semibold text-fg">Updates apply to new invoices only.</span>{" "}
                Already-issued invoices will keep the previous payout details.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">PromptPay ID</Label>
            <Input
              value={promptPayId}
              onChange={(e) => setPromptPayId(e.target.value)}
              placeholder="0812345678"
            />
            <p className="text-xs text-fg-muted">Mobile number or national ID registered with PromptPay.</p>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted">Bank transfer</p>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">Bank name</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Kasikorn Bank"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">Account number</Label>
              <Input
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="123-4-56789-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">Account name</Label>
              <Input
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white rounded-2xl h-12 font-medium"
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  );
}
