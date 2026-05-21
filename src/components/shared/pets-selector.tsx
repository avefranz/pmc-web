import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PetCounts {
  cats: number;
  dogs: number;
  other: number;
}

export const EMPTY_PETS: PetCounts = { cats: 0, dogs: 0, other: 0 };

export function totalPets(p: PetCounts) {
  return p.cats + p.dogs + p.other;
}

export function petSummary(p: PetCounts): string {
  const parts: string[] = [];
  if (p.cats  > 0) parts.push(`${p.cats} cat${p.cats  > 1 ? "s" : ""}`);
  if (p.dogs  > 0) parts.push(`${p.dogs} dog${p.dogs  > 1 ? "s" : ""}`);
  if (p.other > 0) parts.push(`${p.other} other`);
  return parts.join(", ");
}

const PET_TYPES = [
  { key: "cats"  as const, emoji: "🐱", label: "Cat"   },
  { key: "dogs"  as const, emoji: "🐶", label: "Dog"   },
  { key: "other" as const, emoji: "🐾", label: "Other" },
];

function Counter({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className={cn(
          "w-7 h-7 rounded-full border flex items-center justify-center text-base transition-colors leading-none",
          value === 0
            ? "border-border text-fg-muted/30 cursor-not-allowed"
            : "border-border hover:border-fg text-fg-muted hover:text-fg",
        )}
      >
        −
      </button>
      <span className={cn("w-4 text-center text-sm font-semibold tabular-nums", value === 0 ? "text-fg-muted/40" : "text-fg")}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(5, value + 1))}
        disabled={value >= 5}
        className="w-7 h-7 rounded-full border border-border hover:border-fg flex items-center justify-center text-base text-fg-muted hover:text-fg transition-colors leading-none disabled:opacity-30 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

export function PetsSelector({
  value,
  onChange,
}: {
  value: PetCounts;
  onChange: (v: PetCounts) => void;
}) {
  const total = totalPets(value);
  const [open, setOpen] = useState(total > 0);

  function set(key: keyof PetCounts, v: number) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className={cn("rounded-xl border-2 transition-colors overflow-hidden", open || total > 0 ? "border-brand/40" : "border-border")}>
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-subtle/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none">🐾</span>
          <div>
            <p className="text-sm font-medium text-fg leading-tight">
              {total > 0 ? petSummary(value) : "Travelling with pets?"}
            </p>
            {total === 0 && (
              <p className="text-xs text-fg-muted mt-0.5">Tap to add</p>
            )}
          </div>
        </div>
        {open
          ? <ChevronUp size={15} className="text-fg-muted shrink-0" />
          : <ChevronDown size={15} className="text-fg-muted shrink-0" />}
      </button>

      {/* Expanded rows */}
      {open && (
        <div className="border-t border-border/60 divide-y divide-border/60">
          {PET_TYPES.map(({ key, emoji, label }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none w-5 text-center">{emoji}</span>
                <span className="text-sm text-fg">
                  {label}{value[key] > 1 ? "s" : ""}
                </span>
              </div>
              <Counter value={value[key]} onChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
