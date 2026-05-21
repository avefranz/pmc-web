import { useState, useMemo } from "react";
import { addMonths, addDays, format, parseISO, isBefore, isAfter, max } from "date-fns";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { formatThb } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ListingAvailabilityDto, DiscountTier } from "@/lib/types/marketplace";

// ─── Discount helpers ─────────────────────────────────────────────────────────

function getApplicableTier(months: number, tiers: DiscountTier[]): DiscountTier | null {
  const sorted = [...tiers].sort((a, b) => b.minMonths - a.minMonths);
  return sorted.find((t) => months >= t.minMonths) ?? null;
}

function effectiveMonthlyRate(base: number, months: number, tiers: DiscountTier[]): number {
  const tier = getApplicableTier(months, tiers);
  if (!tier) return base;
  return Math.round(base * (1 - tier.discountPercent / 100));
}

// ─── Duration slider ──────────────────────────────────────────────────────────

const TICK_MONTHS = [1, 3, 6, 9, 12];

function DurationSlider({
  value,
  min,
  max: maxVal,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (maxVal - min)) * 100;

  return (
    <div className="relative pt-1 pb-5">
      {/* Track */}
      <div className="relative h-1.5 rounded-full bg-border">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
        {/* Tick marks */}
        {TICK_MONTHS.filter((t) => t >= min && t <= maxVal).map((tick) => {
          const tickPct = ((tick - min) / (maxVal - min)) * 100;
          return (
            <span
              key={tick}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full -translate-x-1/2 transition-colors",
                value >= tick ? "bg-brand" : "bg-border",
              )}
              style={{ left: `${tickPct}%` }}
            />
          );
        })}
      </div>

      {/* Thumb */}
      <input
        type="range"
        min={min}
        max={maxVal}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-6 top-0"
      />

      {/* Tick labels */}
      <div className="flex justify-between mt-2 px-0.5">
        {TICK_MONTHS.filter((t) => t >= min && t <= maxVal).map((tick) => {
          const tickPct = ((tick - min) / (maxVal - min)) * 100;
          return (
            <span
              key={tick}
              className={cn(
                "text-[11px] absolute -translate-x-1/2 transition-colors",
                value === tick ? "text-brand font-semibold" : "text-fg-muted",
              )}
              style={{ left: `${tickPct}%` }}
            >
              {tick}m
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Conflict check ───────────────────────────────────────────────────────────

function checkConflict(
  moveIn: Date,
  moveOut: Date,
  availability: ListingAvailabilityDto,
): { conflict: boolean; nextAvailable: string | null } {
  for (const range of availability.occupiedRanges) {
    const from = parseISO(range.from);
    const to = parseISO(range.to);
    if (isBefore(moveIn, to) && isAfter(moveOut, from)) {
      // Next available is after this occupied range's end
      return { conflict: true, nextAvailable: range.to };
    }
  }
  return { conflict: false, nextAvailable: null };
}

function maxDurationWithoutConflict(
  moveIn: Date,
  availability: ListingAvailabilityDto,
  maxMonths: number,
): number {
  for (let months = maxMonths; months >= 1; months--) {
    const moveOut = addMonths(moveIn, months);
    const { conflict } = checkConflict(moveIn, moveOut, availability);
    if (!conflict) return months;
  }
  return 0;
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function BookingWidget({
  listing,
  availability,
  onRequestBook,
}: {
  listing: {
    id: string;
    monthlyRate: number;
    discountTiers: DiscountTier[];
    // compat fields
    baseMonthlyRate?: number | null;
  };
  availability: ListingAvailabilityDto;
  onRequestBook: (moveIn: string, months: number) => void;
}) {
  const baseRate =
    listing.monthlyRate || listing.baseMonthlyRate || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultMoveIn = max([today, parseISO(availability.availableFrom)]);
  const defaultMoveInStr = format(defaultMoveIn, "yyyy-MM-dd");
  // Move-in window: if availableFrom is in the future → 30 days from it;
  // if availableFrom is already past → 30 days from today.
  const moveInDeadline = addDays(defaultMoveIn, 30);

  const [moveInStr, setMoveInStr] = useState(defaultMoveInStr);
  const [duration, setDuration] = useState(
    Math.min(3, availability.maxMonths ?? 12),
  );

  const moveIn = parseISO(moveInStr);
  const moveOut = addMonths(moveIn, duration);

  const { conflict, nextAvailable } = useMemo(
    () => checkConflict(moveIn, moveOut, availability),
    [moveInStr, duration],
  );

  const maxAllowed = useMemo(
    () => maxDurationWithoutConflict(moveIn, availability, availability.maxMonths ?? 12),
    [moveInStr, availability],
  );

  // Cap duration when move-in changes
  function handleMoveInChange(val: string) {
    setMoveInStr(val);
    const newMoveIn = parseISO(val);
    const newMax = maxDurationWithoutConflict(
      newMoveIn,
      availability,
      availability.maxMonths ?? 12,
    );
    if (duration > newMax) setDuration(Math.max(1, newMax));
  }

  const monthRate = effectiveMonthlyRate(baseRate, duration, listing.discountTiers ?? []);
  const _total = monthRate * duration; void _total;
  const tier = getApplicableTier(duration, listing.discountTiers ?? []);
  const hasDiscount = !!tier;
  const moveOutFormatted = format(moveOut, "MMMM d, yyyy");

  const minMonths = availability.minMonths ?? 1;
  const maxMonths = Math.min(availability.maxMonths ?? 12, 12);
  const isAvailable = !conflict && maxAllowed >= minMonths;

  return (
    <div className="bg-bg-card rounded-2xl border border-border shadow-pop p-6 space-y-5">

      {/* Price headline */}
      <div>
        <div className="flex items-baseline gap-2">
          {hasDiscount && (
            <span className="text-sm text-fg-muted line-through">{formatThb(baseRate)}</span>
          )}
          <span className="text-2xl font-bold text-fg">{formatThb(monthRate)}</span>
          <span className="text-sm text-fg-muted">/ month</span>
        </div>

        {/* Discount tiers — always visible when configured */}
        {listing.discountTiers?.length > 0 && (
          <div className="mt-3 rounded-xl border border-border overflow-hidden">
            {[...listing.discountTiers]
              .sort((a, b) => a.minMonths - b.minMonths)
              .map((t) => {
                const isActive = duration >= t.minMonths;
                const isCurrent = tier?.minMonths === t.minMonths;
                const discountedRate = Math.round(baseRate * (1 - t.discountPercent / 100));
                return (
                  <button
                    key={t.minMonths}
                    onClick={() => setDuration(Math.min(t.minMonths, maxAllowed))}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm border-b border-border last:border-b-0 transition-colors text-left",
                      isCurrent
                        ? "bg-success/8 text-fg"
                        : "hover:bg-bg-subtle text-fg-muted",
                    )}
                  >
                    <span className={cn("font-medium", isCurrent && "text-success")}>
                      {t.minMonths}+ months
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded-full",
                        isCurrent
                          ? "bg-success/15 text-success"
                          : isActive
                            ? "bg-success/10 text-success"
                            : "bg-bg-subtle text-fg-muted",
                      )}>
                        −{t.discountPercent}%
                      </span>
                      <span className={cn("font-semibold tabular-nums", isCurrent ? "text-fg" : "text-fg-muted")}>
                        {formatThb(discountedRate)}/month
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* Move-in date */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-fg uppercase tracking-wide">Move-in date</label>
        <DatePicker
          value={moveInStr}
          onChange={handleMoveInChange}
          isDisabled={(d) => {
            if (d < today) return true;
            if (isBefore(d, parseISO(availability.availableFrom))) return true;
            if (isAfter(d, moveInDeadline)) return true;
            if (availability.availableUntil && isAfter(d, parseISO(availability.availableUntil))) return true;
            return false;
          }}
          className="w-full"
        />
      </div>

      {/* Duration slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-fg uppercase tracking-wide">Length of stay</label>
          <span className="text-sm font-semibold text-fg">
            {duration} month{duration !== 1 ? "s" : ""}
          </span>
        </div>
        <DurationSlider
          value={duration}
          min={minMonths}
          max={maxMonths}
          onChange={(v) => {
            if (v <= maxAllowed) setDuration(v);
          }}
        />

      </div>

      {/* Summary — monthly framing, no scary total */}
      <div className="bg-bg-subtle rounded-xl px-4 py-3 space-y-2.5 text-sm">
        {/* Move-out */}
        <div className="flex justify-between">
          <span className="text-fg-muted">Move-out</span>
          <span className="text-fg font-semibold">{moveOutFormatted}</span>
        </div>
        {/* Deposit */}
        <div className="flex justify-between border-t border-border pt-2.5">
          <div>
            <span className="text-fg-muted">Refundable deposit</span>
            <div className="text-[11px] text-fg-muted mt-0.5">held securely by Siamo</div>
          </div>
          <span className="text-fg font-semibold">{formatThb(monthRate)}</span>
        </div>
        {/* Due on move-in */}
        <div className="flex justify-between border-t border-border pt-2.5">
          <div>
            <span className="text-fg-muted">Due on move-in</span>
            <div className="text-[11px] text-fg-muted mt-0.5">
              1st month{hasDiscount ? ` (−${tier!.discountPercent}%)` : ""} + deposit
            </div>
          </div>
          <span className="text-fg font-semibold">{formatThb(monthRate * 2)}</span>
        </div>
      </div>

      {/* Conflict warning */}
      {conflict && nextAvailable && (
        <div className="flex items-start gap-2.5 bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-fg">Dates overlap with existing booking</p>
            <p className="text-xs text-fg-muted mt-0.5">
              Next available: <strong>{format(parseISO(nextAvailable), "MMMM d, yyyy")}</strong>
            </p>
            <button
              className="text-xs text-brand underline underline-offset-2 mt-1"
              onClick={() => handleMoveInChange(nextAvailable)}
            >
              Use this date
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <Button
        className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-12 text-base font-semibold shadow-sm"
        disabled={!isAvailable || conflict}
        onClick={() => onRequestBook(moveInStr, duration)}
      >
        Request to Book
      </Button>

      <p className="text-xs text-center text-fg-muted">You won't be charged yet</p>
    </div>
  );
}
