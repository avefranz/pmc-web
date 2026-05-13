import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const PASSWORD_RULES = [
  { key: "length",    label: "At least 8 characters",      test: (p: string) => p.length >= 8 },
  { key: "uppercase", label: "One uppercase letter",        test: (p: string) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "One lowercase letter",        test: (p: string) => /[a-z]/.test(p) },
  { key: "number",    label: "One number",                  test: (p: string) => /[0-9]/.test(p) },
];

export function passwordValid(password: string): boolean {
  return PASSWORD_RULES.every(({ test }) => test(password));
}

export function PasswordHints({ password, showErrors }: { password: string; showErrors?: boolean }) {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map(({ key, label, test }) => {
        const ok = test(password);
        const failed = !ok && showErrors;
        return (
          <li key={key} className={cn(
            "flex items-center gap-1.5 text-[11px]",
            ok ? "text-success" : failed ? "text-destructive" : "text-fg-muted"
          )}>
            {ok
              ? <Check size={11} className="shrink-0" />
              : <X size={11} className={cn("shrink-0", failed ? "" : "opacity-40")} />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
