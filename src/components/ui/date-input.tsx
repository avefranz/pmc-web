import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Normalise any ISO / partial date string → "YYYY-MM-DD" */
function toIso(value: string | undefined | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

interface DateInputProps {
  value?: string | null;        // ISO "YYYY-MM-DD"
  onChange?: (value: string) => void;  // emits ISO or ""
  className?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

// BUG-270: native <input type="date"> — calendar picker on every platform,
// impossible to enter an invalid date string, and the value is already ISO.
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, className, disabled, minYear, maxYear }, ref) => {
    const iso = toIso(value);
    const min = minYear ? `${minYear}-01-01` : undefined;
    const max = maxYear ? `${maxYear}-12-31` : undefined;
    return (
      <input
        ref={ref}
        type="date"
        value={iso}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
