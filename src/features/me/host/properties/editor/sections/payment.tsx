import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function PaymentDialog({ draft, patch }: SectionDialogProps) {
  const hasBank =
    draft.paymentBankName.trim().length > 0 &&
    draft.paymentBankAccountNumber.trim().length > 0 &&
    draft.paymentBankAccountName.trim().length > 0;

  return (
    <div>
      <Field
        label="PromptPay ID"
        hint="Mobile number or national ID linked to PromptPay. Fastest way for tenants to pay rent in Thailand."
      >
        <Input
          value={draft.paymentPromptPayId}
          onChange={(e) => patch({ paymentPromptPayId: e.target.value })}
          placeholder="0812345678"
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
        <Field label="Account number">
          <Input
            value={draft.paymentBankAccountNumber}
            onChange={(e) => patch({ paymentBankAccountNumber: e.target.value })}
            placeholder="123-4-56789-0"
          />
        </Field>
        <Field label="Account name">
          <Input
            value={draft.paymentBankAccountName}
            onChange={(e) => patch({ paymentBankAccountName: e.target.value })}
            placeholder="John Smith"
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
  isComplete: (d) =>
    d.paymentPromptPayId.trim().length > 0 ||
    (d.paymentBankName.trim().length > 0 &&
      d.paymentBankAccountNumber.trim().length > 0 &&
      d.paymentBankAccountName.trim().length > 0),
  summary: (d) => {
    if (d.paymentPromptPayId.trim()) return `PromptPay · ${d.paymentPromptPayId}`;
    if (d.paymentBankName.trim()) return `${d.paymentBankName} · ${d.paymentBankAccountNumber}`;
    return "—";
  },
  Form: PaymentDialog,
};
