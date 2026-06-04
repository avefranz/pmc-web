import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  format,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  getYear,
  getMonth,
  setMonth,
  setYear,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type View = "day" | "month" | "year";

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const normalized = value.length === 10 ? value + "T00:00:00" : value;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/** Start year for the year grid — round down to nearest 12 */
function yearGridStart(year: number) {
  return Math.floor(year / 12) * 12;
}

interface DatePickerProps {
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  isDisabled?: (date: Date) => boolean;
  // UX-335: which view to open on. Day-pickers (move-in etc.) keep "day";
  // for date-of-birth / passport-expiry pass "year" so the year grid is the
  // first thing shown — picking a 1990s birth year via month-by-month arrows
  // was undiscoverable. The caption drill (year → month → day) still works.
  startView?: View;
  // UX-342: when there's no value yet, anchor the initial year/month/day view
  // here instead of "today". DOB pickers pass ~1995 so the year grid opens on
  // plausible birth years (1990s) rather than the current decade, sparing the
  // user ~3 "previous decade" clicks. Ignored once a value is selected.
  yearAnchor?: Date;
  // UX-342 (reopened): the popover content portals to <body> at z-50, which sits
  // BELOW custom modals rendered at z-[100] (e.g. the booking-request modal) — so
  // the calendar opened behind the backdrop and day-clicks landed on the overlay,
  // i.e. "the date never records". Inside such a modal, pass a higher z (e.g.
  // "z-[200]") so the calendar floats above it. Default keeps z-50 for page use.
  contentClassName?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  isDisabled,
  startView = "day",
  yearAnchor,
  contentClassName,
}: DatePickerProps) {
  const selected = parseDate(value);
  const fallbackAnchor = yearAnchor ?? new Date();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<View>(startView);
  const [viewDate, setViewDate] = React.useState<Date>(selected ?? fallbackAnchor);
  const [yearBase, setYearBase] = React.useState(() => yearGridStart(getYear(selected ?? fallbackAnchor)));

  function handleOpen(next: boolean) {
    if (!next) { setOpen(false); return; }
    // Anchor to the selected date, the caller's yearAnchor, or today, then open
    // on the configured view (UX-335: "year" for DOB/expiry; UX-342: yearAnchor
    // so DOB opens on the 1990s instead of the current decade).
    const anchor = selected ?? fallbackAnchor;
    setViewDate(anchor);
    setYearBase(yearGridStart(getYear(anchor)));
    setView(startView);
    setOpen(true);
  }

  function handleSelectDay(day: Date) {
    onChange?.(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }

  function handleSelectMonth(monthIndex: number) {
    setViewDate(setMonth(viewDate, monthIndex));
    setView("day");
  }

  function handleSelectYear(year: number) {
    setViewDate(setYear(viewDate, year));
    setYearBase(yearGridStart(year));
    setView("month");
  }

  const monthStart = startOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(viewDate) });
  const firstDow = getDay(monthStart);
  const currentYear = getYear(viewDate);
  const currentMonth = getMonth(viewDate);
  const yearRange = Array.from({ length: 12 }, (_, i) => yearBase + i);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={disabled ? undefined : handleOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 text-sm",
            "ring-offset-background transition-colors text-left",
            "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">
            {selected ? format(selected, "d MMM yyyy") : placeholder}
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          side="bottom"
          sideOffset={6}
          // UX-306: explicit avoidCollisions + collisionPadding ensures the
          // popover always lands in-viewport even when the trigger is at the
          // bottom of a sticky sidebar (booking widget on listing detail).
          // Without it, on short viewports the calendar opened below the
          // fold and the host thought clicking "did nothing".
          avoidCollisions
          collisionPadding={12}
          className={cn(
            "z-50 w-[280px] rounded-xl border border-border/60 bg-popover p-4 shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            // UX-342: callers inside custom modals override z so the calendar
            // floats above the modal backdrop instead of behind it.
            contentClassName,
          )}
        >
          {/* ── DAY VIEW ── */}
          {view === "day" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setViewDate(subMonths(viewDate, 1))}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setView("month")}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold tracking-tight hover:bg-accent transition-colors"
                >
                  {format(viewDate, "MMMM yyyy")}
                  <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewDate(addMonths(viewDate, 1))}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground/60 font-medium py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((day) => {
                  const isSel = selected ? isSameDay(day, selected) : false;
                  const isTod = isToday(day);
                  const isDis = isDisabled?.(day) ?? false;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={isDis}
                      onClick={() => !isDis && handleSelectDay(day)}
                      className={cn(
                        "h-8 w-full rounded-md text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        isDis
                          ? "opacity-30 cursor-not-allowed line-through"
                          : isSel
                          ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                          : isTod
                          ? "border border-primary/40 text-primary font-semibold hover:bg-primary/10"
                          : "hover:bg-accent text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    onChange?.(format(today, "yyyy-MM-dd"));
                    setOpen(false);
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 rounded-md hover:bg-accent"
                >
                  Today
                </button>
              </div>
            </>
          )}

          {/* ── MONTH VIEW ── */}
          {view === "month" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => { setViewDate(subYears(viewDate, 1)); }}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => { setYearBase(yearGridStart(currentYear)); setView("year"); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold hover:bg-accent transition-colors"
                >
                  {currentYear}
                  <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => { setViewDate(addYears(viewDate, 1)); }}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectMonth(i)}
                    className={cn(
                      "h-9 rounded-lg text-sm font-medium transition-colors",
                      i === currentMonth
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-accent text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── YEAR VIEW ── */}
          {view === "year" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setYearBase((b) => b - 12)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="text-sm font-semibold text-muted-foreground">
                  {yearRange[0]} – {yearRange[11]}
                </span>

                <button
                  type="button"
                  onClick={() => setYearBase((b) => b + 12)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {yearRange.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleSelectYear(y)}
                    className={cn(
                      "h-9 rounded-lg text-sm font-medium transition-colors",
                      y === currentYear
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-accent text-foreground",
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
