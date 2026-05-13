import { useState, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepperProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
  /** Allow clicking the number to type it directly — useful for large ranges (e.g. floor number) */
  allowDirectInput?: boolean;
}

export function Stepper({ label, value, onChange, min = 0, max = 99, className, allowDirectInput }: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setRaw(String(value));
    setEditing(true);
    // Focus on next tick after render
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
    setEditing(false);
  }

  return (
    <div className={cn("flex items-center justify-between gap-3 bg-bg-subtle rounded-xl px-4 py-3", className)}>
      {label && <span className="text-sm font-medium text-fg">{label}</span>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            value <= min
              ? "bg-bg-card text-fg-muted opacity-40 cursor-not-allowed"
              : "bg-bg-card text-fg hover:bg-border shadow-sm",
          )}
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>

        {allowDirectInput && editing ? (
          <input
            ref={inputRef}
            type="number"
            value={raw}
            min={min}
            max={max}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-12 text-center text-sm font-semibold text-fg tabular-nums bg-bg-card border border-brand rounded-lg py-0.5 outline-none focus:ring-2 focus:ring-brand/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <span
            className={cn(
              "min-w-[1.25rem] text-center text-sm font-semibold text-fg tabular-nums",
              allowDirectInput && "cursor-text underline decoration-dashed decoration-fg-subtle underline-offset-2 hover:text-brand transition-colors",
            )}
            title={allowDirectInput ? "Click to type" : undefined}
            onClick={allowDirectInput ? startEdit : undefined}
          >
            {value}
          </span>
        )}

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            value >= max
              ? "bg-bg-card text-fg-muted opacity-40 cursor-not-allowed"
              : "bg-bg-card text-fg hover:bg-border shadow-sm",
          )}
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
