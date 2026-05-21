// Shared primitives for section dialogs. Keep these dumb — no business logic.
import { type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Field({
  label,
  hint,
  required,
  optional,
  children,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="text-sm font-semibold text-fg mb-2 flex items-center">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
        {optional && <span className="text-fg-muted font-normal text-xs ml-2">(optional)</span>}
      </label>
      {children}
      {hint && <div className="text-xs text-fg-muted mt-1.5">{hint}</div>}
    </div>
  );
}

export function Row({ children, cols = 2, className }: { children: ReactNode; cols?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", className)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

export interface ChipOption {
  value: string | number;
  label: string;
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: ChipOption[] | T[];
  value: T | T[] | undefined;
  onChange: (next: T | T[]) => void;
  multi?: boolean;
}) {
  const opts: ChipOption[] = options.map((o) =>
    typeof o === "object" ? (o as ChipOption) : { value: o, label: String(o) },
  );
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((opt) => {
        const active = multi
          ? Array.isArray(value) && (value as (string | number)[]).includes(opt.value)
          : value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (multi) {
                const arr = (Array.isArray(value) ? value : []) as (string | number)[];
                onChange((active ? arr.filter((x) => x !== opt.value) : [...arr, opt.value]) as unknown as T[]);
              } else {
                onChange(opt.value as T);
              }
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
              active
                ? "border-fg bg-fg text-bg-card"
                : "border-border text-fg hover:border-fg-subtle",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center border border-border rounded-lg h-10 bg-bg">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-full flex items-center justify-center text-fg hover:bg-bg-subtle rounded-l-lg"
        aria-label="Decrease"
      >
        <Minus size={14} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          const n = raw === "" ? 0 : Number(raw);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="w-14 h-full text-center bg-transparent text-fg text-sm tabular-nums focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-10 h-full flex items-center justify-center text-fg hover:bg-bg-subtle rounded-r-lg"
        aria-label="Increase"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// Card-style picker for option lists with icon + sub-label
export function PickerCard({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left p-3 rounded-xl border-2 transition-all duration-150 flex items-center gap-3",
        active
          ? "border-fg bg-fg text-bg-card"
          : "border-border bg-bg hover:border-fg-subtle text-fg",
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0",
          active ? "bg-white/15" : "bg-bg-subtle",
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        {sub && (
          <div className={cn("text-xs mt-0.5", active ? "text-white/70" : "text-fg-muted")}>{sub}</div>
        )}
      </div>
    </button>
  );
}
