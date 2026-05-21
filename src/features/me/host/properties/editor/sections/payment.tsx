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

// PromptPay accepts a 10-digit mobile (0XXXXXXXXX) or a 13-digit Thai
// national ID. Anything else and tenants won't be able to send funds.
function validatePromptPay(raw: string): string | null {
  const v = raw.replace(/[\s-]/g, "");
  if (!v) return null;
  if (!/^\d+$/.test(v)) return "Use digits only — no letters or symbols.";
  if (v.length === 10 && !v.startsWith("0")) return "Mobile numbers start with 0 (e.g. 0812345678).";
  if (v.length !== 10 && v.length !== 13) return "Should be 10 digits (mobile) or 13 digits (national ID).";
  return null;
}

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

  const hasBank =
    draft.paymentBankName.trim().length > 0 &&
    draft.paymentBankAccountNumber.trim().length > 0 &&
    draft.paymentBankAccountName.trim().length > 0;

  const promptPayError    = validatePromptPay(draft.paymentPromptPayId);
  const accountNumError   = validateBankAccountNumber(draft.paymentBankAccountNumber);
  const accountNameWarning =
    draft.paymentBankAccountName.trim().length > 0 &&
    fullName.length > 0 &&
    draft.paymentBankAccountName.trim().toLowerCase() !== fullName.toLowerCase()
      ? `Doesn't match your account name "${fullName}" — banks reject transfers when the name on the receiving account differs.`
      : null;

  return (
    <div>
      <Field
        label="PromptPay ID"
        hint={
          promptPayError ? (
            <span className="text-danger">{promptPayError}</span>
          ) : (
            "Mobile number or national ID linked to PromptPay. Fastest way for tenants to pay rent in Thailand."
          )
        }
      >
        <Input
          value={draft.paymentPromptPayId}
          onChange={(e) => patch({ paymentPromptPayId: e.target.value })}
          placeholder="0812345678"
          className={promptPayError ? "border-destructive" : ""}
        />
      </Field>

      <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-fg-muted">
        <div className="flex-1 h-px bg-border" />
        Or bank transfer
        <div className="flex-1 h-px bg-border" />
      </div>

      <Field label="Bank">
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
          hint={accountNumError ? <span className="text-danger">{accountNumError}</span> : undefined}
        >
          <Input
            value={draft.paymentBankAccountNumber}
            onChange={(e) => patch({ paymentBankAccountNumber: e.target.value })}
            placeholder="123-4-56789-0"
            className={accountNumError ? "border-destructive" : ""}
          />
        </Field>
        <Field
          label="Account name"
          hint={
            accountNameWarning
              ? <span className="text-warning">{accountNameWarning}</span>
              : fullName
                ? `Should match your account name "${fullName}".`
                : "Full name as it appears on the bank account."
          }
        >
          <Input
            value={draft.paymentBankAccountName}
            onChange={(e) => patch({ paymentBankAccountName: e.target.value })}
            placeholder={fullName || "Full Name"}
            className={accountNameWarning ? "border-warning" : ""}
          />
        </Field>
      </Row>

      {!hasBank && !draft.paymentPromptPayId.trim() && (
        <p className="text-xs text-warning mt-2">
          Add at least PromptPay or a full bank entry — without this, bookings stall at the payment step.
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
  isComplete: (d) => {
    const promptOk = d.paymentPromptPayId.trim().length > 0 && validatePromptPay(d.paymentPromptPayId) === null;
    const bankOk =
      d.paymentBankName.trim().length > 0 &&
      d.paymentBankAccountNumber.trim().length > 0 &&
      d.paymentBankAccountName.trim().length > 0 &&
      validateBankAccountNumber(d.paymentBankAccountNumber) === null;
    return promptOk || bankOk;
  },
  summary: (d) => {
    if (d.paymentPromptPayId.trim()) return `PromptPay · ${d.paymentPromptPayId}`;
    if (d.paymentBankName.trim()) return `${d.paymentBankName} · ${d.paymentBankAccountNumber}`;
    return "—";
  },
  Form: PaymentDialog,
};
