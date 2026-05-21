import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Normalise any ISO / partial date string → "YYYY-MM-DD" */
function toIso(value: string | undefined | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

/** "YYYY-MM-DD" → "DD/MM/YYYY" for display */
function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "DD/MM/YYYY" → "YYYY-MM-DD" (returns "" if incomplete) */
function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  // basic sanity
  if (+m < 1 || +m > 12 || +d < 1 || +d > 31) return "";
  return `${y}-${m}-${d}`;
}

/** Insert slashes as the user types to produce DD/MM/YYYY */
function maskInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let result = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += "/";
    result += digits[i];
  }
  return result;
}

interface DateInputProps {
  value?: string | null;        // ISO "YYYY-MM-DD"
  onChange?: (value: string) => void;  // emits ISO or ""
  className?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, className, disabled }, ref) => {
    const iso = toIso(value);
    const [display, setDisplay] = React.useState(() => isoToDisplay(iso));
    const [focused, setFocused] = React.useState(false);

    // Sync when value changes externally
    React.useEffect(() => {
      if (!focused) setDisplay(isoToDisplay(toIso(value)));
    }, [value, focused]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const masked = maskInput(e.target.value);
      setDisplay(masked);
      const newIso = displayToIso(masked);
      onChange?.(newIso);
    }

    function handleBlur() {
      setFocused(false);
      // Re-sync display from canonical value on blur
      const newIso = displayToIso(display);
      if (newIso) {
        setDisplay(isoToDisplay(newIso));
      }
    }

    return (
      <div className={cn("relative", className)}>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          placeholder="DD/MM/YYYY"
          disabled={disabled}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          maxLength={10}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
