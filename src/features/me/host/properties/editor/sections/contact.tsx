import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ContactChannel } from "@/lib/types";
import type { SectionDef, SectionDialogProps } from "../types";
import { ChipGroup, Field } from "../ui";

const CHANNEL_OPTIONS: { value: ContactChannel; label: string }[] = [
  { value: "Call", label: "📞 Call" },
  { value: "Sms", label: "💬 SMS" },
  { value: "WhatsApp", label: "🟢 WhatsApp" },
  { value: "Telegram", label: "✈️ Telegram" },
  { value: "Line", label: "🟩 LINE" },
  { value: "WeChat", label: "🟢 WeChat" },
];

const COUNTRY_CODES = ["+66", "+7", "+1", "+44", "+49", "+33", "+81", "+82", "+86", "+91"];

function ContactDialog({ draft, patch }: SectionDialogProps) {
  return (
    <div>
      <Field
        label="Phone number"
        required
        hint="Shared with tenants only after their booking is confirmed."
      >
        <div className="flex gap-2">
          <Select
            value={draft.contactPhoneCountryCode}
            onValueChange={(v) => patch({ contactPhoneCountryCode: v })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft.contactPhone}
            onChange={(e) => patch({ contactPhone: e.target.value })}
            placeholder="812345678"
            className="font-mono flex-1"
          />
        </div>
      </Field>

      <Field label="Available on" required hint="Which apps tenants can use to reach you.">
        <ChipGroup
          multi
          value={draft.contactChannels}
          onChange={(v) => patch({ contactChannels: v as ContactChannel[] })}
          options={CHANNEL_OPTIONS}
        />
      </Field>

      {draft.contactChannels.includes("Line") && (
        <Field label="LINE ID" required hint="Your public LINE username (without @).">
          <Input
            value={draft.contactLineHandle}
            onChange={(e) => patch({ contactLineHandle: e.target.value })}
            placeholder="your_line_id"
          />
        </Field>
      )}
    </div>
  );
}

export const contactSection: SectionDef = {
  id: "contact",
  label: "Contact details",
  group: "host",
  required: true,
  estTime: "1 min",
  isComplete: (d) => {
    if (!d.contactPhone.trim() || d.contactChannels.length === 0) return false;
    if (d.contactChannels.includes("Line") && !d.contactLineHandle.trim()) return false;
    return true;
  },
  summary: (d) => {
    if (!d.contactPhone) return "—";
    const channels = d.contactChannels.length > 0 ? d.contactChannels.join(", ") : "no channels";
    return `${d.contactPhoneCountryCode} ${d.contactPhone} · ${channels}`;
  },
  Form: ContactDialog,
};
