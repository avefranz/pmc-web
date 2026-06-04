import { useState } from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useUpdateLandlordIdentity } from "@/lib/hooks/use-profile";
import type { LandlordIdentityDto, LandlordIdType } from "@/lib/types";

const NOT_IN_PAST = (d: Date) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d < t;
};

/**
 * BUG-267: form a landlord fills once so their identity can be snapshotted into
 * the rental contract. Without it the backend rejects landlord-sign with
 * `landlord_identity_missing`. Reused on the profile page and inline on the
 * host booking detail page when signing is blocked.
 */
export function LandlordIdentityForm({
  existing,
  onSaved,
  embedded = false,
}: {
  existing?: LandlordIdentityDto | null;
  onSaved?: () => void;
  // BUG-267: when rendered inside another <form> (the host-sign form), a nested
  // <form> is invalid HTML — the "Save identity" button then triggered a native
  // GET submit and reloaded the page (URL gained a bare "?", typed data lost).
  // `embedded` swaps the <form> for a <div> and makes the save button a plain
  // type="button" that calls the handler directly, so no native submit fires.
  embedded?: boolean;
}) {
  const save = useUpdateLandlordIdentity();
  const [legalFullName, setLegalFullName] = useState(existing?.legalFullName ?? "");
  const [idType, setIdType] = useState<LandlordIdType>(existing?.idType ?? "passport");
  const [idNumber, setIdNumber] = useState(existing?.idNumber ?? "");
  const [idExpiry, setIdExpiry] = useState(existing?.idExpiryDate ?? "");
  const [residentialAddress, setResidentialAddress] = useState(existing?.residentialAddress ?? "");

  const valid =
    legalFullName.trim().length > 0 &&
    idNumber.trim().length > 0 &&
    residentialAddress.trim().length > 0;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid || save.isPending) return;
    try {
      await save.mutateAsync({
        legalFullName: legalFullName.trim(),
        idType,
        idNumber: idNumber.trim(),
        idExpiryDate: idExpiry || undefined,
        residentialAddress: residentialAddress.trim(),
      });
      toast.success("Identity saved — you can sign now");
      onSaved?.();
    } catch (err: unknown) {
      // BUG-267: the PATCH used to 401 and the global interceptor logged the
      // host out mid-form (data lost). That redirect is now suppressed for this
      // endpoint (skipAuthRedirect), so we stay on the form, keep everything
      // typed, and explain what happened instead of vanishing to /login.
      const resp = (err as { response?: { status?: number; data?: { message?: string; title?: string; detail?: string } } })?.response;
      const msg =
        resp?.data?.message ??
        resp?.data?.title ??
        resp?.data?.detail ??
        (resp?.status === 401 || resp?.status === 403
          ? "We couldn't save your identity — your account may not have landlord permissions yet. Your details are kept here; please try again or contact support."
          : "Couldn't save your identity. Please try again — your details are kept.");
      toast.error(msg);
    }
  }

  const fields = (
    <>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-fg">
          Legal full name <span className="text-danger">*</span>
        </Label>
        <Input
          value={legalFullName}
          onChange={(e) => setLegalFullName(e.target.value)}
          placeholder="As shown on your ID"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-fg">ID type <span className="text-danger">*</span></Label>
          <Select value={idType} onValueChange={(v) => setIdType(v as LandlordIdType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="thai_id">Thai national ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-fg">
            {idType === "thai_id" ? "Thai ID number" : "Passport number"} <span className="text-danger">*</span>
          </Label>
          <Input
            className="font-mono"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder={idType === "thai_id" ? "1234567890123" : "AB1234567"}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-fg">
          {idType === "thai_id" ? "ID expiry" : "Passport expiry"}{" "}
          <span className="text-fg-muted font-normal">(optional)</span>
        </Label>
        <DatePicker
          value={idExpiry}
          onChange={setIdExpiry}
          isDisabled={NOT_IN_PAST}
          startView="year"
          placeholder="Select expiry date"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-fg">
          Residential address <span className="text-danger">*</span>
        </Label>
        <Textarea
          value={residentialAddress}
          onChange={(e) => setResidentialAddress(e.target.value)}
          placeholder="Your registered residential address (printed on the contract)"
          rows={2}
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-fg-muted bg-bg-subtle rounded-xl px-3 py-2.5">
        <ShieldCheck size={13} className="shrink-0 mt-0.5" />
        <p>Stored securely and used only to fill the landlord section of your rental contracts. Saved once — reused on every future contract.</p>
      </div>

      <Button
        type={embedded ? "button" : "submit"}
        onClick={embedded ? () => { void handleSubmit(); } : undefined}
        disabled={!valid || save.isPending}
        className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white rounded-xl h-10 text-sm font-semibold disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : existing ? "Update identity" : "Save identity"}
      </Button>
    </>
  );

  // BUG-267: avoid a nested <form> when embedded in the host-sign form.
  return embedded ? (
    <div className="space-y-4">{fields}</div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">{fields}</form>
  );
}

/** Compact read-only summary of a saved identity, with an Edit toggle. */
export function LandlordIdentitySummary({ identity }: { identity: LandlordIdentityDto }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-success/8 border border-success/20 px-3.5 py-3">
      <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-fg">{identity.legalFullName}</p>
        <p className="text-xs text-fg-muted mt-0.5">
          {identity.idType === "thai_id" ? "Thai ID" : "Passport"} ·{" "}
          <span className="font-mono">{identity.idNumber}</span>
        </p>
        <p className="text-xs text-fg-muted">{identity.residentialAddress}</p>
      </div>
    </div>
  );
}
