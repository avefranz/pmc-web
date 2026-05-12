import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const RULES = [
  { key: "length",    label: "At least 8 characters",      test: (p: string) => p.length >= 8 },
  { key: "uppercase", label: "One uppercase letter",        test: (p: string) => /[A-Z]/.test(p) },
  { key: "number",    label: "One number",                  test: (p: string) => /[0-9]/.test(p) },
];

export function PasswordHints({ password }: { password: string }) {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {RULES.map(({ key, label, test }) => {
        const ok = test(password);
        return (
          <li key={key} className={cn("flex items-center gap-1.5 text-[11px]", ok ? "text-success" : "text-fg-muted")}>
            {ok
              ? <Check size={11} className="shrink-0" />
              : <X size={11} className="shrink-0 opacity-40" />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
