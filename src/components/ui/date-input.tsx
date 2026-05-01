import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Normalise any ISO / partial date string → "YYYY-MM-DD" for <input type="date"> */
function toInputDate(value: string | undefined | null): string {
  if (!value) return "";
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // ISO with time component, e.g. "2024-01-15T00:00:00Z"
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, placeholder, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <input
          type="date"
          ref={ref}
          value={toInputDate(value)}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            // match the standard Input styles exactly
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // force calendar icon colour to match theme
            "[color-scheme:light] dark:[color-scheme:dark]",
            // placeholder-like state when empty
            !toInputDate(value) && "text-muted-foreground",
          )}
          {...props}
        />
        {placeholder && !toInputDate(value) && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
            {placeholder}
          </span>
        )}
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
