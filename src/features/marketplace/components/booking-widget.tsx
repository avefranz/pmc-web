import { useState, useMemo } from "react";
import { addMonths, format, parseISO, isBefore, isAfter, max, differenceInMonths } from "date-fns";
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

      {/* Thumb — z-0 so label buttons (z-10) receive clicks */}
      <input
        type="range"
        min={min}
        max={maxVal}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-x-0 top-0 h-6 w-full opacity-0 cursor-pointer"
      />

      {/* Tick labels — UX-55: clickable presets, not just decorative labels */}
      <div className="flex justify-between mt-2 px-0.5">
        {TICK_MONTHS.filter((t) => t >= min && t <= maxVal).map((tick) => {
          const tickPct = ((tick - min) / (maxVal - min)) * 100;
          return (
            <button
              key={tick}
              type="button"
              onClick={() => onChange(tick)}
              className={cn(
                "text-[11px] absolute -translate-x-1/2 transition-colors leading-none py-0.5 px-0.5 rounded z-10",
                value === tick
                  ? "text-brand font-semibold"
                  : "text-fg-muted hover:text-fg cursor-pointer",
              )}
              style={{ left: `${tickPct}%` }}
            >
              {tick}m
            </button>
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
    /** Deposit configured by the host (BUG-40/BE-16). Falls back to 1 month rent if absent. */
    depositAmount?: number | null;
    /** BUG-263/274: pet deposit shown alongside security deposit when the host has set one. */
    petDeposit?: number | null;
    petsAllowed?: boolean | null;
  };
  availability: ListingAvailabilityDto;
  onRequestBook: (moveIn: string, months: number) => void;
}) {
  const baseRate =
    listing.monthlyRate || listing.baseMonthlyRate || 0;
  // BUG-40: use host-configured deposit; fall back to 1 month rent only if not set
  const deposit = listing.depositAmount ?? baseRate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultMoveIn = max([today, parseISO(availability.availableFrom)]);
  // BUG-327: a host can publish a fixed window (Available-to). BE returns it as
  // `availableTo`; older payloads use the `availableUntil` alias. Either caps
  // how late a tenant can move in AND how long they can stay, so we resolve a
  // single window-end here and feed it into the move-in picker + duration cap.
  const windowEndStr = availability.availableUntil ?? availability.availableTo;
  const windowEnd = windowEndStr ? parseISO(windowEndStr) : null;
  // UX-305: avoid landing the move-in default inside an occupied range. The
  // previous behaviour parked the picker on `availableFrom`, which the BE
  // sometimes returns even when that day is already booked — the host saw a
  // confident "Due ฿77,000" up top with a buried conflict warning below.
  // We now scan occupiedRanges and bump the default forward (or use the
  // BE-supplied nextAvailableDate when present) so the widget opens on a
  // bookable day in 95% of cases.
  function firstBookableDate(start: Date, dur: number): Date {
    let candidate = start;
    for (let safety = 0; safety < 24; safety++) {
      const out = addMonths(candidate, dur);
      const { conflict, nextAvailable } = checkConflict(candidate, out, availability);
      if (!conflict) return candidate;
      if (!nextAvailable) return candidate;
      const bumped = parseISO(nextAvailable);
      // Guard against pathological data where nextAvailable doesn't actually
      // move us forward (otherwise we'd loop until the safety counter).
      if (!isAfter(bumped, candidate)) return candidate;
      candidate = bumped;
    }
    return candidate;
  }
  const initialDuration = Math.min(3, availability.maxMonths ?? 12);
  const seedFromBe = availability.nextAvailableDate
    ? max([parseISO(availability.nextAvailableDate), defaultMoveIn])
    : defaultMoveIn;
  // BUG-323: the first day actually free of existing bookings (steps over
  // occupiedRanges, UX-305). This is what the move-in window must anchor on.
  const rawSafeDefault = firstBookableDate(seedFromBe, initialDuration);
  // BUG-319/BUG-323: move-in must be within ~1 month of the earliest the tenant
  // could ACTUALLY move in. The old code anchored on `availableFrom`, ignoring
  // active bookings — so any listing with a current booking had its deadline
  // fall before the first free day, making it un-bookable in the widget while
  // the BE (which anchors on nextAvailable + 1 month) would have accepted it.
  // Anchoring on the first bookable date keeps a vacant listing's behaviour
  // identical (firstBookable == defaultMoveIn) and re-opens booked listings.
  // (⚠️ BUG-54/BUG-319 boundary still @PM to confirm; BE mirrors it on POST.)
  const moveInDeadline = addMonths(max([defaultMoveIn, rawSafeDefault]), 1);

  // The only genuine "no dates" case left is a FIXED window (availableTo) whose
  // first free day already falls past the host's window end. Open-ended listings
  // always have a bookable default now, so they never show the dead-end banner.
  const noBookableInWindow =
    windowEnd != null && isAfter(rawSafeDefault, windowEnd);
  const safeDefaultMoveIn = noBookableInWindow ? defaultMoveIn : rawSafeDefault;
  const defaultMoveInStr = format(safeDefaultMoveIn, "yyyy-MM-dd");

  const [moveInStr, setMoveInStr] = useState(defaultMoveInStr);
  const [duration, setDuration] = useState(initialDuration);

  const moveIn = parseISO(moveInStr);

  const minMonths = availability.minMonths ?? 1;
  // BUG-327: never offer a stay that runs past the fixed window. Cap the host
  // max (and the 12-month slider ceiling) by the months remaining until
  // windowEnd from the chosen move-in.
  const windowMaxMonths = windowEnd
    ? Math.max(0, differenceInMonths(windowEnd, moveIn))
    : 12;
  const maxMonths = Math.min(availability.maxMonths ?? 12, 12, windowMaxMonths);
  // Clamp the chosen duration into the bookable window so move-out, price and
  // the request payload can't exceed a fixed window even if state is stale.
  const effDuration = Math.min(Math.max(duration, minMonths), Math.max(minMonths, maxMonths));

  const moveOut = addMonths(moveIn, effDuration);

  const { conflict, nextAvailable } = useMemo(
    () => checkConflict(moveIn, moveOut, availability),
    [moveInStr, effDuration],
  );

  const maxAllowed = useMemo(
    () => Math.min(
      maxMonths,
      maxDurationWithoutConflict(moveIn, availability, availability.maxMonths ?? 12),
    ),
    [moveInStr, availability, maxMonths],
  );

  // Cap duration when move-in changes
  function handleMoveInChange(val: string) {
    setMoveInStr(val);
    const newMoveIn = parseISO(val);
    const newWindowMax = windowEnd
      ? Math.max(0, differenceInMonths(windowEnd, newMoveIn))
      : 12;
    const newMax = Math.min(
      availability.maxMonths ?? 12,
      12,
      newWindowMax,
      maxDurationWithoutConflict(newMoveIn, availability, availability.maxMonths ?? 12),
    );
    if (duration > newMax) setDuration(Math.max(1, newMax));
  }

  const monthRate = effectiveMonthlyRate(baseRate, effDuration, listing.discountTiers ?? []);
  const tier = getApplicableTier(effDuration, listing.discountTiers ?? []);
  const hasDiscount = !!tier;
  const moveOutFormatted = format(moveOut, "MMMM d, yyyy");

  const isAvailable = !conflict && !noBookableInWindow && maxAllowed >= minMonths;

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
            // BUG-323: don't offer days before the first bookable date (which
            // already accounts for availableFrom + existing bookings) …
            if (isBefore(d, rawSafeDefault)) return true;
            if (isAfter(d, moveInDeadline)) return true;
            if (windowEnd && isAfter(d, windowEnd)) return true;
            // … and grey out any day that falls inside an occupied range so the
            // picker only ever proposes genuinely free move-in dates.
            for (const range of availability.occupiedRanges) {
              const from = parseISO(range.from);
              const to = parseISO(range.to);
              if (!isBefore(d, from) && isBefore(d, to)) return true;
            }
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
            {effDuration} month{effDuration !== 1 ? "s" : ""}
          </span>
        </div>
        <DurationSlider
          value={effDuration}
          min={minMonths}
          max={maxMonths}
          onChange={(v) => {
            if (v <= maxAllowed) setDuration(v);
          }}
        />

      </div>

      {/* UX-305: conflict warning moved ABOVE the summary so the tenant
          can't miss it while reading the "Due on move-in" number. Buried
          alerts at the bottom of the widget gave a false sense of "this
          booking is fine, just scroll past for the small print". */}
      {/* BUG-323: the earliest opening is past the allowed move-in window
          (an existing booking fills the next month, or it runs beyond a fixed
          window). Offering "Use this date" would only park the picker on a
          disabled day, so we show a dead-end-free message instead. */}
      {noBookableInWindow ? (
        <div className="flex items-start gap-2.5 bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-fg">No move-in dates available right now</p>
            <p className="text-xs text-fg-muted mt-0.5">
              The earliest opening is{" "}
              <strong>{format(rawSafeDefault, "MMMM d, yyyy")}</strong>, which is
              outside this listing's booking window. Message the host to ask
              about later dates.
            </p>
          </div>
        </div>
      ) : conflict && nextAvailable && (
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

      {/* Summary — monthly framing, no scary total. When dates conflict we
          collapse the price total down to a placeholder so the widget stops
          quoting a confident "Due ฿X" for a booking the tenant can't make. */}
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
          <span className="text-fg font-semibold">{formatThb(deposit)}</span>
        </div>
        {/* BUG-263/274: pet deposit line — visible only when the listing has
            one configured. Same refund mechanics as the security deposit, so
            the tenant sees it as a separate refundable line rather than as a
            mystery surcharge once they're past Request-to-book. */}
        {(listing.petDeposit ?? 0) > 0 && listing.petsAllowed !== false && (
          <div className="flex justify-between border-t border-border pt-2.5">
            <div>
              <span className="text-fg-muted">Pet deposit · if travelling with pets</span>
              <div className="text-[11px] text-fg-muted mt-0.5">refunded on check-out if no damage</div>
            </div>
            <span className="text-fg font-semibold">{formatThb(listing.petDeposit!)}</span>
          </div>
        )}
        {/* UX-327: no scary "Due on move-in ฿71,000" grand total. A big number
            at the request stage frightens tenants when nothing is owed yet.
            We keep the individual monthly-rate (headline) and refundable-
            deposit lines, but drop the combined total in favour of a neutral
            reassurance. When dates conflict we say so instead. */}
        {conflict ? (
          <div className="border-t border-border pt-2.5">
            <p className="text-fg-muted font-medium">
              Move-in unavailable — choose another date
            </p>
            <p className="text-[11px] text-fg-muted mt-0.5">
              These dates overlap an existing booking. Pick a later move-in
              to continue.
            </p>
          </div>
        ) : (
          <div className="border-t border-border pt-2.5">
            <p className="text-[11px] text-fg-muted">
              Nothing to pay now. After the host approves, you'll settle the
              first month{(listing.petDeposit ?? 0) > 0 && listing.petsAllowed !== false ? " + deposits" : " + deposit"} to confirm your move-in.
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <Button
        className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white rounded-xl h-12 text-base font-semibold shadow-sm"
        disabled={!isAvailable || conflict}
        onClick={() => onRequestBook(moveInStr, effDuration)}
      >
        Request to Book
      </Button>

      <p className="text-xs text-center text-fg-muted">You won't be charged yet</p>
    </div>
  );
}
