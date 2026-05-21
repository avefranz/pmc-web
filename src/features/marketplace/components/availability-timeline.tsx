import { addMonths, format, parseISO, startOfMonth, isAfter, isBefore, isEqual } from "date-fns";
import { cn } from "@/lib/utils/cn";
import type { ListingAvailabilityDto } from "@/lib/types/marketplace";

type MonthStatus = "unavailable" | "available" | "occupied";

function getMonthStatus(
  month: Date,
  availability: ListingAvailabilityDto,
): MonthStatus {
  const monthStart = startOfMonth(month);
  const nextMonth = addMonths(monthStart, 1);

  const availFrom = parseISO(availability.availableFrom);
  const availUntil = availability.availableUntil
    ? parseISO(availability.availableUntil)
    : null;

  // Before listing start date
  if (isBefore(monthStart, availFrom) && !isEqual(monthStart, startOfMonth(availFrom))) {
    return "unavailable";
  }
  // After listing end date
  if (availUntil && !isBefore(monthStart, availUntil)) {
    return "unavailable";
  }

  // Check occupied ranges — any overlap with this month
  for (const range of availability.occupiedRanges) {
    const rangeFrom = parseISO(range.from);
    const rangeTo = parseISO(range.to);
    // Overlap: monthStart < rangeTo AND nextMonth > rangeFrom
    if (isBefore(monthStart, rangeTo) && isAfter(nextMonth, rangeFrom)) {
      return "occupied";
    }
  }

  return "available";
}

export function AvailabilityTimeline({
  availability,
  selectedMoveIn,
  durationMonths,
}: {
  availability: ListingAvailabilityDto;
  selectedMoveIn?: string;
  durationMonths?: number;
}) {
  const today = startOfMonth(new Date());

  // Show 13 months starting from earlier of today or availableFrom
  const start = startOfMonth(
    isBefore(parseISO(availability.availableFrom), today)
      ? today
      : parseISO(availability.availableFrom),
  );
  const months = Array.from({ length: 13 }, (_, i) => addMonths(start, i));

  const selStart = selectedMoveIn ? startOfMonth(parseISO(selectedMoveIn)) : null;
  const selEnd = selStart && durationMonths ? addMonths(selStart, durationMonths) : null;

  function isSelected(month: Date): boolean {
    if (!selStart || !selEnd) return false;
    return !isBefore(month, selStart) && isBefore(month, selEnd);
  }

  return (
    <div>
      <div className="flex gap-px overflow-x-auto pb-1 scrollbar-hide">
        {months.map((month, i) => {
          const status = getMonthStatus(month, availability);
          const selected = isSelected(month);
          const isFirst = i === 0;
          const isLast = i === months.length - 1;
          const label = format(month, "MMM");
          const year = format(month, "yyyy");
          const showYear = i === 0 || format(months[i - 1], "yyyy") !== year;

          return (
            <div
              key={month.toISOString()}
              className="flex flex-col items-center min-w-[52px] shrink-0"
            >
              {/* Year label */}
              <span className="text-[10px] text-fg-muted mb-0.5 h-3 leading-none">
                {showYear ? year : ""}
              </span>

              {/* Status bar */}
              <div
                className={cn(
                  "w-full h-7 flex items-center justify-center relative",
                  isFirst && "rounded-l-full",
                  isLast && "rounded-r-full",
                  selected
                    ? "bg-brand/20"
                    : status === "available"
                    ? "bg-success/15"
                    : status === "occupied"
                    ? "bg-danger/15"
                    : "bg-bg-subtle",
                )}
              >
                {/* Dot */}
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    selected
                      ? "bg-brand"
                      : status === "available"
                      ? "bg-success"
                      : status === "occupied"
                      ? "bg-danger"
                      : "bg-border",
                  )}
                />
              </div>

              {/* Month label */}
              <span
                className={cn(
                  "text-[11px] mt-1 font-medium",
                  status === "unavailable" ? "text-fg-subtle" : "text-fg-muted",
                  selected && "text-brand font-semibold",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-border inline-block" />
          Not listed
        </span>
      </div>
    </div>
  );
}
