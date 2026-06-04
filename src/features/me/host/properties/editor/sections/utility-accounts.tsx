import { useState } from "react";
import { Plus, Trash2, Zap, Droplet, Wifi, Building2, MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PeaBillCard } from "@/components/shared/pea-bill-card";
import { useUtilitiesByAsset, useCreateUtility, useDeleteUtility } from "@/lib/hooks/use-utilities";
import { UtilityType } from "@/lib/types/enums";
import type { SectionDef, SectionDialogProps } from "../types";

// BUG-317: utility-PROVIDER management (meter/account binding + live PEA debt)
// regressed when the property pages were rebuilt — it lived only in the now-
// orphaned properties/detail-page.tsx. This section restores it inside the
// editor. It's edit-only: a meter is bound to an existing asset, so it needs
// a real assetId (no point during the first create pass).

const TYPE_ICON: Record<string, React.ElementType> = {
  [UtilityType.Electricity]: Zap,
  [UtilityType.Water]: Droplet,
  [UtilityType.Internet]: Wifi,
  [UtilityType.CommonAreaFee]: Building2,
  [UtilityType.Other]: MoreHorizontal,
};

const TYPE_OPTIONS: { value: UtilityType; label: string; providerHint: string }[] = [
  { value: UtilityType.Electricity, label: "Electricity", providerHint: "e.g. PEA, MEA" },
  { value: UtilityType.Water, label: "Water", providerHint: "e.g. PWA, MWA" },
  { value: UtilityType.Internet, label: "Internet", providerHint: "e.g. AIS, True, 3BB" },
  { value: UtilityType.CommonAreaFee, label: "Common area fee", providerHint: "Juristic / building office" },
  { value: UtilityType.Other, label: "Other", providerHint: "Provider name" },
];

function UtilityAccountsDialog({ assetId }: SectionDialogProps) {
  const { data: utilities, isLoading } = useUtilitiesByAsset(assetId ?? "");
  const createUtility = useCreateUtility();
  const deleteUtility = useDeleteUtility(assetId ?? "");

  const [adding, setAdding] = useState(false);
  const [utilType, setUtilType] = useState<UtilityType>(UtilityType.Electricity);
  const [providerName, setProviderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const typeOption = TYPE_OPTIONS.find((t) => t.value === utilType);

  async function handleAdd() {
    if (!assetId) return;
    if (!providerName.trim() || !accountNumber.trim()) {
      toast.error("Provider and account number are required.");
      return;
    }
    try {
      await createUtility.mutateAsync({
        assetId,
        utilityType: utilType,
        providerName: providerName.trim(),
        accountNumber: accountNumber.trim(),
      });
      toast.success(`${typeOption?.label ?? "Utility"} account linked`);
      setProviderName("");
      setAccountNumber("");
      setAdding(false);
    } catch {
      toast.error("Couldn't link the account. Try again.");
    }
  }

  if (!assetId) {
    return (
      <p className="text-sm text-fg-muted">
        Save the property first, then link your electricity / water meters here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-fg-muted leading-relaxed">
        Link your meters and provider accounts. For a <strong className="text-fg">PEA</strong> electricity
        meter, Siamo pulls the live outstanding bill (amount due, due date, 7-Eleven barcode) straight
        from the provider — so you always see what's owed without logging in anywhere.
      </p>

      {/* Existing contracts */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 size={14} className="animate-spin" /> Loading linked accounts…
        </div>
      ) : utilities && utilities.length > 0 ? (
        <div className="space-y-2">
          {utilities.map((u) => {
            const Icon = TYPE_ICON[u.utilityType] ?? MoreHorizontal;
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg-card px-3.5 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-bg-subtle flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-fg-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg">{u.utilityType}</p>
                  <p className="text-xs text-fg-muted truncate">
                    {u.providerName}
                    {u.accountNumber && (
                      <span className="font-mono text-fg-subtle"> · {u.accountNumber}</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteUtility.mutate(u.id)}
                  disabled={deleteUtility.isPending}
                  aria-label="Remove account"
                  className="shrink-0 w-8 h-8 rounded-lg hover:bg-danger/10 text-fg-muted hover:text-danger flex items-center justify-center disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-fg-muted">No accounts linked yet.</p>
      )}

      {/* Add form */}
      {adding ? (
        <div className="rounded-xl border border-border bg-bg-subtle/40 p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-fg">Type</label>
              <Select value={utilType} onValueChange={(v) => setUtilType(v as UtilityType)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-fg">Provider</label>
              <Input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder={typeOption?.providerHint}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-fg">
                {utilType === UtilityType.Electricity ? "Meter / CA number" : "Account number"}
              </label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={utilType === UtilityType.Electricity ? "e.g. 020012345678" : "Account no."}
                className="font-mono"
              />
            </div>
          </div>
          {utilType === UtilityType.Electricity && (
            <p className="text-[11px] text-fg-muted">
              For PEA, the CA (Customer Account) number is on your bill — once linked, the live balance shows below.
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleAdd} disabled={createUtility.isPending} className="h-9">
              {createUtility.isPending ? "Linking…" : "Link account"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)} className="h-9">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)} className="gap-1.5 h-9">
          <Plus size={14} /> Link a meter / account
        </Button>
      )}

      {/* Live PEA bill (renders its own "no meter linked" state if none) */}
      <div className="pt-1">
        <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Live electricity bill</p>
        <PeaBillCard assetId={assetId} />
      </div>
    </div>
  );
}

export const utilityAccountsSection: SectionDef = {
  id: "utility-accounts",
  label: "Utility accounts & bills",
  group: "included",
  required: false,
  // Edit-only: a meter binds to an existing asset (needs a real assetId).
  editOnly: true,
  estTime: "2 min",
  // Contracts live server-side (not in the draft), so we can't derive
  // completeness from the draft — this is optional management, always "ok".
  isComplete: () => true,
  summary: () => "Meters & provider accounts",
  Form: UtilityAccountsDialog,
};
