import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field, Row } from "../ui";

const RULE_PRESETS = [
  "No smoking indoors",
  "Quiet hours after 22:00",
  "Shoes off at the entrance",
  "No subletting allowed",
  "No parties or events",
  "No extra guests without prior notice",
  "Keep common areas clean",
  "No pets",
  "TM-30 registration required",
  "No cooking with strong odours",
];

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
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                  active
                    ? "border-fg bg-fg text-bg-card"
                    : "border-border text-fg hover:border-fg-subtle",
                )}
              >
                {rule}
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
            value={draft.wifiName}
            onChange={(e) => patch({ wifiName: e.target.value })}
            placeholder="MyWiFi"
          />
        </Field>
        <Field label="WiFi password" optional>
          <Input
            type="password"
            value={draft.wifiPassword}
            onChange={(e) => patch({ wifiPassword: e.target.value })}
            placeholder="Enter password"
            autoComplete="new-password"
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
