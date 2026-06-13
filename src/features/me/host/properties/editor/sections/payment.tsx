import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/lib/hooks/use-auth";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field, Row } from "../ui";

const THAI_BANKS = [
  { id: "KBank", name: "KBank (Kasikorn)" },
  { id: "SCB", name: "SCB (Siam Commercial)" },
  { id: "Bangkok Bank", name: "Bangkok Bank" },
  { id: "Krungthai", name: "Krungthai Bank" },
  { id: "Krungsri", name: "Krungsri (Bank of Ayudhya)" },
  { id: "TTB", name: "TTB (TMBThanachart)" },
  { id: "GSB", name: "GSB (Government Savings Bank)" },
  { id: "GHB", name: "GHB (Government Housing Bank)" },
  { id: "UOB", name: "UOB Thailand" },
  { id: "CIMB", name: "CIMB Thai" },
  { id: "LH Bank", name: "LH Bank" },
  { id: "TISCO", name: "TISCO Bank" },
  { id: "Kiatnakin", name: "Kiatnakin Phatra Bank" },
];

function validateBankAccountNumber(raw: string): string | null {
  const v = raw.replace(/[\s-]/g, "");
  if (!v) return null;
  if (!/^\d+$/.test(v)) return "Use digits only.";
  if (v.length < 9 || v.length > 15) return "Most Thai bank accounts are 10–13 digits.";
  return null;
}

function PaymentDialog({ draft, patch }: SectionDialogProps) {
  const { data: me } = useMe();
  const fullName = [me?.firstName, me?.lastName].filter(Boolean).join(" ").trim();

  // The account holder name must match the host's legal name, so it's not freely
  // editable — it mirrors the profile name (First + Last). Keep the saved draft
  // value in sync so the receiving-account name we send the tenant is correct.
  useEffect(() => {
    if (fullName && draft.paymentBankAccountName !== fullName) {
      patch({ paymentBankAccountName: fullName });
    }
  }, [fullName, draft.paymentBankAccountName, patch]);

  const accountNumError = validateBankAccountNumber(draft.paymentBankAccountNumber);

  const hasBank =
    draft.paymentBankName.trim().length > 0 &&
    draft.paymentBankAccountNumber.trim().length > 0 &&
    draft.paymentBankAccountName.trim().length > 0;

  return (
    <div>
      <Field label="Bank" required>
        <Select
          value={draft.paymentBankName || ""}
          onValueChange={(v) => patch({ paymentBankName: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select bank" />
          </SelectTrigger>
          <SelectContent>
            {THAI_BANKS.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Row cols={2}>
        <Field
          label="Account number"
          required
          hint={accountNumError ? <span className="text-danger">{accountNumError}</span> : undefined}
        >
          <Input
            value={draft.paymentBankAccountNumber}
            onChange={(e) => {
              // Strip non-digit characters (allow digits only — Thai bank accounts are numeric)
              const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
              patch({ paymentBankAccountNumber: digits });
            }}
            inputMode="numeric"
            placeholder="1234567890"
            maxLength={15}
            className={accountNumError ? "border-destructive" : ""}
          />
        </Field>
        <Field
          label="Account name"
          required
          hint={
            <span>
              From your profile name. If it's wrong,{" "}
              <Link to="/me/profile" className="text-brand underline underline-offset-2 hover:opacity-80">
                update it in your profile
              </Link>{" "}
              first.
            </span>
          }
        >
          <Input
            value={fullName}
            readOnly
            tabIndex={-1}
            placeholder="Set your name in your profile"
            className="cursor-not-allowed bg-bg-subtle text-fg-muted"
          />
        </Field>
      </Row>

      {!hasBank && (
        <p className="text-xs text-warning mt-2">
          Fill in your bank details — without this, bookings stall at the payment step.
        </p>
      )}
    </div>
  );
}

export const paymentSection: SectionDef = {
  id: "payment",
  label: "Payment details",
  group: "host",
  required: true,
  estTime: "2 min",
  isComplete: (d) =>
    d.paymentBankName.trim().length > 0 &&
    d.paymentBankAccountNumber.trim().length > 0 &&
    d.paymentBankAccountName.trim().length > 0 &&
    validateBankAccountNumber(d.paymentBankAccountNumber) === null,
  summary: (d) => {
    if (d.paymentBankName.trim()) return `${d.paymentBankName} · ${d.paymentBankAccountNumber}`;
    return "—";
  },
  Form: PaymentDialog,
};
