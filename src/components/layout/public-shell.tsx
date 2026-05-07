import { useState, useRef, useEffect, useMemo } from "react";
import { Outlet, Link, useSearchParams, useNavigate } from "react-router-dom";
import { Search, Menu, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { SiamoLogo } from "./siamo-logo";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMe } from "@/lib/hooks/use-auth";
import { useMarketplaceCities } from "@/lib/hooks/use-marketplace";
import { useQueryClient } from "@tanstack/react-query";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

// ─── Mini calendar ───────────────────────────────────────────────────────────

const DAYS   = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MiniCalendar({
  value,
  onChange,
}: {
  value: string;       // ISO "YYYY-MM-DD" or ""
  onChange: (iso: string) => void;
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const initDate = value ? new Date(value + "T00:00:00") : today;
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()); // 0-based

  // Grid: always start on Monday
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    // Mon=0 … Sun=6
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: (number | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (d < today) return;
    onChange(toISO(d));
  }

  const selectedISO = value;

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-7 h-7 rounded-full hover:bg-bg-subtle flex items-center justify-center text-fg-muted hover:text-fg transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-fg">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 rounded-full hover:bg-bg-subtle flex items-center justify-center text-fg-muted hover:text-fg transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-fg-muted py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const cellDate = new Date(viewYear, viewMonth, day);
          const isPast     = cellDate < today;
          const isToday    = toISO(cellDate) === toISO(today);
          const isSelected = toISO(cellDate) === selectedISO;
          return (
            <button
              key={i}
              onClick={() => selectDay(day)}
              disabled={isPast}
              className={cn(
                "h-8 w-full rounded-full text-xs font-medium transition-colors",
                isPast     && "text-fg-muted/40 cursor-not-allowed",
                !isPast    && !isSelected && "hover:bg-bg-subtle text-fg",
                isToday    && !isSelected && "font-bold text-brand",
                isSelected && "bg-fg text-white",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Clear link */}
      {value && (
        <button
          onClick={() => onChange("")}
          className="mt-3 w-full text-center text-xs text-fg-muted hover:text-fg underline underline-offset-2 transition-colors"
        >
          Clear — I&apos;m flexible
        </button>
      )}
    </div>
  );
}

// ─── Search pill ──────────────────────────────────────────────────────────────

type PanelId = "where" | "when" | "duration" | null;

const DURATION_OPTIONS: { val: string; label: string; sublabel: string; months: number | null }[] = [
  { val: "1",  label: "1 month",   sublabel: "Short stay",   months: 1  },
  { val: "3",  label: "3 months",  sublabel: "Seasonal",     months: 3  },
  { val: "6",  label: "6 months",  sublabel: "Half-year",    months: 6  },
  { val: "12", label: "12 months", sublabel: "Long stay",    months: 12 },
];

const CITY_PHOTOS: Record<string, string> = {
  "Bangkok":     "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=400&h=260&q=75",
  "Chiang Mai":  "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=400&h=260&q=75",
  "Phuket":      "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=400&h=260&q=75",
  "Pattaya":     "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=400&h=260&q=75",
  "Koh Samui":   "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=400&h=260&q=75",
  "Hua Hin":     "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=400&h=260&q=75",
  "Krabi":       "https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?auto=format&fit=crop&w=400&h=260&q=75",
  "Koh Phangan": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&h=260&q=75",
};
const CITY_PHOTO_FALLBACK = "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?auto=format&fit=crop&w=400&h=260&q=75";

function getQuickDates() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addM = (months: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
    return iso(d);
  };
  return [
    { label: "This month",  iso: iso(new Date(now.getFullYear(), now.getMonth(), 1)) },
    { label: "Next month",  iso: addM(1) },
    { label: "In 2 months", iso: addM(2) },
    { label: "In 3 months", iso: addM(3) },
  ];
}

function SearchPill() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: cities } = useMarketplaceCities();
  const navigate = useNavigate();

  const [active, setActive] = useState<PanelId>(null);
  const [draft, setDraft] = useState({
    cityId:         searchParams.get("cityId")         ?? "",
    moveInFrom:     searchParams.get("moveInFrom")     ?? "",
    durationMonths: searchParams.get("durationMonths") ?? "",
  });

  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) setActive(null);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setActive(null); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  function toggle(id: PanelId) { setActive((a) => (a === id ? null : id)); }

  function handleSearch(e: React.MouseEvent) {
    e.stopPropagation();
    const next = new URLSearchParams();
    if (draft.cityId)         next.set("cityId",         draft.cityId);
    if (draft.moveInFrom)     next.set("moveInFrom",     draft.moveInFrom);
    if (draft.durationMonths) next.set("durationMonths", draft.durationMonths);
    if (window.location.pathname === "/listings") setSearchParams(next);
    else navigate(`/listings?${next.toString()}`);
    setActive(null);
  }

  const cityLabel     = cities?.find((c) => String(c.id) === draft.cityId)?.name.en ?? "Where to?";
  const whenLabel     = draft.moveInFrom
    ? new Date(draft.moveInFrom + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Flexible";
  const durationLabel = DURATION_OPTIONS.find((o) => o.val === draft.durationMonths)?.label ?? "Any length";
  const hasFilter     = !!(draft.cityId || draft.moveInFrom || draft.durationMonths);

  const quickDates = getQuickDates();

  // Which steps are "done" — for the breadcrumb context inside panels
  const doneCityLabel     = draft.cityId ? cityLabel : null;
  const doneWhenLabel     = draft.moveInFrom ? whenLabel : null;

  return (
    <div ref={pillRef} className="relative">

      {/* ── Pill ── */}
      <div className={cn(
        "flex items-stretch divide-x divide-border rounded-full border border-border bg-white shadow-md transition-all duration-200",
        active && "shadow-lg ring-1 ring-border/80",
      )}>
        <button
          onClick={() => toggle("where")}
          className={cn(
            "flex flex-col justify-center px-5 py-2.5 rounded-l-full text-left min-w-[130px] hover:bg-bg-subtle transition-colors",
            active === "where" && "bg-bg-subtle",
          )}
        >
          <span className="text-[11px] font-semibold text-fg leading-none">Where</span>
          <span className={cn("text-sm mt-0.5 leading-none truncate max-w-[120px]", draft.cityId ? "text-fg font-medium" : "text-fg-muted")}>
            {cityLabel}
          </span>
        </button>

        <button
          onClick={() => toggle("when")}
          className={cn(
            "hidden md:flex flex-col justify-center px-5 py-2.5 text-left min-w-[110px] hover:bg-bg-subtle transition-colors",
            active === "when" && "bg-bg-subtle",
          )}
        >
          <span className="text-[11px] font-semibold text-fg leading-none">Move in</span>
          <span className={cn("text-sm mt-0.5 leading-none", draft.moveInFrom ? "text-fg font-medium" : "text-fg-muted")}>
            {whenLabel}
          </span>
        </button>

        <button
          onClick={() => toggle("duration")}
          className={cn(
            "hidden md:flex flex-col justify-center px-5 py-2.5 text-left min-w-[110px] hover:bg-bg-subtle transition-colors",
            active === "duration" && "bg-bg-subtle",
          )}
        >
          <span className="text-[11px] font-semibold text-fg leading-none">Duration</span>
          <span className={cn("text-sm mt-0.5 leading-none", draft.durationMonths ? "text-fg font-medium" : "text-fg-muted")}>
            {durationLabel}
          </span>
        </button>

        <button
          onClick={handleSearch}
          className="flex items-center gap-2 h-9 rounded-full bg-brand hover:bg-[var(--color-primary-hover)] transition-colors my-1.5 mr-1.5 px-3.5"
        >
          <Search size={15} className="text-white" strokeWidth={2.5} />
          {hasFilter && <span className="text-white text-xs font-semibold hidden sm:block">Search</span>}
        </button>
      </div>

      {/* ── Panels ── */}
      {active && (
        <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50 bg-white rounded-3xl shadow-2xl border border-border/60 overflow-hidden w-[420px]">

          {/* ── WHERE ── */}
          {active === "where" && (
            <div className="p-5">
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-fg-muted mb-4">
                Where are you going?
              </p>

              {/* Anywhere */}
              <button
                onClick={() => { setDraft((d) => ({ ...d, cityId: "" })); setActive("when"); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors mb-3",
                  !draft.cityId ? "bg-fg text-white" : "hover:bg-bg-subtle",
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0",
                  !draft.cityId ? "bg-white/20" : "bg-bg-subtle",
                )}>
                  🌏
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold leading-tight">Anywhere</p>
                  <p className={cn("text-xs leading-tight", !draft.cityId ? "text-white/65" : "text-fg-muted")}>
                    Browse all cities
                  </p>
                </div>
              </button>

              {/* City photo grid */}
              {(cities ?? []).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {(cities ?? []).map((c) => {
                    const photo = CITY_PHOTOS[c.name.en] ?? CITY_PHOTO_FALLBACK;
                    const selected = draft.cityId === String(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setDraft((d) => ({ ...d, cityId: String(c.id) })); setActive("when"); }}
                        className={cn(
                          "relative rounded-2xl overflow-hidden aspect-[3/2] group",
                          selected && "ring-[2.5px] ring-fg ring-offset-1",
                        )}
                      >
                        <img
                          src={photo}
                          alt={c.name.en}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <p className="text-white text-xs font-bold leading-tight">{c.name.en}</p>
                          {c.activeListingsCount > 0 && (
                            <p className="text-white/60 text-[10px] mt-0.5">{c.activeListingsCount} places</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── WHEN ── */}
          {active === "when" && (
            <div className="p-5">
              {/* Context: what was already chosen */}
              {doneCityLabel && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-semibold bg-fg text-white px-2.5 py-1 rounded-full">
                    {doneCityLabel}
                  </span>
                  <span className="text-xs text-fg-muted">→ pick a move-in date</span>
                </div>
              )}
              {!doneCityLabel && (
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-fg-muted mb-4">
                  When are you moving in?
                </p>
              )}

              {/* Quick date chips */}
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {quickDates.map((qd) => (
                  <button
                    key={qd.label}
                    onClick={() => { setDraft((d) => ({ ...d, moveInFrom: qd.iso })); setActive("duration"); }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      draft.moveInFrom === qd.iso
                        ? "bg-fg text-white border-fg"
                        : "border-border hover:border-fg hover:bg-bg-subtle",
                    )}
                  >
                    {qd.label}
                  </button>
                ))}
              </div>

              {/* Calendar */}
              <MiniCalendar
                value={draft.moveInFrom}
                onChange={(iso) => {
                  setDraft((d) => ({ ...d, moveInFrom: iso }));
                  if (iso) setTimeout(() => setActive("duration"), 180);
                }}
              />

              {/* Skip */}
              <button
                onClick={() => { setDraft((d) => ({ ...d, moveInFrom: "" })); setActive("duration"); }}
                className="mt-3 w-full text-center text-xs text-fg-muted hover:text-fg underline underline-offset-2 transition-colors"
              >
                I'm flexible — skip this
              </button>
            </div>
          )}

          {/* ── DURATION ── */}
          {active === "duration" && (
            <div className="p-5">
              {/* Context breadcrumb */}
              {(doneCityLabel || doneWhenLabel) && (
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                  {doneCityLabel && (
                    <span className="text-xs font-semibold bg-fg text-white px-2.5 py-1 rounded-full">
                      {doneCityLabel}
                    </span>
                  )}
                  {doneWhenLabel && (
                    <span className="text-xs font-semibold bg-fg text-white px-2.5 py-1 rounded-full">
                      {doneWhenLabel}
                    </span>
                  )}
                  <span className="text-xs text-fg-muted">→ how long?</span>
                </div>
              )}
              {!doneCityLabel && !doneWhenLabel && (
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-fg-muted mb-4">
                  How long will you stay?
                </p>
              )}

              {/* Visual duration grid */}
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const selected = draft.durationMonths === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => { setDraft((d) => ({ ...d, durationMonths: opt.val })); setActive(null); }}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-left transition-all duration-150 group",
                        selected
                          ? "border-fg bg-fg"
                          : "border-border hover:border-fg hover:shadow-sm",
                      )}
                    >
                      <p className={cn(
                        "text-3xl font-bold leading-none mb-2 tabular-nums",
                        selected ? "text-white" : "text-fg",
                      )}>
                        {opt.months}
                      </p>
                      <p className={cn("text-sm font-semibold leading-tight", selected ? "text-white" : "text-fg")}>
                        {opt.label}
                      </p>
                      <p className={cn("text-xs mt-0.5", selected ? "text-white/60" : "text-fg-muted")}>
                        {opt.sublabel}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Flexible / any */}
              <button
                onClick={() => { setDraft((d) => ({ ...d, durationMonths: "" })); setActive(null); }}
                className={cn(
                  "mt-2 w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all",
                  !draft.durationMonths
                    ? "border-fg bg-fg"
                    : "border-border hover:border-fg hover:shadow-sm",
                )}
              >
                <div>
                  <p className={cn("text-sm font-semibold", !draft.durationMonths ? "text-white" : "text-fg")}>
                    I'm flexible
                  </p>
                  <p className={cn("text-xs", !draft.durationMonths ? "text-white/60" : "text-fg-muted")}>
                    Show me everything
                  </p>
                </div>
                <span className={cn("text-2xl font-bold", !draft.durationMonths ? "text-white" : "text-fg-muted")}>
                  ∞
                </span>
              </button>

              {/* Search CTA */}
              <button
                onClick={handleSearch}
                className="mt-4 w-full h-11 rounded-full bg-brand hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Search size={15} strokeWidth={2.5} />
                Search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── User button (hamburger + avatar) ─────────────────────────────────────────

function MarketplaceUserMenu() {
  const { token, clearAuth } = useAuthStore();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const name = me?.firstName ?? me?.lineName ?? me?.email ?? "";

  function signOut() {
    clearAuth();
    localStorage.removeItem("pmc_token");
    qc.clear();
    navigate("/login", { replace: true });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full border border-border px-3 py-2 hover:shadow-md transition-shadow bg-white"
      >
        <Menu size={16} className="text-fg" />
        {token ? (
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <span className="text-white text-xs font-semibold leading-none">{initials(name) || "?"}</span>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#717171] flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-4 h-4 fill-white">
              <path d="M16 .7a15.3 15.3 0 100 30.6A15.3 15.3 0 0016 .7zm0 7a5.1 5.1 0 110 10.2A5.1 5.1 0 0116 7.7zm0 21.5a11.7 11.7 0 01-8.9-4.1c.1-2.9 5.9-4.6 8.9-4.6s8.8 1.7 8.9 4.6a11.7 11.7 0 01-8.9 4.1z" />
            </svg>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 z-50 bg-white rounded-2xl shadow-xl border border-border py-2 min-w-52">
          {token ? (
            <>
              {name && <div className="px-4 py-2 text-sm font-semibold text-fg border-b border-border mb-1">{name}</div>}
              <button onClick={() => { navigate("/me"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                My account
              </button>
              <button onClick={() => { navigate("/me/host/properties"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                Host dashboard
              </button>
              <button onClick={() => { navigate("/me/profile"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                Account
              </button>
              <div className="border-t border-border mt-1 pt-1">
                <button onClick={signOut} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { navigate("/register"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-fg hover:bg-bg transition-colors">
                Sign up
              </button>
              <button onClick={() => { navigate("/login"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                Log in
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function PublicShell() {
  const { token } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border/60">
        <div className="w-full px-4 md:px-8 lg:px-12 h-[72px] grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Logo — left */}
          <Link to="/listings" className="min-w-0">
            <SiamoLogo className="h-9" />
          </Link>

          {/* Search pill — truly centered */}
          <SearchPill />

          {/* Right actions */}
          <div className="flex items-center gap-2 justify-end">
            <Link
              to={token ? "/me/host" : "/login"}
              className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-fg px-3 py-2 rounded-full hover:bg-bg-subtle transition-colors whitespace-nowrap"
            >
              <Home size={14} />
              {token ? "Switch to hosting" : "Siamo your home"}
            </Link>
            <MarketplaceUserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 mt-16 py-8 bg-bg-subtle/40">
        <div className="w-full px-4 md:px-8 lg:px-12 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <SiamoLogo className="h-4" />
            <span>· © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-fg-muted">
            <a href="#" className="hover:text-fg transition-colors">Support</a>
            <a href="#" className="hover:text-fg transition-colors">Privacy</a>
            <a href="#" className="hover:text-fg transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
