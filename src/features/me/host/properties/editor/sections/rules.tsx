import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field, Row } from "../ui";

// UX-298: "No pets" lived here AND in the dedicated Pets section, which
// could disagree (Pets section = "Allowed", House rules = "No pets"). The
// Pets section is the single source of truth — removed the duplicate
// preset to eliminate conflicting settings.
const RULE_PRESETS = [
  "No smoking indoors",
  "Quiet hours after 22:00",
  "Shoes off at the entrance",
  "No subletting allowed",
  "No parties or events",
  "No extra guests without prior notice",
  "Keep common areas clean",
  "No cooking with strong odours",
];

// UX-346: "TM-30 registration required" removed from house-rule presets — it's
// a legal filing Siamo handles automatically, not a rule the host sets, so it
// confused hosts who saw it among real rules.
// UX-299: one-liner explanations for any jargon presets, surfaced as a native
// browser tooltip — keeps the chip layout flat without a tooltip primitive.
const RULE_TOOLTIPS: Record<string, string> = {};

function RulesDialog({ draft, patch }: SectionDialogProps) {
  const activeLines = draft.houseRules
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Local state for the custom-rules textarea so spaces/mid-word edits
  // are not swallowed by the controlled-value round-trip through draft.
  const customInitial = activeLines.filter((l) => !RULE_PRESETS.includes(l)).join("\n");
  const [customText, setCustomText] = useState(customInitial);

  // Keep local state in sync if a preset toggle changes the custom part
  // (rare, but handles programmatic patches from outside).
  useEffect(() => {
    const fromDraft = draft.houseRules
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !RULE_PRESETS.includes(l))
      .join("\n");
    setCustomText((prev) => {
      // Only sync if the trimmed versions differ — don't strip trailing spaces
      // the user is currently typing.
      if (prev.trim() !== fromDraft) return fromDraft;
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.houseRules]);

  function commitCustom(raw: string) {
    const presets = activeLines.filter((l) => RULE_PRESETS.includes(l));
    const custom = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    patch({ houseRules: [...presets, ...custom].join("\n") });
  }

  function isActive(rule: string) {
    return activeLines.includes(rule);
  }

  function togglePreset(rule: string) {
    const next = isActive(rule)
      ? activeLines.filter((l) => l !== rule)
      : [...activeLines, rule];
    patch({ houseRules: next.join("\n") });
  }

  return (
    <div>
      <Field label="House rules" hint="Tenants see this before booking. Pick the ones that apply.">
        <div className="flex flex-wrap gap-2">
          {RULE_PRESETS.map((rule) => {
            const active = isActive(rule);
            return (
              <button
                key={rule}
                type="button"
                onClick={() => togglePreset(rule)}
                title={RULE_TOOLTIPS[rule]}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                  active
                    ? "border-fg bg-fg text-bg-card"
                    : "border-border text-fg hover:border-fg-subtle",
                )}
              >
                {rule}
                {RULE_TOOLTIPS[rule] && (
                  <span
                    className="ml-1 text-fg-subtle"
                    aria-hidden="true"
                  >
                    ⓘ
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Additional rules" optional hint="Any custom rules not covered above.">
        <Textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onBlur={(e) => commitCustom(e.target.value)}
          rows={3}
          placeholder="e.g. Please sort recyclables separately"
        />
      </Field>

      <Row cols={2}>
        <Field label="WiFi network name" optional>
          <Input
            name="wifi-network-label"
            value={draft.wifiName}
            onChange={(e) => patch({ wifiName: e.target.value })}
            placeholder="MyWiFi"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </Field>
        {/* BUG-313: this is a WiFi key the host SHARES with tenants, not a
            login credential. A type="password" field makes Chrome/1Password/
            LastPass offer to "save password", which confuses hosts. Render it
            as a plain text field (visible is actually helpful here) and opt out
            of every password-manager heuristic. */}
        <Field label="WiFi password" optional hint="Shown to tenants after booking — not a login.">
          <Input
            type="text"
            name="wifi-key-share"
            value={draft.wifiPassword}
            onChange={(e) => patch({ wifiPassword: e.target.value })}
            placeholder="e.g. sunset1234"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </Field>
      </Row>
    </div>
  );
}

export const rulesSection: SectionDef = {
  id: "rules",
  label: "House rules & WiFi",
  group: "stay",
  required: true,
  estTime: "1 min",
  isComplete: (d) => d.houseRules.trim().length > 0,
  summary: (d) => {
    const lines = d.houseRules.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return "—";
    const first = lines[0];
    return lines.length > 1 ? `${first} +${lines.length - 1} more` : first;
  },
  Form: RulesDialog,
};
