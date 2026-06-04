import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ContactChannel } from "@/lib/types";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

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
  // BUG-300: explicit channel toggle so the section completion picks up the
  // change deterministically. The old code relied on the multi-select
  // ChipGroup's onChange wrapper — under fast double-clicks the spread of
  // the previous array could overlap the next render's read, leaving the
  // set looking empty after a couple of toggles. This handler always
  // derives from the latest draft.contactChannels.
  function toggleChannel(ch: ContactChannel) {
    const cur = draft.contactChannels ?? [];
    const next = cur.includes(ch) ? cur.filter((c) => c !== ch) : [...cur, ch];
    patch({ contactChannels: next });
  }

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

      <Field
        label="Available on"
        required
        hint={
          draft.contactChannels.length === 0
            ? "Tap one or more channels — tenants will see these in their booking."
            : `${draft.contactChannels.length} selected · tap again to remove.`
        }
      >
        {/* BUG-300: inline pills (not ChipGroup) so each button has a clear
            aria-pressed and a generous hit area. Helps both QA scripts and
            mobile thumbs land the tap. */}
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map((opt) => {
            const active = draft.contactChannels.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleChannel(opt.value)}
                className={
                  "px-3.5 py-2 rounded-full text-xs font-medium border transition-all duration-150 select-none " +
                  (active
                    ? "border-fg bg-fg text-bg-card"
                    : "border-border text-fg hover:border-fg-subtle")
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
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
